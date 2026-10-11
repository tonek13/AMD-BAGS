/**
 * Geometry for the yarn-to-bag illustration.
 *
 * The finished drawing is a faithful redraw of the real Bordeaux Clutch photograph: its exact
 * silhouette, its flared base lip, the thick braided arch over the top and the long slanted
 * opening that serves as the handle. All of that comes from bagTrace.generated.ts (made by
 * scripts/trace-bag.mjs); this file turns it into stitches, rows, a coil and a braid.
 *
 * Fully deterministic (seeded PRNG, no Math.random / Date) so server and client renders are
 * byte-identical – required for hydration and for Next's Cache Components prerendering.
 *
 * Coordinates live in a 1000 × 1000 viewBox.
 */
import { bagTrace } from "./bagTrace.generated";

export const VIEW = 1000;
export const CX = 500;

type Pt = [number, number];

// ── tuning ────────────────────────────────────────────────────────────────
const ROWS = 16; // stitch rows between the base lip and the top of the bag
const COLS = 24; // stitches across the widest part
const STITCH_BASE = 37; // nominal row pitch (and stitch height) in the middle of the bag
const RIDGE_WIDTH = 74; // thickness of the braided arch
const LIP = 27; // height of the rolled base lip that the first row sits on

// ── helpers ───────────────────────────────────────────────────────────────
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Wine-red ramp for the parts that are not sampled from the photo (strand, coil). */
const RAMP = ["#2a0610", "#450c1a", "#651428", "#862139", "#a73450", "#c65670", "#de8397"] as const;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (c: number[]) => `#${c.map((n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, "0")).join("")}`;

export function shade(v: number): string {
  const x = clamp(v, 0, RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(x));
  const f = x - i;
  const a = hexToRgb(RAMP[i]);
  const b = hexToRgb(RAMP[i + 1]);
  return toHex(a.map((ch, k) => ch + (b[k] - ch) * f));
}

/** Catmull-Rom → cubic Bézier through the points. */
export function smoothPath(points: Pt[], tension = 0.5): string {
  let d = `M${r1(points[0][0])} ${r1(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + ((p2[0] - p0[0]) * tension) / 3;
    const c1y = p1[1] + ((p2[1] - p0[1]) * tension) / 3;
    const c2x = p2[0] - ((p3[0] - p1[0]) * tension) / 3;
    const c2y = p2[1] - ((p3[1] - p1[1]) * tension) / 3;
    d += ` C${r1(c1x)} ${r1(c1y)} ${r1(c2x)} ${r1(c2y)} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d;
}

// ── geometry of the traced bag ────────────────────────────────────────────
const OUT = bagTrace.outlinePoints as Pt[];
const SLOT = bagTrace.slotPoints as Pt[];
const RIDGE = bagTrace.ridgePoints as Pt[];

function inPoly(x: number, y: number, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distSeg(px: number, py: number, a: Pt, b: Pt): { d: number; t: number } {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const len2 = vx * vx + vy * vy || 1;
  const t = clamp(((px - a[0]) * vx + (py - a[1]) * vy) / len2, 0, 1);
  return { d: Math.hypot(px - (a[0] + t * vx), py - (a[1] + t * vy)), t };
}

function distPolyline(x: number, y: number, pts: Pt[], closed: boolean) {
  let best = { d: Infinity, at: 0 };
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    const s = distSeg(x, y, pts[i], pts[(i + 1) % pts.length]);
    if (s.d < best.d) best = { d: s.d, at: (i + s.t) / n };
  }
  return best;
}

/** Highest and lowest y of the silhouette at a given x. */
function yRange(x: number): [number, number] | null {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < OUT.length; i++) {
    const a = OUT[i];
    const b = OUT[(i + 1) % OUT.length];
    if ((a[0] <= x && b[0] > x) || (b[0] <= x && a[0] > x)) {
      const y = a[1] + ((x - a[0]) / (b[0] - a[0])) * (b[1] - a[1]);
      lo = Math.min(lo, y);
      hi = Math.max(hi, y);
    }
  }
  return lo === Infinity ? null : [lo, hi];
}

const xs = OUT.map((p) => p[0]);
const X_MIN = Math.min(...xs);
const X_MAX = Math.max(...xs);

// the slot, grown a little so no stitch pokes into the opening
const slotCentre: Pt = [SLOT.reduce((s, p) => s + p[0], 0) / SLOT.length, SLOT.reduce((s, p) => s + p[1], 0) / SLOT.length];
const SLOT_GROWN: Pt[] = SLOT.map(([x, y]) => [slotCentre[0] + (x - slotCentre[0]) * 1.07, slotCentre[1] + (y - slotCentre[1]) * 1.2]);

const ridgeHalf = (t: number) => RIDGE_WIDTH / 2 - 15 * clamp((t - 0.72) / 0.28, 0, 1);

