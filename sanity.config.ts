"use client";

/**
 * Sanity Studio configuration: the owner's dashboard, embedded in this app at /studio.
 * Sign-in, invitations and permissions are handled by Sanity (manage.sanity.io → Members);
 * there is no separate account system in this project.
 */
import { colorInput } from "@sanity/color-input";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { siteConfig } from "@/config/site";
import { apiVersion, dataset, projectId } from "@/sanity/env";
import { schemaTypes } from "@/sanity/schemaTypes";
import { structure } from "@/sanity/structure";

/** Shop Settings is a single document: hide the actions that would create a second copy or remove it. */
const SINGLETONS = new Set(["shopSettings"]);
const BLOCKED_SINGLETON_ACTIONS = new Set(["delete", "duplicate", "unpublish"]);

export default defineConfig({
  name: "default",
  title: `${siteConfig.brandName} shop`,
  basePath: "/studio",
  // The Studio route renders a setup notice instead of the Studio when these are missing (see its page).
  projectId: projectId || "unconfigured",
  dataset: dataset || "production",
  apiVersion,
  schema: {
    types: schemaTypes,
    templates: (templates) => templates.filter(({ schemaType }) => !SINGLETONS.has(schemaType)),
  },
  document: {
    actions: (input, context) =>
      SINGLETONS.has(context.schemaType) ? input.filter(({ action }) => !(action && BLOCKED_SINGLETON_ACTIONS.has(action))) : input,
  },
  plugins: [structureTool({ structure }), colorInput()],
});
