import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalog, getShopSettings } from "@/lib/catalog";
import { selectShelves } from "@/lib/selectors";
import { Customize } from "@/components/site/Customize";
import { Footer } from "@/components/site/Footer";
import { SectionPage } from "@/components/site/SectionPage";

/** With Cache Components a dynamic route must list at least one page to prerender; this one never matches a real shelf (404). */
const NO_SHELVES_YET = "no-shelves-yet";

/**
 * Shelves that exist at build time are prerendered. A shelf the owner switches on later is rendered
 * on its first visit, and a shelf that does not exist must answer with a real 404, so this page is
 * allowed to wait for its params instead of serving a shared loading shell first.
 */
export const instant = false;

type Props = { params: Promise<{ slug: string }> };

/** One page per collection that has "Show as its own section" switched on. */
export async function generateStaticParams() {
  const catalog = await getCatalog();
  const slugs = selectShelves(catalog)
    .filter((s) => s.kind === "collection")
    .map((s) => ({ slug: s.id }));
  return slugs.length > 0 ? slugs : [{ slug: NO_SHELVES_YET }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const shelf = selectShelves(await getCatalog()).find((s) => s.kind === "collection" && s.id === slug);
  if (!shelf) return { title: "Not found" };
  return {
    title: shelf.title,
    description: `${shelf.title}: hand-crocheted bags, made slowly in small batches.`,
  };
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  const [catalog, settings] = await Promise.all([getCatalog(), getShopSettings()]);
  const shelves = selectShelves(catalog);
  const shelf = shelves.find((s) => s.kind === "collection" && s.id === slug);
  if (!shelf) notFound();

  return (
    <>
      <SectionPage
        kicker="The shelf"
        title={shelf.title}
        blurb={`${shelf.products.length} ${shelf.products.length === 1 ? "bag" : "bags"}, each one hooked by hand.`}
        groups={shelf.groups}
        others={shelves.filter((s) => s !== shelf)}
      />
      <Customize settings={settings} />
      <Footer settings={settings} />
    </>
  );
}
