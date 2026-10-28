import Link from "next/link";
import styles from "./NotFoundPage.module.css";

/**
 * The 404 page: two needles hook a bag that never gets finished. The bag grows row by row, nearly
 * makes it, then comes undone in a flurry of loose yarn, and starts again. Pure SVG + CSS (no
 * scripts); with reduced motion it is a still picture of a half-made bag.
 */
export function NotFoundPage() {
  return (
    <main id="main" className={styles.page}>
      <div className={styles.inner}>
        <svg className={styles.art} viewBox="0 0 440 360" role="img" aria-label="Two knitting needles hooking a bag that keeps coming undone">
          <defs>
            <clipPath id="nf-bag">
              <path d="M120 150H320L300 295Q298 310 282 310H158Q142 310 140 295Z" />
            </clipPath>
          </defs>

          {/* yarn ball and the thread feeding the needles */}
          <g className={styles.ball}>
            <circle cx="78" cy="288" r="40" fill="var(--burgundy-soft)" />
            <path d="M44 270c22 14 50 14 72-2M40 288c24 16 54 16 76 0M48 308c18 10 40 10 58 0M62 252c-8 22-8 46 2 70M92 250c8 22 8 46-2 72" fill="none" stroke="var(--ivory)" strokeWidth="2" strokeLinecap="round" opacity=".5" />
          </g>
          <path className={styles.thread} d="M104 258C150 212 168 176 202 132" fill="none" stroke="var(--burgundy-soft)" strokeWidth="3.5" strokeLinecap="round" />

          {/* the bag, uncovered one row at a time from the needles downward */}
          <g className={styles.bag}>
            <g clipPath="url(#nf-bag)">
              {Array.from({ length: 8 }, (_, i) => (
                <g key={i}>
                  <rect x="100" y={150 + i * 20} width="240" height="20" fill={i % 2 ? "var(--burgundy)" : "var(--burgundy-soft)"} />
                  <line x1="100" x2="340" y1={160 + i * 20} y2={160 + i * 20} stroke="var(--ivory)" strokeWidth="3" strokeDasharray="7 7" strokeLinecap="round" opacity=".42" />
                </g>
              ))}
              <rect className={styles.cover} x="100" y="150" width="240" height="165" fill="var(--ivory)" />
            </g>
          </g>

          {/* loose cords going wild */}
          <g fill="none" strokeLinecap="round" strokeWidth="3.5">
            <path className={`${styles.cord} ${styles.cord1}`} d="M335 240c36-44 70 18 34-52s-6-84 36-62" stroke="var(--gold)" />
            <path className={`${styles.cord} ${styles.cord2}`} d="M322 300c46 6 52-40 18-58s-4-52 40-40" stroke="var(--burgundy-soft)" />
            <path className={`${styles.cord} ${styles.cord3}`} d="M160 330c-26-30 24-44 62-26s70-16 118 8" stroke="var(--gold)" />
          </g>

          {/* the two needles, working fast */}
          <g className={`${styles.needle} ${styles.needleA}`}>
            <line x1="138" y1="22" x2="250" y2="150" stroke="var(--charcoal)" strokeWidth="6" strokeLinecap="round" />
            <circle cx="136" cy="20" r="9" fill="var(--charcoal)" />
          </g>
          <g className={`${styles.needle} ${styles.needleB}`}>
            <line x1="302" y1="22" x2="190" y2="150" stroke="var(--gold)" strokeWidth="6" strokeLinecap="round" />
            <circle cx="304" cy="20" r="9" fill="var(--gold)" />
          </g>
        </svg>

        <div className={styles.copy}>
          <p className={`eyebrow ${styles.kicker}`}>404 · Page not found</p>
          <h1 className={`display ${styles.title}`}>
            This stitch <em>came undone.</em>
          </h1>
          <p className={styles.text}>We keep hooking this page, but it never quite becomes a bag. The one you wanted may have moved, sold out, or never existed.</p>
          <Link href="/#collection" className="btn">
            Browse the bags
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 10h13M11 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </main>
  );
}
