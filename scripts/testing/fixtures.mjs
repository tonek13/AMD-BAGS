// A small sample dataset for the local Sanity stand-in (scripts/testing/mock-sanity.mjs).
// It deliberately includes the awkward cases the storefront must handle:
//   • a draft-only product            (must never be shown)
//   • a hidden product                (must disappear everywhere)
//   • a sold-out product              (visible, but cannot be added to the bag)
//   • a product with no price         (skipped, never breaks the page)
//   • a draft copy of Shop Settings   (must never replace the published one)

const image = (ref, alt, extra = {}) => ({ _type: "image", _key: ref, alt, asset: { _type: "reference", _ref: ref }, ...extra });
const ref = (id) => ({ _type: "reference", _ref: id });
const swatch = (hex) => ({ _type: "color", hex });
const slug = (current) => ({ _type: "slug", current });

export const collections = [
  { _id: "col-clutches", _type: "collection", name: "Clutches", slug: slug("clutches"), displayOrder: 1 },
  { _id: "col-totes", _type: "collection", name: "Totes & baskets", slug: slug("totes"), displayOrder: 2 },
  { _id: "col-empty", _type: "collection", name: "Empty shelf", slug: slug("empty-shelf"), displayOrder: 3 },
  { _id: "drafts.col-new", _type: "collection", name: "Draft collection", slug: slug("draft-collection"), displayOrder: 4 },
];

export const products = [
  {
    _id: "p-bordeaux",
    _type: "product",
    name: "Bordeaux Clutch",
    slug: slug("bordeaux-clutch"),
    description: "A relaxed, wide clutch in rich burgundy. Dense, chunky stitches give it a sculpted shape.",
    price: 78,
    availability: "available",
    hidden: false,
    featured: true,
    displayOrder: 1,
    collection: ref("col-clutches"),
    colors: [{ _type: "colorOption", _key: "a", name: "Burgundy", swatch: swatch("#6b1631") }],
    images: [
      image("image-stonewall-1280x1149-jpg", "Burgundy clutch on a stone wall", {
        crop: { top: 0.05, bottom: 0.05, left: 0, right: 0 },
        hotspot: { x: 0.11, y: 0.45, width: 0.4, height: 0.4 },
      }),
      image("image-overhead-1280x960-jpg", "The same clutch from above"),
    ],
  },
  {
    _id: "p-apricot",
    _type: "product",
    name: "Apricot Arch",
    slug: slug("apricot-arch-bag"),
    description: "A small top-handle bag with a braided arch handle. Gold-toned rings join the handle.",
    price: 88.5,
    availability: "available",
    featured: true,
    displayOrder: 2,
    collection: ref("col-totes"),
    colors: [
      { _type: "colorOption", _key: "a", name: "Peach", swatch: swatch("#f0b98d") },
      { _type: "colorOption", _key: "b", name: "Burgundy", swatch: swatch("#6b1631") },
    ],
    images: [image("image-peach-960x1280-jpg", "Peach top-handle bag")],
  },
  {
    _id: "p-cloud",
    _type: "product",
    name: "Cloud Clutch",
    slug: slug("cloud-clutch"),
    description: "A soft white clutch.",
    price: 64,
    availability: "sold-out",
    displayOrder: 3,
    collection: ref("col-clutches"),
    colors: [{ _type: "colorOption", _key: "a", name: "White", swatch: swatch("#f7f4ee") }],
    images: [image("image-white-960x1280-jpg", "White clutch with jasmine")],
  },
  {
    _id: "p-hidden",
    _type: "product",
    name: "Secret Bag",
    slug: slug("secret-bag"),
    description: "Hidden from the storefront.",
    price: 99,
    availability: "available",
    hidden: true,
    featured: true,
    displayOrder: 4,
    images: [image("image-black-960x1280-jpg", "Black bag")],
  },
  {
    _id: "drafts.p-draft",
    _type: "product",
    name: "Draft Bag",
    slug: slug("draft-bag"),
    description: "Not published yet.",
    price: 50,
    availability: "available",
    displayOrder: 5,
    images: [image("image-cream-960x1280-jpg", "Cream bag")],
  },
  {
    _id: "p-noprice",
    _type: "product",
    name: "No Price Bag",
    slug: slug("no-price-bag"),
    description: "Published without a price.",
    availability: "available",
    displayOrder: 6,
    images: [image("image-cherry-960x1280-jpg", "Cherry basket")],
  },
];

export const settings = [
  {
    _id: "shopSettings",
    _type: "shopSettings",
    brandName: "Test Shop",
    currency: "EUR",
    whatsappNumber: "+96170123456",
    email: "hello@example.com",
    location: "Beirut, Lebanon",
    socialLinks: [{ _type: "socialLink", _key: "i", platform: "instagram", url: "https://www.instagram.com/testshop/" }],
    heroHeadline: "Made by hand,\nworn every day",
    heroIntro: "Test introduction text.",
    craftHeading: "Slow *stitches* only.",
    craftText: "Test craft statement about hooks and yarn.",
  },
  { _id: "drafts.shopSettings", _type: "shopSettings", brandName: "Draft Name", currency: "GBP", whatsappNumber: "+11111111111" },
];

export const dataset = () => [...collections, ...products, ...settings];
