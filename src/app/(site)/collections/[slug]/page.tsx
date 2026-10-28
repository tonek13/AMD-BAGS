import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalog, getShopSettings } from "@/lib/catalog";
import { selectSections } from "@/lib/selectors";
import { Customize } from "@/components/site/Customize";
import { Footer } from "@/components/site/Footer";
import { SectionPage } from "@/components/site/SectionPage";

/** With Cache Components a dynamic route must list at least one page to prerender; this one never matches a real shelf (404). */
const NO_SHELVES_YET = "no-shelves-yet";

type Props = { params: Promise<{ slug: string }> };

/** One page per collection that has "Show as its own section" switched on. */
export async function generateStaticParams() {
  const { products, categories } = await getCatalog();
  const slugs = selectSections(products, categories).map((s) => ({ slug: s.category.id }));
  return slugs.length > 0 ? slugs : [{ slug: NO_SHELVES_YET }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { products, categories } = await getCatalog();
  const section = selectSections(products, categories).find((s) => s.category.id === slug);
  if (!section) return { title: "Not found" };
  return {
    title: section.category.label,
    description: `${section.category.label}: hand-crocheted bags, made slowly in small batches.`,
  };
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  const [{ products, categories }, settings] = await Promise.all([getCatalog(), getShopSettings()]);
  const sections = selectSections(products, categories);
  const section = sections.find((s) => s.category.id === slug);
  if (!section) notFound();

  return (
    <>
      <SectionPage section={section} others={sections.filter((s) => s !== section)} />
      <Customize settings={settings} />
      <Footer settings={settings} />
    </>
  );
}
