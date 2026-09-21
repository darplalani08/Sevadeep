"use client";

import * as React from "react";
import { animate, useInView, useMotionValue, useReducedMotion, useTransform } from "framer-motion";

type StatCounterProps = {
  value: number;
  suffix?: string;
  duration?: number;
  className?: string;
};

export function StatCounter({ value, suffix = "", duration = 1.6, className }: StatCounterProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduceMotion = useReducedMotion();
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => Math.round(latest).toLocaleString("en-IN"));
  const [display, setDisplay] = React.useState("0");

  React.useEffect(() => {
    if (!inView) return;
    if (reduceMotion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to the inView subscription firing, not deriving from props
      setDisplay(value.toLocaleString("en-IN"));
      return;
    }
    const controls = animate(motionValue, value, { duration, ease: [0.16, 1, 0.3, 1] });
    const unsub = rounded.on("change", setDisplay);
    return () => {
      controls.stop();
      unsub();
    };
  }, [inView, value, duration, motionValue, rounded, reduceMotion]);

  return (
    <span ref={ref} className={className}>
      {display}
      {suffix}
    </span>
  );
}
