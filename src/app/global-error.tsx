"use client";

/**
 * Shown if the shop's data cannot be loaded at all (for example Sanity is unreachable and nothing is
 * cached yet). It says so plainly: the site never swaps in sample products to hide the problem.
 * It replaces the root layout, so it brings its own <html> and <body>.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f6efe3",
          color: "#231f20",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <main style={{ maxWidth: 520, padding: "0 24px", textAlign: "center", lineHeight: 1.55 }}>
          <h1 style={{ fontSize: 28, margin: "0 0 12px" }}>The shop can’t load right now</h1>
          <p style={{ margin: "0 0 24px" }}>
            We couldn’t reach our product list. Nothing is wrong with your device. Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ padding: "12px 24px", border: 0, borderRadius: 999, background: "#6b1631", color: "#fff", font: "inherit", cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
