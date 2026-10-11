import type { Availability } from "@/types/catalog";

export interface Formatters {
  /** "$88" for whole amounts, "$88.50" otherwise. */
  formatPrice: (amount: number) => string;
  /** Always two decimals – used in order messages and totals. */
  formatMoney: (amount: number) => string;
}

/**
 * Currency formatting for the shop. The currency comes from Shop Settings; the locale is fixed so
 * the server render and the browser always format prices identically.
 */
export function createFormatters(currency: string, locale: string): Formatters {
  const options = { style: "currency", currency } as const;
  const whole = new Intl.NumberFormat(locale, { ...options, minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const exact = new Intl.NumberFormat(locale, { ...options, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return {
    formatPrice: (amount) => (Number.isInteger(amount) ? whole.format(amount) : exact.format(amount)),
    formatMoney: (amount) => exact.format(amount),
  };
}

/** Money maths in integer cents to avoid floating point drift. */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export const availabilityLabel: Record<Availability, string> = {
  "in-stock": "Available",
  "sold-out": "Sold out",
};
