import { PackageIcon } from "@sanity/icons/Package";
import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * One bag for sale. Only fields the shop actually uses are here: no invented specifications or
 * policies. A published product appears on the website unless "Hide from storefront" is on.
 */
export const productType = defineType({
  name: "product",
  title: "Product",
  type: "document",
  icon: PackageIcon,
  groups: [
    { name: "details", title: "Details", default: true },
    { name: "photos", title: "Photos" },
    { name: "shop", title: "Price & availability" },
  ],
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      group: "details",
      description: "The bag's name, as customers see it.",
      validation: (rule) => rule.required().max(80),
    }),
    defineField({
      name: "slug",
      title: "URL slug",
      type: "slug",
      group: "details",
      description: "The short web-safe version of the name. Click Generate; it must be unique.",
      options: { source: "name", maxLength: 80 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 5,
      group: "details",
      description: "A few sentences about the bag. The first sentence is also used as the short line under its name.",
      validation: (rule) => rule.max(1200).warning("Descriptions over 1,200 characters are very long for a product card."),
    }),
    defineField({
      name: "collection",
      title: "Collection",
      type: "reference",
      to: [{ type: "collection" }],
      group: "details",
      description: "Which group this bag belongs to. Publish the collection first so it can be chosen here.",
    }),
    defineField({
      name: "colors",
      title: "Available colors",
      type: "array",
      group: "details",
      description:
        "Add every colour this bag comes in. Use the same colour name on every bag that comes in it: that is what the website's colour filter groups by.",
      of: [
        defineArrayMember({
          type: "object",
          name: "colorOption",
          title: "Color",
          fields: [
            defineField({
              name: "name",
              title: "Color name",
              type: "string",
              description: "e.g. Burgundy",
              validation: (rule) => rule.required().max(40),
            }),
            defineField({
              name: "swatch",
              title: "Swatch",
              type: "color",
              description: "The dot shown in the filter. Pick a colour close to the yarn.",
              options: { disableAlpha: true },
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "secondarySwatch",
              title: "Second swatch (two-tone bags)",
              type: "color",
              description: "Optional. Adds a second colour to the dot for two-tone bags.",
              options: { disableAlpha: true },
            }),
          ],
          preview: {
            select: { title: "name", hex: "swatch.hex" },
            prepare: ({ title, hex }) => ({ title, subtitle: hex }),
          },
        }),
      ],
      validation: (rule) =>
        rule.custom((colors?: { name?: string }[]) => {
          const names = (colors ?? []).map((c) => (c.name ?? "").trim().toLowerCase()).filter(Boolean);
          return new Set(names).size === names.length ? true : "Each colour should be listed only once.";
        }),
    }),
    defineField({
      name: "images",
      title: "Photos",
      type: "array",
      group: "photos",
      description:
        "Drag to put them in order: the first photo is the cover. Use the crop and hotspot tools (click a photo) to choose the part that always stays in view when the website crops it.",
      options: { layout: "grid" },
      of: [
        defineArrayMember({
          type: "image",
          options: { hotspot: true },
          fields: [
            defineField({
              name: "alt",
              title: "Alternative text",
              type: "string",
              description: "Describe what the photo shows, e.g. “Burgundy clutch on a stone wall”. Read aloud by screen readers.",
              validation: (rule) => rule.required().max(160),
            }),
          ],
        }),
      ],
      validation: (rule) => rule.required().min(1).max(12),
    }),
    defineField({
      name: "price",
      title: "Price",
      type: "number",
      group: "shop",
      description: "A plain number in the shop's currency (set in Shop Settings), e.g. 88 or 88.50.",
      validation: (rule) => rule.required().min(0).precision(2),
    }),
    defineField({
      name: "availability",
      title: "Availability",
      type: "string",
      group: "shop",
      description: "Sold-out bags stay visible with a label but cannot be added to the bag.",
      options: {
        list: [
          { title: "Available", value: "available" },
          { title: "Sold out", value: "sold-out" },
        ],
        layout: "radio",
      },
      initialValue: "available",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "hidden",
      title: "Hide from storefront",
      type: "boolean",
      group: "shop",
      description: "Turn on to remove this bag from the website without deleting it. Turn off again to bring it back.",
      initialValue: false,
    }),
    defineField({
      name: "featured",
      title: "Feature in the animated showcase",
      type: "boolean",
      group: "shop",
      description:
        "Adds the bag to the full-screen “Featured bags” section. Its background colour is matched to the bag automatically.",
      initialValue: false,
    }),
    defineField({
      name: "displayOrder",
      title: "Display order",
      type: "number",
      group: "shop",
      description:
        "Lower numbers come first (1, 2, 3…), in the collection and in the featured section. Bags without a number come last.",
      validation: (rule) => rule.integer().min(0),
    }),
  ],
  orderings: [
    {
      title: "Display order",
      name: "displayOrder",
      by: [
        { field: "displayOrder", direction: "asc" },
        { field: "name", direction: "asc" },
      ],
    },
    { title: "Name (A–Z)", name: "name", by: [{ field: "name", direction: "asc" }] },
    { title: "Price (low to high)", name: "priceAsc", by: [{ field: "price", direction: "asc" }] },
  ],
  preview: {
    select: {
      title: "name",
      price: "price",
      availability: "availability",
      hidden: "hidden",
      featured: "featured",
      media: "images.0",
    },
    prepare: ({ title, price, availability, hidden, featured, media }) => ({
      title,
      media,
      subtitle: [
        typeof price === "number" ? String(price) : "No price",
        availability === "sold-out" ? "Sold out" : null,
        hidden ? "Hidden" : null,
        featured ? "Featured" : null,
      ]
        .filter(Boolean)
        .join(" · "),
    }),
  },
});
