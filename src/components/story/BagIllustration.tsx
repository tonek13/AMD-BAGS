import { bag, shade, STITCH_PATH, STITCH_STROKE, VIEW, CX } from "./bagGeometry";

/**
 * The yarn-to-bag illustration. Pure markup: it renders as the COMPLETED bag by
 * default (so reduced-motion and no-JS visitors see the finished piece) and the
 * story timeline sets the starting state and plays it forward.
 *
 * Elements the timeline drives carry a `data-s` hook.
 */
export function BagIllustration() {
  const { rows, rim, foundation, strand, handle } = bag;
  const ringTop = handle.p0;
  const ringTopR = handle.p3;

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
          <stop offset="0" stopColor="#4a1226" />
          <stop offset="1" stopColor="#12030a" />
        </linearGradient>
      </defs>

      {/* ground shadow */}
      <ellipse data-s="shadow" cx={CX} cy={bag.rows[0].cy + bag.rows[0].ry + 26} rx="285" ry="40" fill="url(#story-shadow)" />

      {/* 1 · the loose strand */}
      <g data-s="strand" data-static-hidden fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path data-s="strand-path" d={strand.d} stroke={shade(0.3)} strokeWidth="27" />
        <path data-s="strand-path" d={strand.d} stroke={shade(2.2)} strokeWidth="21" />
        <path data-s="strand-path" d={strand.d} stroke={shade(4.6)} strokeWidth="5" opacity=".85" transform="translate(-3 -4)" />
      </g>

      {/* 2 · the foundation coil */}
      <g data-s="ring" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path data-s="ring-path" d={foundation.d} stroke={shade(0.3)} strokeWidth="27" />
        <path data-s="ring-path" d={foundation.d} stroke={shade(2.2)} strokeWidth="21" />
        <path data-s="ring-path" d={foundation.d} stroke={shade(4.6)} strokeWidth="5" opacity=".85" transform="translate(-3 -4)" />
      </g>

      {/* the open mouth of the bag */}
      <g data-s="interior">
        <ellipse cx={rim.cx} cy={rim.cy} rx={rim.innerRx} ry={rim.innerRy} fill="url(#story-interior)" />
        {[0.1, 0.42, 0.74].map((k) => (
          <path
            key={k}
            d={`M${rim.cx - rim.innerRx * (0.96 - k * 0.2)} ${rim.cy + 4 + k * 16} A${rim.innerRx * (0.96 - k * 0.2)} ${rim.innerRy * (0.74 - k * 0.1)} 0 0 1 ${rim.cx + rim.innerRx * (0.96 - k * 0.2)} ${rim.cy + 4 + k * 16}`}
            fill="none"
            stroke={shade(1.7 - k)}
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray="20 15"
            opacity=".55"
          />
        ))}
      </g>

      {/* 3 · rows of stitches, bottom to top */}
      <g data-s="body">
        {rows.map((row) => (
          <g key={row.index} data-s="row" data-row={row.index}>
            <path
              data-s="backing"
              data-dir={row.leftToRight ? "ltr" : "rtl"}
              d={row.arc}
              fill="none"
              stroke={shade(0.5 + row.index * 0.04)}
              strokeWidth="58"
              strokeLinecap="round"
            />
            {row.stitches.map((s, k) => (
              <g key={k} transform={`translate(${s.x} ${s.y}) rotate(${s.rotate})`}>
                <g data-s="stitch" data-row={row.index} data-u={s.u.toFixed(3)}>
                  <g transform={`scale(${s.scaleX} 1)`} fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d={STITCH_PATH} stroke={s.shadow} strokeWidth={STITCH_STROKE + 4} opacity=".7" transform="translate(3 5)" />
                    <path d={STITCH_PATH} stroke={s.body} strokeWidth={STITCH_STROKE} />
                    <path d="M-1 -8 L1 13" stroke={s.crease} strokeWidth="4.5" opacity=".6" />
                    <path d={STITCH_PATH} stroke={s.highlight} strokeWidth="6.5" opacity=".55" transform="translate(-4 -5) scale(.8)" />
                  </g>
                </g>
              </g>
            ))}
          </g>
        ))}
      </g>

      {/* rolled rim */}
      <g data-s="rim" fill="none" strokeLinecap="round">
        <path data-s="rim-path" d={rim.ring} stroke={shade(0.4)} strokeWidth="32" />
        <path data-s="rim-path" d={rim.ring} stroke={shade(3.1)} strokeWidth="26" />
        <path data-s="rim-ticks" d={rim.ring} stroke="#12030a" strokeWidth="26" strokeDasharray="3 9" strokeLinecap="butt" opacity=".22" />
        <path data-s="rim-path" d={rim.ring} stroke={shade(5.4)} strokeWidth="5.5" opacity=".8" transform="translate(-2 -5)" />
      </g>

      {/* 4 · braided handle */}
      <g data-s="handle" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path data-s="handle-path" d={handle.d} stroke={shade(0.2)} strokeWidth="47" />
        <path data-s="handle-path" d={handle.d} stroke={shade(2.5)} strokeWidth="40" />
        {handle.segments.map((seg, k) => (
          <g key={k} transform={`translate(${seg.x} ${seg.y}) rotate(${seg.angle})`}>
            <g data-s="twist" data-u={seg.u.toFixed(3)}>
              <path d="M-19 0H19" stroke={shade(0.7)} strokeWidth="15" opacity=".6" transform="translate(2 3)" />
              <path d="M-19 0H19" stroke={shade(3.5)} strokeWidth="13" />
              <path d="M-12 -2.6H11" stroke={shade(5.3)} strokeWidth="3.4" opacity=".7" />
            </g>
          </g>
        ))}
        <path data-s="handle-hi" d={handle.d} stroke={shade(5)} strokeWidth="6" opacity=".45" transform="translate(-6 -8)" />
      </g>

      {/* gold rings + tassel */}
      {[ringTop, ringTopR].map((p, k) => (
        <g key={k} transform={`translate(${p[0]} ${p[1] + 17})`}>
          <g data-s="gold">
            <circle r="17" fill="none" stroke="#6a4f12" strokeWidth="8.5" transform="translate(1 2)" />
            <circle r="17" fill="none" stroke="#dcc07a" strokeWidth="6.5" />
            <path d="M-14 -7 A15.5 15.5 0 0 1 -3 -15" fill="none" stroke="#fff6d2" strokeWidth="2.4" strokeLinecap="round" />
          </g>
        </g>
      ))}

      <g transform={`translate(${ringTopR[0] + 4} ${ringTopR[1] + 40})`}>
        <g data-s="tassel">
          <circle r="8.5" cy="4" fill="#8a5a1c" />
          <circle r="8.5" cy="4" fill="none" stroke="#e0c27c" strokeWidth="2.4" opacity=".8" />
          {[-15, -10, -5, 0, 5, 10, 15].map((dx, k) => (
            <path
              key={dx}
              d={`M${dx * 0.18} 14 C${dx * 0.5} 44 ${dx * 1.1} 66 ${dx * 1.3} ${100 - Math.abs(dx) * 0.7}`}
              fill="none"
              stroke={k % 2 ? "#c9a24b" : "#e0c27c"}
              strokeWidth="5.4"
              strokeLinecap="round"
            />
          ))}
          <rect x="-8" y="22" width="16" height="7" rx="3" fill="#7d5f19" />
        </g>
      </g>

      {/* the crochet hook that "makes" it */}
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
