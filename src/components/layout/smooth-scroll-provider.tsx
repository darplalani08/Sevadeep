"use client";

import * as React from "react";
import { ReactLenis } from "lenis/react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

/** Wraps the app in Lenis smooth scrolling. No-ops for users who prefer reduced motion. */
export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const reducedMotion = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (reducedMotion) return <>{children}</>;

  return (
    <ReactLenis root options={{ lerp: 0.1, duration: 1.1, smoothWheel: true }}>
      {children}
    </ReactLenis>
  );
}
