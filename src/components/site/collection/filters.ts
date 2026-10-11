import type { CategoryId, ColorId, Product } from "@/types/catalog";

export type SortKey = "featured" | "price-asc" | "price-desc" | "name";
export type Density = "standard" | "large";
export type FilterGroup = "categories" | "colors";

export interface FilterState {
  categories: CategoryId[];
  colors: ColorId[];
  hideSoldOut: boolean;
}

export const emptyFilters: FilterState = { categories: [], colors: [], hideSoldOut: false };

export const sortOptions: { id: SortKey; label: string }[] = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "name", label: "Name: A–Z" },
];

/** Within a group the options are OR-ed; between groups they are AND-ed. `skip` leaves one group out (for facet counts). */
export function matchesFilters(product: Product, filters: FilterState, skip?: FilterGroup): boolean {
  if (skip !== "categories" && filters.categories.length > 0 && !filters.categories.includes(product.category)) return false;
  if (skip !== "colors" && filters.colors.length > 0 && !filters.colors.includes(product.color)) return false;
  if (filters.hideSoldOut && product.availability === "sold-out") return false;
  return true;
}

/** How many bags selecting this option would show, given the choices already made in the other groups. */
export function facetCount(products: Product[], filters: FilterState, group: FilterGroup, id: string): number {
  return products.filter(
    (p) => matchesFilters(p, filters, group) && (group === "categories" ? p.category === id : p.color === id),
  ).length;
}

export function sortProducts(products: Product[], key: SortKey): Product[] {
  const list = [...products];
  if (key === "price-asc") list.sort((a, b) => a.price - b.price);
  else if (key === "price-desc") list.sort((a, b) => b.price - a.price);
  else if (key === "name") list.sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

export function activeFilterCount(filters: FilterState): number {
  return filters.categories.length + filters.colors.length + (filters.hideSoldOut ? 1 : 0);
}

export function toggleItem<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}
