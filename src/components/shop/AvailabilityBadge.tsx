import type { Availability } from "@/types/catalog";
import { availabilityLabel } from "@/lib/format";
import styles from "./AvailabilityBadge.module.css";

export function AvailabilityBadge({ availability, className = "" }: { availability: Availability; className?: string }) {
  return (
    <span className={`${styles.badge} ${styles[availability]} ${className}`}>
      <span className={styles.dot} aria-hidden="true" />
      {availabilityLabel[availability]}
    </span>
  );
}
