import type { Metadata } from "next";
import { getBlogPosts } from "@/lib/api/blog";
import { BlogClient } from "./blog-client";

export const metadata: Metadata = {
  title: "Blog",
  description: "Stories, tips and updates from SevaDeep on donating old items, supporting NGOs, and making a difference in Pune and beyond.",
  alternates: { canonical: "/blog" },
};

export default async function BlogPage() {
  const posts = await getBlogPosts();
  return <BlogClient posts={posts} />;
}
