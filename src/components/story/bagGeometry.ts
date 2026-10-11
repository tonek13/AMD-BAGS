/**
 * Procedural geometry for the yarn-to-bag illustration.
 *
 * Everything is generated from a few numbers so the drawing can be tuned in one
 * place, and it is fully deterministic (seeded PRNG, no Math.random / Date) so the
 * server render and the client render are byte-identical – required for hydration
 * and for Next's Cache Components prerendering.
 *
 * Coordinates live in a 1000 × 1000 viewBox. The bag is a slightly tapered, rounded
 * cylinder seen from just above: every row of stitches is the FRONT half of an ellipse.
 */

export const VIEW = 1000;
export const CX = 500;

// ── tuning ────────────────────────────────────────────────────────────────
export const ROWS = 9; // row 0 is the foundation row, row 8 is the rim row
export const COLS = 13; // stitches across the visible front of each row
const ROW_PITCH = 47;
const BASE_Y = 772; // centre y of row 0's ellipse
const FLATTEN = 0.26; // ry = FLATTEN * rx  (how much we look down into the bag)
const STITCH_W = 62; // design width of one stitch before foreshortening

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

/** Burgundy ramp, dark → light. `shade()` interpolates between its steps. */
const RAMP = ["#2a0713", "#43101f", "#5c1429", "#7a1d3d", "#9a3258", "#b8537a", "#d27c9b"] as const;

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

// ── body profile ──────────────────────────────────────────────────────────
function rowRadius(t: number) {
  // Widest near the middle, narrower at the rim, like a soft pouch.
  return 232 - 30 * t + 20 * Math.sin(Math.PI * Math.min(1, t * 1.05));
}

export interface RowGeometry {
  index: number;
  cy: number;
  rx: number;
  ry: number;
  /** Front arc of the row, left → right, for the dark "backing" under the stitches. */
  arc: string;
  /** Same arc right → left, for the hook to follow on turning rows. */
  leftToRight: boolean;
  stitches: StitchGeometry[];
}

export interface StitchGeometry {
  x: number;
  y: number;
  /** Rotation in degrees so columns follow the taper of the bag. */
  rotate: number;
  /** Horizontal squash for foreshortening toward the sides. */
  scaleX: number;
  /** 0..1 position along the row in the direction the row is worked. */
  u: number;
  body: string;
  shadow: string;
  highlight: string;
  crease: string;
}

function ellipsePoint(cx: number, cy: number, rx: number, ry: number, theta: number) {
  return { x: cx + rx * Math.cos(theta), y: cy + ry * Math.sin(theta) };
}

/** θ for stitch column j (0 = left edge, COLS-1 = right edge). */
function thetaFor(j: number) {
  return Math.PI * (1 - (0.05 + 0.9 * (j / (COLS - 1))));
}

export function buildRows(): RowGeometry[] {
  const rand = mulberry32(20240611);
  const rows: RowGeometry[] = [];

  for (let i = 0; i < ROWS; i++) {
    const t = i / (ROWS - 1);
    const cy = BASE_Y - i * ROW_PITCH;
    const rx = rowRadius(t);
    const ry = rx * FLATTEN;
    const next = rowRadius(Math.min(1, (i + 1) / (ROWS - 1)));
    const leftToRight = i % 2 === 0;

    const stitches: StitchGeometry[] = [];
    for (let j = 0; j < COLS; j++) {
      const theta = thetaFor(j);
      const p = ellipsePoint(CX, cy, rx, ry, theta);

      // Foreshortened width: distance to neighbours along x.
      const left = ellipsePoint(CX, cy, rx, ry, thetaFor(Math.max(0, j - 1)));
      const right = ellipsePoint(CX, cy, rx, ry, thetaFor(Math.min(COLS - 1, j + 1)));
      const span = Math.abs(right.x - left.x) / (j === 0 || j === COLS - 1 ? 1 : 2);
      const scaleX = Math.min(1.06, Math.max(0.36, (span * 1.14) / STITCH_W));

      // Lean toward the taper of the next row.
      const up = ellipsePoint(CX, cy - ROW_PITCH, next, next * FLATTEN, theta);
      const rotate = r1((Math.atan2(up.x - p.x, p.y - up.y) * 180) / Math.PI);

      // Light from the upper left: surface normal (cosθ, sinθ) against the light direction.
      const facing = -0.52 * Math.cos(theta) + 0.66 * Math.sin(theta);
      const v = 1.6 + facing * 2.7 + t * 0.55 - 0.35 + (rand() - 0.5) * 0.55;

      stitches.push({
        x: r1(p.x),
        y: r1(p.y),
        rotate,
        scaleX: r1(scaleX * 100) / 100,
        u: 0,
        body: shade(v),
        shadow: shade(v - 2.2),
        highlight: shade(v + 1.9),
        crease: shade(v - 1.4),
      });
    }

    const x0 = CX - rx;
    const x1 = CX + rx;
    rows.push({
      index: i,
      cy,
      rx,
      ry,
      arc: `M${r1(x0)} ${r1(cy)} A${r1(rx)} ${r1(ry)} 0 0 0 ${r1(x1)} ${r1(cy)}`,
      leftToRight,
      stitches: leftToRight ? stitches : [...stitches].reverse(),
    });
    // u = how far along the row (in the direction it is worked) each stitch sits.
    rows[i].stitches.forEach((s, k) => (s.u = k / (COLS - 1)));
  }

  return rows;
}

