import { NextStudio } from "next-sanity/studio";
import config from "../../../../../sanity.config";
import { validateSanityEnv } from "@/sanity/env";

// Keeps the Studio out of search results and sets the mobile viewport Studio needs.
export { metadata, viewport } from "next-sanity/studio";

export default function StudioPage() {
  const env = validateSanityEnv();

  if (!env.ok) {
    return (
      <main style={{ maxWidth: 620, margin: "12vh auto", padding: "0 24px", fontFamily: "system-ui, sans-serif", lineHeight: 1.55 }}>
        <h1 style={{ fontSize: 24 }}>The dashboard is not connected yet</h1>
        <p>Sanity needs these settings before the Studio can open:</p>
        <ul>
          {env.problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <p>
          Add them to <code>.env.local</code> (see <code>.env.example</code> and <code>docs/SANITY-SETUP.md</code>), then restart the
          server.
        </p>
      </main>
    );
  }

  return <NextStudio config={config} />;
}
