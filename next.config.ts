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

const isDev = process.env.NODE_ENV === "development";

/**
 * Content Security Policy for the shop. It lets the page load only its own scripts, styles, fonts and
 * images (shop photos are served through /_next/image, so even they are same-origin), only talk to
 * its own server, never be framed by another site, and never post a form anywhere else.
 *
 * 'unsafe-inline' is required for scripts and styles because Next.js writes small inline scripts into
 * every page and a nonce-based policy would make every page dynamic (no more caching). So this policy
 * stops injected EXTERNAL scripts, hijacked forms, framing and plugin content, but it cannot stop an
 * attacker who already managed to inject inline script. The shop has no such injection point: customer
 * text is only ever escaped into emails, never rendered back into pages.
 */
const shopCsp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // Only where the site is served over https (Vercel). Locally the site runs over plain http, and a phone on your
  // network opening http://192.168.x.x:3000 would break if the browser tried to upgrade every request to https.
  ...(process.env.VERCEL ? ["upgrade-insecure-requests"] : []),
].join("; ");

/** Headers every page gets (the shop and the Studio). */
const baseHeaders = [
  // Browsers must not guess a file's type: stops an uploaded or injected file being run as a script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Other sites only learn where a visitor came from, never the full address.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Features the shop never uses are switched off, so injected code could not use them either.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), serial=(), accelerometer=(), gyroscope=(), magnetometer=(), interest-cohort=()" },
  // Visitors' browsers keep using https for the next two years.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  // Do not announce the framework in every response.
  poweredByHeader: false,
  async headers() {
    return [
      {
        // The shop and its API: strict policy, never framed, no cross-window access.
        source: "/((?!studio).*)",
        headers: [
          ...baseHeaders,
          { key: "Content-Security-Policy", value: shopCsp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
      {
        // The Studio (the owner's dashboard) loads Sanity's own scripts, workers and sign-in pop-ups, so the
        // shop's policy does not fit it. It still cannot be framed by another site, and stays out of search.
        source: "/studio/:path*",
        headers: [
          ...baseHeaders,
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
  // Test runs build into their own folder (NEXT_DIST_DIR) so they never touch a developer's .next.
  distDir: process.env.NEXT_DIST_DIR?.trim() || ".next",
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
