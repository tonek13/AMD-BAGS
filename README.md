# maisonhook — handmade crochet bag shop (design-review prototype)

A frontend-only prototype for reviewing the design with the owner. Next.js (App Router) + TypeScript, custom CSS Modules, GSAP + ScrollTrigger, Lenis smooth scrolling on desktop.
No backend, no accounts, no payments. Orders are prepared as a WhatsApp message that the customer sends themselves.

## Run it

```bash
npm install        # only needed once
npm run dev        # http://localhost:3000
```

```bash
npm run build && npm start   # production build, http://localhost:3000
npm run lint
```

## What's on the page

1. **Header** – brand, Collection, Our Craft, cart count.
2. **Opening** – real photographs in an arch/overlap composition, masked headline reveal, price tag that opens the product.
3. **From a thread to your everyday companion** – the signature scroll story: one reversible GSAP timeline drives an SVG crochet bag from a loose strand → foundation ring → rows of stitches (a crochet hook travels along each row) → braided handle, gold rings and tassel → the finished bag settling beside a real photo and an "Explore the collection" button. Backgrounds, captions and the weight of the headline word change with each stage. Desktop pins for ~4 screens, phones for ~3. A "Skip to the collection" link stays on screen.
4. **Featured bags** – chosen by `featured` in the product data; each panel recolours the section from that bag's theme.
5. **Collection** – style and colour filters (animated with GSAP Flip), availability badges, sold-out bags stay viewable.
6. **Our Craft** – close-up crops of the real photos.
7. **Footer / contact.**

Shopping: product dialog (photo gallery, quantity), cart drawer (add / remove / quantity / subtotal), cart saved in `localStorage`, WhatsApp checkout.

With **reduced motion** (OS setting) the story is not pinned or animated: visitors see the finished illustration and all five steps as ordinary content. If the animation ever fails to start, the same fallback is used.

## Values the owner needs to confirm

The WhatsApp number and brand name were provided by the owner. Everything else below is **provisional** until confirmed.

| What | Where | Current value |
| --- | --- | --- |
| **WhatsApp number** | `src/config/site.ts` → `whatsappNumber` | `+961 81 616 199` (provided by the owner). Clear it to fall back to the order-message preview + Copy button |
| Brand name | `src/config/site.ts` → `brandName` | `maisonhook` (provided by the owner) |
| Currency + number format | `src/config/site.ts` → `currency`, `locale` | `USD`, `en-US` |
| Product names, taglines, descriptions, **prices**, **availability** | `src/data/products.ts` | placeholders (e.g. $74–$118; "Cloud Clutch" sold out, "Crème Crescent" made to order) |
| Colour / style filter labels | `src/data/products.ts` → `colors`, `categories` | placeholders |
| Which bags are featured, in what order, and their colours | `featured` on each product | 4 bags |
| Hero bags + the bag shown at the end of the story | `src/config/site.ts` → `heroProducts`, `storyProduct` | cherry-ripple-basket / apricot-arch-bag / bordeaux-clutch |
| Max quantity per bag | `src/config/site.ts` → `maxQuantityPerItem` | 10 |
| Contact lines (Instagram, email, location) | `src/config/site.ts` → `contact` | empty (hidden) |
| Story, craft and headline copy | `src/components/story/stages.ts`, `src/data/craft.ts`, `Hero.tsx`, `Craft.tsx` | placeholder wording |
| "Design review" notice above the collection | `src/config/site.ts` → `showReviewNotes` | `true` – set to `false` for launch |

## Photos

The seven supplied photos are copied (originals untouched) to `public/images/products/` with descriptive names. The two burgundy-clutch photos are one product gallery. Close-up crops for the craft section are generated at native resolution into `public/images/crops/` by `node scripts/make-crops.mjs`.

## Connecting Sanity later

Components never read `src/data/*` directly. They go through `src/lib/catalog.ts` (`getProducts`, `getFeaturedProducts`, `getHeroProducts`, `getStoryProduct`, `getCategories`, `getColors`, `getCraftMoments`), all async and typed by `src/types/catalog.ts`. Replace the bodies of those functions with Sanity queries that return the same shapes and delete `src/data/products.ts`.

## Code map

```
src/config/site.ts          brand + shop settings (single place)
src/data/                   typed local content (products, craft crops)
src/lib/catalog.ts          data-access layer (swap for Sanity)
src/lib/cart-store.ts       localStorage cart (useSyncExternalStore, hydration-safe)
src/lib/whatsapp.ts         order message + wa.me link
src/components/story/       the scroll story (geometry, SVG, timeline, copy)
src/components/motion/      MotionRoot (Lenis + motion flags), MovingPhoto (tilt/parallax)
src/components/shop/        cart drawer, product dialog, native <dialog> wrapper
src/components/site/        header, hero, featured, collection, craft, footer
```

## Notes

- GSAP and Lenis are initialised once (`MotionRoot`) and cleaned up on unmount; every animated component uses `gsap.matchMedia` so reduced motion and breakpoints are handled in one place.
- Dialogs use the native `<dialog>` element (focus trap, Escape, inert background, focus restore) with scroll locking that also pauses Lenis.
- Photos use `next/image` with per-photo focal points so handles are never cropped away.
