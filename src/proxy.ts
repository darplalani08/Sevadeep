// Fast redirect for the staff area.
//
// Next renders a Server Component redirect as a meta-refresh once streaming has begun, which is
// a poor experience for someone who simply isn't signed in. This runs before rendering starts and
// issues a real 307 instead.
//
// It is NOT the authorisation check. It only looks at whether a session cookie is *present* —
// it never validates it, because the proxy must stay free of database and bundle dependencies.
// Authorisation itself happens twice, server-side, where it belongs:
//   * src/app/admin/page.tsx resolves the session before rendering anything, and
//   * every /api/admin/* route handler calls requireAdmin().
// A forged or expired cookie therefore gets past this redirect and is rejected there.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE } from "./server/auth/cookie";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The login and setup screens must stay reachable without a session.
  if (pathname.startsWith("/admin/login") || pathname.startsWith("/admin/setup")) {
    return NextResponse.next();
  }

  if (!request.cookies.has(SESSION_COOKIE)) {
    const url = new URL("/admin/login", request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
