"use client";

// Volunteer management: search, status / skill / availability filters, and the match results the
// engine produced for each registration (so the team can see *why* a volunteer was recommended
// for a role before they pick up the phone).

import * as React from "react";
import { AlertCircle, Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchJson, useLiveData } from "@/lib/hooks/use-live-data";
import { volunteerAvailability, volunteerSkills } from "@content/volunteering";
import { cn } from "@/lib/utils";
import type { AdminVolunteer, VolunteerStatus } from "@/server/db/volunteers";
import { POLL_INTERVAL_MS } from "./dashboard";

type ListResponse = { items: AdminVolunteer[]; total: number };

const statuses: readonly VolunteerStatus[] = ["Pending", "Contacted", "Active", "Declined"];

const statusBadge: Record<VolunteerStatus, string> = {
  Pending: "bg-muted text-foreground",
  Contacted: "bg-warning/20 text-foreground",
  Active: "bg-success/15 text-success",
  Declined: "bg-destructive/10 text-destructive",
};

const ANY = "__any__";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function VolunteersPanel({
  active,
  onUnauthorized,
}: {
  active: boolean;
  onUnauthorized: () => void;
}) {
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [status, setStatus] = React.useState<VolunteerStatus | "all">("all");
  const [skill, setSkill] = React.useState<string>(ANY);
  const [availability, setAvailability] = React.useState<string>(ANY);
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState<string | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const query = React.useMemo(() => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (skill !== ANY) params.set("skill", skill);
    if (availability !== ANY) params.set("availability", availability);
    if (debouncedSearch) params.set("search", debouncedSearch);
    return params.toString();
  }, [status, skill, availability, debouncedSearch]);

  const live = useLiveData<ListResponse>({
    fetcher: (signal) =>
      fetchJson<ListResponse>(`/api/admin/volunteers${query ? `?${query}` : ""}`, { signal }),
    intervalMs: POLL_INTERVAL_MS,
    enabled: active,
    resetKey: query,
    onUnauthorized,
  });

  const items = live.data?.items ?? [];

  const changeStatus = async (reference: string, next: VolunteerStatus) => {
    setSaving(reference);
    try {
      const response = await fetch(`/api/admin/volunteers/${encodeURIComponent(reference)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (response.status === 401) {
        onUnauthorized();
        return;
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        toast.error(body?.error ?? "Could not update the volunteer.");
        return;
      }
      live.refresh();
      toast.success(`${reference} is now ${next}`);
    } catch {
      toast.error("Could not reach the server.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <Label htmlFor="volunteer-search" className="text-xs text-muted-foreground">
            Search
          </Label>
          <div className="relative mt-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="volunteer-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Reference, name, email, phone, skill or interest"
              className="pl-9"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="volunteer-skill" className="text-xs text-muted-foreground">
            Skill
          </Label>
          <Select value={skill} onValueChange={(value) => value && setSkill(String(value))}>
            <SelectTrigger id="volunteer-skill" className="mt-1 w-full">
              <SelectValue placeholder="Any skill" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any skill</SelectItem>
              {volunteerSkills.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="volunteer-availability" className="text-xs text-muted-foreground">
            Availability
          </Label>
          <Select
            value={availability}
            onValueChange={(value) => value && setAvailability(String(value))}
          >
            <SelectTrigger id="volunteer-availability" className="mt-1 w-full">
              <SelectValue placeholder="Any availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any availability</SelectItem>
              {volunteerAvailability.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <span id="volunteer-status-label" className="text-xs text-muted-foreground">
          Status
        </span>
        <div
          role="group"
          aria-labelledby="volunteer-status-label"
          className="mt-1 flex flex-wrap gap-1.5"
        >
          {(["all", ...statuses] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={status === option}
              onClick={() => setStatus(option)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                status === option
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:border-primary/40"
              )}
            >
              {option === "all" ? "All" : option}
            </button>
          ))}
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <RefreshCw className={cn("size-3.5", live.refreshing && "animate-spin")} />
        {live.failures > 0
          ? `Reconnecting… (${live.failures} failed)`
          : `${live.data?.total ?? 0} registration${
              (live.data?.total ?? 0) === 1 ? "" : "s"
            } · live every ${POLL_INTERVAL_MS / 1000}s`}
      </p>

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
          Loading volunteers…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">No volunteer registrations to show</p>
          <p className="mt-1">
            {query
              ? "Nothing matches these filters."
              : "New registrations from the volunteer form appear here automatically."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((volunteer) => {
            const isOpen = expanded === volunteer.reference;
            return (
              <li
                key={volunteer.reference}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-heading text-base font-semibold text-foreground">
                      {volunteer.fullName}
                      <Badge className={cn("font-medium", statusBadge[volunteer.status])}>
                        {volunteer.status}
                      </Badge>
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {volunteer.reference} · registered {formatDateTime(volunteer.createdAt)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <a
                        href={`tel:${volunteer.mobile}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {volunteer.mobile}
                      </a>
                      {" · "}
                      <a
                        href={`mailto:${volunteer.email}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {volunteer.email}
                      </a>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Select
                      value={volunteer.status}
                      onValueChange={(value) =>
                        value && changeStatus(volunteer.reference, value as VolunteerStatus)
                      }
                    >
                      <SelectTrigger
                        aria-label={`Status for ${volunteer.fullName}`}
                        className="w-36"
                        disabled={saving === volunteer.reference}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      aria-expanded={isOpen}
                      onClick={() => setExpanded(isOpen ? null : volunteer.reference)}
                    >
                      {isOpen ? "Hide details" : "Show details"}
                    </Button>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                  <TagList label="Skills" values={volunteer.skills} />
                  <TagList label="Interests" values={volunteer.interests} />
                  <TagList label="Availability" values={volunteer.availability} />
                </div>

                {isOpen && (
                  <div className="mt-4 space-y-4 border-t border-border pt-4">
                    <dl className="grid gap-3 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-xs text-muted-foreground">Category</dt>
                        <dd className="text-foreground">{volunteer.category ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Area of interest</dt>
                        <dd className="text-foreground">{volunteer.areaOfInterest ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Hours / week</dt>
                        <dd className="text-foreground">{volunteer.hoursPerWeek ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Date of birth</dt>
                        <dd className="text-foreground">{volunteer.dateOfBirth ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Blood group</dt>
                        <dd className="text-foreground">{volunteer.bloodGroup ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">ID proof</dt>
                        <dd className="text-foreground">
                          {volunteer.idProofMasked ?? "—"}
                          <span className="block text-xs text-muted-foreground">
                            last 4 digits only
                          </span>
                        </dd>
                      </div>
                      {volunteer.preferredActivities.length > 0 && (
                        <div className="sm:col-span-3">
                          <dt className="text-xs text-muted-foreground">Preferred activities</dt>
                          <dd className="text-foreground">
                            {volunteer.preferredActivities.join(", ")}
                          </dd>
                        </div>
                      )}
                    </dl>

                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        Recommended opportunities
                      </h4>
                      {volunteer.matches.length === 0 ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          No opportunity scored above zero for this profile.
                        </p>
                      ) : (
                        <ol className="mt-2 space-y-2">
                          {volunteer.matches.map((match) => (
                            <li
                              key={match.opportunityId}
                              className="rounded-xl border border-border bg-muted/30 p-3 text-sm"
                            >
                              <p className="flex flex-wrap items-baseline justify-between gap-2">
                                <span className="font-medium text-foreground">
                                  {match.title}
                                  {match.isDemo && (
                                    <Badge variant="outline" className="ml-2">
                                      Demo
                                    </Badge>
                                  )}
                                </span>
                                <span className="font-mono text-xs font-semibold text-primary tabular-nums">
                                  {match.score}% match
                                </span>
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                                skill {match.skillScore} · interest {match.interestScore} ·
                                availability {match.availabilityScore}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {match.rationale}
                              </p>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TagList({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      {values.length === 0 ? (
        <p className="text-sm text-muted-foreground">—</p>
      ) : (
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {values.map((value) => (
            <li key={value}>
              <Badge variant="secondary">{value}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
