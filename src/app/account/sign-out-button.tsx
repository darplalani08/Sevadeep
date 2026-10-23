"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  const signOut = async () => {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" className="gap-1.5 rounded-full" onClick={signOut} disabled={busy}>
      <LogOut className="size-3.5" />
      {busy ? "Signing out…" : "Sign out"}
    </Button>
  );
}
