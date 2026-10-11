/**
 * Geometry for the yarn-to-bag illustration.
 *
 * The finished bag is the owner's real Bordeaux Clutch photograph, cut out in two layers by
 * scripts/trace-bag.mjs (the body, and the braided arch with the handle opening). The story does
 * not draw a bag: it reveals those photo layers stitch by stitch. This file holds the pieces that
 * ARE drawn: the loose strand, the foundation rope, and the rows of "stitch" discs the reveal
 * mask is made of.
 *
 * Fully deterministic (no Math.random / Date) so server and client renders are byte-identical,
 * which hydration and Next's Cache Components prerendering require.
 *
 * Coordinates live in a 1000 × 1000 viewBox.
 */
import { bagTrace } from "./bagTrace.generated";

export const VIEW = 1000;

type Pt = [number, number];

// ── tuning ────────────────────────────────────────────────────────────────
const ROW_PITCH = 50; // row height, in viewBox units – about one real stitch row of the bag
const COL_PITCH = 46; // stitch width
const BLOB_R = 42; // radius of each revealed patch: big enough that neighbours overlap into a solid row

// ── helpers ───────────────────────────────────────────────────────────────
const r1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Wine-red ramp for the loose strand and the foundation rope. */
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

function inPoly(x: number, y: number, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distToPolygon(x: number, y: number, pts: Pt[]): number {
  let best = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const vx = b[0] - a[0];
    const vy = b[1] - a[1];
    const t = clamp(((x - a[0]) * vx + (y - a[1]) * vy) / (vx * vx + vy * vy || 1), 0, 1);
    best = Math.min(best, Math.hypot(x - (a[0] + t * vx), y - (a[1] + t * vy)));
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
const ys = OUT.map((p) => p[1]);
const X_MIN = Math.min(...xs);
const X_MAX = Math.max(...xs);
const Y_MIN = Math.min(...ys);
const Y_MAX = Math.max(...ys);

// ── rows of stitch discs ──────────────────────────────────────────────────
export interface Blob {
  x: number;
  y: number;
}

export interface RowGeometry {
  index: number;
  leftToRight: boolean;
  /** In the order they are worked. */
  blobs: Blob[];
}

/**
 * Rows follow the curve of the bag's base, bottom to top, each one staggered half a stitch from
 * the last (as in real single crochet). The discs overlap so each finished row is a solid band.
 */
function buildRows(): RowGeometry[] {
  const rows: RowGeometry[] = [];
  const count = Math.ceil((Y_MAX - Y_MIN) / ROW_PITCH) + 1;

  for (let i = 0; i < count; i++) {
    const found: Blob[] = [];
    for (let x = X_MIN - COL_PITCH * 0.4 + (i % 2 ? COL_PITCH / 2 : 0); x <= X_MAX + COL_PITCH * 0.4; x += COL_PITCH) {
      const range = yRange(x) ?? yRange(clamp(x, X_MIN + 1, X_MAX - 1));
      if (!range) continue;
      const y = range[1] - (i + 0.5) * ROW_PITCH + 8;
      if (inPoly(x, y, OUT) || distToPolygon(x, y, OUT) < BLOB_R * 0.7) found.push({ x: r1(x), y: r1(y) });
    }
    if (found.length < 2) continue;
    const leftToRight = rows.length % 2 === 0;
    rows.push({ index: rows.length, leftToRight, blobs: leftToRight ? found : [...found].reverse() });
  }
  return rows;
}

// ── foundation rope (the base the rows are worked onto) ───────────────────
function buildFoundation() {
  const cy = OUT.reduce((s, p) => s + p[1], 0) / OUT.length;
  // the base edge of the silhouette, right → left; the strand arrives at its right end
  const lower = OUT.filter((p) => p[1] > cy + 20).sort((a, b) => b[0] - a[0]);
  const pts: Pt[] = lower.filter((_, i) => i % 3 === 0).map(([x, y]) => [x, y - 14]);
  return { d: smoothPath(pts), start: pts[0], bottom: Math.max(...OUT.map((p) => p[1])) };
}

// ── the arch reveal path ──────────────────────────────────────────────────
/**
 * The braided arch layer has rounded ends that stick out past the end of the ridge line, so the
 * stroke that reveals it runs a little beyond both ends. (A round cap would do the same but paints
 * a dot before the stroke starts drawing.)
 */
function buildArchReveal(): string {
  const pts = bagTrace.ridgePoints as Pt[];
  const away = (a: Pt, b: Pt): Pt => {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const len = Math.hypot(dx, dy) || 1;
    return [dx / len, dy / len];
  };
  const EXTEND = 130;
  const d0 = away(pts[0], pts[1]);
  const d1 = away(pts[pts.length - 1], pts[pts.length - 2]);
  const pre: Pt = [pts[0][0] + d0[0] * EXTEND, pts[0][1] + d0[1] * EXTEND];
  const post: Pt = [pts[pts.length - 1][0] + d1[0] * EXTEND, pts[pts.length - 1][1] + d1[1] * EXTEND];
  return smoothPath([pre, ...pts, post]);
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

export const bag = (() => {
  const rows = buildRows();
  const foundation = buildFoundation();
  return {
    rows,
    foundation,
    strand: buildStrand(foundation.start),
    outline: bagTrace.outline,
    slot: bagTrace.slot,
    ridgeReveal: buildArchReveal(),
    image: bagTrace.image,
    /** Stroke width that is certain to cover every pixel of the arch layer. */
    archStroke: Math.ceil(bagTrace.archReach * 2 + 24),
    discRadius: BLOB_R,
    shadow: { cx: (X_MIN + X_MAX) / 2, cy: foundation.bottom + 10, rx: (X_MAX - X_MIN) / 2 + 20 },
  };
})();

export const ROW_COUNT = bag.rows.length;
