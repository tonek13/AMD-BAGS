"use client";

import { useRef, useState } from "react";
import Image from "next/image";
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
import cart from "./CartDrawer.module.css";
import styles from "./Checkout.module.css";

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
  const { formatMoney, formatPrice, clearCart } = useShop();
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
    <div className={cart.panel}>
      <header className={cart.header}>
        <h2 className={cart.title}>Checkout</h2>
        <button type="button" className={cart.close} onClick={onClose} aria-label="Close checkout">
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
            <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <ol className={styles.steps} aria-label="Checkout progress">
        <li>
          <button type="button" className={`${styles.step} ${styles.stepDone}`} onClick={onBack} disabled={submitting}>
            <span className={styles.stepNo} aria-hidden="true">
              ✓
            </span>
            Bag
          </button>
        </li>
        <li className={styles.stepLine} aria-hidden="true" />
        <li>
          <span className={`${styles.step} ${styles.current}`} aria-current="step">
            <span className={styles.stepNo} aria-hidden="true">
              2
            </span>
            Details
          </span>
        </li>
        <li className={styles.stepLine} aria-hidden="true" />
        <li>
          <span className={styles.step}>
            <span className={styles.stepNo} aria-hidden="true">
              3
            </span>
            Done
          </span>
        </li>
      </ol>

      <div className={styles.scroll}>
        <section className={styles.summary} aria-label="Your order">
          <ul className={styles.summaryList}>
            {lines.map((l) => {
              const photo = l.product?.images[0];
              return (
                <li key={l.slug} className={styles.item}>
                  <div className={styles.thumb}>
                    <span className={styles.qty} aria-hidden="true">
                      {l.quantity}
                    </span>
                    {photo && (
                      <div className={styles.thumbImg} style={{ position: "absolute", inset: 0 }}>
                        <Image
                          src={photo.src}
                          alt=""
                          fill
                          sizes="58px"
                          style={{ objectFit: "cover", objectPosition: `${photo.focal?.x ?? 50}% ${photo.focal?.y ?? 50}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className={styles.itemName}>{l.name}</p>
                    <p className={styles.itemUnit}>
                      <span className="sr-only">Quantity {l.quantity}, </span>
                      {formatPrice(l.unitPrice)} each
                    </p>
                  </div>
                  <p className={styles.itemTotal}>{formatMoney(fromCents(l.lineCents))}</p>
                </li>
              );
            })}
          </ul>
          <div className={styles.totalRow}>
            <span>Total</span>
            <strong>{total}</strong>
          </div>
        </section>

        <form id="checkout-form" ref={form} className={styles.form} onSubmit={submit} noValidate>
          <fieldset className={styles.section}>
            <legend className={styles.sectionTitle}>Contact</legend>
            <Field id="co-name" label="Full name" error={errors.name}>
              <input
                id="co-name"
                name="name"
                type="text"
                placeholder=" "
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
                placeholder=" "
                autoComplete="tel"
                maxLength={ORDER_LIMITS.phone}
                value={values.phone}
                onChange={(e) => set("phone", e.target.value)}
                aria-invalid={errors.phone ? true : undefined}
                aria-describedby={errors.phone ? "co-phone-error" : "co-phone-hint"}
                required
              />
            </Field>
          </fieldset>

          <fieldset className={styles.section}>
            <legend className={styles.sectionTitle}>Delivery address</legend>
            <Field id="co-city" label="City or area" error={errors.city}>
              <input
                id="co-city"
                name="city"
                type="text"
                placeholder=" "
                autoComplete="address-level2"
                maxLength={ORDER_LIMITS.city}
                value={values.city}
                onChange={(e) => set("city", e.target.value)}
                aria-invalid={errors.city ? true : undefined}
                aria-describedby={errors.city ? "co-city-error" : undefined}
                required
              />
            </Field>
            <Field id="co-address" label="Street, building, floor" error={errors.address}>
              <textarea
                id="co-address"
                name="address"
                rows={2}
                placeholder=" "
                autoComplete="street-address"
                maxLength={ORDER_LIMITS.address}
                value={values.address}
                onChange={(e) => set("address", e.target.value)}
                aria-invalid={errors.address ? true : undefined}
                aria-describedby={errors.address ? "co-address-error" : undefined}
                required
              />
            </Field>
            <Field id="co-notes" label="Delivery notes (optional)" error={errors.notes}>
              <textarea
                id="co-notes"
                name="notes"
                rows={2}
                placeholder=" "
                maxLength={ORDER_LIMITS.notes}
                value={values.notes}
                onChange={(e) => set("notes", e.target.value)}
                aria-invalid={errors.notes ? true : undefined}
                aria-describedby={errors.notes ? "co-notes-error" : undefined}
              />
            </Field>
          </fieldset>

          {/* Honeypot: people never see or fill this; simple bots do. */}
          <div className={styles.hp} aria-hidden="true">
            <label>
              Website
              <input ref={honeypot} name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
            </label>
          </div>

          <fieldset className={styles.section}>
            <legend className={styles.sectionTitle}>Payment</legend>
            <div className={styles.pay}>
              <span className={styles.radio} aria-hidden="true" />
              <div className={styles.payText}>
                <p className={styles.payTitle}>Cash on delivery</p>
                <p className={styles.payNote}>Pay in cash when your order arrives. Nothing to pay online.</p>
              </div>
              <svg className={styles.payIcon} viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">
                <rect x="3" y="7" width="22" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
                <circle cx="14" cy="14" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
                <path d="M7 10.5v.01M21 17.5v.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>
          </fieldset>
        </form>

        <ul className={styles.trust}>
          <li>
            <Tick />
            Every bag is made by hand
          </li>
          <li>
            <Tick />
            We confirm every order by phone
          </li>
          <li>
            <Tick />
            No account needed
          </li>
        </ul>
      </div>

      <footer className={styles.bar}>
        <div className={styles.barTotal}>
          <span>
            Total · {count} {count === 1 ? "bag" : "bags"}
          </span>
          <strong>{total}</strong>
        </div>
        <button type="submit" form="checkout-form" className={`btn ${styles.confirm}`} disabled={submitting}>
          {submitting ? "Placing your order…" : "Confirm order"}
        </button>
        <p className={`${cart.status} ${formError ? cart.error : ""}`} role={formError ? "alert" : "status"} aria-live="polite">
          {formError}
        </p>
      </footer>
    </div>
  );
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className={`${styles.field} ${error ? styles.invalid : ""}`}>
      <div className={styles.control}>
        {children}
        <label htmlFor={id}>{label}</label>
      </div>
      {error ? (
        <p id={`${id}-error`} className={styles.error}>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 4.5v4M8 11v.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 18 18" width="16" height="16" aria-hidden="true">
      <circle cx="9" cy="9" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 9.2l2.4 2.4 4.6-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
