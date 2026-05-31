import type { Metadata } from "next";
import { buildPageMetadata } from "../lib/site-seo";

export const metadata: Metadata = buildPageMetadata({
  title: "CELPIP Writing & Speaking Templates",
  description:
    "Free CELPIP Writing and Speaking template guides with task structure, scoring tips, and examples for every task type.",
  path: "/templates",
  keywords: ["CELPIP writing template", "CELPIP speaking template", "CELPIP email template", "CELPIP task structure"],
});

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
