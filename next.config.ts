import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude standalone socket server from Next.js build
  serverExternalPackages: ["mongoose"],
};

export default nextConfig;
