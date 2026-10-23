import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { Container, Section } from "@/components/common/container";
import { EnrollmentForm } from "./enrollment-form";

export const metadata: Metadata = {
  title: "Student Enrolment",
  description:
    "Apply for SevaDeep educational support — tuition, study material, fees assistance and digital literacy — and track your application online.",
  alternates: { canonical: "/enroll" },
};

export default function EnrollPage() {
  return (
    <>
      <div className="border-b border-border bg-secondary/30 py-8">
        <Container>
          <Breadcrumbs items={[{ label: "Student Enrolment" }]} />
          <h1 className="mt-3 font-heading text-display-3 font-semibold text-foreground">
            Student Enrolment
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Apply for educational support for a student. A SevaDeep coordinator reviews every
            application and routes it to the partner NGO best placed to help.
          </p>
        </Container>
      </div>
      <Section className="pt-10">
        <Container className="max-w-2xl">
          <EnrollmentForm />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already applied?{" "}
            <Link href="/track" className="font-medium text-primary underline-offset-4 hover:underline">
              Track your application
            </Link>
            .
          </p>
        </Container>
      </Section>
    </>
  );
}
