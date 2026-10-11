import { CogIcon } from "@sanity/icons/Cog";
import { EyeClosedIcon } from "@sanity/icons/EyeClosed";
import { PackageIcon } from "@sanity/icons/Package";
import { StarIcon } from "@sanity/icons/Star";
import { TagIcon } from "@sanity/icons/Tag";
import type { StructureResolver } from "sanity/structure";
import { SHOP_SETTINGS_ID } from "./schemaTypes/shopSettings";

/**
 * The dashboard's left-hand navigation: Products, Collections, Shop Settings.
 * Shop Settings opens the single settings document directly (no list, no "create new").
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
        .title("Shop Settings")
        .icon(CogIcon)
        .child(S.document().schemaType("shopSettings").documentId(SHOP_SETTINGS_ID).title("Shop Settings")),
    ]);
