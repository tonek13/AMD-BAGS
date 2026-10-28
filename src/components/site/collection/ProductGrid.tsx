"use client";

import Image from "next/image";
import type { Product } from "@/types/catalog";
import { AvailabilityBadge } from "@/components/shop/AvailabilityBadge";
import { Price } from "@/components/shop/Price";
import { useShop } from "@/components/shop/shop-context";
import type { Density } from "./filters";
import styles from "./ProductGrid.module.css";

interface ProductGridProps {
  products: Product[];
  density?: Density;
  /** Cards for bags that fail the current filters stay in the page (so they can animate back in) but are not shown. */
  isHidden?: (product: Product) => boolean;
}

/** The bag cards, used by the homepage sections and by the section pages. */
export function ProductGrid({ products, density = "standard", isHidden }: ProductGridProps) {
  const { categories, colors, openProduct, addToCart, openCart, formatPrice } = useShop();

  return (
    <ul className={styles.grid} data-density={density}>
      {products.map((p) => (
        <ProductCard
          key={p.slug}
          product={p}
          hidden={isHidden?.(p) ?? false}
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
          aria-label={`${product.name}, ${formatPrice(product.price)}${product.compareAtPrice !== undefined ? ` (was ${formatPrice(product.compareAtPrice)})` : ""}${soldOut ? ", sold out" : ""} – view details`}
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
            <p className={styles.price}>
              <Price product={product} formatPrice={formatPrice} />
            </p>
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
