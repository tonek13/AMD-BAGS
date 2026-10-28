import { TagsIcon } from "@sanity/icons/Tags";
import { defineArrayMember, defineField, defineType } from "sanity";

/** Document id of the one and only Sale document. */
export const SALE_ID = "saleSection";

/**
 * The Sale shelf: bags with a previous price and a new price. While "Show the sale" is on, the bags
 * appear on a Sale shelf (and page, and menu entry) with the old price struck through, and the new
 * price is what customers are charged. Switch it off and everything goes back to the normal prices.
 */
export const saleSectionType = defineType({
  name: "saleSection",
  title: "Sale",
  type: "document",
  icon: TagsIcon,
  fields: [
    defineField({
      name: "show",
      title: "Show the sale on the website",
      type: "boolean",
      description:
        "On: the Sale shelf, its page and its menu entry appear, and customers pay the new prices below. Off: all of it is hidden and the normal prices apply.",
      initialValue: false,
    }),
    defineField({
      name: "title",
      title: "Shelf title (optional)",
      type: "string",
      description: "Leave empty for “Sale”.",
      validation: (rule) => rule.max(40),
    }),
    defineField({
      name: "items",
      title: "Bags on sale",
      type: "array",
      description: "Add each bag, then its previous price and its new price (both in the shop currency, as numbers like 70 or 49.5).",
      of: [
        defineArrayMember({
          type: "object",
          name: "saleItem",
          title: "Bag on sale",
          fields: [
            defineField({
              name: "product",
              title: "Bag",
              type: "reference",
              to: [{ type: "product" }],
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "previousPrice",
              title: "Previous price",
              type: "number",
              description: "Shown struck through.",
              validation: (rule) => rule.required().min(0),
            }),
            defineField({
              name: "newPrice",
              title: "New price",
              type: "number",
              description: "What customers pay while the sale is on. Must be lower than the previous price.",
              validation: (rule) =>
                rule.required().min(0).custom((value, context) => {
                  const previous = (context.parent as { previousPrice?: number } | undefined)?.previousPrice;
                  if (typeof value !== "number" || typeof previous !== "number") return true;
                  return value < previous || "The new price must be lower than the previous price.";
                }),
            }),
          ],
          preview: {
            select: { title: "product.name", previous: "previousPrice", price: "newPrice", media: "product.images.0" },
            prepare: ({ title, previous, price, media }) => ({
              title: title || "Choose a bag",
              subtitle: typeof previous === "number" && typeof price === "number" ? `${previous} → ${price}` : undefined,
              media,
            }),
          },
        }),
      ],
      validation: (rule) =>
        rule.custom((items: { product?: { _ref?: string } }[] | undefined) => {
          const refs = (items ?? []).map((i) => i.product?._ref).filter(Boolean);
          return new Set(refs).size === refs.length || "A bag can only be on sale once.";
        }),
    }),
  ],
  preview: {
    select: { show: "show", items: "items" },
    prepare: ({ show, items }) => ({
      title: "Sale",
      subtitle: `${show ? "Shown on the website" : "Hidden"} · ${Array.isArray(items) ? items.length : 0} bags`,
    }),
  },
});
