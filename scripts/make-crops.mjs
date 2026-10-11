// Cuts native-resolution close-up crops from the supplied product photos.
// Originals in public/images/products are never modified; crops go to public/images/crops.
// Re-run with: node scripts/make-crops.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const SRC = "public/images/products";
const OUT = "public/images/crops";
mkdirSync(OUT, { recursive: true });

// left/top/width/height are in the pixels of the original photo.
const crops = [
  { out: "crop-black-stitches.jpg", src: "black-nest-bag-satin.jpg", left: 100, top: 640, width: 470, height: 360 },
  { out: "crop-black-rings-handle.jpg", src: "black-nest-bag-satin.jpg", left: 200, top: 470, width: 400, height: 260 },
  { out: "crop-peach-handle.jpg", src: "peach-arch-bag-denim.jpg", left: 215, top: 270, width: 370, height: 470 },
  { out: "crop-white-stitches.jpg", src: "white-clutch-jasmine.jpg", left: 230, top: 590, width: 540, height: 330 },
  { out: "crop-cream-tassel.jpg", src: "cream-crescent-bag-tassel.jpg", left: 500, top: 430, width: 340, height: 340 },
  { out: "crop-ripple-stitches.jpg", src: "burgundy-cream-basket-steps.jpg", left: 270, top: 650, width: 530, height: 380 },
  { out: "crop-burgundy-stitches.jpg", src: "burgundy-clutch-stone-wall.jpg", left: 220, top: 340, width: 520, height: 330 },
];

for (const c of crops) {
  await sharp(`${SRC}/${c.src}`)
    .extract({ left: c.left, top: c.top, width: c.width, height: c.height })
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(`${OUT}/${c.out}`);
  console.log("wrote", c.out, c.width, "x", c.height);
}
