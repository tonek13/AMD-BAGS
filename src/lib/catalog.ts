/**
 * Data-access layer for the shop. Components never talk to Sanity (or to the demo data) directly;
 * they receive what these functions return.
 *
 * Two explicitly separate sources, chosen by SHOP_DATA_SOURCE (see src/lib/env.ts):
 *   - "sanity" (default): published content from Sanity, cached by Next.js with `use cache` and
 *     expired by the signed webhook at /api/revalidate. If Sanity is unreachable or misconfigured
 *     this throws; it NEVER quietly falls back to sample products.
 *   - "demo": the built-in sample bags, labelled as demo data on the page.
 */
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { siteConfig } from "@/config/site";
import { craftMoments, type CraftMoment } from "@/data/craft";
import { categories as demoCategories, colors as demoColors, products as demoProducts } from "@/data/demo-products";
import { getDataSource } from "@/lib/env";
import { getSanityClient } from "@/sanity/lib/client";
import { buildCatalog, mapSettings, type RawCollection, type RawProduct, type RawSettings } from "@/sanity/lib/mappers";
import { COLLECTIONS_QUERY, PRODUCTS_QUERY, SETTINGS_QUERY } from "@/sanity/lib/queries";
import { CACHE_TAGS } from "@/sanity/tags";
import type { Catalog, Product } from "@/types/catalog";
import type { ShopSettings } from "@/types/settings";

/**
 * Content stays cached until the webhook expires it. The time-based values are a safety net for
 * a missed webhook: after an hour the next visit refreshes in the background (stale content is
 * served meanwhile), and nothing older than a week is ever served.
 */
const CATALOG_LIFE = { stale: 300, revalidate: 3600, expire: 604800 };

async function loadSanityCatalog(): Promise<Catalog> {
  "use cache";
  cacheLife(CATALOG_LIFE);
  cacheTag(CACHE_TAGS.product, CACHE_TAGS.collection);

  const client = getSanityClient();
  const [products, collections] = await Promise.all([
    client.fetch<RawProduct[]>(PRODUCTS_QUERY),
    client.fetch<RawCollection[]>(COLLECTIONS_QUERY),
  ]);
  return buildCatalog(products ?? [], collections ?? []);
}

async function loadSanitySettings(): Promise<ShopSettings> {
  "use cache";
  cacheLife(CATALOG_LIFE);
  cacheTag(CACHE_TAGS.settings);

  const raw = await getSanityClient().fetch<RawSettings | null>(SETTINGS_QUERY);
  return mapSettings(raw);
}

function demoSettings(): ShopSettings {
  return {
    ...mapSettings(null),
    whatsappNumber: siteConfig.demoWhatsappNumber,
    heroIntro: "Chunky crochet bags in burgundy, cream, peach and black — every one hooked by hand, one stitch at a time.",
    demo: true,
  };
}

/** Everything the storefront needs to list, filter and sell bags. Hidden products are never in it. */
export async function getCatalog(): Promise<Catalog> {
  if (getDataSource() === "demo") return { products: demoProducts, categories: demoCategories, colors: demoColors };
  return loadSanityCatalog();
}

export async function getShopSettings(): Promise<ShopSettings> {
  if (getDataSource() === "demo") return demoSettings();
  return loadSanitySettings();
}

/** Public product lookup by slug. Hidden, draft and deleted products are simply not found. */
export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const { products } = await getCatalog();
  return products.find((p) => p.slug === slug);
}

/** Close-up photographs and short captions for the "Our Craft" section (brand content, not products). */
export async function getCraftMoments(): Promise<CraftMoment[]> {
  return craftMoments;
}
