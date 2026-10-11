// Cuts the real Bordeaux Clutch out of its photo for the scroll-story illustration.
//
//   node scripts/trace-bag.mjs            → writes src/components/story/bagTrace.generated.ts
//                                           + public/images/story/bag-body.webp and bag-arch.webp
//   node scripts/trace-bag.mjs --debug    → also writes scripts/.trace-debug.png (layers on ivory)
//
// What it extracts from public/images/products/burgundy-clutch-stone-wall.jpg:
//   • the exact silhouette (wine-red pixels, gaps closed, traced radially from the centre)
//   • a soft-edged cutout of the bag, split in two layers: the BODY, and the braided ARCH plus the
//     handle opening. The layers overlap, so stacked they are the untouched photograph; the story
//     builds the body row by row, then works the arch and the opening in.
// The handle opening and the braided top ridge are fixed polylines read off the photo
// (coordinates are in the 2× enlarged crop used while tracing: crop = photo[140..840, 300..770] × 2).
// Everything is mapped into the 1000 × 1000 viewBox used by the illustration.
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const SRC = "public/images/products/burgundy-clutch-stone-wall.jpg";
const OUT = "src/components/story/bagTrace.generated.ts";
const IMG_DIR = "public/images/story";
const DEBUG = process.argv.includes("--debug");

const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;

// ── 1. wine-red mask ───────────────────────────────────────────────────────
// Stone is tan (g ≈ 0.65 r), denim is blue (b > r); wine-red has very low g and moderate b.
const isWine = (i) => {
  const r = data[i * 3];
  const g = data[i * 3 + 1];
  const b = data[i * 3 + 2];
  return r > 18 && g < 0.5 * r && b < 0.78 * r && r > b;
};
let mask = new Uint8Array(W * H);
for (let y = 280; y < 800; y++) {
  for (let x = 100; x < 900; x++) {
    const i = y * W + x;
    mask[i] = isWine(i) ? 1 : 0;
  }
}

// ── 2. morphology: close the gaps between stitches ─────────────────────────
function boxFilter(src, radius, mode) {
  // separable running max (dilate) / min (erode)
  const tmp = new Uint8Array(W * H);
  const out = new Uint8Array(W * H);
  const pick = mode === "max" ? Math.max : Math.min;
  const init = mode === "max" ? 0 : 1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let v = init;
      for (let k = -radius; k <= radius; k++) {
        const xx = x + k;
        v = pick(v, xx < 0 || xx >= W ? 0 : src[y * W + xx]);
      }
      tmp[y * W + x] = v;
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let v = init;
      for (let k = -radius; k <= radius; k++) {
        const yy = y + k;
        v = pick(v, yy < 0 || yy >= H ? 0 : tmp[yy * W + x]);
      }
      out[y * W + x] = v;
    }
  }
  return out;
}
mask = boxFilter(boxFilter(mask, 9, "max"), 9, "min");

// largest connected component
const label = new Int32Array(W * H);
let best = 0;
let bestSize = 0;
let next = 1;
const stack = [];
for (let s = 0; s < W * H; s++) {
  if (!mask[s] || label[s]) continue;
  let size = 0;
  stack.push(s);
  label[s] = next;
  while (stack.length) {
    const p = stack.pop();
    size++;
    const x = p % W;
    for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p - W, p + W]) {
      if (q >= 0 && q < W * H && mask[q] && !label[q]) {
        label[q] = next;
        stack.push(q);
      }
    }
  }
  if (size > bestSize) {
    bestSize = size;
    best = next;
  }
  next++;
}
const bag = new Uint8Array(W * H);
let minX = W;
let maxX = 0;
let minY = H;
let maxY = 0;
let sumX = 0;
let sumY = 0;
let count = 0;
for (let i = 0; i < W * H; i++) {
  if (label[i] !== best) continue;
  bag[i] = 1;
  const x = i % W;
  const y = (i / W) | 0;
  minX = Math.min(minX, x);
  maxX = Math.max(maxX, x);
  minY = Math.min(minY, y);
  maxY = Math.max(maxY, y);
  sumX += x;
  sumY += y;
  count++;
}
const cx0 = sumX / count;
const cy0 = sumY / count;

