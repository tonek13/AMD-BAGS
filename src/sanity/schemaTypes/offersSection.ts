import { SparklesIcon } from "@sanity/icons/Sparkles";
import { defineArrayMember, defineField, defineType } from "sanity";

/** Document id of the one and only Offers document. */
export const OFFERS_ID = "offersSection";

/**
 * Offers like “buy 2, get the 3rd free”. Each offer lists the bags it covers; at checkout, for every
 * group of (buy + free) of those bags in the bag, the cheapest ones are free. While “Show the offers” is
 * on they appear on an Offers shelf (and page, and menu entry) and are applied to the total.
 */
export const offersSectionType = defineType({
  name: "offersSection",
  title: "Offers",
  type: "document",
  icon: SparklesIcon,
  fields: [
    defineField({
      name: "show",
      title: "Show the offers on the website",
      type: "boolean",
      description: "On: the Offers shelf, its page and its menu entry appear, and the offers are applied at checkout. Off: all of it is hidden.",
      initialValue: false,
    }),
    defineField({
      name: "title",
      title: "Shelf title (optional)",
      type: "string",
      description: "Leave empty for “Offers”.",
      validation: (rule) => rule.max(40),
    }),
    defineField({
      name: "offers",
      title: "Offers",
      type: "array",
      description: "Each offer covers some bags. A bag should be in one offer only; if it is in several, the first one wins.",
      of: [
        defineArrayMember({
          type: "object",
          name: "offer",
          title: "Offer",
          fields: [
            defineField({
              name: "title",
              title: "Name (optional)",
              type: "string",
              description: "e.g. “Pouch trio”. Leave empty to show just the rule, like “Buy 2, get 1 free”.",
              validation: (rule) => rule.max(60),
            }),
            defineField({
              name: "products",
              title: "Bags in this offer",
              type: "array",
              of: [defineArrayMember({ type: "reference", to: [{ type: "product" }] })],
              validation: (rule) => rule.required().min(1),
            }),
            defineField({
              name: "buy",
              title: "Customer buys",
              type: "number",
              description: "How many bags they pay for in each group, e.g. 2.",
              initialValue: 2,
              validation: (rule) => rule.required().integer().min(1).max(10),
            }),
            defineField({
              name: "free",
              title: "…and gets free",
              type: "number",
              description: "How many more bags are free in each group, e.g. 1. The cheapest ones in the group are the free ones.",
              initialValue: 1,
              validation: (rule) => rule.required().integer().min(1).max(10),
            }),
          ],
          preview: {
            select: { title: "title", buy: "buy", free: "free", products: "products" },
            prepare: ({ title, buy, free, products }) => ({
              title: title || `Buy ${buy ?? "?"}, get ${free ?? "?"} free`,
              subtitle: `Buy ${buy ?? "?"}, get ${free ?? "?"} free · ${Array.isArray(products) ? products.length : 0} bags`,
            }),
          },
        }),
      ],
    }),
  ],
  preview: {
    select: { show: "show", offers: "offers" },
    prepare: ({ show, offers }) => ({
      title: "Offers",
      subtitle: `${show ? "Shown on the website" : "Hidden"} · ${Array.isArray(offers) ? offers.length : 0} offers`,
    }),
  },
});
