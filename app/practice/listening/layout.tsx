import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/site-seo";

export const metadata: Metadata = buildPageMetadata({
  title: "CELPIP Listening Practice",
  description:
    "Practice CELPIP Listening Parts 1–6 with AI-generated audio, timed answer windows, and comprehension questions.",
  path: "/practice/listening",
  keywords: ["CELPIP listening practice", "CELPIP listening test online", "CELPIP audio practice"],
});

export default function ListeningPracticeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
