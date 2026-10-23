// Administrator dashboard (server-side guard).
//
// Authorisation happens here AND in every /api/admin/* route handler, so neither a direct URL
// nor a hand-crafted fetch can read applicant data without a valid session.

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { countAccounts } from "@/server/db/accounts";
import { getCurrentAdmin } from "@/server/auth/session";
import { getOverview } from "@/server/db/analytics";
import { AdminDashboard } from "./dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    if ((await countAccounts("admin")) === 0) redirect("/admin/setup");
    redirect("/admin/login");
  }

  // Pre-fetch the overview data during server render so the dashboard mounts with
  // all statistics, charts and metrics already present on first paint (0s client waterfall).
  let initialOverview = null;
  try {
    initialOverview = await getOverview();
  } catch (error) {
    console.error("[admin/page] failed to pre-fetch overview", error);
  }

  return (
    <AdminDashboard
      admin={{ name: admin.displayName, username: admin.username }}
      initialData={initialOverview ?? undefined}
    />
  );
}
