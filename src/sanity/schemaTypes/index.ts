import type { SchemaTypeDefinition } from "sanity";
import { collectionType } from "./collection";
import { productType } from "./product";
import { shopSettingsType } from "./shopSettings";

export const schemaTypes: SchemaTypeDefinition[] = [productType, collectionType, shopSettingsType];
