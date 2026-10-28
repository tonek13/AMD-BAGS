import { NextResponse } from "next/server";
import { parseCheckRequest, type CartCheckItem } from "@/lib/cart-check";
import { lookupLiveProducts } from "@/lib/live-products";

/**
 * Live price and availability for the bags in a customer's cart.
 *
 * The storefront page is cached, so before a customer orders (and whenever they open their bag)
 * the browser asks this endpoint for the current truth straight from Sanity. A bag that is
 * missing from the answer was deleted, unpublished or hidden. Read-only; responses are never cached.
 */
const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
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
  if (slugs.length === 0) return NextResponse.json({ items: [] }, { headers: NO_STORE });

  try {
    const live = await lookupLiveProducts(slugs);
    const items: CartCheckItem[] = slugs.map((slug) => {
      const product = live.get(slug);
      if (!product) return { slug, found: false };
      return { slug, found: true, name: product.name, price: product.price, availability: product.availability };
    });
    return NextResponse.json({ items }, { headers: NO_STORE });
  } catch (error) {
    console.error("[catalog/check] could not read the shop data", error);
    return NextResponse.json({ error: "The shop data is unavailable right now." }, { status: 503, headers: NO_STORE });
  }
}
