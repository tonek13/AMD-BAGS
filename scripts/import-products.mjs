// OPTIONAL one-time import of the current bags into Sanity, as DRAFTS for the owner to review.
//
//   npm run import:products                       dry run: shows what would be created, writes nothing
//   npm run import:products -- --apply            uploads the photos and creates the DRAFT documents
//   npm run import:products -- --apply --with-sample-prices
//                                                 also fills in the design-review sample prices
//
// Safe by design:
//   • Everything is created as a DRAFT ("drafts." ids). Nothing is published, so nothing appears on the
//     website until the owner opens each item in the Studio and presses Publish.
//   • Prices are left EMPTY unless you pass --with-sample-prices, because the prices in the design review were
//     placeholders. (A product cannot be published without a price, so the owner has to set the real one.)
//   • Existing documents are never overwritten: anything already in Sanity with the same slug is skipped.
//   • Nothing is uploaded without --apply.
//
// Needs in .env.local: NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, SANITY_API_WRITE_TOKEN
// (a token with the Editor role; create it at sanity.io/manage → API → Tokens, and keep it on your own computer).
//
// The bags come from scripts/seed/products.json. Several photos of the same bag are listed under that one bag,
// so they import as one product with an ordered gallery (the first photo is the cover).
import { createReadStream, existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { createClient } from "@sanity/client";

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const WITH_PRICES = args.has("--with-sample-prices");

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim();
const token = process.env.SANITY_API_WRITE_TOKEN?.trim();
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION?.trim() || "2025-02-19";

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

if (!projectId || !dataset) fail("Set NEXT_PUBLIC_SANITY_PROJECT_ID and NEXT_PUBLIC_SANITY_DATASET in .env.local first (run: npm run check:env).");
if (APPLY && !token) fail("--apply needs SANITY_API_WRITE_TOKEN in .env.local (a token with the Editor role).");

const seed = JSON.parse(readFileSync("scripts/seed/products.json", "utf8"));
const apiHost = process.env.SANITY_API_HOST?.trim(); // testing only (scripts/testing/mock-sanity.mjs)
const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn: false,
  perspective: "raw",
  ...(apiHost ? { apiHost, useProjectHostname: false } : {}),
});

// ── helpers ────────────────────────────────────────────────────────────────
const key = (...parts) => parts.join("-").replace(/[^a-z0-9-]/gi, "").slice(0, 40);

/** The value the Studio's colour picker stores (the website only reads `hex`). */
function colorValue(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn), d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) h = max === rn ? ((gn - bn) / d) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  h = (h * 60 + 360) % 360;
  const sv = max === 0 ? 0 : d / max;
  return {
    _type: "color",
    hex,
    alpha: 1,
    hsl: { _type: "hslaColor", h, s, l, a: 1 },
    hsv: { _type: "hsvaColor", h, s: sv, v: max, a: 1 },
    rgb: { _type: "rgbaColor", r, g, b, a: 1 },
  };
}

/** Ids of every document (draft or published) of this type with this slug. */
async function existingBySlug(type, slug) {
  const rows = await client.fetch(`*[_type == $type && slug.current == $slug]{_id}`, { type, slug });
  return rows.map((r) => r._id);
}

const uploaded = new Map();
async function uploadPhoto(file) {
  const path = join("public", file);
  if (!existsSync(path)) fail(`Photo not found: ${path}`);
  if (!APPLY) return `(asset of ${basename(path)})`;
  if (uploaded.has(path)) return uploaded.get(path);
  const asset = await client.assets.upload("image", createReadStream(path), { filename: basename(path) });
  uploaded.set(path, asset._id);
  console.log(`    uploaded ${basename(path)}`);
  return asset._id;
}

async function createDraft(doc) {
  if (APPLY) await client.createIfNotExists(doc);
}

// ── plan ───────────────────────────────────────────────────────────────────
console.log(`${APPLY ? "IMPORTING" : "DRY RUN (nothing will be written)"} into project ${projectId} / dataset ${dataset}\n`);
if (!APPLY && !token) console.log("(No write token set: the dry run only reads.)\n");

const summary = { created: [], skipped: [] };
/** Collection slug → how products should reference it. */
const collectionRefs = new Map();

