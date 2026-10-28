import type { Metadata } from "next";
import { getCatalog, getShopSettings } from "@/lib/catalog";
import { selectShelves } from "@/lib/selectors";
import { Customize } from "@/components/site/Customize";
import { Footer } from "@/components/site/Footer";
import { SectionPage } from "@/components/site/SectionPage";

export const metadata: Metadata = {
  title: "Sale",
  description: "Hand-crocheted bags at sale prices.",
};

/**
 * The Sale page. It always answers (never a 404): when the owner has not switched Sale on, it says
 * there is nothing on right now, so an old link or a bookmark never dead-ends.
 */
export default async function SalePage() {
  const [catalog, settings] = await Promise.all([getCatalog(), getShopSettings()]);
  const shelves = selectShelves(catalog);
  const shelf = shelves.find((s) => s.kind === "sale");

  return (
    <>
      <SectionPage
        kicker="On sale"
        title={shelf?.title ?? "Sale"}
        blurb="Special prices on these bags while the sale lasts."
        emptyText="There is no sale on right now. Have a look at the rest of the shop."
        groups={shelf?.groups ?? []}
        others={shelves.filter((s) => s !== shelf)}
      />
      <Customize settings={settings} />
      <Footer settings={settings} />
    </>
  );
}
