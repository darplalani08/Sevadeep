import type { MetadataRoute } from "next";
import { blogPosts } from "@content/blog";
import { siteConfig } from "@content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/ngos",
    "/ngo-needs",
    "/donation-bucket",
    "/blog",
    "/ngo-login",
    "/donor-login",
    "/ngo-registration",
    "/volunteer-register",
    "/narayan-seva",
    "/gallery",
  ].map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  const blogRoutes = blogPosts.map((post) => ({
    url: `${siteConfig.url}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...blogRoutes];
}
