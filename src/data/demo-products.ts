import type { CategoryOption, ColorOption, Product } from "@/types/catalog";

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  DEMO DATA – only used when SHOP_DATA_SOURCE=demo.
 *  These are sample bags for design review: names, descriptions, prices and
 *  availability are placeholders. The photographs are the owner's real photos.
 *  The connected shop never falls back to this file: it reads Sanity only
 *  (see src/lib/catalog.ts).
 * ─────────────────────────────────────────────────────────────────────────
 */

export const categories: CategoryOption[] = [
  { id: "clutch", label: "Clutches" },
  { id: "top-handle", label: "Top handle" },
  { id: "tote", label: "Totes & baskets" },
];

export const colors: ColorOption[] = [
  { id: "black", label: "Black", swatch: ["#1d1a1b"] },
  { id: "burgundy", label: "Burgundy", swatch: ["#6b1631"] },
  { id: "cream", label: "Cream", swatch: ["#e3cfa6"] },
  { id: "peach", label: "Peach", swatch: ["#f0b98d"] },
  { id: "white", label: "White", swatch: ["#f7f4ee"] },
  { id: "burgundy-cream", label: "Burgundy & cream", swatch: ["#6b1631", "#f1d9d0"] },
];

const img = (file: string) => `/images/products/${file}`;

export const products: Product[] = [
  {
    id: "p-001",
    slug: "apricot-arch-bag",
    name: "Apricot Arch",
    summary: "A braided arch handle on soft peach ribs.",
    description:
      "A small top-handle bag worked in vertical ribs, with a rolled, braided arch handle that sits comfortably in the hand or the crook of an arm. Gold-toned rings join the handle to the body.",
    details: ["Hand crocheted", "Braided top handle", "Gold-toned rings"],
    price: 88,
    category: "top-handle",
    colors: ["peach"],
    availability: "in-stock",
    images: [
      {
        src: img("peach-arch-bag-denim.jpg"),
        alt: "Peach crochet top-handle bag with a braided arch handle resting against denim",
        width: 960,
        height: 1280,
        focal: { x: 50, y: 55 },
      },
    ],
    featured: { order: 1, theme: { bg: "#f1d3b8", ink: "#3a1a14", accent: "#6b1631" } },
  },
  {
    id: "p-002",
    slug: "noir-nest-bag",
    name: "Noir Nest",
    summary: "Rounded, deep black, with twin braided handles.",
    description:
      "A plump rounded bag in black with two braided handles joined by gold-toned rings. The chunky stitches catch the light and keep their shape.",
    details: ["Hand crocheted", "Two braided handles", "Gold-toned rings", "Soft, rounded shape"],
    price: 92,
    category: "top-handle",
    colors: ["black"],
    availability: "in-stock",
    images: [
      {
        src: img("black-nest-bag-satin.jpg"),
        alt: "Black chunky crochet bag with two braided handles and gold rings on cream satin",
        width: 960,
        height: 1280,
        focal: { x: 50, y: 62 },
      },
    ],
  },
  {
    id: "p-003",
    slug: "bordeaux-clutch",
    name: "Bordeaux Clutch",
    summary: "A deep burgundy clutch with a cut-out handle.",
    description:
      "A relaxed, wide clutch in rich burgundy with an integrated cut-out handle. Dense, chunky stitches give it a sculpted shape that holds on its own.",
    details: ["Hand crocheted", "Integrated cut-out handle", "Rich burgundy yarn", "Sculpted, structured shape"],
    price: 78,
    category: "clutch",
    colors: ["burgundy"],
    availability: "in-stock",
    images: [
      {
        src: img("burgundy-clutch-stone-wall.jpg"),
        alt: "Burgundy crochet clutch with a cut-out handle sitting on a sunlit stone wall",
        width: 1280,
        height: 1149,
        focal: { x: 11, y: 45 },
      },
      {
        src: img("burgundy-clutch-overhead.jpg"),
        alt: "The same burgundy crochet clutch seen from above on paving stones",
        width: 1280,
        height: 960,
        focal: { x: 42, y: 50 },
      },
    ],
    featured: { order: 2, theme: { bg: "#5a1228", ink: "#f7ebdd", accent: "#e0bf72" } },
  },
  {
    id: "p-004",
    slug: "creme-crescent-bag",
    name: "Crème Crescent",
    summary: "A half-moon tote with wooden handles and a tassel.",
    description:
      "A generous half-moon tote in warm cream with smooth wooden handles and a golden tassel. Tightly worked stitches give the body a woven, structured look.",
    details: ["Hand crocheted", "Wooden handles", "Golden tassel", "Roomy half-moon body"],
    price: 118,
    category: "tote",
    colors: ["cream"],
    availability: "in-stock",
    images: [
      {
        src: img("cream-crescent-bag-tassel.jpg"),
        alt: "Cream half-moon crochet tote with wooden handles and a golden tassel held by a woman in a yellow dress",
        width: 960,
        height: 1280,
        focal: { x: 52, y: 52 },
      },
    ],
    featured: { order: 3, theme: { bg: "#ece0c6", ink: "#2f2418", accent: "#8a5a1c" } },
  },
  {
    id: "p-005",
    slug: "cloud-clutch",
    name: "Cloud Clutch",
    summary: "Soft white puff stitches with a braided top edge.",
    description:
      "A bright white clutch worked in puffy, textured stitches with a braided edge around the carry opening. Light, airy and easy to dress up or down.",
    details: ["Hand crocheted", "Braided carry opening", "Puff-stitch texture", "Bright white yarn"],
    price: 74,
    category: "clutch",
    colors: ["white"],
    availability: "sold-out",
    images: [
      {
        src: img("white-clutch-jasmine.jpg"),
        alt: "White crochet clutch with puff stitches held among white jasmine flowers",
        width: 960,
        height: 1280,
        focal: { x: 50, y: 58 },
      },
    ],
  },
  {
    id: "p-006",
    slug: "cherry-ripple-basket",
    name: "Cherry Ripple",
    summary: "Burgundy and cream stitches in a small basket bag.",
    description:
      "A structured little basket bag worked in alternating burgundy and cream stitches that ripple around the body, finished with a braided carry handle.",
    details: ["Hand crocheted", "Two-tone stitch pattern", "Braided carry handle", "Open basket shape"],
    price: 84,
    category: "tote",
    colors: ["burgundy-cream"],
    availability: "in-stock",
    images: [
      {
        src: img("burgundy-cream-basket-steps.jpg"),
        alt: "Burgundy and cream two-tone crochet basket bag with a braided handle on stone steps",
        width: 960,
        height: 1280,
        focal: { x: 55, y: 72 },
      },
    ],
    featured: { order: 4, theme: { bg: "#ead6d0", ink: "#3b0f1e", accent: "#6b1631" } },
  },
];
