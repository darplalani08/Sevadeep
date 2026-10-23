import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Container, Section } from "@/components/common/container";
import { countAccounts } from "@/server/db/accounts";
import { getCurrentAdmin } from "@/server/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Administrator Login",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  // No account yet → the one-time setup screen. Already signed in → straight to the dashboard.
  if ((await countAccounts("admin")) === 0) redirect("/admin/setup");
  if (await getCurrentAdmin()) redirect("/admin");

  return (
    <Section className="pt-10">
      <Container className="max-w-md">
        <h1 className="font-heading text-display-4 font-semibold text-foreground">
          SevaDeep Administration
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Staff sign-in. Applicant and volunteer details are only visible from here.
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </Container>
    </Section>
  );
}
