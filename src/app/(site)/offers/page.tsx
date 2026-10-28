import type { Metadata } from "next";
import { getCatalog, getShopSettings } from "@/lib/catalog";
import { selectShelves } from "@/lib/selectors";
import { Customize } from "@/components/site/Customize";
import { Footer } from "@/components/site/Footer";
import { SectionPage } from "@/components/site/SectionPage";

export const metadata: Metadata = {
  title: "Offers",
  description: "Offers on hand-crocheted bags.",
};

/**
 * The Offers page. It always answers (never a 404): when the owner has not switched Offers on, it says
 * there is nothing on right now, so an old link or a bookmark never dead-ends.
 */
export default async function OffersPage() {
  const [catalog, settings] = await Promise.all([getCatalog(), getShopSettings()]);
  const shelves = selectShelves(catalog);
  const shelf = shelves.find((s) => s.kind === "offers");

  return (
    <>
      <SectionPage
        kicker="Offers"
        title={shelf?.title ?? "Offers"}
        blurb="Pick your bags and the offer is applied for you in your bag."
        emptyText="There are no offers on right now. Have a look at the rest of the shop."
        groups={shelf?.groups ?? []}
        others={shelves.filter((s) => s !== shelf)}
      />
      <Customize settings={settings} />
      <Footer settings={settings} />
    </>
  );
}
