import type { Metadata } from "next";
import { buildPageMetadata } from "../../../lib/site-seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Mock Test",
  noIndex: true,
});

export default function MockTestTakeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
