import type { CategoryOption, Product } from "@/types/catalog";

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

/** A collection that has its own section, page and menu entry, with the bags in it. */
export interface ShopSection {
  category: CategoryOption;
  products: Product[];
}

/** Collections with "Show as its own section" on, in collection order. Ones without bags are left out. */
export function selectSections(products: Product[], categories: CategoryOption[]): ShopSection[] {
  return categories
    .filter((c) => c.section)
    .map((category) => ({ category, products: products.filter((p) => p.category === category.id) }))
    .filter((s) => s.products.length > 0);
}

/** Bags that do not belong to any section (no collection, or a collection without its own section). */
export function selectUnsectioned(products: Product[], sections: ShopSection[]): Product[] {
  const inSection = new Set(sections.map((s) => s.category.id));
  return products.filter((p) => !p.category || !inSection.has(p.category));
}
