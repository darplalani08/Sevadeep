import { stats } from "@content/home";

export type SiteStats = { label: string; value: number }[];

export async function getSiteStats(): Promise<SiteStats> {
  return stats.items.map((i) => ({ label: i.label, value: i.value }));
}
