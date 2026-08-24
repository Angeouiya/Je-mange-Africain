import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";

const projectRoot = fs.existsSync(path.join(process.cwd(), "node_modules", "next", "package.json"))
  ? process.cwd()
  : path.resolve(process.cwd(), "..", "..");

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: projectRoot,
  },
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
