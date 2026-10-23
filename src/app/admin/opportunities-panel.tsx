"use client";

// Opportunity catalogue management.
//
// This exists because SevaDeep does not publish a structured list of volunteering roles, so the
// matcher's inputs have to be owned and edited by the NGO rather than hardcoded. The seeded rows
// are flagged "Demo" and can be edited or deactivated; the seed never runs again once the table
// has content.

import * as React from "react";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/common/chip-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchJson, useLiveData } from "@/lib/hooks/use-live-data";
import { volunteerAvailability, volunteerInterests, volunteerSkills } from "@content/volunteering";
import type { Opportunity } from "@/lib/matching/engine";
import { POLL_INTERVAL_MS } from "./dashboard";

type CatalogueResponse = {
  opportunities: (Opportunity & { active: boolean; createdAt: string })[];
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

export function OpportunitiesPanel({
  active,
  onUnauthorized,
}: {
  active: boolean;
  onUnauthorized: () => void;
}) {
  const [showForm, setShowForm] = React.useState(false);

  const live = useLiveData<CatalogueResponse>({
    fetcher: (signal) => fetchJson<CatalogueResponse>("/api/admin/opportunities", { signal }),
    intervalMs: POLL_INTERVAL_MS,
    enabled: active,
    onUnauthorized,
  });

  const opportunities = live.data?.opportunities ?? [];

  const toggle = async (id: string, next: boolean) => {
    try {
      const response = await fetch("/api/admin/opportunities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active: next }),
      });
      if (response.status === 401) {
        onUnauthorized();
        return;
      }
      if (!response.ok) {
        toast.error("Could not update the opportunity.");
        return;
      }
      live.refresh();
      toast.success(next ? "Opportunity activated" : "Opportunity deactivated");
    } catch {
      toast.error("Could not reach the server.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          These are the roles the matching engine scores volunteers against. Entries marked{" "}
          <Badge variant="outline">Demo</Badge> were seeded for demonstration because
          sevadeep.org does not publish a structured role list — edit or replace them with the
          NGO&apos;s real activities.
        </p>
        <Button
          className="gap-1.5 rounded-full"
          onClick={() => setShowForm((value) => !value)}
          aria-expanded={showForm}
        >
          <Plus className="size-4" />
          {showForm ? "Close form" : "Add opportunity"}
        </Button>
      </div>

      {showForm && (
        <OpportunityForm
          onSaved={() => {
            live.refresh();
            setShowForm(false);
          }}
          onUnauthorized={onUnauthorized}
        />
      )}

      {live.error && (
        <div
          role="alert"
          className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{live.error}</p>
        </div>
      )}

      {live.loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading catalogue…
        </div>
      ) : opportunities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">No opportunities configured</p>
          <p className="mt-1">
            Add at least one so the matching engine has something to recommend.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {opportunities.map((opportunity) => (
            <li
              key={opportunity.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="flex flex-wrap items-center gap-2 font-heading text-base font-semibold text-foreground">
                  {opportunity.title}
                  {opportunity.isDemo && <Badge variant="outline">Demo</Badge>}
                  {!opportunity.active && <Badge variant="destructive">Inactive</Badge>}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => toggle(opportunity.id, !opportunity.active)}
                >
                  {opportunity.active ? "Deactivate" : "Activate"}
                </Button>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{opportunity.summary}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {opportunity.id} · {opportunity.location}
              </p>
              <dl className="mt-3 space-y-2 text-xs">
                <Row label="Skills">{opportunity.requiredSkills.join(", ") || "—"}</Row>
                <Row label="Interests">{opportunity.interestTags.join(", ") || "—"}</Row>
                <Row label="Schedule">{opportunity.availabilityNeeds.join(", ") || "—"}</Row>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-16 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}

function OpportunityForm({
  onSaved,
  onUnauthorized,
}: {
  onSaved: () => void;
  onUnauthorized: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [location, setLocation] = React.useState("Pune");
  const [skills, setSkills] = React.useState<string[]>([]);
  const [interests, setInterests] = React.useState<string[]>([]);
  const [schedule, setSchedule] = React.useState<string[]>([]);
  const [isDemo, setIsDemo] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;

    const id = slugify(title);
    if (!id) {
      setError("Enter a title.");
      return;
    }
    if (skills.length === 0) {
      setError("Select at least one required skill — the matcher needs something to score.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          title: title.trim(),
          summary: summary.trim(),
          requiredSkills: skills,
          interestTags: interests,
          availabilityNeeds: schedule,
          location: location.trim(),
          isDemo,
        }),
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      const body = (await response.json().catch(() => null)) as
        | { error?: string; details?: unknown }
        | null;

      if (!response.ok) {
        setError(body?.error ?? "Could not save the opportunity.");
        return;
      }

      toast.success("Opportunity saved");
      onSaved();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="opp-title">Title</Label>
          <Input
            id="opp-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            ID will be <span className="font-mono">{slugify(title) || "—"}</span>. Reusing an
            existing ID updates that opportunity.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="opp-location">Location</Label>
          <Input
            id="opp-location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="opp-summary">Summary</Label>
        <Textarea
          id="opp-summary"
          rows={2}
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          required
          minLength={10}
        />
      </div>

      <ChipGroup
        name="opp-skills"
        legend="Required skills"
        required
        options={volunteerSkills}
        value={skills}
        onChange={setSkills}
      />
      <ChipGroup
        name="opp-interests"
        legend="Interest tags"
        options={volunteerInterests}
        value={interests}
        onChange={setInterests}
      />
      <ChipGroup
        name="opp-schedule"
        legend="Schedule needed"
        options={volunteerAvailability}
        value={schedule}
        onChange={setSchedule}
      />

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={isDemo}
          onChange={(event) => setIsDemo(event.target.checked)}
          className="size-4 rounded border-input accent-primary"
        />
        Mark as a demonstration opportunity (not a real published SevaDeep role)
      </label>

      <Button type="submit" className="rounded-full" disabled={saving}>
        {saving ? "Saving…" : "Save opportunity"}
      </Button>
    </form>
  );
}
