import "server-only";
import { createClient } from "next-sanity";
import { requireSanityEnv } from "@/lib/env";

/**
 * The read-only Sanity client used by the storefront (server only).
 *
 * - `perspective: "published"` – drafts are never returned, even when a token could see them.
 * - `useCdn: false` – results are cached by Next.js and invalidated by the signed webhook, so the
 *   API's own CDN would only add a second layer of staleness after a publish.
 * - The optional read token is only needed for a private dataset and never leaves the server.
 */
export function getSanityClient() {
  const env = requireSanityEnv();
  return createClient({
    projectId: env.projectId,
    dataset: env.dataset,
    apiVersion: env.apiVersion,
    useCdn: false,
    perspective: "published",
    token: env.token,
    ...(env.apiHost ? { apiHost: env.apiHost, useProjectHostname: false } : {}),
  });
}