// fill interior holes (flood the outside, everything else is bag)
const outside = new Uint8Array(W * H);
const q = [];
for (let x = 0; x < W; x++) for (const y of [0, H - 1]) if (!bag[y * W + x]) { outside[y * W + x] = 1; q.push(y * W + x); }
for (let y = 0; y < H; y++) for (const x of [0, W - 1]) if (!bag[y * W + x] && !outside[y * W + x]) { outside[y * W + x] = 1; q.push(y * W + x); }
while (q.length) {
  const p = q.pop();
  const x = p % W;
  for (const n of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p - W, p + W]) {
    if (n >= 0 && n < W * H && !bag[n] && !outside[n]) { outside[n] = 1; q.push(n); }
  }
}
const solid = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) solid[i] = outside[i] ? 0 : 1;

// ── 3. outline: march outward from the centre along many rays ──────────────
const RAYS = 220;
const outline = [];
for (let k = 0; k < RAYS; k++) {
  const a = (k / RAYS) * Math.PI * 2;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  let last = 0;
  for (let r = 0; r < 700; r += 0.5) {
    const x = Math.round(cx0 + dx * r);
    const y = Math.round(cy0 + dy * r);
    if (x < 0 || y < 0 || x >= W || y >= H) break;
    if (solid[y * W + x]) last = r;
    else if (r - last > 14) break;
  }
  outline.push([cx0 + dx * last, cy0 + dy * last]);
}

// light smoothing of the radial outline
const smooth = outline.map((p, i) => {
  const a = outline[(i + RAYS - 1) % RAYS];
  const b = outline[(i + 1) % RAYS];
  return [(a[0] + 2 * p[0] + b[0]) / 4, (a[1] + 2 * p[1] + b[1]) / 4];
});

// ── 4. hand-read features (coordinates in the 2× crop → photo pixels) ──────
const fromCrop = ([x, y]) => [140 + x / 2, 300 + y / 2];
// the long, slanted opening under the arch that serves as the handle
const slotCrop = [
  [470, 194], [560, 186], [660, 183], [760, 189], [838, 205], [886, 230],
  [878, 254], [860, 268], [790, 264], [700, 270], [600, 272], [528, 260], [486, 238],
];
// centre line of the thick braided arch over the top, left shoulder → right shoulder
const ridgeCrop = [
  [226, 345], [234, 300], [258, 205], [310, 150], [410, 118], [540, 112], [700, 125],
  [850, 152], [955, 190], [1040, 240], [1100, 300], [1145, 362], [1170, 432], [1190, 500],
];
const slot = slotCrop.map(fromCrop);
const ridge = ridgeCrop.map(fromCrop);

// ── 5. map into the 1000 × 1000 viewBox ────────────────────────────────────
const K = 880 / (maxX - minX);
const TX = 500 - K * ((minX + maxX) / 2);
const TY = 540 - K * ((minY + maxY) / 2);
const r1 = (v) => Math.round(v * 10) / 10;
const mapPt = ([x, y]) => [r1(TX + K * x), r1(TY + K * y)];

function catmull(points, closed) {
  const n = points.length;
  const get = (i) => (closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${r1(points[0][0])} ${r1(points[0][1])}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1.map(r1).join(" ")} ${c2.map(r1).join(" ")} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return closed ? d + "Z" : d;
}

// ── 6. the cutout ──────────────────────────────────────────────────────────
// 6a. alpha at photo resolution. The silhouette is closed over the gaps between stitches, so along
// its rim the stone behind those gaps is inside it: strip every stone-coloured pixel within a few
// pixels of the edge. Anything deeper (the handle opening, the holes in the braid) stays untouched.
const dist = new Uint8Array(W * H).fill(255);
let frontier = [];
for (let i = 0; i < W * H; i++) {
  if (!solid[i]) {
    dist[i] = 0;
    frontier.push(i);
  }
}
for (let d = 1; d <= 12 && frontier.length; d++) {
  const nextFrontier = [];
  for (const p of frontier) {
    const x = p % W;
    for (const n of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p - W, p + W]) {
      if (n >= 0 && n < W * H && dist[n] === 255) {
        dist[n] = d;
        nextFrontier.push(n);
      }
    }
  }
  frontier = nextFrontier;
}
const FRINGE = 11;
let alpha = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) {
  if (!solid[i]) continue;
  const rim = dist[i] <= FRINGE;
  alpha[i] = !rim || isWine(i) || data[i * 3] <= 70 ? 1 : 0;
}
alpha = boxFilter(boxFilter(alpha, 1, "min"), 1, "max"); // drop single-pixel specks

