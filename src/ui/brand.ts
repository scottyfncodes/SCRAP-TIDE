// SCRAP TIDE brand: the palette and the wordmark, in one place.
//
// The wordmark is the stencil lettering of a salvage crate, with the tide risen over its foot: below a hand-drawn
// waterline the letters turn Sea Glass, above it they stay Bleached Sand, and a Sun Gold tide-stain runs along the
// line. It reads as plain "SCRAP TIDE" at 120 px wide (the waterline is a colour change, not a cut), so it holds at
// the small sizes of a phone's loading screen. No pirate type, no skulls, no heavy distressing: one idea, cleanly.
//
// Inline SVG with the self-hosted Saira Stencil One (public/fonts), textLength-pinned so the lockup's proportions
// never depend on the font's metrics or on the fallback while it loads.

export const PALETTE = {
  abyss: '#10384A',
  seaGlass: '#168D9C',
  sand: '#D7B87B',
  rust: '#A04D30',
  gold: '#E5C65E',
  /** derived: the bleached letter face, a lighter sand */
  bone: '#EFE3C4',
  /** derived: the deep shadow plate */
  deep: '#081C26',
} as const;

const W = 640, H = 150, BASE = 124, WATER = 101;

/** The waterline: a slow, slightly irregular swell (a hand-drawn line, not a perfect sine). */
function waterline() {
  const amps = [5, 3.5, 6, 4, 5.5, 3, 5, 4.5];
  let d = `M-10 ${WATER}`;
  const step = (W + 20) / amps.length;
  for (let i = 0; i < amps.length; i++) {
    const x0 = -10 + i * step;
    const a = i % 2 ? -amps[i] : amps[i];
    d += ` Q${(x0 + step / 2).toFixed(1)} ${WATER - a} ${(x0 + step).toFixed(1)} ${WATER}`;
  }
  return d;
}

let uid = 0;
/** The SCRAP TIDE wordmark as an inline SVG string. `title` is the accessible name. */
export function wordmarkSVG(opts: { title?: string; className?: string } = {}) {
  const id = `stw${++uid}`;
  const wave = waterline();
  const text = (fill: string, dy = 0, extra = '') =>
    `<text x="${W / 2}" y="${BASE + dy}" text-anchor="middle" textLength="${W - 24}" lengthAdjust="spacingAndGlyphs" font-family="'Saira Stencil One', Impact, sans-serif" font-size="128" fill="${fill}" ${extra}>SCRAP TIDE</text>`;
  return `<svg class="${opts.className ?? 'wordmark'}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${opts.title ?? 'SCRAP TIDE'}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="${id}-below"><path d="${wave} L${W + 10} ${H} L-10 ${H} Z"/></clipPath>
    <clipPath id="${id}-glyphs">${text('#000')}</clipPath>
    <linearGradient id="${id}-face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${PALETTE.bone}"/><stop offset="1" stop-color="${PALETTE.sand}"/>
    </linearGradient>
    <linearGradient id="${id}-sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2fb3bf"/><stop offset="1" stop-color="${PALETTE.seaGlass}"/>
    </linearGradient>
  </defs>
  ${text(PALETTE.deep, 7, 'opacity=".55"')}
  ${text('#5E2A19', 4)}
  ${text(`url(#${id}-face)`)}
  <g clip-path="url(#${id}-below)">${text(`url(#${id}-sea)`)}</g>
  <g clip-path="url(#${id}-glyphs)"><path d="${wave}" fill="none" stroke="${PALETTE.gold}" stroke-width="3.2" stroke-linecap="round"/></g>
</svg>`;
}
