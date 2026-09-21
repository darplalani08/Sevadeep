import type { Metadata } from "next";
import { NgosClient } from "./ngos-client";

export const metadata: Metadata = {
  title: "NGO List",
  description:
    "Browse verified NGOs near you by city and category. Help poor and needy by donating your old clothes, furniture, appliances, toys, books and bicycles.",
  alternates: { canonical: "/ngos" },
};

export default function NgosPage() {
  return <NgosClient />;
}
