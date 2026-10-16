import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A second local dev server (another session already running one) can
  // build into its own folder instead of fighting over .next.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
};

export default nextConfig;
