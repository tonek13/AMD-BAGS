"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product } from "@/types/catalog";
import { AvailabilityBadge } from "./AvailabilityBadge";
import { Price } from "./Price";
import { ModalDialog } from "./ModalDialog";
import { QuantityStepper } from "./QuantityStepper";
import { useShop } from "./shop-context";
import styles from "./ProductDialog.module.css";

export function ProductDialog() {
  const { products, activeProductSlug, closeProduct } = useShop();
  // Keep showing the bag while the exit transition plays, then unmount so quantity and photo reset next time.
  const [shownSlug, setShownSlug] = useState<string | null>(null);
  if (activeProductSlug && activeProductSlug !== shownSlug) setShownSlug(activeProductSlug);

  const product = products.find((p) => p.slug === (activeProductSlug ?? shownSlug)) ?? null;

  return (
    <ModalDialog
      open={activeProductSlug !== null}
      onClose={closeProduct}
      label={product ? `${product.name} – details` : "Product details"}
      variant="modal"
      onExited={() => setShownSlug(null)}
    >
      {product && <ProductDetails key={product.slug} product={product} onClose={closeProduct} />}
    </ModalDialog>
  );
}

function ProductDetails({ product, onClose }: { product: Product; onClose: () => void }) {
  const { addToCart, openCart, categories, colors, formatPrice } = useShop();
  const [quantity, setQuantity] = useState(1);
  const [index, setIndex] = useState(0);

  const soldOut = product.availability === "sold-out";
  const total = product.images.length;
  const image = product.images[index];
  const category = categories.find((c) => c.id === product.category)?.label;
  const colorLabels = product.colors
    .map((id) => colors.find((c) => c.id === id)?.label)
    .filter((label): label is string => !!label)
    .join(", ");

  const go = (next: number) => setIndex((next + total) % total);

  function add() {
    addToCart(product.slug, quantity);
    onClose();
    openCart();
  }

  return (
    <div className={styles.layout}>
      <button type="button" className={styles.close} onClick={onClose} aria-label="Close product details">
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
          <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      <div
        className={styles.gallery}
        role="group"
        aria-roledescription="carousel"
        aria-label={`Photos of ${product.name}`}
        onKeyDown={(e) => {
          if (total < 2) return;
          if (e.key === "ArrowLeft") go(index - 1);
          if (e.key === "ArrowRight") go(index + 1);
        }}
      >
        <div className={styles.stage}>
          <Image
            key={image.src}
            className={styles.photo}
            src={image.src}
            alt={image.alt}
            fill
            sizes="(max-width: 52rem) 100vw, 640px"
            quality={90}
            style={{ objectFit: "contain" }}
          />
          {total > 1 && (
            <>
              <button type="button" className={`${styles.nav} ${styles.prev}`} onClick={() => go(index - 1)} aria-label="Previous photo">
                <Chevron dir="left" />
              </button>
              <button type="button" className={`${styles.nav} ${styles.next}`} onClick={() => go(index + 1)} aria-label="Next photo">
                <Chevron dir="right" />
              </button>
            </>
          )}
          {soldOut && <AvailabilityBadge availability="sold-out" className={styles.stageBadge} />}
        </div>
        {total > 1 && (
          <div className={styles.thumbs}>
            <p className="sr-only" aria-live="polite">
              Photo {index + 1} of {total}
            </p>
            {product.images.map((img, i) => (
              <button
                key={img.src}
                type="button"
                className={styles.thumb}
                aria-pressed={i === index}
                aria-label={`Show photo ${i + 1} of ${total}`}
                onClick={() => setIndex(i)}
              >
                <Image
                  src={img.src}
                  alt=""
                  fill
                  sizes="72px"
                  style={{ objectFit: "cover", objectPosition: `${img.focal?.x ?? 50}% ${img.focal?.y ?? 50}%` }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.info}>
        {(category || colorLabels) && (
          <p className={`eyebrow ${styles.meta}`}>{[category, colorLabels].filter(Boolean).join(" · ")}</p>
        )}
        <h2 className={`display ${styles.name}`}>{product.name}</h2>

        <div className={styles.priceRow}>
          <p className={styles.price}>
            <Price product={product} formatPrice={formatPrice} />
          </p>
          <AvailabilityBadge availability={product.availability} />
        </div>

        {product.description && <p className={styles.description}>{product.description}</p>}

        {product.details && product.details.length > 0 && (
          <ul className={styles.details}>
            {product.details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        )}

        <div className={styles.buy}>
          {soldOut ? (
            <>
              <button type="button" className="btn" disabled>
                Sold out
              </button>
              <p className={styles.note}>This piece is sold out for now. You can still look around.</p>
            </>
          ) : (
            <>
              <div className={styles.buyRow}>
                <QuantityStepper value={quantity} onChange={setQuantity} itemName={product.name} />
                <button type="button" className={`btn ${styles.add}`} onClick={add}>
                  Add to bag
                  <span aria-hidden="true">·</span>
                  <span>{formatPrice(product.price * quantity)}</span>
                </button>
              </div>
              <p className={styles.note}>
                Pay cash on delivery. There is no online payment.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
      <path
        d={dir === "left" ? "M12.5 4L6.5 10l6 6" : "M7.5 4l6 6-6 6"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
