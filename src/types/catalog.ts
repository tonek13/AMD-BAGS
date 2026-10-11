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
  /** Price in the major unit of the shop currency (e.g. 88 = $88). */
  price: number;
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

/** A collection, as used by the filters. */
export interface CategoryOption {
  id: string;
  label: string;
}

export interface ColorOption {
  id: string;
  label: string;
  /** Swatch colour (two entries render a split swatch). */
  swatch: [string] | [string, string];
}

/** Everything the storefront needs to render the shop. */
export interface Catalog {
  products: Product[];
  categories: CategoryOption[];
  colors: ColorOption[];
}
