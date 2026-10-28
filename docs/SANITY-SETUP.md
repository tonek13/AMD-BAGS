# Connecting Sanity (setup guide)

This connects the shop to **Sanity**, the dashboard where the owner manages products. Everything in the code is
already done; what is left are a few steps that need **your Sanity and Vercel accounts**. Nothing here can be done
on your behalf, and no project IDs or secrets are in the repository.

**How it fits together**

```
Owner  →  /studio (Sanity Studio, signs in with Sanity)  →  Sanity project (the content)
                                                                  │  publish
                                                                  ▼
                              signed webhook  →  /api/revalidate  →  site refreshes the changed content
Customer → website (reads published content only, cached, refreshed by the webhook)
```

- `/studio` is the owner's dashboard. It has its own page layout: no shop header, cart or smooth-scrolling code runs there.
- Sign-in, invitations and permissions are Sanity's. There is no separate account system in this project.
- The website only ever reads **published** content. Drafts never appear.
- Customers have no accounts; payments, orders and customer accounts are future work.

---

## Quick checklist (the short version)

1. Create a Sanity project and note its **Project ID**; keep the dataset **`production`**.
2. Fill `.env.local` locally, then run `npm run check:env`.
3. Add the localhost and production addresses as **CORS origins** (with credentials).
4. Add the same variables on **Vercel** and redeploy.
5. Create the **webhook** in Sanity (exact settings below).
6. **Invite the owner** (role depends on your Sanity plan: see step 6).
7. Optional: import the current bags as drafts. Then run the walkthrough in `docs/OWNER-GUIDE.md`.

---

## 1. Create the Sanity project

1. Go to <https://www.sanity.io/get-started> and sign in (Google, GitHub or email).
2. Create a project (any name, e.g. "MaisonHook shop"). When asked, choose **no template / clean project** and the
   dataset name **`production`** with **public** visibility (the default). Public means *published* content can be
   read without a token; drafts are always private.
3. Open <https://www.sanity.io/manage>, pick the project, and copy the **Project ID** (looks like `ab12cd34`).

> Free plan is enough to start.

## 2. Local configuration

Copy `.env.example` to `.env.local` and fill it in:

| Variable | Value |
| --- | --- |
| `SHOP_DATA_SOURCE` | `sanity` |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | the Project ID from step 1 |
| `NEXT_PUBLIC_SANITY_DATASET` | `production` |
| `NEXT_PUBLIC_SANITY_API_VERSION` | leave `2025-02-19` |
| `SANITY_REVALIDATE_SECRET` | a long random string (see below). The **same** value goes into the webhook |
| `SANITY_API_READ_TOKEN` | leave empty (only for a private dataset) |
| `SANITY_API_WRITE_TOKEN` | only for the optional import script, on your own computer |

Generate the secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Check it:

```bash
npm run check:env
```

Then `npm run dev` and open <http://localhost:3000/studio>.

> **Demo mode.** `SHOP_DATA_SOURCE=demo` shows the built-in *sample* bags with a visible "Demo mode" notice. It never
> touches Sanity. With `sanity` selected and a missing/wrong configuration, the **build fails with a clear message**
> (and a running site shows a plain "can't load" page): it never quietly shows sample products. Until the Sanity
> steps are done, set `SHOP_DATA_SOURCE=demo` on Vercel so the current preview keeps working.

## 3. Allow the website's addresses (CORS)

The Studio runs in the browser and talks to Sanity, so Sanity must allow the addresses it runs from.

In <https://www.sanity.io/manage> → your project → **API** → **CORS origins** → **Add CORS origin**. Add each of these
and tick **Allow credentials**:

| Origin | Why |
| --- | --- |
| `http://localhost:3000` | working on your computer |
| `https://<your-production-domain>` (e.g. `https://amd-bags.vercel.app` or your own domain) | the live Studio at `/studio` |

Or from the terminal: `npx sanity cors add http://localhost:3000 --credentials`.
Preview deployments on Vercel have different addresses; add them too if you want to use `/studio` on a preview.

## 4. Vercel environment variables

Vercel → your project → **Settings** → **Environment Variables**. Add (for Production, and Preview if wanted):

- `SHOP_DATA_SOURCE` = `sanity`
- `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_SANITY_API_VERSION`
- `SANITY_REVALIDATE_SECRET` (the same random string)
- Order emails: `RESEND_API_KEY` and `ORDER_EMAIL_TO` (and optionally `ORDER_EMAIL_FROM`); see README → "Order emails"

Then **redeploy**. `NEXT_PUBLIC_…` values are baked in when the site is built, so changing them needs a new build.
Do **not** add `SANITY_API_WRITE_TOKEN` to Vercel.

## 5. The webhook (this is what refreshes the site when the owner publishes)

Sanity → <https://www.sanity.io/manage> → your project → **API** → **Webhooks** → **Create webhook**. Use **exactly**:

| Field | Value |
| --- | --- |
| Name | `Refresh storefront` |
| URL | `https://<your-production-domain>/api/revalidate` |
| Dataset | `production` (if the form asks for one) |
| Trigger on | **Create**, **Update**, **Delete** (all three ticked) |
| Filter | `_type in ["product", "collection", "shopSettings"]` |
| Projection | `{_type, _id}` |
| Status | Enabled |
| HTTP method | `POST` |
| HTTP headers | none |
| API version | `v2025-02-19` |
| Drafts | **off** (leave "Drafts" unticked: only published changes should refresh the site) |
| Versions | off |
| Secret | the **same** value as `SANITY_REVALIDATE_SECRET` |

