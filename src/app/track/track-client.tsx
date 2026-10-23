"use client";

// Public application tracking.
//
// Once a lookup succeeds the page keeps polling the same endpoint every 4 seconds, so an
// administrator changing the status in the dashboard shows up here without a manual refresh.
// The endpoint returns status/date fields only — no contact details — and requires the private
// tracking code on every single request, including the polls.

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AlertCircle, Loader2, RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useLiveData } from "@/lib/hooks/use-live-data";
import { trackingLookupSchema, type TrackingLookupValues } from "@/lib/validations/enrollment";
import { applicationStatuses, type ApplicationStatus } from "@content/education";
import { cn } from "@/lib/utils";

type TrackedApplication = {
  reference: string;
  studentFirstName: string;
  studentClass: string;
  supportNeeded: string[];
  status: ApplicationStatus;
  submittedAt: string;
  updatedAt: string;
  history: { status: ApplicationStatus; previousStatus: ApplicationStatus | null; note: string | null; at: string }[];
};

type TrackResponse = { application: TrackedApplication; guidance: string };

const POLL_INTERVAL_MS = 4000;

const statusTone: Record<ApplicationStatus, string> = {
  Submitted: "bg-muted text-foreground ring-border",
  "Under Review": "bg-warning/15 text-warning-foreground ring-warning/40 dark:text-warning",
  Approved: "bg-success/15 text-success ring-success/40",
  Rejected: "bg-destructive/10 text-destructive ring-destructive/30",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TrackClient() {
  const searchParams = useSearchParams();
  const prefilledReference = searchParams.get("ref") ?? "";

  // Credentials are held in component state only — never in localStorage or the URL.
  const [credentials, setCredentials] = React.useState<TrackingLookupValues | null>(null);
  const [lookupError, setLookupError] = React.useState<string | null>(null);

  const form = useForm<TrackingLookupValues>({
    resolver: zodResolver(trackingLookupSchema),
    defaultValues: { reference: prefilledReference, code: "" },
  });

  const fetcher = React.useCallback(
    async (signal: AbortSignal): Promise<TrackResponse> => {
      if (!credentials) throw new Error("No lookup in progress.");
      const response = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        signal,
        cache: "no-store",
      });
      const body = (await response.json().catch(() => null)) as
        | (TrackResponse & { error?: string })
        | null;
      if (!response.ok || !body?.application) {
        throw new Error(body?.error ?? "We could not look up that application.");
      }
      return body;
    },
    [credentials]
  );

  const live = useLiveData<TrackResponse>({
    fetcher,
    intervalMs: POLL_INTERVAL_MS,
    enabled: credentials !== null,
    resetKey: credentials ? `${credentials.reference}:${credentials.code}` : "",
  });

  const onSubmit = async (values: TrackingLookupValues) => {
    setLookupError(null);

    // Verify once before switching into live mode, so a wrong code shows an error on the form
    // instead of starting a polling loop that can never succeed.
    try {
      const response = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
        cache: "no-store",
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setLookupError(body?.error ?? "We could not look up that application.");
        return;
      }
      setCredentials({
        reference: values.reference.trim().toUpperCase(),
        code: values.code.trim().toUpperCase(),
      });
    } catch {
      setLookupError("We could not reach the server. Check that the site is running and retry.");
    }
  };

  if (credentials) {
    return (
      <TrackedStatus
        live={live}
        onChangeApplication={() => {
          setCredentials(null);
          form.reset({ reference: "", code: "" });
        }}
      />
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
      >
        {lookupError && (
          <div
            role="alert"
            className="flex gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>{lookupError}</p>
          </div>
        )}

        <FormField
          control={form.control}
          name="reference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Application Reference *</FormLabel>
              <FormControl>
                <Input
                  placeholder="SD-2026-000001"
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tracking Code *</FormLabel>
              <FormControl>
                <Input
                  placeholder="6 characters"
                  maxLength={6}
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono tracking-widest uppercase"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                The 6-character code shown when you submitted the application.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full gap-2 rounded-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          {form.formState.isSubmitting ? "Checking…" : "Check Status"}
        </Button>
      </form>
    </Form>
  );
}