/** One chunky V stitch, drawn around (0,0). Every stitch uses this same path. */
export const STITCH_PATH = (() => {
  const w = STITCH_W / 2;
  return `M${-w * 0.62} -21 C${-w * 0.54} 0 ${-w * 0.22} 14 0 21 C${w * 0.22} 14 ${w * 0.54} 0 ${w * 0.62} -21`;
})();
export const STITCH_STROKE = 33;

// ── rim, interior, foundation ring ────────────────────────────────────────
export function buildRim(rows: RowGeometry[]) {
  const top = rows[ROWS - 1];
  const cy = top.cy - 22;
  const rx = top.rx - 6;
  const ry = top.ry - 6;
  const ring = `M${r1(CX - rx)} ${r1(cy)} A${r1(rx)} ${r1(ry)} 0 1 0 ${r1(CX + rx)} ${r1(cy)} A${r1(rx)} ${r1(ry)} 0 1 0 ${r1(CX - rx)} ${r1(cy)}`;
  const innerRx = rx - 14;
  const innerRy = ry - 11;
  return { cx: CX, cy, rx, ry, ring, innerRx, innerRy };
}

/** The foundation: a two-turn coil of yarn lying flat at the base of the bag. */
export function buildFoundation(rows: RowGeometry[]) {
  const base = rows[0];
  const turns = 1.94;
  const steps = 96;
  const pts: [number, number][] = [];
  for (let k = 0; k <= steps; k++) {
    const s = k / steps;
    const theta = s * turns * 2 * Math.PI; // starts at the rightmost point, runs counter-clockwise on screen
    const f = 1 - 0.075 * s;
    pts.push([CX + base.rx * 1.0 * f * Math.cos(theta), base.cy + base.ry * 1.0 * f * Math.sin(theta)]);
  }
  return { d: smoothPath(pts), start: pts[0] };
}

// ── strand ────────────────────────────────────────────────────────────────
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

/** Chaikin corner-cutting: turns a coarse polyline into a smooth curve, keeping both end points. */
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
    [1250, 150],
    [1000, 120],
    [820, 250],
    [560, 210],
    [300, 120],
    [90, 230],
    [120, 450],
    [330, 540],
    [560, 470],
    [800, 520],
    [fx + 70, fy - 120],
    [fx + 14, fy - 44],
    [fx, fy],
  ];
  return { d: smoothPath(chaikin(pts, 3), 0.5) };
}

// ── handle ────────────────────────────────────────────────────────────────
export interface HandleSegment {
  /** 0..1 along the handle, used to time each twist with the hook. */
  u: number;
  x: number;
  y: number;
  angle: number;
}

export function buildHandle(rim: ReturnType<typeof buildRim>) {
  const spread = 156;
  const attachY = rim.cy + 30;
  const p0: [number, number] = [CX - spread, attachY];
  const p3: [number, number] = [CX + spread, attachY];
  const p1: [number, number] = [CX - spread - 66, attachY - 330];
  const p2: [number, number] = [CX + spread + 66, attachY - 330];
  const d = `M${p0[0]} ${p0[1]} C${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]} ${p3[0]} ${p3[1]}`;

  const at = (t: number): [number, number] => {
    const m = 1 - t;
    return [
      m * m * m * p0[0] + 3 * m * m * t * p1[0] + 3 * m * t * t * p2[0] + t * t * t * p3[0],
      m * m * m * p0[1] + 3 * m * m * t * p1[1] + 3 * m * t * t * p2[1] + t * t * t * p3[1],
    ];
  };
  const tangent = (t: number): [number, number] => {
    const m = 1 - t;
    const x = 3 * m * m * (p1[0] - p0[0]) + 6 * m * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
    const y = 3 * m * m * (p1[1] - p0[1]) + 6 * m * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
    const len = Math.hypot(x, y) || 1;
    return [x / len, y / len];
  };

  // Even spacing by arc length.
  const samples = 240;
  const lens: number[] = [0];
  let prev = at(0);
  for (let i = 1; i <= samples; i++) {
    const cur = at(i / samples);
    lens.push(lens[i - 1] + Math.hypot(cur[0] - prev[0], cur[1] - prev[1]));
    prev = cur;
  }
  const total = lens[samples];
  const tAtLength = (len: number) => {
    let lo = 0;
    let hi = samples;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (lens[mid] < len) lo = mid;
      else hi = mid;
    }
    const f = (len - lens[lo]) / ((lens[hi] - lens[lo]) || 1);
    return (lo + f) / samples;
  };

  const count = 31;
  const segments: HandleSegment[] = [];
  for (let k = 0; k < count; k++) {
    const u = (k + 0.5) / count;
    const t = tAtLength(u * total);
    const [x, y] = at(t);
    const [tx, ty] = tangent(t);
    const angle = (Math.atan2(ty, tx) * 180) / Math.PI + 58; // twist: slanted across the handle
    segments.push({ u, x: r1(x), y: r1(y), angle: r1(angle) });
  }

  /** Position at fraction u (0..1) of the handle's length. */
  const atArc = (u: number): [number, number] => at(tAtLength(Math.min(1, Math.max(0, u)) * total));

  return { d, p0, p3, segments, atArc };
}

export const bag = (() => {
  const rows = buildRows();
  const rim = buildRim(rows);
  const foundation = buildFoundation(rows);
  const strand = buildStrand(foundation.start);
  const handle = buildHandle(rim);
  return { rows, rim, foundation, strand, handle };
})();
