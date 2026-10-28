import "server-only";

/** The visitor's address as the hosting platform reports it (Vercel sets these itself; a visitor cannot choose them). */
export function clientIp(request: Request): string {
  const h = request.headers;
  return (
    h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/**
 * True when a browser says another website caused this request (a hidden form or script on someone
 * else's page trying to place an order in a visitor's name). Browsers always send these headers on
 * such requests. Tools that send neither header (curl, scripts) pass: this stops cross-site browser
 * tricks, it does not stop bots (the rate limits do that).
 */
export function isCrossSiteRequest(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return true;

  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(",")[0].trim();
  try {
    return !host || new URL(origin).host !== host;
  } catch {
    return true;
  }
}

/** A JSON body. (A plain form post or text/plain body, which another site can send, is refused.) */
export function isJsonRequest(request: Request): boolean {
  return (request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json");
}

/** Declared body size in bytes, or null when the request does not say. */
export function declaredLength(request: Request): number | null {
  const value = Number(request.headers.get("content-length"));
  return Number.isFinite(value) && value >= 0 && request.headers.has("content-length") ? value : null;
}
