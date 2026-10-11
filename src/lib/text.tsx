import { Fragment } from "react";

/**
 * Lets the owner italicise a word in a plain-text field by wrapping it in asterisks:
 * "Slow stitches, *chunky* results." → Slow stitches, <em>chunky</em> results.
 * Anything else is rendered as plain text (never as HTML).
 */
export function renderEmphasis(text: string): React.ReactNode {
  const parts = text.split(/\*([^*]+)\*/g);
  return parts.map((part, i) => (i % 2 === 1 ? <em key={i}>{part}</em> : <Fragment key={i}>{part}</Fragment>));
}

/** Plain-text version of the same markup, for places that cannot hold markup (page titles, alt text). */
export function stripEmphasis(text: string): string {
  return text.replace(/\*([^*]+)\*/g, "$1");
}
