import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Search } from "lucide-react";
import { Container, Section } from "@/components/common/container";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { siteConfig } from "@content/site";

export default function NotFound() {
  return (
    <Section className="flex min-h-[70vh] items-center">
      <Container className="flex flex-col items-center text-center">
        <Image src={siteConfig.logo} alt="" width={64} height={64} className="size-16 opacity-80" />
        <p className="mt-6 font-heading text-7xl font-bold text-primary">404</p>
        <h1 className="mt-2 font-heading text-2xl font-semibold text-foreground">Page not found</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          The page you&apos;re looking for might have been moved, renamed, or doesn&apos;t exist. Let&apos;s get you
          back on track.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className={cn(buttonVariants(), "gap-2 rounded-full")}>
            <ArrowLeft className="size-4" /> Back to Home
          </Link>
          <Link href="/ngos" className={cn(buttonVariants({ variant: "outline" }), "gap-2 rounded-full")}>
            <Search className="size-4" /> Browse NGOs
          </Link>
        </div>
      </Container>
    </Section>
  );
}
