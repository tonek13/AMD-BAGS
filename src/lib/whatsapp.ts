import { siteConfig } from "@/config/site";
import { formatMoney } from "@/lib/format";

export interface OrderLine {
  name: string;
  quantity: number;
  unitPrice: number;
}

/** Returns the digits of a valid international number, or null if it is empty or implausible. */
export function normalizeWhatsAppNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

/** Plain-text order message. The customer reviews it and presses Send in WhatsApp. */
export function buildOrderMessage(lines: OrderLine[], totalCents: number): string {
  const items = lines
    .map((l) => `• ${l.quantity} × ${l.name} — ${formatMoney(l.unitPrice * l.quantity)}`)
    .join("\n");

  return [
    `Hello ${siteConfig.brandName}! I'd like to order:`,
    "",
    items,
    "",
    `Total: ${formatMoney(totalCents / 100)}`,
    "",
    "Please confirm availability and delivery. Thank you!",
  ].join("\n");
}

/** wa.me link with the message pre-filled (URL-encoded). Nothing is sent until the customer presses Send. */
export function buildWhatsAppUrl(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
