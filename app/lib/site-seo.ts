import type { Metadata } from "next";
import { SITE_DOMAIN, SITE_NAME, SITE_TAGLINE, SITE_DISCLAIMER } from "./brand";

export { SITE_DOMAIN, SITE_NAME, SITE_TAGLINE, SITE_DISCLAIMER };

/** Set in production: NEXT_PUBLIC_SITE_URL=https://celpiplib.com */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (url) return url.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NODE_ENV === "development") return "http://localhost:3000";
  return "https://celpiplib.com";
}

export const DEFAULT_DESCRIPTION =
  "CELPIP Lib — practice CELPIP Writing, Reading, Listening, and Speaking with timed, AI-generated tasks, band-style feedback, templates, and mock tests. Built for Canadian English exam preparation.";

export const DEFAULT_KEYWORDS = [
  "CELPIP practice",
  "CELPIP test preparation",
  "CELPIP writing practice",
  "CELPIP speaking practice",
  "CELPIP reading practice",
  "CELPIP listening practice",
  "Canadian English test",
  "CELPIP templates",
  "CELPIP mock test",
  "immigration English test Canada",
];

type PageMetadataInput = {
  title: string;
  description?: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
  ogType?: "website" | "article";
};

export function buildPageMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "",
  keywords = [],
  noIndex = false,
  ogType = "website",
}: PageMetadataInput): Metadata {
  const siteUrl = getSiteUrl();
  const url = path ? `${siteUrl}${path.startsWith("/") ? path : `/${path}`}` : siteUrl;
  const fullTitle = path === "" || title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;

  return {
    title: fullTitle,
    description,
    keywords: [...DEFAULT_KEYWORDS, ...keywords],
    metadataBase: new URL(siteUrl),
    alternates: { canonical: url },
    robots: noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
        },
    openGraph: {
      type: ogType,
      locale: "en_CA",
      url,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
  };
}

/** Routes included in sitemap.xml (public, indexable marketing & learning pages). */
export const PUBLIC_SITEMAP_ROUTES: { path: string; changeFrequency: "weekly" | "monthly"; priority: number }[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/practice", changeFrequency: "weekly", priority: 0.95 },
  { path: "/practice/writing", changeFrequency: "weekly", priority: 0.9 },
  { path: "/practice/reading", changeFrequency: "weekly", priority: 0.9 },
  { path: "/practice/listening", changeFrequency: "weekly", priority: 0.9 },
  { path: "/practice/speaking", changeFrequency: "weekly", priority: 0.9 },
  { path: "/templates", changeFrequency: "weekly", priority: 0.85 },
  { path: "/templates/writing-task-1", changeFrequency: "monthly", priority: 0.8 },
  { path: "/templates/writing-task-2", changeFrequency: "monthly", priority: 0.8 },
  { path: "/templates/speaking-task-1", changeFrequency: "monthly", priority: 0.75 },
  { path: "/templates/speaking-task-2", changeFrequency: "monthly", priority: 0.75 },
  { path: "/templates/speaking-task-3", changeFrequency: "monthly", priority: 0.75 },
  { path: "/templates/speaking-task-4", changeFrequency: "monthly", priority: 0.75 },
  { path: "/templates/speaking-task-5", changeFrequency: "monthly", priority: 0.75 },
  { path: "/templates/speaking-task-6", changeFrequency: "monthly", priority: 0.75 },
  { path: "/templates/speaking-task-7", changeFrequency: "monthly", priority: 0.75 },
  { path: "/templates/speaking-task-8", changeFrequency: "monthly", priority: 0.75 },
  { path: "/mock-test", changeFrequency: "weekly", priority: 0.7 },
  { path: "/signup", changeFrequency: "monthly", priority: 0.6 },
  { path: "/login", changeFrequency: "monthly", priority: 0.4 },
];
