import { createImageUrlBuilder } from "@sanity/image-url";
import type { ProductImage } from "@/types/catalog";
import { dataset, projectId } from "@/sanity/env";

/** An image as returned by our GROQ projections (the asset reference is flattened to `ref`). */
export interface RawImage {
  ref?: string | null;
  alt?: string | null;
  crop?: { top?: number; bottom?: number; left?: number; right?: number } | null;
  hotspot?: { x?: number; y?: number; width?: number; height?: number } | null;
}

/** Longest edge we ask Sanity for; Next.js then resizes per device. */
const MAX_SOURCE_EDGE = 2400;

/** "image-<id>-<width>x<height>-<format>" → intrinsic size. */
function sizeFromRef(ref: string): { width: number; height: number } | null {
  const match = /^image-[A-Za-z0-9]+-(\d+)x(\d+)-[a-z0-9]+$/.exec(ref);
  return match ? { width: Number(match[1]), height: Number(match[2]) } : null;
}

const clamp01 = (n: number | null | undefined) => Math.min(1, Math.max(0, Number.isFinite(n) ? (n as number) : 0));

/**
 * Turns a Sanity image into the `ProductImage` the storefront already renders:
 * - the editor's crop is applied by Sanity (a `rect` in the URL), so the size we report is the cropped size;
 * - the editor's hotspot becomes the focal point used when a frame crops the photo;
 * - the URL points at cdn.sanity.io, which `next/image` optimises like any other remote image.
 * Returns null for an image without a usable asset.
 */
export function toProductImage(raw: RawImage | null | undefined, fallbackAlt: string): ProductImage | null {
  if (!raw?.ref) return null;
  const size = sizeFromRef(raw.ref);
  if (!size || !projectId || !dataset) return null;

  const left = clamp01(raw.crop?.left);
  const right = clamp01(raw.crop?.right);
  const top = clamp01(raw.crop?.top);
  const bottom = clamp01(raw.crop?.bottom);
  const cropW = Math.max(1, Math.round(size.width * (1 - left - right)));
  const cropH = Math.max(1, Math.round(size.height * (1 - top - bottom)));

  const scale = Math.min(1, MAX_SOURCE_EDGE / Math.max(cropW, cropH));
  const width = Math.max(1, Math.round(cropW * scale));
  const height = Math.max(1, Math.round(cropH * scale));

  const builder = createImageUrlBuilder({
    projectId,
    dataset,
    ...(process.env.SANITY_CDN_BASE_URL ? { baseUrl: process.env.SANITY_CDN_BASE_URL } : {}),
  });
  let url = builder.image({ _type: "image", asset: { _type: "reference", _ref: raw.ref } });

  // Vector logos are served as-is: no resize parameters, so the URL ends in ".svg" and next/image
  // (which does not optimise SVG) passes it through untouched. Crop and hotspot do not apply to them.
  if (raw.ref.endsWith("-svg")) {
    return { src: url.url(), alt: (raw.alt ?? "").trim() || fallbackAlt, width: size.width, height: size.height };
  }

  if (left || right || top || bottom) {
    url = url.rect(Math.round(size.width * left), Math.round(size.height * top), cropW, cropH);
  }
  const src = url.width(width).height(height).fit("max").url();

  const focal =
    raw.hotspot && Number.isFinite(raw.hotspot.x) && Number.isFinite(raw.hotspot.y)
      ? { x: Math.round(clamp01(raw.hotspot.x) * 100), y: Math.round(clamp01(raw.hotspot.y) * 100) }
      : undefined;

  return { src, alt: (raw.alt ?? "").trim() || fallbackAlt, width, height, focal };
}
