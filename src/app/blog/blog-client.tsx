"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";

import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { Container, Section } from "@/components/common/container";
import { EmptyState } from "@/components/common/empty-state";
import { BlogCard } from "@/components/cards/blog-card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BlogPost } from "@content/blog";

export function BlogClient({ posts }: { posts: BlogPost[] }) {
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("All");

  const categories = React.useMemo(() => ["All", ...Array.from(new Set(posts.map((p) => p.category)))], [posts]);

  const filtered = posts.filter((p) => {
    const matchesCategory = category === "All" || p.category === category;
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <div className="border-b border-border bg-secondary/30 py-8">
        <Container>
          <Breadcrumbs items={[{ label: "Blog" }]} />
          <h1 className="mt-3 text-display-3 font-heading font-semibold text-foreground">SevaDeep Blog</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Stories and updates on giving, verified NGOs, and the difference your donations make.
          </p>
        </Container>
      </div>

      <Section className="pt-10">
        <Container>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search articles"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button key={c} type="button" onClick={() => setCategory(c)}>
                  <Badge
                    variant={c === category ? "default" : "secondary"}
                    className={cn("cursor-pointer px-3 py-1.5", c === category && "bg-primary text-primary-foreground")}
                  >
                    {c}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-10">
            {filtered.length === 0 ? (
              <EmptyState title="No articles found" description="Try a different search term or category." />
            ) : (
              <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {filtered.map((post, i) => (
                    <motion.div
                      key={post.slug}
                      layout
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3 }}
                    >
                      <BlogCard post={post} priority={i < 3} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </Container>
      </Section>
    </>
  );
}
