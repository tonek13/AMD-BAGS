"use client";

import Link from "next/link";
import { navLinks } from "@/config/site";
import { selectSections } from "@/lib/selectors";
import { scrollToTarget } from "@/lib/scroll";
import { Customize } from "@/components/site/Customize";
import { ModalDialog } from "./ModalDialog";
import { useShop } from "./shop-context";
import styles from "./MenuDrawer.module.css";

/** The menu behind the three-line button: every collection that has its own section, plus the main places on the site. */
export function MenuDrawer() {
  const { menuOpen, menuPath, closeMenu, products, categories, settings } = useShop();
  const sections = selectSections(products, categories);

  // Links to a spot on the homepage: scroll there when already on it, otherwise navigate (the browser lands on the anchor).
  function onHomeAnchor(e: React.MouseEvent<HTMLAnchorElement>, hash: string) {
    closeMenu();
    if (window.location.pathname === "/") {
      e.preventDefault();
      window.setTimeout(() => scrollToTarget(hash), 380);
    }
  }

  return (
    <ModalDialog open={menuOpen} onClose={closeMenu} label="Menu" variant="drawerLeft">
      <div className={styles.panel}>
        <header className={styles.header}>
          <h2 className={styles.title}>{settings.brandName}</h2>
          <button type="button" className={styles.close} onClick={closeMenu} aria-label="Close menu">
            <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <nav className={styles.body} aria-label="Menu">
          {sections.length > 0 && (
            <>
              <p className={`eyebrow ${styles.group}`}>Shop by shelf</p>
              <ul className={styles.list}>
                {sections.map(({ category, products: inSection }) => (
                  <li key={category.id}>
                    <Link
                      href={`/collections/${category.id}`}
                      className={styles.item}
                      aria-current={menuPath === `/collections/${category.id}` ? "page" : undefined}
                      onClick={closeMenu}
                    >
                      <span className={styles.itemName}>{category.label}</span>
                      <span className={styles.itemCount}>{inSection.length}</span>
                      <Arrow />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className={`eyebrow ${styles.group}`}>Around the shop</p>
          <ul className={styles.list}>
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={`/${link.href}`} className={styles.item} onClick={(e) => onHomeAnchor(e, link.href)}>
                  <span className={styles.itemName}>{link.href === "#collection" ? "All bags" : link.label}</span>
                  <Arrow />
                </Link>
              </li>
            ))}
          </ul>

          <div className={styles.customize}>
            <Customize settings={settings} variant="compact" />
          </div>
        </nav>
      </div>
    </ModalDialog>
  );
}

function Arrow() {
  return (
    <svg className={styles.arrow} viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      <path d="M3 10h13M11 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
