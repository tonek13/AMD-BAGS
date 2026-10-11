import type { ProductTheme } from "@/types/catalog";

/**
 * The Featured section tints its background to match each bag. The owner does not pick these
 * colours: they are derived from the bag's first colour so every featured bag gets a matching,
 * readable theme automatically.
 */
const DARK_INK = "#231f20";
const LIGHT_INK = "#f7ebdd";
const GOLD = "#e0bf72";
const FALLBACK: ProductTheme = { bg: "#ece0c6", ink: "#2f2418", accent: "#8a5a1c" };

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** HSL → "#rrggbb". Hex (not hsl()) so GSAP can tween the colours reliably. */
function hsl(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function deriveTheme(swatchHex: string | undefined): ProductTheme {
  const rgb = swatchHex ? parseHex(swatchHex) : null;
  if (!rgb) return FALLBACK;
  const [h, s] = rgbToHsl(rgb);

  // Deep colours (burgundy, black…) get a deep background with light text, like the original design.
  if (luminance(rgb) < 0.08) {
    return { bg: hsl(h, clamp(s * 0.7, 0, 0.6), 0.2), ink: LIGHT_INK, accent: GOLD };
  }
  // Everything else gets a soft tint of the colour with dark text.
  return {
    bg: hsl(h, clamp(s * 0.6, 0.1, 0.55), 0.86),
    ink: s < 0.12 ? DARK_INK : hsl(h, clamp(s * 0.55, 0.2, 0.6), 0.14),
    accent: hsl(h, clamp(s, 0.3, 0.75), 0.3),
  };
}
