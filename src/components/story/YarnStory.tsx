"use client";

import { useEffect, useRef } from "react";
import { gsap, registerGsap } from "@/lib/gsap";
import { handleAnchorClick } from "@/lib/scroll";
import { MovingPhoto } from "@/components/motion/MovingPhoto";
import { BagIllustration } from "./BagIllustration";
import { storyStages } from "./stages";
import { storyPhoto } from "@/data/story";
import { buildStoryTimeline, resetStory } from "./timeline";
import styles from "./YarnStory.module.css";

/**
 * "From a thread to your everyday companion."
 *
 * Markup renders the FINISHED state by default. With motion allowed, the timeline in
 * ./timeline.ts takes over: it pins this section, sets the starting state and scrubs one
 * reversible GSAP timeline with the scrollbar. With reduced motion (or if anything fails)
 * the visitor simply sees the finished illustration and all five steps as plain content.
 */
export function YarnStory() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    registerGsap();
    const el = root.current;
    if (!el) return;

    const mm = gsap.matchMedia();
    let build = 0;
    mm.add(
      {
        desktop: "(min-width: 52.01rem) and (prefers-reduced-motion: no-preference)",
        mobile: "(max-width: 52rem) and (prefers-reduced-motion: no-preference)",
      },
      (context) => {
        const { desktop } = context.conditions as { desktop: boolean; mobile: boolean };
        const id = ++build;
        try {
          // Start every build from the authored (finished) state. ignore(): the reset must not be
          // recorded by the context, or reverting the context would undo it and resurrect old state.
          context.ignore(() => resetStory(el));
          buildStoryTimeline(el, { mobile: !desktop });
          // When the animation stops matching (e.g. reduced motion switched on) nothing rebuilds,
          // so clear whatever the timeline left behind, unless a newer build has already started.
          return () => {
            queueMicrotask(() => {
              if (id === build) resetStory(el);
            });
          };
        } catch (error) {
          // Never leave the visitor with a half-built, hidden story.
          console.error("[story] timeline failed, showing the finished illustration instead", error);
          context.ignore(() => resetStory(el));
          document.documentElement.classList.remove("motion");
        }
      },
      el,
    );

    return () => {
      mm.revert();
      resetStory(el);
    };
  }, []);

  return (
    <section ref={root} id="story" className={styles.story} aria-labelledby="story-title" data-prehide>
      <div className={styles.stage} data-s="stage">
        <header className={styles.top}>
          <p className={`eyebrow ${styles.kicker}`}>The making</p>
          <h2 id="story-title" className={`display ${styles.title}`}>
            From a thread to your <em>everyday companion.</em>
          </h2>
        </header>

        <div className={styles.art}>
          <div className={styles.artInner} data-s="art">
            <BagIllustration />
          </div>
        </div>

        <ol className={styles.steps}>
          {storyStages.map((stage, i) => (
            <li key={stage.id} className={styles.step} data-s="step">
              <span className={styles.stepNo} aria-hidden="true">
                0{i + 1}
              </span>
              <span className={styles.wordMask}>
                <span className={`${styles.word} ${styles[`word${i}`]}`} data-s="word">
                  {stage.word}
                </span>
              </span>
              <p className={styles.caption}>{stage.caption}</p>
              {i === storyStages.length - 1 && (
                <a className={`btn ${styles.cta}`} href="#collection" onClick={handleAnchorClick} data-s="cta">
                  Explore the collection
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M3 10h13M11 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              )}
            </li>
          ))}
        </ol>

        <figure className={styles.card} data-s="card">
          <MovingPhoto
            image={storyPhoto}
            ratio="4 / 4.6"
            sizes="(max-width: 52rem) 42vw, 22rem"
            quality={90}
            tilt={5}
            drift={0}
          />
          <figcaption className={styles.cardCaption}>
            <span className="eyebrow">The real thing</span>
            <a className={styles.cardButton} href="#collection" onClick={handleAnchorClick}>
              See the collection
            </a>
          </figcaption>
        </figure>

        <div className={styles.rail} aria-hidden="true">
          <span className={styles.railTrack}>
            <span className={styles.railFill} data-s="progress" />
          </span>
          {storyStages.map((stage) => (
            <span key={stage.id} className={styles.dot} data-s="dot" />
          ))}
        </div>

        <a className={styles.skip} href="#collection" onClick={handleAnchorClick} data-s="skip">
          Skip to the collection
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 3v13M4 11l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>
    </section>
  );
}
