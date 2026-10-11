import { defineCliConfig } from "sanity/cli";

/**
 * Lets you run `npx sanity …` commands (cors, dataset, deploy…) from this project.
 * Only the project id and dataset are needed here; no secrets.
 */
export default defineCliConfig({
  api: {
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  },
});
