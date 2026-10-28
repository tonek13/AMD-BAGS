import Link from "next/link";
import type { ShopSection } from "@/lib/selectors";
import { ProductGrid } from "./collection/ProductGrid";
import styles from "./SectionPage.module.css";

interface SectionPageProps {
  section: ShopSection;
  /** The other shelves, offered as links at the end of the page. */
  others: ShopSection[];
}

/** One collection on its own page: its name, its bags, and a way to the other shelves. */
export function SectionPage({ section, others }: SectionPageProps) {
  const { category, products } = section;

  return (
    <main id="main" className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.head}>
          <Link href="/#collection" className={styles.back}>
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
              <path d="M17 10H4M9 4l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All bags
          </Link>
          <p className={`eyebrow ${styles.kicker}`}>The shelf</p>
          <h1 className={`display ${styles.title}`}>{category.label}</h1>
          <p className={styles.count}>
            {products.length} {products.length === 1 ? "bag" : "bags"}, each one hooked by hand.
          </p>
        </header>

        <ProductGrid products={products} />

        {others.length > 0 && (
          <nav className={styles.others} aria-labelledby="other-shelves">
            <h2 id="other-shelves" className={`eyebrow ${styles.othersTitle}`}>
              More shelves
            </h2>
            <ul className={styles.pills}>
              {others.map((s) => (
                <li key={s.category.id}>
                  <Link href={`/collections/${s.category.id}`} className={styles.pill}>
                    {s.category.label}
                    <span className={styles.pillCount}>{s.products.length}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </main>
  );
}
