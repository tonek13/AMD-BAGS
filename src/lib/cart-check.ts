import type { Availability, Offer } from "@/types/catalog";

/** Request/response shapes of POST /api/catalog/check, shared by the route and the browser. */
export interface CartCheckItem {
  slug: string;
  /** False when the bag no longer exists on the shop (deleted, unpublished or hidden). */
  found: boolean;
  name?: string;
  price?: number;
  availability?: Availability;
}

export interface CartCheckResponse {
  items: CartCheckItem[];
  /** The offers in force right now ("buy 2, get 1 free"). */
  offers: Offer[];
  /** The delivery fee right now, in the shop currency. */
  deliveryFee: number;
}

export const MAX_CHECK_SLUGS = 50;

/** Returns the cleaned slug list, or null if the body is not what the browser sends. */
export function parseCheckRequest(body: unknown): string[] | null {
  if (!body || typeof body !== "object") return null;
  const slugs = (body as { slugs?: unknown }).slugs;
  if (!Array.isArray(slugs) || slugs.length > MAX_CHECK_SLUGS) return null;
  const clean: string[] = [];
  for (const s of slugs) {
    if (typeof s !== "string" || s.length === 0 || s.length > 128) return null;
    if (!clean.includes(s)) clean.push(s);
  }
  return clean;
}
