import { defineQuery } from "next-sanity";

/**
 * GROQ queries. Every query:
 *  - ignores draft documents (`drafts.` ids) on top of the client's "published" perspective, and
 *  - leaves out hidden products, so a hidden bag disappears from listings, the featured section,
 *    the hero, the cart check and any direct lookup.
 */
const PUBLISHED = `!(_id in path("drafts.**"))`;

export const PRODUCTS_QUERY = defineQuery(`
*[_type == "product" && ${PUBLISHED} && defined(slug.current) && hidden != true]
  | order(coalesce(displayOrder, 9999) asc, name asc) {
  _id,
  "slug": slug.current,
  name,
  description,
  price,
  "availability": coalesce(availability, "available"),
  "featured": featured == true,
  displayOrder,
  "collection": collection->{ "slug": slug.current, name },
  "colors": colors[]{ name, "hex": swatch.hex, "hex2": secondarySwatch.hex },
  "images": images[defined(asset._ref)]{ alt, crop, hotspot, "ref": asset._ref }
}`);

export const COLLECTIONS_QUERY = defineQuery(`
*[_type == "collection" && ${PUBLISHED} && defined(slug.current)]
  | order(coalesce(displayOrder, 9999) asc, name asc) {
  _id,
  "slug": slug.current,
  name,
  displayOrder,
  "showAsSection": showAsSection == true
}`);

/** The Shop Settings singleton (its document id is fixed). */
export const SETTINGS_QUERY = defineQuery(`
*[_type == "shopSettings" && _id == "shopSettings"][0] {
  brandName,
  "logo": logo{ alt, crop, hotspot, "ref": asset._ref },
  currency,
  whatsappNumber,
  email,
  location,
  "socialLinks": socialLinks[]{ platform, url },
  heroHeadline,
  heroIntro,
  craftHeading,
  craftText
}`);

/** Fresh price and availability for the products in a cart (see /api/catalog/check). */
export const CART_CHECK_QUERY = defineQuery(`
*[_type == "product" && ${PUBLISHED} && defined(slug.current) && hidden != true && slug.current in $slugs] {
  "slug": slug.current,
  name,
  price,
  "availability": coalesce(availability, "available")
}`);
