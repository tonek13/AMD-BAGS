/**
 * Procedural geometry for the yarn-to-bag illustration.
 *
 * The drawing is modelled on the real Bordeaux Clutch: a wide, low, pillowy bag whose front is
 * dense rows of plump single-crochet stitches (with small dark holes between them), a rolled
 * braided top edge, and a cut-out slot as the handle. No rings, no tassel.
 *
 * Everything is generated from a few numbers and is fully deterministic (seeded PRNG, no
 * Math.random / Date), so the server and client renders are byte-identical – required for
 * hydration and for Next's Cache Components prerendering.
 *
 * Coordinates live in a 1000 × 1000 viewBox.
 */

export const VIEW = 1000;
export const CX = 500;

// ── tuning ────────────────────────────────────────────────────────────────
export const ROWS = 8; // rows of stitches across the front, row 0 at the bottom
export const COLS = 16; // stitches per row
const ROW_PITCH = 45;
const ROW0_Y = 690;
const HALF_BOTTOM = 420; // half-width of the bottom row
const HALF_TOP = 372; // half-width of the top row: the clutch narrows only slightly toward the top

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

/** Wine-red ramp matched to the photographs, dark → light. `shade()` interpolates between steps. */
const RAMP = ["#2a0610", "#450c1a", "#651428", "#862139", "#a73450", "#c65670", "#de8397"] as const;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function shade(v: number): string {
  const x = Math.min(RAMP.length - 1, Math.max(0, v));
  const i = Math.min(RAMP.length - 2, Math.floor(x));
  const f = x - i;
  const a = hexToRgb(RAMP[i]);
  const b = hexToRgb(RAMP[i + 1]);
  const c = a.map((ch, k) => Math.round(ch + (b[k] - ch) * f));
  return `#${c.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/** Catmull-Rom → cubic Bézier through the points. */
export function smoothPath(points: [number, number][], tension = 0.5): string {
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

// ── body profile ──────────────────────────────────────────────────────────
const rowT = (i: number) => i / (ROWS - 1);
const halfWidth = (t: number) => HALF_BOTTOM - (HALF_BOTTOM - HALF_TOP) * Math.pow(t, 1.15) + 30 * Math.sin(Math.PI * Math.min(1, t * 0.95));
/** Rows bow like a pillow: the bottom rows smile a little, the top rows arch up in the middle. */
const bowAmp = (t: number) => 16 - 40 * t;
const rowCentreY = (i: number) => ROW0_Y - i * ROW_PITCH;
const rowY = (i: number, u: number) => rowCentreY(i) + bowAmp(rowT(i)) * (1 - u * u);

export interface StitchGeometry {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  /** 0..1 position along the row in the direction it is worked. */
  u: number;
  body: string;
  shadow: string;
  highlight: string;
  crease: string;
}

export interface RowGeometry {
  index: number;
  /** Backing arc, left → right, drawn dark under the stitches so the little holes between them show. */
  arc: string;
  leftToRight: boolean;
  stitches: StitchGeometry[];
}

export function buildRows(): RowGeometry[] {
  const rand = mulberry32(20260611);
  const rows: RowGeometry[] = [];

  for (let i = 0; i < ROWS; i++) {
    const t = rowT(i);
    const w = halfWidth(t);
    const leftToRight = i % 2 === 0;

    // Odd rows are staggered by half a stitch (one fewer stitch), like real single crochet:
    // that is what makes the small diamond-shaped holes between the stitches.
    const staggered = i % 2 === 1;
    const count = staggered ? COLS - 1 : COLS;
    const stitches: StitchGeometry[] = [];
    for (let j = 0; j < count; j++) {
      const u = staggered ? -1 + (2 * j + 2) / COLS : -1 + (2 * j + 1) / COLS;
      const x = CX + u * (w - 4) + (rand() - 0.5) * 4;
      const y = rowY(i, u) + (rand() - 0.5) * 6;

      // Light from the upper left; the rounded ends and the lowest row fall into shadow.
      const v =
        2.9 -
        0.8 * u +
        0.35 * t +
        0.25 * (1 - Math.abs(u)) -
        1.4 * Math.pow(Math.abs(u), 5) -
        0.4 * (1 - t) * (1 - t) +
        (rand() - 0.5) * 1.0;

      stitches.push({
        x: r1(x),
        y: r1(y),
        rotate: r1((rand() - 0.5) * 30 + u * 6),
        scale: Math.round((0.96 + rand() * 0.14) * 100) / 100,
        u: 0,
        body: shade(v),
        shadow: shade(v - 2.9),
        highlight: shade(v + 1.8),
        crease: shade(v - 1.3),
      });
    }

    const pts: [number, number][] = [];
    for (let k = 0; k <= 10; k++) {
      const u = -1 + (k / 10) * 2;
      pts.push([CX + u * (w - 34), rowY(i, u)]); // inset so its round ends hide behind the end stitches
    }
    rows.push({ index: i, arc: smoothPath(pts), leftToRight, stitches: leftToRight ? stitches : [...stitches].reverse() });
    rows[i].stitches.forEach((s, k, all) => (s.u = k / (all.length - 1)));
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

// ── rolled top edge ───────────────────────────────────────────────────────
export function buildRim() {
  const top = ROWS - 1;
  const w = halfWidth(1) + 6;
  const pts: [number, number][] = [];
  for (let k = 0; k <= 12; k++) {
    const u = -1 + (k / 12) * 2;
    // rises into a gentle hump in the middle, drops around the corners at both ends
    const y = rowCentreY(top) - 27 - 30 * (1 - u * u) + 20 * Math.pow(Math.abs(u), 6);
    pts.push([CX + u * w, y]);
  }
  return { d: smoothPath(pts), centreY: rowCentreY(top) - 27 - 30 };
}

// ── foundation ring ───────────────────────────────────────────────────────
/** The base of the clutch: a long flat coil of yarn. It stays visible as the rolled lip under the first row. */
export function buildFoundation() {
  const cy = ROW0_Y + 14;
  const rx = HALF_BOTTOM + 4;
  const ry = 34;
  const turns = 1.94;
  const steps = 110;
  const pts: [number, number][] = [];
  for (let k = 0; k <= steps; k++) {
    const s = k / steps;
    const theta = s * turns * 2 * Math.PI; // starts at the rightmost point, runs counter-clockwise on screen
    const f = 1 - 0.07 * s;
    pts.push([CX + rx * f * Math.cos(theta), cy + ry * f * Math.sin(theta)]);
  }
  return { d: smoothPath(pts), start: pts[0], cy, rx, ry };
}

// ── loose strand ──────────────────────────────────────────────────────────
function chaikin(points: [number, number][], iterations: number): [number, number][] {
  let pts = points;
  for (let n = 0; n < iterations; n++) {
    const next: [number, number][] = [pts[0]];
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

export function buildStrand(foundationStart: [number, number]) {
  const [fx, fy] = foundationStart;
  const pts: [number, number][] = [
    [1520, 40],
    [1280, 170],
    [1040, 110],
    [820, 240],
    [590, 190],
    [330, 110],
    [90, 230],
    [110, 440],
    [330, 530],
    [570, 450],
    [800, 480],
    [fx + 6, fy - 110],
    [fx + 2, fy - 48],
    [fx, fy],
  ];
  return { d: smoothPath(chaikin(pts, 3), 0.5) };
}

// ── cut-out handle ────────────────────────────────────────────────────────
export interface HandleSegment {
  /** 0..1 along the band, used to time each twist with the hook. */
  u: number;
  x: number;
  y: number;
  angle: number;
}

/** The handle is a slot cut through the top edge: a stadium-shaped band of braided yarn around a dark opening. */
export function buildHandle(rimCentreY: number) {
  const cx = CX;
  const cy = rimCentreY - 16;
  const W = 372;
  const H = 60;
  const r = H / 2;
  const L = W - H;
  const d = `M${cx - L / 2} ${cy - r} H${cx + L / 2} A${r} ${r} 0 0 1 ${cx + L / 2} ${cy + r} H${cx - L / 2} A${r} ${r} 0 0 1 ${cx - L / 2} ${cy - r}Z`;
  const total = 2 * L + 2 * Math.PI * r;

  // Position + tangent angle at arc length s, walking the path clockwise from the top-left.
  const at = (s: number): { x: number; y: number; a: number } => {
    if (s <= L) return { x: cx - L / 2 + s, y: cy - r, a: 0 };
    if (s <= L + Math.PI * r) {
      const phi = -Math.PI / 2 + (s - L) / r;
      return { x: cx + L / 2 + r * Math.cos(phi), y: cy + r * Math.sin(phi), a: phi + Math.PI / 2 };
    }
    if (s <= 2 * L + Math.PI * r) return { x: cx + L / 2 - (s - L - Math.PI * r), y: cy + r, a: Math.PI };
    const phi = Math.PI / 2 + (s - 2 * L - Math.PI * r) / r;
    return { x: cx - L / 2 + r * Math.cos(phi), y: cy + r * Math.sin(phi), a: phi + Math.PI / 2 };
  };

  const count = 46;
  const segments: HandleSegment[] = [];
  for (let k = 0; k < count; k++) {
    const u = (k + 0.5) / count;
    const p = at(u * total);
    segments.push({ u, x: r1(p.x), y: r1(p.y), angle: r1((p.a * 180) / Math.PI + 58) });
  }
  return { d, segments, cx, cy, W, H };
}

export const bag = (() => {
  const rows = buildRows();
  const rim = buildRim();
  const foundation = buildFoundation();
  const strand = buildStrand(foundation.start);
  const handle = buildHandle(rim.centreY);
  return { rows, rim, foundation, strand, handle };
})();
