# MaisonHook — handmade crochet bag shop

Next.js (App Router) + TypeScript, custom CSS Modules, GSAP + ScrollTrigger, Lenis smooth scrolling on desktop.
The owner manages the catalogue in **Sanity Studio**, embedded at `/studio`. No customer accounts, no online payment: customers check out with name, phone and address and pay cash on delivery; each order is emailed to the owner with [Resend](https://resend.com).

**Owner?** Read [docs/OWNER-GUIDE.md](docs/OWNER-GUIDE.md). **Connecting Sanity (account steps, webhook, CORS, invites)?** Read [docs/SANITY-SETUP.md](docs/SANITY-SETUP.md).

## Run it

```bash
npm install        # only needed once
npm run dev        # http://localhost:3000
```

```bash
npm run build && npm start   # production build, http://localhost:3000
npm run lint
npm run check:env            # says exactly which environment variables are missing
npm run test:cms             # connected-mode checks against a local stand-in for Sanity
```

### Which data does the site show?

Set in `.env.local` (copy `.env.example`):

- `SHOP_DATA_SOURCE=sanity` (default): the real shop, published content from Sanity. If Sanity isn't configured the build **fails with a clear message**; a running site shows a plain "can't load" page. It never quietly shows sample products.
- `SHOP_DATA_SOURCE=demo`: the built-in **sample** bags (`src/data/demo-products.ts`), with a visible "Demo mode" notice. Never mixed with Sanity.

## What's on the page

1. **Header** – brand, Collection, Our Craft, cart count.
2. **Opening** – real photographs in an arch/overlap composition, masked headline reveal, price tag that opens the product.
3. **From a thread to your everyday companion** – the signature scroll story: one reversible GSAP timeline works the real clutch photograph into existence, from a loose strand → foundation → rows of stitches (a crochet hook travels along each row) → handle opening and braided arch → the finished bag settling beside a real photo and an "Explore the collection" button. It is a brand story: it does not depend on any product in the catalogue. Backgrounds, captions and the weight of the headline word change with each stage. Desktop pins for ~4 screens, phones for ~3. A "Skip to the collection" link stays on screen.
4. **Featured bags** – bags marked "Feature in the animated showcase" in Sanity; each panel recolours the section from a theme derived from the bag's first colour (no per-bag colour picking).
5. **Collection** – collection and colour filters (animated with GSAP Flip), availability badges, sold-out bags stay viewable but can't be added to the bag. Hidden and draft bags never appear. Collections with **Show as its own section** on become collapsible *shelves*, each with its own page (`/collections/<slug>`) and an entry in the menu (three-line button); other bags sit on a last "More bags" shelf.
6. **Your bag, your way** – invitation to ask for a custom bag, with the WhatsApp number and email from Shop Settings.
7. **Our Craft** – close-up crops of the real photos.
8. **Footer / contact.**

Shopping: product dialog (photo gallery, quantity), cart drawer (add / remove / quantity / subtotal), cart saved in `localStorage`, cash-on-delivery checkout. Opening the bag and pressing Checkout first re-check live prices and availability (`/api/catalog/check`): bags that were removed, hidden or sold out are explained and left out and a changed price is shown before the customer can order. `POST /api/orders` then validates the details again, re-reads every price from the shop (the total the browser sends is only used to notice a change) and emails the order to the owner.

### Order emails (Resend)

Set these where the site runs (`.env.local`, and Vercel → Settings → Environment Variables, then redeploy). `npm run check:env` reports what is missing.

| Variable | What |
| --- | --- |
| `RESEND_API_KEY` | API key from the Resend dashboard (server only). |
| `ORDER_EMAIL_TO` | The shop owner email. Several can be separated by commas. |
| `ORDER_EMAIL_FROM` | Optional sender, e.g. `MaisonHook <orders@yourdomain.com>` (needs a domain verified in Resend). Without it Resend's test sender `onboarding@resend.dev` is used, which can **only deliver to the email address of your own Resend account**. |

Until the first two are set, pressing **Confirm order** tells the customer ordering is not open yet and the server log says exactly what is missing.

With **reduced motion** (OS setting) the story is not pinned or animated: visitors see the finished illustration and all five steps as ordinary content. If the animation ever fails to start, the same fallback is used.

## What the owner manages, and what stays in code

| Where | What |
| --- | --- |
| **Sanity → Products** | name, slug, description, price, ordered photo gallery (alt text, crop, hotspot), collection, colours, availability (Available / Sold out), hidden, featured, display order |
| **Sanity → Collections** | name, slug, optional image, display order, show as its own section |
| **Sanity → Sale** | on/off switch, shelf title, bags with a previous and a new price (the new price is what is charged while it is on) |
| **Sanity → Offers** | on/off switch, shelf title, offers: a set of bags + "buy X, get Y free" (cheapest free, applied at checkout) |
| **Sanity → Shop Settings** | brand name, logo, currency, delivery fee, WhatsApp number, contact + social links, homepage headline/intro, craft heading/text |
| `src/config/site.ts` | technical constants and the fallback wording used when a Shop Settings text field is empty. **The WhatsApp number has no code default for the connected shop** (empty = hidden; it is only used for the contact block and the footer) |
| `src/data/craft.ts`, `src/data/story.ts`, `src/components/story/stages.ts` | the craft close-ups, the story photo and the story captions (brand content, not products) |

Still to be confirmed with the owner: the real bags, prices, descriptions, photos' alt text, currency, and the brand logo (not yet supplied as a file).

## Photos

The seven supplied photos are copied (originals untouched) to `public/images/products/` with descriptive names. The two burgundy-clutch photos are one product gallery. Close-up crops for the craft section are generated at native resolution into `public/images/crops/` by `node scripts/make-crops.mjs`.

## How the catalogue reaches the page

```
Sanity (published) ──GROQ──▶ src/sanity/lib/queries.ts ──▶ mappers.ts ──▶ src/lib/catalog.ts ('use cache' + tags) ──▶ pages
       ▲                                                                                          ▲
       └── signed webhook ──▶ POST /api/revalidate (verifies signature, expires tags) ─────────────┘
```

Components never talk to Sanity: they receive `Catalog` / `ShopSettings` (`src/types`). Drafts are excluded twice (the client's `published` perspective and the queries). Hidden products, and products with no price or no photo, are filtered out.

## Code map

```
src/app/(site)/             the storefront (its own root layout: header, cart, Lenis)
src/app/(studio)/           the owner's dashboard at /studio (its own root layout, nothing of the storefront)
src/app/api/                /api/revalidate (signed webhook), /api/catalog/check (live cart check)
src/sanity/                 schemas, dashboard structure, queries, image helper, mappers, env validation
sanity.config.ts            Studio configuration
src/config/site.ts          technical constants + fallback wording
src/data/                   demo sample bags, craft close-ups, story photo
src/lib/catalog.ts          cached data-access layer (Sanity or demo)
src/lib/cart-store.ts       localStorage cart (useSyncExternalStore, hydration-safe)
src/lib/cart-lines.ts       how each bag in the cart stands now (ok / sold out / removed)
src/lib/whatsapp.ts         wa.me link + number check (contact block, footer)
src/lib/orders.ts           order shapes + validation shared by the checkout form and the server
src/lib/pricing.ts          subtotal, "buy X get Y free" offers, delivery fee, total (shared by browser and server)
src/lib/order-email.ts      the owner's "new order" email (HTML + text)
src/app/api/orders/         POST /api/orders: validate, re-price from live data, email via Resend
scripts/import-products.mjs optional one-time import of the current bags as drafts
scripts/testing/            local Sanity stand-in + connected-mode test suite
src/components/story/       the scroll story (geometry, SVG, timeline, copy)
src/components/motion/      MotionRoot (Lenis + motion flags), MovingPhoto (tilt/parallax)
src/components/shop/        cart drawer, product dialog, native <dialog> wrapper
src/components/site/        header, hero, featured, collection, craft, footer
```

## Notes

- GSAP and Lenis are initialised once (`MotionRoot`) and cleaned up on unmount; every animated component uses `gsap.matchMedia` so reduced motion and breakpoints are handled in one place.
- Dialogs use the native `<dialog>` element (focus trap, Escape, inert background, focus restore) with scroll locking that also pauses Lenis.
- Photos use `next/image` with per-photo focal points so handles are never cropped away.
