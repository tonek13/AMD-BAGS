/**
 * Single source of truth for brand + shop settings.
 * Everything the owner is likely to change lives here.
 *
 * PROVISIONAL values are marked so they are easy to find in review.
 */
export interface SiteConfig {
  brandName: string;
  tagline: string;
  description: string;
  whatsappNumber: string;
  currency: string;
  locale: string;
  maxQuantityPerItem: number;
  contact: { instagram: string; email: string; location: string };
  heroProducts: { primary: string; secondary: string };
  storyProduct: string;
  showReviewNotes: boolean;
  cartStorageKey: string;
}

export const siteConfig: SiteConfig = {
  /** Brand name, as given by the owner. Change it here and it updates everywhere. */
  brandName: "AmD Bags",
  tagline: "Handmade crochet bags",
  description:
    "Chunky, hand-crocheted bags made slowly in small batches. Browse the collection and order by WhatsApp.",

  /**
   * Owner's WhatsApp number (provided by the owner). Any format works – spaces, "+" and
   * dashes are stripped; the country code must come first. Leave empty to fall back to the
   * order-message preview with a Copy button (nothing is sent anywhere).
   */
  whatsappNumber: "+961 81 616 199",

  /** PROVISIONAL – currency for the sample prices (ISO 4217) and number format locale. */
  currency: "USD",
  locale: "en-US",

  /** Most of one bag a customer can add in a single order. */
  maxQuantityPerItem: 10,

  /** Optional contact lines for the footer. Empty values are not shown. */
  contact: {
    instagram: "", // handle only, e.g. "amdbags"
    email: "",
    location: "",
  },

  /**
   * Which products appear in the opening composition and in the scroll story.
   * Values are product slugs from src/data/products.ts.
   */
  heroProducts: { primary: "cherry-ripple-basket", secondary: "apricot-arch-bag" },
  storyProduct: "bordeaux-clutch",

  /** Shows a small "sample names and prices" note for the design review. Set false to hide. */
  showReviewNotes: true,

  /** localStorage key for the cart. */
  cartStorageKey: "amd-bags.cart.v1",
};

export const navLinks = [
  { label: "Collection", href: "#collection" },
  { label: "Our Craft", href: "#craft" },
] as const;
