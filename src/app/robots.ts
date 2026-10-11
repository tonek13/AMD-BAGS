import type { MetadataRoute } from "next";

/** Keeps the owner's dashboard and the API routes out of search results. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/studio", "/api/"] } };
}
