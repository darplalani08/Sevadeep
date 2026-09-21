"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, HeartHandshake } from "lucide-react";
import { Container, Section } from "@/components/common/container";
import { SectionHeading } from "@/components/common/section-heading";
import { activityFeed } from "@content/home";

export function ActivityFeed() {
  return (
    <Section className="bg-secondary/30">
      <Container>
        <SectionHeading eyebrow={activityFeed.eyebrow} heading={activityFeed.heading} />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {activityFeed.columns.map((column, colIdx) => (
            <div key={column.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-heading text-base font-semibold text-foreground">{column.title}</h3>
              <ul className="mt-4 space-y-3">
                {column.items.map((item, i) => (
                  <motion.li
                    key={item}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.4, delay: (colIdx * column.items.length + i) * 0.05 }}
                    className="flex items-start gap-2.5 text-sm text-muted-foreground"
                  >
                    <HeartHandshake className="mt-0.5 size-4 shrink-0 text-accent-500" />
                    <span>{item}</span>
                  </motion.li>
                ))}
              </ul>
              <Link
                href="/gallery"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                See More <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
