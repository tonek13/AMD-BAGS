import type { Availability, Product } from "@/types/catalog";
import type { StoredLine } from "@/lib/cart-store";
import { toCents } from "@/lib/format";

/**
 * How one line of the bag stands right now:
 *  - "ok":       can be ordered
 *  - "sold-out": still on the shop, but sold out: kept in the bag, left out of the order
 *  - "removed":  no longer on the shop (deleted, unpublished or hidden): kept in the bag so the
 *                customer is told, left out of the order
 */
export type LineStatus = "ok" | "sold-out" | "removed";

/** Latest price/availability of one bag from the live check; null means it no longer exists. */
export type LiveEntry = { name: string; price: number; availability: Availability } | null;
export type LiveMap = Record<string, LiveEntry>;

export interface CartLineView {
  slug: string;
  name: string;
  /** The catalogue entry (photos etc.); null when the bag is no longer on the shop. */
  product: Product | null;
  quantity: number;
  status: LineStatus;
  /** True only for lines that can be ordered. */
  available: boolean;
  unitPrice: number;
  lineCents: number;
}

/** Merges the stored cart with the catalogue, and with the latest live check when there is one. */
export function computeLines(stored: readonly StoredLine[], products: Product[], live: LiveMap | null): CartLineView[] {
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  return stored.map((line) => {
    const product = bySlug.get(line.slug) ?? null;
    const checked = live && line.slug in live ? live[line.slug] : undefined;

    let status: LineStatus;
    let unitPrice: number;
    let name: string;

    if (checked === null || (checked === undefined && !product)) {
      status = "removed";
      unitPrice = product?.price ?? 0;
      name = product?.name ?? line.name ?? "This bag";
    } else if (checked) {
      status = checked.availability === "sold-out" ? "sold-out" : "ok";
      unitPrice = checked.price;
      name = checked.name;
    } else {
      status = product!.availability === "sold-out" ? "sold-out" : "ok";
      unitPrice = product!.price;
      name = product!.name;
    }

    const available = status === "ok";
    return {
      slug: line.slug,
      name,
      product: status === "removed" ? null : product,
      quantity: line.quantity,
      status,
      available,
      unitPrice,
      lineCents: available ? toCents(unitPrice) * line.quantity : 0,
    };
  });
}

export interface CartNotice {
  slug: string;
  name: string;
  kind: "removed" | "sold-out" | "price";
  from?: number;
  to?: number;
}

/** What changed between two views of the same cart (used to explain a refresh to the customer). */
export function diffLines(before: CartLineView[], after: CartLineView[]): CartNotice[] {
  const prev = new Map(before.map((l) => [l.slug, l]));
  const notices: CartNotice[] = [];
  for (const line of after) {
    const old = prev.get(line.slug);
    if (!old) continue;
    if (line.status === "removed" && old.status !== "removed") notices.push({ slug: line.slug, name: line.name, kind: "removed" });
    else if (line.status === "sold-out" && old.status === "ok") notices.push({ slug: line.slug, name: line.name, kind: "sold-out" });
    else if (line.status === "ok" && old.status === "ok" && toCents(line.unitPrice) !== toCents(old.unitPrice)) {
      notices.push({ slug: line.slug, name: line.name, kind: "price", from: old.unitPrice, to: line.unitPrice });
    }
  }
  return notices;
}
