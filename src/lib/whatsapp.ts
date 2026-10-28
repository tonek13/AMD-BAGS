/** Returns the digits of a valid international number, or null if it is empty or implausible. */
export function normalizeWhatsAppNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

/** wa.me link with an optional pre-filled message (URL-encoded). Nothing is sent until the customer presses Send. */
export function buildWhatsAppUrl(number: string, message?: string): string {
  return message ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : `https://wa.me/${number}`;
}
