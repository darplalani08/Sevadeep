"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Flame, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Ngo } from "@content/ngos";

export function NgoCard({ ngo, onReadMore }: { ngo: Ngo; onReadMore: (ngo: Ngo) => void }) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-lg"
    >
      <div className="relative h-40 w-full overflow-hidden bg-muted">
        {ngo.photo ? (
          <Image
            src={ngo.photo}
            alt={ngo.name}
            fill
            sizes="(min-width: 1024px) 360px, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5">
            <Flame className="size-10 text-primary/50" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <Badge variant="secondary" className="w-fit bg-accent/15 text-accent-700 dark:text-accent-400">
          {ngo.category}
        </Badge>
        <h3 className="font-heading text-lg font-semibold text-foreground">{ngo.name}</h3>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3.5" />
          {ngo.area}, {ngo.city}
        </p>
        <p className="mt-1 line-clamp-3 flex-1 text-sm text-muted-foreground">{ngo.description}</p>
        <Button variant="outline" size="sm" className="mt-3 w-fit rounded-full" onClick={() => onReadMore(ngo)}>
          Read More
        </Button>
      </div>
    </motion.article>
  );
}
