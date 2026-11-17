// SCRAP TIDE brand: the palette and the wordmark, in one place.
//
// The wordmark is the stencil lettering of a salvage crate, with the tide risen over its foot: below a hand-drawn
// waterline the letters turn Sea Glass, above it they stay Bleached Sand, and a Sun Gold tide-stain runs along the
// line. It reads as plain "SCRAP TIDE" at 120 px wide (the waterline is a colour change, not a cut), so it holds at
// the small sizes of a phone's loading screen. No pirate type, no skulls, no heavy distressing: one idea, cleanly.
//
// The lettering is Saira Stencil One as fixed outlines (src/ui/wordmarkPath.ts, made by scripts/wordmark-outline.py),
// not live <text>: Safari does not reliably honour the textLength stretch the text needed, and outlines render
// identically everywhere, with no font to wait for.

import { WORDMARK_D } from './wordmarkPath';

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

const W = 640, H = 150, WATER = 101;

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
/**
 * The SCRAP TIDE wordmark as an inline SVG string. `title` is the accessible name.
 *
 * Every layer (shadow, face, sea) is a <use> of one outlined path, so they line up exactly; the gold tide-stain is
 * clipped to the same outlines.
 */
export function wordmarkSVG(opts: { title?: string; className?: string } = {}) {
  const id = `stw${++uid}`;
  const wave = waterline();
  const use = (fill: string, dy = 0, extra = '') => `<use href="#${id}-t" xlink:href="#${id}-t" y="${dy}" fill="${fill}" ${extra}/>`;
  return `<svg class="${opts.className ?? 'wordmark'}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${opts.title ?? 'SCRAP TIDE'}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <path id="${id}-t" d="${WORDMARK_D}"/>
    <clipPath id="${id}-below"><path d="${wave} L${W + 10} ${H} L-10 ${H} Z"/></clipPath>
    <clipPath id="${id}-glyphs"><path d="${WORDMARK_D}"/></clipPath>
    <linearGradient id="${id}-face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${PALETTE.bone}"/><stop offset="1" stop-color="${PALETTE.sand}"/>
    </linearGradient>
    <linearGradient id="${id}-sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2fb3bf"/><stop offset="1" stop-color="${PALETTE.seaGlass}"/>
    </linearGradient>
  </defs>
  ${use(PALETTE.deep, 7, 'opacity=".5"')}
  ${use(PALETTE.deep, 3.5)}
  ${use(`url(#${id}-face)`)}
  <g clip-path="url(#${id}-below)">${use(`url(#${id}-sea)`)}</g>
  <g clip-path="url(#${id}-glyphs)"><path d="${wave}" fill="none" stroke="${PALETTE.gold}" stroke-width="3.2" stroke-linecap="round"/></g>
</svg>`;
}
