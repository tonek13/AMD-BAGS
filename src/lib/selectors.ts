import { offerRule } from "@/lib/pricing";
import type { Catalog, CategoryOption, Product } from "@/types/catalog";

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

export type ShelfKind = "sale" | "offers" | "collection";

/** Bags shown together, optionally under a heading (an offer has one per offer). */
export interface ShelfGroup {
  id: string;
  title?: string;
  /** The rule of an offer, e.g. "Buy 2, get 1 free". */
  note?: string;
  products: Product[];
}

/** One shelf of the shop: Sale, Offers, or a collection with its own section. */
export interface Shelf {
  id: string;
  kind: ShelfKind;
  title: string;
  /** Page of the shelf on its own. */
  href: string;
  products: Product[];
  groups: ShelfGroup[];
}

/**
 * Every shelf that should be shown, in order: Sale, Offers, then the collections that have their own
 * section. Sale and Offers are extra views of bags that also stay in their collection. `products` sets
 * the order of the bags inside every shelf (the homepage passes them sorted).
 */
export function selectShelves(
  catalog: Pick<Catalog, "categories" | "sale" | "offers"> & { products: Product[] },
): Shelf[] {
  const shelves: Shelf[] = [];
  const { products } = catalog;

  if (catalog.sale) {
    const slugs = new Set(catalog.sale.slugs);
    const onSale = products.filter((p) => slugs.has(p.slug));
    if (onSale.length > 0) {
      shelves.push({ id: "sale", kind: "sale", title: catalog.sale.title, href: "/sale", products: onSale, groups: [{ id: "sale", products: onSale }] });
    }
  }

  if (catalog.offers) {
    const groups: ShelfGroup[] = [];
    for (const offer of catalog.offers.offers) {
      const slugs = new Set(offer.slugs);
      const covered = products.filter((p) => slugs.has(p.slug));
      if (covered.length === 0) continue;
      const rule = offerRule(offer);
      groups.push({ id: offer.id, title: offer.title, note: offer.title === rule ? undefined : rule, products: covered });
    }
    if (groups.length > 0) {
      shelves.push({ id: "offers", kind: "offers", title: catalog.offers.title, href: "/offers", products: groups.flatMap((g) => g.products), groups });
    }
  }

  for (const { category, products: inSection } of selectSections(products, catalog.categories)) {
    shelves.push({
      id: category.id,
      kind: "collection",
      title: category.label,
      href: `/collections/${category.id}`,
      products: inSection,
      groups: [{ id: category.id, products: inSection }],
    });
  }
  return shelves;
}
