import type { Metadata } from "next";
import { Suspense } from "react";
import { BucketClient } from "./bucket-client";

export const metadata: Metadata = {
  title: "Donation Bucket",
  description: "Review your donation bucket, choose pickup or drop-off, and confirm your donation to a verified NGO.",
  alternates: { canonical: "/donation-bucket" },
};

export default function DonationBucketPage() {
  return (
    <Suspense fallback={null}>
      <BucketClient />
    </Suspense>
  );
}
