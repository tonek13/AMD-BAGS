import "server-only";
import { validateSanityEnv } from "@/sanity/env";

/**
 * Server-side environment access and validation. Nothing here ever reaches the browser.
 *
 *   SHOP_DATA_SOURCE             "sanity" (default) or "demo" – demo shows the built-in sample bags,
 *                                clearly labelled, and never touches Sanity.
 *   NEXT_PUBLIC_SANITY_*         project id, dataset, API version (public identifiers).
 *   SANITY_API_READ_TOKEN        optional; only needed if the dataset is private.
 *   SANITY_REVALIDATE_SECRET     shared secret for the signed revalidation webhook.
 *   SANITY_API_HOST              optional; points the client at another API host (used by local tests).
 *
 * See .env.example.
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export type DataSource = "sanity" | "demo";

export function getDataSource(): DataSource {
  const value = (process.env.SHOP_DATA_SOURCE ?? "sanity").trim().toLowerCase();
  if (value === "sanity" || value === "demo") return value;
  throw new ConfigError(`SHOP_DATA_SOURCE must be "sanity" or "demo" (it is "${value}").`);
}

export interface ServerSanityEnv {
  projectId: string;
  dataset: string;
  apiVersion: string;
  /** Present only if SANITY_API_READ_TOKEN is set. Never send to the browser. */
  token: string | undefined;
  apiHost: string | undefined;
}

/** Validated Sanity settings, or a ConfigError that says exactly what is missing. */
export function requireSanityEnv(): ServerSanityEnv {
  const check = validateSanityEnv();
  if (!check.ok) {
    throw new ConfigError(
      `Sanity is not configured:\n  - ${check.problems.join("\n  - ")}\n` +
        `Set these in .env.local (see .env.example), or set SHOP_DATA_SOURCE=demo to run on the sample bags.`,
    );
  }
  const apiHost = process.env.SANITY_API_HOST?.trim() || undefined;
  if (apiHost && !/^https?:\/\//.test(apiHost)) {
    throw new ConfigError("SANITY_API_HOST must start with http:// or https://.");
  }
  return {
    projectId: check.projectId,
    dataset: check.dataset,
    apiVersion: check.apiVersion,
    token: process.env.SANITY_API_READ_TOKEN?.trim() || undefined,
    apiHost,
  };
}

/** The webhook secret, or null when it has not been configured (the webhook then refuses everything). */
export function getRevalidateSecret(): string | null {
  const secret = process.env.SANITY_REVALIDATE_SECRET?.trim();
  return secret ? secret : null;
}
