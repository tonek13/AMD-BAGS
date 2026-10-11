import type { ProductImage } from "@/types/catalog";

/**
 * The real photograph shown beside the finished bag at the end of the scroll story.
 * The story is a reusable brand piece: it belongs to the brand, not to any product in the CMS,
 * so this photo is a fixed file and the story keeps working whatever the catalogue contains.
 */
export const storyPhoto: ProductImage = {
  src: "/images/products/burgundy-clutch-stone-wall.jpg",
  alt: "A burgundy crochet clutch with a cut-out handle sitting on a sunlit stone wall",
  width: 1280,
  height: 1149,
  focal: { x: 11, y: 45 },
};
