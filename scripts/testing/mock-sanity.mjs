// A stand-in for the Sanity query API, for LOCAL TESTING of the connected storefront without credentials.
//
//   node scripts/testing/mock-sanity.mjs [port]      (default port 4010)
//
// It runs the shop's real GROQ queries (with the `groq-js` evaluator that ships with Sanity) against an
// in-memory dataset, and mimics the "published" perspective (draft documents are never returned).
// It also serves stand-in product photos at /images/<project>/<dataset>/…, and a small admin API:
//
//   POST /__admin/dataset   body: JSON array of documents   → replaces the dataset
//   GET  /__admin/stats                                      → { queries: number }
//
// Point the storefront at it with SANITY_API_HOST and SANITY_CDN_BASE_URL (see scripts/testing/cms-tests.mjs).
// This is a test tool: it is not used by the website, and it does not replace verifying against a real project.
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { parse, evaluate } = require("groq-js");

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const port = Number(process.argv[2] ?? 4010);

let dataset = [];
let queries = 0;

/** Stand-in photos: the hash part of an image reference picks a file from public/images/products. */
const PHOTOS = {
  stonewall: "burgundy-clutch-stone-wall.jpg",
  overhead: "burgundy-clutch-overhead.jpg",
  peach: "peach-arch-bag-denim.jpg",
  black: "black-nest-bag-satin.jpg",
  cream: "cream-crescent-bag-tassel.jpg",
  white: "white-clutch-jasmine.jpg",
  cherry: "burgundy-cream-basket-steps.jpg",
};

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function send(res, status, body, headers = {}) {
  const payload = typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, { "Content-Type": typeof body === "object" && !Buffer.isBuffer(body) ? "application/json" : "text/plain", ...headers });
  res.end(payload);
}

async function runQuery(query, params, perspective) {
  const visible = perspective === "published" ? dataset.filter((d) => !String(d._id).startsWith("drafts.")) : dataset;
  const tree = parse(query, { params });
  const value = await evaluate(tree, { dataset: visible, params });
  return value.get();
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);
  try {
    if (url.pathname === "/__admin/dataset" && req.method === "POST") {
      dataset = JSON.parse(await readBody(req));
      return send(res, 200, { ok: true, documents: dataset.length });
    }
    if (url.pathname === "/__admin/stats") return send(res, 200, { queries });

    const queryMatch = /^\/v[\d-]+\/data\/query\/([^/]+)$/.exec(url.pathname);
    if (queryMatch) {
      queries++;
      let query = url.searchParams.get("query");
      let perspective = url.searchParams.get("perspective") ?? undefined;
      const params = {};
      for (const [key, value] of url.searchParams) if (key.startsWith("$")) params[key.slice(1)] = JSON.parse(value);
      if (req.method === "POST") {
        const body = JSON.parse(await readBody(req));
        query = body.query;
        Object.assign(params, body.params ?? {});
        perspective = body.perspective ?? perspective;
      }
      if (!query) return send(res, 400, { error: { description: "missing query" } });
      const result = await runQuery(query, params, perspective);
      return send(res, 200, { ms: 1, query, result });
    }

    const imageMatch = /^\/images\/[^/]+\/[^/]+\/([A-Za-z0-9]+)-\d+x\d+\.[a-z]+$/.exec(url.pathname);
    if (imageMatch) {
      const file = join(root, "public", "images", "products", PHOTOS[imageMatch[1]] ?? "");
      if (!existsSync(file)) return send(res, 404, "no such stand-in photo");
      return send(res, 200, readFileSync(file), { "Content-Type": "image/jpeg", "Cache-Control": "max-age=60" });
    }

    send(res, 404, "not found");
  } catch (error) {
    console.error("[mock-sanity]", error);
    send(res, 500, { error: { description: String(error?.message ?? error) } });
  }
});

server.listen(port, () => console.log(`[mock-sanity] listening on http://localhost:${port}`));
