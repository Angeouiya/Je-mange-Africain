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
    ],
  },
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
