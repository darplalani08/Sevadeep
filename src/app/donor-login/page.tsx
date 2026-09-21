import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ListChecks, Search } from "lucide-react";

import { Container, Section } from "@/components/common/container";
import { buttonVariants } from "@/components/ui/button";
import { PhoneLoginForm } from "@/components/sections/phone-login-form";
import { cn } from "@/lib/utils";
import { siteConfig } from "@content/site";

export const metadata: Metadata = {
  title: "Donor Login",
  description: "Login as a donor to search NGOs, view NGO needs, and track your donations on SevaDeep.",
  alternates: { canonical: "/donor-login" },
};

export default function DonorLoginPage() {
  return (
    <Section className="flex min-h-[70vh] items-center">
      <Container className="grid max-w-4xl gap-8 lg:grid-cols-2 lg:items-center">
        <div>
          <Image src={siteConfig.logo} alt={siteConfig.name} width={56} height={56} className="size-14" />
          <h1 className="mt-3 font-heading text-2xl font-bold">
            <span className="text-primary">Seva</span>
            <span className="text-accent-600 dark:text-accent-400">Deep</span>
          </h1>
          <p className="text-sm text-muted-foreground">{siteConfig.tagline} &mdash; know more about us</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/ngos" className={cn(buttonVariants({ variant: "outline" }), "justify-start gap-2 rounded-full")}>
              <Search className="size-4" /> Search NGO
            </Link>
            <Link href="/ngo-needs" className={cn(buttonVariants({ variant: "outline" }), "justify-start gap-2 rounded-full")}>
              <ListChecks className="size-4" /> View NGO Needs
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h2 className="font-heading text-lg font-semibold text-foreground">Donor Login</h2>
          <p className="mt-1 text-sm text-muted-foreground">You can donate using Google or your phone number.</p>
          <div className="mt-6">
            <PhoneLoginForm role="Donor" />
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to our terms and conditions.
          </p>
        </div>
      </Container>
    </Section>
  );
}
