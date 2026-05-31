import type { Metadata } from "next";
import { buildPageMetadata } from "../lib/site-seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Log In",
  description: "Log in to your CELPIP Lib account to save results, vocabulary, and mock test progress.",
  path: "/login",
  keywords: ["CELPIP practice login"],
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
