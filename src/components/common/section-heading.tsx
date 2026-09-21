"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  heading: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeading({ eyebrow, heading, description, align = "left", className }: SectionHeadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}
    >
      {eyebrow && (
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold tracking-wide text-accent-700 uppercase dark:text-accent-400">
          {eyebrow}
        </span>
      )}
      <h2 className="text-display-3 font-heading font-semibold text-balance text-foreground">{heading}</h2>
      {description && <p className="mt-3 text-base text-muted-foreground sm:text-lg">{description}</p>}
    </motion.div>
  );
}
