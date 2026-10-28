import { siteConfig } from "@/config/site";

/**
 * Shapes and rules for an order, shared by the checkout form (browser) and POST /api/orders (server).
 * The server never trusts the browser: it runs the same validation again and recomputes every price.
 */

export const ORDER_LIMITS = {
  name: 80,
  phone: 30,
  city: 80,
  address: 300,
  notes: 500,
  maxLines: 50,
  /** Largest request body the server reads, in bytes. A real order is well under 5 KB. */
  maxBodyBytes: 20_000,
} as const;

export interface OrderCustomer {
  name: string;
  phone: string;
  city: string;
  address: string;
  /** Optional delivery notes. */
  notes: string;
}

export type CustomerErrors = Partial<Record<keyof OrderCustomer, string>>;

export interface OrderLineInput {
  slug: string;
  quantity: number;
}

/** What the browser sends. */
export interface OrderRequest {
  /** Made by the browser once per checkout, so a retry after a network error never sends two emails. */
  orderId: string;
  items: OrderLineInput[];
  customer: OrderCustomer;
  /** The total the customer saw. The order is refused if the live prices no longer add up to it. */
  expectedTotalCents: number;
  /** Honeypot: a hidden field that people leave empty and simple bots fill in. */
  website?: string;
}

export type OrderErrorCode =
  | "invalid" // the form data is not acceptable
  | "changed" // prices differ from what the customer saw
  | "unavailable" // a bag is sold out or gone
  | "rate-limited"
  | "not-configured" // email is not set up on the server
  | "email-failed"; // the email service refused or could not be reached

export type OrderResponse =
  | { ok: true; reference: string }
  | { ok: false; code: OrderErrorCode; message: string; fields?: CustomerErrors };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Short code the customer and the owner can both quote, e.g. "A1B2C3D4". */
export function orderReference(orderId: string): string {
  return orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export function isOrderId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

const PHONE_CHARS = /^[0-9+\s\-().]+$/;

export function normalizeCustomer(input: Partial<Record<keyof OrderCustomer, unknown>>): OrderCustomer {
  const clean = (v: unknown) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").trim() : "");
  return {
    name: clean(input.name),
    phone: clean(input.phone),
    city: clean(input.city),
    address: clean(input.address),
    notes: clean(input.notes),
  };
}

/** Field-by-field problems, in the words the customer sees. An empty object means the form is fine. */
export function validateCustomer(c: OrderCustomer): CustomerErrors {
  const errors: CustomerErrors = {};
  const digits = c.phone.replace(/\D/g, "");

  if (c.name.length < 2) errors.name = "Please enter your name.";
  else if (c.name.length > ORDER_LIMITS.name) errors.name = `Please keep your name under ${ORDER_LIMITS.name} characters.`;

  if (!PHONE_CHARS.test(c.phone) || digits.length < 7 || digits.length > 15 || c.phone.length > ORDER_LIMITS.phone) {
    errors.phone = "Please enter a phone number we can reach you on, with the country code if you can.";
  }

  if (c.city.length < 2) errors.city = "Please enter your city or area.";
  else if (c.city.length > ORDER_LIMITS.city) errors.city = `Please keep this under ${ORDER_LIMITS.city} characters.`;

  if (c.address.length < 5) errors.address = "Please enter your delivery address (street, building, floor).";
  else if (c.address.length > ORDER_LIMITS.address) errors.address = `Please keep your address under ${ORDER_LIMITS.address} characters.`;

  if (c.notes.length > ORDER_LIMITS.notes) errors.notes = `Please keep your note under ${ORDER_LIMITS.notes} characters.`;

  return errors;
}

/** Checks a request body from the network. Returns the cleaned order, or what is wrong with it. */
export function parseOrderRequest(
  body: unknown,
): { ok: true; value: OrderRequest } | { ok: false; message: string; fields?: CustomerErrors } {
  if (!body || typeof body !== "object") return { ok: false, message: "Expected a JSON order." };
  const b = body as Record<string, unknown>;

  if (!isOrderId(b.orderId)) return { ok: false, message: "The order is missing its reference. Please reload the page and try again." };

  if (!Array.isArray(b.items) || b.items.length === 0 || b.items.length > ORDER_LIMITS.maxLines) {
    return { ok: false, message: "Your bag is empty or too large to order in one go." };
  }
  const items: OrderLineInput[] = [];
  for (const raw of b.items) {
    const item = raw as Record<string, unknown> | null;
    const slug = item?.slug;
    const quantity = item?.quantity;
    if (typeof slug !== "string" || slug.length === 0 || slug.length > 128) return { ok: false, message: "One of the bags in your order is not valid." };
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > siteConfig.maxQuantityPerItem) {
      return { ok: false, message: `You can order between 1 and ${siteConfig.maxQuantityPerItem} of each bag.` };
    }
    if (items.some((i) => i.slug === slug)) return { ok: false, message: "A bag appears twice in your order." };
    items.push({ slug, quantity });
  }

  const customer = normalizeCustomer((b.customer ?? {}) as Record<string, unknown>);
  const fields = validateCustomer(customer);
  if (Object.keys(fields).length > 0) return { ok: false, message: "Please check your details.", fields };

  const expected = b.expectedTotalCents;
  if (typeof expected !== "number" || !Number.isInteger(expected) || expected < 0) {
    return { ok: false, message: "The order total is missing. Please reload the page and try again." };
  }

  return {
    ok: true,
    value: {
      orderId: b.orderId,
      items,
      customer,
      expectedTotalCents: expected,
      website: typeof b.website === "string" ? b.website : undefined,
    },
  };
}
