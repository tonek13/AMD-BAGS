import type { ProductImage } from "@/types/catalog";

/**
 * Close-up crops of the owner's real photographs, used by the "Our Craft" section.
 * Crops are produced by scripts/make-crops.mjs from the originals in /public/images/products.
 * PROVISIONAL captions – the owner should rewrite them in their own voice.
 */
export interface CraftMoment {
  id: string;
  title: string;
  text: string;
  image: ProductImage;
}

const crop = (file: string) => `/images/crops/${file}`;

export const craftMoments: CraftMoment[] = [
  {
    id: "stitches",
    title: "Row by row",
    text: "Thick yarn, worked loop by loop, so every stitch stays plump and clear.",
    image: { src: crop("crop-black-stitches.jpg"), alt: "Close-up of chunky black crochet stitches", width: 470, height: 360 },
  },
  {
    id: "handles",
    title: "Handles you can feel",
    text: "Braided and rolled by hand, then finished with gold-toned rings.",
    image: { src: crop("crop-peach-handle.jpg"), alt: "Braided peach crochet handle with a gold-toned ring", width: 370, height: 470 },
  },
  {
    id: "texture",
    title: "Texture first",
    text: "Puffs, ribs and ripples – each pattern chosen to show off the yarn.",
    image: { src: crop("crop-white-stitches.jpg"), alt: "Close-up of white puff-stitch crochet texture", width: 540, height: 330 },
  },
  {
    id: "finish",
    title: "A finishing touch",
    text: "Tassels, rings and wooden handles are added last, one bag at a time.",
    image: { src: crop("crop-cream-tassel.jpg"), alt: "Cream crochet bag with a golden tassel", width: 340, height: 340 },
  },
  {
    id: "colour",
    title: "Colour, stitched in",
    text: "Two yarns worked together make a ripple of burgundy and cream.",
    image: { src: crop("crop-ripple-stitches.jpg"), alt: "Burgundy and cream two-tone crochet stitches", width: 530, height: 380 },
  },
];
