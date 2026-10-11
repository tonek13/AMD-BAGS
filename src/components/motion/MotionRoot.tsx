"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, registerGsap } from "@/lib/gsap";
import { setLenis } from "@/lib/scroll";

/**
 * Owns the two global motion concerns:
 *  1. the `motion` / `motion-ready` classes on <html> (see the pre-hide rules in globals.css)
 *  2. one Lenis instance for smooth scrolling, desktop pointers only, wired to ScrollTrigger.
 *
 * Children's effects run before this one, so by the time `motion-ready` is set
 * every animated component has already applied its starting state.
 */
export function MotionRoot({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerGsap();
    const html = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

    let lenis: Lenis | null = null;
    let tick: ((time: number) => void) | null = null;

    const stopLenis = () => {
      if (tick) gsap.ticker.remove(tick);
      tick = null;
      lenis?.destroy();
      lenis = null;
      setLenis(null);
    };

    const startLenis = () => {
      lenis = new Lenis({ autoRaf: false, lerp: 0.1, smoothWheel: true });
      lenis.on("scroll", ScrollTrigger.update);
      tick = (time: number) => lenis?.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      setLenis(lenis);
    };

    const sync = () => {
      html.classList.toggle("motion", !reduce.matches);
      stopLenis();
      if (!reduce.matches && finePointer.matches) startLenis();
      ScrollTrigger.refresh();
    };

    sync();
    html.classList.add("motion-ready");
    reduce.addEventListener("change", sync);
    finePointer.addEventListener("change", sync);

    // Fonts and late images change layout; pins and triggers need fresh measurements.
    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh);
    window.addEventListener("load", refresh);

    return () => {
      reduce.removeEventListener("change", sync);
      finePointer.removeEventListener("change", sync);
      window.removeEventListener("load", refresh);
      stopLenis();
    };
  }, []);

  return <>{children}</>;
}
