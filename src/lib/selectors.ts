import type { Product } from "@/types/catalog";

/** Bags flagged "featured" in the CMS, in display order. */
export function selectFeatured(products: Product[]): Product[] {
  return products.filter((p) => p.featured).sort((a, b) => (a.featured?.order ?? 0) - (b.featured?.order ?? 0));
}

/**
 * The two bags in the opening composition: featured bags first, then the rest, in display order.
 * Fewer than two bags in the shop is fine; the hero adapts.
 */
export function selectHero(products: Product[]): { primary?: Product; secondary?: Product } {
  const ranked = [...selectFeatured(products), ...products.filter((p) => !p.featured)];
  return { primary: ranked[0], secondary: ranked[1] };
}
