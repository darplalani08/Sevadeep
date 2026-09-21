import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { Container, Section } from "@/components/common/container";
import { VolunteerForm } from "./volunteer-form";

export const metadata: Metadata = {
  title: "Volunteer With Us",
  description: "Join the SevaDeep family — we're looking for volunteers to help us expand our outreach across India.",
  alternates: { canonical: "/volunteer-register" },
};

export default function VolunteerRegisterPage() {
  return (
    <>
      <div className="border-b border-border bg-secondary/30 py-8">
        <Container>
          <Breadcrumbs items={[{ label: "Volunteer" }]} />
          <h1 className="mt-3 text-display-3 font-heading font-semibold text-foreground">Join Our SevaDeep Family</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
            We are looking for volunteers to help us expand our outreach across India.
          </p>
        </Container>
      </div>
      <Section className="pt-10">
        <Container className="max-w-2xl">
          <VolunteerForm />
        </Container>
      </Section>
    </>
  );
}
