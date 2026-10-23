// Administrator dashboard (server-side guard).
//
// Authorisation happens here AND in every /api/admin/* route handler, so neither a direct URL
// nor a hand-crafted fetch can read applicant data without a valid session.

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { countAccounts } from "@/server/db/accounts";
import { getCurrentAdmin } from "@/server/auth/session";
import { AdminDashboard } from "./dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if ((await countAccounts("admin")) === 0) redirect("/admin/setup");

  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  return <AdminDashboard admin={{ name: admin.displayName, username: admin.username }} />;
}
