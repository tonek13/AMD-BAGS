"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { ColorOption, Product } from "@/types/catalog";
import { Flip, gsap, registerGsap, ScrollTrigger } from "@/lib/gsap";
import { useIsomorphicLayoutEffect } from "@/lib/hooks";
import { prefersReducedMotion } from "@/lib/scroll";
import { AvailabilityBadge } from "@/components/shop/AvailabilityBadge";
import { useShop } from "@/components/shop/shop-context";
import { FilterPanel } from "./collection/FilterPanel";
import { Swatch } from "./collection/Swatch";
import {
  activeFilterCount,
  emptyFilters,
  matchesFilters,
  sortOptions,
  sortProducts,
  toggleItem,
  type Density,
  type FilterState,
  type SortKey,
} from "./collection/filters";
import styles from "./Collection.module.css";

interface Chip {
  key: string;
  label: string;
  group: "categories" | "colors" | "stock";
  id?: string;
  swatch?: ColorOption["swatch"];
}

export function Collection({ products }: { products: Product[] }) {
  const { categories, colors, openProduct, addToCart, openCart, formatPrice, settings } = useShop();
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [sort, setSort] = useState<SortKey>("featured");
  const [density, setDensity] = useState<Density>("standard");
  const [panelOpen, setPanelOpen] = useState(false);

  const grid = useRef<HTMLUListElement>(null);
  const flipState = useRef<ReturnType<typeof Flip.getState> | null>(null);

  const sorted = useMemo(() => sortProducts(products, sort), [products, sort]);
  const visibleCount = products.filter((p) => matchesFilters(p, filters)).length;
  const active = activeFilterCount(filters);

  // Remember where every card is before anything changes, then FLIP them to their new places.
  function change(apply: () => void) {
    const cards = grid.current?.querySelectorAll("[data-card]");
    if (cards && !prefersReducedMotion()) {
      registerGsap();
      Flip.killFlipsOf(cards);
      flipState.current = Flip.getState(cards);
    }
    apply();
  }

  const updateFilters = (next: FilterState) => change(() => setFilters(next));
  const clearFilters = () => change(() => setFilters(emptyFilters));

  useIsomorphicLayoutEffect(() => {
    const state = flipState.current;
    flipState.current = null;
    if (!state) return;
    Flip.from(state, {
      duration: 0.75,
      ease: "power3.inOut",
      absolute: true,
      stagger: 0.035,
      onEnter: (els) =>
        gsap.fromTo(
          els,
          { autoAlpha: 0, scale: 0.8, y: 40, rotate: 2 },
          { autoAlpha: 1, scale: 1, y: 0, rotate: 0, duration: 0.7, ease: "back.out(1.5)", clearProps: "transform,opacity,visibility" },
        ),
      onLeave: (els) =>
        gsap.to(els, { autoAlpha: 0, scale: 0.8, duration: 0.35, ease: "power2.in", clearProps: "transform,opacity,visibility" }),
    });
  }, [filters, sort, density]);

  // Entrance: cards rise in as the grid scrolls into view.
  useEffect(() => {
    registerGsap();
    const gridEl = grid.current;
    if (!gridEl) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const cards = gsap.utils.toArray<HTMLElement>("[data-card]", gridEl);
      // opacity only (never visibility): cards must stay focusable so keyboard users can Tab to them
      gsap.set(cards, { opacity: 0, y: 70, rotate: 2.5 });
      ScrollTrigger.batch(cards, {
        start: "top 92%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, { opacity: 1, y: 0, rotate: 0, duration: 1, ease: "expo.out", stagger: 0.09, clearProps: "transform,opacity" }),
      });
    });
    return () => mm.revert();
  }, [products]);

  // Active filters as plain data (removal goes through removeChip, an event handler).
  const chips: Chip[] = [
    ...categories.filter((c) => filters.categories.includes(c.id)).map((c): Chip => ({ key: `c-${c.id}`, label: c.label, group: "categories", id: c.id })),
    ...colors.filter((c) => filters.colors.includes(c.id)).map((c): Chip => ({ key: `k-${c.id}`, label: c.label, group: "colors", id: c.id, swatch: c.swatch })),
    ...(filters.hideSoldOut ? [{ key: "stock", label: "Sold-out hidden", group: "stock" } as Chip] : []),
  ];

  function removeChip(chip: Chip) {
    if (chip.group === "categories") updateFilters({ ...filters, categories: filters.categories.filter((x) => x !== chip.id) });
    else if (chip.group === "colors") updateFilters({ ...filters, colors: filters.colors.filter((x) => x !== chip.id) });
    else updateFilters({ ...filters, hideSoldOut: false });
  }

  return (
    <section id="collection" className={styles.collection} aria-labelledby="collection-title">
      <div className={styles.inner}>
        <header className={styles.head}>
          <p className={`eyebrow ${styles.kicker}`}>The collection</p>
          <h2 id="collection-title" className={`display ${styles.title}`}>
            Every bag, <em>stitched by hand.</em>
          </h2>
          {settings.demo && (
            <p className={styles.reviewNote}>
              Demo mode &mdash; these are sample bags, not the shop&rsquo;s real products. Names, prices and availability are placeholders.
              The photographs are the real pieces.
            </p>
          )}
        </header>
      </div>

      {products.length === 0 && (
        <div className={styles.inner}>
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>New bags are on their way.</p>
            <p>The collection is being restocked. Please check back soon.</p>
          </div>
        </div>
      )}

      {/* Sticky toolbar: Filters button, quick colour swatches, sort and photo size */}
      {products.length > 0 && (
      <div className={styles.toolbar}>
        <div className={styles.toolbarInner}>
          <button
            type="button"
            className={styles.filterButton}
            onClick={() => setPanelOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={panelOpen}
          >
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
              <path d="M3 5.5h14M6 10h8M8.5 14.5h3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Filters
            {active > 0 && (
              <span className={styles.filterBadge}>
                {active}
                <span className="sr-only"> active</span>
              </span>
            )}
          </button>

          <div className={styles.quick} role="group" aria-label="Quick colour filter">
            {colors.map((c) => (
              <button
                key={c.id}
                type="button"
                className={styles.quickSwatch}
                aria-pressed={filters.colors.includes(c.id)}
                aria-label={c.label}
                data-label={c.label}
                onClick={() => updateFilters({ ...filters, colors: toggleItem(filters.colors, c.id) })}
              >
                <Swatch swatch={c.swatch} size="md" />
              </button>
            ))}
          </div>

          <label className={styles.sort}>
            <span className="sr-only">Sort by</span>
            <select value={sort} onChange={(e) => change(() => setSort(e.target.value as SortKey))}>
              {sortOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.id === "featured" ? "Sort: Featured" : o.label}
                </option>
              ))}
            </select>
            <svg className={styles.sortChevron} viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
              <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </label>

          <div className={styles.density} role="group" aria-label="Photo size">
            <button type="button" aria-pressed={density === "large"} aria-label="Large photos" onClick={() => change(() => setDensity("large"))}>
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                <rect x="3" y="3" width="6" height="14" rx="1" fill="currentColor" />
                <rect x="11" y="3" width="6" height="14" rx="1" fill="currentColor" />
              </svg>
            </button>
            <button type="button" aria-pressed={density === "standard"} aria-label="Standard photos" onClick={() => change(() => setDensity("standard"))}>
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                <rect x="2" y="3" width="4" height="14" rx="1" fill="currentColor" />
                <rect x="8" y="3" width="4" height="14" rx="1" fill="currentColor" />
                <rect x="14" y="3" width="4" height="14" rx="1" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      )}

      {products.length > 0 && (
      <div className={styles.inner}>
        <div className={styles.results}>
          <p className={styles.status} role="status" aria-live="polite">
            Showing {visibleCount} of {products.length} bags
          </p>
          {chips.length > 0 && (
            <ul className={styles.chips} aria-label="Active filters">
              {chips.map((chip) => (
                <li key={chip.key}>
                  <button type="button" className={styles.chip} onClick={() => removeChip(chip)} aria-label={`Remove filter: ${chip.label}`}>
                    {chip.swatch && <Swatch swatch={chip.swatch} size="sm" />}
                    {chip.label}
                    <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
                      <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                </li>
              ))}
              <li>
                <button type="button" className={styles.clearAll} onClick={clearFilters}>
                  Clear all
                </button>
              </li>
            </ul>
          )}
        </div>

        <ul ref={grid} className={styles.grid} data-density={density}>
          {sorted.map((p) => (
            <ProductCard
              key={p.slug}
              product={p}
              hidden={!matchesFilters(p, filters)}
              categoryLabel={categories.find((c) => c.id === p.category)?.label ?? ""}
              colorLabel={p.colors
                .map((id) => colors.find((c) => c.id === id)?.label)
                .filter(Boolean)
                .join(", ")}
              formatPrice={formatPrice}
              onOpen={() => openProduct(p.slug)}
              onAdd={() => {
                addToCart(p.slug, 1);
                openCart();
              }}
            />
          ))}
        </ul>

        {visibleCount === 0 && (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No bags match that combination yet.</p>
            <button type="button" className="btn btn--ghost" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        )}
      </div>
      )}

      <FilterPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        products={products}
        categories={categories}
        colors={colors}
        filters={filters}
        resultCount={visibleCount}
        onChange={updateFilters}
        onClear={clearFilters}
      />
    </section>
  );
}

