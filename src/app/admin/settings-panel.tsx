"use client";

// Administrator accounts and matching weights.
//
// Adding an administrator here is the supported path after the one-time /admin/setup screen:
// the new person's password is typed once, hashed with scrypt on the server and never stored or
// transmitted in readable form again.

import * as React from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchJson, useLiveData } from "@/lib/hooks/use-live-data";
import type { MatchWeights } from "@/lib/matching/engine";
import { POLL_INTERVAL_MS } from "./dashboard";

type SettingsResponse = { admins: { id: number; email: string; name: string }[] };

export function SettingsPanel({
  active,
  onUnauthorized,
}: {
  active: boolean;
  onUnauthorized: () => void;
}) {
  const live = useLiveData<SettingsResponse>({
    fetcher: (signal) => fetchJson<SettingsResponse>("/api/admin/admins", { signal }),
    intervalMs: POLL_INTERVAL_MS * 3,
    enabled: active,
    onUnauthorized,
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="font-heading text-sm font-semibold text-foreground">
          Administrator accounts
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Only these accounts can see applicant and volunteer details.
        </p>

        {live.loading ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {(live.data?.admins ?? []).map((admin) => (
              <li
                key={admin.id}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2"
              >
                <span className="text-foreground">{admin.name}</span>
                <span className="text-xs text-muted-foreground">{admin.email}</span>
              </li>
            ))}
          </ul>
        )}

        <AddAdminForm onSaved={live.refresh} onUnauthorized={onUnauthorized} />
      </section>

      <WeightsForm active={active} onUnauthorized={onUnauthorized} />
    </div>
  );
}

function AddAdminForm({
  onSaved,
  onUnauthorized,
}: {
  onSaved: () => void;
  onUnauthorized: () => void;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    const formElement = event.currentTarget;
    const data = new FormData(formElement);
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(data.get("name") ?? ""),
          email: String(data.get("email") ?? ""),
          password: String(data.get("password") ?? ""),
        }),
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(body?.error ?? "Could not create the administrator.");
        return;
      }

      formElement.reset();
      onSaved();
      toast.success("Administrator added");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3 border-t border-border pt-5">
      <h4 className="text-sm font-semibold text-foreground">Add an administrator</h4>
      {error && (
        <p role="alert" className="flex gap-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="new-admin-name" className="text-xs text-muted-foreground">
            Name
          </Label>
          <Input id="new-admin-name" name="name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-admin-email" className="text-xs text-muted-foreground">
            Email
          </Label>
          <Input id="new-admin-email" name="email" type="email" required />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-admin-password" className="text-xs text-muted-foreground">
          Temporary password (12+ chars, upper + lower + digit + symbol)
        </Label>
        <Input
          id="new-admin-password"
          name="password"
          type="password"
          required
          minLength={12}
          autoComplete="new-password"
        />
      </div>
      <Button type="submit" size="sm" className="rounded-full" disabled={saving}>
        {saving ? "Adding…" : "Add administrator"}
      </Button>
    </form>
  );
}

function WeightsForm({
  active,
  onUnauthorized,
}: {
  active: boolean;
  onUnauthorized: () => void;
}) {
  const [weights, setWeights] = React.useState<MatchWeights | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    (async () => {
      try {
        const body = await fetchJson<{ weights: MatchWeights }>("/api/admin/weights", {
          signal: controller.signal,
        });
        setWeights(body.weights);
      } catch (caught) {
        if (caught instanceof Error && caught.name === "UnauthorizedError") onUnauthorized();
      }
    })();
    return () => controller.abort();
  }, [active, onUnauthorized]);

  const update = (key: keyof MatchWeights, value: number) => {
    setWeights((current) => (current ? { ...current, [key]: value } : current));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!weights || saving) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/weights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(weights),
      });
      if (response.status === 401) {
        onUnauthorized();
        return;
      }
      const body = (await response.json().catch(() => null)) as
        | { error?: string; weights?: MatchWeights }
        | null;
      if (!response.ok) {
        setError(body?.error ?? "Could not save the weights.");
        return;
      }
      if (body?.weights) setWeights(body.weights);
      toast.success("Matching weights updated", {
        description: "New registrations are scored with these weights.",
      });
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  };

  const sum = weights ? weights.skill + weights.interest + weights.availability : 0;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="font-heading text-sm font-semibold text-foreground">Matching weights</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        How the volunteer match score is composed. The three weights must add up to 1. Changes
        apply to registrations made from now on; existing stored matches are left as they were.
      </p>

      {!weights ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </p>
      ) : (
        <form onSubmit={save} className="mt-4 space-y-3">
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {(
            [
              ["skill", "Skill fit"],
              ["interest", "Interest fit"],
              ["availability", "Availability fit"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`weight-${key}`} className="text-xs text-muted-foreground">
                {label} — {Math.round(weights[key] * 100)}%
              </Label>
              <Input
                id={`weight-${key}`}
                type="number"
                step="0.05"
                min={0}
                max={1}
                value={weights[key]}
                onChange={(event) => update(key, Number(event.target.value))}
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label htmlFor="weight-boost" className="text-xs text-muted-foreground">
              Preference boost (points added when the volunteer names the activity)
            </Label>
            <Input
              id="weight-boost"
              type="number"
              step="1"
              min={0}
              max={25}
              value={weights.preferenceBoost}
              onChange={(event) => update("preferenceBoost", Number(event.target.value))}
            />
          </div>

          <p
            className={
              Math.abs(sum - 1) < 0.001
                ? "text-xs text-muted-foreground"
                : "text-xs text-destructive"
            }
          >
            Weights currently add up to {sum.toFixed(2)}.
          </p>

          <Button
            type="submit"
            size="sm"
            className="rounded-full"
            disabled={saving || Math.abs(sum - 1) >= 0.001}
          >
            {saving ? "Saving…" : "Save weights"}
          </Button>
        </form>
      )}
    </section>
  );
}
