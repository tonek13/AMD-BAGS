import { getCatalog, getCraftMoments, getShopSettings } from "@/lib/catalog";
import { selectFeatured, selectHero } from "@/lib/selectors";
import { Collection } from "@/components/site/Collection";
import { Craft } from "@/components/site/Craft";
import { FeaturedBags } from "@/components/site/FeaturedBags";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/site/Hero";
import { Marquee } from "@/components/site/Marquee";
import { YarnStory } from "@/components/story/YarnStory";

export default async function Home() {
  const [{ products }, settings, craft] = await Promise.all([getCatalog(), getShopSettings(), getCraftMoments()]);
  const featured = selectFeatured(products);
  const { primary, secondary } = selectHero(products);

  return (
    <>
      <main id="main">
        <Hero primary={primary} secondary={secondary} />
        <Marquee />
        {/* The making-of story belongs to the brand, so it never depends on a particular product. */}
        <YarnStory />
        {featured.length > 0 && <FeaturedBags products={featured} />}
        <Collection products={products} />
        <Craft moments={craft} />
      </main>
      <Footer settings={settings} />
    </>
  );
}
