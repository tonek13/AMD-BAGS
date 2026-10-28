import Link from "next/link";
import type { Shelf, ShelfGroup } from "@/lib/selectors";
import { ShelfGroupView } from "./collection/ShelfGroupView";
import styles from "./SectionPage.module.css";

interface SectionPageProps {
  kicker: string;
  title: string;
  /** One line under the title. */
  blurb: string;
  groups: ShelfGroup[];
  /** The other shelves, offered as links at the end of the page. */
  others: Shelf[];
  /** Shown instead of the bags when there are none (e.g. a sale that is not on). */
  emptyText?: string;
}

/** One shelf on its own page: its name, its bags, and a way to the other shelves. */
export function SectionPage({ kicker, title, blurb, groups, others, emptyText }: SectionPageProps) {
  const empty = groups.every((g) => g.products.length === 0);

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
          <p className={`eyebrow ${styles.kicker}`}>{kicker}</p>
          <h1 className={`display ${styles.title}`}>{title}</h1>
          <p className={styles.count}>{empty ? emptyText : blurb}</p>
        </header>

        {groups.map((g) => (
          <ShelfGroupView key={g.id} group={g} />
        ))}

        {others.length > 0 && (
          <nav className={styles.others} aria-labelledby="other-shelves">
            <h2 id="other-shelves" className={`eyebrow ${styles.othersTitle}`}>
              More shelves
            </h2>
            <ul className={styles.pills}>
              {others.map((s) => (
                <li key={s.id}>
                  <Link href={s.href} className={styles.pill}>
                    {s.title}
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
