import type { Metadata } from "next";
import { buildPageMetadata } from "../lib/site-seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Create Account",
  description:
    "Sign up for CELPIP Lib to track scores, save vocabulary, and access timed Writing, Reading, Listening, and Speaking drills.",
  path: "/signup",
  keywords: ["CELPIP practice sign up", "CELPIP account", "CELPIP prep free"],
});

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
