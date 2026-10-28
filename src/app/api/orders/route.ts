import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getShopSettings } from "@/lib/catalog";
import { getOrderEmailEnv } from "@/lib/env";
import { createFormatters, toCents } from "@/lib/format";
import { lookupLiveShop } from "@/lib/live-products";
import { buildOrderEmail, type OrderEmailLine } from "@/lib/order-email";
import { ORDER_LIMITS, orderReference, parseOrderRequest, type OrderErrorCode, type OrderResponse } from "@/lib/orders";
import { computePricing } from "@/lib/pricing";
import { tooManyRequests } from "@/lib/rate-limit";
import { clientIp, declaredLength, isCrossSiteRequest, isJsonRequest } from "@/lib/request-guard";

/**
 * Places an order: checks it against the live shop, then emails it to the shop owner (Resend).
 * There is no online payment; the customer pays cash on delivery.
 *
 * Everything the customer typed is validated again here, and every price is read from the shop's
 * current data: the browser's idea of the prices is only used to notice that they have changed.
 */
const NO_STORE = { "Cache-Control": "no-store" };

const STATUS: Record<OrderErrorCode, number> = {
  invalid: 400,
  forbidden: 403,
  unsupported: 415,
  "too-large": 413,
  changed: 409,
  unavailable: 409,
  "rate-limited": 429,
  "not-configured": 503,
  "email-failed": 502,
};

function fail(code: OrderErrorCode, message: string, fields?: Extract<OrderResponse, { ok: false }>["fields"]) {
  const body: OrderResponse = { ok: false, code, message, fields };
  return NextResponse.json(body, { status: STATUS[code], headers: NO_STORE });
}

export async function POST(request: Request) {
  // Cheap checks first, before anything is read or any limit is spent.
  if (isCrossSiteRequest(request)) return fail("forbidden", "This request did not come from the shop.");
  if (!isJsonRequest(request)) return fail("unsupported", "Expected a JSON order.");
  const declared = declaredLength(request);
  if (declared !== null && declared > ORDER_LIMITS.maxBodyBytes) return fail("too-large", "That order is too large.");

  const ip = clientIp(request);
  // Every attempt counts, valid or not, so a flood of junk cannot keep the server busy for free.
  const limit = Number(process.env.ORDER_RATE_LIMIT_MAX) || 8;
  if (tooManyRequests(`order-attempt:${ip}`, Math.max(30, limit * 4), 10 * 60_000)) {
    return fail("rate-limited", "Too many attempts. Please wait a few minutes and try again.");
  }

  const raw = await request.text();
  if (raw.length > ORDER_LIMITS.maxBodyBytes) return fail("too-large", "That order is too large.");

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail("invalid", "Expected a JSON order.");
  }

  const parsed = parseOrderRequest(body);
  if (!parsed.ok) return fail("invalid", parsed.message, parsed.fields);
  const order = parsed.value;
  const reference = orderReference(order.orderId);

  // The honeypot field is invisible to people. A bot that filled it gets a convincing "thank you" and nothing is sent.
  if (order.website) return NextResponse.json({ ok: true, reference } satisfies OrderResponse, { headers: NO_STORE });

  // 8 orders per address per 10 minutes, and 8 per phone number per hour, so rotating addresses does not help
  // (ORDER_RATE_LIMIT_MAX changes the 8; the tests raise it).
  const phoneDigits = order.customer.phone.replace(/\D/g, "");
  if (tooManyRequests(`order:${ip}`, limit, 10 * 60_000) || tooManyRequests(`order-phone:${phoneDigits}`, limit, 60 * 60_000)) {
    return fail("rate-limited", "Too many attempts. Please wait a few minutes and try again.");
  }

  let settings;
  try {
    settings = await getShopSettings();
  } catch (error) {
    console.error("[orders] could not read the shop settings", error);
    return fail("email-failed", "We couldn’t place your order just now. Please try again in a moment.");
  }

  const emailEnv = getOrderEmailEnv(settings.brandName);
  if (!emailEnv.ok) {
    console.error(`[orders] order ${reference} was NOT sent. Email is not configured:\n  - ${emailEnv.problems.join("\n  - ")}`);
    return fail("not-configured", "Ordering is not open yet. Please contact the shop directly.");
  }

  // Prices, stock, offers and the delivery fee as they are right now.
  let live;
  try {
    live = await lookupLiveShop(order.items.map((i) => i.slug));
  } catch (error) {
    console.error("[orders] could not read the shop data", error);
    return fail("email-failed", "We couldn’t check the latest prices just now. Please try again in a moment.");
  }

  const lines: OrderEmailLine[] = [];
  for (const item of order.items) {
    const product = live.products.get(item.slug);
    if (!product || product.availability === "sold-out") {
      return fail("unavailable", "Something in your bag is no longer available. We’ve updated your bag; please review it.");
    }
    lines.push({
      name: product.name,
      quantity: item.quantity,
      unitPrice: product.price,
      lineCents: toCents(product.price) * item.quantity,
    });
  }
  const pricing = computePricing(
    order.items.map((item, i) => ({ slug: item.slug, quantity: item.quantity, unitCents: lines[i].lineCents / item.quantity })),
    live.offers,
    toCents(live.deliveryFee),
  );
  if (pricing.totalCents !== order.expectedTotalCents) {
    return fail("changed", "Some prices, offers or the delivery fee changed since you opened your bag. We’ve updated it; please review the total.");
  }

  const { formatMoney } = createFormatters(settings.currency, settings.locale);
  const email = buildOrderEmail({
    brandName: settings.brandName,
    reference,
    customer: order.customer,
    lines,
    pricing,
    formatMoney,
  });

  try {
    const resend = new Resend(emailEnv.value.apiKey);
    // The idempotency key makes a retry of this same checkout (e.g. after a dropped connection) safe: no second email.
    const { error } = await resend.emails.send(
      { from: emailEnv.value.from, to: emailEnv.value.to, subject: email.subject, html: email.html, text: email.text },
      { idempotencyKey: `order-${order.orderId}` },
    );
    if (error) throw new Error(`${error.name}: ${error.message}`);
  } catch (error) {
    console.error(`[orders] order ${reference} was NOT emailed`, error);
    return fail("email-failed", "We couldn’t send your order just now. Please try again in a moment.");
  }

  return NextResponse.json({ ok: true, reference } satisfies OrderResponse, { headers: NO_STORE });
}
