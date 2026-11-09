// The steering control matches the boat you're sailing. Each one is salvaged machinery, not a ship's wheel
// (art-direction pass: Waterworld + Mad Max, never pirate brass and timber). All four are drawn in the same 150×150
// frame so the stick, knob and turning code don't change; only the look does. The rims are thinner than the old
// wheels and the middle is open, so the control reads at a glance without covering the world.
// Palette: docs/brand/SCRAP-TIDE-brand.md.
//
//   dinghy    Patchwork Skiff: a gate-valve handwheel off a drowned pumping station, red oxide over bare steel
//   sloop     Scrap Trimaran: a turbine housing ring, stator vanes in oxidised copper
//   brig      Salt Brig: a heavy aluminium direction dial, bolted bezel and stamped degree ticks
//   ironwake  Ironwake Expedition Cat: a riveted steel ring with a hazard-striped band and sea-glass indicators
//
// Every dial carries a faded hazard tab at 12 o'clock, so you can see the control turn with your thumb.
import type { VesselId } from '../data/ship';

const C = 75;
const f = (n: number) => n.toFixed(1);
const at = (a: number, r: number) => [C + Math.cos(a) * r, C + Math.sin(a) * r] as const;

function ring(n: number, draw: (i: number, a: number) => string, offset = 0) {
  let s = '';
  for (let i = 0; i < n; i++) s += draw(i, (i / n) * Math.PI * 2 - Math.PI / 2 + offset);
  return s;
}

/** Arc path from angle a0 to a1 at radius r (angles in radians, 0 = 3 o'clock). */
function arc(r: number, a0: number, a1: number) {
  const [x0, y0] = at(a0, r);
  const [x1, y1] = at(a1, r);
  return `M${f(x0)} ${f(y0)}A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${f(x1)} ${f(y1)}`;
}

/** The forward marker: a short black/yellow striped tab at 12 o'clock, a little worn. */
function hazardTab(r: number, w = 9) {
  const top = -Math.PI / 2;
  return `<path d="${arc(r, top - 0.2, top + 0.2)}" stroke="#14110a" stroke-width="${w}" stroke-linecap="butt" fill="none"/>`
    + `<path d="${arc(r, top - 0.2, top + 0.2)}" stroke="#d9b648" stroke-width="${w}" stroke-dasharray="4 3.2" stroke-linecap="butt" fill="none" opacity=".88"/>`;
}

/** The faint track the thumb cap travels in (it shows where to drag). */
const track = `<circle cx="75" cy="75" r="44" fill="none" stroke="rgba(236,224,194,.16)" stroke-width="1.2" stroke-dasharray="2 5"/>`;

const SKIFF = () => `<svg class="wheel" data-wheel="dinghy" viewBox="0 0 150 150"><circle cx="75" cy="75" r="60" fill="rgba(8,18,22,.34)"/>${track}
<g fill="none" stroke-linecap="round">
${ring(5, (_i, a) => { const [x0, y0] = at(a, 20), [x1, y1] = at(a + 0.32, 40), [x2, y2] = at(a + 0.18, 56); return `<path d="M${f(x0)} ${f(y0)}Q${f(x1)} ${f(y1)} ${f(x2)} ${f(y2)}" stroke="#1a0f0a" stroke-width="7"/><path d="M${f(x0)} ${f(y0)}Q${f(x1)} ${f(y1)} ${f(x2)} ${f(y2)}" stroke="#7d3520" stroke-width="4.2"/>`; })}
<circle cx="75" cy="75" r="56" stroke="#1a0f0a" stroke-width="10"/><circle cx="75" cy="75" r="56" stroke="#5f686b" stroke-width="7"/>
<circle cx="75" cy="75" r="56" stroke="#8e3b22" stroke-width="7" stroke-dasharray="34 9 21 5 46 12 28 7 40 10" opacity=".92"/>
${ring(10, (_i, a) => `<circle cx="${f(at(a, 56)[0])}" cy="${f(at(a, 56)[1])}" r="4.6" fill="#7a3420" stroke="#1a0f0a" stroke-width="1.4"/>`, Math.PI / 10)}
<circle cx="75" cy="75" r="61" stroke="rgba(236,224,194,.22)" stroke-width="1"/>
${hazardTab(56, 8)}</g></svg>`;

