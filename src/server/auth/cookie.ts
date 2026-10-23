// The session cookie's name, in a module with no dependencies at all.
//
// `proxy.ts` runs outside the application bundle and must not pull in the database client or
// next/headers, so the name lives here and is shared rather than duplicated.

export const SESSION_COOKIE = "sevadeep_admin_session";
