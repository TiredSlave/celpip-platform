import type { Metadata } from "next";
import { buildPageMetadata } from "../lib/site-seo";

export const metadata: Metadata = buildPageMetadata({
  title: "CELPIP Mock Tests",
  description:
    "Take CELPIP-style mock tests for Reading, Writing, Listening, and Speaking with timed sections and score review.",
  path: "/mock-test",
  keywords: ["CELPIP mock test", "CELPIP practice test online", "CELPIP timed mock exam"],
});

export default function MockTestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
