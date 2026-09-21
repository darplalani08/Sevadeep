"use client";

import Image from "next/image";
import Link from "next/link";
import { Flame, MapPin, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { contact } from "@content/site";
import type { Ngo } from "@content/ngos";

export function NgoDetailDialog({ ngo, onOpenChange }: { ngo: Ngo | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={!!ngo} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden p-0">
        {ngo && (
          <>
            <div className="relative h-48 w-full bg-muted">
              {ngo.photo ? (
                <Image src={ngo.photo} alt={ngo.name} fill sizes="512px" className="object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5">
                  <Flame className="size-12 text-primary/50" />
                </div>
              )}
            </div>
            <DialogHeader className="px-6 pt-5">
              <Badge variant="secondary" className="w-fit bg-accent/15 text-accent-700 dark:text-accent-400">
                {ngo.category}
              </Badge>
              <DialogTitle className="font-heading text-xl">{ngo.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {ngo.area}, {ngo.city}
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 pb-6">
              <p className="text-sm leading-relaxed text-muted-foreground">{ngo.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={`/donation-bucket?ngo=${ngo.id}`}
                  className={cn(buttonVariants({ size: "sm" }), "rounded-full")}
                >
                  Donate to this NGO
                </Link>
                <a href={contact.phoneHref} className={cn(buttonVariants({ size: "sm", variant: "outline" }), "gap-1.5 rounded-full")}>
                  <Phone className="size-3.5" /> Contact SevaDeep
                </a>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
