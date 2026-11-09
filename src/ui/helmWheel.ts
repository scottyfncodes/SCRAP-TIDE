// The helm wheel matches the boat you're sailing. It keeps the classic, instantly readable ship's-wheel shape (a rim,
// spokes running through it and grip handles standing proud of it) but every wheel is rebuilt from salvage, not
// timber and brass (art-direction pass: Waterworld + Mad Max). All four are drawn in the same 150×150 frame so the
// stick, knob and turning code don't change; only the look does. Palette: docs/brand/SCRAP-TIDE-brand.md.
//
//   dinghy    Patchwork Skiff: rusted pipe rim with welded patch bands, mismatched rebar spokes, tape-wrapped grips
//   sloop     Scrap Trimaran: an oxidised copper pipe rim, steel spokes, rope-whipped grips
//   brig      Salt Brig: a heavy aluminium rim bolted in sections, ten spokes, rubber grips with hazard-yellow tips
//   ironwake  Ironwake Expedition Cat: a riveted steel rim with a hazard band, six spokes, sea-glass grip caps
//
// The top spoke's grip is painted hazard yellow on every wheel, the way a real helm marks "rudder amidships", so you can
// see the wheel turn under your thumb.
import type { VesselId } from '../data/ship';

const C = 75;
const f = (n: number) => n.toFixed(1);
const at = (a: number, r: number) => [C + Math.cos(a) * r, C + Math.sin(a) * r] as const;
const TOP = -Math.PI / 2;

function spokes(n: number, draw: (i: number, a: number) => string) {
  let s = '';
  for (let i = 0; i < n; i++) s += draw(i, (i / n) * Math.PI * 2 + TOP);
  return s;
}

/** A spoke from the hub out through the rim (two strokes: dark edge, metal face). */
function spoke(a: number, r0: number, r1: number, face: string, w: number, edge = '#0d1214') {
  const [x0, y0] = at(a, r0), [x1, y1] = at(a, r1);
  const l = `x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}"`;
  return `<line ${l} stroke="${edge}" stroke-width="${w + 2.6}"/><line ${l} stroke="${face}" stroke-width="${w}"/>`;
}

/** A grip handle outside the rim: a stub of pipe with a wrapped grip and an end cap. */
function grip(a: number, r0: number, r1: number, fill: string, wrap: string, cap: string, edge = '#0d1214') {
  const [x0, y0] = at(a, r0), [x1, y1] = at(a, r1);
  const [xa, ya] = at(a, r0 + (r1 - r0) * 0.35), [xb, yb] = at(a, r1 - 1.5);
  const [xc, yc] = at(a, r1);
  return `<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="${edge}" stroke-width="9.5" stroke-linecap="round"/>`
    + `<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="${fill}" stroke-width="6.5" stroke-linecap="round"/>`
    + `<line x1="${f(xa)}" y1="${f(ya)}" x2="${f(xb)}" y2="${f(yb)}" stroke="${wrap}" stroke-width="6.5" stroke-dasharray="1.6 1.4"/>`
    + `<circle cx="${f(xc)}" cy="${f(yc)}" r="3.6" fill="${cap}" stroke="${edge}" stroke-width="1.4"/>`;
}

/** The rim: a pipe ring (dark edge, metal face, a thin highlight). */
function rim(r: number, w: number, face: string, hi: string, edge = '#0d1214') {
  return `<circle cx="75" cy="75" r="${r}" stroke="${edge}" stroke-width="${w + 3}"/>`
    + `<circle cx="75" cy="75" r="${r}" stroke="${face}" stroke-width="${w}"/>`
    + `<circle cx="75" cy="75" r="${r - w * 0.22}" stroke="${hi}" stroke-width="1.2" opacity=".55"/>`;
}

/** Hub plate behind the thumb cap. */
const hub = (fill: string) => `<circle cx="75" cy="75" r="19" fill="${fill}" stroke="#0d1214" stroke-width="2.5"/>`;

