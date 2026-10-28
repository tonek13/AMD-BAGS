import type { Product } from "@/types/catalog";
import styles from "./Price.module.css";

/** A bag's price. While it is on sale the previous price is shown struck through before the new one. */
export function Price({ product, formatPrice }: { product: Pick<Product, "price" | "compareAtPrice">; formatPrice: (amount: number) => string }) {
  if (product.compareAtPrice === undefined) return <>{formatPrice(product.price)}</>;
  return (
    <span className={styles.sale}>
      <span className="sr-only">Was </span>
      <s className={styles.was}>{formatPrice(product.compareAtPrice)}</s>
      <span className="sr-only">, now </span>
      <span className={styles.now}>{formatPrice(product.price)}</span>
    </span>
  );
}
