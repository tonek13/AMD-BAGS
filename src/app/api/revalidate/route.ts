import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { parseBody } from "next-sanity/webhook";
import { getRevalidateSecret } from "@/lib/env";
import { TAGS_BY_TYPE } from "@/sanity/tags";

/**
 * Signed Sanity webhook: expires the cached storefront data when content changes.
 *
 * Every request must carry a valid `sanity-webhook-signature` made with SANITY_REVALIDATE_SECRET;
 * anything else is rejected before a single cache entry is touched. Publishing, unpublishing,
 * editing and deleting a product, collection or the shop settings all arrive here.
 *
 * Webhook setup (Sanity → API → Webhooks), see docs/SANITY-SETUP.md:
 *   URL         https://<your-domain>/api/revalidate
 *   Trigger on  Create, Update, Delete
 *   Filter      _type in ["product", "collection", "shopSettings", "saleSection", "offersSection"]
 *   Projection  {_type, _id}
 *   Method      POST        Drafts: off        Secret: same value as SANITY_REVALIDATE_SECRET
 */
interface WebhookPayload {
  _type?: unknown;
  _id?: unknown;
}

export async function POST(req: NextRequest) {
  const secret = getRevalidateSecret();
  if (!secret) {
    // Refuse everything rather than accept unsigned requests when the secret is missing.
    return NextResponse.json({ revalidated: false, message: "SANITY_REVALIDATE_SECRET is not configured." }, { status: 503 });
  }

  let parsed: Awaited<ReturnType<typeof parseBody<WebhookPayload | WebhookPayload[]>>>;
  try {
    parsed = await parseBody<WebhookPayload | WebhookPayload[]>(req, secret, true);
  } catch {
    return NextResponse.json({ revalidated: false, message: "Unreadable request body." }, { status: 400 });
  }

  // `isValidSignature` is null when no secret was supplied and false for a wrong or missing
  // signature: only an explicit `true` is accepted.
  if (parsed.isValidSignature !== true) {
    return NextResponse.json({ revalidated: false, message: "Invalid signature." }, { status: 401 });
  }

  const payloads = Array.isArray(parsed.body) ? parsed.body : parsed.body ? [parsed.body] : [];
  const tags = new Set<string>();
  for (const payload of payloads) {
    if (typeof payload?._type !== "string") continue;
    for (const tag of TAGS_BY_TYPE[payload._type] ?? []) tags.add(tag);
  }

  if (tags.size === 0) {
    return NextResponse.json({ revalidated: false, message: "No cached content depends on this document type." }, { status: 200 });
  }

  // { expire: 0 }: the next visitor gets the fresh page, never a stale one (the webhook cannot use updateTag).
  for (const tag of tags) revalidateTag(tag, { expire: 0 });

  return NextResponse.json({ revalidated: true, tags: [...tags] });
}
