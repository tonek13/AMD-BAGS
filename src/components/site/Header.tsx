"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navLinks } from "@/config/site";
import { gsap } from "@/lib/gsap";
import { getLenis, handleAnchorClick, prefersReducedMotion } from "@/lib/scroll";
import { useShop } from "@/components/shop/shop-context";
import styles from "./Header.module.css";

export function Header() {
  const { count, openCart, openMenu, settings } = useShop();
  const pathname = usePathname();
  const onHome = pathname === "/";
  const { brandName, logo } = settings;
  const badge = useRef<HTMLSpanElement>(null);
  const previous = useRef(count);

  // Give the count a little bounce when something is added.
  useEffect(() => {
    if (count > previous.current && badge.current && !prefersReducedMotion()) {
      gsap.fromTo(badge.current, { scale: 1.7, rotate: -12 }, { scale: 1, rotate: 0, duration: 0.8, ease: "elastic.out(1, 0.45)" });
    }
    previous.current = count;
  }, [count]);

  function toTop(e: React.MouseEvent) {
    if (!onHome) return; // on any other page the logo is an ordinary link home
    e.preventDefault();
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(0, { duration: 1.4 });
    else window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <button type="button" className={styles.menu} onClick={openMenu} aria-haspopup="dialog" aria-label="Open menu">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          </svg>
        </button>

        <Link href="/" className={styles.brand} onClick={toTop} aria-label={onHome ? `${brandName} – back to top` : `${brandName} – home`}>
          {logo ? (
            <Image
              className={styles.logo}
              src={logo.src}
              alt=""
              width={logo.width}
              height={logo.height}
              sizes="120px"
              style={{ height: "2rem", width: "auto" }}
            />
          ) : (
            <svg className={styles.mark} viewBox="0 0 28 28" aria-hidden="true">
              <circle cx="14" cy="14" r="11.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
              <path d="M4 11c7 4 13 4 20 0M3 16c8 5 14 5 22 0M8 6c-3 6-3 10 0 16M20 6c3 6 3 10 0 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity=".7" />
            </svg>
          )}
          <span className={styles.name}>{brandName}</span>
        </Link>

        <nav className={styles.nav} aria-label="Primary">
          {navLinks.map((link) =>
            onHome ? (
              <a key={link.href} href={link.href} onClick={handleAnchorClick} className={styles.link}>
                {link.label}
              </a>
            ) : (
              <Link key={link.href} href={`/${link.href}`} className={styles.link}>
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <button type="button" className={styles.cart} onClick={openCart} aria-label={`Open bag, ${count} ${count === 1 ? "item" : "items"}`}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M5.5 9h13l-1 11h-11z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M9 9V7.5a3 3 0 0 1 6 0V9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          <span className={styles.cartLabel}>Bag</span>
          <span ref={badge} className={`${styles.count} ${count > 0 ? styles.filled : ""}`} aria-hidden="true">
            {count}
          </span>
        </button>
      </div>
    </header>
  );
}
