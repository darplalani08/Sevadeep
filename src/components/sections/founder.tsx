"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Container, Section } from "@/components/common/container";
import { founder } from "@content/home";

export function Founder() {
  return (
    <Section id="about" className="bg-secondary/30">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-[2rem] border border-border shadow-xl"
          >
            <Image src={founder.photo} alt="Deepak Nathani" fill sizes="24rem" className="object-cover" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, y: 0, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          >
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
              About the Founder
            </span>
            <h2 className="mt-4 text-display-3 font-heading font-semibold text-foreground">{founder.heading}</h2>
            <p className="mt-2 text-sm font-medium text-accent-700 dark:text-accent-400">{founder.role}</p>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground">
              {founder.paragraphs.map((p) => (
                <p key={p.slice(0, 24)}>{p}</p>
              ))}
            </div>
          </motion.div>
        </div>
      </Container>
    </Section>
  );
}