How it behaves:

- The endpoint **verifies the signature** (`sanity-webhook-signature`) before doing anything. A missing, wrong or
  forged signature gets `401` and nothing is touched. With no secret configured it refuses everything (`503`).
- **Publish, edit, unpublish, hide and delete** all arrive as create/update/delete events of the published document,
  and refresh the matching content (products and collections together, Shop Settings separately).
- The site is cached, so a visit costs no Sanity request. As a safety net for a missed webhook, content also refreshes
  in the background after an hour.
- Webhook calls cannot reach `http://localhost`. To test locally, use a tunnel (e.g. `npx ngrok http 3000`) as the URL
  with the same secret, or simply restart `npm run dev` after publishing.
- You can see every delivery (status code, body) under the webhook's **Attempts** tab in Sanity: first place to look if
  a change does not appear.

## 6. Invite the owner

Sanity → manage → your project → **Members** → **Invite members**:

- Enter the owner's own email and choose a role. **The roles you can pick depend on your Sanity plan** (check
  <https://www.sanity.io/pricing> for the current terms):
  - **Free plan:** only **Administrator** and **Viewer** exist. A Viewer cannot edit, so the owner must be an
    **Administrator**. That also lets her change project settings, API tokens and members, so only do this with someone
    you trust, or upgrade.
  - **Growth plan (paid, per seat) and above:** choose **Editor**: she can create, edit, publish, unpublish and delete
    content but cannot change project settings, tokens, billing or other members. (*Contributor* can write drafts but
    cannot publish.) This is the recommended setup for the owner.
- She accepts the invitation by email and signs in at `https://<your-domain>/studio` with her own account.
- Keep an **Administrator** account for yourself either way.

## 7. Optional: import the current bags as drafts

The design-review bags (names, photos, descriptions) can be loaded as **drafts** so the owner does not start from
nothing. Nothing is published and **prices are left empty** (the review prices were placeholders).

```bash
# in .env.local: project id + dataset + SANITY_API_WRITE_TOKEN (Editor token from manage → API → Tokens)
npm run import:products                 # dry run: lists what would be created, writes nothing
npm run import:products -- --apply      # uploads the photos and creates the drafts
```

- Several photos of the same bag are one product (the two burgundy-clutch photos are one gallery).
- Existing documents with the same slug are skipped, so it is safe to run again.
- In the Studio: publish the **Collections** first, then open each product, set the real price, check the text, publish.
- Add `--with-sample-prices` only if you want the review prices pre-filled (still drafts).

## 8. Verify

Run the local checks any time:

```bash
npm run lint && npm run build
npm run test:cms        # connected-mode checks against a local stand-in for Sanity (see below)
```

`npm run test:cms` starts a stand-in for the Sanity API (`scripts/testing`), builds the site against it and checks:
drafts and hidden products never show, sold-out bags stay visible but can't be bought, the webhook rejects bad
signatures and accepts good ones, published changes only appear after a valid webhook, the cart check reports
removed/sold-out/re-priced bags, and `/studio` is separate from the storefront. It proves **our code**; it cannot
prove the real Sanity service, so also do the live walkthrough once credentials exist.

**Live walkthrough** (≈10 minutes, after steps 1–6): follow "Try it" at the end of `docs/OWNER-GUIDE.md`: create a
draft, upload photos, publish, edit the price, feature it, mark it sold out, hide it, and watch the website follow.

---

## What lives where

| Thing | File |
| --- | --- |
| Content types (Products, Collections, Shop Settings) | `src/sanity/schemaTypes/` |
| Dashboard navigation + single-document Shop Settings | `src/sanity/structure.ts`, `sanity.config.ts` |
| Dashboard route and its own layout | `src/app/(studio)/` |
| Storefront (header, cart, animations) | `src/app/(site)/` |
| Queries, image helper, mapping to the shop's types | `src/sanity/lib/` |
| Cached data layer (`use cache` + tags) | `src/lib/catalog.ts` |
| Signed webhook | `src/app/api/revalidate/route.ts` |
| Live price/availability check for the bag | `src/app/api/catalog/check/route.ts` |
| Environment validation | `src/sanity/env.ts`, `src/lib/env.ts`, `scripts/check-env.mjs` |
| Demo (sample) data, separate from Sanity | `src/data/demo-products.ts` |

## Troubleshooting

- **Build fails with "Sanity is not configured"** → fill the variables (step 2/4), or set `SHOP_DATA_SOURCE=demo`.
- **Studio says "Project not found" or CORS errors** → wrong Project ID, or the address is missing from CORS (step 3).
- **Published, but the website did not change** → check the webhook's *Attempts* in Sanity: `401` = secret mismatch,
  `503` = secret missing on Vercel, `404` = wrong URL. The change also appears within an hour on its own.
- **A product is missing from the website** → it is a draft, hidden, has no price, or has no photo (see the Studio's
  "Hidden from storefront" list; products without price/photo are skipped, and a warning appears in the server logs).
- **Photos don't load** → the image host is `cdn.sanity.io/images/<project id>/…`; the Project ID must be available at
  build time (step 4).
