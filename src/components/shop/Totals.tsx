"use client";

import { fromCents } from "@/lib/format";
import type { Pricing } from "@/lib/pricing";
import { useShop } from "./shop-context";
import styles from "./Totals.module.css";

/** Subtotal, offers, delivery fee and total. With nothing to add or take off, just the total. */
export function Totals({ pricing }: { pricing: Pricing }) {
  const { formatMoney } = useShop();
  const money = (cents: number) => formatMoney(fromCents(cents));
  const extras = pricing.discounts.length > 0 || pricing.deliveryCents > 0;

  return (
    <dl className={styles.totals}>
      {extras && (
        <div className={styles.row}>
          <dt>Subtotal</dt>
          <dd>{money(pricing.subtotalCents)}</dd>
        </div>
      )}
      {pricing.discounts.map((d) => (
        <div key={d.offerId} className={`${styles.row} ${styles.offer}`}>
          <dt>
            Offer · {d.title}
            <span> ({d.units} free)</span>
          </dt>
          <dd>−{money(d.cents)}</dd>
        </div>
      ))}
      {pricing.deliveryCents > 0 && (
        <div className={styles.row}>
          <dt>Delivery</dt>
          <dd>{money(pricing.deliveryCents)}</dd>
        </div>
      )}
      <div className={styles.total}>
        <dt>Total</dt>
        <dd>{money(pricing.totalCents)}</dd>
      </div>
    </dl>
  );
}
