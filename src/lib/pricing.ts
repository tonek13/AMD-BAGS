import type { Offer } from "@/types/catalog";

/**
 * How an order adds up: bags (already at their current, possibly sale, price), minus any
 * "buy X, get Y free" offers, plus the delivery fee. Shared by the browser (what the customer
 * sees) and the server (what is actually charged), so both always agree. All money is in cents.
 */

export interface PricingLine {
  slug: string;
  quantity: number;
  unitCents: number;
}

export interface PricingDiscount {
  offerId: string;
  title: string;
  /** Number of bags given free by this offer. */
  units: number;
  cents: number;
}

export interface Pricing {
  subtotalCents: number;
  discounts: PricingDiscount[];
  discountCents: number;
  deliveryCents: number;
  totalCents: number;
}

/** "Buy 2, get 1 free". */
export function offerRule(offer: Pick<Offer, "buy" | "free">): string {
  return `Buy ${offer.buy}, get ${offer.free} free`;
}

export function computePricing(lines: readonly PricingLine[], offers: readonly Offer[], deliveryCents: number): Pricing {
  const subtotalCents = lines.reduce((sum, l) => sum + l.unitCents * l.quantity, 0);

  // A bag belongs to at most one offer: the first one that lists it.
  const offerOf = new Map<string, Offer>();
  for (const offer of offers) for (const slug of offer.slugs) if (!offerOf.has(slug)) offerOf.set(slug, offer);

  const unitsByOffer = new Map<Offer, number[]>();
  for (const line of lines) {
    const offer = offerOf.get(line.slug);
    if (!offer) continue;
    const units = unitsByOffer.get(offer) ?? [];
    for (let i = 0; i < line.quantity; i++) units.push(line.unitCents);
    unitsByOffer.set(offer, units);
  }

  const discounts: PricingDiscount[] = [];
  for (const [offer, units] of unitsByOffer) {
    const group = offer.buy + offer.free;
    const freeUnits = Math.floor(units.length / group) * offer.free;
    if (freeUnits === 0) continue;
    // The cheapest bags are the free ones.
    const cents = [...units].sort((a, b) => a - b).slice(0, freeUnits).reduce((sum, c) => sum + c, 0);
    discounts.push({ offerId: offer.id, title: offer.title, units: freeUnits, cents });
  }

  const discountCents = discounts.reduce((sum, d) => sum + d.cents, 0);
  const safeDelivery = Number.isFinite(deliveryCents) && deliveryCents > 0 ? Math.round(deliveryCents) : 0;
  return {
    subtotalCents,
    discounts,
    discountCents,
    deliveryCents: lines.length > 0 ? safeDelivery : 0,
    totalCents: subtotalCents - discountCents + (lines.length > 0 ? safeDelivery : 0),
  };
}
