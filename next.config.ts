import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/reading", destination: "/practice/reading", permanent: false },
      { source: "/writing", destination: "/practice/writing", permanent: false },
      { source: "/speaking", destination: "/practice/speaking", permanent: false },
      { source: "/listening", destination: "/practice/listening", permanent: false },
    ];
  },
  async rewrites() {
    return [
      // Legacy /auth/callback URLs (Supabase, bookmarks) → API route handler
      { source: "/auth/callback", destination: "/api/auth/callback" },
    ];
  },
};

export default nextConfig;
