import type { Product } from "@/types/catalog";
import type { ShelfGroup } from "@/lib/selectors";
import { ProductGrid } from "./ProductGrid";
import type { Density } from "./filters";
import styles from "./ShelfGroupView.module.css";

/** One group of a shelf: its bags in a grid, under the offer's name and rule when it has them. */
export function ShelfGroupView({
  group,
  density,
  isHidden,
}: {
  group: ShelfGroup;
  density?: Density;
  isHidden?: (product: Product) => boolean;
}) {
  return (
    <div className={styles.group}>
      {group.title && (
        <header className={styles.head}>
          <h4 className={styles.title}>{group.title}</h4>
          {group.note && <p className={styles.rule}>{group.note}</p>}
        </header>
      )}
      <ProductGrid products={group.products} density={density} isHidden={isHidden} />
    </div>
  );
}
