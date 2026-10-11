import { bag, shade, STITCH_RIBBONS, VIEW, CX } from "./bagGeometry";

/**
 * The yarn-to-bag illustration, modelled on the real Bordeaux Clutch (wide, low, plump
 * single-crochet stitches, rolled top edge, cut-out handle). Pure markup: it renders as the
 * COMPLETED bag by default (so reduced-motion and no-JS visitors see the finished piece) and
 * the story timeline sets the starting state and plays it forward.
 *
 * Elements the timeline drives carry a `data-s` hook.
 */
export function BagIllustration() {
  const { rows, rim, foundation, strand, handle } = bag;

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
      </defs>

      {/* ground shadow */}
      <ellipse data-s="shadow" cx={CX} cy={foundation.cy + foundation.ry + 20} rx="455" ry="40" fill="url(#story-shadow)" />

      {/* 1 · the loose strand (only exists mid-story) */}
      <g data-s="strand" data-static-hidden fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path data-s="strand-path" d={strand.d} stroke={shade(0.3)} strokeWidth="27" />
        <path data-s="strand-path" d={strand.d} stroke={shade(2.3)} strokeWidth="21" />
        <path data-s="strand-path" d={strand.d} stroke={shade(4.8)} strokeWidth="5" opacity=".85" transform="translate(-3 -4)" />
      </g>

      {/* 2 · the foundation coil, which stays as the rolled lip under the first row */}
      <g data-s="ring" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path data-s="ring-path" d={foundation.d} stroke={shade(0.3)} strokeWidth="29" />
        <path data-s="ring-path" d={foundation.d} stroke={shade(2.5)} strokeWidth="23" />
        <path data-s="ring-path" d={foundation.d} stroke={shade(4.8)} strokeWidth="5" opacity=".85" transform="translate(-3 -4)" />
      </g>

      {/* 3 · rows of plump stitches, bottom to top */}
      <g data-s="body">
        {rows.map((row) => (
          <g key={row.index} data-s="row" data-row={row.index}>
            <path
              data-s="backing"
              data-dir={row.leftToRight ? "ltr" : "rtl"}
              d={row.arc}
              fill="none"
              stroke="#16040a"
              strokeWidth="50"
              strokeLinecap="round"
            />
            {row.stitches.map((s, k) => (
              <g key={k} transform={`translate(${s.x} ${s.y}) rotate(${s.rotate})`}>
                <g data-s="stitch" data-row={row.index} data-u={s.u.toFixed(3)}>
                  <g transform={`scale(${s.scale})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
                    {STITCH_RIBBONS.map((d, r) => (
                      <g key={r}>
                        <path d={d} stroke={s.shadow} strokeWidth="21" transform="translate(1.5 2.5)" />
                        <path d={d} stroke={s.body} strokeWidth="16.5" />
                        <path d={d} stroke={s.highlight} strokeWidth="4.5" opacity=".55" transform="translate(-3.2 -2)" />
                      </g>
                    ))}
                  </g>
                </g>
              </g>
            ))}
          </g>
        ))}
      </g>

      {/* rolled, braided top edge */}
      <g data-s="rim" fill="none" strokeLinecap="round">
        <path data-s="rim-path" d={rim.d} stroke={shade(0.35)} strokeWidth="36" />
        <path data-s="rim-path" d={rim.d} stroke={shade(3.1)} strokeWidth="29" />
        <path data-s="rim-ticks" d={rim.d} stroke="#12030a" strokeWidth="29" strokeDasharray="3 9" strokeLinecap="butt" opacity=".24" />
        <path data-s="rim-path" d={rim.d} stroke={shade(5.2)} strokeWidth="5" opacity=".75" transform="translate(-2 -6)" />
      </g>

      {/* 4 · the cut-out handle: a dark opening framed by a braided band */}
      <path data-s="interior" d={handle.d} fill="url(#story-interior)" />
      <g data-s="handle" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path data-s="handle-path" d={handle.d} stroke={shade(0.3)} strokeWidth="36" />
        <path data-s="handle-path" d={handle.d} stroke={shade(2.9)} strokeWidth="29" />
        {handle.segments.map((seg, k) => (
          <g key={k} transform={`translate(${seg.x} ${seg.y}) rotate(${seg.angle})`}>
            <g data-s="twist" data-u={seg.u.toFixed(3)}>
              <path d="M-14 0H14" stroke={shade(0.8)} strokeWidth="12" opacity=".6" transform="translate(2 3)" />
              <path d="M-14 0H14" stroke={shade(3.8)} strokeWidth="10.5" />
              <path d="M-9 -2.2H8" stroke={shade(5.4)} strokeWidth="3" opacity=".7" />
            </g>
          </g>
        ))}
        <path data-s="handle-hi" d={handle.d} stroke={shade(5.2)} strokeWidth="4.5" opacity=".45" transform="translate(-3 -5)" />
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
