import { bag, shade, STITCH_RIBBONS, VIEW } from "./bagGeometry";

/**
 * The yarn-to-bag illustration: a redraw of the real Bordeaux Clutch photograph (same
 * silhouette, same pose, same lighting). Pure markup: it renders as the COMPLETED bag by
 * default (so reduced-motion and no-JS visitors see the finished piece) and the story
 * timeline sets the starting state and plays it forward.
 *
 * Elements the timeline drives carry a `data-s` hook.
 */
export function BagIllustration() {
  const { rows, foundation, strand, handle, outline, slot, shadow } = bag;
  const ribbons = STITCH_RIBBONS.join(" ");

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
        <linearGradient id="story-interior" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a0e1c" />
          <stop offset="1" stopColor="#0f0308" />
        </linearGradient>
        {/* the traced silhouette: everything that is "inside the bag" is trimmed to it */}
        <clipPath id="story-clip">
          <path d={outline} />
        </clipPath>
      </defs>

      {/* ground shadow */}
      <ellipse data-s="shadow" cx={shadow.cx} cy={shadow.cy} rx={shadow.rx} ry="38" fill="url(#story-shadow)" />

      {/* 1 · the loose strand (only exists mid-story) */}
      <g data-s="strand" data-static-hidden fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path data-s="strand-path" d={strand.d} stroke={shade(0.3)} strokeWidth="27" />
        <path data-s="strand-path" d={strand.d} stroke={shade(2.3)} strokeWidth="21" />
        <path data-s="strand-path" d={strand.d} stroke={shade(4.8)} strokeWidth="5" opacity=".85" transform="translate(-3 -4)" />
      </g>

      {/* 2 · the foundation: a rope of yarn along the base edge – it stays as the rolled lip */}
      <g data-s="ring" fill="none" strokeLinecap="round" strokeLinejoin="round" clipPath="url(#story-clip)">
        <path data-s="ring-path" d={foundation.d} stroke={shade(0.3)} strokeWidth="33" />
        <path data-s="ring-path" d={foundation.d} stroke={shade(2.7)} strokeWidth="27" />
        <path data-s="ring-path" d={foundation.d} stroke={shade(4.9)} strokeWidth="5" opacity=".8" transform="translate(-3 -5)" />
      </g>

      {/* 3 · rows of plump stitches, bottom to top, trimmed to the traced silhouette */}
      <g data-s="body" clipPath="url(#story-clip)">
        {rows.map((row) => (
          <g key={row.index} data-s="row" data-row={row.index}>
            <path
              data-s="backing"
              data-dir={row.leftToRight ? "ltr" : "rtl"}
              d={row.arc}
              fill="none"
              stroke="#16040a"
              strokeWidth="40"
              strokeLinecap="round"
            />
            {row.stitches.map((s, k) => (
              <g key={k} transform={`translate(${s.x} ${s.y}) rotate(${s.rotate})`}>
                <g data-s="stitch" data-row={row.index} data-u={s.u.toFixed(3)}>
                  <g transform={`scale(${s.scale})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d={ribbons} stroke={s.shadow} strokeWidth="21" transform="translate(1.5 2.5)" />
                    {STITCH_RIBBONS.map((d, r) => (
                      <path key={r} d={d} stroke={s.body} strokeWidth="16.5" />
                    ))}
                    <path d={ribbons} stroke={s.highlight} strokeWidth="4.5" opacity=".55" transform="translate(-3.2 -2)" />
                  </g>
                </g>
              </g>
            ))}
          </g>
        ))}
      </g>

      {/* a soft contour that tidies the edge once the rows are finished */}
      <path data-s="edge" d={outline} fill="none" stroke={shade(1.3)} strokeWidth="12" opacity=".85" clipPath="url(#story-clip)" />

      {/* 4 · the handle opening, with a rolled lip */}
      <path data-s="interior" d={slot} fill="url(#story-interior)" />
      <g data-s="rim" fill="none" strokeLinecap="round" strokeLinejoin="round" clipPath="url(#story-clip)">
        <path data-s="rim-path" d={slot} stroke={shade(0.4)} strokeWidth="13" />
        <path data-s="rim-path" d={slot} stroke={shade(3)} strokeWidth="9" />
      </g>

      {/* …and the thick braided arch over the top: the carry handle */}
      <g clipPath="url(#story-clip)">
        <g data-s="handle" fill="none" strokeLinecap="butt" strokeLinejoin="round">
          <path data-s="handle-path" d={handle.d} stroke={shade(0.35)} strokeWidth={handle.width + 8} />
          <path data-s="handle-path" d={handle.d} stroke={shade(2.7)} strokeWidth={handle.width} />
          {handle.segments.map((seg, k) => (
            <g key={k} transform={`translate(${seg.x} ${seg.y}) rotate(${seg.angle})`}>
              <g data-s="twist" data-u={seg.u.toFixed(3)}>
                <path d="M-36 14 L0 -9 L36 14" stroke={seg.colors.shadow} strokeWidth="21" opacity=".8" transform="translate(1.5 4)" />
                <path d="M-36 14 L0 -9 L36 14" stroke={seg.colors.body} strokeWidth="17.5" />
                <path d="M-30 11 L0 -7 L22 6" stroke={seg.colors.highlight} strokeWidth="4.5" opacity=".55" transform="translate(-1 -2)" />
              </g>
            </g>
          ))}
          <path data-s="handle-hi" d={handle.d} stroke={shade(5.2)} strokeWidth="4" opacity=".35" transform="translate(-4 -22)" />
        </g>
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