// ── colour from the photo ─────────────────────────────────────────────────
const FIELD = bagTrace.field;
const FIELD_RAW = FIELD.colors.map(hexToRgb);
// 5×5 blur so neighbouring stitches share the photo's light instead of picking up per-cell noise
const FIELD_RGB: [number, number, number][] = FIELD_RAW.map((_, i) => {
  const cx = i % FIELD.cols;
  const cy = Math.floor(i / FIELD.cols);
  const sum: [number, number, number] = [0, 0, 0];
  let n = 0;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || y < 0 || x >= FIELD.cols || y >= FIELD.rows) continue;
      const c = FIELD_RAW[y * FIELD.cols + x];
      sum[0] += c[0];
      sum[1] += c[1];
      sum[2] += c[2];
      n++;
    }
  }
  return [sum[0] / n, sum[1] / n, sum[2] / n];
});

function photoColor(x: number, y: number): [number, number, number] {
  const fx = clamp((x - FIELD.x0) / FIELD.cw - 0.5, 0, FIELD.cols - 1.001);
  const fy = clamp((y - FIELD.y0) / FIELD.ch - 0.5, 0, FIELD.rows - 1.001);
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const at = (cx: number, cy: number) => FIELD_RGB[cy * FIELD.cols + cx];
  const out: [number, number, number] = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const top = at(x0, y0)[k] * (1 - tx) + at(x0 + 1, y0)[k] * tx;
    const bot = at(x0, y0 + 1)[k] * (1 - tx) + at(x0 + 1, y0 + 1)[k] * tx;
    out[k] = top * (1 - ty) + bot * ty;
  }
  return out;
}

const mulColor = (c: number[], f: number) => c.map((v) => v * f);
const mixColor = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);

interface StitchColors {
  body: string;
  shadow: string;
  highlight: string;
  crease: string;
}

const FIELD_MEAN = FIELD_RGB.reduce((m, c) => [m[0] + c[0] / FIELD_RGB.length, m[1] + c[1] / FIELD_RGB.length, m[2] + c[2] / FIELD_RGB.length], [0, 0, 0]);

function stitchColors(x: number, y: number, tweak: number): StitchColors {
  // The photo's averages include the dark gaps between stitches, so lift them a little, and pull
  // the light/shade toward the bag's mean so neighbouring stitches read as one lit surface.
  const raw = photoColor(x, y);
  const calm = raw.map((v, i) => FIELD_MEAN[i] + (v - FIELD_MEAN[i]) * 0.78);
  const base = mulColor(calm, 1.14 + tweak);
  return {
    body: toHex(base),
    shadow: toHex(mulColor(base, 0.5)),
    highlight: toHex(mixColor(base, [226, 96, 112], 0.26)),
    crease: toHex(mulColor(base, 0.7)),
  };
}

// ── rows of stitches ──────────────────────────────────────────────────────
export interface StitchGeometry extends StitchColors {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  /** 0..1 position along the row in the direction it is worked. */
  u: number;
}

export interface RowGeometry {
  index: number;
  /** Dark backing under the stitches (the little gaps between stitches show it), left → right. */
  arc: string;
  leftToRight: boolean;
  stitches: StitchGeometry[];
}

function buildRows(): RowGeometry[] {
  const rand = mulberry32(20260612);
  const pitchX = (X_MAX - X_MIN) / COLS;
  const rows: RowGeometry[] = [];

  for (let i = 0; i < ROWS; i++) {
    const found: StitchGeometry[] = [];
    const rowYAt = (px: number) => {
      const r = yRange(px);
      return r ? r[1] - (i + 0.5) * clamp((r[1] - r[0]) / ROWS, 27, 50) - LIP : null;
    };

    for (let j = 0; j <= COLS; j++) {
      // odd rows are staggered by half a stitch – real single crochet
      const x = X_MIN + (j + 0.5 + (i % 2 ? 0.5 : 0)) * pitchX;
      const range = yRange(x);
      const baseY = rowYAt(x);
      if (!range || baseY === null) continue;
      const local = clamp((range[1] - range[0]) / ROWS, 27, 50);
      const y = baseY + (rand() - 0.5) * 4;

      if (!inPoly(x, y, OUT) || distPolyline(x, y, OUT, true).d < 9) continue;
      if (inPoly(x, y, SLOT_GROWN)) continue;
      const nearRidge = distPolyline(x, y, RIDGE, false);
      if (nearRidge.d < ridgeHalf(nearRidge.at) - 2) continue; // hidden under the arch

      // follow the bend of the row so stitches tilt with the contour of the bag
      const ahead = rowYAt(x + 14);
      const behind = rowYAt(x - 14);
      const slope = ahead !== null && behind !== null ? (Math.atan2(ahead - behind, 28) * 180) / Math.PI : 0;
      const tweak = (rand() - 0.5) * 0.08;
      found.push({
        x: r1(x + (rand() - 0.5) * 4),
        y: r1(y),
        rotate: r1(clamp(slope * 0.5, -26, 26) + (rand() - 0.5) * 14),
        scale: Math.round(clamp(local / STITCH_BASE, 0.55, 1.05) * (0.84 + rand() * 0.12) * 100) / 100,
        u: 0,
        ...stitchColors(x, y, tweak),
      });
    }
    if (found.length < 2) continue;

    const leftToRight = rows.length % 2 === 0;
    const arcPts: Pt[] = found.map((s) => [s.x, s.y]);
    const row: RowGeometry = {
      index: rows.length,
      arc: smoothPath(arcPts),
      leftToRight,
      stitches: leftToRight ? found : [...found].reverse(),
    };
    row.stitches.forEach((s, k, all) => (s.u = k / (all.length - 1)));
    rows.push(row);
  }
  return rows;
}

