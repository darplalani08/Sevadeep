import { blogPosts, getReadingTime, type BlogPost } from "@content/blog";

export async function getBlogPosts(): Promise<BlogPost[]> {
  return [...blogPosts].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  return blogPosts.find((p) => p.slug === slug) ?? null;
}

export async function getRelatedPosts(slug: string, count = 3): Promise<BlogPost[]> {
  const all = await getBlogPosts();
  return all.filter((p) => p.slug !== slug).slice(0, count);
}

export async function getBlogCategories(): Promise<string[]> {
  return Array.from(new Set(blogPosts.map((p) => p.category)));
}

export { getReadingTime };
export type { BlogPost };
