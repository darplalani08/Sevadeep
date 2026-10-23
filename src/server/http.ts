// Shared helpers for the platform's route handlers.

import type { NextRequest } from "next/server";
import type { z } from "zod";

export const noStore = { "Cache-Control": "no-store" } as const;

/**
 * JSON response helper.
 *
 * The `body extends object ? ... : body` guard makes handing it a Promise a *type* error. Every
 * repository is async now, and `json(getOverview())` silently serialises a Promise as `{}` —
 * HTTP 200 with an empty body, no stack trace, no clue. That bug shipped once; the signature
 * below is what stops it shipping again.
 */
export function json<T>(
  body: T extends Promise<unknown> ? never : T,
  init?: { status?: number; headers?: HeadersInit }
) {
  return Response.json(body, {
    status: init?.status ?? 200,
    headers: { ...noStore, ...(init?.headers ?? {}) },
  });
}

export function badRequest(message: string, details?: unknown) {
  return json({ error: message, details }, { status: 400 });
}

export function serverError(message = "Something went wrong. Please try again.") {
  return json({ error: message }, { status: 500 });
}

/**
 * Best-effort client identity for rate limiting. On localhost this is almost always ::1, which
 * is fine — the limiter exists to stop runaway scripts and brute force, not to be an ACL.
 */
export function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "local";
}

export async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/** Runs a Zod schema and returns either the parsed value or a 400 with field-level messages. */
export function validate<S extends z.ZodType>(
  schema: S,
  value: unknown
): { ok: true; data: z.infer<S> } | { ok: false; response: Response } {
  const result = schema.safeParse(value);
  if (result.success) return { ok: true, data: result.data };

  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return {
    ok: false,
    response: json(
      { error: "Please correct the highlighted fields.", fieldErrors },
      { status: 400 }
    ),
  };
}

// ---------------------------------------------------------------------------
// In-memory sliding-window rate limiter
// ---------------------------------------------------------------------------
//
// Deliberately in-process: this is a single-node localhost deployment, and a database write per
// request would cost more than the protection is worth. Login attempts, which must survive a
// restart, are counted in SQLite instead (see server/db/admins.ts).

type Bucket = { hits: number[] };
const globalForLimiter = globalThis as unknown as { __sevadeepLimiter?: Map<string, Bucket> };
const buckets = (globalForLimiter.__sevadeepLimiter ??= new Map<string, Bucket>());

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
  now = Date.now()
): { allowed: boolean; retryAfterSeconds: number } {
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket);
    const oldest = bucket.hits[0];
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)),
    };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);

  // Keep the map from growing without bound on a long-running dev server.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.hits.length === 0 || now - v.hits[v.hits.length - 1] > windowMs) buckets.delete(k);
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function tooManyRequests(retryAfterSeconds: number) {
  return json(
    { error: "Too many requests. Please wait a moment and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}
