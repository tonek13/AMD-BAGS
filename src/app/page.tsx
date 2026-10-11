import { getCraftMoments, getFeaturedProducts, getHeroProducts, getProducts, getStoryProduct } from "@/lib/catalog";
import { Collection } from "@/components/site/Collection";
import { Craft } from "@/components/site/Craft";
import { FeaturedBags } from "@/components/site/FeaturedBags";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/site/Hero";
import { Marquee } from "@/components/site/Marquee";
import { YarnStory } from "@/components/story/YarnStory";

export default async function Home() {
  const [hero, storyProduct, featured, products, craft] = await Promise.all([
    getHeroProducts(),
    getStoryProduct(),
    getFeaturedProducts(),
    getProducts(),
    getCraftMoments(),
  ]);

  return (
    <>
      <main id="main">
        <Hero primary={hero.primary} secondary={hero.secondary} />
        <Marquee />
        <YarnStory product={storyProduct} />
        <FeaturedBags products={featured} />
        <Collection products={products} />
        <Craft moments={craft} />
      </main>
      <Footer />
    </>
  );
}
