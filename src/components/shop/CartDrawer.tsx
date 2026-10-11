"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { siteConfig } from "@/config/site";
import { formatMoney, formatPrice, fromCents } from "@/lib/format";
import { scrollToTarget } from "@/lib/scroll";
import { buildOrderMessage, buildWhatsAppUrl, normalizeWhatsAppNumber } from "@/lib/whatsapp";
import { ModalDialog } from "./ModalDialog";
import { QuantityStepper } from "./QuantityStepper";
import { useShop } from "./shop-context";
import styles from "./CartDrawer.module.css";

type CopyState = "idle" | "copied" | "failed";

export function CartDrawer() {
  const { lines, count, subtotalCents, cartOpen, closeCart, setQuantity, removeFromCart, openProduct } = useShop();
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const copyTimer = useRef<number | undefined>(undefined);
  const previewRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const orderable = useMemo(() => lines.filter((l) => l.available), [lines]);
  const message = useMemo(
    () =>
      buildOrderMessage(
        orderable.map((l) => ({ name: l.product.name, quantity: l.quantity, unitPrice: l.product.price })),
        subtotalCents,
      ),
    [orderable, subtotalCents],
  );
  const number = normalizeWhatsAppNumber(siteConfig.whatsappNumber);
  const whatsappUrl = number ? buildWhatsAppUrl(number, message) : null;

  async function copyMessage() {
    window.clearTimeout(copyTimer.current);
    let ok = false;
    try {
      await navigator.clipboard.writeText(message);
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
              {lines.map(({ product, quantity, available, lineCents }) => {
                const photo = product.images[0];
                return (
                  <li key={product.slug} className={`${styles.line} ${available ? "" : styles.unavailable}`}>
                    <div className={styles.thumb}>
                      <Image
                        src={photo.src}
                        alt=""
                        fill
                        sizes="88px"
                        style={{ objectFit: "cover", objectPosition: `${photo.focal?.x ?? 50}% ${photo.focal?.y ?? 50}%` }}
                      />
                    </div>
                    <div className={styles.info}>
                      <p className={styles.name}>
                        <button
                          type="button"
                          className={styles.nameButton}
                          onClick={() => {
                            closeCart();
                            window.setTimeout(() => openProduct(product.slug), 340);
                          }}
                        >
                          {product.name}
                        </button>
                      </p>
                      {available ? (
                        <>
                          <p className={styles.unit}>{formatPrice(product.price)} each</p>
                          <div className={styles.controls}>
                            <QuantityStepper
                              size="sm"
                              value={quantity}
                              itemName={product.name}
                              onChange={(q) => setQuantity(product.slug, q)}
                            />
                            <button type="button" className={styles.remove} onClick={() => removeFromCart(product.slug)}>
                              Remove<span className="sr-only"> {product.name}</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className={styles.soldOut}>This bag is now sold out and is not included in your order.</p>
                          <button type="button" className={styles.remove} onClick={() => removeFromCart(product.slug)}>
                            Remove<span className="sr-only"> {product.name}</span>
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
                <p className={styles.callout}>Nothing in your bag can be ordered right now.</p>
              ) : whatsappUrl ? (
                <>
                  <a className="btn" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    Order on WhatsApp
                    <span className="sr-only"> (opens WhatsApp in a new tab)</span>
                    <Arrow />
                  </a>
                  <p className={styles.hint}>WhatsApp opens with your order typed out. You press Send to place it.</p>
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
                  <button type="button" className="btn" onClick={copyMessage}>
                    {copyState === "copied" ? "Copied ✓" : "Copy order message"}
                  </button>
                  <p className={styles.status} role="status" aria-live="polite">
                    {copyState === "copied" && "Order message copied to your clipboard."}
                    {copyState === "failed" && "Couldn’t copy automatically. The text is selected – press Ctrl/Cmd + C."}
                  </p>
                </div>
              )}
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
