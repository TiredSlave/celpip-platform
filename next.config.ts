import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/reading", destination: "/practice/reading", permanent: false },
      { source: "/writing", destination: "/practice/writing", permanent: false },
      { source: "/speaking", destination: "/practice/speaking", permanent: false },
      { source: "/listening", destination: "/practice/listening", permanent: false },
      // Legacy Supabase redirect URLs
      { source: "/api/auth/callback", destination: "/auth/callback", permanent: false },
    ];
  },
};

export default nextConfig;
