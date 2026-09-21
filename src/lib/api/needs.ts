import { needs as seedNeeds, needCategories } from "@content/needs";
import type { Need, NeedFilters, PaginatedResult } from "./types";

export async function getNeeds(filters: NeedFilters = {}): Promise<PaginatedResult<Need>> {
  const { search = "", location, category, page = 1, pageSize = 9 } = filters;

  let results = seedNeeds;

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    results = results.filter(
      (n) => n.ngoName.toLowerCase().includes(q) || n.item.toLowerCase().includes(q)
    );
  }
  if (location && location !== "All") {
    results = results.filter((n) => n.location === location);
  }
  if (category && category !== "All") {
    results = results.filter((n) => n.category === category);
  }

  const total = results.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const items = results.slice(start, start + pageSize);

  return { items, page, pageSize, total, totalPages };
}

export async function getNeedById(id: string): Promise<Need | null> {
  return seedNeeds.find((n) => n.id === id) ?? null;
}

export async function getNeedFilterOptions() {
  return { categories: needCategories as unknown as string[] };
}
