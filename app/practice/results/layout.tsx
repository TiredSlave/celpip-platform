import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/site-seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Practice Results",
  noIndex: true,
});

export default function PracticeResultsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
