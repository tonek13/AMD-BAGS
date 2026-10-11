/**
 * Shared scroll helpers. One Lenis instance (desktop only) is registered here
 * by <MotionRoot/>; everything else talks to this module so nothing else needs
 * to know whether smooth scrolling is active.
 */
import type Lenis from "lenis";

let lenis: Lenis | null = null;
let locks = 0;

export function setLenis(instance: Lenis | null) {
  lenis = instance;
  if (instance && locks > 0) instance.stop();
}

export function getLenis() {
  return lenis;
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Called by dialogs while open. Reference-counted so stacked dialogs behave. */
export function lockScroll() {
  locks += 1;
  if (locks === 1) {
    lenis?.stop();
    document.documentElement.classList.add("scroll-locked");
  }
}

export function unlockScroll() {
  locks = Math.max(0, locks - 1);
  if (locks === 0) {
    lenis?.start();
    document.documentElement.classList.remove("scroll-locked");
  }
}

function headerOffset() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--header-h");
  const px = parseFloat(raw);
  return Number.isFinite(px) ? px * (raw.includes("rem") ? 16 : 1) : 60;
}

/** Smooth-scrolls to an element (or "#id"), below the fixed header. */
export function scrollToTarget(target: string | HTMLElement) {
  const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (!el) return;
  // Measure from the browser's real scroll position (not Lenis's internal one, which can lag
  // behind a focus-induced native scroll) and hand Lenis a plain number.
  const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - headerOffset());
  if (lenis && !prefersReducedMotion()) {
    lenis.scrollTo(top, { duration: 1.4 });
  } else {
    window.scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }
  history.replaceState(null, "", el.id ? `#${el.id}` : location.pathname);
}

/** onClick handler for in-page "#anchor" links. Lets modified clicks through. */
export function handleAnchorClick(e: React.MouseEvent<HTMLAnchorElement>) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const href = e.currentTarget.getAttribute("href");
  if (!href || !href.startsWith("#") || href === "#") return;
  const el = document.querySelector<HTMLElement>(href);
  if (!el) return;
  e.preventDefault();
  scrollToTarget(el);
}
