import type { MetadataRoute } from "next";
import { siteConfig } from "@content/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // /admin is staff-only and /track needs a private code, so neither belongs in an index.
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/admin/", "/track"] },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
