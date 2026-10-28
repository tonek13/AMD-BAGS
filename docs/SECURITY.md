# Security

What protects the shop, what to switch on in the dashboards, and what is deliberately not covered.

## Built into the code

| Protection | Where | What it does |
| --- | --- | --- |
| Security headers | `next.config.ts` | `nosniff`, referrer policy, HSTS (2 years), permissions policy, no framing (`X-Frame-Options`, `frame-ancestors`), window isolation, no `X-Powered-By`. |
| Content Security Policy | `next.config.ts` | The shop loads only its own scripts, styles, fonts and images, talks only to its own server, and posts forms only to itself. The Studio gets its own, lighter header (it needs Sanity's scripts). |
| Same-site checks | `src/lib/request-guard.ts` | `/api/orders` and `/api/catalog/check` refuse requests that a browser says another website caused, and anything that is not JSON. |
| Rate limits | `src/app/api/orders/route.ts`, `src/app/api/catalog/check/route.ts` | Orders: 8 per address per 10 minutes and 8 per phone number per hour (every attempt, valid or not, also counts against a looser limit). Cart check: 60 per minute per visitor. |
| Server-side pricing | `src/app/api/orders/route.ts` | Prices, sale prices, offers and the delivery fee are re-read from the shop for every order. The browser's total is only used to notice a change. |
| Honeypot + idempotency | order form and route | Simple bots get a fake "thank you" and nothing is sent. A repeated submission of the same order never sends a second email. |
| Escaped emails | `src/lib/order-email.ts` | Everything a customer types is escaped before it goes into the owner's email. Nothing a customer types is ever shown on a page. |
| Signed webhook | `src/app/api/revalidate/route.ts` | Only Sanity, holding the shared secret, can refresh the site's cache. |
| Secrets | `.gitignore`, `.env.example` | `.env*` files are never committed. Keys are server-only (no `NEXT_PUBLIC_`). |

The in-memory rate limits live inside one server instance. Vercel can run several, so treat them as a speed bump and add the platform rules below, which count across all of them.

## Switch on in Vercel (Project → Firewall)

1. **Rate limit orders.** Firewall → Configure → New rule. If *Request Path* equals `/api/orders` and *Method* equals `POST`, then *Rate Limit*: 10 requests per 10 minutes per IP, action *Too Many Requests (429)*. Publish.
2. **Rate limit the cart check.** Same, for `/api/catalog/check`: 60 requests per minute per IP.
3. **Bot protection.** Turn on the managed *Bot Filter* (start in *Log*, switch to *Challenge* once the logs look normal).
4. **Attack Challenge Mode** is the emergency switch if the shop is ever flooded.

Rate limiting availability and limits depend on the Vercel plan.

## Switch on in other dashboards

- **Sanity** (sanity.io/manage → your project): *API → CORS origins* should list only your own domain(s) (and `http://localhost:3333`/`3000` for development). *Members*: only people who need access, with the lowest role that works.
- **Resend**: use a *Sending access* key, not a full-access one, and rotate it if it is ever shared.
- **GitHub**: Settings → Code security → turn on *Dependabot alerts* and *Dependabot security updates*.
- **Vercel**: mark `RESEND_API_KEY` and `SANITY_REVALIDATE_SECRET` as *Sensitive*. Remember that Preview deployments also send real order emails if those variables are set for Preview.

## What is deliberately not covered

- **Inline scripts in the Content Security Policy.** Next.js writes small inline scripts into every page, and a nonce-based policy would make every page dynamic (no caching). So the policy uses `'unsafe-inline'` for scripts and styles: it blocks injected external scripts, framing, hijacked forms and plugins, but could not stop script that was already injected inline. The shop has no place where visitor text is shown back on a page.
- **Studio login.** Handled by Sanity. Two-step login for the owner's Sanity account is optional but recommended.
- **Dependencies in Studio tooling.** `npm audit` still lists a few high findings inside Sanity's command-line tools (`js-yaml`, `smol-toml`, `undici`). They are not part of the shop's pages, and the only fix right now is a downgrade of Sanity. Re-check after the next Sanity update.
- **Public Sanity dataset.** Anything published is readable through Sanity's public API, including bags marked "hidden". Drafts are not. Use a private dataset plus `SANITY_API_READ_TOKEN` if published content must be private.

## Checking it

`npm run test:cms` includes the header, cross-site, size and rate-limit checks.
