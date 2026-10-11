import { gsap } from "@/lib/gsap";
import { bag, ROW_COUNT } from "./bagGeometry";
import { storyStages } from "./stages";

/**
 * The scroll story: ONE continuous GSAP timeline scrubbed by ScrollTrigger.
 * Every tween is a plain `to` / `fromTo`, so scrolling backwards reverses the whole
 * sequence – strand, rows, handle, colours, captions and type – exactly.
 *
 *   0 ─ 3.3    1  Thread       a loose strand curves across the screen
 * 3.3 ─ 6.5    2  Foundation   the strand winds into a ring (the base)
 * 6.5 ─ 14.5   3  Stitch       the real clutch is worked in, row by row, then its handle opening
 *14.5 ─ 18.6   4  Handle       the thick braided arch is worked over the top
 *18.6 ─ 23.0   5  Companion    the finished bag settles beside a real photograph
 */

const STAGE_START = [0, 3.3, 6.5, 14.5, 18.6] as const;
const END = 23;

const ROW_START = 6.9;
const ROW_DUR = 6.3 / ROW_COUNT; // the rows fill the stretch from 6.9 to ~13.2
const ROW_DRAW = ROW_DUR * 0.82; // portion of a row spent travelling along it

const variation = (wght: number, soft: number, wonk: number) =>
  `'wght' ${wght}, 'SOFT' ${soft}, 'WONK' ${wonk}, 'opsz' 144`;

/**
 * Puts every element the timeline animates back to its authored (finished) state.
 * Run before each build and on cleanup so a re-run (React strict mode, a breakpoint change,
 * reduced motion being switched on) never inherits stale transforms or leaves content hidden.
 */
export function resetStory(root: HTMLElement) {
  gsap.set(root.querySelectorAll("[data-s]"), {
    clearProps: "transform,opacity,visibility,strokeDasharray,strokeDashoffset,fontVariationSettings,clipPath,--p",
  });
  gsap.set(root, { clearProps: "backgroundColor,color" });
}