// 6b. crop, soften the edge, upscale
const PAD = 10;
const CL = Math.max(0, minX - PAD);
const CT = Math.max(0, minY - PAD);
const CW = Math.min(W, maxX + PAD + 1) - CL;
const CH = Math.min(H, maxY + PAD + 1) - CT;
const S = 1.5; // output scale
const OW = Math.round(CW * S);
const OH = Math.round(CH * S);

const alphaCrop = Buffer.alloc(CW * CH);
for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) alphaCrop[y * CW + x] = alpha[(CT + y) * W + CL + x] * 255;
const softRaw = await sharp(alphaCrop, { raw: { width: CW, height: CH, channels: 1 } })
  .blur(1.1)
  .resize(OW, OH, { kernel: "cubic" })
  .extractChannel(0)
  .raw()
  .toBuffer();
if (softRaw.length !== OW * OH) throw new Error("unexpected alpha buffer");
const edge = Buffer.alloc(OW * OH);
for (let i = 0; i < edge.length; i++) {
  const v = softRaw[i] / 255;
  edge[i] = Math.round(Math.min(1, Math.max(0, (v - 0.56) * 3 + 0.5)) * 255);
}

const rgbOut = await sharp(SRC)
  .extract({ left: CL, top: CT, width: CW, height: CH })
  .resize(OW, OH, { kernel: "lanczos3" })
  .removeAlpha()
  .raw()
  .toBuffer();

// 6c. the two layers. The arch layer is the braided arch plus the handle opening; the body layer is
// everything else. They overlap by a few pixels so stacked they show no seam.
const toOut = ([x, y]) => [(x - CL) * S, (y - CT) * S];
const ridgeOut = ridge.map(toOut);
const slotOut = slot.map(toOut);
// the arch is thicker down its right-hand side than at the top, so its width varies along the ridge
const archHalf = (t) => (37 + 19 * smoothstep((t - 0.45) / 0.45)) * S; // half thickness, output pixels
function smoothstep(x) {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
}
/** Points along the Catmull-Rom ridge, with how far along it (0..1) each one is. */
function sampleRidge(points, perSegment = 12) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    for (let k = 0; k < perSegment; k++) {
      const t = k / perSegment, m = 1 - t;
      out.push([
        m * m * m * p1[0] + 3 * m * m * t * c1[0] + 3 * m * t * t * c2[0] + t * t * t * p2[0],
        m * m * m * p1[1] + 3 * m * m * t * c1[1] + 3 * m * t * t * c2[1] + t * t * t * p2[1],
      ]);
    }
  }
  out.push(points[points.length - 1]);
  return out.map((p, i) => ({ x: p[0], y: p[1], t: i / (out.length - 1) }));
}
const ridgeSamples = sampleRidge(ridgeOut);
// the band is a run of overlapping discs centred on the ridge: the body's cut-out is a little
// smaller than the arch layer's, so the two layers overlap all the way round
// …plus a few discs over the outer top edge, which the centre line runs too far inside of
const EXTRA = [[760, 72, 64], [838, 112, 60], [884, 156, 44], [340, 30, 34], [470, 36, 30], [680, 44, 34]];
const discs = (grow) =>
  ridgeSamples.map((p) => `<circle cx="${r1(p.x)}" cy="${r1(p.y)}" r="${r1(archHalf(p.t) + grow * S)}"/>`).join("") +
  EXTRA.map(([x, y, rad]) => `<circle cx="${x}" cy="${y}" r="${rad + grow * S}"/>`).join("");
const regionSvg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${OW}" height="${OH}" viewBox="0 0 ${OW} ${OH}">
  <rect width="${OW}" height="${OH}" fill="${body ? "white" : "black"}"/>
  <g fill="${body ? "black" : "white"}">${discs(body ? -3 : 4)}</g>
  <path d="${catmull(slotOut, true)}" fill="${body ? "black" : "white"}" ${body ? "" : `stroke="white" stroke-width="${12 * S}" stroke-linejoin="round"`}/>
