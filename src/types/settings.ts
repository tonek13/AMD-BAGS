import type { ProductImage } from "./catalog";

export interface SocialLink {
  /** Platform name as shown to visitors, e.g. "Instagram". */
  label: string;
  url: string;
}

/** The single "Shop Settings" document (with built-in defaults for anything left empty). */
export interface ShopSettings {
  brandName: string;
  logo: ProductImage | null;
  /** ISO 4217 code, e.g. "USD". */
  currency: string;
  locale: string;
  /** International format. Empty when the owner has not entered one: the WhatsApp contact is then hidden. Not used for orders (they are emailed). */
  whatsappNumber: string;
  contact: { email: string; location: string };
  /** Added to every order at checkout, in the shop currency. 0 means free delivery. */
  deliveryFee: number;
  socialLinks: SocialLink[];
  /** Homepage headline, one entry per line; the last line is set in italics. */
  heroHeadline: string[];
  heroIntro: string;
  craftHeading: string;
  craftText: string;
  /** True only when the site runs on the built-in sample data (SHOP_DATA_SOURCE=demo). */
  demo: boolean;
}
