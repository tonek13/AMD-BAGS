/** What a customer can do with a bag. The CMS only offers these two. */
export type Availability = "in-stock" | "sold-out";

export interface ProductImage {
  src: string;
  alt: string;
  /** Intrinsic pixel size of the (cropped) image. Used for layout and aspect ratio. */
  width: number;
  height: number;
  /** Where to keep the bag when the photo is cropped, as object-position percentages. */
  focal?: { x: number; y: number };
}

export interface ProductTheme {
  /** Section background while this bag is featured. */
  bg: string;
  /** Text colour that is readable on `bg`. */
  ink: string;
  /** Accent used for the price sticker and outlines. */
  accent: string;
}

export interface Product {
  /** Stable id of the published document. */
  id: string;
  slug: string;
  name: string;
  /** One short line shown under the name, taken from the start of the description. */
  summary: string;
  description: string;
  /** Optional short facts for the details panel (only the demo data has them). */
  details?: string[];
  /** Price in the major unit of the shop currency (e.g. 88 = $88). On sale, this is the sale price. */
  price: number;
  /** The previous price, only while the bag is on sale (shown struck through next to `price`). */
  compareAtPrice?: number;
  /** Slug of the collection the bag belongs to, or null. */
  category: string | null;
  /** Ids of the available colours (see `ColorOption`). */
  colors: string[];
  availability: Availability;
  /** First image is the cover. Extra angles of the same bag go in the same array. */
  images: ProductImage[];
  /** Present when the bag is shown in the Featured section. Lower order comes first. */
  featured?: { order: number; theme: ProductTheme };
}

/** A collection, as used by the filters and (when `section` is true) by its own section and page. */
export interface CategoryOption {
  /** The collection's slug. Also the last part of its page address: /collections/<id>. */
  id: string;
  label: string;
  /** The owner switched on "Show as its own section": it gets a section on the homepage, a page and a menu entry. */
  section: boolean;
}

export interface ColorOption {
  id: string;
  label: string;
  /** Swatch colour (two entries render a split swatch). */
  swatch: [string] | [string, string];
}

/** The Sale shelf: which bags are on sale (their prices are already the sale prices). */
export interface SaleSection {
  title: string;
  slugs: string[];
}

/** "Buy `buy`, get `free` free" on a set of bags. */
export interface Offer {
  id: string;
  /** Shown above the bags. Falls back to the rule itself, e.g. "Buy 2, get 1 free". */
  title: string;
  slugs: string[];
  buy: number;
  free: number;
}

export interface OffersSection {
  title: string;
  offers: Offer[];
}

/** Everything the storefront needs to render the shop. */
export interface Catalog {
  products: Product[];
  categories: CategoryOption[];
  colors: ColorOption[];
  /** Present only when the owner ticked "Show the sale" and at least one bag is on sale. */
  sale: SaleSection | null;
  /** Present only when the owner ticked "Show the offers" and at least one offer is valid. */
  offers: OffersSection | null;
}
