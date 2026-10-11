/**
 * Cache tags shared by the data layer (which tags what it caches) and the signed webhook
 * (which expires them). A change to one kind of document expires exactly these tags.
 */
export const CACHE_TAGS = {
  product: "sanity:product",
  collection: "sanity:collection",
  settings: "sanity:shopSettings",
} as const;

/** Sanity document type → the cache tags its changes invalidate. */
export const TAGS_BY_TYPE: Record<string, string[]> = {
  // Product data embeds collection names, and the filter list depends on which collections have bags.
  product: [CACHE_TAGS.product, CACHE_TAGS.collection],
  collection: [CACHE_TAGS.collection, CACHE_TAGS.product],
  shopSettings: [CACHE_TAGS.settings],
};
