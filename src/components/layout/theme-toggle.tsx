"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // Mount-flag guard: resolvedTheme is only known client-side (after next-themes reads
  // localStorage), so the icon must render a neutral default on the server to avoid a
  // hydration mismatch, then swap in on mount.
  const [mounted, setMounted] = React.useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration-safety flag, not a render loop
  React.useEffect(() => setMounted(true), []);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle dark mode"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="rounded-full"
    >
      {mounted && resolvedTheme === "dark" ? (
        <Sun className="size-[1.1rem]" />
      ) : (
        <Moon className="size-[1.1rem]" />
      )}
    </Button>
  );
}
