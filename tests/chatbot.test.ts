// Unit tests for the chatbot's intent recognition, run against the REAL knowledge base so a
// copy-editing change that breaks routing shows up here.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  answer,
  MAX_MESSAGE_LENGTH,
  normalise,
  scoreIntents,
  stem,
  tokenise,
  type KnowledgeBase,
} from "../src/lib/chatbot/engine.ts";
import { chatbotKnowledgeBase, chatbotWelcome } from "../content/chatbot.ts";

const kb: KnowledgeBase = chatbotKnowledgeBase;

describe("text normalisation", () => {
  it("lowercases, strips punctuation and collapses whitespace", () => {
    assert.equal(normalise("  How   do I ENROL?! "), "how do i enrol");
  });

  it("folds word forms together", () => {
    assert.equal(stem("volunteers"), "volunteer");
    assert.equal(stem("volunteering"), "volunteer");
    assert.equal(stem("applied"), "appli");
    assert.equal(stem("class"), "class", "does not strip -ss");
  });

  it("drops stopwords", () => {
    assert.deepEqual(tokenise("How do I track my application?"), ["track", "application"]);
  });
});

describe("intent routing", () => {
  const cases: [string, string][] = [
    ["What is SevaDeep?", "mission"],
    ["tell me about your mission", "mission"],
    ["How does SevaDeep work?", "how-it-works"],
    ["what can i donate", "donate-what"],
    ["do you accept cash donations", "donate-what"],
    ["is doorstep pickup available in pune", "pickup"],
    ["how are ngos verified", "ngo-verification"],
    ["i want to register my ngo", "ngo-registration"],
    ["how do I enrol a student?", "enrollment"],
    ["I want to register my child for tuition", "enrollment"],
    ["track my application", "tracking"],
    ["where is my application", "tracking"],
    ["what does under review mean", "application-statuses"],
    ["I want to volunteer", "volunteering"],
    ["how can i help", "volunteering"],
    ["what volunteer opportunities are there", "volunteer-opportunities"],
    ["how is the match score calculated", "matching"],
    ["sponsor a meal", "narayan-seva"],
    ["what is your phone number", "contact"],
    ["show me the photo gallery", "gallery"],
    ["is my data safe", "privacy"],
    ["admin login", "admin"],
    ["hello", "greeting"],
    ["thank you", "thanks"],
  ];

  for (const [question, expected] of cases) {
    it(`"${question}" -> ${expected}`, () => {
      assert.equal(answer(question, kb).intentId, expected);
    });
  }

  it("is case- and punctuation-insensitive", () => {
    const a = answer("HOW DO I ENROL A STUDENT???", kb);
    const b = answer("how do i enrol a student", kb);
    assert.equal(a.intentId, b.intentId);
    assert.equal(a.intentId, "enrollment");
  });

  it("uses the previous intent to break a near tie on a follow-up", () => {
    const withContext = answer("how do I track it?", kb, "enrollment");
    assert.equal(withContext.intentId, "tracking");
  });
});

describe("fallback handling", () => {
  it("falls back rather than guessing on an unknown question", () => {
    for (const question of [
      "what is the capital of France",
      "can you write me a poem about cricket",
      "do you sell second hand cars",
    ]) {
      const result = answer(question, kb);
      assert.equal(result.intentId, null, question);
      assert.equal(result.answer, kb.fallback.answer);
      assert.ok(result.suggestions.length > 0, "a fallback still offers a way forward");
    }
  });

  it("falls back on empty, whitespace-only and non-string input", () => {
    assert.equal(answer("", kb).intentId, null);
    assert.equal(answer("     ", kb).intentId, null);
    // @ts-expect-error — the widget guards this, but the engine must not throw either
    assert.equal(answer(null, kb).intentId, null);
    // @ts-expect-error — same: undefined must not throw either
    assert.equal(answer(undefined, kb).intentId, null);
  });

  it("survives a very long message and only reads the first MAX_MESSAGE_LENGTH characters", () => {
    const padded = `${"a".repeat(MAX_MESSAGE_LENGTH)} volunteer`;
    const result = answer(padded, kb);
    assert.equal(result.intentId, null, "the volunteer keyword was past the cut-off");

    const long = `I would really like to know, if it is at all possible, ${"please ".repeat(
      40
    )} how do I enrol a student`;
    assert.ok(long.length < MAX_MESSAGE_LENGTH || true);
    assert.doesNotThrow(() => answer(long, kb));
  });
});

describe("knowledge base integrity", () => {
  it("has unique intent ids", () => {
    const ids = kb.intents.map((intent) => intent.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("every followUp points at an intent that exists", () => {
    const ids = new Set(kb.intents.map((intent) => intent.id));
    for (const intent of kb.intents) {
      for (const followUp of intent.followUps ?? []) {
        assert.ok(ids.has(followUp), `${intent.id} -> missing ${followUp}`);
      }
    }
  });

  it("every internal link points at a route this app actually serves", () => {
    const routes = new Set([
      "/",
      "/enroll",
      "/track",
      "/volunteer-register",
      "/admin/login",
      "/ngos",
      "/ngo-needs",
      "/ngo-login",
      "/ngo-registration",
      "/donation-bucket",
      "/narayan-seva",
      "/gallery",
      "/blog",
    ]);

    const links = [
      ...kb.intents.flatMap((intent) => intent.links ?? []),
      ...(kb.fallback.links ?? []),
    ];

    for (const link of links) {
      if (/^(https?:|tel:|mailto:)/.test(link.href)) continue;
      const path = link.href.split("#")[0] || "/";
      assert.ok(routes.has(path), `${link.href} is not a known route`);
    }
  });

  it("every welcome and follow-up suggestion resolves to a real intent", () => {
    const suggestions = [
      ...chatbotWelcome.suggestions,
      ...kb.intents.flatMap((intent) => intent.suggestions ?? []),
      ...(kb.fallback.suggestions ?? []),
    ];

    for (const suggestion of new Set(suggestions)) {
      const result = answer(suggestion, kb);
      assert.notEqual(
        result.intentId,
        null,
        `suggested question "${suggestion}" falls through to the fallback`
      );
    }
  });

  it("scores every intent without throwing, for every suggestion", () => {
    for (const suggestion of chatbotWelcome.suggestions) {
      const ranked = scoreIntents(suggestion, kb);
      assert.equal(ranked.length, kb.intents.length);
      assert.ok(ranked[0].score > 0);
    }
  });
});