const TRIMARAN = () => `<svg class="wheel" data-wheel="sloop" viewBox="0 0 150 150"><circle cx="75" cy="75" r="61" fill="rgba(8,18,22,.34)"/>${track}
<g fill="none">
<circle cx="75" cy="75" r="59" stroke="#0e1513" stroke-width="5"/><circle cx="75" cy="75" r="59" stroke="#4a7d70" stroke-width="2.6"/>
${ring(18, (_i, a) => { const [x0, y0] = at(a, 49), [x1, y1] = at(a + 0.17, 59); return `<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="#0e1513" stroke-width="5.2"/><line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="${_i % 4 === 1 ? '#a8653a' : '#5f9a88'}" stroke-width="3"/>`; })}
<circle cx="75" cy="75" r="49" stroke="#0e1513" stroke-width="5"/><circle cx="75" cy="75" r="49" stroke="#8a5434" stroke-width="2.8"/>
${ring(3, (_i, a) => { const [x0, y0] = at(a, 20), [x1, y1] = at(a, 47); return `<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="#0e1513" stroke-width="6"/><line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="#6d7a7c" stroke-width="3.4"/>`; }, Math.PI / 3)}
<circle cx="75" cy="75" r="63.5" stroke="rgba(236,224,194,.2)" stroke-width="1"/>
${hazardTab(59, 7)}</g></svg>`;

const BRIG = () => `<svg class="wheel" data-wheel="brig" viewBox="0 0 150 150"><circle cx="75" cy="75" r="61" fill="rgba(8,18,22,.36)"/>${track}
<g fill="none">
<circle cx="75" cy="75" r="56" stroke="#11171a" stroke-width="12"/><circle cx="75" cy="75" r="56" stroke="#8a9194" stroke-width="9"/>
<circle cx="75" cy="75" r="56" stroke="#5c6467" stroke-width="9" stroke-dasharray="3 11 18 6 2 30" opacity=".6"/>
${ring(24, (i, a) => { const [x0, y0] = at(a, 48), [x1, y1] = at(a, i % 2 ? 51 : 53); return `<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="#e8e0c8" stroke-width="1.3" opacity=".7"/>`; })}
${ring(8, (_i, a) => `<circle cx="${f(at(a, 56)[0])}" cy="${f(at(a, 56)[1])}" r="2.6" fill="#c9cdc8" stroke="#11171a" stroke-width="1.2"/>`, Math.PI / 8)}
${ring(4, (_i, a) => { const [x0, y0] = at(a, 20), [x1, y1] = at(a, 46); return `<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="#11171a" stroke-width="6.5"/><line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="#a04d30" stroke-width="3.4"/>`; }, Math.PI / 4)}
<circle cx="75" cy="75" r="62.5" stroke="rgba(236,224,194,.24)" stroke-width="1"/>
${hazardTab(56, 9)}</g></svg>`;

const IRONWAKE = () => `<svg class="wheel" data-wheel="ironwake" viewBox="0 0 150 150"><circle cx="75" cy="75" r="62" fill="rgba(8,18,22,.36)"/>${track}
<g fill="none">
${ring(3, (_i, a) => { const [x0, y0] = at(a, 20), [x1, y1] = at(a, 54); return `<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="#0b1418" stroke-width="10"/><line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="#6b787e" stroke-width="6"/>`; }, Math.PI / 3)}
<circle cx="75" cy="75" r="57" stroke="#0b1418" stroke-width="13"/><circle cx="75" cy="75" r="57" stroke="#55646b" stroke-width="10"/>
<path d="${arc(57, 0.35, 2.79)}" stroke="#d9b648" stroke-width="7" stroke-dasharray="5 5" opacity=".7"/>
${ring(24, (_i, a) => `<circle cx="${f(at(a, 57)[0])}" cy="${f(at(a, 57)[1])}" r="1.3" fill="#b9c3c7"/>`)}
${ring(3, (_i, a) => `<circle cx="${f(at(a, 57)[0])}" cy="${f(at(a, 57)[1])}" r="4.2" fill="#168d9c" stroke="#0b1418" stroke-width="1.5"/>`, Math.PI / 3)}
<circle cx="75" cy="75" r="63.5" stroke="rgba(236,224,194,.26)" stroke-width="1"/>
${hazardTab(57, 10)}</g></svg>`;

const WHEELS: Record<VesselId, () => string> = { dinghy: SKIFF, sloop: TRIMARAN, brig: BRIG, ironwake: IRONWAKE };

/** The steering dial SVG for a vessel (the skiff's valve wheel for anything unknown). */
export function wheelSVG(vessel: VesselId | string): string {
  return (WHEELS[vessel as VesselId] ?? SKIFF)();
}
