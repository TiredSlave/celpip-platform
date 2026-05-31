import type { MetadataRoute } from "next";
import { getSiteUrl, PUBLIC_SITEMAP_ROUTES } from "./lib/site-seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  return PUBLIC_SITEMAP_ROUTES.map(route => ({
    url: `${base}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
