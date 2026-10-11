import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // A stray package-lock.json exists in the parent user folder; pin the root to this project.
  turbopack: { root: process.cwd() },
  images: {
    // Texture matters for crochet: allow a higher-quality tier for hero and detail photos.
    qualities: [75, 90],
  },
};

export default nextConfig;
