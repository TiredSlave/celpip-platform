import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavbarWrapper from "./components/NavbarWrapper";
import { buildPageMetadata, getSiteUrl, SITE_NAME } from "./lib/site-seo";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: SITE_NAME,
    path: "/",
  }),
  applicationName: SITE_NAME,
  category: "education",
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: { email: false, address: false, telephone: false },
  other: {
    "ai-content-declaration": "public-marketing-and-educational-content",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA">
      <head>
        <link rel="alternate" type="text/plain" href={`${getSiteUrl()}/llms.txt`} title="LLM site summary" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}>
        <NavbarWrapper>{children}</NavbarWrapper>
      </body>
    </html>
  );
}
