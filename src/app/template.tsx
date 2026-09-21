"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Next.js re-mounts `template.tsx` on every navigation (unlike layout.tsx, which persists),
 * so this is the simplest reliable hook for a per-route enter transition in the App Router.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
