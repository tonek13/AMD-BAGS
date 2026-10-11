import type { NextConfig } from "next";

/**
 * Sanity serves product photos from cdn.sanity.io/images/<projectId>/…; Next.js optimises them like
 * any remote image, but only from this project's folder. (SANITY_CDN_BASE_URL exists only so local
 * tests can point the shop at a stand-in server; leave it unset.)
 */
function sanityImagePatterns(): NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]> {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  if (!projectId) return [];
  const base = new URL(process.env.SANITY_CDN_BASE_URL?.trim() || "https://cdn.sanity.io");
  return [
    {
      protocol: base.protocol === "http:" ? "http" : "https",
      hostname: base.hostname,
      ...(base.port ? { port: base.port } : {}),
      pathname: `/images/${projectId}/**`,
    },
  ];
}

const usingTestImageHost = Boolean(process.env.SANITY_CDN_BASE_URL?.trim());

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // A stray package-lock.json exists in the parent user folder; pin the root to this project.
  turbopack: { root: process.cwd() },
  images: {
    // Texture matters for crochet: allow a higher-quality tier for hero and detail photos.
    qualities: [75, 90],
    remotePatterns: sanityImagePatterns(),
    // Only ever true when the test image host above is a local server.
    ...(usingTestImageHost ? { dangerouslyAllowLocalIP: true } : {}),
  },
};

export default nextConfig;
