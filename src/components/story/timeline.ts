import { gsap } from "@/lib/gsap";
import { bag, COLS, ROWS } from "./bagGeometry";
import { storyStages } from "./stages";

/**
 * The scroll story: ONE continuous GSAP timeline scrubbed by ScrollTrigger.
 * Every tween is a plain `to` / `fromTo`, so scrolling backwards reverses the whole
 * sequence – strand, rows, handle, colours, captions and type – exactly.
 *
 *   0 ─ 3.3    1  Thread       a loose strand curves across the screen
 * 3.3 ─ 6.5    2  Foundation   the strand winds into a ring (the base)
 * 6.5 ─ 14.5   3  Stitch       rows of interlocking stitches build the body
 *14.5 ─ 18.6   4  Handle       braided handle, gold rings and tassel
 *18.6 ─ 23.0   5  Companion    the finished bag settles beside a real photograph
 */

const STAGE_START = [0, 3.3, 6.5, 14.5, 18.6] as const;
const END = 23;

const ROW_START = 6.9;
const ROW_DUR = 0.78;
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
  const interior = one<SVGElement>('[data-s="interior"]');
  const rowEls = all<SVGGElement>('[data-s="row"]');
  const rimGroup = one<SVGElement>('[data-s="rim"]');
  const rimPaths = all<SVGPathElement>('[data-s="rim-path"]');
  const rimTicks = one<SVGElement>('[data-s="rim-ticks"]');
  const handleGroup = one<SVGElement>('[data-s="handle"]');
  const handlePaths = all<SVGPathElement>('[data-s="handle-path"]');
  const handleHi = one<SVGElement>('[data-s="handle-hi"]');
  const twists = all<SVGGElement>('[data-s="twist"]');
  const golds = all<SVGGElement>('[data-s="gold"]');
  const tassel = one<SVGGElement>('[data-s="tassel"]');
  const hook = one<SVGGElement>('[data-s="hook"]');

  const { rows, rim, handle } = bag;

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
  gsap.set([strandGroup, ringGroup, interior, rimGroup, handleGroup, hook, shadow], { autoAlpha: 0 });
  gsap.set(rowEls, { autoAlpha: 0 });
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

  /* ── 3 · STITCH: rows build from the base up, the hook travelling along ─ */
  rowEls.forEach((rowEl, r) => {
    const start = ROW_START + r * ROW_DUR;
    const step = ROW_DRAW / (COLS - 1);
    const backing = rowEl.querySelector<SVGPathElement>('[data-s="backing"]')!;
    const stitchEls = Array.from(rowEl.querySelectorAll<SVGGElement>('[data-s="stitch"]'));
    const leftToRight = rows[r].leftToRight;

    tl.set(rowEl, { autoAlpha: 1 }, start);
    tl.fromTo(
      backing,
      { drawSVG: leftToRight ? "0% 0%" : "100% 100%" },
      { drawSVG: "0% 100%", duration: ROW_DRAW, ease: "none" },
      start + 0.1,
    );

    stitchEls.forEach((el, k) => {
      const at = start + k * step;
      tl.fromTo(
        el,
        { scale: 0, rotation: -28, autoAlpha: 0 },
        { scale: 1, rotation: 0, autoAlpha: 1, duration: 0.36, ease: "back.out(2.4)" },
        at,
      );

      // The hook hops from stitch to stitch just ahead of each one forming.
      const s = rows[r].stitches[k];
      if (r === 0 && k === 0) {
        tl.fromTo(
          hook,
          { autoAlpha: 0, x: s.x + 420, y: s.y - 340 },
          { autoAlpha: 1, x: s.x, y: s.y - 10, duration: 0.85, ease: "power3.out" },
          start - 0.85,
        );
      } else if (k === 0) {
        tl.to(hook, { x: s.x, y: s.y - 10, duration: 0.12, ease: "power1.out" }, start - 0.12);
      } else {
        tl.to(hook, { x: s.x, y: s.y - 10, duration: step, ease: "none" }, at - step);
      }
    });
  });

  // The rim closes the form: opening appears, a rolled edge is drawn around it.
  const rimStart = ROW_START + ROWS * ROW_DUR - 0.1;
  tl.fromTo(
    interior,
    { autoAlpha: 0, scaleY: 0.4, transformOrigin: "50% 50%" },
    { autoAlpha: 1, scaleY: 1, duration: 0.8, ease: "power2.out" },
    rimStart,
  );
  tl.set(rimGroup, { autoAlpha: 1 }, rimStart);
  tl.fromTo(rimPaths, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 1.15, ease: "none" }, rimStart);
  tl.fromTo(rimTicks, { opacity: 0 }, { opacity: 0.22, duration: 0.4 }, rimStart + 0.8);
  const rimHook = { u: 0 };
  tl.fromTo(
    rimHook,
    { u: 0 },
    {
      u: 1,
      duration: 1.15,
      ease: "none",
      onUpdate: () => {
        const phi = Math.PI - rimHook.u * 2 * Math.PI;
        gsap.set(hook, { x: rim.cx + rim.rx * Math.cos(phi), y: rim.cy + rim.ry * Math.sin(phi) - 10 });
      },
    },
    rimStart,
  );

  /* ── 4 · HANDLE: drawn along an arch, twists pop in under the hook ───── */
  const handleStart = STAGE_START[3] + 0.5;
  const handleDur = 2.3;
  tl.fromTo(golds[0], { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.6, ease: "back.out(3)" }, handleStart - 0.35);
  tl.to(hook, { x: handle.p0[0], y: handle.p0[1] - 10, duration: 0.55, ease: "power2.inOut" }, handleStart - 0.6);
  tl.set(handleGroup, { autoAlpha: 1 }, handleStart);
  tl.fromTo(handlePaths, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: handleDur, ease: "none" }, handleStart);
  tl.fromTo(handleHi, { opacity: 0 }, { opacity: 0.45, duration: 0.6 }, handleStart + handleDur - 0.3);
  const handleHook = { u: 0 };
  tl.fromTo(
    handleHook,
    { u: 0 },
    {
      u: 1,
      duration: handleDur,
      ease: "none",
      onUpdate: () => {
        const [x, y] = handle.atArc(handleHook.u);
        gsap.set(hook, { x, y: y - 10 });
      },
    },
    handleStart,
  );
  twists.forEach((el, k) => {
    const u = bag.handle.segments[k].u;
    tl.fromTo(
      el,
      { scale: 0, autoAlpha: 0 },
      { scale: 1, autoAlpha: 1, duration: 0.32, ease: "back.out(2.2)" },
      handleStart + u * handleDur * 0.96,
    );
  });

  const handleEnd = handleStart + handleDur;
  tl.fromTo(golds[1], { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.6, ease: "back.out(3)" }, handleEnd - 0.2);
  tl.fromTo(
    tassel,
    { autoAlpha: 0, y: -34, scale: 0.3, rotation: 0, transformOrigin: "50% 0%" },
    { autoAlpha: 1, y: 0, scale: 1, duration: 1.1, ease: "elastic.out(1, 0.42)" },
    handleEnd + 0.15,
  );
  tl.to(hook, { x: "+=460", y: "-=380", rotation: 18, autoAlpha: 0, duration: 0.9, ease: "power2.in" }, handleEnd + 0.2);

  /* ── 5 · COMPANION: settle, slide aside, meet the real thing ────────── */
  const s5 = STAGE_START[4];
  tl.to(
    art,
    mobile
      ? { xPercent: -19, scale: 0.62, duration: 1.5, ease: "power3.inOut" }
      : { xPercent: -17.5, scale: 0.88, duration: 1.5, ease: "power3.inOut" },
    s5 - 0.3,
  );
  tl.fromTo(svg, { y: -22 }, { y: 0, duration: 1.0, ease: "bounce.out" }, s5 + 0.9);
  tl.to(tassel, { rotation: 7, duration: 0.25, ease: "sine.out" }, s5 + 0.95);
  tl.to(tassel, { rotation: -4, duration: 0.4, ease: "sine.inOut" }, s5 + 1.2);
  tl.to(tassel, { rotation: 0, duration: 0.5, ease: "sine.inOut" }, s5 + 1.6);

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
