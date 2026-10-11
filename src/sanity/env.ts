/**
 * Sanity connection settings that are safe to expose to the browser (project id, dataset and API
 * version are public identifiers, not secrets). Secrets (read/write tokens, the webhook secret)
 * are read only in server code: see src/lib/env.ts.
 *
 * This file is used by both the Studio (browser) and the storefront (server), so it must not throw
 * on import: call `validateSanityEnv()` where a clear error is wanted.
 */
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "";
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "";
/** Pinned API version (a date). Pinning it keeps query behaviour from changing under the shop. */
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2025-02-19";

export type SanityEnvCheck =
  | { ok: true; projectId: string; dataset: string; apiVersion: string }
  | { ok: false; problems: string[] };

export function validateSanityEnv(): SanityEnvCheck {
  const problems: string[] = [];

  if (!projectId) problems.push("NEXT_PUBLIC_SANITY_PROJECT_ID is not set.");
  else if (!/^[a-z0-9-]+$/.test(projectId)) {
    problems.push("NEXT_PUBLIC_SANITY_PROJECT_ID may only contain lowercase letters, numbers and dashes.");
  }

  if (!dataset) problems.push("NEXT_PUBLIC_SANITY_DATASET is not set (use the dataset name from your Sanity project, usually \"production\").");
  else if (!/^[a-z0-9][a-z0-9_-]*$/.test(dataset)) {
    problems.push("NEXT_PUBLIC_SANITY_DATASET may only contain lowercase letters, numbers, dashes and underscores.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(apiVersion)) {
    problems.push("NEXT_PUBLIC_SANITY_API_VERSION must be a date like 2025-02-19.");
  }

  return problems.length ? { ok: false, problems } : { ok: true, projectId, dataset, apiVersion };
}
