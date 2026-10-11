// Traces the real Bordeaux Clutch photo into vector data for the scroll-story illustration.
//
//   node scripts/trace-bag.mjs            → writes src/components/story/bagTrace.generated.ts
//   node scripts/trace-bag.mjs --debug    → also writes scripts/.trace-debug.png (outline/slot/ridge over the photo)
//
// What it extracts from public/images/products/burgundy-clutch-stone-wall.jpg:
//   • the exact silhouette (wine-red pixels, gaps closed, traced radially from the centre)
//   • a coarse colour field, so each drawn stitch can take the photo's real light and shade
// The handle opening and the braided top ridge are fixed polylines read off the photo
// (coordinates are in the 2× enlarged crop used while tracing: crop = photo[140..840, 300..770] × 2).
// Everything is mapped into the 1000 × 1000 viewBox used by the illustration.
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const SRC = "public/images/products/burgundy-clutch-stone-wall.jpg";
const OUT = "src/components/story/bagTrace.generated.ts";
const DEBUG = process.argv.includes("--debug");

const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;

// ── 1. wine-red mask ───────────────────────────────────────────────────────
// Stone is tan (g ≈ 0.65 r), denim is blue (b > r); wine-red has very low g and moderate b.
let mask = new Uint8Array(W * H);
for (let y = 280; y < 800; y++) {
  for (let x = 100; x < 900; x++) {
    const i = y * W + x;
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    mask[i] = r > 18 && g < 0.5 * r && b < 0.78 * r && r > b ? 1 : 0;
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
        v = pick(v, xx < 0 || xx >= W ? (mode === "max" ? 0 : 0) : src[y * W + xx]);
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

// ── 5. colour field from the photo ─────────────────────────────────────────
const fieldCols = 56;
const fieldRows = 36;
const fx0 = minX;
const fy0 = minY;
const fcw = (maxX - minX + 1) / fieldCols;
const fch = (maxY - minY + 1) / fieldRows;
const sums = Array.from({ length: fieldCols * fieldRows }, () => [0, 0, 0, 0]);
for (let y = minY; y <= maxY; y++) {
  for (let x = minX; x <= maxX; x++) {
    const i = y * W + x;
    if (!bag[i]) continue; // only genuine yarn pixels (no stone showing through)
    const ci = Math.min(fieldCols - 1, Math.floor((x - fx0) / fcw));
    const ri = Math.min(fieldRows - 1, Math.floor((y - fy0) / fch));
    const s = sums[ri * fieldCols + ci];
    s[0] += data[i * 3];
    s[1] += data[i * 3 + 1];
    s[2] += data[i * 3 + 2];
    s[3]++;
  }
}
const rgb = sums.map((s) => (s[3] > 6 ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : null));
// fill empty cells from their neighbours (a few passes)
for (let pass = 0; pass < 8; pass++) {
  rgb.forEach((c, i) => {
    if (c) return;
    const x = i % fieldCols;
    const y = (i / fieldCols) | 0;
    const near = [];
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + ox;
      const ny = y + oy;
      if (nx >= 0 && ny >= 0 && nx < fieldCols && ny < fieldRows && rgb[ny * fieldCols + nx]) near.push(rgb[ny * fieldCols + nx]);
    }
    if (near.length) rgb[i] = [0, 1, 2].map((k) => near.reduce((a, c2) => a + c2[k], 0) / near.length);
  });
}
const hex = (c) => (c ? "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("") : "#5a1428");

// ── 6. map into the 1000 × 1000 viewBox ────────────────────────────────────
const K = 880 / (maxX - minX);
const TX = 500 - K * ((minX + maxX) / 2);
const TY = 540 - K * ((minY + maxY) / 2);
const mapPt = ([x, y]) => [Math.round((TX + K * x) * 10) / 10, Math.round((TY + K * y) * 10) / 10];

function catmull(points, closed) {
  const n = points.length;
  const get = (i) => (closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${points[0][0]} ${points[0][1]}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1.map((v) => Math.round(v * 10) / 10).join(" ")} ${c2.map((v) => Math.round(v * 10) / 10).join(" ")} ${p2[0]} ${p2[1]}`;
  }
  return closed ? d + "Z" : d;
}

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
  field: {
    cols: fieldCols,
    rows: fieldRows,
    // field cell geometry, in viewBox units
    x0: Math.round((TX + K * fx0) * 10) / 10,
    y0: Math.round((TY + K * fy0) * 10) / 10,
    cw: Math.round(K * fcw * 100) / 100,
    ch: Math.round(K * fch * 100) / 100,
    colors: rgb.map(hex),
  },
};

const ts = `/* prettier-ignore */
// GENERATED by scripts/trace-bag.mjs from public/images/products/burgundy-clutch-stone-wall.jpg – do not edit.
// Silhouette, handle opening, top arch and a colour field, all in the illustration's 1000 × 1000 viewBox.
export interface BagTrace {
  outlinePoints: [number, number][];
  outline: string;
  slotPoints: [number, number][];
  slot: string;
  ridgePoints: [number, number][];
  ridge: string;
  scale: number;
  field: { cols: number; rows: number; x0: number; y0: number; cw: number; ch: number; colors: string[] };
}

export const bagTrace: BagTrace = ${JSON.stringify(trace)};
`;
writeFileSync(OUT, ts);
console.log("wrote", OUT, `(${(ts.length / 1024).toFixed(1)} KB)`, "bbox", minX, minY, maxX, maxY, "scale", trace.scale);

if (DEBUG) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <path d="${catmull(smooth.map((p) => p.map((v) => Math.round(v * 10) / 10)), true)}" fill="none" stroke="#00ff66" stroke-width="3"/>
    <path d="${catmull(slot.map((p) => p.map((v) => Math.round(v * 10) / 10)), true)}" fill="rgba(255,255,0,.25)" stroke="#ffee00" stroke-width="2.5"/>
    <path d="${catmull(ridge.map((p) => p.map((v) => Math.round(v * 10) / 10)), false)}" fill="none" stroke="#00d0ff" stroke-width="3"/>
  </svg>`;
  const full = await sharp(SRC).composite([{ input: Buffer.from(svg) }]).png().toBuffer();
  await sharp(full).extract({ left: 100, top: 280, width: 780, height: 520 }).png().toFile("scripts/.trace-debug.png");
  console.log("wrote scripts/.trace-debug.png");
}
