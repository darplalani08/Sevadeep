import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { Container, Section } from "@/components/common/container";
import { TrackClient } from "./track-client";

export const metadata: Metadata = {
  title: "Track Application",
  description:
    "Check the status of a SevaDeep student enrolment application using your application reference and private tracking code.",
  alternates: { canonical: "/track" },
};

export default function TrackPage() {
  return (
    <>
      <div className="border-b border-border bg-secondary/30 py-8">
        <Container>
          <Breadcrumbs items={[{ label: "Track Application" }]} />
          <h1 className="mt-3 font-heading text-display-3 font-semibold text-foreground">
            Track Your Application
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Enter your application reference and the private tracking code you were given when you
            applied. The status updates on this page by itself — no need to reload.
          </p>
        </Container>
      </div>
      <Section className="pt-10">
        <Container className="max-w-2xl">
          <TrackClient />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Haven&apos;t applied yet?{" "}
            <Link
              href="/enroll"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Open the student enrolment form
            </Link>
            .
          </p>
        </Container>
      </Section>
    </>
  );
}
