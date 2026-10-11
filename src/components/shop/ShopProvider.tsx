"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import type { CategoryOption, ColorOption, Product } from "@/types/catalog";
import { siteConfig } from "@/config/site";
import { toCents } from "@/lib/format";
import {
  addItem,
  clearCart as clearStore,
  getServerSnapshot,
  getSnapshot,
  removeItem,
  setQuantity as setStoreQuantity,
  subscribe,
} from "@/lib/cart-store";
import { ShopContext, type CartLineView, type ShopContextValue } from "./shop-context";
import { CartDrawer } from "./CartDrawer";
import { ProductDialog } from "./ProductDialog";

interface ShopProviderProps {
  products: Product[];
  categories: CategoryOption[];
  colors: ColorOption[];
  children: React.ReactNode;
}

export function ShopProvider({ products, categories, colors, children }: ShopProviderProps) {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeProductSlug, setActiveProductSlug] = useState<string | null>(null);

  const lines = useMemo<CartLineView[]>(() => {
    const bySlug = new Map(products.map((p) => [p.slug, p]));
    return stored.flatMap((line) => {
      const product = bySlug.get(line.slug);
      if (!product) return []; // product removed from the catalogue
      const available = product.availability !== "sold-out";
      return [
        {
          product,
          quantity: line.quantity,
          available,
          lineCents: available ? toCents(product.price) * line.quantity : 0,
        },
      ];
    });
  }, [stored, products]);

  const count = useMemo(() => lines.reduce((n, l) => (l.available ? n + l.quantity : n), 0), [lines]);
  const subtotalCents = useMemo(() => lines.reduce((sum, l) => sum + l.lineCents, 0), [lines]);

  const addToCart = useCallback(
    (slug: string, quantity = 1) => {
      const product = products.find((p) => p.slug === slug);
      if (!product || product.availability === "sold-out") return; // sold-out bags can never be added
      addItem(slug, Math.min(Math.max(1, quantity), siteConfig.maxQuantityPerItem));
    },
    [products],
  );

  const value = useMemo<ShopContextValue>(
    () => ({
      products,
      categories,
      colors,
      lines,
      count,
      subtotalCents,
      addToCart,
      setQuantity: setStoreQuantity,
      removeFromCart: removeItem,
      clearCart: clearStore,
      cartOpen,
      openCart: () => setCartOpen(true),
      closeCart: () => setCartOpen(false),
      activeProductSlug,
      openProduct: (slug) => setActiveProductSlug(slug),
      closeProduct: () => setActiveProductSlug(null),
    }),
    [products, categories, colors, lines, count, subtotalCents, addToCart, cartOpen, activeProductSlug],
  );

  return (
    <ShopContext.Provider value={value}>
      {children}
      <ProductDialog />
      <CartDrawer />
    </ShopContext.Provider>
  );
}
