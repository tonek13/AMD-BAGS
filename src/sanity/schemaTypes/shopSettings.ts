import { CogIcon } from "@sanity/icons/Cog";
import { defineArrayMember, defineField, defineType } from "sanity";

/** Document id of the one and only Shop Settings document. */
export const SHOP_SETTINGS_ID = "shopSettings";

const CURRENCIES = [
  ["USD", "US dollar"],
  ["EUR", "Euro"],
  ["GBP", "British pound"],
  ["AED", "UAE dirham"],
  ["SAR", "Saudi riyal"],
  ["QAR", "Qatari riyal"],
  ["KWD", "Kuwaiti dinar"],
  ["BHD", "Bahraini dinar"],
  ["JOD", "Jordanian dinar"],
  ["EGP", "Egyptian pound"],
  ["LBP", "Lebanese pound"],
  ["TRY", "Turkish lira"],
  ["CAD", "Canadian dollar"],
  ["AUD", "Australian dollar"],
  ["CHF", "Swiss franc"],
  ["SEK", "Swedish krona"],
  ["NOK", "Norwegian krone"],
  ["DKK", "Danish krone"],
].map(([value, title]) => ({ value, title: `${value} – ${title}` }));

/** "+961 81 616 199" and "+96181616199" are both fine; digits only after a leading +, 8–15 of them. */
export function isInternationalNumber(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value.replace(/[\s\-().]/g, ""));
}

/** The shop-wide settings: one editable document (it cannot be created twice or deleted). */
export const shopSettingsType = defineType({
  name: "shopSettings",
  title: "Shop Settings",
  type: "document",
  icon: CogIcon,
  groups: [
    { name: "brand", title: "Brand", default: true },
    { name: "ordering", title: "Ordering" },
    { name: "contact", title: "Contact & social" },
    { name: "text", title: "Website text" },
  ],
  fields: [
    defineField({
      name: "brandName",
      title: "Brand name",
      type: "string",
      group: "brand",
      description: "Shown in the website header, footer, browser tab and in the order emails.",
      validation: (rule) => rule.required().max(40),
    }),
    defineField({
      name: "logo",
      title: "Logo",
      type: "image",
      group: "brand",
      description: "Shown next to the brand name in the header. A PNG or SVG with a transparent background works best.",
      fields: [
        defineField({
          name: "alt",
          title: "Alternative text",
          type: "string",
          description: "e.g. “MaisonHook logo”.",
        }),
      ],
    }),
    defineField({
      name: "currency",
      title: "Currency",
      type: "string",
      group: "ordering",
      description:
        "Prices on the website are shown in this currency. Changing it does not convert existing prices: update them yourself.",
      options: { list: CURRENCIES },
      initialValue: "USD",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "deliveryFee",
      title: "Delivery fee",
      type: "number",
      group: "ordering",
      description:
        "Added to every order at checkout, in the shop currency (for example 4 or 4.5). Customers see it in their bag and in the total. Leave empty or 0 for free delivery.",
      initialValue: 0,
      validation: (rule) => rule.min(0).max(1000),
    }),
    defineField({
      name: "whatsappNumber",
      title: "WhatsApp number",
      type: "string",
      group: "ordering",
      description:
        "Shown in the footer and in “Your bag, your way” so customers can ask for a custom bag. Orders do not use it (they arrive by email). Country code first, starting with +, e.g. +96181616199. Leave empty to hide it.",
      validation: (rule) =>
        rule.custom((value) => {
          if (!value) return true;
          return isInternationalNumber(value) || "Use the international format: + then the country code and number, e.g. +96181616199.";
        }),
    }),
    defineField({
      name: "email",
      title: "Email",
      type: "string",
      group: "contact",
      description: "Shown in the footer and in “Your bag, your way” so customers can reach you. Leave empty to hide it. (Orders are emailed to the address set in Vercel, not this one.)",
      validation: (rule) => rule.email(),
    }),
    defineField({
      name: "location",
      title: "Based in",
      type: "string",
      group: "contact",
      description: "e.g. “Beirut, Lebanon”. Leave empty to hide it.",
    }),
    defineField({
      name: "socialLinks",
      title: "Social links",
      type: "array",
      group: "contact",
      description: "Shown in the footer, in this order.",
      of: [
        defineArrayMember({
          type: "object",
          name: "socialLink",
          title: "Social link",
          fields: [
            defineField({
              name: "platform",
              title: "Platform",
              type: "string",
              options: {
                list: [
                  { title: "Instagram", value: "instagram" },
                  { title: "TikTok", value: "tiktok" },
                  { title: "Facebook", value: "facebook" },
                  { title: "Pinterest", value: "pinterest" },
                  { title: "YouTube", value: "youtube" },
                  { title: "X", value: "x" },
                  { title: "Other website", value: "other" },
                ],
              },
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "url",
              title: "Link",
              type: "url",
              description: "The full address, starting with https://",
              validation: (rule) => rule.required().uri({ scheme: ["https"] }),
            }),
          ],
          preview: { select: { title: "platform", subtitle: "url" } },
        }),
      ],
    }),
    defineField({
      name: "heroHeadline",
      title: "Homepage headline",
      type: "text",
      rows: 3,
      group: "text",
      description: "The big headline at the top of the website. One line per row (up to 4); the last line is shown in italics. Leave empty for the default.",
      validation: (rule) =>
        rule.max(120).custom((value) => ((value ?? "").split("\n").filter((l) => l.trim()).length <= 4 ? true : "Use at most 4 lines.")),
    }),
    defineField({
      name: "heroIntro",
      title: "Homepage introduction",
      type: "text",
      rows: 3,
      group: "text",
      description: "One or two sentences under the headline. Leave empty for the default.",
      validation: (rule) => rule.max(240),
    }),
    defineField({
      name: "craftHeading",
      title: "Craft section heading",
      type: "string",
      group: "text",
      description: "Heading of the “Our craft” section. Put *stars* around a word to show it in italics. Leave empty for the default.",
      validation: (rule) => rule.max(80),
    }),
    defineField({
      name: "craftText",
      title: "Craft & story text",
      type: "text",
      rows: 4,
      group: "text",
      description: "The statement in the “Our craft” section, about how the bags are made. Leave empty for the default.",
      validation: (rule) => rule.max(400),
    }),
  ],
  preview: {
    select: { title: "brandName", media: "logo" },
    prepare: ({ title, media }) => ({ title: title || "Shop Settings", subtitle: "One document, always editable", media }),
  },
});