/**
 * One single-crochet stitch, drawn around (0,0) as three overlapping slanted ribbons of flat
 * yarn – the way the real bag's t-shirt yarn looks. Left to right, each ribbon overlaps the last.
 */
export const STITCH_RIBBONS = [
  "M-19 17 C-20 2 -11 -11 1 -19",
  "M-5 21 C-6 5 5 -10 18 -18",
  "M10 22 C10 9 17 -1 26 -8",
] as const;

// ── foundation coil (rolled base lip) ─────────────────────────────────────
function buildFoundation() {
  const cy = OUT.reduce((s, p) => s + p[1], 0) / OUT.length;
  // the base edge of the silhouette, right → left; the strand arrives at its right end
  const lower = OUT.filter((p) => p[1] > cy + 20).sort((a, b) => b[0] - a[0]);
  const pts: Pt[] = lower.filter((_, i) => i % 3 === 0).map(([x, y]) => [x, y - 14]);
  return { d: smoothPath(pts), start: pts[0], bottom: Math.max(...OUT.map((p) => p[1])) };
}

// ── loose strand ──────────────────────────────────────────────────────────
function chaikin(points: Pt[], iterations: number): Pt[] {
  let pts = points;
  for (let n = 0; n < iterations; n++) {
    const next: Pt[] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[i + 1];
      next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
    }
    next.push(pts[pts.length - 1]);
    pts = next;
  }
  return pts;
}

function buildStrand(foundationStart: Pt) {
  const [fx, fy] = foundationStart;
  const pts: Pt[] = [
    [1520, 40],
    [1280, 170],
    [1040, 110],
    [820, 240],
    [590, 190],
    [330, 110],
    [90, 230],
    [110, 440],
    [330, 560],
    [570, 470],
    [800, 430],
    [fx + 10, fy - 150],
    [fx + 6, fy - 62],
    [fx, fy],
  ];
  return { d: smoothPath(chaikin(pts, 3), 0.5) };
}

// ── braided arch (the carry handle) ───────────────────────────────────────
export interface HandleSegment {
  /** 0..1 along the arch, used to time each twist with the hook. */
  u: number;
  x: number;
  y: number;
  angle: number;
  colors: StitchColors;
}

function evalSegment(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  // Catmull-Rom (tension 0.5) as a cubic Bézier, same maths as smoothPath
  const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
  const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
  const m = 1 - t;
  return [
    m * m * m * p1[0] + 3 * m * m * t * c1[0] + 3 * m * t * t * c2[0] + t * t * t * p2[0],
    m * m * m * p1[1] + 3 * m * m * t * c1[1] + 3 * m * t * t * c2[1] + t * t * t * p2[1],
  ];
}

function buildHandle() {
  const dense: Pt[] = [];
  for (let i = 0; i < RIDGE.length - 1; i++) {
    const p0 = RIDGE[i - 1] ?? RIDGE[i];
    const p3 = RIDGE[i + 2] ?? RIDGE[i + 1];
    for (let s = 0; s < 24; s++) dense.push(evalSegment(p0, RIDGE[i], RIDGE[i + 1], p3, s / 24));
  }
  dense.push(RIDGE[RIDGE.length - 1]);
  const lens = [0];
  for (let i = 1; i < dense.length; i++) lens.push(lens[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const total = lens[lens.length - 1];

  const spacing = 21;
  const count = Math.round(total / spacing);
  const segments: HandleSegment[] = [];
  let idx = 1;
  for (let k = 0; k < count; k++) {
    const u = (k + 0.5) / count;
    const target = u * total;
    while (idx < dense.length - 1 && lens[idx] < target) idx++;
    const a = dense[idx - 1];
    const b = dense[idx];
    const f = (target - lens[idx - 1]) / (lens[idx] - lens[idx - 1] || 1);
    const x = a[0] + (b[0] - a[0]) * f;
    const y = a[1] + (b[1] - a[1]) * f;
    const tangent = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
    segments.push({
      u,
      x: r1(x),
      y: r1(y),
      angle: r1(tangent + 90), // chevron apex points along the arch
      colors: stitchColors(x, y, (k % 2 ? 0.07 : -0.05) + (((k * 37) % 11) - 5) * 0.01),
    });
  }
  return { d: smoothPath(RIDGE, 0.5), width: RIDGE_WIDTH, segments };
}

export const bag = (() => {
  const rows = buildRows();
  const foundation = buildFoundation();
  return {
    rows,
    foundation,
    strand: buildStrand(foundation.start),
    handle: buildHandle(),
    outline: bagTrace.outline,
    slot: bagTrace.slot,
    shadow: { cx: (X_MIN + X_MAX) / 2, cy: foundation.bottom + 10, rx: (X_MAX - X_MIN) / 2 + 20 },
  };
})();

export const ROW_COUNT = bag.rows.length;
