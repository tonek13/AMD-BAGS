"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { fromCents } from "@/lib/format";
import { scrollToTarget } from "@/lib/scroll";
import { buildOrderMessage, buildWhatsAppUrl, normalizeWhatsAppNumber } from "@/lib/whatsapp";
import type { CartLineView } from "@/lib/cart-lines";
import { ModalDialog } from "./ModalDialog";
import { QuantityStepper } from "./QuantityStepper";
import { useShop } from "./shop-context";
import styles from "./CartDrawer.module.css";

type CopyState = "idle" | "copied" | "failed";

export function CartDrawer() {
  const {
    settings,
    formatMoney,
    formatPrice,
    lines,
    count,
    subtotalCents,
    cartOpen,
    closeCart,
    setQuantity,
    removeFromCart,
    openProduct,
    refreshCart,
    checkingCart,
    notices,
    dismissNotices,
  } = useShop();
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "info" | "error"; text: string } | null>(null);
  const copyTimer = useRef<number | undefined>(undefined);
  const previewRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const orderable = useMemo(() => lines.filter((l) => l.available), [lines]);
  const blocked = lines.length - orderable.length;
  const message = useMemo(
    () =>
      buildOrderMessage(
        settings.brandName,
        orderable.map((l) => ({ name: l.name, quantity: l.quantity, unitPrice: l.unitPrice })),
        subtotalCents,
        formatMoney,
      ),
    [orderable, subtotalCents, settings.brandName, formatMoney],
  );
  const number = normalizeWhatsAppNumber(settings.whatsappNumber);

  function messageFor(fresh: CartLineView[], totalCents: number) {
    return buildOrderMessage(
      settings.brandName,
      fresh.map((l) => ({ name: l.name, quantity: l.quantity, unitPrice: l.unitPrice })),
      totalCents,
      formatMoney,
    );
  }

  /**
   * The step every order goes through: check the live prices first. If anything differs from what
   * the customer was looking at, explain it and stop, so they never send a stale price. Returns the
   * freshly checked bag when it is safe to go ahead.
   */
  async function checkBeforeOrdering(): Promise<{ lines: CartLineView[]; totalCents: number } | null> {
    setFeedback(null);
    setBusy(true);
    const result = await refreshCart();
    setBusy(false);

    if (!result.ok) {
      setFeedback({
        kind: "error",
        text: "We couldn’t check the latest prices just now. Please check your connection and try again.",
      });
      return null;
    }
    if (result.changed) {
      setFeedback({
        kind: "info",
        text: "Some items in your bag changed (see above). Please review it, then order again.",
      });
      return null;
    }
    const fresh = result.lines.filter((l) => l.available);
    if (fresh.length === 0) return null;
    return { lines: fresh, totalCents: fresh.reduce((sum, l) => sum + l.lineCents, 0) };
  }

  async function orderOnWhatsApp() {
    if (!number) return;
    const checked = await checkBeforeOrdering();
    if (!checked) return;
    const url = buildWhatsAppUrl(number, messageFor(checked.lines, checked.totalCents));
    // A new tab where the browser allows it; otherwise carry on in this tab so the order is never lost.
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) window.location.assign(url);
  }

  async function copyMessage() {
    window.clearTimeout(copyTimer.current);
    const checked = await checkBeforeOrdering();
    if (!checked) return;
    const text = messageFor(checked.lines, checked.totalCents);
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      // Clipboard API can be blocked; fall back to selecting the text so Ctrl/Cmd+C works.
      const el = previewRef.current;
      if (el) {
        el.focus();
        el.select();
        try {
          ok = document.execCommand("copy");
        } catch {
          ok = false;
        }
      }
    }
    setCopyState(ok ? "copied" : "failed");
    copyTimer.current = window.setTimeout(() => setCopyState("idle"), 3500);
  }

  function browse() {
    closeCart();
    window.setTimeout(() => scrollToTarget("#collection"), 380);
  }

  const heading = count > 0 ? `Your bag (${count})` : "Your bag";
  const working = busy || checkingCart;

  return (
    <ModalDialog open={cartOpen} onClose={closeCart} label={heading} variant="drawer">
      <div className={styles.panel}>
        <header className={styles.header}>
          <h2 className={styles.title}>{heading}</h2>
          <button type="button" className={styles.close} onClick={closeCart} aria-label="Close bag">
            <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {notices.length > 0 && (
          <div className={styles.notice} role="status">
            <p className={styles.noticeTitle}>Your bag was updated</p>
            <ul>
              {notices.map((n) => (
                <li key={`${n.slug}-${n.kind}`}>
                  {n.kind === "removed" && `${n.name} is no longer available, so it has been left out of your order.`}
                  {n.kind === "sold-out" && `${n.name} has just sold out, so it has been left out of your order.`}
                  {n.kind === "price" && `${n.name} changed price: ${formatPrice(n.from ?? 0)} → ${formatPrice(n.to ?? 0)}.`}
                </li>
              ))}
            </ul>
            <button type="button" className={styles.noticeClose} onClick={dismissNotices}>
              Got it
            </button>
          </div>
        )}

        {lines.length === 0 ? (
          <div className={styles.empty}>
            <svg viewBox="0 0 120 120" width="96" height="96" aria-hidden="true" className={styles.emptyArt}>
              <circle cx="60" cy="60" r="44" fill="none" stroke="currentColor" strokeWidth="5" opacity=".9" />
              <path d="M22 50c24 14 52 14 76 0M18 66c26 16 58 16 84 0M28 84c20 10 44 10 64 0M40 24c-8 24-8 48 0 72M80 24c8 24 8 48 0 72" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" opacity=".55" />
            </svg>
            <p className={styles.emptyTitle}>Your bag is empty</p>
            <p className={styles.emptyText}>Pick a bag you love and it will wait for you here.</p>
            <button type="button" className="btn" onClick={browse}>
              Browse the collection
            </button>
          </div>
        ) : (
          <>
            <ul className={styles.list}>
              {lines.map(({ slug, name, product, quantity, available, status, unitPrice, lineCents }) => {
                const photo = product?.images[0];
                return (
                  <li key={slug} className={`${styles.line} ${available ? "" : styles.unavailable}`}>
                    <div className={styles.thumb}>
                      {photo && (
                        <Image
                          src={photo.src}
                          alt=""
                          fill
                          sizes="88px"
                          style={{ objectFit: "cover", objectPosition: `${photo.focal?.x ?? 50}% ${photo.focal?.y ?? 50}%` }}
                        />
                      )}
                    </div>
                    <div className={styles.info}>
                      <p className={styles.name}>
                        {product ? (
                          <button
                            type="button"
                            className={styles.nameButton}
                            onClick={() => {
                              closeCart();
                              window.setTimeout(() => openProduct(slug), 340);
                            }}
                          >
                            {name}
                          </button>
                        ) : (
                          name
                        )}
                      </p>
                      {available ? (
                        <>
                          <p className={styles.unit}>{formatPrice(unitPrice)} each</p>
                          <div className={styles.controls}>
                            <QuantityStepper
                              size="sm"
                              value={quantity}
                              itemName={name}
                              onChange={(q) => setQuantity(slug, q)}
                            />
                            <button type="button" className={styles.remove} onClick={() => removeFromCart(slug)}>
                              Remove<span className="sr-only"> {name}</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className={styles.soldOut}>
                            {status === "removed"
                              ? "This bag is no longer available. It is not included in your order."
                              : "This bag is now sold out and is not included in your order."}
                          </p>
                          <button type="button" className={styles.remove} onClick={() => removeFromCart(slug)}>
                            Remove<span className="sr-only"> {name}</span>
                          </button>
                        </>
                      )}
                    </div>
                    <p className={styles.lineTotal}>{available ? formatMoney(fromCents(lineCents)) : "—"}</p>
                  </li>
                );
              })}
            </ul>

            <footer className={styles.footer}>
              <div className={styles.subtotal}>
                <span>Subtotal</span>
                <strong>{formatMoney(fromCents(subtotalCents))}</strong>
              </div>
              <p className={styles.note}>
                No payment on this site. Your order is sent as a WhatsApp message and confirmed with the maker.
              </p>

              {orderable.length === 0 ? (
                <p className={styles.callout}>
                  {blocked > 0 ? "Nothing in your bag can be ordered right now. Remove those items or browse the collection." : "Nothing in your bag can be ordered right now."}
                </p>
              ) : number ? (
                <>
                  <button type="button" className="btn" onClick={orderOnWhatsApp} disabled={working}>
                    {working ? "Checking latest prices…" : "Order on WhatsApp"}
                    <span className="sr-only"> (opens WhatsApp)</span>
                    <Arrow />
                  </button>
                  <p className={styles.hint}>
                    We check the latest prices first. WhatsApp then opens with your order typed out; you press Send to place it.
                  </p>
                  <details className={styles.preview}>
                    <summary>Preview the message</summary>
                    <pre>{message}</pre>
                  </details>
                </>
              ) : (
                <div className={styles.previewBlock}>
                  <p className={styles.callout}>
                    <strong>WhatsApp number not set yet.</strong> Here is the order message that will open in WhatsApp once the
                    shop number is added. You can copy it for now.
                  </p>
                  <label className={styles.previewLabel} htmlFor="order-preview">
                    Order message preview
                  </label>
                  <textarea
                    id="order-preview"
                    ref={previewRef}
                    className={styles.previewText}
                    readOnly
                    rows={Math.min(12, message.split("\n").length + 1)}
                    value={message}
                  />
                  <button type="button" className="btn" onClick={copyMessage} disabled={working}>
                    {working ? "Checking latest prices…" : copyState === "copied" ? "Copied ✓" : "Copy order message"}
                  </button>
                  <p className={styles.status} role="status" aria-live="polite">
                    {copyState === "copied" && "Order message copied to your clipboard."}
                    {copyState === "failed" && "Couldn’t copy automatically. The text is selected – press Ctrl/Cmd + C."}
                  </p>
                </div>
              )}

              <p
                className={`${styles.status} ${feedback?.kind === "error" ? styles.error : ""}`}
                role={feedback?.kind === "error" ? "alert" : "status"}
                aria-live="polite"
              >
                {feedback?.text}
              </p>
            </footer>
          </>
        )}
      </div>
    </ModalDialog>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 10h13M11 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
