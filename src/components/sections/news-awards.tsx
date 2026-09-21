"use client";

import * as React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Container, Section } from "@/components/common/container";
import { SectionHeading } from "@/components/common/section-heading";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { news } from "@content/home";

export function NewsAwards() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);
  const active = openIndex !== null ? news.items[openIndex] : null;

  return (
    <Section className="bg-secondary/30">
      <Container>
        <SectionHeading eyebrow={news.eyebrow} heading={news.heading} />
        <div className="mt-10 columns-1 gap-5 sm:columns-2 lg:columns-4 [&>*]:mb-5">
          {news.items.map((item, i) => (
            <motion.button
              key={item.title}
              type="button"
              onClick={() => setOpenIndex(i)}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="group block w-full break-inside-avoid overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-shadow hover:shadow-lg"
            >
              <div className={`relative w-full overflow-hidden ${i % 2 === 0 ? "aspect-[4/5]" : "aspect-square"}`}>
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="(min-width: 1024px) 280px, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <h3 className="font-heading text-sm font-semibold text-foreground">{item.title}</h3>
              </div>
            </motion.button>
          ))}
        </div>
      </Container>

      <Dialog open={openIndex !== null} onOpenChange={(open) => !open && setOpenIndex(null)}>
        <DialogContent showCloseButton={false} className="max-w-2xl overflow-hidden p-0">
          {active && (
            <>
              <DialogTitle className="sr-only">{active.title}</DialogTitle>
              <div className="relative aspect-video w-full bg-muted">
                <Image src={active.image} alt={active.title} fill sizes="640px" className="object-cover" />
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setOpenIndex(null)}
                  className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-background/80 backdrop-blur"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="p-6">
                <h3 className="font-heading text-lg font-semibold text-foreground">{active.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{active.description}</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Section>
  );
}
