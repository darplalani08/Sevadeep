"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { Search, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { Container, Section } from "@/components/common/container";
import { EmptyState } from "@/components/common/empty-state";
import { PaginationControls } from "@/components/common/pagination-controls";
import { CardGridSkeleton } from "@/components/common/skeletons";
import { NeedCard } from "@/components/cards/need-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getNeedFilterOptions, getNeeds } from "@/lib/api/needs";
import type { Need } from "@/lib/api/types";
import { useDonationBucket } from "@/lib/donation-bucket-context";

const PAGE_SIZE = 9;

export function NeedsClient() {
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("All");
  const [page, setPage] = React.useState(1);

  const [loading, setLoading] = React.useState(true);
  const [needs, setNeeds] = React.useState<Need[]>([]);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [categories, setCategories] = React.useState<string[]>(["All"]);

  const bucket = useDonationBucket();

  React.useEffect(() => {
    getNeedFilterOptions().then((opts) => setCategories(opts.categories));
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizing loading state with this effect's own fetch lifecycle
    setLoading(true);
    const timeout = setTimeout(() => {
      getNeeds({ search, category, page, pageSize: PAGE_SIZE }).then((res) => {
        if (cancelled) return;
        setNeeds(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        setLoading(false);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [search, category, page]);

  // Reset to page 1 directly in each filter's event handler rather than a watching effect.
  const updateSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  const updateCategory = (value: string) => {
    setCategory(value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("All");
    setPage(1);
  };

  const handleToggle = (need: Need) => {
    if (bucket.hasNeed(need.id)) {
      toast.info("Already in your donation bucket");
      return;
    }
    bucket.addItem({
      label: need.item,
      category: need.category,
      quantity: 1,
      ngoName: need.ngoName,
      needId: need.id,
    });
    toast.success(`Added "${need.item}" for ${need.ngoName} to your bucket`);
  };

  return (
    <>
      <div className="border-b border-border bg-secondary/30 py-8">
        <Container>
          <Breadcrumbs items={[{ label: "NGO Needs" }]} />
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-display-3 font-heading font-semibold text-foreground">
                {loading ? "Finding current needs…" : `${total} Current Needs`}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                Donate exactly what an NGO is asking for right now.
              </p>
            </div>
            {bucket.items.length > 0 && (
              <Link href="/donation-bucket" className={cn(buttonVariants(), "gap-2 rounded-full")}>
                <ShoppingBag className="size-4" />
                View Bucket ({bucket.items.length})
              </Link>
            )}
          </div>
        </Container>
      </div>

      <Section className="pt-10">
        <Container>
          <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:grid-cols-[2fr_1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => updateSearch(e.target.value)}
                placeholder="Search by NGO name or item"
                className="pl-9"
              />
            </div>
            <Select value={category} onValueChange={(v) => updateCategory(v ?? "All")}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
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
            ) : needs.length === 0 ? (
              <EmptyState
                title="No needs match your search"
                description="Try a different item or clear your filters."
                actionLabel="Clear filters"
                onAction={clearFilters}
              />
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {needs.map((need) => (
                    <NeedCard key={need.id} need={need} inBucket={bucket.hasNeed(need.id)} onToggle={handleToggle} />
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
    </>
  );
}
