import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/common/container";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CtaBanner() {
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <div className="relative overflow-hidden rounded-[2rem] bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 -right-10 size-64 rounded-full bg-accent/30 blur-3xl"
          />
          <h2 className="relative text-display-3 font-heading font-semibold text-balance">
            Your unused items can become someone&apos;s greatest treasure
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-sm text-primary-foreground/85 sm:text-base">
            Register a donation today and SevaDeep will match it with a verified NGO — with doorstep pickup available
            in Pune.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/donation-bucket"
              className={cn(buttonVariants({ size: "lg" }), "gap-2 rounded-full bg-background text-foreground hover:bg-background/90")}
            >
              Donate Items <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/ngo-registration"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "rounded-full border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              )}
            >
              Register Your NGO
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
