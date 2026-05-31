import type { Metadata } from "next";
import { buildPageMetadata } from "../../../lib/site-seo";

export const metadata: Metadata = buildPageMetadata({
  title: "CELPIP Task Practice",
  noIndex: true,
});

export default function PracticeTaskLayout({ children }: { children: React.ReactNode }) {
  return children;
}
