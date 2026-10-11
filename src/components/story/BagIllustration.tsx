import { bag, shade, VIEW } from "./bagGeometry";

/**
 * The yarn-to-bag illustration. The finished bag is the real Bordeaux Clutch photograph, cut out
 * in two layers (the body, and the braided arch with the handle opening). The story timeline does
 * not draw a bag, it works the photo into existence: stitch by stitch through a reveal mask.
 *
 * Pure markup: it renders as the COMPLETED bag by default (so reduced-motion and no-JS visitors
 * see the finished piece) and the story timeline sets the starting state and plays it forward.
 *
 * Elements the timeline drives carry a `data-s` hook.
 */
export function BagIllustration() {
  const { rows, foundation, strand, outline, slot, ridgeReveal, image, archStroke, discRadius, shadow } = bag;

  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      width={VIEW}
      height={VIEW}
      aria-hidden="true"
      focusable="false"
      style={{ overflow: "visible" }}
    >
      <defs>
        <radialGradient id="story-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#1a0509" stopOpacity=".5" />
          <stop offset=".6" stopColor="#1a0509" stopOpacity=".18" />
          <stop offset="1" stopColor="#1a0509" stopOpacity="0" />
        </radialGradient>
        {/* the foundation rope is trimmed to the bag's silhouette */}
        <clipPath id="story-clip">
          <path d={outline} />
        </clipPath>

        {/* BODY reveal: a solid wash for the finished state, and one disc per stitch for the build */}
        <mask id="story-reveal-body" maskUnits="userSpaceOnUse" x="0" y="0" width={VIEW} height={VIEW}>
          <rect data-s="closer" width={VIEW} height={VIEW} fill="#fff" />
          <g fill="#fff">
            {rows.map((row) => (
              <g key={row.index} data-s="row" data-row={row.index}>
                {row.blobs.map((b, k) => (
                  <g key={k} transform={`translate(${b.x} ${b.y})`}>
                    <circle data-s="stitch" r={discRadius} />
                  </g>
                ))}
              </g>
            ))}
          </g>
        </mask>

        {/* ARCH reveal: the handle opening, then a wide stroke that travels along the arch */}
        <mask id="story-reveal-arch" maskUnits="userSpaceOnUse" x="0" y="0" width={VIEW} height={VIEW}>
          <path data-s="slot-reveal" d={slot} fill="#fff" stroke="#fff" strokeWidth="22" strokeLinejoin="round" />
          <path data-s="arch-reveal" d={ridgeReveal} fill="none" stroke="#fff" strokeWidth={archStroke} strokeLinecap="butt" />
        </mask>
      </defs>

      {/* ground shadow */}
      <ellipse data-s="shadow" cx={shadow.cx} cy={shadow.cy} rx={shadow.rx} ry="38" fill="url(#story-shadow)" />

      {/* 1 · the loose strand (only exists mid-story) */}
      <g data-s="strand" data-static-hidden fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path data-s="strand-path" d={strand.d} stroke={shade(0.3)} strokeWidth="27" />
        <path data-s="strand-path" d={strand.d} stroke={shade(2.3)} strokeWidth="21" />
        <path data-s="strand-path" d={strand.d} stroke={shade(4.8)} strokeWidth="5" opacity=".85" transform="translate(-3 -4)" />
      </g>

      {/* 2 · the foundation: a rope of yarn along the base edge (the photo covers it once the rows start) */}
      <g data-s="ring" data-static-hidden fill="none" strokeLinecap="round" strokeLinejoin="round" clipPath="url(#story-clip)">
        <path data-s="ring-path" d={foundation.d} stroke={shade(0.3)} strokeWidth="33" />
        <path data-s="ring-path" d={foundation.d} stroke={shade(2.7)} strokeWidth="27" />
        <path data-s="ring-path" d={foundation.d} stroke={shade(4.9)} strokeWidth="5" opacity=".8" transform="translate(-3 -5)" />
      </g>

      {/* the path the hook follows around the handle opening (never painted) */}
      <path data-s="slot-guide" d={slot} fill="none" stroke="none" />

      {/* 3 + 4 · the real bag: the body is worked in rows, then the opening and the braided arch */}
      <g data-s="photo">
        <image
          href="/images/story/bag-body.webp"
          x={image.x}
          y={image.y}
          width={image.w}
          height={image.h}
          preserveAspectRatio="none"
          mask="url(#story-reveal-body)"
        />
        <image
          href="/images/story/bag-arch.webp"
          x={image.x}
          y={image.y}
          width={image.w}
          height={image.h}
          preserveAspectRatio="none"
          mask="url(#story-reveal-arch)"
        />
      </g>

      {/* the crochet hook that "makes" it (only exists mid-story) */}
      <g data-s="hook" data-static-hidden>
        <g transform="rotate(-27)">
          <path d="M18 -4.2 L240 -5.8 L240 5.8 L18 4.2Z" fill="#d9bd78" />
          <path d="M18 -4.2 L240 -5.8 L240 -2.2 L18 -1.4Z" fill="#fff2c4" opacity=".75" />
          <path d="M112 -6.4 Q144 -13.5 182 -6.6 L182 6.6 Q144 13.5 112 6.4Z" fill="#c4993d" />
          <path d="M240 -7 H338 A10 10 0 0 1 338 7 H240Z" fill="#231f20" />
          <path d="M18 -4.2 C11 -4.4 4 -6.6 -1.2 -3.6 C-4.6 -1.4 -3 2.4 2.4 2.8 C6 3 8 1.8 10.6 2.4 C12.4 3.4 14.4 4.2 18 4.2Z" fill="#d9bd78" />
        </g>
      </g>
    </svg>
  );
}
