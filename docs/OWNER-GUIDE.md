# Owner guide: managing your shop

Everything you manage lives in one place, your **dashboard**: `https://<your-website>/studio`.
Sign in with the email you were invited with. Anything you **Publish** goes to the website within a few seconds.

> **Status of this guide:** the dashboard and website are built and tested against a local stand-in. Until the Sanity
> project exists and has been connected, the dashboard won't open for you yet (see `docs/SANITY-SETUP.md`).

## The three sections

| Section | What it is for |
| --- | --- |
| **Products** | Your bags. Also has handy lists: *Featured in the showcase*, *Sold out*, *Hidden from storefront* |
| **Collections** | Groups of bags (e.g. Clutches, Totes). They become the "Collection" filter on the website |
| **Shop Settings** | Brand name, logo, currency, WhatsApp number, contact details, and the homepage and craft text |

## The one rule: Draft → Publish

- Whatever you type is saved automatically as a **draft** that only you can see.
- The website changes only when you press **Publish** (bottom right). Until then customers see the old version.
- To take something off the website: **Hide** it (below), or **Unpublish** it (bottom right menu "⋯").

## Add a bag

1. **Products → All products → +** (Create).
2. **Name**, then **URL slug → Generate** (the web address piece; must be unique).
3. **Description**: a few sentences. The first sentence is also the short line under the name.
4. **Collection**: pick one. (It must be **published** first, see below.)
5. **Available colors**: add each colour with its name and a swatch. Use the **same colour name** on every bag that
   comes in it (e.g. always "Burgundy"): that is what the colour filter groups by. For two-tone bags, add a second swatch.
6. **Photos** tab: upload photos. **Drag to reorder: the first photo is the cover.** For each photo:
   - fill in **Alternative text** (describe the photo in a few words: it is read aloud to people who can't see it);
   - click the photo to open **crop and hotspot**: drag the hotspot onto the bag so it always stays in view when the
     website crops the picture.
7. **Price & availability** tab: **Price** (a plain number such as `88` or `88.50`, in the currency set in Shop
   Settings), **Availability** (*Available* or *Sold out*), and **Display order**.
8. Press **Publish**. The bag appears in the collection.

The Studio will tell you what is missing (price, photo, alt text) and won't let you publish an incomplete bag.

## Edit a bag, or change a price

Open it, change what you want, press **Publish**. The new price is used everywhere on the website, and an **order
always uses the latest prices**: when a customer presses Checkout the shop re-checks the live prices first.

## Feature a bag (the big animated showcase)

On the bag, **Price & availability** tab, switch **Feature in the animated showcase** on, then **Publish**. The bag
joins the full-screen "Featured bags" section, with its background colour matched to the bag automatically (you don't
choose colours). Switch it off to remove it. If no bag is featured, the section disappears.

## Mark a bag sold out

**Availability → Sold out → Publish.** It stays on the website with a "Sold out" label, but cannot be added to a bag.
If a customer already has it in their bag, they are told it sold out and it is left out of their order.

## Hide a bag

**Hide from storefront** on → **Publish**. It disappears from the collection, featured section and homepage, without
being deleted. Turn it off and publish to bring it back. (Customers with it in their bag are told it is no longer
available.)

## Order of things

**Display order** (on bags and on collections): lower numbers come first (1, 2, 3…). Bags without a number come last.
Bags are listed in this order, and the first two bags (featured ones first) appear in the website's opening photos.

## Collections

**Collections → +**: a **Name**, a **URL slug**, an optional image (not shown on the website yet), a display order
and **Show as its own section**.
**Publish collections before the bags that use them.** A collection appears as a filter only when it has at least one
visible bag.

**Show as its own section** turns a collection (say "iPad cases") into its own *shelf*: on the homepage the bags are
grouped under a shelf per collection that has this switched on, and customers can open and close each one. Every such
collection also gets its own page (`/collections/<url-slug>`) and an entry in the menu behind the three-line button.
Bags in collections that are switched off (or in no collection) are shown together on a last "More bags" shelf.
A shelf with no visible bags is left out. With the switch off, a collection is only a filter.

## Shop Settings

Open **Shop Settings** (a single page; there is only ever one). Fill in and **Publish**:

- **Brand name** and **Logo** (shown in the header; PNG/SVG with a transparent background is best).
- **Currency**. Changing it does *not* convert prices; update them yourself.
- **WhatsApp number** in international format: `+` then country code and number, e.g. `+96181616199`.
  Shown in the footer and in the "Your bag, your way" block (for custom-bag requests). Orders do **not** use it. Leave it
  empty to hide it.
- **Email, location, social links**: shown in the footer (and the email in the "Your bag, your way" block); empty ones
  are hidden. This is the address *customers* see. Orders arrive on the address set in Vercel (see "Receiving orders").
- **Homepage headline** (one line per row, the last line is shown in italics), **introduction**, **Craft heading**
  (put `*stars*` around a word to make it italic) and **Craft & story text**. Leave a field empty to use the default wording.

## Receiving orders

There is no online payment: customers **pay cash on delivery**. At checkout they enter their name, phone number, city and
address (and an optional note) and press **Confirm order**. You receive an **email** with the bags, the total to
collect and the customer details, and then contact the customer to arrange the delivery. Orders are sent with
[Resend](https://resend.com). The email address that receives them is *not* in Sanity: it is set by whoever manages the
website hosting (the `ORDER_EMAIL_TO` setting in Vercel; see README → "Order emails").

If the email cannot be sent, the customer is told so and keeps their bag; nothing is lost silently.

## What you cannot do here (yet)

Online payments, customer accounts and an order history are not part of this. Orders only exist as the emails you receive.

## Try it: a 10-minute walkthrough

Do this once after the dashboard is connected to confirm everything works end to end:

1. Open `/studio`, sign in. Open **Shop Settings**, fill it in, **Publish**.
2. **Collections** → create "Clutches", **Publish**.
3. **Products** → create a bag with 2 photos (with alt text), a price, the Clutches collection. It is a **draft**:
   open the website: it is **not** there. ✔
4. **Publish**. Wait a few seconds, refresh the website: it is in the collection, with both photos in its gallery. ✔
5. Change the **price**, **Publish**, refresh: the new price shows. ✔
6. Switch **Feature in the animated showcase** on, **Publish**: the bag appears in the Featured section. ✔
7. Switch **Availability** to *Sold out*, **Publish**: it shows "Sold out" and "Add to bag" is disabled. ✔
8. Add another bag to a customer bag in a second browser tab, then **Hide** it and publish: open the bag in that tab,
   it explains the bag is no longer available and leaves it out of the order. ✔
9. **Hide from storefront** on the first bag, **Publish**: it is gone from the website. ✔

If a step doesn't show up on the website, see "Troubleshooting" in `docs/SANITY-SETUP.md`.
