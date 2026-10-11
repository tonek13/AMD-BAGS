"use client";

import { createContext, useContext } from "react";
import type { CategoryOption, ColorOption, Product } from "@/types/catalog";

export interface CartLineView {
  product: Product;
  quantity: number;
  /** False when the bag has become sold out since it was added. Excluded from totals and orders. */
  available: boolean;
  lineCents: number;
}

export interface ShopContextValue {
  products: Product[];
  categories: CategoryOption[];
  colors: ColorOption[];
  lines: CartLineView[];
  /** Number of bags (sum of quantities) that can actually be ordered. */
  count: number;
  subtotalCents: number;

  addToCart: (slug: string, quantity?: number) => void;
  setQuantity: (slug: string, quantity: number) => void;
  removeFromCart: (slug: string) => void;
  clearCart: () => void;

  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;

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
