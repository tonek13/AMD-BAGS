"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { fromCents } from "@/lib/format";
import { scrollToTarget } from "@/lib/scroll";
import type { OrderCustomer } from "@/lib/orders";
import { CheckoutPanel, emptyCustomer, newOrderId, type PlacedOrder } from "./CheckoutPanel";
import { ModalDialog } from "./ModalDialog";
import { QuantityStepper } from "./QuantityStepper";
import { useShop } from "./shop-context";
import styles from "./CartDrawer.module.css";

type View = "bag" | "checkout" | "done";

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
  const [view, setView] = useState<View>("bag");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "info" | "error"; text: string } | null>(null);
  // What the customer typed survives closing the bag by accident; it is cleared once the order is placed.
  const [customer, setCustomer] = useState<OrderCustomer>(emptyCustomer);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  const orderable = useMemo(() => lines.filter((l) => l.available), [lines]);
  const blocked = lines.length - orderable.length;

  /**
   * The step every order goes through: check the live prices first. If anything differs from what
   * the customer was looking at, explain it and stop, so they never confirm a stale price.
   * Returns true when it is safe to go on to the checkout.
   */
  async function checkBeforeCheckout(): Promise<boolean> {
    setFeedback(null);
    setBusy(true);
    const result = await refreshCart();
    setBusy(false);

    if (!result.ok) {
      setFeedback({
        kind: "error",
        text: "We couldn’t check the latest prices just now. Please check your connection and try again.",
      });
      return false;
    }
    if (result.changed) {
      setFeedback({
        kind: "info",
        text: "Some items in your bag changed (see above). Please review it, then check out again.",
      });
      return false;
    }
    return result.lines.some((l) => l.available);
  }

  async function startCheckout() {
    if (!(await checkBeforeCheckout())) return;
    setOrderId((id) => id ?? newOrderId());
    setView("checkout");
  }

  async function backToReview(message: string) {
    await refreshCart(); // brings the live prices and the "what changed" notes up to date
    setFeedback({ kind: "info", text: message });
    setView("bag");
  }

  function browse() {
    closeCart();
    window.setTimeout(() => scrollToTarget("#collection"), 380);
  }

  const heading = count > 0 ? `Your bag (${count})` : "Your bag";
  const working = busy || checkingCart;
  const dialogLabel = view === "checkout" ? "Checkout" : view === "done" ? "Order placed" : heading;

  return (
    <ModalDialog
      open={cartOpen}
      onClose={closeCart}
      label={dialogLabel}
      variant="drawer"
      onExited={() => {
        // Reopened later, the bag starts fresh (an unfinished checkout keeps what was typed).
        setView("bag");
        setPlaced(null);
        setFeedback(null);
      }}
    >
      {view === "done" && placed ? (
        <OrderPlaced order={placed} brandName={settings.brandName} formatMoney={formatMoney} onClose={closeCart} />
      ) : view === "checkout" && orderable.length > 0 ? (
        <CheckoutPanel
          lines={orderable}
          totalCents={orderable.reduce((sum, l) => sum + l.lineCents, 0)}
          values={customer}
          onValuesChange={setCustomer}
          orderId={orderId ?? ""}
          onBack={() => setView("bag")}
          onClose={closeCart}
          onPlaced={(order) => {
            setPlaced(order);
            setCustomer(emptyCustomer);
            setOrderId(null);
            setView("done");
          }}
          onNeedsReview={backToReview}
        />
      ) : (
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
              <p className={styles.note}>Pay cash on delivery. There is no online payment: you pay when your order arrives.</p>

              {orderable.length === 0 ? (
                <p className={styles.callout}>
                  {blocked > 0 ? "Nothing in your bag can be ordered right now. Remove those items or browse the collection." : "Nothing in your bag can be ordered right now."}
                </p>
              ) : (
                <>
                  <button type="button" className="btn" onClick={startCheckout} disabled={working}>
                    {working ? "Checking latest prices…" : "Checkout"}
                    <Arrow />
                  </button>
                  <p className={styles.hint}>We check the latest prices first, then you add your delivery details.</p>
                </>
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
      )}
    </ModalDialog>
  );
}

function OrderPlaced({
  order,
  brandName,
  formatMoney,
  onClose,
}: {
  order: PlacedOrder;
  brandName: string;
  formatMoney: (amount: number) => string;
  onClose: () => void;
}) {
  const firstName = order.name.split(/\s+/)[0];
  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <h2 className={styles.title}>Order placed</h2>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
            <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </header>
      <div className={styles.done} role="status">
        <svg viewBox="0 0 64 64" width="72" height="72" aria-hidden="true" className={styles.doneArt}>
          <circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" strokeWidth="3.5" />
          <path d="M19 33l9 9 17-20" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className={styles.emptyTitle}>Thank you, {firstName}!</p>
        <p className={styles.doneText}>
          Your order <strong>{order.reference}</strong> is with {brandName}. We’ll contact you on <strong>{order.phone}</strong> to confirm the delivery.
        </p>
        <p className={styles.doneText}>
          Please have <strong>{formatMoney(fromCents(order.totalCents))}</strong> ready in cash when it arrives.
        </p>
        <button type="button" className="btn" onClick={onClose}>
          Keep browsing
        </button>
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 10h13M11 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
