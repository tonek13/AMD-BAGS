"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import type { ProductImage } from "@/types/catalog";
import { gsap, registerGsap } from "@/lib/gsap";
import styles from "./MovingPhoto.module.css";

interface MovingPhotoProps {
  image: Pick<ProductImage, "src" | "alt" | "focal">;
  sizes: string;
  /** CSS aspect-ratio of the frame, e.g. "4 / 5". */
  ratio?: string;
  shape?: "rect" | "arch" | "round";
  preload?: boolean;
  quality?: 75 | 90;
  /** Max pointer tilt in degrees (fine pointers only). 0 turns it off. */
  tilt?: number;
  /** Scroll parallax inside the frame, as a percentage of the frame height. 0 turns it off. */
  drift?: number;
  /** Rotation in degrees the whole photo sways through while it crosses the viewport. */
  sway?: number;
  /** Reveal the photo with a wipe the first time it scrolls into view. */
  reveal?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * One reusable behaviour for every photograph on the page: scroll parallax inside
 * the frame, a gentle sway while scrolling, a pointer tilt on desktop and an
 * optional reveal wipe. With reduced motion it is a plain, static photo.
 */
export function MovingPhoto({
  image,
  sizes,
  ratio = "4 / 5",
  shape = "rect",
  preload = false,
  quality = 75,
  tilt = 5,
  drift = 4,
  sway = 0,
  reveal = false,
  className = "",
  children,
}: MovingPhotoProps) {
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerGsap();
    const rootEl = root.current;
    const frameEl = frame.current;
    const innerEl = inner.current;
    if (!rootEl || !frameEl || !innerEl) return;

    const mm = gsap.matchMedia();
    mm.add(
      { motion: "(prefers-reduced-motion: no-preference)", fine: "(hover: hover) and (pointer: fine)" },
      (context) => {
        const { motion, fine } = context.conditions as { motion: boolean; fine: boolean };
        if (!motion) return;

        if (drift > 0) {
          gsap.fromTo(
            innerEl,
            { yPercent: -drift, scale: 1 + (drift * 2.4) / 100 },
            {
              yPercent: drift,
              ease: "none",
              scrollTrigger: { trigger: rootEl, start: "top bottom", end: "bottom top", scrub: true },
            },
          );
        }

        if (sway !== 0) {
          gsap.fromTo(
            rootEl,
            { rotation: -sway },
            {
              rotation: sway,
              ease: "none",
              scrollTrigger: { trigger: rootEl, start: "top bottom", end: "bottom top", scrub: 0.6 },
            },
          );
        }

        if (reveal) {
          gsap.set(frameEl, { clipPath: "inset(100% 0% 0% 0%)" });
          gsap.set(rootEl, { autoAlpha: 1 });
          gsap.to(frameEl, {
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 1.3,
            ease: "expo.out",
            scrollTrigger: { trigger: rootEl, start: "top 88%", once: true },
          });
        }

        if (fine && tilt > 0) {
          gsap.set(rootEl, { transformPerspective: 1000 });
          const rotY = gsap.quickTo(rootEl, "rotationY", { duration: 0.7, ease: "power3.out" });
          const rotX = gsap.quickTo(rootEl, "rotationX", { duration: 0.7, ease: "power3.out" });
          const move = (e: PointerEvent) => {
            const r = rootEl.getBoundingClientRect();
            const nx = (e.clientX - r.left) / r.width - 0.5;
            const ny = (e.clientY - r.top) / r.height - 0.5;
            rotY(nx * 2 * tilt);
            rotX(-ny * 2 * tilt);
          };
          const leave = () => {
            rotY(0);
            rotX(0);
          };
          rootEl.addEventListener("pointermove", move);
          rootEl.addEventListener("pointerleave", leave);
          return () => {
            rootEl.removeEventListener("pointermove", move);
            rootEl.removeEventListener("pointerleave", leave);
          };
        }
      },
    );

    return () => mm.revert();
  }, [drift, sway, reveal, tilt]);

  return (
    <div ref={root} className={`${styles.root} ${className}`} data-prehide={reveal ? "" : undefined}>
      <div ref={frame} className={`${styles.frame} ${styles[shape]}`} style={{ aspectRatio: ratio }}>
        <div ref={inner} className={styles.inner}>
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes={sizes}
            quality={quality}
            preload={preload}
            style={{ objectFit: "cover", objectPosition: `${image.focal?.x ?? 50}% ${image.focal?.y ?? 50}%` }}
          />
        </div>
        {children}
      </div>
    </div>
  );
}
