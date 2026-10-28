"use client";

import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CategoryOption, ColorOption, Product } from "@/types/catalog";
import type { ShopSettings } from "@/types/settings";
import { siteConfig } from "@/config/site";
import type { CartCheckResponse } from "@/lib/cart-check";
import { computeLines, diffLines, type CartNotice, type LiveMap } from "@/lib/cart-lines";
import { createFormatters } from "@/lib/format";
import {
  addItem,
  clearCart as clearStore,
  getServerSnapshot,
  getSnapshot,
  removeItem,
  setQuantity as setStoreQuantity,
  subscribe,
} from "@/lib/cart-store";
import { ShopContext, type CartRefreshResult, type ShopContextValue } from "./shop-context";
import { CartDrawer } from "./CartDrawer";
import { MenuDrawer } from "./MenuDrawer";
import { ProductDialog } from "./ProductDialog";

interface ShopProviderProps {
  settings: ShopSettings;
  products: Product[];
  categories: CategoryOption[];
  colors: ColorOption[];
  children: React.ReactNode;
}

const CHECK_TIMEOUT_MS = 8000;

export function ShopProvider({ settings, products, categories, colors, children }: ShopProviderProps) {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPath, setMenuPath] = useState("/");
  const [activeProductSlug, setActiveProductSlug] = useState<string | null>(null);
  const [live, setLive] = useState<LiveMap | null>(null);
  const [checkingCart, setCheckingCart] = useState(false);
  const [notices, setNotices] = useState<CartNotice[]>([]);
  // The latest live check, readable synchronously from event handlers.
  const liveRef = useRef<LiveMap | null>(null);

  const formatters = useMemo(() => createFormatters(settings.currency, settings.locale), [settings.currency, settings.locale]);

  const lines = useMemo(() => computeLines(stored, products, live), [stored, products, live]);
  const count = useMemo(() => lines.reduce((n, l) => (l.available ? n + l.quantity : n), 0), [lines]);
  const subtotalCents = useMemo(() => lines.reduce((sum, l) => sum + l.lineCents, 0), [lines]);

  const addToCart = useCallback(
    (slug: string, quantity = 1) => {
      const product = products.find((p) => p.slug === slug);
      if (!product || product.availability === "sold-out") return; // sold-out bags can never be added
      if (liveRef.current && liveRef.current[slug]?.availability === "sold-out") return;
      addItem(slug, Math.min(Math.max(1, quantity), siteConfig.maxQuantityPerItem), product.name);
    },
    [products],
  );

  const refreshCart = useCallback(async (): Promise<CartRefreshResult> => {
    const current = getSnapshot();
    const before = computeLines(current, products, liveRef.current);
    if (current.length === 0) return { ok: true, changed: false, lines: before };

    setCheckingCart(true);
    try {
      const response = await fetch("/api/catalog/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: current.map((l) => l.slug) }),
        cache: "no-store",
        signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`catalog check failed (${response.status})`);
      const data = (await response.json()) as CartCheckResponse;

      const next: LiveMap = { ...(liveRef.current ?? {}) };
      for (const line of current) next[line.slug] = null; // anything the check does not return no longer exists
      for (const item of data.items) {
        if (item.found && typeof item.price === "number" && item.name && item.availability) {
          next[item.slug] = { name: item.name, price: item.price, availability: item.availability };
        }
      }
      liveRef.current = next;
      setLive(next);

      const after = computeLines(getSnapshot(), products, next);
      const found = diffLines(before, after);
      if (found.length > 0) {
        setNotices((prev) => [...prev.filter((n) => !found.some((f) => f.slug === n.slug)), ...found]);
      }
      return { ok: true, changed: found.length > 0, lines: after };
    } catch (error) {
      console.warn("[cart] could not check the latest prices", error);
      return { ok: false, changed: false, lines: before };
    } finally {
      setCheckingCart(false);
    }
  }, [products]);

  const openCart = useCallback(() => {
    setCartOpen(true);
    // Refresh in the background so prices and stock are current by the time the bag is read.
    void refreshCart();
  }, [refreshCart]);

  const value = useMemo<ShopContextValue>(
    () => ({
      ...formatters,
      settings,
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
      refreshCart,
      checkingCart,
      notices,
      dismissNotices: () => setNotices([]),
      cartOpen,
      openCart,
      closeCart: () => setCartOpen(false),
      menuOpen,
      menuPath,
      openMenu: () => {
        // Read here, when the button is pressed, not with a router hook while rendering (see handleHomeAnchorClick).
        setMenuPath(window.location.pathname);
        setMenuOpen(true);
      },
      closeMenu: () => setMenuOpen(false),
      activeProductSlug,
      openProduct: (slug) => setActiveProductSlug(slug),
      closeProduct: () => setActiveProductSlug(null),
    }),
    [formatters, settings, products, categories, colors, lines, count, subtotalCents, addToCart, refreshCart, checkingCart, notices, cartOpen, openCart, menuOpen, menuPath, activeProductSlug],
  );

  return (
    <ShopContext.Provider value={value}>
      {children}
      <ProductDialog />
      <CartDrawer />
      <MenuDrawer />
    </ShopContext.Provider>
  );
}
