import styles from "./Marquee.module.css";

const words = ["Hand crocheted", "One stitch at a time", "Small batches", "Chunky & soft", "Made to be carried"];

/** A slow ticker of phrases. Decorative, so it is hidden from assistive tech and stops for reduced motion. */
export function Marquee() {
  const row = (
    <ul className={styles.row}>
      {words.map((w) => (
        <li key={w} className={styles.item}>
          <span>{w}</span>
          <svg viewBox="0 0 24 24" className={styles.knot} aria-hidden="true">
            <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2.2" />
            <path d="M5 10c5 3 9 3 14 0M5 14c5 3 9 3 14 0" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </li>
      ))}
    </ul>
  );

  return (
    <div className={styles.marquee} aria-hidden="true" data-surface="dark">
      <div className={styles.track}>
        {row}
        {row}
      </div>
    </div>
  );
}
