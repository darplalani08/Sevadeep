"use client";

import * as React from "react";
import { AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";

import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { Container, Section } from "@/components/common/container";
import { EmptyState } from "@/components/common/empty-state";
import { PaginationControls } from "@/components/common/pagination-controls";
import { CardGridSkeleton } from "@/components/common/skeletons";
import { NgoCard } from "@/components/cards/ngo-card";
import { NgoDetailDialog } from "@/components/sections/ngo-detail-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getNgoFilterOptions, getNgos } from "@/lib/api/ngos";
import type { Ngo } from "@/lib/api/types";

const PAGE_SIZE = 9;

export function NgosClient() {
  const [search, setSearch] = React.useState("");
  const [city, setCity] = React.useState("All");
  const [area, setArea] = React.useState("All");
  const [category, setCategory] = React.useState("All");
  const [page, setPage] = React.useState(1);

  const [loading, setLoading] = React.useState(true);
  const [ngos, setNgos] = React.useState<Ngo[]>([]);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [filterOptions, setFilterOptions] = React.useState<{ cities: string[]; areas: string[]; categories: string[] }>({
    cities: ["All"],
    areas: ["All"],
    categories: ["All"],
  });
  const [selectedNgo, setSelectedNgo] = React.useState<Ngo | null>(null);

  React.useEffect(() => {
    getNgoFilterOptions().then(setFilterOptions);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizing loading state with this effect's own fetch lifecycle
    setLoading(true);
    const timeout = setTimeout(() => {
      getNgos({ search, city, area, category, page, pageSize: PAGE_SIZE }).then((res) => {
        if (cancelled) return;
        setNgos(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        setLoading(false);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [search, city, area, category, page]);

  // Reset to page 1 directly in each filter's event handler (rather than a separate effect
  // watching all four values) so changing a filter can't fire two renders in a row.
  const updateSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  const updateCity = (value: string) => {
    setCity(value);
    setPage(1);
  };
  const updateArea = (value: string) => {
    setArea(value);
    setPage(1);
  };
  const updateCategory = (value: string) => {
    setCategory(value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setCity("All");
    setArea("All");
    setCategory("All");
    setPage(1);
  };

  return (
    <>
      <div className="border-b border-border bg-secondary/30 py-8">
        <Container>
          <Breadcrumbs items={[{ label: "NGOs" }]} />
          <h1 className="mt-3 text-display-3 font-heading font-semibold text-foreground">
            {loading ? "Searching NGOs…" : `${total} Verified NGOs`}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Search by name, or filter by city, area and category to find NGOs near you.
          </p>
        </Container>
      </div>

      <Section className="pt-10">
        <Container>
          <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => updateSearch(e.target.value)}
                placeholder="Search by NGO name"
                className="pl-9"
              />
            </div>
            <Select value={city} onValueChange={(v) => updateCity(v ?? "All")}>
              <SelectTrigger className="w-full"><SelectValue placeholder="City" /></SelectTrigger>
              <SelectContent>
                {filterOptions.cities.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={area} onValueChange={(v) => updateArea(v ?? "All")}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Area" /></SelectTrigger>
              <SelectContent>
                {filterOptions.areas.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={(v) => updateCategory(v ?? "All")}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {filterOptions.categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={clearFilters} className="rounded-full">
              Clear
            </Button>
          </div>

          <div className="mt-10">
            {loading ? (
              <CardGridSkeleton count={PAGE_SIZE} />
            ) : ngos.length === 0 ? (
              <EmptyState
                title="No NGOs match your search"
                description="Try a different name, or clear your filters to see all NGOs."
                actionLabel="Clear filters"
                onAction={clearFilters}
              />
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {ngos.map((ngo) => (
                    <NgoCard key={ngo.id} ngo={ngo} onReadMore={setSelectedNgo} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {!loading && (
            <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} className="mt-10" />
          )}
        </Container>
      </Section>

      <NgoDetailDialog ngo={selectedNgo} onOpenChange={(open) => !open && setSelectedNgo(null)} />
    </>
  );
}
