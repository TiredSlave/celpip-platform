import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/site-seo";

export const metadata: Metadata = buildPageMetadata({
  title: "CELPIP Speaking Practice",
  description:
    "Practice all 8 CELPIP Speaking tasks with preparation timers, recording, and AI evaluation including picture and prediction tasks.",
  path: "/practice/speaking",
  keywords: ["CELPIP speaking task 3", "CELPIP speaking practice online", "CELPIP speaking AI feedback"],
});

export default function SpeakingPracticeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
