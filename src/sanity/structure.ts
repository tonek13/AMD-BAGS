import { CogIcon } from "@sanity/icons/Cog";
import { EyeClosedIcon } from "@sanity/icons/EyeClosed";
import { PackageIcon } from "@sanity/icons/Package";
import { SparklesIcon } from "@sanity/icons/Sparkles";
import { StarIcon } from "@sanity/icons/Star";
import { TagIcon } from "@sanity/icons/Tag";
import { TagsIcon } from "@sanity/icons/Tags";
import type { StructureResolver } from "sanity/structure";
import { OFFERS_ID } from "./schemaTypes/offersSection";
import { SALE_ID } from "./schemaTypes/saleSection";
import { SHOP_SETTINGS_ID } from "./schemaTypes/shopSettings";

/**
 * The dashboard's left-hand navigation: Products, Collections, Sale, Offers, Shop Settings.
 * Sale, Offers and Shop Settings each open their single document directly (no list, no "create new").
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Shop")
    .items([
      S.listItem()
        .title("Products")
        .icon(PackageIcon)
        .child(
          S.list()
            .title("Products")
            .items([
              S.listItem().title("All products").icon(PackageIcon).child(S.documentTypeList("product").title("All products")),
              S.listItem()
                .title("Featured in the showcase")
                .icon(StarIcon)
                .child(S.documentList().title("Featured in the showcase").filter('_type == "product" && featured == true')),
              S.listItem()
                .title("Sold out")
                .child(S.documentList().title("Sold out").filter('_type == "product" && availability == "sold-out"')),
              S.listItem()
                .title("Hidden from storefront")
                .icon(EyeClosedIcon)
                .child(S.documentList().title("Hidden from storefront").filter('_type == "product" && hidden == true')),
            ]),
        ),
      S.listItem()
        .title("Collections")
        .icon(TagIcon)
        .child(S.documentTypeList("collection").title("Collections")),
      S.divider(),
      S.listItem()
        .title("Sale")
        .icon(TagsIcon)
        .child(S.document().schemaType("saleSection").documentId(SALE_ID).title("Sale")),
      S.listItem()
        .title("Offers")
        .icon(SparklesIcon)
        .child(S.document().schemaType("offersSection").documentId(OFFERS_ID).title("Offers")),
      S.divider(),
      S.listItem()
        .title("Shop Settings")
        .icon(CogIcon)
        .child(S.document().schemaType("shopSettings").documentId(SHOP_SETTINGS_ID).title("Shop Settings")),
    ]);
