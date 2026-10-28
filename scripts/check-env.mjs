// Checks the environment the shop needs and says exactly what is missing.
//
//   npm run check:env                 reads .env.local (and the shell environment)
//
// Never prints a secret's value, only whether it is set.
import { existsSync, readFileSync } from "node:fs";

function loadEnvFile(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trim().startsWith("#")) out[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return out;
}

const env = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local"), ...process.env };
const get = (k) => (env[k] ?? "").trim();
const source = (get("SHOP_DATA_SOURCE") || "sanity").toLowerCase();

const lines = [];
let problems = 0;
const ok = (msg) => lines.push(`  ✔ ${msg}`);
const bad = (msg) => {
  problems++;
  lines.push(`  ✖ ${msg}`);
};
const note = (msg) => lines.push(`  • ${msg}`);

console.log(`Data source: ${source}`);
if (source !== "sanity" && source !== "demo") {
  bad('SHOP_DATA_SOURCE must be "sanity" or "demo".');
} else if (source === "demo") {
  note("Demo mode: the site shows the built-in sample bags, labelled as demo. Sanity is not used.");
} else {
  const id = get("NEXT_PUBLIC_SANITY_PROJECT_ID");
  const ds = get("NEXT_PUBLIC_SANITY_DATASET");
  const version = get("NEXT_PUBLIC_SANITY_API_VERSION") || "2025-02-19";
  if (!id) bad("NEXT_PUBLIC_SANITY_PROJECT_ID is not set.");
  else if (!/^[a-z0-9-]+$/.test(id)) bad("NEXT_PUBLIC_SANITY_PROJECT_ID looks wrong (lowercase letters, numbers and dashes only).");
  else ok(`Project id: ${id}`);
  if (!ds) bad("NEXT_PUBLIC_SANITY_DATASET is not set (usually \"production\").");
  else if (!/^[a-z0-9][a-z0-9_-]*$/.test(ds)) bad("NEXT_PUBLIC_SANITY_DATASET looks wrong.");
  else ok(`Dataset: ${ds}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(version)) bad("NEXT_PUBLIC_SANITY_API_VERSION must be a date like 2025-02-19.");
  else ok(`API version: ${version}`);

  const secret = get("SANITY_REVALIDATE_SECRET");
  if (!secret) bad("SANITY_REVALIDATE_SECRET is not set: published changes will not refresh the site (the webhook refuses unsigned requests).");
  else if (secret.length < 24) bad("SANITY_REVALIDATE_SECRET is short; use at least 24 random characters.");
  else ok("SANITY_REVALIDATE_SECRET is set");

  note(get("SANITY_API_READ_TOKEN") ? "SANITY_API_READ_TOKEN is set (private dataset mode)." : "No read token: fine for a public dataset.");
  note(get("SANITY_API_WRITE_TOKEN") ? "SANITY_API_WRITE_TOKEN is set (only the import script uses it; keep it out of Vercel)." : "No write token: only needed for the optional import script.");
}

// Order emails (Resend). Needed in every mode: the shop emails each order to the owner.
const resendKey = get("RESEND_API_KEY");
const orderTo = get("ORDER_EMAIL_TO");
lines.push("");
lines.push("Order emails (Resend):");
if (!resendKey) bad("RESEND_API_KEY is not set: customers cannot place orders (they are told ordering is not open yet).");
else ok("RESEND_API_KEY is set");
if (!orderTo) bad("ORDER_EMAIL_TO is not set: there is nowhere to send orders.");
else if (orderTo.split(",").some((a) => !/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(a.trim()))) bad("ORDER_EMAIL_TO contains something that is not an email address.");
else ok("ORDER_EMAIL_TO is set");
note(
  get("ORDER_EMAIL_FROM")
    ? "ORDER_EMAIL_FROM is set."
    : "No ORDER_EMAIL_FROM: Resend's test sender (onboarding@resend.dev) is used, and it can only deliver to your own Resend account email. Verify a domain in Resend and set a sender before going live.",
);

console.log(lines.join("\n"));
console.log(problems ? `\n${problems} problem${problems > 1 ? "s" : ""} to fix. See .env.example and docs/SANITY-SETUP.md.` : "\nEnvironment looks good.");
process.exit(problems ? 1 : 0);
