import "server-only";
import { products as demoProducts } from "@/data/demo-products";
import { getDataSource } from "@/lib/env";
import { getSanityClient } from "@/sanity/lib/client";
import { CART_CHECK_QUERY } from "@/sanity/lib/queries";
import type { Availability } from "@/types/catalog";

/** A bag as it stands right now. Never cached: this is what prices and stock are checked against. */
export interface LiveProduct {
  slug: string;
  name: string;
  /** Major currency unit, e.g. 88 = $88. */
  price: number;
  availability: Availability;
}

interface Row {
  slug: string;
  name?: string | null;
  price?: number | null;
  availability?: string | null;
}

/**
 * Reads the current price and availability straight from the data source (Sanity, or the demo
 * bags). A slug that is missing from the result was deleted, unpublished or hidden. Throws if the
 * data source cannot be reached; callers decide what to tell the customer.
 */
export async function lookupLiveProducts(slugs: string[]): Promise<Map<string, LiveProduct>> {
  const rows: Row[] =
    getDataSource() === "demo"
      ? demoProducts.map((p) => ({ slug: p.slug, name: p.name, price: p.price, availability: p.availability }))
      : await getSanityClient().fetch<Row[]>(CART_CHECK_QUERY, { slugs });

  const wanted = new Set(slugs);
  const found = new Map<string, LiveProduct>();
  for (const row of rows) {
    if (!wanted.has(row.slug)) continue;
    if (!row.name || typeof row.price !== "number" || !Number.isFinite(row.price) || row.price < 0) continue;
    found.set(row.slug, {
      slug: row.slug,
      name: row.name,
      price: row.price,
      availability: row.availability === "sold-out" ? "sold-out" : "in-stock",
    });
  }
  return found;
}
