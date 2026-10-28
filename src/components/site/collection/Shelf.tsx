"use client";

import { useState } from "react";
import Link from "next/link";
import { registerGsap, ScrollTrigger } from "@/lib/gsap";
import styles from "./Shelf.module.css";

interface ShelfProps {
  /** Unique within the page; used to wire the button to the panel it opens. */
  id: string;
  /** 1-based position, shown as "01", "02"… */
  index: number;
  title: string;
  /** Bags currently shown in this shelf (after filters). */
  count: number;
  /** Page of this shelf on its own, when it has one. */
  href?: string;
  /** True when no bag matches the filters: the whole shelf steps out of the way. */
  empty?: boolean;
  children: React.ReactNode;
}

/**
 * One collapsible shelf of the shop: a big numbered title that opens and closes its bags.
 * Open by default, so customers see the bags first; closing one tucks it away without
 * leaving the page. The panel animates with a grid-row transition (no measured heights).
 */
export function Shelf({ id, index, title, count, href, empty = false, children }: ShelfProps) {
  const [open, setOpen] = useState(true);
  const buttonId = `${id}-toggle`;
  const panelId = `${id}-panel`;

  return (
    <section className={styles.shelf} data-open={open} data-empty={empty || undefined}>
      <h3 className={styles.heading}>
        <button type="button" id={buttonId} className={styles.toggle} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)}>
          <span className={styles.no} aria-hidden="true">
            {String(index).padStart(2, "0")}
          </span>
          <span className={styles.titleWrap}>
            <span className={`display ${styles.title}`}>{title}</span>
            <span className={styles.count}>
              {count} {count === 1 ? "bag" : "bags"}
            </span>
          </span>
          <span className={styles.chevron} aria-hidden="true">
            <svg viewBox="0 0 20 20" width="20" height="20">
              <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      </h3>

      <div
        id={panelId}
        className={styles.panel}
        role="region"
        aria-labelledby={buttonId}
        inert={!open}
        onTransitionEnd={(e) => {
          // Opening or closing a shelf moves everything below it: scroll animations need fresh measurements.
          if (e.target === e.currentTarget && e.propertyName === "grid-template-rows") {
            registerGsap();
            ScrollTrigger.refresh();
          }
        }}
      >
        <div className={styles.panelInner}>
          <div className={styles.panelBody}>
            {href && (
              <p className={styles.allRow}>
                <Link href={href} className={styles.all}>
                  See the whole shelf
                  <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
                    <path d="M3 10h13M11 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="sr-only"> – {title}</span>
                </Link>
              </p>
            )}
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
