import { NextResponse } from "next/server";
import { parseCheckRequest, type CartCheckItem } from "@/lib/cart-check";
import { lookupLiveShop } from "@/lib/live-products";
import { tooManyRequests } from "@/lib/rate-limit";
import { clientIp, declaredLength, isCrossSiteRequest, isJsonRequest } from "@/lib/request-guard";

/**
 * Live price and availability for the bags in a customer's cart.
 *
 * The storefront page is cached, so before a customer orders (and whenever they open their bag)
 * the browser asks this endpoint for the current truth straight from Sanity. A bag that is
 * missing from the answer was deleted, unpublished or hidden. Read-only; responses are never cached.
 */
const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (isCrossSiteRequest(request)) return NextResponse.json({ error: "Not allowed." }, { status: 403, headers: NO_STORE });
  if (!isJsonRequest(request)) return NextResponse.json({ error: "Expected a JSON body." }, { status: 415, headers: NO_STORE });
  const declared = declaredLength(request);
  if (declared !== null && declared > 10_000) return NextResponse.json({ error: "Too large." }, { status: 413, headers: NO_STORE });

  // Each check reads the shop's live data, so it is limited per visitor (60 a minute is far above real use).
  const limit = Number(process.env.CHECK_RATE_LIMIT_MAX) || 60;
  if (tooManyRequests(`check:${clientIp(request)}`, limit, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429, headers: { ...NO_STORE, "Retry-After": "60" } });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400, headers: NO_STORE });
  }

  const slugs = parseCheckRequest(body);
  if (!slugs) {
    return NextResponse.json({ error: "Expected { slugs: string[] } with at most 50 slugs." }, { status: 400, headers: NO_STORE });
  }
  if (slugs.length === 0) return NextResponse.json({ items: [], offers: [], deliveryFee: 0 }, { headers: NO_STORE });

  try {
    const live = await lookupLiveShop(slugs);
    const items: CartCheckItem[] = slugs.map((slug) => {
      const product = live.products.get(slug);
      if (!product) return { slug, found: false };
      return { slug, found: true, name: product.name, price: product.price, availability: product.availability };
    });
    return NextResponse.json({ items, offers: live.offers, deliveryFee: live.deliveryFee }, { headers: NO_STORE });
  } catch (error) {
    console.error("[catalog/check] could not read the shop data", error);
    return NextResponse.json({ error: "The shop data is unavailable right now." }, { status: 503, headers: NO_STORE });
  }
}
