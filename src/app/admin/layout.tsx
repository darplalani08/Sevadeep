import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administration",
  // Staff-only area — kept out of search indexes and the sitemap.
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
