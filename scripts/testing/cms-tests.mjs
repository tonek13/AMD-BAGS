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
//   • collections switched on as "own section" get a shelf, a page and a menu entry (and only those)
//   • the cart check endpoint reports hidden / draft / sold-out / re-priced bags
//   • orders are validated and priced on the server, then emailed to the owner (through a stand-in for Resend)
//   • the Studio route is separate from the storefront
//   • a missing Sanity configuration fails the build loudly instead of showing sample products
//
// It uses a stand-in for the Sanity API, so it proves OUR code and queries behave. It cannot prove how the real
// Sanity service behaves: after you connect a real project, also run the owner walkthrough in docs/OWNER-GUIDE.md.
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { rmSync } from "node:fs";
import { dataset, products, settings } from "./fixtures.mjs";

const require = createRequire(import.meta.url);
const { encodeSignatureHeader } = require("@sanity/webhook");

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MOCK_PORT = 4010;
const APP_PORT = 3101;
const RESEND_PORT = 4011;
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
  // Orders are emailed through Resend; the tests point it at a stand-in server (below).
  // The order limit is 8 per address per 10 minutes by default; these tests place more than that.
  ORDER_RATE_LIMIT_MAX: "40",
  RESEND_API_KEY: "re_test_key",
  ORDER_EMAIL_TO: "owner@example.com",
  RESEND_BASE_URL: `http://localhost:${RESEND_PORT}`,
};

// Stand-in for api.resend.com: records every email it is asked to send, or refuses them on demand.
const sentEmails = [];
let resendRefuses = false;
const resendMock = createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    res.setHeader("content-type", "application/json");
    if (resendRefuses) {
      res.statusCode = 422;
      res.end(JSON.stringify({ name: "validation_error", message: "stand-in refusal", statusCode: 422 }));
      return;
    }
    sentEmails.push({ auth: req.headers.authorization, idempotencyKey: req.headers["idempotency-key"], body: JSON.parse(body) });
    res.end(JSON.stringify({ id: `mock-${sentEmails.length}` }));
  });
});
resendMock.listen(RESEND_PORT);

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

async function placeOrder(overrides = {}) {
  const order = {
    orderId: randomUUID(),
    items: [
      { slug: "bordeaux-clutch", quantity: 2 },
      { slug: "apricot-arch-bag", quantity: 1 },
    ],
    customer: { name: "Jane <b>Doe</b>", phone: "+961 70 123 456", city: "Beirut", address: "Hamra Street, building 5, 3rd floor", notes: "" },
    expectedTotalCents: 24450,
    ...overrides,
  };
  const r = await fetch(`${APP}/api/orders`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(order) });
  return { status: r.status, json: await r.json().catch(() => ({})), order };
}

