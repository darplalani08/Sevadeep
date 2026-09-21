"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Step = { title: string; description: string };

export function StepsTimeline({ steps, className }: { steps: readonly Step[]; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden
        className="absolute top-0 bottom-0 left-[19px] hidden w-px bg-border sm:block lg:left-1/2 lg:block"
      />
      <ol className="grid gap-8 lg:grid-cols-4 lg:gap-6">
        {steps.map((step, i) => (
          <motion.li
            key={step.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
            className="relative flex gap-4 lg:flex-col lg:gap-4"
          >
            <span className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-sm ring-4 ring-background">
              {i + 1}
            </span>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="font-heading text-base font-semibold text-foreground">{step.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{step.description}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
