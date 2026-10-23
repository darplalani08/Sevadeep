// GET /api/auth/session — who, if anyone, is signed in.

import { getCurrentAccount } from "@/server/auth/session";
import { json, serverError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const account = await getCurrentAccount();
    if (!account) return json({ account: null }, { status: 401 });
    return json({
      account: {
        username: account.username,
        displayName: account.displayName,
        role: account.role,
        organisation: account.organisation,
      },
    });
  } catch (error) {
    console.error("[auth/session] failed", error);
    return serverError();
  }
}
