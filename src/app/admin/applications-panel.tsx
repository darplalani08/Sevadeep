"use client";

// Application management: search, status filter, detail view and status changes.
//
// A status change PATCHes the protected API, which writes the new status plus an audit event
// inside one transaction. The applicant's tracking page — polling the same database — picks the
// change up within a few seconds without anybody reloading anything.

import * as React from "react";
import { AlertCircle, Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { fetchJson, useLiveData } from "@/lib/hooks/use-live-data";
import { applicationStatuses, statusGuidance, type ApplicationStatus } from "@content/education";
import { cn } from "@/lib/utils";
import type { AdminApplication, ApplicationEvent } from "@/server/db/applications";
import { POLL_INTERVAL_MS } from "./dashboard";

type ListResponse = { items: AdminApplication[]; total: number };

const statusBadge: Record<ApplicationStatus, string> = {
  Submitted: "bg-muted text-foreground",
  "Under Review": "bg-warning/20 text-foreground",
  Approved: "bg-success/15 text-success",
  Rejected: "bg-destructive/10 text-destructive",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ApplicationsPanel({
  active,
  onUnauthorized,
}: {
  active: boolean;
  onUnauthorized: () => void;
}) {
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [status, setStatus] = React.useState<ApplicationStatus | "all">("all");
  const [selected, setSelected] = React.useState<string | null>(null);

  // Debounce so typing doesn't fire a request per keystroke.
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const query = React.useMemo(() => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (debouncedSearch) params.set("search", debouncedSearch);
    return params.toString();
  }, [status, debouncedSearch]);

  const live = useLiveData<ListResponse>({
    fetcher: (signal) =>
      fetchJson<ListResponse>(`/api/admin/applications${query ? `?${query}` : ""}`, { signal }),
    intervalMs: POLL_INTERVAL_MS,
    enabled: active,
    resetKey: query,
    onUnauthorized,
  });

  const items = live.data?.items ?? [];
  const selectedApplication = items.find((item) => item.reference === selected) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <Label htmlFor="application-search" className="text-xs text-muted-foreground">
            Search
          </Label>
          <div className="relative mt-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="application-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Reference, student, guardian, phone, email or city"
              className="pl-9"
            />
          </div>
        </div>
        <div>
          <span id="status-filter-label" className="text-xs text-muted-foreground">
            Status
          </span>
          <div
            role="group"
            aria-labelledby="status-filter-label"
            className="mt-1 flex flex-wrap gap-1.5"
          >
            {(["all", ...applicationStatuses] as const).map((option) => (
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
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <RefreshCw className={cn("size-3.5", live.refreshing && "animate-spin")} />
        {live.failures > 0
          ? `Reconnecting… (${live.failures} failed)`
          : `${live.data?.total ?? 0} application${
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
          Loading applications…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">No applications to show</p>
          <p className="mt-1">
            {debouncedSearch || status !== "all"
              ? "Nothing matches this search and filter."
              : "When a student submits the enrolment form, it appears here automatically."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <caption className="sr-only">Student enrolment applications</caption>
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Reference</th>
                <th scope="col" className="px-4 py-3 font-medium">Student</th>
                <th scope="col" className="px-4 py-3 font-medium">Class</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 font-medium">Submitted</th>
                <th scope="col" className="px-4 py-3 font-medium">Updated</th>
                <th scope="col" className="px-4 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.reference} className="border-b border-border/60 last:border-0">
                  <th scope="row" className="px-4 py-3 font-mono text-xs font-normal text-foreground">
                    {item.reference}
                  </th>
                  <td className="px-4 py-3 text-foreground">
                    {item.studentName}
                    <span className="block text-xs text-muted-foreground">
                      {item.guardianName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{item.studentClass}</td>
                  <td className="px-4 py-3">
                    <Badge className={cn("font-medium", statusBadge[item.status])}>
                      {item.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                    {formatDateTime(item.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                    {formatDateTime(item.updatedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => setSelected(item.reference)}
                    >
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ApplicationDialog
        application={selectedApplication}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        onUpdated={live.refresh}
        onUnauthorized={onUnauthorized}
      />
    </div>
  );
}

function ApplicationDialog({
  application,
  open,
  onOpenChange,
  onUpdated,
  onUnauthorized,
}: {
  application: AdminApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
  onUnauthorized: () => void;
}) {
  const [history, setHistory] = React.useState<ApplicationEvent[]>([]);
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState<ApplicationStatus | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const reference = application?.reference ?? null;

  React.useEffect(() => {
    if (!reference || !open) return;
    const controller = new AbortController();
    (async () => {
      try {
        const body = await fetchJson<{ history: ApplicationEvent[] }>(
          `/api/admin/applications/${encodeURIComponent(reference)}`,
          { signal: controller.signal }
        );
        setHistory(body.history ?? []);
      } catch (caught) {
        if (caught instanceof Error && caught.name === "UnauthorizedError") onUnauthorized();
      }
    })();
    return () => controller.abort();
  }, [reference, open, onUnauthorized]);

  const changeStatus = async (status: ApplicationStatus) => {
    if (!application || saving) return;
    setSaving(status);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/applications/${encodeURIComponent(application.reference)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, note: note.trim() || undefined }),
        }
      );

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      const body = (await response.json().catch(() => null)) as
        | { error?: string; history?: ApplicationEvent[]; unchanged?: boolean }
        | null;

      if (!response.ok) {
        setError(body?.error ?? "Could not update the status.");
        return;
      }

      if (body?.unchanged) {
        toast.info(`Already ${status} — nothing changed.`);
        return;
      }

      setHistory(body?.history ?? []);
      setNote("");
      onUpdated();
      toast.success(`${application.reference} is now ${status}`, {
        description: "The applicant's tracking page will show this within a few seconds.",
      });
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        {application && (
          <>
            <DialogHeader>
              <DialogTitle className="font-mono text-base">{application.reference}</DialogTitle>
              <DialogDescription>
                Submitted {formatDateTime(application.createdAt)} · last updated{" "}
                {formatDateTime(application.updatedAt)}
              </DialogDescription>
            </DialogHeader>

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Field label="Student">{application.studentName}</Field>
              <Field label="Parent / guardian">{application.guardianName}</Field>
              <Field label="Contact">
                <a
                  href={`tel:${application.contactNumber}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {application.contactNumber}
                </a>
              </Field>
              <Field label="Email">{application.email ?? "—"}</Field>
              <Field label="Age">{application.studentAge ?? "—"}</Field>
              <Field label="Class">{application.studentClass}</Field>
              <Field label="City">{application.city ?? "—"}</Field>
              <Field label="Current status">
                <Badge className={cn("font-medium", statusBadge[application.status])}>
                  {application.status}
                </Badge>
              </Field>
              <Field label="Support needed" className="sm:col-span-2">
                {application.supportNeeded.join(", ") || "—"}
              </Field>
              {application.notes && (
                <Field label="Applicant notes" className="sm:col-span-2">
                  {application.notes}
                </Field>
              )}
            </dl>

            <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              Applicant sees: “{statusGuidance[application.status]}”
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <div className="space-y-2">
                <Label htmlFor="status-note" className="text-xs text-muted-foreground">
                  Note for the status history (optional, internal + shown on the tracking page)
                </Label>
                <Textarea
                  id="status-note"
                  rows={2}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="e.g. Matched with Sevasadan Society — coordinator to call."
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {applicationStatuses.map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={status === application.status ? "secondary" : "outline"}
                    className="rounded-full"
                    disabled={saving !== null || status === application.status}
                    onClick={() => changeStatus(status)}
                  >
                    {saving === status ? "Saving…" : `Set ${status}`}
                  </Button>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground">Status history</h3>
              <ol className="mt-2 space-y-2 text-sm">
                {history.map((event, index) => (
                  <li key={`${event.at}-${index}`} className="text-muted-foreground">
                    <span className="text-foreground">
                      {event.previousStatus
                        ? `${event.previousStatus} → ${event.status}`
                        : event.status}
                    </span>{" "}
                    · {formatDateTime(event.at)}
                    {event.note && <span className="block text-xs">{event.note}</span>}
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-foreground">{children}</dd>
    </div>
  );
}
