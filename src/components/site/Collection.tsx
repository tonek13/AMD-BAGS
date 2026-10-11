"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { CategoryId, ColorId, Product } from "@/types/catalog";
import { siteConfig } from "@/config/site";
import { formatPrice } from "@/lib/format";
import { Flip, gsap, registerGsap, ScrollTrigger } from "@/lib/gsap";
import { useIsomorphicLayoutEffect } from "@/lib/hooks";
import { prefersReducedMotion } from "@/lib/scroll";
import { AvailabilityBadge } from "@/components/shop/AvailabilityBadge";
import { useShop } from "@/components/shop/shop-context";
import styles from "./Collection.module.css";

type CategoryFilter = CategoryId | "all";
type ColorFilter = ColorId | "all";

export function Collection({ products }: { products: Product[] }) {
  const { categories, colors, openProduct, addToCart, openCart } = useShop();
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [color, setColor] = useState<ColorFilter>("all");

  const grid = useRef<HTMLUListElement>(null);
  const flipState = useRef<ReturnType<typeof Flip.getState> | null>(null);

  const matches = (p: Product) => (category === "all" || p.category === category) && (color === "all" || p.color === color);
  const visibleCount = products.filter(matches).length;

  // Remember where every card is before the filter changes, then FLIP them to their new places.
  function change(apply: () => void) {
    const cards = grid.current?.querySelectorAll("[data-card]");
    if (cards && !prefersReducedMotion()) {
      registerGsap();
      Flip.killFlipsOf(cards);
      flipState.current = Flip.getState(cards);
    }
    apply();
  }

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
  }, [category, color]);

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

  const reset = () => change(() => (setCategory("all"), setColor("all")));

  return (
    <section id="collection" className={styles.collection} aria-labelledby="collection-title">
      <div className={styles.inner}>
        <header className={styles.head}>
          <p className={`eyebrow ${styles.kicker}`}>The collection</p>
          <h2 id="collection-title" className={`display ${styles.title}`}>
            Every bag, <em>stitched by hand.</em>
          </h2>
          {siteConfig.showReviewNotes && (
            <p className={styles.reviewNote}>
              Design review build &mdash; bag names, prices and availability are placeholders. The photographs are the real pieces.
            </p>
          )}
        </header>

        <div className={styles.filters}>
          <div className={styles.group} role="group" aria-labelledby="filter-style">
            <p id="filter-style" className={styles.legend}>
              Style
            </p>
            <div className={styles.chips}>
              <FilterChip pressed={category === "all"} onClick={() => change(() => setCategory("all"))}>
                All
              </FilterChip>
              {categories.map((c) => (
                <FilterChip key={c.id} pressed={category === c.id} onClick={() => change(() => setCategory(c.id))}>
                  {c.label}
                </FilterChip>
              ))}
            </div>
          </div>

          <div className={styles.group} role="group" aria-labelledby="filter-colour">
            <p id="filter-colour" className={styles.legend}>
              Colour
            </p>
            <div className={styles.chips}>
              <FilterChip pressed={color === "all"} onClick={() => change(() => setColor("all"))}>
                All
              </FilterChip>
              {colors.map((c) => (
                <FilterChip key={c.id} pressed={color === c.id} onClick={() => change(() => setColor(c.id))}>
                  <span
                    className={styles.swatch}
                    aria-hidden="true"
                    style={{
                      background: c.swatch.length === 2 ? `linear-gradient(135deg, ${c.swatch[0]} 50%, ${c.swatch[1]} 50%)` : c.swatch[0],
                    }}
                  />
                  {c.label}
                </FilterChip>
              ))}
            </div>
          </div>
        </div>

        <p className={styles.status} role="status" aria-live="polite">
          Showing {visibleCount} of {products.length} bags
          {(category !== "all" || color !== "all") && (
            <button type="button" className={styles.reset} onClick={reset}>
              Clear filters
            </button>
          )}
        </p>

        <ul ref={grid} className={styles.grid}>
          {products.map((p) => (
            <ProductCard
              key={p.slug}
              product={p}
              hidden={!matches(p)}
              categoryLabel={categories.find((c) => c.id === p.category)?.label ?? ""}
              colorLabel={colors.find((c) => c.id === p.color)?.label ?? ""}
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
            <button type="button" className="btn btn--ghost" onClick={reset}>
              Show every bag
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function FilterChip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className={styles.chip} aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  );
}

interface ProductCardProps {
  product: Product;
  hidden: boolean;
  categoryLabel: string;
  colorLabel: string;
  onOpen: () => void;
  onAdd: () => void;
}

function ProductCard({ product, hidden, categoryLabel, colorLabel, onOpen, onAdd }: ProductCardProps) {
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
          <span className={styles.quick} aria-hidden="true">
            Quick look
          </span>
        </button>

        <div className={styles.meta}>
          <div className={styles.titleRow}>
            <h3 className={styles.name}>{product.name}</h3>
            <p className={styles.price}>{formatPrice(product.price)}</p>
          </div>
          <p className={styles.sub}>
            {colorLabel} · {categoryLabel}
          </p>
          <button type="button" className={styles.add} disabled={soldOut} onClick={onAdd}>
            {soldOut ? "Sold out" : "Add to bag"}
            <span className="sr-only"> – {product.name}</span>
          </button>
        </div>
      </article>
    </li>
  );
}
