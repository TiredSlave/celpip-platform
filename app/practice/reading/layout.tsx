import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/site-seo";

export const metadata: Metadata = buildPageMetadata({
  title: "CELPIP Reading Practice",
  description:
    "Practice all four CELPIP Reading parts: correspondence, apply information, reading for information, and viewpoints with realistic passages.",
  path: "/practice/reading",
  keywords: ["CELPIP reading part 1", "CELPIP reading practice test", "CELPIP reading passages"],
});

export default function ReadingPracticeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
