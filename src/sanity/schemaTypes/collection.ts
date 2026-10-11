import { TagIcon } from "@sanity/icons/Tag";
import { defineField, defineType } from "sanity";

/** A group of bags (e.g. "Clutches"). Shown as a filter on the collection section of the website. */
export const collectionType = defineType({
  name: "collection",
  title: "Collection",
  type: "document",
  icon: TagIcon,
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      description: "Shown in the website's filter, e.g. “Clutches” or “Totes & baskets”.",
      validation: (rule) => rule.required().max(60),
    }),
    defineField({
      name: "slug",
      title: "URL slug",
      type: "slug",
      description: "The short web-safe version of the name. Click Generate; it must be unique.",
      options: { source: "name", maxLength: 60 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "image",
      title: "Image (optional)",
      type: "image",
      description: "Not shown on the website yet; kept here for when collection pages are added.",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Alternative text",
          type: "string",
          description: "Describe the photo for people who cannot see it.",
        }),
      ],
    }),
    defineField({
      name: "displayOrder",
      title: "Display order",
      type: "number",
      description: "Lower numbers come first in the filter list (1, 2, 3…). Collections without a number come last.",
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
  ],
  preview: {
    select: { title: "name", media: "image", order: "displayOrder" },
    prepare: ({ title, media, order }) => ({
      title,
      media,
      subtitle: typeof order === "number" ? `Order ${order}` : undefined,
    }),
  },
});
