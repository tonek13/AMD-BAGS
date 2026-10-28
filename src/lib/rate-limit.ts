import "server-only";

/**
 * A small in-memory limiter: at most `limit` hits per `windowMs` for one key (an IP address).
 * It lives in one server instance, so it is a speed bump against someone hammering the order
 * form (each order sends the owner an email), not a hard guarantee.
 */
const hits = new Map<string, number[]>();
const MAX_KEYS = 5000;

export function tooManyRequests(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);

  if (hits.size > MAX_KEYS) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= windowMs)) hits.delete(k);
    }
  }
  return false;
}