export function buildStoryTimeline(root: HTMLElement, { mobile }: { mobile: boolean }) {
  const all = <T extends Element>(selector: string) => Array.from(root.querySelectorAll<T>(selector));
  const one = <T extends Element>(selector: string) => {
    const el = root.querySelector<T>(selector);
    if (!el) throw new Error(`Story element missing: ${selector}`);
    return el;
  };

  const steps = all<HTMLElement>('[data-s="step"]');
  const words = all<HTMLElement>('[data-s="word"]');
  const dots = all<HTMLElement>('[data-s="dot"]');
  const progress = one<HTMLElement>('[data-s="progress"]');
  const art = one<HTMLElement>('[data-s="art"]');
  const svg = one<SVGSVGElement>("svg");
  const card = one<HTMLElement>('[data-s="card"]');
  const cta = one<HTMLElement>('[data-s="cta"]');
  const skip = one<HTMLElement>('[data-s="skip"]');

  const shadow = one<SVGElement>('[data-s="shadow"]');
  const strandGroup = one<SVGElement>('[data-s="strand"]');
  const strandPaths = all<SVGPathElement>('[data-s="strand-path"]');
  const ringGroup = one<SVGElement>('[data-s="ring"]');
  const ringPaths = all<SVGPathElement>('[data-s="ring-path"]');
  const rowEls = all<SVGGElement>('[data-s="row"]');
  const closer = one<SVGElement>('[data-s="closer"]');
  const slotReveal = one<SVGPathElement>('[data-s="slot-reveal"]');
  const slotGuide = one<SVGPathElement>('[data-s="slot-guide"]');
  const archReveal = one<SVGPathElement>('[data-s="arch-reveal"]');
  const hook = one<SVGGElement>('[data-s="hook"]');

  const { rows } = bag;

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: root,
      start: "top top",
      end: `+=${mobile ? 280 : 420}%`,
      pin: true,
      scrub: 0.9,
      anticipatePin: 1,
      // Deliberately NOT invalidateOnRefresh: it re-parses yPercent offsets as pixels on every
      // resize and shoves the stage words out of their masks. Everything below is resize-safe.
    },
  });

  /* ── starting state: everything but the first frame is hidden ───────── */
  gsap.set(steps.slice(1), { autoAlpha: 0 });
  gsap.set(words.slice(1), { yPercent: 105 });
  gsap.set(dots, { opacity: 0.35, scale: 1 });
  gsap.set(dots[0], { opacity: 1, scale: 1.5 });
  // The photo is revealed through masks: with no mask content showing, none of the bag is visible.
  gsap.set([strandGroup, ringGroup, closer, slotReveal, hook, shadow], { autoAlpha: 0 });
  gsap.set(card, { autoAlpha: 0 });

  /* ── stage choreography: colours, words, captions, rail ─────────────── */
  const swap = (i: number) => {
    const at = STAGE_START[i];
    tl.to(steps[i - 1], { autoAlpha: 0, y: -22, duration: 0.45, ease: "power2.in" }, at - 0.1);
    tl.to(words[i - 1], { yPercent: -105, duration: 0.5, ease: "power2.in" }, at - 0.1);
    tl.fromTo(steps[i], { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out" }, at + 0.25);
    tl.fromTo(words[i], { yPercent: 105 }, { yPercent: 0, duration: 0.9, ease: "expo.out" }, at + 0.15);
  };

  storyStages.forEach((stage, i) => {
    if (i > 0) {
      swap(i);
      tl.to(root, { backgroundColor: stage.bg, color: stage.ink, duration: 1.3, ease: "power1.inOut" }, STAGE_START[i] - 0.5);
      tl.to(dots[i], { opacity: 1, scale: 1.5, duration: 0.4, ease: "power2.out" }, STAGE_START[i]);
      tl.to(dots[i - 1], { opacity: 0.35, scale: 1, duration: 0.4, ease: "power2.out" }, STAGE_START[i]);
    }
  });

  // Type grows with the work: each word thickens (or softens) while its stage plays.
  tl.fromTo(words[0], { fontVariationSettings: variation(110, 100, 1) }, { fontVariationSettings: variation(380, 100, 1), duration: 3.4 }, 0);
  tl.fromTo(words[1], { fontVariationSettings: variation(240, 100, 0) }, { fontVariationSettings: variation(600, 100, 0), duration: 3.4 }, STAGE_START[1]);
  tl.fromTo(words[2], { fontVariationSettings: variation(180, 100, 0) }, { fontVariationSettings: variation(900, 30, 0), duration: 8.2 }, STAGE_START[2]);
  tl.fromTo(words[3], { fontVariationSettings: variation(260, 100, 1) }, { fontVariationSettings: variation(800, 100, 1), duration: 4 }, STAGE_START[3]);
  tl.fromTo(words[4], { fontVariationSettings: variation(380, 100, 0) }, { fontVariationSettings: variation(860, 20, 0), duration: 4.4 }, STAGE_START[4]);

  tl.fromTo(progress, { "--p": 0 }, { "--p": 1, duration: END, ease: "none" }, 0);

  /* ── 1 · THREAD ─────────────────────────────────────────────────────── */
  tl.set(strandGroup, { autoAlpha: 1 }, 0.02);
  tl.fromTo(strandPaths, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 3.0, ease: "power1.inOut" }, 0.05);

  /* ── 2 · FOUNDATION: the tail is pulled into the ring ───────────────── */
  tl.set(ringGroup, { autoAlpha: 1 }, STAGE_START[1] + 0.05);
  tl.fromTo(ringPaths, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 2.9, ease: "power1.inOut" }, STAGE_START[1] + 0.05);
  tl.to(strandPaths, { drawSVG: "100% 100%", duration: 2.9, ease: "power1.inOut" }, STAGE_START[1] + 0.05);
  tl.set(strandGroup, { autoAlpha: 0 }, STAGE_START[1] + 3.0);
  tl.fromTo(shadow, { autoAlpha: 0, scaleX: 0.45 }, { autoAlpha: 1, scaleX: 1, duration: 1.4, ease: "power2.out" }, 5.2);

  /* ── 3 · STITCH: the photo is worked in row by row, the hook travelling along ─ */
  rowEls.forEach((rowEl, r) => {
    const start = ROW_START + r * ROW_DUR;
    const stitchEls = Array.from(rowEl.querySelectorAll<SVGCircleElement>('[data-s="stitch"]'));
    // Rows differ in length, so the pace is set per row.
    const step = ROW_DRAW / Math.max(1, stitchEls.length - 1);

    stitchEls.forEach((el, k) => {
      const at = start + k * step;
      tl.fromTo(el, { scale: 0 }, { scale: 1, duration: 0.34, ease: "back.out(1.8)" }, at);

      // The hook hops from stitch to stitch just ahead of each one forming.
      const b = rows[r].blobs[k];
      if (r === 0 && k === 0) {
        tl.fromTo(
          hook,
          { autoAlpha: 0, x: b.x + 420, y: b.y - 340 },
          { autoAlpha: 1, x: b.x, y: b.y - 10, duration: 0.85, ease: "power3.out" },
          start - 0.85,
        );
      } else if (k === 0) {
        tl.to(hook, { x: b.x, y: b.y - 10, duration: 0.12, ease: "power1.out" }, start - 0.12);
      } else {
        tl.to(hook, { x: b.x, y: b.y - 10, duration: step, ease: "none" }, at - step);
      }
    });
  });

  // Once the first rows cover the base the foundation rope has done its job.
  tl.to(ringGroup, { autoAlpha: 0, duration: 0.5, ease: "none" }, ROW_START + ROW_DUR * 2.5);

  // The last stitches knit together into one solid fabric.
  const rowsEnd = ROW_START + ROW_COUNT * ROW_DUR;
  tl.fromTo(closer, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: "none" }, rowsEnd);

  // The handle opening is cut: it widens open and the hook runs around its lip.
  const rimStart = rowsEnd - 0.1;
  const rimLen = slotGuide.getTotalLength();
  tl.fromTo(
    slotReveal,
    { autoAlpha: 0, scaleX: 0.4, transformOrigin: "50% 50%" },
    { autoAlpha: 1, scaleX: 1, duration: 1.1, ease: "power2.out" },
    rimStart,
  );
  const rimHook = { u: 0 };
  tl.fromTo(
    rimHook,
    { u: 0 },
    {
      u: 1,
      duration: 1.25,
      ease: "none",
      onUpdate: () => {
        const p = slotGuide.getPointAtLength(rimHook.u * rimLen);
        gsap.set(hook, { x: p.x, y: p.y - 10 });
      },
    },
    rimStart,
  );

  /* ── 4 · HANDLE: the thick braided arch is worked over the top ──────────── */
  const handleStart = STAGE_START[3] + 0.5;
  const handleDur = 2.5;
  const handleLen = archReveal.getTotalLength();
  const handleOrigin = archReveal.getPointAtLength(0);
  tl.to(hook, { x: handleOrigin.x, y: handleOrigin.y - 10, duration: 0.6, ease: "power2.inOut" }, handleStart - 0.65);
  tl.fromTo(archReveal, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: handleDur, ease: "none" }, handleStart);
  const handleHook = { u: 0 };
  tl.fromTo(
    handleHook,
    { u: 0 },
    {
      u: 1,
      duration: handleDur,
      ease: "none",
      onUpdate: () => {
        const p = archReveal.getPointAtLength(handleHook.u * handleLen);
        gsap.set(hook, { x: p.x, y: p.y - 10 });
      },
    },
    handleStart,
  );

  const handleEnd = handleStart + handleDur;
  tl.to(hook, { x: "+=460", y: "-=380", rotation: 18, autoAlpha: 0, duration: 0.9, ease: "power2.in" }, handleEnd + 0.15);

  /* ── 5 · COMPANION: settle, slide aside, meet the real thing ────────── */
  const s5 = STAGE_START[4];
  tl.to(
    art,
    mobile
      ? { xPercent: -21, scale: 0.58, duration: 1.5, ease: "power3.inOut" }
      : { xPercent: -21.5, scale: 0.72, duration: 1.5, ease: "power3.inOut" },
    s5 - 0.3,
  );
  tl.fromTo(svg, { y: -22 }, { y: 0, duration: 1.0, ease: "bounce.out" }, s5 + 0.9);

  tl.fromTo(
    card,
    { autoAlpha: 0, xPercent: 10, rotate: 6, clipPath: "inset(0% 0% 100% 0%)" },
    { autoAlpha: 1, xPercent: 0, rotate: -2.5, clipPath: "inset(0% 0% 0% 0%)", duration: 1.2, ease: "expo.out" },
    s5 + 0.7,
  );
  tl.fromTo(cta, { autoAlpha: 0, y: 26, scale: 0.86 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.8, ease: "back.out(2.2)" }, s5 + 1.3);
  tl.to(skip, { autoAlpha: 0, duration: 0.4 }, s5 + 1.2);

  // Hold on the finished composition for a moment before the pin releases.
  tl.set({}, {}, END);

  return tl;
}
