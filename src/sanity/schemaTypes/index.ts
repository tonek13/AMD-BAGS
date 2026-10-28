import type { SchemaTypeDefinition } from "sanity";
import { collectionType } from "./collection";
import { offersSectionType } from "./offersSection";
import { productType } from "./product";
import { saleSectionType } from "./saleSection";
import { shopSettingsType } from "./shopSettings";

export const schemaTypes: SchemaTypeDefinition[] = [productType, collectionType, saleSectionType, offersSectionType, shopSettingsType];
