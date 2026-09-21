import type { Metadata } from "next";
import { NeedsClient } from "./needs-client";

export const metadata: Metadata = {
  title: "NGO Needs",
  description:
    "Browse current NGO needs by category and location. Donate the exact items NGOs are asking for — from electronics to educational supplies.",
  alternates: { canonical: "/ngo-needs" },
};

export default function NgoNeedsPage() {
  return <NeedsClient />;
}
