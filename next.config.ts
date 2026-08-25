import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";

const projectRoot = fs.existsSync(path.join(process.cwd(), "node_modules", "next", "package.json"))
  ? process.cwd()
  : path.resolve(process.cwd(), "..", "..");
const isVercel = process.env.VERCEL === "1";

const nextConfig: NextConfig = {
  ...(isVercel ? {} : { output: "standalone" as const }),
  turbopack: {
    root: projectRoot,
  },
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./db/custom.db"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
