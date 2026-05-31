import type { Metadata } from "next";
import { buildPageMetadata } from "../../../lib/site-seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Mock Test Review",
  noIndex: true,
});

export default function MockTestReviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
