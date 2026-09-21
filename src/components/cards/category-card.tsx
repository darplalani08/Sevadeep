"use client";

import { motion } from "framer-motion";
import {
  Bike,
  BookOpen,
  Footprints,
  Laptop,
  Refrigerator,
  Shirt,
  Sofa,
  ToyBrick,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  Shirt,
  Sofa,
  Refrigerator,
  ToyBrick,
  BookOpen,
  Footprints,
  Laptop,
  Bike,
  UtensilsCrossed,
};

type CategoryCardProps = {
  label: string;
  icon: string;
  href?: string;
  onClick?: () => void;
  selected?: boolean;
  index?: number;
};

export function CategoryCard({ label, icon, href, onClick, selected, index = 0 }: CategoryCardProps) {
  const Icon = iconMap[icon] ?? Shirt;
  const Comp = href ? "a" : "button";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
    >
      <Comp
        href={href}
        onClick={onClick}
        type={href ? undefined : "button"}
        className={cn(
          "group flex w-full flex-col items-center gap-3 rounded-2xl border border-border bg-card px-4 py-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg",
          selected && "border-primary bg-primary/5 ring-1 ring-primary"
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-accent/15 group-hover:text-accent-600">
          <Icon className="size-6" />
        </span>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </Comp>
    </motion.div>
  );
}