interface ProductCardProps {
  product: Product;
  hidden: boolean;
  categoryLabel: string;
  colorLabel: string;
  formatPrice: (amount: number) => string;
  onOpen: () => void;
  onAdd: () => void;
}

function ProductCard({ product, hidden, categoryLabel, colorLabel, formatPrice, onOpen, onAdd }: ProductCardProps) {
  const [cover, alt] = product.images;
  const soldOut = product.availability === "sold-out";
  const focus = (img: typeof cover) => `${img.focal?.x ?? 50}% ${img.focal?.y ?? 50}%`;

  return (
    <li className={styles.item} data-card data-hidden={hidden || undefined}>
      <article className={`${styles.card} ${soldOut ? styles.soldOut : ""}`}>
        <button
          type="button"
          className={styles.media}
          onClick={onOpen}
          aria-label={`${product.name}, ${formatPrice(product.price)}${soldOut ? ", sold out" : ""} – view details`}
        >
          <Image
            className={styles.photo}
            src={cover.src}
            alt=""
            fill
            sizes="(max-width: 52rem) 50vw, (max-width: 80rem) 33vw, 28vw"
            style={{ objectFit: "cover", objectPosition: focus(cover) }}
          />
          {alt && (
            <Image
              className={styles.photoAlt}
              src={alt.src}
              alt=""
              fill
              sizes="(max-width: 52rem) 50vw, (max-width: 80rem) 33vw, 28vw"
              style={{ objectFit: "cover", objectPosition: focus(alt) }}
            />
          )}
          <AvailabilityBadge availability={product.availability} className={styles.badge} />
          <span className={styles.quickLook} aria-hidden="true">
            Quick look
          </span>
        </button>

        <div className={styles.meta}>
          <div className={styles.titleRow}>
            <h3 className={styles.name}>{product.name}</h3>
            <p className={styles.price}>{formatPrice(product.price)}</p>
          </div>
          <p className={styles.sub}>{[colorLabel, categoryLabel].filter(Boolean).join(" · ")}</p>
          <button type="button" className={styles.add} disabled={soldOut} onClick={onAdd}>
            {soldOut ? "Sold out" : "Add to bag"}
            <span className="sr-only"> – {product.name}</span>
          </button>
        </div>
      </article>
    </li>
  );
}
