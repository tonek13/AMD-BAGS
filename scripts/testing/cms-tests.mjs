// End-to-end checks for the connected (Sanity) storefront, run against a local stand-in for the Sanity API.
//
//   npm run test:cms
//
// What it does: starts scripts/testing/mock-sanity.mjs with the sample dataset in fixtures.mjs,
// builds and starts the site against it (into .next-test, so your own .next is untouched),
// then checks:
//   • drafts, hidden products and invalid products never reach the storefront
//   • sold-out products stay visible; filters, featured section and settings come from the data
//   • the signed webhook rejects missing / wrong / malformed signatures and accepts a correct one
//   • published changes appear only after a valid webhook (the cache really is invalidated)
//   • the cart check endpoint reports hidden / draft / sold-out / re-priced bags
//   • the Studio route is separate from the storefront
//   • a missing Sanity configuration fails the build loudly instead of showing sample products
//
// It uses a stand-in for the Sanity API, so it proves OUR code and queries behave. It cannot prove how the real
// Sanity service behaves: after you connect a real project, also run the owner walkthrough in docs/OWNER-GUIDE.md.
import { spawn, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { rmSync } from "node:fs";
import { collections, dataset, products, settings } from "./fixtures.mjs";

const require = createRequire(import.meta.url);
const { encodeSignatureHeader } = require("@sanity/webhook");

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MOCK_PORT = 4010;
const APP_PORT = 3101;
const SECRET = "test-secret-with-enough-length-1234567890";
const APP = `http://localhost:${APP_PORT}`;
const MOCK = `http://localhost:${MOCK_PORT}`;
const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");

const env = {
  ...process.env,
  SHOP_DATA_SOURCE: "sanity",
  NEXT_PUBLIC_SANITY_PROJECT_ID: "testproj",
  NEXT_PUBLIC_SANITY_DATASET: "production",
  SANITY_API_HOST: MOCK,
  SANITY_CDN_BASE_URL: MOCK,
  SANITY_REVALIDATE_SECRET: SECRET,
  NEXT_DIST_DIR: ".next-test",
};

let passed = 0;
const failures = [];
function check(name, ok, detail = "") {
  if (ok) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failures.push(name);
    console.log(`  FAIL  ${name}${detail ? `  — ${detail}` : ""}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const children = [];
function start(args, label) {
  const child = spawn(process.execPath, args, { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
  child.output = "";
  child.stdout.on("data", (d) => (child.output += d));
  child.stderr.on("data", (d) => (child.output += d));
  child.label = label;
  children.push(child);
  return child;
}

async function waitFor(url, label, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.status < 500) return;
    } catch {}
    await sleep(500);
  }
  throw new Error(`${label} did not start`);
}

async function setData(docs) {
  const r = await fetch(`${MOCK}/__admin/dataset`, { method: "POST", body: JSON.stringify(docs) });
  if (!r.ok) throw new Error("could not seed the mock");
}
const queryCount = async () => (await (await fetch(`${MOCK}/__admin/stats`)).json()).queries;
const page = async () => (await fetch(APP + "/")).text();
const sign = async (body, secret = SECRET) => encodeSignatureHeader(body, Date.now(), secret);

async function webhook(payload, header) {
  const body = typeof payload === "string" ? payload : JSON.stringify(payload);
  const headers = { "content-type": "application/json" };
  if (header !== null) headers["sanity-webhook-signature"] = header ?? (await sign(body));
  const r = await fetch(`${APP}/api/revalidate`, { method: "POST", headers, body });
  return { status: r.status, json: await r.json().catch(() => ({})) };
}

async function checkCart(slugs) {
  const r = await fetch(`${APP}/api/catalog/check`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slugs }) });
  return { status: r.status, json: await r.json().catch(() => ({})) };
}

function cleanup() {
  for (const c of children) c.kill();
}
process.on("exit", cleanup);

try {
  // ── 0. a missing configuration must fail loudly ────────────────────────
  console.log("\nMissing configuration");
  {
    const bare = { ...process.env, SHOP_DATA_SOURCE: "sanity", NEXT_PUBLIC_SANITY_PROJECT_ID: "", NEXT_PUBLIC_SANITY_DATASET: "", NEXT_DIST_DIR: ".next-test" };
    const r = spawnSync(process.execPath, [nextBin, "build"], { cwd: root, env: bare, encoding: "utf8" });
    const out = `${r.stdout}${r.stderr}`;
    check("build FAILS without Sanity settings instead of showing sample products", r.status !== 0 && /Sanity is not configured/.test(out), `exit ${r.status}`);
    check("the error names the missing variable", /NEXT_PUBLIC_SANITY_PROJECT_ID is not set/.test(out));
  }

  // ── start the stand-in and build the storefront against it ─────────────
  start([join(root, "scripts/testing/mock-sanity.mjs"), String(MOCK_PORT)], "mock");
  await waitFor(`${MOCK}/__admin/stats`, "mock Sanity");
  await setData(dataset());

  console.log("\nBuilding the connected storefront against the stand-in…");
  rmSync(join(root, ".next-test"), { recursive: true, force: true });
  const build = spawnSync(process.execPath, [nextBin, "build"], { cwd: root, env, encoding: "utf8", timeout: 600000 });
  if (build.status !== 0) {
    console.log(build.stdout, build.stderr);
    throw new Error("build failed");
  }
  start([nextBin, "start", "-p", String(APP_PORT)], "app");
  await waitFor(APP + "/", "storefront");

  // ── A. what the storefront shows ───────────────────────────────────────
  console.log("\nWhat the storefront shows");
  let html = await page();
  for (const name of ["Bordeaux Clutch", "Apricot Arch", "Cloud Clutch"]) check(`published product "${name}" is listed`, html.includes(name));
  check("draft-only product is NOT shown", !html.includes("Draft Bag"));
  check("hidden product is NOT shown", !html.includes("Secret Bag"));
  check("product without a price is skipped, page still renders", !html.includes("No Price Bag") && html.includes("Bordeaux Clutch"));
  check("draft Shop Settings do not replace the published ones", html.includes("Test Shop") && !html.includes("Draft Name"));
  check("draft-only collection is NOT offered as a filter", !html.includes("Draft collection"));
  check("collections with bags appear as filters", html.includes("Clutches") && html.includes("Totes &amp; baskets"));
  check("empty collection is not offered as a filter", !html.includes("Empty shelf"));
  check("colours come from the products", html.includes("Burgundy") && html.includes("Peach") && html.includes("White"));
  check("prices use the currency from Shop Settings", html.includes("€78") && html.includes("€88.50"));
  check("headline and introduction come from Shop Settings", html.includes("Made by hand,") && html.includes("worn every day") && html.includes("Test introduction text."));
  check("craft text comes from Shop Settings", html.includes("Test craft statement about hooks and yarn."));
  check("footer shows contact details and social links", html.includes("hello@example.com") && html.includes("instagram.com/testshop") && html.includes("Beirut, Lebanon"));
  check("featured section lists featured bags only", html.includes('id="featured-bordeaux-clutch"') && html.includes('id="featured-apricot-arch-bag"') && !html.includes("featured-secret-bag") && !html.includes("featured-cloud-clutch"));
  check("sold-out bag stays visible with its label", html.includes("Cloud Clutch") && html.includes("Sold out"));
  check("no demo-mode notice in connected mode", !html.includes("Demo mode"));
  check("the yarn story is present regardless of products", html.includes('id="story"') && html.includes("From a thread"));
  const imageUrl = /\/_next\/image\?url=([^"&]+)/.exec(html);
  const imageResponse = imageUrl ? await fetch(`${APP}/_next/image?url=${imageUrl[1]}&w=640&q=75`) : null;
  check("Sanity photos are served through next/image", !!imageResponse && imageResponse.status === 200 && /image\//.test(imageResponse.headers.get("content-type") ?? ""), imageResponse ? String(imageResponse.status) : "no image url found");

  // ── B. the signed webhook ──────────────────────────────────────────────
  console.log("\nSigned webhook");
  const payload = { _type: "product", _id: "p-bordeaux" };
  const raw = JSON.stringify(payload);
  check("rejects a request with no signature (401)", (await webhook(payload, null)).status === 401);
  check("rejects a signature made with the wrong secret (401)", (await webhook(payload, await sign(raw, "someone-elses-secret-0123456789"))).status === 401);
  check("rejects a malformed signature header (401)", (await webhook(payload, "garbage")).status === 401);
  check("rejects a valid signature over a different body (401)", (await webhook(payload, await sign(JSON.stringify({ _type: "collection" })))).status === 401);
  check("rejects an unsigned non-JSON body without revalidating (401)", (await webhook("not json at all", null)).status === 401);
  const ignored = await webhook({ _type: "somethingElse" });
  check("accepts a correctly signed request for an unrelated type but revalidates nothing (200)", ignored.status === 200 && ignored.json.revalidated === false);
  check("rejects GET requests (405)", (await fetch(`${APP}/api/revalidate`)).status === 405);

  // ── C. caching and revalidation ────────────────────────────────────────
  console.log("\nCaching and revalidation");
  await page();
  const before = await queryCount();
  await page();
  await page();
  check("page views are served from cache (no Sanity queries per visit)", (await queryCount()) === before, `${before} → ${await queryCount()}`);

  const edited = dataset().map((d) => {
    if (d._id === "p-bordeaux") return { ...d, price: 95 };
    if (d._id === "p-apricot") return { ...d, hidden: true };
    if (d._id === "p-cloud") return { ...d, availability: "available" };
    return d;
  });
  edited.push({ ...products[0], _id: "p-newcomer", price: 41, name: "Newcomer Bag", slug: { _type: "slug", current: "newcomer-bag" }, displayOrder: 7, featured: false });
  await setData(edited);
  html = await page();
  check("changes in Sanity are NOT visible before a webhook (cached)", html.includes("€78") && html.includes("Apricot Arch") && !html.includes("Newcomer Bag"));

  const hook = await webhook({ _type: "product", _id: "p-bordeaux" });
  check("a valid webhook is accepted and reports the tags it expired", hook.status === 200 && hook.json.revalidated === true && hook.json.tags?.includes("sanity:product"), JSON.stringify(hook.json));
  html = await page();
  check("price edit shows up after the webhook", html.includes("€95") && !html.includes("€78"));
  check("hiding a product removes it from listings after the webhook", !html.includes("Apricot Arch"));
  check("hiding a product removes it from the featured section", !html.includes("featured-apricot-arch-bag"));
  check("a newly published product appears after the webhook", html.includes("Newcomer Bag"));

  // unpublish: only the draft copy remains
  await setData(edited.map((d) => (d._id === "p-bordeaux" ? { ...d, _id: "drafts.p-bordeaux" } : d)));
  await webhook({ _type: "product", _id: "p-bordeaux" });
  html = await page();
  check("unpublishing a product removes it after the webhook", !html.includes("Bordeaux Clutch"));

  // delete
  await setData(edited.filter((d) => d._id !== "p-bordeaux" && d._id !== "p-newcomer"));
  await webhook({ _type: "product", _id: "p-newcomer" });
  html = await page();
  check("deleting a product removes it after the webhook", !html.includes("Newcomer Bag"));

  // collection rename + settings
  await setData(
    dataset().map((d) => {
      if (d._id === "col-clutches") return { ...d, name: "Evening clutches" };
      if (d._id === "shopSettings") return { ...d, brandName: "Renamed Shop", currency: "USD" };
      return d;
    }),
  );
  await webhook({ _type: "collection", _id: "col-clutches" });
  await webhook({ _type: "shopSettings", _id: "shopSettings" });
  html = await page();
  check("a renamed collection updates after the webhook", html.includes("Evening clutches"));
  check("changed Shop Settings update after the webhook", html.includes("Renamed Shop") && html.includes("$78"));

  // an emptied shop must still render gracefully
  await setData(settings);
  await webhook({ _type: "product", _id: "x" });
  await webhook({ _type: "collection", _id: "x" });
  const emptyResponse = await fetch(APP + "/");
  html = await emptyResponse.text();
  check("a shop with no products renders a friendly empty state (200)", emptyResponse.status === 200 && html.includes("New bags are on their way"), String(emptyResponse.status));
  check("empty shop hides the featured section", !html.includes('id="featured"'));

  // ── D. the cart check ──────────────────────────────────────────────────
  console.log("\nCart check (live price and availability)");
  await setData(dataset());
  const slugs = ["bordeaux-clutch", "apricot-arch-bag", "cloud-clutch", "secret-bag", "draft-bag", "does-not-exist"];
  let result = await checkCart(slugs);
  const bySlug = Object.fromEntries((result.json.items ?? []).map((i) => [i.slug, i]));
  check("answers 200 with one entry per slug", result.status === 200 && result.json.items?.length === slugs.length);
  check("returns the current price and name", bySlug["bordeaux-clutch"]?.found && bySlug["bordeaux-clutch"].price === 78 && bySlug["apricot-arch-bag"]?.price === 88.5);
  check("reports sold-out bags as sold out", bySlug["cloud-clutch"]?.found && bySlug["cloud-clutch"].availability === "sold-out");
  check("treats hidden, draft-only and unknown bags as removed", !bySlug["secret-bag"].found && !bySlug["draft-bag"].found && !bySlug["does-not-exist"].found);
  await setData(dataset().map((d) => (d._id === "p-bordeaux" ? { ...d, price: 120 } : d)));
  result = await checkCart(["bordeaux-clutch"]);
  check("sees a price change immediately (no cache, no webhook needed)", result.json.items?.[0]?.price === 120);
  const bad = await fetch(`${APP}/api/catalog/check`, { method: "POST", headers: { "content-type": "application/json" }, body: "nope" });
  check("rejects a body that is not JSON (400)", bad.status === 400);
  check("rejects a body without a slug list (400)", (await checkCart("bordeaux-clutch")).status === 400);
  check("rejects more than 50 slugs (400)", (await checkCart(Array.from({ length: 51 }, (_, i) => `s${i}`))).status === 400);

  // ── E. the Studio is separate from the storefront ──────────────────────
  console.log("\nStudio route");
  const studio = await fetch(`${APP}/studio`);
  const studioHtml = await studio.text();
  check("/studio responds (200)", studio.status === 200);
  check("/studio does not include the storefront (no header, cart, skip link or motion script)", !/Open bag|Skip to content|prefers-reduced-motion|motion-ready/.test(studioHtml));
  check("/studio does not load the storefront fonts or smooth scrolling styles", !/lenis|fraunces/i.test(studioHtml));
  check("/studio is kept out of search results (noindex)", /noindex/i.test(studioHtml));
  check("a Studio sub-route also works (/studio/structure)", (await fetch(`${APP}/studio/structure`)).status === 200);
} catch (error) {
  failures.push(`runner error: ${error.message}`);
  console.error(error);
} finally {
  cleanup();
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log("Failed:\n - " + failures.join("\n - "));
  process.exit(1);
}
process.exit(0);
