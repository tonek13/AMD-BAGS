"use client";

import { useEffect, useRef } from "react";
import type { Product } from "@/types/catalog";
import { gsap, registerGsap, ScrollTrigger } from "@/lib/gsap";
import { handleAnchorClick } from "@/lib/scroll";
import { MovingPhoto } from "@/components/motion/MovingPhoto";
import { AvailabilityBadge } from "@/components/shop/AvailabilityBadge";
import { useShop } from "@/components/shop/shop-context";
import styles from "./FeaturedBags.module.css";

const SECTION_BG = "#f6efe3";
const SECTION_INK = "#231f20";

/**
 * Featured bags. Which bags appear, their order and their colours all come from the
 * product data (`product.featured`). As each panel reaches the middle of the screen the
 * section background and text colour glide to that bag's theme.
 */
export function FeaturedBags({ products }: { products: Product[] }) {
  const root = useRef<HTMLElement>(null);
  const { openProduct, addToCart, openCart, categories, colors, formatPrice } = useShop();

  useEffect(() => {
    registerGsap();
    const el = root.current;
    if (!el || products.length === 0) return;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const panels = gsap.utils.toArray<HTMLElement>("[data-panel]", el);
      const recolor = (bg: string, ink: string) =>
        gsap.to(el, { backgroundColor: bg, color: ink, duration: 0.9, ease: "power2.out", overwrite: "auto" });

      // Panels become transparent so the section background can change between them.
      gsap.set(panels, { backgroundColor: "transparent" });
      gsap.set(el, { backgroundColor: SECTION_BG, color: SECTION_INK });

      panels.forEach((panel, i) => {
        const bg = panel.dataset.bg ?? SECTION_BG;
        const ink = panel.dataset.ink ?? SECTION_INK;

        ScrollTrigger.create({
          trigger: panel,
          start: "top 58%",
          end: "bottom 58%",
          onToggle: (self) => {
            if (self.isActive) recolor(bg, ink);
            else if (self.direction === -1 && i === 0) recolor(SECTION_BG, SECTION_INK);
            else if (self.direction === 1 && i === panels.length - 1) recolor(SECTION_BG, SECTION_INK);
          },
        });

        const q = gsap.utils.selector(panel);
        gsap.fromTo(
          q("[data-name]"),
          { xPercent: 14 * (i % 2 ? -1 : 1) },
          {
            xPercent: -14 * (i % 2 ? -1 : 1),
            ease: "none",
            scrollTrigger: { trigger: panel, start: "top bottom", end: "bottom top", scrub: true },
          },
        );
        gsap.to(q("[data-sticker]"), {
          rotation: 140,
          ease: "none",
          scrollTrigger: { trigger: panel, start: "top bottom", end: "bottom top", scrub: true },
        });
        // opacity only: these rows contain buttons that must stay focusable before they are revealed
        gsap.from(q("[data-rise]"), {
          y: 48,
          opacity: 0,
          rotate: 1.5,
          duration: 1.1,
          ease: "expo.out",
          stagger: 0.08,
          scrollTrigger: { trigger: panel, start: "top 70%", once: true },
        });
      });
    });

    return () => mm.revert();
  }, [products]);

  return (
    <section ref={root} id="featured" className={styles.featured} aria-labelledby="featured-title">
      <header className={styles.head}>
        <p className={`eyebrow ${styles.kicker}`}>Featured bags</p>
        <h2 id="featured-title" className={`display ${styles.title}`}>
          Pieces we’d <em>carry first.</em>
        </h2>
        <nav className={styles.index} aria-label="Jump to a featured bag">
          {products.map((p, i) => (
            <a key={p.slug} href={`#featured-${p.slug}`} onClick={handleAnchorClick}>
              <span aria-hidden="true">0{i + 1}</span> {p.name}
            </a>
          ))}
        </nav>
      </header>

      {products.map((p, i) => {
        const theme = p.featured!.theme;
        const flip = i % 2 === 1;
        const colorLabel = p.colors
          .map((id) => colors.find((c) => c.id === id)?.label)
          .filter(Boolean)
          .join(", ");
        const categoryLabel = categories.find((c) => c.id === p.category)?.label;
        const soldOut = p.availability === "sold-out";

        return (
          <article
            key={p.slug}
            id={`featured-${p.slug}`}
            data-panel
            data-bg={theme.bg}
            data-ink={theme.ink}
            className={`${styles.panel} ${flip ? styles.flip : ""}`}
            style={
              {
                background: theme.bg,
                color: theme.ink,
                "--panel-bg": theme.bg,
                "--panel-ink": theme.ink,
                "--panel-accent": theme.accent,
                "--focus": theme.ink,
              } as React.CSSProperties
            }
          >
            <p className={styles.bigName} aria-hidden="true" data-name>
              {p.name}
            </p>

            <div className={styles.photo}>
              <MovingPhoto
                image={p.images[0]}
                ratio="4 / 5"
                shape={i % 2 === 0 ? "arch" : "rect"}
                sizes="(max-width: 52rem) 86vw, 40vw"
                quality={90}
                tilt={6}
                drift={5}
                sway={i % 2 ? -2.5 : 2.5}
                reveal
              />
              <div className={styles.sticker} aria-hidden="true">
                <svg viewBox="0 0 120 120" className={styles.stickerRing} data-sticker>
                  <defs>
                    <path id={`sticker-${p.slug}`} d="M60 60m-46 0a46 46 0 1 1 92 0a46 46 0 1 1 -92 0" />
                  </defs>
                  <text className={styles.stickerText}>
                    <textPath href={`#sticker-${p.slug}`} textLength="282" lengthAdjust="spacing">
                      hand crocheted • hand crocheted • hand crocheted •
                    </textPath>
                  </text>
                </svg>
                <span className={styles.stickerPrice}>{formatPrice(p.price)}</span>
              </div>
            </div>

            <div className={styles.text}>
              <p className={`eyebrow ${styles.meta}`} data-rise data-prehide>
                {[`0${i + 1}`, categoryLabel, colorLabel].filter(Boolean).join(" · ")}
              </p>
              <h3 className={`display ${styles.name}`} data-rise data-prehide>
                {p.name}
              </h3>
              {p.summary && (
                <p className={styles.tagline} data-rise data-prehide>
                  {p.summary}
                </p>
              )}
              <div className={styles.row} data-rise data-prehide>
                <p className={styles.priceText}>{formatPrice(p.price)}</p>
                <AvailabilityBadge availability={p.availability} />
              </div>
              <div className={styles.actions} data-rise data-prehide>
                <button type="button" className={styles.primary} onClick={() => openProduct(p.slug)}>
                  View details
                  <span className="sr-only"> of {p.name}</span>
                </button>
                <button
                  type="button"
                  className={styles.secondary}
                  disabled={soldOut}
                  onClick={() => {
                    addToCart(p.slug, 1);
                    openCart();
                  }}
                >
                  {soldOut ? "Sold out" : "Add to bag"}
                  <span className="sr-only"> – {p.name}</span>
                </button>
              </div>
            </div>
          </article>
        );
      })}

      <div className={styles.foot}>
        <a href="#collection" className={styles.allLink} onClick={handleAnchorClick}>
          See the whole collection
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 3v13M4 11l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>
    </section>
  );
}

