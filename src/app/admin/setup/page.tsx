// First-administrator setup.
//
// The password is never hardcoded, committed or sent through chat: it is typed here (or into
// `npm run admin:create`), hashed with scrypt and only the hash is stored. Once one
// administrator exists this page permanently redirects to the login screen.

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Container, Section } from "@/components/common/container";
import { adminCount } from "@/server/db/admins";
import { MIN_PASSWORD_LENGTH } from "@/server/auth/password";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = {
  title: "Administrator Setup",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSetupPage() {
  if (adminCount() > 0) redirect("/admin/login");

  return (
    <Section className="pt-10">
      <Container className="max-w-md">
        <h1 className="font-heading text-display-4 font-semibold text-foreground">
          Create the first administrator
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This screen is available only because no administrator account exists yet. Choose a
          password of at least {MIN_PASSWORD_LENGTH} characters with upper and lower case, a digit
          and a symbol. It is hashed with scrypt before it is stored — nobody, including this
          application, can read it back.
        </p>
        <div className="mt-6">
          <SetupForm />
        </div>
      </Container>
    </Section>
  );
}
