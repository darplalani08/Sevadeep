"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Container, Section } from "@/components/common/container";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Section className="flex min-h-[70vh] items-center">
      <Container className="flex flex-col items-center text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-8" />
        </span>
        <h1 className="mt-6 font-heading text-2xl font-semibold text-foreground">Something went wrong</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          We hit an unexpected error loading this page. Please try again — if the problem continues, contact us at
          contact@sevadeep.com.
        </p>
        <Button onClick={() => reset()} className="mt-8 gap-2 rounded-full">
          <RefreshCcw className="size-4" /> Try Again
        </Button>
      </Container>
    </Section>
  );
}
