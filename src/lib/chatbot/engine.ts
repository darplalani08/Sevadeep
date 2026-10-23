// Rule-based intent recognition for the SevaDeep assistant.
//
// This is NOT a generative model and does not call any external AI service. It is a local,
// deterministic retrieval pipeline:
//
//   normalise -> tokenise -> stopword removal -> light stemming
//   -> phrase matching + IDF-weighted keyword matching (+ small follow-up context bonus)
//   -> argmax over intents -> confidence gate -> answer or fallback
//
// Dependency-free and side-effect-free so it runs in the browser (instant replies, no network
// round-trip) and under `node --test` (see tests/chatbot.test.ts).

export type Intent = {
  id: string;
  /** Multi-word phrases; matching one is strong evidence. */
  phrases: string[];
  /** Single words; weighted by how few intents use them. */
  keywords: string[];
  answer: string;
  links?: { label: string; href: string }[];
  /** Follow-up chips offered after this answer. */
  suggestions?: string[];
  /** Intents commonly asked straight after this one — given a small context bonus. */
  followUps?: string[];
};

export type KnowledgeBase = {
  intents: Intent[];
  fallback: {
    answer: string;
    links?: { label: string; href: string }[];
    suggestions?: string[];
  };
};

export type Match = {
  intentId: string | null;
  score: number;
  confidence: number;
  answer: string;
  links: { label: string; href: string }[];
  suggestions: string[];
  /** Why this intent won — surfaced in tests and dev tooling, not in the UI. */
  matchedTerms: string[];
};

export const MAX_MESSAGE_LENGTH = 500;

/** Minimum weighted score required before an intent is trusted over the fallback. */
export const SCORE_THRESHOLD = 1.15;

const STOPWORDS = new Set([
  "a","an","the","is","are","am","was","were","be","been","being","do","does","did","doing",
  "have","has","had","i","me","my","we","our","you","your","he","she","it","they","them","this",
  "that","these","those","of","to","in","on","for","with","at","by","from","up","about","into",
  "and","or","but","if","as","so","than","then","there","here","what","which","who","whom","how",
  "when","where","why","can","could","should","would","will","shall","may","might","must","want",
  "need","please","hi","hey","tell","get","give","know","like","just","any","some","also","does",
  "u","pls","plz","thanks","thank",
]);

/** Lowercase, strip accents/punctuation, collapse whitespace. */
export function normalise(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Very light suffix stripping — enough to fold volunteer/volunteers/volunteering together. */
export function stem(token: string): string {
  let t = token;
  if (t.length > 5 && t.endsWith("ing")) t = t.slice(0, -3);
  else if (t.length > 4 && t.endsWith("ies")) t = `${t.slice(0, -3)}y`;
  else if (t.length > 4 && t.endsWith("ed")) t = t.slice(0, -2);
  else if (t.length > 3 && t.endsWith("es")) t = t.slice(0, -2);
  else if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss")) t = t.slice(0, -1);
  return t;
}

export function tokenise(input: string): string[] {
  return normalise(input)
    .split(" ")
    .filter((t) => t.length > 0 && !STOPWORDS.has(t))
    .map(stem);
}

/**
 * Inverse document frequency over the intent set: a keyword used by one intent discriminates,
 * a keyword used by eight ("donate") barely does.
 */
function buildIdf(intents: Intent[]): Map<string, number> {
  const docCount = new Map<string, number>();
  for (const intent of intents) {
    const seen = new Set(intent.keywords.map(stem));
    for (const key of seen) docCount.set(key, (docCount.get(key) ?? 0) + 1);
  }
  const total = Math.max(1, intents.length);
  const idf = new Map<string, number>();
  for (const [key, count] of docCount) {
    idf.set(key, Math.log((total + 1) / (count + 0.5)));
  }
  return idf;
}

const idfCache = new WeakMap<KnowledgeBase, Map<string, number>>();

function idfFor(kb: KnowledgeBase): Map<string, number> {
  let idf = idfCache.get(kb);
  if (!idf) {
    idf = buildIdf(kb.intents);
    idfCache.set(kb, idf);
  }
  return idf;
}

export type ScoredIntent = { intent: Intent; score: number; matchedTerms: string[] };

export function scoreIntents(
  message: string,
  kb: KnowledgeBase,
  previousIntentId?: string | null
): ScoredIntent[] {
  const normalised = normalise(message);
  const tokens = tokenise(message);
  const tokenSet = new Set(tokens);
  const idf = idfFor(kb);

  const scored = kb.intents.map((intent) => {
    let score = 0;
    const matchedTerms: string[] = [];

    // Phrase hits are the strongest signal; longer phrases count for more.
    for (const phrase of intent.phrases) {
      const normalisedPhrase = normalise(phrase);
      if (!normalisedPhrase) continue;
      if (normalised.includes(normalisedPhrase)) {
        score += 2 + 0.6 * (normalisedPhrase.split(" ").length - 1);
        matchedTerms.push(phrase);
      }
    }

    // Keyword hits, weighted by rarity across the knowledge base.
    for (const keyword of intent.keywords) {
      const key = stem(normalise(keyword));
      if (!key) continue;
      if (tokenSet.has(key)) {
        score += 0.55 + 0.45 * (idf.get(key) ?? 1);
        matchedTerms.push(keyword);
      }
    }

    // Small nudge for a natural follow-up to the previous answer, so "how do I track it?"
    // after an enrolment answer resolves to tracking rather than donation tracking.
    if (previousIntentId) {
      const previous = kb.intents.find((i) => i.id === previousIntentId);
      if (previous?.followUps?.includes(intent.id) && score > 0) score += 0.35;
    }

    return { intent, score, matchedTerms: [...new Set(matchedTerms)] };
  });

  return scored.sort((a, b) => b.score - a.score || a.intent.id.localeCompare(b.intent.id));
}

export function answer(
  message: string,
  kb: KnowledgeBase,
  previousIntentId?: string | null
): Match {
  const fallbackMatch: Match = {
    intentId: null,
    score: 0,
    confidence: 0,
    answer: kb.fallback.answer,
    links: kb.fallback.links ?? [],
    suggestions: kb.fallback.suggestions ?? [],
    matchedTerms: [],
  };

  if (typeof message !== "string") return fallbackMatch;
  const trimmed = message.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (trimmed.length === 0) return fallbackMatch;

  const ranked = scoreIntents(trimmed, kb, previousIntentId);
  const best = ranked[0];
  if (!best || best.score < SCORE_THRESHOLD) return fallbackMatch;

  const runnerUp = ranked[1]?.score ?? 0;
  const confidence = best.score / (best.score + runnerUp);

  return {
    intentId: best.intent.id,
    score: Number(best.score.toFixed(3)),
    confidence: Number(confidence.toFixed(3)),
    answer: best.intent.answer,
    links: best.intent.links ?? [],
    suggestions: best.intent.suggestions ?? [],
    matchedTerms: best.matchedTerms,
  };
}
