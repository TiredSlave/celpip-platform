import type { Metadata } from "next";
import { buildPageMetadata } from "../../../lib/site-seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Mock Test Results",
  noIndex: true,
});

export default function MockTestResultsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
