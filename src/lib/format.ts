import { siteConfig } from "@/config/site";
import type { Availability } from "@/types/catalog";

const wholeFormatter = new Intl.NumberFormat(siteConfig.locale, {
  style: "currency",
  currency: siteConfig.currency,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const exactFormatter = new Intl.NumberFormat(siteConfig.locale, {
  style: "currency",
  currency: siteConfig.currency,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "$88" for whole amounts, "$88.50" otherwise. Fixed locale so server and client agree. */
export function formatPrice(amount: number): string {
  return Number.isInteger(amount) ? wholeFormatter.format(amount) : exactFormatter.format(amount);
}

/** Always two decimals – used in order messages and totals. */
export function formatMoney(amount: number): string {
  return exactFormatter.format(amount);
}

/** Money maths in integer cents to avoid floating point drift. */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export const availabilityLabel: Record<Availability, string> = {
  "in-stock": "In stock",
  "made-to-order": "Made to order",
  "sold-out": "Sold out",
};
