import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/site-seo";

export const metadata: Metadata = buildPageMetadata({
  title: "CELPIP Writing Practice",
  description:
    "Practice CELPIP Writing Task 1 (email) and Task 2 (survey response) under real exam timing with AI band-style feedback.",
  path: "/practice/writing",
  keywords: ["CELPIP writing task 1", "CELPIP writing task 2", "CELPIP email practice"],
});

export default function WritingPracticeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
