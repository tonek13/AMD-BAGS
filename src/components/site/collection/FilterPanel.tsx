"use client";

import type { CategoryOption, ColorOption, Product } from "@/types/catalog";
import { ModalDialog } from "@/components/shop/ModalDialog";
import { Swatch } from "./Swatch";
import { activeFilterCount, facetCount, toggleItem, type FilterState } from "./filters";
import styles from "./FilterPanel.module.css";

interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
  categories: CategoryOption[];
  colors: ColorOption[];
  filters: FilterState;
  resultCount: number;
  /** Wraps every change so the grid can animate (FLIP) from its old layout. */
  onChange: (next: FilterState) => void;
  onClear: () => void;
}

/**
 * Slide-in filter panel, in the style of large fashion stores: grouped sections, round colour
 * swatches, a live count on every option, and one big "Show N bags" button. Changes apply to the
 * grid immediately, so the count on the button is always the real result.
 */
export function FilterPanel({ open, onClose, products, categories, colors, filters, resultCount, onChange, onClear }: FilterPanelProps) {
  const active = activeFilterCount(filters);

  return (
    <ModalDialog open={open} onClose={onClose} label="Filters" variant="drawerLeft">
      <div className={styles.panel}>
        <header className={styles.header}>
          <h2 className={styles.title}>Filters</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close filters">
            <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className={styles.body}>
          <details className={styles.section} open>
            <summary className={styles.summary}>
              <span>Style</span>
              {filters.categories.length > 0 && <span className={styles.picked}>{filters.categories.length}</span>}
              <Chevron />
            </summary>
            <ul className={styles.list}>
              {categories.map((c) => {
                const checked = filters.categories.includes(c.id);
                const count = facetCount(products, filters, "categories", c.id);
                return (
                  <li key={c.id}>
                    <label className={`${styles.option} ${count === 0 && !checked ? styles.empty : ""}`}>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        disabled={count === 0 && !checked}
                        onChange={() => onChange({ ...filters, categories: toggleItem(filters.categories, c.id) })}
                      />
                      <span className={styles.box} aria-hidden="true">
                        <svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </span>
                      <span className={styles.label}>{c.label}</span>
                      <span className={styles.count}>{count}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </details>

          <details className={styles.section} open>
            <summary className={styles.summary}>
              <span>Colour</span>
              {filters.colors.length > 0 && <span className={styles.picked}>{filters.colors.length}</span>}
              <Chevron />
            </summary>
            <ul className={styles.swatches}>
              {colors.map((c) => {
                const checked = filters.colors.includes(c.id);
                const count = facetCount(products, filters, "colors", c.id);
                return (
                  <li key={c.id}>
                    <label className={`${styles.swatchOption} ${count === 0 && !checked ? styles.empty : ""}`}>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        disabled={count === 0 && !checked}
                        onChange={() => onChange({ ...filters, colors: toggleItem(filters.colors, c.id) })}
                      />
                      <span className={styles.swatchRing}>
                        <Swatch swatch={c.swatch} size="lg" />
                      </span>
                      <span className={styles.swatchLabel}>{c.label}</span>
                      <span className={styles.swatchCount}>{count}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </details>

          <details className={styles.section} open>
            <summary className={styles.summary}>
              <span>Availability</span>
              <Chevron />
            </summary>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                className="sr-only"
                checked={filters.hideSoldOut}
                onChange={() => onChange({ ...filters, hideSoldOut: !filters.hideSoldOut })}
              />
              <span className={styles.track} aria-hidden="true">
                <span className={styles.thumb} />
              </span>
              <span className={styles.label}>Hide sold-out bags</span>
            </label>
          </details>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.clear} onClick={onClear} disabled={active === 0}>
            Clear all
          </button>
          <button type="button" className={`btn ${styles.show}`} onClick={onClose}>
            {resultCount === 0 ? "No bags match" : `Show ${resultCount} ${resultCount === 1 ? "bag" : "bags"}`}
          </button>
        </footer>
      </div>
    </ModalDialog>
  );
}

function Chevron() {
  return (
    <svg className={styles.chevron} viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
