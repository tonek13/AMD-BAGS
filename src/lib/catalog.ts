/**
 * Data-access layer for the shop.
 *
 * Components never import src/data/products.ts directly – they call these
 * functions. To connect Sanity later, replace the bodies below with GROQ
 * queries that return the same `Product` / option shapes (see src/types/catalog.ts).
 * Every function is async so the call sites do not change.
 */
import { siteConfig } from "@/config/site";
import { craftMoments, type CraftMoment } from "@/data/craft";
import { categories, colors, products } from "@/data/products";
import type { CategoryOption, ColorOption, Product } from "@/types/catalog";

export async function getProducts(): Promise<Product[]> {
  return products;
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  return products.find((p) => p.slug === slug);
}

/** Bags flagged `featured` in the data, in their configured order. */
export async function getFeaturedProducts(): Promise<Product[]> {
  return products
    .filter((p) => p.featured)
    .sort((a, b) => (a.featured?.order ?? 0) - (b.featured?.order ?? 0));
}

export async function getCategories(): Promise<CategoryOption[]> {
  return categories;
}

export async function getColors(): Promise<ColorOption[]> {
  return colors;
}

/** Bags used by the opening composition (slugs come from siteConfig). */
export async function getHeroProducts(): Promise<{ primary: Product; secondary: Product }> {
  const [primary, secondary] = await Promise.all([
    getProductBySlug(siteConfig.heroProducts.primary),
    getProductBySlug(siteConfig.heroProducts.secondary),
  ]);
  if (!primary || !secondary) {
    throw new Error("siteConfig.heroProducts must reference existing product slugs.");
  }
  return { primary, secondary };
}

/** Bag shown next to the finished illustration at the end of the scroll story. */
export async function getStoryProduct(): Promise<Product> {
  const product = await getProductBySlug(siteConfig.storyProduct);
  if (!product) throw new Error("siteConfig.storyProduct must reference an existing product slug.");
  return product;
}

/** Close-up photographs and short captions for the "Our Craft" section. */
export async function getCraftMoments(): Promise<CraftMoment[]> {
  return craftMoments;
}
