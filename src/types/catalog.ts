export type Availability = "in-stock" | "made-to-order" | "sold-out";

export type CategoryId = "clutch" | "top-handle" | "tote";

export type ColorId =
  | "black"
  | "burgundy"
  | "cream"
  | "peach"
  | "white"
  | "burgundy-cream";

export interface ProductImage {
  src: string;
  alt: string;
  /** Intrinsic pixel size of the file in /public. Used for layout and aspect ratio. */
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
  id: string;
  slug: string;
  name: string;
  /** One short line shown under the name. */
  tagline: string;
  description: string;
  /** Short facts for the details panel. */
  details: string[];
  /** Price in the major unit of `siteConfig.currency` (e.g. 88 = $88). */
  price: number;
  category: CategoryId;
  color: ColorId;
  availability: Availability;
  /** First image is the cover. Extra angles of the same bag go in the same array. */
  images: ProductImage[];
  /** Present when the bag is shown in the Featured section. Lower order comes first. */
  featured?: { order: number; theme: ProductTheme };
}

export interface CategoryOption {
  id: CategoryId;
  label: string;
}

export interface ColorOption {
  id: ColorId;
  label: string;
  /** Swatch colour (two entries render a split swatch). */
  swatch: [string] | [string, string];
}