const SKIFF = () => `<svg class="wheel" data-wheel="dinghy" viewBox="0 0 150 150"><circle cx="75" cy="75" r="56" fill="rgba(8,18,22,.32)"/>
${spokes(8, (i, a) => grip(a, 54, 70, '#5f686b', i === 0 ? '#d9b648' : i % 3 ? '#7d3520' : '#24282a', i === 0 ? '#14110a' : '#8a9497'))}
<g fill="none">${spokes(8, (i, a) => spoke(a, 15, 54, i % 3 ? '#6b5348' : '#5f686b', i % 2 ? 4.2 : 5.4))}
${rim(51, 8, '#7d3a22', '#c98a64')}
<circle cx="75" cy="75" r="51" stroke="#5f686b" stroke-width="8" stroke-dasharray="0 34 12 52 9 70 14 200" opacity=".95"/>
${spokes(8, (_i, a) => `<circle cx="${f(at(a, 51)[0])}" cy="${f(at(a, 51)[1])}" r="3" fill="#4a3a32" stroke="#0d1214" stroke-width="1"/>`)}</g>
${hub('#3a3230')}</svg>`;

const TRIMARAN = () => `<svg class="wheel" data-wheel="sloop" viewBox="0 0 150 150"><circle cx="75" cy="75" r="56" fill="rgba(8,18,22,.32)"/>
${spokes(8, (i, a) => grip(a, 54, 71, '#6d7a7c', i === 0 ? '#d9b648' : '#b8a27a', i === 0 ? '#14110a' : '#4a7d70'))}
<g fill="none">${spokes(8, (_i, a) => spoke(a, 15, 54, '#6d7a7c', 4.8))}
${rim(51, 9, '#4f8a7a', '#a9d6c4')}
<circle cx="75" cy="75" r="51" stroke="#a8653a" stroke-width="9" stroke-dasharray="16 30 8 44 22 38" opacity=".55"/>
${spokes(8, (_i, a) => `<circle cx="${f(at(a, 51)[0])}" cy="${f(at(a, 51)[1])}" r="2.4" fill="#c9cdc8" stroke="#0d1214" stroke-width="1"/>`)}</g>
${hub('#2e3f3a')}</svg>`;

const BRIG = () => `<svg class="wheel" data-wheel="brig" viewBox="0 0 150 150"><circle cx="75" cy="75" r="57" fill="rgba(8,18,22,.34)"/>
${spokes(10, (i, a) => grip(a, 55, 72, '#2a2f31', i === 0 ? '#d9b648' : '#1a1d1e', i === 0 ? '#14110a' : '#d9b648'))}
<g fill="none">${spokes(10, (_i, a) => spoke(a, 15, 55, '#8a9194', 4.4))}
${rim(52, 10, '#8a9194', '#e3e6e2')}
${spokes(5, (_i, a) => { const [x0, y0] = at(a - 0.06, 52), [x1, y1] = at(a + 0.06, 52); return `<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="#0d1214" stroke-width="12"/>`; }).replace(/<line/g, '<line transform="rotate(18 75 75)"')}
${spokes(10, (_i, a) => `<circle cx="${f(at(a, 52)[0])}" cy="${f(at(a, 52)[1])}" r="2.2" fill="#e3e6e2" stroke="#0d1214" stroke-width="1"/>`)}</g>
${hub('#4c5356')}</svg>`;

const IRONWAKE = () => `<svg class="wheel" data-wheel="ironwake" viewBox="0 0 150 150"><circle cx="75" cy="75" r="58" fill="rgba(8,18,22,.34)"/>
${spokes(6, (i, a) => grip(a, 56, 72, '#55646b', i === 0 ? '#d9b648' : '#2a3236', i === 0 ? '#14110a' : '#168d9c'))}
<g fill="none">${spokes(6, (_i, a) => spoke(a, 15, 56, '#6b787e', 6.5))}
${rim(53, 11, '#55646b', '#b9c3c7')}
<circle cx="75" cy="75" r="53" stroke="#d9b648" stroke-width="5" stroke-dasharray="5 5" opacity=".6" transform="rotate(30 75 75)" pathLength="200" style="stroke-dasharray:0 100 4 3 4 3 4 3 4 3 4 3 4 3 4 3 4 3 4 60"/>
${spokes(24, (_i, a) => `<circle cx="${f(at(a, 53)[0])}" cy="${f(at(a, 53)[1])}" r="1.3" fill="#c9d2d6"/>`)}</g>
${hub('#2a3a42')}</svg>`;

const WHEELS: Record<VesselId, () => string> = { dinghy: SKIFF, sloop: TRIMARAN, brig: BRIG, ironwake: IRONWAKE };

/** The helm wheel SVG for a vessel (the skiff's scrap wheel for anything unknown). */
export function wheelSVG(vessel: VesselId | string): string {
  return (WHEELS[vessel as VesselId] ?? SKIFF)();
}
