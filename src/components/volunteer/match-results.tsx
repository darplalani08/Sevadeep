"use client";

// Renders the ranked opportunity matches with their component scores and the plain-English
// reason each one scored what it did — the percentage is never presented as a black box.

import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MatchResult, MatchWeights } from "@/lib/matching/engine";

function toneForScore(score: number) {
  if (score >= 75) return "text-success";
  if (score >= 50) return "text-accent-600 dark:text-accent-400";
  return "text-muted-foreground";
}

export function MatchResults({
  matches,
  weights,
}: {
  matches: MatchResult[];
  weights: MatchWeights;
}) {
  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">No opportunity matched your profile yet.</p>
        <p className="mt-1.5">
          That usually means the skills or schedule you selected don&apos;t overlap any currently
          active opportunity. A coordinator will still review your registration and get in touch.
        </p>
      </div>
    );
  }

  return (
    <section aria-label="Your recommended opportunities" className="space-y-4">
      <header>
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
          <Sparkles className="size-4 text-accent-600 dark:text-accent-400" />
          Your recommended opportunities
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Scored out of 100 — {Math.round(weights.skill * 100)}% skill fit,{" "}
          {Math.round(weights.interest * 100)}% interest fit,{" "}
          {Math.round(weights.availability * 100)}% availability fit
          {weights.preferenceBoost > 0 && `, plus up to ${weights.preferenceBoost} points for a named preference`}
          . These are recommendations for your follow-up call, not an acceptance.
        </p>
      </header>

      <ol className="space-y-3">
        {matches.map((match, index) => (
          <li
            key={match.opportunityId}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-heading text-base font-semibold text-foreground">
                  {match.title}
                  {index === 0 && <Badge variant="default">Best match</Badge>}
                  {match.isDemo && (
                    <Badge variant="outline" title="Not a published SevaDeep role — see the documentation">
                      Demo opportunity
                    </Badge>
                  )}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{match.summary}</p>
                <p className="mt-1 text-xs text-muted-foreground">{match.location}</p>
              </div>
              <p
                className={cn(
                  "shrink-0 font-heading text-2xl font-semibold tabular-nums",
                  toneForScore(match.score)
                )}
              >
                {match.score}%
              </p>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <ScoreBar label="Skill fit" value={match.skillScore} />
              <ScoreBar label="Interest fit" value={match.interestScore} />
              <ScoreBar label="Availability" value={match.availabilityScore} />
            </div>

            {match.matchedSkills.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {match.matchedSkills.map((skill) => (
                  <li key={skill}>
                    <Badge variant="secondary">{skill}</Badge>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-3 text-sm text-muted-foreground">{match.rationale}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums text-foreground">{value}</span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}
