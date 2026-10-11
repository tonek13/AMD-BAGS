/**
 * Tiny external store for the cart, persisted to localStorage.
 *
 * Built for `useSyncExternalStore`: the server (and the first client render)
 * always see an empty cart, then React swaps in the stored cart without a
 * hydration mismatch. Only `{ slug, quantity }` is stored; names, prices and
 * stock always come from the catalogue, so they can never go stale.
 */
import { siteConfig } from "@/config/site";

export interface StoredLine {
  slug: string;
  quantity: number;
}

const EMPTY: readonly StoredLine[] = Object.freeze([]);
const listeners = new Set<() => void>();

let cachedRaw: string | null | undefined;
let cachedLines: readonly StoredLine[] = EMPTY;
/** Used only if localStorage is blocked (private mode, storage disabled). */
let memoryRaw: string | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(siteConfig.cartStorageKey);
  } catch {
    return memoryRaw;
  }
}

function parse(raw: string | null): readonly StoredLine[] {
  if (!raw) return EMPTY;
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return EMPTY;
    const seen = new Set<string>();
    const lines: StoredLine[] = [];
    for (const item of data) {
      if (!item || typeof item !== "object") continue;
      const { slug, quantity } = item as Partial<StoredLine>;
      if (typeof slug !== "string" || seen.has(slug)) continue;
      if (typeof quantity !== "number" || !Number.isFinite(quantity)) continue;
      const q = Math.min(siteConfig.maxQuantityPerItem, Math.max(1, Math.floor(quantity)));
      seen.add(slug);
      lines.push({ slug, quantity: q });
    }
    return lines.length ? lines : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function getSnapshot(): readonly StoredLine[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedLines = parse(raw);
  }
  return cachedLines;
}

export function getServerSnapshot(): readonly StoredLine[] {
  return EMPTY;
}

function emit() {
  listeners.forEach((l) => l());
}

function commit(lines: readonly StoredLine[]) {
  const raw = JSON.stringify(lines);
  try {
    window.localStorage.setItem(siteConfig.cartStorageKey, raw);
  } catch {
    memoryRaw = raw;
  }
  cachedRaw = raw;
  cachedLines = lines.length ? lines : EMPTY;
  emit();
}

function onStorage(e: StorageEvent) {
  if (e.key === null || e.key === siteConfig.cartStorageKey) emit();
}

export function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

const clamp = (q: number) => Math.min(siteConfig.maxQuantityPerItem, Math.max(0, Math.floor(q)));

export function addItem(slug: string, quantity = 1) {
  const current = getSnapshot();
  const existing = current.find((l) => l.slug === slug);
  const next = existing
    ? current.map((l) => (l.slug === slug ? { slug, quantity: clamp(l.quantity + quantity) } : l))
    : [...current, { slug, quantity: clamp(quantity) }];
  commit(next.filter((l) => l.quantity > 0));
}

export function setQuantity(slug: string, quantity: number) {
  const q = clamp(quantity);
  const current = getSnapshot();
  commit(q === 0 ? current.filter((l) => l.slug !== slug) : current.map((l) => (l.slug === slug ? { slug, quantity: q } : l)));
}

export function removeItem(slug: string) {
  commit(getSnapshot().filter((l) => l.slug !== slug));
}

export function clearCart() {
  commit([]);
}
