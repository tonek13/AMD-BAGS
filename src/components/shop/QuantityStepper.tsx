"use client";

import { siteConfig } from "@/config/site";
import styles from "./QuantityStepper.module.css";

interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  /** Used in the accessible names, e.g. "Decrease quantity of Bordeaux Clutch". */
  itemName: string;
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: "md" | "sm";
}

export function QuantityStepper({
  value,
  onChange,
  itemName,
  min = 1,
  max = siteConfig.maxQuantityPerItem,
  disabled = false,
  size = "md",
}: QuantityStepperProps) {
  return (
    <div className={`${styles.stepper} ${size === "sm" ? styles.sm : ""}`} role="group" aria-label={`Quantity of ${itemName}`}>
      <button
        type="button"
        className={styles.button}
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= min}
        aria-label={`Decrease quantity of ${itemName}`}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" width="14" height="14">
          <path d="M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      <span className={styles.value} aria-live="polite" aria-atomic="true">
        {value}
      </span>
      <button
        type="button"
        className={styles.button}
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        aria-label={`Increase quantity of ${itemName}`}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" width="14" height="14">
          <path d="M3 8h10M8 3v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
