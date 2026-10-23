import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Container, Section } from "@/components/common/container";
import { buttonVariants } from "@/components/ui/button";
import { AccountForm } from "@/components/auth/account-form";
import { cn } from "@/lib/utils";
import { siteConfig } from "@content/site";

export const metadata: Metadata = {
  title: "NGO Login",
  description: "Login to your SevaDeep NGO account to manage your listing and needs.",
  alternates: { canonical: "/ngo-login" },
};

export default function NgoLoginPage() {
  return (
    <Section className="flex min-h-[70vh] items-center">
      <Container className="max-w-md">
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <Image src={siteConfig.logo} alt={siteConfig.name} width={64} height={64} className="mx-auto size-16" />
          <h1 className="mt-3 font-heading text-xl font-bold">
            <span className="text-primary">Seva</span>
            <span className="text-accent-600 dark:text-accent-400">Deep</span>
          </h1>
          <p className="text-sm text-muted-foreground">{siteConfig.tagline}</p>
          <h2 className="mt-6 font-heading text-lg font-semibold text-foreground">NGO Login</h2>
          <div className="mt-6 text-left">
            <AccountForm role="ngo" />
          </div>
          <p className="mt-6 text-sm text-muted-foreground">Not registered yet?</p>
          <div className="mt-3 flex justify-center gap-3">
            <Link href="/ngo-registration" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "rounded-full")}>
              NGO Signup
            </Link>
            <Link href="/#about" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "rounded-full")}>
              About Us
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  );
}
