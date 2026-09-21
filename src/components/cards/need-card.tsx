"use client";

import { motion } from "framer-motion";
import { CheckCircle2, MapPin, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Need } from "@content/needs";

export function NeedCard({
  need,
  inBucket,
  onToggle,
}: {
  need: Need;
  inBucket: boolean;
  onToggle: (need: Need) => void;
}) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-sm font-bold text-primary">
            NGO
          </span>
          <div>
            <h3 className="font-heading text-base leading-tight font-semibold text-foreground">{need.ngoName}</h3>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3.5" />
              {need.location}
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="shrink-0 bg-accent/15 text-accent-700 dark:text-accent-400">
          {need.category}
        </Badge>
      </div>

      <p className="line-clamp-2 text-sm text-muted-foreground">{need.description}</p>

      <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
        <Package className="size-4 text-primary" />
        <span className="font-medium text-foreground">{need.item}</span>
        <span className="ml-auto text-muted-foreground">Qty {need.quantity}</span>
      </div>

      <p className="line-clamp-2 text-xs text-muted-foreground">{need.reason}</p>

      <Button
        variant={inBucket ? "secondary" : "default"}
        size="sm"
        className="mt-auto w-full rounded-full"
        onClick={() => onToggle(need)}
      >
        {inBucket ? (
          <>
            <CheckCircle2 className="size-4" /> Added to Bucket
          </>
        ) : (
          "Donate This"
        )}
      </Button>
    </motion.article>
  );
}
