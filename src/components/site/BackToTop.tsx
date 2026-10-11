"use client";

import { getLenis, prefersReducedMotion } from "@/lib/scroll";

export function BackToTop() {
  return (
    <button
      type="button"
      onClick={() => {
        const lenis = getLenis();
        if (lenis) lenis.scrollTo(0, { duration: 1.6 });
        else window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
      }}
      style={{
        padding: 0,
        border: 0,
        background: "none",
        font: "inherit",
        fontWeight: 600,
        textAlign: "left",
        textDecoration: "underline",
        textUnderlineOffset: "4px",
      }}
    >
      Back to top ↑
    </button>
  );
}
