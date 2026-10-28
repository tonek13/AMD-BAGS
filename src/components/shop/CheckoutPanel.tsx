"use client";

import { useRef, useState } from "react";
import { fromCents } from "@/lib/format";
import {
  ORDER_LIMITS,
  normalizeCustomer,
  validateCustomer,
  type CustomerErrors,
  type OrderCustomer,
  type OrderRequest,
  type OrderResponse,
} from "@/lib/orders";
import type { CartLineView } from "@/lib/cart-lines";
import { useShop } from "./shop-context";
import styles from "./CartDrawer.module.css";

const ORDER_TIMEOUT_MS = 20_000;

export const emptyCustomer: OrderCustomer = { name: "", phone: "", city: "", address: "", notes: "" };

/** One id per checkout attempt; the server uses it so a retry never sends the owner a second email. */
export function newOrderId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export interface PlacedOrder {
  reference: string;
  name: string;
  phone: string;
  totalCents: number;
}

interface CheckoutPanelProps {
  /** The bags that will be ordered (sold-out and removed ones are already left out). */
  lines: CartLineView[];
  totalCents: number;
  values: OrderCustomer;
  onValuesChange: (next: OrderCustomer) => void;
  orderId: string;
  onBack: () => void;
  onClose: () => void;
  onPlaced: (order: PlacedOrder) => void;
  /** The shop's prices or stock changed under the customer: go back to the bag to review. */
  onNeedsReview: (message: string) => void;
}

const FIELD_ORDER: (keyof OrderCustomer)[] = ["name", "phone", "city", "address", "notes"];

export function CheckoutPanel({ lines, totalCents, values, onValuesChange, orderId, onBack, onClose, onPlaced, onNeedsReview }: CheckoutPanelProps) {
  const { formatMoney, clearCart } = useShop();
  const [errors, setErrors] = useState<CustomerErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);

  const total = formatMoney(fromCents(totalCents));
  const count = lines.reduce((n, l) => n + l.quantity, 0);

  function set(field: keyof OrderCustomer, value: string) {
    onValuesChange({ ...values, [field]: value });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function focusFirst(problems: CustomerErrors) {
    const first = FIELD_ORDER.find((f) => problems[f]);
    if (first) form.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);

    const customer = normalizeCustomer(values);
    const problems = validateCustomer(customer);
    if (Object.keys(problems).length > 0) {
      setErrors(problems);
      focusFirst(problems);
      return;
    }

    const payload: OrderRequest = {
      orderId,
      items: lines.map((l) => ({ slug: l.slug, quantity: l.quantity })),
      customer,
      expectedTotalCents: totalCents,
      website: honeypot.current?.value ?? "",
    };

    setSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: AbortSignal.timeout(ORDER_TIMEOUT_MS),
      });
      const result = (await response.json().catch(() => null)) as OrderResponse | null;

      if (result?.ok) {
        clearCart();
        onPlaced({ reference: result.reference, name: customer.name, phone: customer.phone, totalCents });
        return;
      }
      if (result && !result.ok) {
        if (result.code === "changed" || result.code === "unavailable") {
          onNeedsReview(result.message);
          return;
        }
        if (result.fields && Object.keys(result.fields).length > 0) {
          setErrors(result.fields);
          focusFirst(result.fields);
        }
        setFormError(result.message);
        return;
      }
      setFormError("We couldn’t place your order just now. Please try again in a moment.");
    } catch (error) {
      console.warn("[checkout] the order could not be sent", error);
      setFormError("We couldn’t reach the shop. Please check your connection and try again. Your details are still here.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={onBack} disabled={submitting}>
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <path d="M17 10H4M9 4l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Bag
        </button>
        <h2 className={styles.title}>Checkout</h2>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close checkout">
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
            <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <div className={styles.checkoutScroll}>
        <ul className={styles.summary} aria-label="Your order">
          {lines.map((l) => (
            <li key={l.slug}>
              <span>
                {l.quantity} × {l.name}
              </span>
              <span>{formatMoney(fromCents(l.lineCents))}</span>
            </li>
          ))}
        </ul>

        <form id="checkout-form" ref={form} className={styles.form} onSubmit={submit} noValidate>
          <p className={styles.formTitle}>Where should we deliver?</p>

          <Field id="co-name" label="Full name" error={errors.name}>
            <input
              id="co-name"
              name="name"
              type="text"
              autoComplete="name"
              maxLength={ORDER_LIMITS.name}
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? "co-name-error" : undefined}
              required
            />
          </Field>

          <Field id="co-phone" label="Phone number" error={errors.phone} hint="We’ll call or message you to confirm the delivery.">
            <input
              id="co-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={ORDER_LIMITS.phone}
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
              aria-invalid={errors.phone ? true : undefined}
              aria-describedby={errors.phone ? "co-phone-error" : "co-phone-hint"}
              required
            />
          </Field>

          <Field id="co-city" label="City or area" error={errors.city}>
            <input
              id="co-city"
              name="city"
              type="text"
              autoComplete="address-level2"
              maxLength={ORDER_LIMITS.city}
              value={values.city}
              onChange={(e) => set("city", e.target.value)}
              aria-invalid={errors.city ? true : undefined}
              aria-describedby={errors.city ? "co-city-error" : undefined}
              required
            />
          </Field>

          <Field id="co-address" label="Address" error={errors.address} hint="Street, building, floor, landmark…">
            <textarea
              id="co-address"
              name="address"
              rows={3}
              autoComplete="street-address"
              maxLength={ORDER_LIMITS.address}
              value={values.address}
              onChange={(e) => set("address", e.target.value)}
              aria-invalid={errors.address ? true : undefined}
              aria-describedby={errors.address ? "co-address-error" : "co-address-hint"}
              required
            />
          </Field>

          <Field id="co-notes" label="Delivery notes (optional)" error={errors.notes}>
            <textarea
              id="co-notes"
              name="notes"
              rows={2}
              maxLength={ORDER_LIMITS.notes}
              value={values.notes}
              onChange={(e) => set("notes", e.target.value)}
              aria-invalid={errors.notes ? true : undefined}
              aria-describedby={errors.notes ? "co-notes-error" : undefined}
            />
          </Field>

          {/* Honeypot: people never see or fill this; simple bots do. */}
          <div className={styles.hp} aria-hidden="true">
            <label>
              Website
              <input ref={honeypot} name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
            </label>
          </div>

          <div className={styles.payment}>
            <span className={styles.paymentDot} aria-hidden="true" />
            <div>
              <p className={styles.paymentTitle}>Cash on delivery</p>
              <p className={styles.paymentText}>Pay in cash when your order arrives. There is no online payment.</p>
            </div>
          </div>
        </form>
      </div>

      <footer className={styles.footer}>
        <div className={styles.subtotal}>
          <span>
            Total · {count} {count === 1 ? "bag" : "bags"}
          </span>
          <strong>{total}</strong>
        </div>
        <button type="submit" form="checkout-form" className="btn" disabled={submitting}>
          {submitting ? "Placing your order…" : "Confirm order"}
        </button>
        <p className={`${styles.status} ${formError ? styles.error : ""}`} role={formError ? "alert" : "status"} aria-live="polite">
          {formError}
        </p>
      </footer>
    </div>
  );
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className={`${styles.field} ${error ? styles.invalid : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <p id={`${id}-error`} className={styles.fieldError}>
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className={styles.fieldHint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
