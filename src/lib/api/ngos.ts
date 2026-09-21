// Data layer for NGOs. Every function is async and returns plain serializable data so this
// module can be swapped for a real Firebase/Firestore implementation later without touching
// any UI component — components only ever import from `@/lib/api`, never from `@content` directly.
import { ngos as seedNgos, cities as seedCities, puneAreas as seedAreas } from "@content/ngos";
import { ngoCategories } from "@content/site";
import type { Ngo, NgoFilters, PaginatedResult } from "./types";

export async function getNgos(filters: NgoFilters = {}): Promise<PaginatedResult<Ngo>> {
  const { search = "", city, area, category, page = 1, pageSize = 9 } = filters;

  let results = seedNgos;

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    results = results.filter((n) => n.name.toLowerCase().includes(q));
  }
  if (city && city !== "All") {
    results = results.filter((n) => n.city === city);
  }
  if (area && area !== "All") {
    results = results.filter((n) => n.area === area);
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

export async function getNgoById(id: string): Promise<Ngo | null> {
  return seedNgos.find((n) => n.id === id) ?? null;
}

export async function getFeaturedNgos(count = 3): Promise<Ngo[]> {
  return seedNgos.slice(0, count);
}

export async function getNgoFilterOptions() {
  return {
    cities: ["All", ...seedCities] as string[],
    areas: seedAreas as unknown as string[],
    categories: ngoCategories as unknown as string[],
  };
}
