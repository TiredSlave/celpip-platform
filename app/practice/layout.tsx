import type { Metadata } from "next";
import PracticeLayoutClient from "./PracticeLayoutClient";
import { buildPageMetadata } from "../lib/site-seo";

export const metadata: Metadata = buildPageMetadata({
  title: "CELPIP Lib — Practice Hub",
  description:
    "Choose CELPIP Writing, Reading, Listening, or Speaking practice. Timed tasks, AI-generated content, and exam-style feedback for all four skills.",
  path: "/practice",
  keywords: ["CELPIP practice hub", "CELPIP all skills", "CELPIP exam practice online"],
});

export default function PracticeLayout({ children }: { children: React.ReactNode }) {
  return <PracticeLayoutClient>{children}</PracticeLayoutClient>;
}
