"use client";

import { useEffect, useRef } from "react";
import type { Product } from "@/types/catalog";
import { siteConfig } from "@/config/site";
import { gsap, registerGsap } from "@/lib/gsap";
import { handleAnchorClick } from "@/lib/scroll";
import { MovingPhoto } from "@/components/motion/MovingPhoto";
import { useShop } from "@/components/shop/shop-context";
import styles from "./Hero.module.css";

interface HeroProps {
  /** The two bags in the opening composition. Either may be missing when the shop has fewer than two. */
  primary?: Product;
  secondary?: Product;
}

export function Hero({ primary, secondary }: HeroProps) {
  const root = useRef<HTMLElement>(null);
  const { openProduct, formatPrice, settings } = useShop();
  const headline = settings.heroHeadline;

  useEffect(() => {
    registerGsap();
    const el = root.current;
    if (!el) return;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const q = gsap.utils.selector(el);
      const lines = q("[data-hero='line']");
      const fades = q("[data-hero='fade']");
      const pops = q("[data-hero='pop']");

      gsap.set(lines, { yPercent: 118, rotate: 5, transformOrigin: "0 100%" });
      gsap.set(fades, { autoAlpha: 0, y: 26 });
      gsap.set(pops, { autoAlpha: 0, scale: 0.4, rotate: -40 });

      const intro = gsap.timeline({ defaults: { ease: "expo.out" }, delay: 0.1 });
      intro
        .to(lines, { yPercent: 0, rotate: 0, duration: 1.5, stagger: 0.13 })
        .to(fades, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.09 }, "-=1.1")
        .to(pops, { autoAlpha: 1, scale: 1, rotate: 0, duration: 1.4, stagger: 0.12, ease: "elastic.out(1, 0.55)" }, "-=1.2");

      // The headline lines slide apart as the page scrolls away from the hero.
      const scroll = { trigger: el, start: "top top", end: "bottom top", scrub: true };
      gsap.to(q("[data-line-shift='left']"), { xPercent: -9, ease: "none", scrollTrigger: scroll });
      gsap.to(q("[data-line-shift='right']"), { xPercent: 9, ease: "none", scrollTrigger: scroll });
      gsap.to(q("[data-speed='slow']"), { yPercent: -8, ease: "none", scrollTrigger: scroll });
      gsap.to(q("[data-speed='fast']"), { yPercent: -26, ease: "none", scrollTrigger: scroll });
    });

    return () => mm.revert();
  }, []);

  return (
    <section ref={root} id="top" className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.grid}>
        <div className={styles.copy}>
          <p className={`eyebrow ${styles.eyebrow}`} data-hero="fade" data-prehide>
            {siteConfig.tagline} · small batches
          </p>

          <h1 id="hero-title" className={`display ${styles.title}`}>
            {headline.map((line, i) => (
              <span key={i} className={styles.mask} data-line-shift={i % 2 === 0 ? "left" : "right"}>
                <span className={styles.line} data-hero="line" data-prehide>
                  {i === headline.length - 1 ? <em>{line}</em> : line}
                </span>
              </span>
            ))}
          </h1>

          <p className={styles.lede} data-hero="fade" data-prehide>
            {settings.heroIntro}
          </p>

          <div className={styles.ctas} data-hero="fade" data-prehide>
            <a className="btn" href="#collection" onClick={handleAnchorClick}>
              Shop the collection
              <Arrow />
            </a>
            <a className="btn btn--ghost" href="#story" onClick={handleAnchorClick}>
              See how it’s made
            </a>
          </div>
        </div>

        <div className={styles.collage}>
          {primary && (
          <div className={styles.main} data-speed="slow">
            <MovingPhoto
              image={primary.images[0]}
              shape="arch"
              ratio="4 / 5.3"
              sizes="(max-width: 52rem) 80vw, 40vw"
              preload
              quality={90}
              tilt={4}
              drift={4}
              reveal
            />
            <button type="button" className={styles.tag} onClick={() => openProduct(primary.slug)} data-hero="fade" data-prehide>
              <span>{primary.name}</span>
              <span aria-hidden="true">·</span>
              <span>{formatPrice(primary.price)}</span>
              <span className="sr-only"> – view details</span>
            </button>
          </div>
          )}

          {secondary && (
          <div className={styles.second} data-speed="fast">
            <MovingPhoto
              image={secondary.images[0]}
              ratio="4 / 5"
              sizes="(max-width: 52rem) 38vw, 18vw"
              tilt={7}
              drift={5}
              sway={3}
              reveal
              className={styles.secondPhoto}
            />
          </div>
          )}

          <div className={styles.badge} data-hero="pop" data-prehide aria-hidden="true">
            <svg viewBox="0 0 160 160" className={styles.badgeSpin}>
              <defs>
                <path id="hero-badge-ring" d="M80 80m-60 0a60 60 0 1 1 120 0a60 60 0 1 1 -120 0" />
              </defs>
                            <text className={styles.badgeText}>
                <textPath href="#hero-badge-ring" startOffset="0" textLength="368" lengthAdjust="spacing">
                  hand crocheted • small batches • made with care •
                </textPath>
              </text>
            </svg>
            <svg viewBox="0 0 40 40" className={styles.badgeCore}>
              <circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" strokeWidth="2.4" />
              <path d="M8 17c8 5 16 5 24 0M7 23c9 6 17 6 26 0M14 8c-4 8-4 16 0 24M26 8c4 8 4 16 0 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".75" />
            </svg>
          </div>
        </div>
      </div>

      <a className={styles.scrollCue} href="#story" onClick={handleAnchorClick} data-hero="fade" data-prehide>
        <span>Scroll</span>
        <span className={styles.cueLine} aria-hidden="true" />
      </a>
    </section>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 10h13M11 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
