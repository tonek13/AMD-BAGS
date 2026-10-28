import "server-only";
import { siteConfig } from "@/config/site";
import { offers as demoOffers, products as demoProducts } from "@/data/demo-products";
import { getDataSource } from "@/lib/env";
import { parseDeliveryFee, parseOffers, parseSale, type RawOffers, type RawSale } from "@/sanity/lib/mappers";
import { getSanityClient } from "@/sanity/lib/client";
import { CART_CHECK_QUERY, DELIVERY_FEE_QUERY, OFFERS_QUERY, SALE_QUERY } from "@/sanity/lib/queries";
import type { Availability, Offer } from "@/types/catalog";

/** A bag as it stands right now. Never cached: this is what prices and stock are checked against. */
export interface LiveProduct {
  slug: string;
  name: string;
  /** Major currency unit, e.g. 88 = $88. While the bag is on sale this is the sale price. */
  price: number;
  availability: Availability;
}

/** The current terms of the shop: the requested bags, the active offers and the delivery fee. */
export interface LiveShop {
  products: Map<string, LiveProduct>;
  offers: Offer[];
  /** Major currency unit; 0 means free delivery. */
  deliveryFee: number;
}

interface Row {
  slug: string;
  name?: string | null;
  price?: number | null;
  availability?: string | null;
}

/**
 * Reads the current prices, availability, offers and delivery fee straight from the data source
 * (Sanity, or the demo bags). A slug that is missing from `products` was deleted, unpublished or
 * hidden. Throws if the data source cannot be reached; callers decide what to tell the customer.
 */
export async function lookupLiveShop(slugs: string[]): Promise<LiveShop> {
  let rows: Row[];
  let saleBySlug = new Map<string, { previousPrice: number; newPrice: number }>();
  let offers: Offer[];
  let deliveryFee: number;

  if (getDataSource() === "demo") {
    // The demo bags already carry their sale prices.
    rows = demoProducts.map((p) => ({ slug: p.slug, name: p.name, price: p.price, availability: p.availability }));
    offers = demoOffers.offers;
    deliveryFee = siteConfig.demoDeliveryFee;
  } else {
    const client = getSanityClient();
    const [productRows, sale, rawOffers, fee] = await Promise.all([
      client.fetch<Row[]>(CART_CHECK_QUERY, { slugs }),
      client.fetch<RawSale | null>(SALE_QUERY),
      client.fetch<RawOffers | null>(OFFERS_QUERY),
      client.fetch<number | null>(DELIVERY_FEE_QUERY),
    ]);
    rows = productRows ?? [];
    saleBySlug = parseSale(sale);
    offers = parseOffers(rawOffers, () => true);
    deliveryFee = parseDeliveryFee(fee);
  }

  const wanted = new Set(slugs);
  const products = new Map<string, LiveProduct>();
  for (const row of rows) {
    if (!wanted.has(row.slug)) continue;
    if (!row.name || typeof row.price !== "number" || !Number.isFinite(row.price) || row.price < 0) continue;
    products.set(row.slug, {
      slug: row.slug,
      name: row.name,
      price: saleBySlug.get(row.slug)?.newPrice ?? row.price,
      availability: row.availability === "sold-out" ? "sold-out" : "in-stock",
    });
  }
  return { products, offers, deliveryFee };
}
