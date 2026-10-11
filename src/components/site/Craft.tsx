"use client";

import { useEffect, useRef } from "react";
import type { CraftMoment } from "@/data/craft";
import { gsap, registerGsap } from "@/lib/gsap";
import { handleAnchorClick } from "@/lib/scroll";
import { renderEmphasis } from "@/lib/text";
import { MovingPhoto } from "@/components/motion/MovingPhoto";
import { useShop } from "@/components/shop/shop-context";
import styles from "./Craft.module.css";

export function Craft({ moments }: { moments: CraftMoment[] }) {
  const root = useRef<HTMLElement>(null);
  // Heading and statement come from Shop Settings (with built-in defaults for empty fields).
  const { settings } = useShop();
  const quote = settings.craftText;

  useEffect(() => {
    registerGsap();
    const el = root.current;
    if (!el) return;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const words = gsap.utils.toArray<HTMLElement>("[data-word]", el);
      gsap.set(words, { opacity: 0.16 });
      gsap.to(words, {
        opacity: 1,
        ease: "none",
        stagger: 0.12,
        scrollTrigger: { trigger: "[data-quote]", start: "top 82%", end: "bottom 48%", scrub: true },
      });

      gsap.utils.toArray<HTMLElement>("[data-caption]", el).forEach((caption) => {
        gsap.from(caption.children, {
          y: 28,
          autoAlpha: 0,
          duration: 0.9,
          ease: "expo.out",
          stagger: 0.07,
          scrollTrigger: { trigger: caption, start: "top 90%", once: true },
        });
      });
    });

    return () => mm.revert();
  }, [quote]);

  return (
    <section ref={root} id="craft" className={styles.craft} aria-labelledby="craft-title" data-surface="dark">
      <div className={styles.inner}>
        <header className={styles.head}>
          <p className={`eyebrow ${styles.kicker}`}>Our craft</p>
          <h2 id="craft-title" className={`display ${styles.title}`}>
            {renderEmphasis(settings.craftHeading)}
          </h2>
        </header>

        <p className={styles.quote} data-quote data-prehide>
          {quote.split(" ").map((word, i) => (
            <span key={i} data-word>
              {word}{" "}
            </span>
          ))}
        </p>

        <div className={styles.collage}>
          {moments.map((m, i) => (
            <figure key={m.id} className={`${styles.shot} ${styles[`shot${i}`]}`}>
              <MovingPhoto
                image={m.image}
                ratio={`${m.image.width} / ${m.image.height}`}
                sizes="(max-width: 52rem) 86vw, 34vw"
                quality={90}
                tilt={5}
                drift={5}
                sway={i % 2 ? -2 : 2}
                reveal
              />
              <figcaption className={styles.caption} data-caption>
                <span className={styles.no}>0{i + 1}</span>
                <strong className={styles.captionTitle}>{m.title}</strong>
                <span className={styles.captionText}>{m.text}</span>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className={styles.foot}>
          <p className={styles.footText}>Ready to find the one that goes everywhere with you?</p>
          <a className="btn btn--gold" href="#collection" onClick={handleAnchorClick}>
            Shop the collection
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 10h13M11 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
