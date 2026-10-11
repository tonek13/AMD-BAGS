/**
 * Copy and colours for the five stages of the scroll story.
 * PROVISIONAL copy – the owner should rewrite it in their own voice.
 */
export interface StoryStage {
  id: string;
  word: string;
  caption: string;
  /** Background of the pinned stage while this stage is active. */
  bg: string;
  /** Text colour readable on `bg`. */
  ink: string;
}

export const storyStages: StoryStage[] = [
  {
    id: "thread",
    word: "Thread",
    caption: "Every bag begins as a single loose strand of yarn.",
    bg: "#f6efe3",
    ink: "#231f20",
  },
  {
    id: "foundation",
    word: "Foundation",
    caption: "The strand coils into a flat ring — the base everything else grows from.",
    bg: "#ecd9bf",
    ink: "#231f20",
  },
  {
    id: "stitch",
    word: "Stitch",
    caption: "Row over row, plump stitches stack up, one loop at a time.",
    bg: "#f1cbad",
    ink: "#2a1218",
  },
  {
    id: "handle",
    word: "Handle",
    caption: "A rolled edge and a braided cut-out handle finish the clutch.",
    bg: "#2a2224",
    ink: "#f6ecdd",
  },
  {
    id: "companion",
    word: "Companion",
    caption: "Hand-finished and ready to go everywhere with you.",
    bg: "#f4e9d7",
    ink: "#231f20",
  },
];
