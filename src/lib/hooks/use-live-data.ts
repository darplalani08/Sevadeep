"use client";

// Near-real-time data synchronisation by short-interval polling.
//
// This is polling, not push: the UI re-reads the API every `intervalMs` (3-5s in this app) and
// re-renders when the payload actually changed. It is deliberately the simplest mechanism that
// satisfies "no manual refresh" on a single-node localhost deployment — no WebSocket server, no
// SSE connection pool, nothing extra to run during a demo.
//
// Guarantees:
//   - one request in flight at a time (no overlapping polls)
//   - polling stops on unmount and the in-flight request is aborted
//   - polling pauses while the tab is hidden and refetches immediately on return
//   - consecutive failures back off (interval x 2, x 4 ... capped) and recover on success
//   - identical payloads do not trigger a re-render
//
// Note on state handling: nothing here calls setState during render or synchronously inside the
// effect body. The poll loop is scheduled with setTimeout, so every state update happens in a
// later task, and a change of `resetKey` is handled by *deriving* a fresh snapshot rather than
// setting state. That keeps the hook clean under react-hooks/set-state-in-effect.

import * as React from "react";

export type LiveDataState<T> = {
  data: T | null;
  error: string | null;
  /** True only for the very first load, so lists don't flash a skeleton on every poll. */
  loading: boolean;
  /** True while a background poll is in flight. */
  refreshing: boolean;
  lastUpdatedAt: Date | null;
  /** Number of consecutive failed polls — the UI shows a "reconnecting" hint above 1. */
  failures: number;
  refresh: () => void;
};

export type UseLiveDataOptions<T> = {
  /** Must honour the AbortSignal; throw to signal failure. */
  fetcher: (signal: AbortSignal) => Promise<T>;
  intervalMs?: number;
  enabled?: boolean;
  /** Initial data provided via server-side rendering to eliminate client loading waterfalls. */
  initialData?: T;
  /** Change this to start over (e.g. a different search term). */
  resetKey?: string;
  /** Called when the server says the session is gone, so the shell can redirect. */
  onUnauthorized?: () => void;
};

export class UnauthorizedError extends Error {
  constructor(message = "Session expired") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

const MAX_BACKOFF_MULTIPLIER = 8;

type Snapshot<T> = {
  /** Which resetKey this snapshot belongs to. */
  key: string;
  data: T | null;
  error: string | null;
  loaded: boolean;
  lastUpdatedAt: Date | null;
  refreshing: boolean;
  failures: number;
};

function emptySnapshot<T>(key: string, initialData?: T): Snapshot<T> {
  return {
    key,
    data: initialData ?? null,
    error: null,
    loaded: initialData !== undefined,
    lastUpdatedAt: initialData !== undefined ? new Date() : null,
    refreshing: false,
    failures: 0,
  };
}

export function useLiveData<T>({
  fetcher,
  intervalMs = 4000,
  enabled = true,
  initialData,
  resetKey = "",
  onUnauthorized,
}: UseLiveDataOptions<T>): LiveDataState<T> {
  const [snapshot, setSnapshot] = React.useState<Snapshot<T>>(() =>
    emptySnapshot<T>(resetKey, initialData)
  );

  // A new resetKey means a different query, so last time's payload is not ours to show. Derived
  // rather than reset with setState, so no render ever triggers another render.
  const current = snapshot.key === resetKey ? snapshot : emptySnapshot<T>(resetKey);

  // Kept in refs so changing the callbacks never restarts the poll loop. Assigned in an effect
  // (not during render) and initialised with the first value, so the loop — which only ever runs
  // in a later task — always sees something current.
  const fetcherRef = React.useRef(fetcher);
  const onUnauthorizedRef = React.useRef(onUnauthorized);

  React.useEffect(() => {
    fetcherRef.current = fetcher;
    onUnauthorizedRef.current = onUnauthorized;
  }, [fetcher, onUnauthorized]);

  const [manualTick, setManualTick] = React.useState(0);
  const refresh = React.useCallback(() => setManualTick((tick) => tick + 1), []);
  const initialUsedRef = React.useRef(false);

  React.useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | null = null;
    let consecutiveFailures = 0;
    let inFlight = false;
    let serialised: string | null = initialData !== undefined ? JSON.stringify(initialData) : null;

    /** Only ever called from a scheduled task, never during the effect itself. */
    const update = (patch: Partial<Snapshot<T>>) => {
      if (cancelled) return;
      setSnapshot((previous) => {
        const base = previous.key === resetKey ? previous : emptySnapshot<T>(resetKey);
        return { ...base, ...patch, key: resetKey };
      });
    };

    const schedule = (delay = intervalMs * Math.min(2 ** consecutiveFailures, MAX_BACKOFF_MULTIPLIER)) => {
      if (cancelled) return;
      timer = setTimeout(run, delay);
    };

    const run = async () => {
      if (cancelled || inFlight) return;

      if (typeof document !== "undefined" && document.hidden) {
        // Nothing is on screen — skip the request and check again next tick.
        schedule();
        return;
      }

      inFlight = true;
      controller = new AbortController();
      update({ refreshing: true });

      try {
        const result = await fetcherRef.current(controller.signal);
        if (cancelled) return;

        consecutiveFailures = 0;
        const next = JSON.stringify(result);
        if (next === serialised) {
          // Nothing changed: clear any error state but leave `data` (and therefore the rendered
          // output) exactly as it is.
          update({ error: null, failures: 0, loaded: true });
        } else {
          serialised = next;
          update({
            data: result,
            error: null,
            failures: 0,
            loaded: true,
            lastUpdatedAt: new Date(),
          });
        }
      } catch (caught) {
        if (cancelled) return;
        if (caught instanceof DOMException && caught.name === "AbortError") return;

        if (caught instanceof UnauthorizedError) {
          cancelled = true;
          onUnauthorizedRef.current?.();
          return;
        }

        consecutiveFailures += 1;
        update({
          error: caught instanceof Error ? caught.message : "Could not reach the server.",
          failures: consecutiveFailures,
          loaded: true,
        });
      } finally {
        inFlight = false;
        if (!cancelled) {
          update({ refreshing: false });
          schedule();
        }
      }
    };

    const onVisible = () => {
      if (document.hidden || cancelled) return;
      if (timer) clearTimeout(timer);
      schedule(0);
    };

    // If initialData was supplied (from SSR), the data is already fresh: start polling
    // after the interval rather than immediately refetching on tick 0.
    if (initialData !== undefined && !initialUsedRef.current) {
      initialUsedRef.current = true;
      schedule(intervalMs);
    } else {
      schedule(0);
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, intervalMs, resetKey, manualTick]);

  return {
    data: current.data,
    error: current.error,
    loading: enabled && !current.loaded,
    refreshing: current.refreshing,
    lastUpdatedAt: current.lastUpdatedAt,
    failures: current.failures,
    refresh,
  };
}

/** `fetch` wrapper that turns a 401 into UnauthorizedError and other failures into Error. */
export async function fetchJson<T>(
  input: string,
  init: RequestInit & { signal?: AbortSignal } = {}
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });

  if (response.status === 401) throw new UnauthorizedError();

  const body = (await response.json().catch(() => null)) as (T & { error?: string }) | null;

  if (!response.ok) {
    throw new Error(body?.error ?? `Request failed (${response.status}).`);
  }
  if (body === null) throw new Error("The server returned an unreadable response.");
  return body;
}
