import "server-only";
import type { OrderCustomer } from "@/lib/orders";
import type { Pricing } from "@/lib/pricing";

export interface OrderEmailLine {
  name: string;
  quantity: number;
  unitPrice: number;
  lineCents: number;
}

export interface OrderEmailInput {
  brandName: string;
  reference: string;
  customer: OrderCustomer;
  lines: OrderEmailLine[];
  /** Subtotal, offers, delivery fee and the total to collect. */
  pricing: Pricing;
  /** Always two decimals, in the shop currency. */
  formatMoney: (amount: number) => string;
}

/** Customer-typed text goes into an HTML email, so it is always escaped. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const multiline = (value: string) => esc(value).replace(/\n/g, "<br>");

/** Subject, HTML and plain-text bodies for the owner's "new order" email. */
export function buildOrderEmail({ brandName, reference, customer, lines, pricing, formatMoney }: OrderEmailInput) {
  const count = lines.reduce((n, l) => n + l.quantity, 0);
  const total = formatMoney(pricing.totalCents / 100);
  const hasExtras = pricing.discounts.length > 0 || pricing.deliveryCents > 0;
  const subject = `New order ${reference} · ${count} ${count === 1 ? "bag" : "bags"} · ${total} · ${customer.name}`.replace(/[\r\n]+/g, " ");

  const text = [
    `New order ${reference} on ${brandName}`,
    "Payment: cash on delivery",
    "",
    "CUSTOMER",
    `Name: ${customer.name}`,
    `Phone: ${customer.phone}`,
    `City / area: ${customer.city}`,
    `Address: ${customer.address}`,
    ...(customer.notes ? [`Notes: ${customer.notes}`] : []),
    "",
    "ORDER",
    ...lines.map((l) => `• ${l.quantity} × ${l.name} @ ${formatMoney(l.unitPrice)} = ${formatMoney(l.lineCents / 100)}`),
    "",
    ...(hasExtras ? [`Subtotal: ${formatMoney(pricing.subtotalCents / 100)}`] : []),
    ...pricing.discounts.map((d) => `Offer – ${d.title} (${d.units} free): -${formatMoney(d.cents / 100)}`),
    ...(pricing.deliveryCents > 0 ? [`Delivery: ${formatMoney(pricing.deliveryCents / 100)}`] : []),
    `TOTAL TO COLLECT: ${total}`,
  ].join("\n");

  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 16px 6px 0;color:#7d5f19;font-size:12px;letter-spacing:.08em;text-transform:uppercase;vertical-align:top;white-space:nowrap">${label}</td><td style="padding:6px 0;font-size:15px;color:#231f20">${value}</td></tr>`;

  const extraRow = (label: string, value: string, show: boolean) =>
    show
      ? `<tr><td style="padding:6px 0 0;font-size:14px;color:#3d3537">${label}</td><td style="padding:6px 0 0;font-size:14px;text-align:right;white-space:nowrap">${value}</td></tr>`
      : "";

  const phoneHref = `tel:${customer.phone.replace(/[^\d+]/g, "")}`;

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6efe3;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#231f20">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fbf7ef;border:1px solid #e3d7c0;border-radius:4px">
    <tr><td style="padding:24px 28px;background:#6b1631;border-radius:4px 4px 0 0">
      <div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#e0c27c">${esc(brandName)}</div>
      <div style="font-size:24px;font-weight:600;color:#f6efe3;margin-top:4px">New order ${esc(reference)}</div>
    </td></tr>
    <tr><td style="padding:24px 28px">
      <p style="margin:0 0 16px;font-size:14px;color:#3d3537">Payment: <strong>cash on delivery</strong>. Call or message the customer to confirm the delivery.</p>
      <table role="presentation" width="100%" style="border-collapse:collapse">
        ${row("Name", esc(customer.name))}
        ${row("Phone", `<a href="${esc(phoneHref)}" style="color:#6b1631">${esc(customer.phone)}</a>`)}
        ${row("City / area", esc(customer.city))}
        ${row("Address", multiline(customer.address))}
        ${customer.notes ? row("Notes", multiline(customer.notes)) : ""}
      </table>
      <table role="presentation" width="100%" style="border-collapse:collapse;margin-top:20px;border-top:1px dashed #b8923f">
        ${lines
          .map(
            (l) =>
              `<tr><td style="padding:10px 0;border-bottom:1px dashed #e3d7c0;font-size:15px">${l.quantity} × ${esc(l.name)}<div style="font-size:12px;color:#6f6567">${esc(formatMoney(l.unitPrice))} each</div></td><td style="padding:10px 0;border-bottom:1px dashed #e3d7c0;font-size:15px;text-align:right;white-space:nowrap">${esc(formatMoney(l.lineCents / 100))}</td></tr>`,
          )
          .join("")}
        ${extraRow("Subtotal", esc(formatMoney(pricing.subtotalCents / 100)), hasExtras)}
        ${pricing.discounts.map((d) => extraRow(`Offer: ${esc(d.title)} (${d.units} free)`, `−${esc(formatMoney(d.cents / 100))}`, true)).join("")}
        ${extraRow("Delivery", esc(formatMoney(pricing.deliveryCents / 100)), pricing.deliveryCents > 0)}
        <tr><td style="padding:14px 0 0;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#7d5f19">Total to collect</td><td style="padding:14px 0 0;font-size:22px;font-weight:700;text-align:right;white-space:nowrap">${esc(total)}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject, html, text };
}
