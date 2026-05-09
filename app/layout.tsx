import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CELPIP Practice",
  description: "AI-powered CELPIP practice platform",
};

// Pages that should NOT show the navbar (full screen task pages)
const HIDDEN_NAVBAR_PATHS = ["/writing", "/reading", "/speaking", "/listening"];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}>
        <NavbarWrapper>
          {children}
        </NavbarWrapper>
      </body>
    </html>
  );
}

// Client wrapper to conditionally show navbar
import NavbarWrapper from "./components/NavbarWrapper";