</svg>`;
const region = async (body) => {
  const { data: d, info: ri } = await sharp(Buffer.from(regionSvg(body))).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
  if (ri.channels !== 1 || d.length !== OW * OH) throw new Error("unexpected region buffer");
  return d;
};
const bodyRegion = await region(true);
const archRegion = await region(false);

mkdirSync(IMG_DIR, { recursive: true });
async function writeLayer(name, regionBuf) {
  const a = Buffer.alloc(OW * OH);
  for (let i = 0; i < a.length; i++) a[i] = Math.round((edge[i] * regionBuf[i]) / 255);
  const file = `${IMG_DIR}/${name}.webp`;
  await sharp(rgbOut, { raw: { width: OW, height: OH, channels: 3 } })
    .joinChannel(a, { raw: { width: OW, height: OH, channels: 1 } })
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(file);
  return file;
}
const bodyFile = await writeLayer("bag-body", bodyRegion);
const archFile = await writeLayer("bag-arch", archRegion);

// How far from the ridge does the arch layer reach? The story reveals it with a stroke along the
// ridge, so that stroke must be at least twice as wide as this.
let reach = 0;
const rs = ridgeSamples;
for (let y = 0; y < OH; y += 2) {
  for (let x = 0; x < OW; x += 2) {
    const i = y * OW + x;
    if ((edge[i] * archRegion[i]) / 255 < 8) continue;
    let m = Infinity;
    for (const p of rs) m = Math.min(m, (p.x - x) ** 2 + (p.y - y) ** 2);
    reach = Math.max(reach, Math.sqrt(m));
  }
}
const archReach = r1((reach / S) * K); // viewBox units

// ── 7. write the trace ─────────────────────────────────────────────────────
const outlineVb = smooth.map(mapPt);
const slotVb = slot.map(mapPt);
const ridgeVb = ridge.map(mapPt);

const trace = {
  outlinePoints: outlineVb,
  outline: catmull(outlineVb, true),
  slotPoints: slotVb,
  slot: catmull(slotVb, true),
  ridgePoints: ridgeVb,
  ridge: catmull(ridgeVb, false),
  scale: Math.round(K * 1000) / 1000,
  image: { x: r1(TX + K * CL), y: r1(TY + K * CT), w: r1(K * CW), h: r1(K * CH) },
  archReach,
};

const ts = `/* prettier-ignore */
// GENERATED by scripts/trace-bag.mjs from public/images/products/burgundy-clutch-stone-wall.jpg – do not edit.
// Silhouette, handle opening, top arch and the placement of the cutout, in the illustration's 1000 × 1000 viewBox.
export interface BagTrace {
  outlinePoints: [number, number][];
  outline: string;
  slotPoints: [number, number][];
  slot: string;
  ridgePoints: [number, number][];
  ridge: string;
  scale: number;
  /** Where bag-body.webp and bag-arch.webp sit in the viewBox. */
  image: { x: number; y: number; w: number; h: number };
  /** Farthest distance from the ridge to any pixel of the arch layer, in viewBox units. */
  archReach: number;
}

export const bagTrace: BagTrace = ${JSON.stringify(trace)};
`;
writeFileSync(OUT, ts);
console.log("wrote", OUT, `(${(ts.length / 1024).toFixed(1)} KB)`, "bbox", minX, minY, maxX, maxY, "scale", trace.scale);
console.log("wrote", bodyFile, archFile);

if (DEBUG) {
  const ivory = { r: 239, g: 230, b: 212, alpha: 1 };
  const layer = (file) => sharp(file).toBuffer();
  const [body, arch] = [await layer(bodyFile), await layer(archFile)];
  const base = () => sharp({ create: { width: OW, height: OH, channels: 4, background: ivory } });
  const both = await base().composite([{ input: body }, { input: arch }]).png().toBuffer();
  const bodyOnly = await base().composite([{ input: body }]).png().toBuffer();
  const archOnly = await base().composite([{ input: arch }]).png().toBuffer();
  const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${OW}" height="${OH}">
    <path d="${catmull(ridgeOut, false)}" fill="none" stroke="#00d0ff" stroke-width="3"/>
    <path d="${catmull(slotOut, true)}" fill="rgba(255,255,0,.25)" stroke="#ffee00" stroke-width="2.5"/>
  </svg>`;
  const annotated = await sharp(both).composite([{ input: Buffer.from(overlay) }]).png().toBuffer();
  const sheet = await sharp({ create: { width: OW, height: OH * 4, channels: 4, background: ivory } })
    .composite([
      { input: both, top: 0, left: 0 },
      { input: bodyOnly, top: OH, left: 0 },
      { input: archOnly, top: OH * 2, left: 0 },
      { input: annotated, top: OH * 3, left: 0 },
    ])
    .png()
    .toFile("scripts/.trace-debug.png");
  console.log("wrote scripts/.trace-debug.png", sheet.width, "x", sheet.height);
}
