"use client";

import { createContext, useContext } from "react";
import type { CartLineView, CartNotice } from "@/lib/cart-lines";
import type { Formatters } from "@/lib/format";
import type { Pricing } from "@/lib/pricing";
import type { CategoryOption, ColorOption, OffersSection, Product, SaleSection } from "@/types/catalog";
import type { ShopSettings } from "@/types/settings";

export type { CartLineView, CartNotice };

export interface CartRefreshResult {
  /** False when the latest prices could not be fetched (offline, server error). */
  ok: boolean;
  /** True when the check found something different from what the customer was looking at. */
  changed: boolean;
  /** The bag as it stands after the check. */
  lines: CartLineView[];
}

export interface ShopContextValue extends Formatters {
  settings: ShopSettings;
  products: Product[];
  categories: CategoryOption[];
  colors: ColorOption[];
  /** The Sale shelf, when the owner switched it on. */
  sale: SaleSection | null;
  /** The Offers shelf, when the owner switched it on. */
  offersSection: OffersSection | null;
  lines: CartLineView[];
  /** What the bag adds up to right now: subtotal, offers, delivery fee, total. */
  pricing: Pricing;
  /** Number of bags (sum of quantities) that can actually be ordered. */
  count: number;
  subtotalCents: number;

  addToCart: (slug: string, quantity?: number) => void;
  setQuantity: (slug: string, quantity: number) => void;
  removeFromCart: (slug: string) => void;
  clearCart: () => void;

  /** Re-checks every bag in the cart against the live shop (prices, sold out, removed). */
  refreshCart: () => Promise<CartRefreshResult>;
  checkingCart: boolean;
  /** What changed since the customer last looked, to be explained in the bag. */
  notices: CartNotice[];
  dismissNotices: () => void;

  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;

  menuOpen: boolean;
  /** The address of the page the menu was opened on, to mark the current shelf. */
  menuPath: string;
  openMenu: () => void;
  closeMenu: () => void;

  activeProductSlug: string | null;
  openProduct: (slug: string) => void;
  closeProduct: () => void;
}

export const ShopContext = createContext<ShopContextValue | null>(null);

export function useShop(): ShopContextValue {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used inside <ShopProvider>.");
  return ctx;
}
