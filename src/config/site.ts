/**
 * Static site configuration and DEFAULTS.
 *
 * Everything the owner edits day to day (products, collections, brand name, logo, currency,
 * WhatsApp number, contact details, homepage and craft text) lives in Sanity: see
 * src/sanity/schemaTypes/shopSettings.ts. The values here are only
 *   • technical constants of the storefront, and
 *   • fallback wording used when a Shop Settings field is still empty.
 *
 * The WhatsApp number is deliberately NOT defaulted for the connected shop: it must come from
 * Shop Settings (it is only used for the "customize your bag" contact block and the footer; orders
 * go to the owner by email, see src/lib/env.ts). `demoWhatsappNumber` is used only in explicit demo
 * mode (SHOP_DATA_SOURCE=demo).
 */
export interface SiteConfig {
  brandName: string;
  tagline: string;
  description: string;
  currency: string;
  locale: string;
  maxQuantityPerItem: number;
  cartStorageKey: string;
  demoWhatsappNumber: string;
  demoDeliveryFee: number;
  defaults: {
    heroHeadline: string[];
    heroIntro: string;
    craftHeading: string;
    craftText: string;
  };
}

export const siteConfig: SiteConfig = {
  brandName: "MaisonHook",
  tagline: "Handmade crochet bags",
  description:
    "Chunky, hand-crocheted bags made slowly in small batches. Browse the collection and order online, paying cash on delivery.",

  currency: "USD",
  /** Number format locale. Fixed so server and browser always format prices identically. */
  locale: "en-US",

  /** Most of one bag a customer can add in a single order. */
  maxQuantityPerItem: 10,

  /** localStorage key for the cart. */
  cartStorageKey: "maisonhook.cart.v1",

  /** Number used by the sample data in demo mode only. */
  demoWhatsappNumber: "+961 81 616 199",

  /** Delivery fee used by the sample data in demo mode only. */
  demoDeliveryFee: 5,

  defaults: {
    heroHeadline: ["Made slowly,", "carried", "everywhere."],
    heroIntro:
      "Chunky crochet bags, every one hooked by hand, one stitch at a time.",
    craftHeading: "Slow stitches, *chunky* results.",
    craftText:
      "Every bag is hooked by hand, loop by loop and row by row, so it arrives with a little of the maker still in it.",
  },
};

export const navLinks = [
  { label: "Collection", href: "#collection" },
  { label: "Our Craft", href: "#craft" },
] as const;
