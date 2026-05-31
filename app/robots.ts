import type { MetadataRoute } from "next";
import { getSiteUrl } from "./lib/site-seo";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/dashboard/",
          "/profile/",
          "/account/",
          "/practice/results",
          "/practice/reading/task",
          "/practice/writing/task",
          "/practice/listening/task",
          "/practice/speaking/task",
          "/api/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
