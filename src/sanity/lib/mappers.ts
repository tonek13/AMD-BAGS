import { siteConfig } from "@/config/site";
import { deriveTheme } from "@/lib/theme";
import type { Availability, Catalog, CategoryOption, ColorOption, Product } from "@/types/catalog";
import type { ShopSettings, SocialLink } from "@/types/settings";
import { toProductImage, type RawImage } from "./image";

/**
 * Turns raw GROQ results into the storefront's own types. This is the only place that knows the
 * shape of the content in Sanity; everything downstream uses `Product`, `Catalog` and `ShopSettings`.
 * Documents that cannot be shown properly are skipped (with a server-side warning) instead of
 * breaking the page.
 */

export interface RawProduct {
  _id: string;
  slug: string;
  name?: string | null;
  description?: string | null;
  price?: number | null;
  availability?: string | null;
  featured?: boolean | null;
  displayOrder?: number | null;
  collection?: { slug?: string | null; name?: string | null } | null;
  colors?: { name?: string | null; hex?: string | null; hex2?: string | null }[] | null;
  images?: RawImage[] | null;
}

export interface RawCollection {
  _id: string;
  slug: string;
  name?: string | null;
  displayOrder?: number | null;
  showAsSection?: boolean | null;
}

export interface RawSettings {
  brandName?: string | null;
  logo?: RawImage | null;
  currency?: string | null;
  whatsappNumber?: string | null;
  email?: string | null;
  location?: string | null;
  socialLinks?: { platform?: string | null; url?: string | null }[] | null;
  heroHeadline?: string | null;
  heroIntro?: string | null;
  craftHeading?: string | null;
  craftText?: string | null;
}

const HEX = /^#[0-9a-f]{6}$/i;
const NEUTRAL_SWATCH = "#b9b2a6";

const text = (v: string | null | undefined) => (typeof v === "string" ? v.trim() : "");

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** First sentence of the description, shortened, for the one-line teaser under a bag's name. */
export function summarize(description: string, max = 140): string {
  const clean = description.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const first = /^.+?[.!?](?=\s|$)/.exec(clean)?.[0] ?? clean;
  if (first.length <= max) return first;
  return `${first.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

export function mapProduct(raw: RawProduct): Product | null {
  const name = text(raw.name);
  const slug = text(raw.slug);
  const price = raw.price;
  if (!slug || !name) return null;
  if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
    console.warn(`[catalog] Skipping "${name}": it has no valid price.`);
    return null;
  }

  const images = (raw.images ?? [])
    .map((img) => toProductImage(img, name))
    .filter((img): img is NonNullable<typeof img> => img !== null);
  if (images.length === 0) {
    console.warn(`[catalog] Skipping "${name}": it has no usable photo.`);
    return null;
  }

  const colorIds: string[] = [];
  for (const c of raw.colors ?? []) {
    const id = slugify(text(c?.name));
    if (id && !colorIds.includes(id)) colorIds.push(id);
  }

  const availability: Availability = raw.availability === "sold-out" ? "sold-out" : "in-stock";
  const description = text(raw.description);
  const firstHex = raw.colors?.find((c) => c?.hex && HEX.test(c.hex))?.hex ?? undefined;

  return {
    id: raw._id,
    slug,
    name,
    summary: summarize(description),
    description,
    price,
    category: text(raw.collection?.slug) || null,
    colors: colorIds,
    availability,
    images,
    // `order` is assigned in buildCatalog, once the final list order is known
    featured: raw.featured ? { order: 0, theme: deriveTheme(firstHex) } : undefined,
  };
}

export function buildCatalog(rawProducts: RawProduct[], rawCollections: RawCollection[]): Catalog {
  const products = rawProducts.map(mapProduct).filter((p): p is Product => p !== null);

  // A bag only keeps its collection if that collection is published.
  const knownCollections = new Map(rawCollections.map((c) => [text(c.slug), c]));
  for (const p of products) {
    if (p.category && !knownCollections.has(p.category)) p.category = null;
  }

  // Featured order follows the display order of the (already sorted) list.
  products.filter((p) => p.featured).forEach((p, i) => (p.featured = { ...p.featured!, order: i + 1 }));

  // Filters only offer collections that currently contain at least one bag.
  const used = new Set(products.map((p) => p.category).filter((c): c is string => !!c));
  const categories: CategoryOption[] = rawCollections
    .filter((c) => used.has(text(c.slug)) && text(c.name))
    .map((c) => ({ id: text(c.slug), label: text(c.name), section: c.showAsSection === true }));

  // Colour options: one per distinct colour name, in order of first appearance.
  const colorMap = new Map<string, ColorOption>();
  for (const raw of rawProducts) {
    for (const c of raw.colors ?? []) {
      const label = text(c?.name);
      const id = slugify(label);
      if (!id || colorMap.has(id)) continue;
      const a = c.hex && HEX.test(c.hex) ? c.hex : NEUTRAL_SWATCH;
      const b = c.hex2 && HEX.test(c.hex2) ? c.hex2 : null;
      colorMap.set(id, { id, label, swatch: b ? [a, b] : [a] });
    }
  }
  const usedColors = new Set(products.flatMap((p) => p.colors));
  const colors = [...colorMap.values()].filter((c) => usedColors.has(c.id));

  return { products, categories, colors };
}

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  pinterest: "Pinterest",
  youtube: "YouTube",
  x: "X",
  other: "Website",
};

function validCurrency(code: string): boolean {
  try {
    new Intl.NumberFormat(siteConfig.locale, { style: "currency", currency: code });
    return /^[A-Z]{3}$/.test(code);
  } catch {
    return false;
  }
}

export function mapSettings(raw: RawSettings | null | undefined): ShopSettings {
  const brandName = text(raw?.brandName) || siteConfig.brandName;
  const currencyRaw = text(raw?.currency).toUpperCase();
  const lines = (raw?.heroHeadline ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const socialLinks: SocialLink[] = [];
  for (const link of raw?.socialLinks ?? []) {
    const url = text(link?.url);
    if (!/^https?:\/\//i.test(url)) continue;
    socialLinks.push({ label: SOCIAL_LABELS[text(link?.platform)] ?? "Website", url });
  }

  return {
    brandName,
    logo: toProductImage(raw?.logo, `${brandName} logo`),
    currency: validCurrency(currencyRaw) ? currencyRaw : siteConfig.currency,
    locale: siteConfig.locale,
    whatsappNumber: text(raw?.whatsappNumber),
    contact: { email: text(raw?.email), location: text(raw?.location) },
    socialLinks,
    heroHeadline: lines.length ? lines.slice(0, 4) : siteConfig.defaults.heroHeadline,
    heroIntro: text(raw?.heroIntro) || siteConfig.defaults.heroIntro,
    craftHeading: text(raw?.craftHeading) || siteConfig.defaults.craftHeading,
    craftText: text(raw?.craftText) || siteConfig.defaults.craftText,
    demo: false,
  };
}
