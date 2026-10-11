import type { ColorOption } from "@/types/catalog";
import styles from "./Swatch.module.css";

/** A round colour chip; two-tone colours render as a split chip. Purely visual (always paired with a text label). */
export function Swatch({ swatch, size = "md" }: { swatch: ColorOption["swatch"]; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      className={`${styles.swatch} ${styles[size]}`}
      aria-hidden="true"
      style={{
        background: swatch.length === 2 ? `linear-gradient(135deg, ${swatch[0]} 50%, ${swatch[1]} 50%)` : swatch[0],
      }}
    />
  );
}