function cleanup() {
  for (const c of children) c.kill();
  resendMock.close();
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

  // ── D2. collections with their own section ─────────────────────────────
  console.log("\nSections (collections shown as their own shelf, page and menu entry)");
  await setData(dataset());
  await webhook({ _type: "collection", _id: "col-clutches" });
  await webhook({ _type: "product", _id: "p-bordeaux" });
  await webhook({ _type: "shopSettings", _id: "shopSettings" });
  html = await page();
  check("a collection with the switch on gets a shelf that links to its own page", html.includes('href="/collections/clutches"') && html.includes("See the whole shelf"));
  check('bags that are not in a section go on a final "More bags" shelf', html.includes("More bags") && html.includes("Apricot Arch"));
  check("a collection with the switch off gets no section or page link", !html.includes("/collections/totes"));
  check("an enabled collection without bags gets no section", !html.includes("/collections/empty-shelf"));
  check("a draft collection never gets a section", !html.includes("/collections/draft-collection"));
  check("the menu lists the sections", html.includes("Shop by shelf"));
  check('the "customize your bag" block shows the contact email from Shop Settings', html.includes("Your bag, ") && html.includes("mailto:hello@example.com"));
  const clutchPage = await fetch(`${APP}/collections/clutches`);
  const clutchHtml = await clutchPage.text();
  check("the section page exists (200)", clutchPage.status === 200, String(clutchPage.status));
  // Every page also carries all bags in its script data (the shop context), so look at the visible markup only.
  const visible = (markup) => markup.replace(/<script[\s\S]*?<\/script>/g, "");
  const clutchVisible = visible(clutchHtml);
  check("the section page lists its own bags only", clutchVisible.includes("Bordeaux Clutch") && clutchVisible.includes("Cloud Clutch") && !clutchVisible.includes("Apricot Arch"));
  check("the section page has the collection name as its heading", /<h1[^>]*>[^<]*Clutches/.test(clutchVisible));
  // A shelf that is not in the build is rendered on its first visit. Its first answer is already on the wire
  // (200) when the page finds out there is no such shelf, so it shows the "not found" page; the finished
  // result is then cached with the real 404 status for every later visit.
  for (const missing of ["totes", "empty-shelf", "draft-collection", "no-such-shelf"]) {
    const first = visible(await (await fetch(`${APP}/collections/${missing}`)).text());
    check(`/collections/${missing} never shows a shelf`, !first.includes("The shelf") && !first.includes("Bordeaux Clutch"));
    const again = await fetch(`${APP}/collections/${missing}`);
    check(`/collections/${missing} is a 404 from then on`, again.status === 404, `status ${again.status}`);
  }
  await setData(dataset().map((d) => (d._id === "col-clutches" ? { ...d, showAsSection: false } : d)));
  await webhook({ _type: "collection", _id: "col-clutches" });
  html = await page();
  check("switching the section off removes its page link after the webhook", !html.includes('href="/collections/clutches"'));
  const switchedOff = visible(await (await fetch(`${APP}/collections/clutches`)).text());
  check("...and its page stops showing the shelf", !switchedOff.includes("The shelf") && !switchedOff.includes("Bordeaux Clutch"));
  check("...and is a 404 from then on", (await fetch(`${APP}/collections/clutches`)).status === 404);
  await setData(dataset());
  await webhook({ _type: "collection", _id: "col-clutches" });

  // ── D3. placing an order ───────────────────────────────────────────────
  console.log("\nOrders (checked on the server, then emailed to the owner)");
  check("GET /api/orders is not allowed (405)", (await fetch(`${APP}/api/orders`)).status === 405);
  const notJson = await fetch(`${APP}/api/orders`, { method: "POST", headers: { "content-type": "application/json" }, body: "nope" });
  check("rejects a body that is not JSON (400)", notJson.status === 400);
  let order = await placeOrder({ customer: { name: "", phone: "abc", city: "", address: "x", notes: "" } });
  check(
    "rejects missing or invalid details (400) and says which fields",
    order.status === 400 && order.json.fields?.name && order.json.fields?.phone && order.json.fields?.city && order.json.fields?.address,
    JSON.stringify(order.json),
  );
  order = await placeOrder({ items: [] });
  check("rejects an empty bag (400)", order.status === 400);
  order = await placeOrder({ items: [{ slug: "bordeaux-clutch", quantity: 0 }] });
  check("rejects a quantity of zero (400)", order.status === 400);
  order = await placeOrder({ orderId: "not-a-uuid" });
  check("rejects a missing order reference (400)", order.status === 400);
  check("nothing was emailed for any of the rejected orders", sentEmails.length === 0);

  order = await placeOrder();
  check("a valid order is accepted (200) and gets a reference", order.status === 200 && order.json.ok === true && /^[0-9A-F]{8}$/.test(order.json.reference ?? ""), JSON.stringify(order.json));
  const mail = sentEmails[0];
  check(
    "exactly one email was sent, to the owner, signed with the Resend key",
    sentEmails.length === 1 && mail?.auth === "Bearer re_test_key" && JSON.stringify(mail.body.to) === JSON.stringify(["owner@example.com"]),
  );
  check("the email subject has the reference, bag count, total and customer", mail?.body.subject === `New order ${order.json.reference} · 3 bags · €244.50 · Jane <b>Doe</b>`, mail?.body.subject);
  check(
    "the email lists the bags with live prices and the total to collect",
    /2 × Bordeaux Clutch @ €78\.00 = €156\.00/.test(mail?.body.text) && /1 × Apricot Arch @ €88\.50/.test(mail.body.text) && /TOTAL TO COLLECT: €244\.50/.test(mail.body.text),
  );
  check(
    "the email carries the delivery details and says cash on delivery",
    /Phone: \+961 70 123 456/.test(mail?.body.text) && /Address: Hamra Street/.test(mail.body.text) && /cash on delivery/i.test(mail.body.text),
  );
  check("customer text is escaped in the HTML email", !/<b>Doe<\/b>/.test(mail?.body.html) && mail.body.html.includes("&lt;b&gt;Doe&lt;/b&gt;"));
  check("the order reference is sent as the idempotency key (a retry cannot email twice)", mail?.idempotencyKey?.startsWith("order-"));

  const sentBefore = sentEmails.length;
  order = await placeOrder({ items: [{ slug: "cloud-clutch", quantity: 1 }], expectedTotalCents: 6400 });
  check("a sold-out bag cannot be ordered (409)", order.status === 409 && order.json.code === "unavailable");
  order = await placeOrder({ items: [{ slug: "secret-bag", quantity: 1 }], expectedTotalCents: 9900 });
  check("a hidden bag cannot be ordered (409)", order.status === 409 && order.json.code === "unavailable");
  order = await placeOrder({ items: [{ slug: "does-not-exist", quantity: 1 }], expectedTotalCents: 100 });
  check("an unknown bag cannot be ordered (409)", order.status === 409 && order.json.code === "unavailable");
  order = await placeOrder({ expectedTotalCents: 100 });
  check("a total that no longer matches the live prices is refused (409)", order.status === 409 && order.json.code === "changed");
  await setData(dataset().map((d) => (d._id === "p-bordeaux" ? { ...d, price: 120 } : d)));
  order = await placeOrder();
  check("a price change since the customer looked is refused, never silently re-priced (409)", order.status === 409 && order.json.code === "changed");
  await setData(dataset());
  check("no email went out for any refused order", sentEmails.length === sentBefore);

  order = await placeOrder({ website: "http://spam.example" });
  check("a filled-in honeypot looks like success but sends nothing", order.status === 200 && sentEmails.length === sentBefore);

  resendRefuses = true;
  order = await placeOrder();
  check("when the email service refuses, the customer is told it failed (502), not that it worked", order.status === 502 && order.json.code === "email-failed", JSON.stringify(order.json));
  resendRefuses = false;

  // ── D4. delivery fee, sale prices and offers ───────────────────────────
  console.log("\nDelivery fee, sale and offers");
  await setData(dataset());
  for (const type of ["saleSection", "offersSection", "shopSettings", "product"]) await webhook({ _type: type, _id: type });
  html = await page();
  const homeVisible = visible(html);
  check("the Sale and Offers shelves appear on the homepage and link to their pages", html.includes('href="/sale"') && html.includes('href="/offers"'));
  check("a bag on sale shows its previous price struck through and the new price", /<s[^>]*>[^<]*€100/.test(homeVisible) && homeVisible.includes("€70"));
  check("an offer shows its name and rule", homeVisible.includes("Pouch trio") && homeVisible.includes("Buy 2, get 1 free"));
  const salePage = await fetch(`${APP}/sale`);
  const saleVisible = visible(await salePage.text());
  check("the Sale page lists the bag on sale only", salePage.status === 200 && saleVisible.includes("Sunset Tote") && !saleVisible.includes("Peach Pouch"));
  const offersPage = await fetch(`${APP}/offers`);
  const offersVisible = visible(await offersPage.text());
  check("the Offers page lists the bags of the offer", offersPage.status === 200 && offersVisible.includes("Pouch trio") && offersVisible.includes("Mint Pouch") && !offersVisible.includes("Sunset Tote"));

  const live = await checkCart(["sunset-tote", "peach-pouch"]);
  check("the cart check returns the sale price, the offers and the delivery fee", live.json.items?.[0]?.price === 70 && live.json.offers?.[0]?.title === "Pouch trio" && live.json.offers[0].slugs.length === 3 && live.json.deliveryFee === 0, JSON.stringify(live.json));

  order = await placeOrder({ items: [{ slug: "sunset-tote", quantity: 1 }], expectedTotalCents: 7000 });
  check("a bag on sale is charged the sale price", order.status === 200 && /1 × Sunset Tote @ €70\.00/.test(sentEmails.at(-1)?.body.text ?? ""), JSON.stringify(order.json));

  order = await placeOrder({
    items: [
      { slug: "peach-pouch", quantity: 1 },
      { slug: "plum-pouch", quantity: 1 },
      { slug: "mint-pouch", quantity: 1 },
    ],
    expectedTotalCents: 9000,
  });
  const offerMail = sentEmails.at(-1)?.body.text ?? "";
  check("buy 2, get 1 free: the cheapest of three offer bags is free", order.status === 200 && /Offer – Pouch trio \(1 free\): -€30\.00/.test(offerMail) && /TOTAL TO COLLECT: €90\.00/.test(offerMail), JSON.stringify(order.json));
  order = await placeOrder({
    items: [
      { slug: "peach-pouch", quantity: 1 },
      { slug: "plum-pouch", quantity: 1 },
    ],
    expectedTotalCents: 7000,
  });
  check("two offer bags are not enough: no discount yet", order.status === 200 && !/Offer –/.test(sentEmails.at(-1)?.body.text ?? ""));
  order = await placeOrder({
    items: [
      { slug: "peach-pouch", quantity: 1 },
      { slug: "plum-pouch", quantity: 1 },
      { slug: "mint-pouch", quantity: 1 },
    ],
    expectedTotalCents: 12000,
  });
  check("an order that ignores the offer total is refused as changed (409)", order.status === 409 && order.json.code === "changed");

  await setData(dataset().map((d) => (d._id === "shopSettings" ? { ...d, deliveryFee: 4.5 } : d)));
  order = await placeOrder({ items: [{ slug: "sunset-tote", quantity: 1 }], expectedTotalCents: 7450 });
  const feeMail = sentEmails.at(-1)?.body.text ?? "";
  check("the delivery fee is added to the total", order.status === 200 && /Delivery: €4\.50/.test(feeMail) && /TOTAL TO COLLECT: €74\.50/.test(feeMail), JSON.stringify(order.json));
  order = await placeOrder({ items: [{ slug: "sunset-tote", quantity: 1 }], expectedTotalCents: 7000 });
  check("a total without the delivery fee is refused as changed (409)", order.status === 409 && order.json.code === "changed");
  check("the cart check reports the delivery fee", (await checkCart(["sunset-tote"])).json.deliveryFee === 4.5);

  // switching the sale off: prices return to normal and its shelf and page empty out
  await setData(dataset().map((d) => (d._id === "saleSection" ? { ...d, show: false } : d)));
  await webhook({ _type: "saleSection", _id: "saleSection" });
  order = await placeOrder({ items: [{ slug: "sunset-tote", quantity: 1 }], expectedTotalCents: 10000 });
  check("with the sale switched off the normal price is charged", order.status === 200 && /Sunset Tote @ €100\.00/.test(sentEmails.at(-1)?.body.text ?? ""), JSON.stringify(order.json));
  html = await page();
  check("with the sale switched off its shelf and prices disappear", !html.includes('href="/sale"') && !/<s[^>]*>[^<]*€100/.test(visible(html)));
  const saleOff = visible(await (await fetch(`${APP}/sale`)).text());
  check("the Sale page then says there is no sale (and is not a dead end)", saleOff.includes("no sale on right now") && !saleOff.includes("Sunset Tote"));
  await setData(dataset());
  await webhook({ _type: "saleSection", _id: "saleSection" });
  await webhook({ _type: "shopSettings", _id: "shopSettings" });
  check("switching the sale back on restores its page", visible(await (await fetch(`${APP}/sale`)).text()).includes("Sunset Tote"));

  let limited = false;
  for (let i = 0; i < 50 && !limited; i++) limited = (await placeOrder()).status === 429;
  check("too many orders from one address are slowed down (429)", limited);

  // ── D5. security headers and request checks ────────────────────────────
  console.log("\nSecurity headers and request checks");
  const header = (response, name) => response.headers.get(name) ?? "";
  const shopResponse = await fetch(`${APP}/`);
  const csp = header(shopResponse, "content-security-policy");
  check(
    "the shop sends a Content Security Policy: own scripts only, no plugins, no framing, forms stay on the site",
    /default-src 'self'/.test(csp) && /object-src 'none'/.test(csp) && /frame-ancestors 'none'/.test(csp) && /form-action 'self'/.test(csp) && /base-uri 'self'/.test(csp) && !/script-src[^;]*https?:/.test(csp) && /upgrade-insecure-requests/.test(csp),
    csp,
  );
  check("the shop sends nosniff, a referrer policy, HSTS and a permissions policy", header(shopResponse, "x-content-type-options") === "nosniff" && /strict-origin/.test(header(shopResponse, "referrer-policy")) && /max-age=\d{7,}/.test(header(shopResponse, "strict-transport-security")) && /camera=\(\)/.test(header(shopResponse, "permissions-policy")));
  check("the shop cannot be framed and isolates its window", header(shopResponse, "x-frame-options") === "DENY" && header(shopResponse, "cross-origin-opener-policy") === "same-origin");
  check("the framework is not announced (no X-Powered-By)", !shopResponse.headers.has("x-powered-by"));
  check("section pages carry the same policy", /default-src 'self'/.test(header(await fetch(`${APP}/sale`), "content-security-policy")));
  const studioResponse = await fetch(`${APP}/studio`);
  const studioCsp = header(studioResponse, "content-security-policy");
  check("the Studio cannot be framed by other sites and is kept out of search", studioCsp === "frame-ancestors 'self'" && header(studioResponse, "x-frame-options") === "SAMEORIGIN" && /noindex/.test(header(studioResponse, "x-robots-tag")));
  check("the Studio is not given the shop's strict policy (it needs Sanity's own scripts)", !/default-src/.test(studioCsp) && !header(studioResponse, "cross-origin-opener-policy"));
  const apiResponse = await fetch(`${APP}/api/orders`);
  check("API answers carry the protections too", header(apiResponse, "x-content-type-options") === "nosniff" && /default-src 'self'/.test(header(apiResponse, "content-security-policy")));

  const post = (path, headers, body = "{}") => fetch(`${APP}${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body });
  check("an order sent by another website is refused (cross-site, 403)", (await post("/api/orders", { "sec-fetch-site": "cross-site" })).status === 403);
  check("an order from a page on another address is refused (Origin mismatch, 403)", (await post("/api/orders", { origin: "https://evil.example" })).status === 403);
  check("the shop's own pages are accepted (Origin matches)", (await post("/api/orders", { origin: APP, "sec-fetch-site": "same-origin" })).status === 400);
  check("a plain-text body, which another site can send, is refused (415)", (await post("/api/orders", { "content-type": "text/plain" })).status === 415);
  check("an enormous body is refused before it is read (413)", (await post("/api/orders", {}, JSON.stringify({ filler: "x".repeat(40_000) }))).status === 413);
  check("the cart check refuses other websites too (403)", (await post("/api/catalog/check", { origin: "https://evil.example" }, JSON.stringify({ slugs: [] }))).status === 403);

  // the cart check reads live shop data, so it is limited per visitor
  let checkLimited = null;
  for (let i = 0; i < 90 && !checkLimited; i++) {
    const r = await post("/api/catalog/check", {}, JSON.stringify({ slugs: ["bordeaux-clutch"] }));
    if (r.status === 429) checkLimited = r;
  }
  check("the cart check slows down a visitor who hammers it (429 with Retry-After)", !!checkLimited && header(checkLimited, "retry-after") === "60");

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
