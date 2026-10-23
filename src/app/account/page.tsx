// Protected account page.
//
// Proves the session is real: it is rendered server-side from the session cookie, and an
// anonymous visitor is redirected rather than shown an empty shell. Administrators are sent to
// their own dashboard.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { Container, Section } from "@/components/common/container";
import { getCurrentAccount } from "@/server/auth/session";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = {
  title: "My Account",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const account = await getCurrentAccount();
  if (!account) redirect("/donor-login");
  if (account.role === "admin") redirect("/admin");

  const isNgo = account.role === "ngo";

  return (
    <>
      <div className="border-b border-border bg-secondary/30 py-8">
        <Container>
          <Breadcrumbs items={[{ label: "My Account" }]} />
          <h1 className="mt-3 font-heading text-display-3 font-semibold text-foreground">
            {isNgo ? "NGO Account" : "Donor Account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Signed in as {account.displayName}.
          </p>
        </Container>
      </div>

      <Section className="pt-10">
        <Container className="max-w-2xl space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <h2 className="font-heading text-base font-semibold text-foreground">
              Account details
            </h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Username</dt>
                <dd className="font-mono font-medium text-foreground">@{account.username}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium text-foreground">{account.displayName}</dd>
              </div>
              {isNgo && (
                <div>
                  <dt className="text-muted-foreground">Organisation</dt>
                  <dd className="font-medium text-foreground">{account.organisation ?? "—"}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium text-foreground">{account.email ?? "—"}</dd>
              </div>
            </dl>
            <div className="mt-6">
              <SignOutButton />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <h2 className="font-heading text-base font-semibold text-foreground">What next</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {(isNgo
                ? [
                    { label: "Register your NGO's details", href: "/ngo-registration" },
                    { label: "Browse current NGO needs", href: "/ngo-needs" },
                  ]
                : [
                    { label: "Register a donation", href: "/donation-bucket" },
                    { label: "Browse verified NGOs", href: "/ngos" },
                    { label: "Sponsor a meal", href: "/narayan-seva" },
                  ]
              ).map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </Section>
    </>
  );
}