function TrackedStatus({
  live,
  onChangeApplication,
}: {
  live: ReturnType<typeof useLiveData<TrackResponse>>;
  onChangeApplication: () => void;
}) {
  const application = live.data?.application;
  const guidance = live.data?.guidance;

  if (live.loading && !application) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading your application…
      </div>
    );
  }

  if (!application) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        <p>{live.error ?? "We could not load that application."}</p>
        <Button variant="outline" className="mt-4 rounded-full" onClick={onChangeApplication}>
          Try another reference
        </Button>
      </div>
    );
  }

  const currentIndex = applicationStatuses.indexOf(application.status);
  const isTerminal = application.status === "Approved" || application.status === "Rejected";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Application reference
            </p>
            <p className="font-mono text-lg font-semibold text-foreground">
              {application.reference}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ring-1",
              statusTone[application.status]
            )}
          >
            {application.status}
          </span>
        </div>

        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Student</dt>
            <dd className="font-medium text-foreground">
              {application.studentFirstName} — {application.studentClass}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Support requested</dt>
            <dd className="font-medium text-foreground">
              {application.supportNeeded.join(", ") || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Submitted on</dt>
            <dd className="font-medium text-foreground">
              {formatDateTime(application.submittedAt)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Last updated</dt>
            <dd className="font-medium text-foreground">
              {formatDateTime(application.updatedAt)}
            </dd>
          </div>
        </dl>

        {/* Progress rail. Rejected is an end state, so it is shown on its own rather than as
            the last step of a happy path. */}
        {!isTerminal || application.status === "Approved" ? (
          <ol className="mt-7 grid gap-2 sm:grid-cols-3">
            {(["Submitted", "Under Review", "Approved"] as ApplicationStatus[]).map((stage) => {
              const stageIndex = applicationStatuses.indexOf(stage);
              const reached = currentIndex >= stageIndex;
              return (
                <li
                  key={stage}
                  aria-current={application.status === stage ? "step" : undefined}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-xs font-medium",
                    reached
                      ? "border-primary/40 bg-primary/5 text-foreground"
                      : "border-border bg-muted/40 text-muted-foreground"
                  )}
                >
                  <span className="block text-[0.65rem] tracking-wide uppercase opacity-70">
                    Step {stageIndex + 1}
                  </span>
                  {stage}
                </li>
              );
            })}
          </ol>
        ) : null}

        {guidance && (
          <div
            aria-live="polite"
            className="mt-6 rounded-xl border border-border bg-muted/40 p-4 text-sm text-foreground"
          >
            <p className="font-medium">What happens next</p>
            <p className="mt-1 text-muted-foreground">{guidance}</p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h2 className="font-heading text-base font-semibold text-foreground">Status history</h2>
        <ol className="mt-4 space-y-4">
          {application.history.map((event, index) => (
            <li key={`${event.at}-${index}`} className="flex gap-3">
              <span
                aria-hidden
                className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
              />
              <div className="text-sm">
                <p className="font-medium text-foreground">
                  {event.previousStatus
                    ? `${event.previousStatus} → ${event.status}`
                    : event.status}
                </p>
                <p className="text-xs text-muted-foreground">{formatDateTime(event.at)}</p>
                {event.note && <p className="mt-1 text-muted-foreground">{event.note}</p>}
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5">
          <RefreshCw className={cn("size-3.5", live.refreshing && "animate-spin")} />
          {live.failures > 0
            ? `Reconnecting… (${live.failures} failed attempt${live.failures === 1 ? "" : "s"})`
            : `Checking for updates every ${POLL_INTERVAL_MS / 1000} seconds${
                live.lastUpdatedAt
                  ? ` · last change seen ${live.lastUpdatedAt.toLocaleTimeString("en-IN")}`
                  : ""
              }`}
        </p>
        <button
          type="button"
          onClick={onChangeApplication}
          className="font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Check a different application
        </button>
      </div>
    </div>
  );
}
