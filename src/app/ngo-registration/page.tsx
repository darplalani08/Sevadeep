import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { Container, Section } from "@/components/common/container";
import { NgoRegistrationForm } from "./ngo-registration-form";

export const metadata: Metadata = {
  title: "NGO Registration",
  description: "Register your NGO on SevaDeep to list your needs and get discovered by verified donors near you.",
  alternates: { canonical: "/ngo-registration" },
};

export default function NgoRegistrationPage() {
  return (
    <>
      <div className="border-b border-border bg-secondary/30 py-8">
        <Container>
          <Breadcrumbs items={[{ label: "NGO Registration" }]} />
          <h1 className="mt-3 text-display-3 font-heading font-semibold text-foreground">NGO Registration</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Every member NGO is verified before being onboarded. Tell us about your organisation and we&apos;ll be in
            touch.
          </p>
        </Container>
      </div>
      <Section className="pt-10">
        <Container className="max-w-2xl">
          <NgoRegistrationForm />
        </Container>
      </Section>
    </>
  );
}
