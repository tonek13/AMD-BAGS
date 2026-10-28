import Link from "next/link";
import { getShopSettings } from "@/lib/catalog";
import { Footer } from "@/components/site/Footer";

export default async function NotFound() {
  const settings = await getShopSettings();

  return (
    <>
      <main
        id="main"
        style={{ display: "grid", placeItems: "center", minHeight: "80svh", padding: "calc(var(--header-h) + 3rem) var(--gutter) 4rem", textAlign: "center" }}
      >
        <div style={{ display: "grid", justifyItems: "center", gap: "1.2rem" }}>
          <p className="eyebrow" style={{ color: "var(--gold-deep)" }}>
            404
          </p>
          <h1 className="display" style={{ fontSize: "clamp(2.6rem, 7vw, 5.5rem)" }}>
            This stitch <em>came undone.</em>
          </h1>
          <p style={{ maxWidth: "28rem", color: "var(--ink-soft)" }}>We couldn’t find that page. The bag or shelf may have moved, or sold out of the shop.</p>
          <Link href="/#collection" className="btn">
            Browse the bags
          </Link>
        </div>
      </main>
      <Footer settings={settings} />
    </>
  );
}