/**
 * A collection that exists only as a draft cannot be referenced strongly (Sanity refuses it), so products
 * point at it with a reference that is weak until published: the same kind the Studio itself creates. When the
 * owner publishes the collection and then the product, the Studio turns it into a normal reference.
 */
function collectionReference(slug) {
  const ref = collectionRefs.get(slug) ?? { id: `import-collection-${slug}`, published: false };
  return ref.published
    ? { _type: "reference", _ref: ref.id }
    : { _type: "reference", _ref: ref.id, _weak: true, _strengthenOnPublish: { type: "collection" } };
}

console.log("Collections");
for (const c of seed.collections) {
  const found = await existingBySlug("collection", c.slug);
  if (found.length > 0) {
    collectionRefs.set(c.slug, { id: found[0].replace(/^drafts./, ""), published: found.some((id) => !id.startsWith("drafts.")) });
    summary.skipped.push(`collection "${c.name}" already exists (${found.join(", ")})`);
    console.log(`  skip  ${c.name}: already in Sanity`);
    continue;
  }
  collectionRefs.set(c.slug, { id: `import-collection-${c.slug}`, published: false });
  await createDraft({
    _id: `drafts.import-collection-${c.slug}`,
    _type: "collection",
    name: c.name,
    slug: { _type: "slug", current: c.slug },
    displayOrder: c.displayOrder,
  });
  summary.created.push(`collection "${c.name}"`);
  console.log(`  draft ${c.name}`);
}

console.log("\nProducts");
for (const p of seed.products) {
  const found = await existingBySlug("product", p.slug);
  if (found.length > 0) {
    summary.skipped.push(`product "${p.name}" already exists (${found.join(", ")})`);
    console.log(`  skip  ${p.name}: already in Sanity`);
    continue;
  }

  console.log(`  draft ${p.name}  (${p.photos.length} photo${p.photos.length === 1 ? "" : "s"}${WITH_PRICES ? `, sample price ${p.samplePrice}` : ", no price"})`);
  const images = [];
  for (const [i, photo] of p.photos.entries()) {
    const assetId = await uploadPhoto(photo.file);
    images.push({
      _type: "image",
      _key: key("photo", p.slug, i),
      alt: photo.alt,
      asset: { _type: "reference", _ref: assetId },
      ...(photo.hotspot ? { hotspot: { _type: "sanity.imageHotspot", x: photo.hotspot.x, y: photo.hotspot.y, width: 0.5, height: 0.5 } } : {}),
    });
  }

  await createDraft({
    _id: `drafts.import-product-${p.slug}`,
    _type: "product",
    name: p.name,
    slug: { _type: "slug", current: p.slug },
    description: p.description,
    ...(WITH_PRICES ? { price: p.samplePrice } : {}),
    availability: "available",
    hidden: false,
    featured: p.featured,
    displayOrder: p.displayOrder,
    collection: collectionReference(p.collection),
    colors: p.colors.map((c, i) => ({
      _type: "colorOption",
      _key: key("color", p.slug, i),
      name: c.name,
      swatch: colorValue(c.hex),
      ...(c.hex2 ? { secondarySwatch: colorValue(c.hex2) } : {}),
    })),
    images,
  });
  summary.created.push(`product "${p.name}"`);
}

console.log("\nShop Settings");
const settingsExists = await client.fetch(`count(*[_id in ["shopSettings", "drafts.shopSettings"]])`);
if (settingsExists > 0) {
  summary.skipped.push("Shop Settings already exist");
  console.log("  skip  already in Sanity");
} else {
  await createDraft({
    _id: "drafts.shopSettings",
    _type: "shopSettings",
    brandName: "MaisonHook",
    currency: "USD",
    whatsappNumber: "+961 81 616 199",
  });
  summary.created.push("Shop Settings (brand name, currency, WhatsApp number)");
  console.log("  draft brand name, currency (sample: USD) and the WhatsApp number given for the design review");
}

console.log(`\n${APPLY ? "Created" : "Would create"}:`);
for (const line of summary.created) console.log(`  + ${line}`);
if (summary.skipped.length) {
  console.log("Skipped:");
  for (const line of summary.skipped) console.log(`  - ${line}`);
}
console.log(
  APPLY
    ? "\nDone. Everything is a DRAFT: open the Studio (/studio), review each item, publish the Collections first, then the Products and Shop Settings."
    : "\nThis was a dry run. Run again with --apply to create the drafts.",
);
