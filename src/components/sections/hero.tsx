"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, HandHeart, ListChecks, Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { hero } from "@content/home";

const actionIcons = [Search, ListChecks, HandHeart];

export function Hero() {
  const [active, setActive] = React.useState(0);
  const reduceMotion = useReducedMotion();

  React.useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setActive((i) => (i + 1) % hero.images.length), 5000);
    return () => clearInterval(id);
  }, [reduceMotion]);

  return (
    <section className="relative overflow-hidden bg-secondary/40">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 size-[28rem] rounded-full bg-accent/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-24 size-[26rem] rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
            {hero.eyebrow}
          </span>
          <h1 className="mt-5 text-display-1 font-heading font-semibold text-balance text-foreground">
            {hero.headline.split(" with ")[0]}{" "}
            <span className="text-primary">with NGOs</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">{hero.subhead}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            {hero.quickActions.map((action, i) => {
              const Icon = actionIcons[i] ?? ArrowRight;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className={cn(
                    buttonVariants({ size: "lg", variant: i === 2 ? "default" : "outline" }),
                    "gap-2 rounded-full px-5"
                  )}
                >
                  <Icon className="size-4" />
                  {action.label}
                </Link>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
          className="relative mx-auto aspect-[1600/759] w-full max-w-xl"
        >
          <div className="glow-accent relative size-full overflow-hidden rounded-[2rem] border border-border bg-card shadow-xl">
            {hero.images.map((src, i) => (
              <Image
                key={src}
                src={src}
                alt="SevaDeep donation drive"
                fill
                priority={i === 0}
                sizes="(min-width: 1024px) 36rem, 100vw"
                className={cn(
                  "object-contain transition-opacity duration-700",
                  i === active ? "opacity-100" : "opacity-0"
                )}
              />
            ))}
          </div>
          <div className="absolute -bottom-2 -left-2 flex items-center gap-1.5">
            {hero.images.map((src, i) => (
              <button
                key={src}
                type="button"
                aria-label={`Show slide ${i + 1}`}
                onClick={() => setActive(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === active ? "w-6 bg-primary" : "w-1.5 bg-primary/30"
                )}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
