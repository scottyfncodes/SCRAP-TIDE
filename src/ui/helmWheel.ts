// The helm wheel matches the boat you're sailing (HUD facelift). Each wheel is drawn in the same 150×150 frame so
// the stick, knob and turning code don't change; only the look does. Palette: docs/brand/SCRAP-TIDE-brand.md.
//
//   dinghy    Patchwork Skiff: scrap steel, mismatched spokes, a welded rust band (the original wheel)
//   sloop     Scrap Trimaran: a real ship's wheel, honey timber with turned handles and a brass boss
//   brig      Salt Brig: dark oak, ten spokes, a brass band round the rim
//   ironwake  Ironwake Expedition Cat: a riveted steel wheel with brass bosses and sea-glass enamel
import type { VesselId } from '../data/ship';

const C = 75;
const at = (a: number, r: number) => [C + Math.cos(a) * r, C + Math.sin(a) * r] as const;

function spokes(n: number, r0: number, r1: number, draw: (i: number, a: number, x0: number, y0: number, x1: number, y1: number) => string) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const [x0, y0] = at(a, r0);
    const [x1, y1] = at(a, r1);
    s += draw(i, a, x0, y0, x1, y1);
  }
  return s;
}

/** A turned wooden handle (the bit outside the rim you grip). */
function handle(a: number, r0: number, r1: number, fill: string, dark: string) {
  const [x0, y0] = at(a, r0);
  const [x1, y1] = at(a, r1);
  const [xm, ym] = at(a, (r0 + r1) / 2);
  return `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${dark}" stroke-width="9" stroke-linecap="round"/>`
    + `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${fill}" stroke-width="6.5" stroke-linecap="round"/>`
    + `<circle cx="${xm}" cy="${ym}" r="4.6" fill="${fill}" stroke="${dark}" stroke-width="1.2"/>`;
}

const SKIFF = () => `<svg class="wheel" data-wheel="dinghy" viewBox="0 0 150 150"><circle cx="75" cy="75" r="62" fill="rgba(10,13,14,.35)"/><g fill="none" stroke-linecap="butt">
${spokes(8, 18, 71, (i, a, x0, y0, x1, y1) => `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${i % 3 ? '#2a5363' : '#7a3a22'}" stroke-width="${i % 2 ? 7 : 9}"/><rect x="${at(a, 68)[0] - 4}" y="${at(a, 68)[1] - 4}" width="8" height="8" fill="#173b4a" transform="rotate(${(a * 180) / Math.PI} ${at(a, 68)[0]} ${at(a, 68)[1]})"/>`)}
<circle cx="75" cy="75" r="56" stroke-width="13" stroke="#173b4a"/><circle cx="75" cy="75" r="56" stroke-width="13" stroke="#a04d30" stroke-dasharray="18 26 6 40 30 22" opacity=".85"/>
<circle cx="75" cy="75" r="62.5" stroke-width="1.5" stroke="rgba(217,210,191,.25)"/><circle cx="75" cy="75" r="49.5" stroke-width="1.5" stroke="rgba(0,0,0,.6)"/></g></svg>`;

const TRIMARAN = () => `<svg class="wheel" data-wheel="sloop" viewBox="0 0 150 150"><circle cx="75" cy="75" r="60" fill="rgba(10,13,14,.3)"/>
${spokes(8, 0, 0, (_i, a) => handle(a, 52, 72, '#c98f4e', '#4a2c14'))}
<g fill="none">${spokes(8, 14, 52, (_i, _a, x0, y0, x1, y1) => `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#4a2c14" stroke-width="8"/><line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#b07a42" stroke-width="5.5"/>`)}
<circle cx="75" cy="75" r="50" stroke="#4a2c14" stroke-width="13"/><circle cx="75" cy="75" r="50" stroke="#a8713c" stroke-width="10"/>
<circle cx="75" cy="75" r="50" stroke="#d6a466" stroke-width="2" stroke-dasharray="14 8" opacity=".55"/>
<circle cx="75" cy="75" r="55.5" stroke="rgba(236,224,194,.25)" stroke-width="1"/></g>
<circle cx="75" cy="75" r="17" fill="#8a6a2a" stroke="#4a2c14" stroke-width="2"/></svg>`;

const BRIG = () => `<svg class="wheel" data-wheel="brig" viewBox="0 0 150 150"><circle cx="75" cy="75" r="61" fill="rgba(10,13,14,.32)"/>
${spokes(10, 0, 0, (_i, a) => handle(a, 53, 73, '#7a4a28', '#24140a'))}
<g fill="none">${spokes(10, 14, 53, (_i, _a, x0, y0, x1, y1) => `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#24140a" stroke-width="7.5"/><line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#6b3e20" stroke-width="5"/>`)}
<circle cx="75" cy="75" r="51" stroke="#24140a" stroke-width="13"/><circle cx="75" cy="75" r="51" stroke="#5c341b" stroke-width="10"/>
<circle cx="75" cy="75" r="51" stroke="#e5c65e" stroke-width="3" opacity=".9"/>
${spokes(10, 0, 0, (_i, a) => `<circle cx="${at(a, 51)[0]}" cy="${at(a, 51)[1]}" r="2.2" fill="#f0d77e"/>`)}</g>
<circle cx="75" cy="75" r="17" fill="#b0882e" stroke="#24140a" stroke-width="2"/></svg>`;

const IRONWAKE = () => `<svg class="wheel" data-wheel="ironwake" viewBox="0 0 150 150"><circle cx="75" cy="75" r="62" fill="rgba(10,13,14,.34)"/>
<g fill="none">${spokes(6, 14, 66, (_i, _a, x0, y0, x1, y1) => `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#0b1418" stroke-width="10"/><line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#7d8a91" stroke-width="6.5"/>`)}
<circle cx="75" cy="75" r="57" stroke="#0b1418" stroke-width="15"/><circle cx="75" cy="75" r="57" stroke="#5f6e76" stroke-width="12"/>
<circle cx="75" cy="75" r="57" stroke="#168d9c" stroke-width="4" stroke-dasharray="30 12" opacity=".85"/>
<circle cx="75" cy="75" r="63.5" stroke="rgba(236,224,194,.3)" stroke-width="1"/>
${spokes(24, 0, 0, (_i, a) => `<circle cx="${at(a, 57)[0]}" cy="${at(a, 57)[1]}" r="1.4" fill="#c9d2d6"/>`)}
${spokes(6, 0, 0, (_i, a) => `<circle cx="${at(a, 57)[0]}" cy="${at(a, 57)[1]}" r="5" fill="#d6a62a" stroke="#0b1418" stroke-width="1.5"/>`)}</g>
<circle cx="75" cy="75" r="18" fill="#2a3a42" stroke="#0b1418" stroke-width="2"/></svg>`;

const WHEELS: Record<VesselId, () => string> = { dinghy: SKIFF, sloop: TRIMARAN, brig: BRIG, ironwake: IRONWAKE };

/** The helm wheel SVG for a vessel (the skiff's scrap wheel for anything unknown). */
export function wheelSVG(vessel: VesselId | string): string {
  return (WHEELS[vessel as VesselId] ?? SKIFF)();
}
