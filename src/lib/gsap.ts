"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { Flip } from "gsap/Flip";

let registered = false;

/** Registers GSAP plugins exactly once. Safe to call from any client effect. */
export function registerGsap() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, Flip);
  registered = true;
}

export { gsap, ScrollTrigger, Flip };
