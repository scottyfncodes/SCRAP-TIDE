// Stormwall tuning (balance pass 1, #4): the Driftholm → Meridian Spire voyage under the real frame loop for each
// Ironwake fit, plus a minute sitting at the Spire's salvage site, for a grid of STORMWALL values patched into a
// throwaway page (never the repo). `legacy` reproduces the old rules (no gale, ×0.55 everywhere).
//
//   node tests/sim/stormwall-tune.mjs            → docs/playcraft-evidence/stormwall/tuning.json
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, loadPlaywright, devServer, boot, provenance } from './harness.mjs';

const OUT = process.env.STORMWALL_OUT || path.join(ROOT, 'docs/playcraft-evidence/stormwall');
mkdirSync(OUT, { recursive: true });
const pw = loadPlaywright();
const srv = await devServer(5351);
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

const GRID = process.env.GRID ? JSON.parse(process.env.GRID) : [
  { id: 'legacy', speedMul: 1, hullMul: 0.55 },
  { id: 'current', current: true },
  { id: 's0.35_h1.1', speedMul: 0.35, hullMul: 1.1 },
  { id: 's0.35_h1.5', speedMul: 0.35, hullMul: 1.5 },
  { id: 's0.45_h1.3', speedMul: 0.45, hullMul: 1.3 },
  { id: 's0.45_h1.6', speedMul: 0.45, hullMul: 1.6 },
];
const FITS = [
  { fit: 'stock sail', upgrades: [] },
  { fit: 'Canvas Mainsail', upgrades: ['sail_canvas'] },
  { fit: 'Cutter Rig', upgrades: ['sail_canvas', 'sail_cutter'] },
  { fit: 'Cutter Rig + Riveted Armour', upgrades: ['sail_canvas', 'sail_cutter', 'hull_copper', 'hull_armor'] },
  { fit: 'Twin Diesel (engine) ', upgrades: ['engine_outboard', 'engine_twin', 'tank_drums'], engine: true },
];
const SPIRE = { x: -210, z: -1040 };
const rows = [];
for (const g of GRID) {
  const out = { ...g, voyages: [] };
  for (const f of FITS) {
    const b = await boot(browser, pw, srv.url, { seed: 20261105, query: '?ship=skiff' });
    const r = await b.page.evaluate(async ([g, f, SPIRE]) => {
      const W = await import('/src/data/world.ts');
      if (!g.current) {
        W.STORMWALL.speedMul = g.speedMul;
        W.STORMWALL.hullMul = g.hullMul;
        if (g.id === 'legacy') W.STORMWALL.lee.r = -1e6; // no lee: ×hullMul everywhere, as before
        if (g.leeR !== undefined) W.STORMWALL.lee.r = g.leeR;
        if (g.leeFade !== undefined) W.STORMWALL.lee.fade = g.leeFade;
      }
      const S = await import('/tests/sim/sims.page.js');
      const v = S.voyage({ name: f.fit, vessel: 'ironwake', upgrades: f.upgrades, engine: !!f.engine, from: { x: 6, z: 140 }, waypoints: [{ x: -60, z: -300 }, { x: -180, z: -800 }, { ...SPIRE, r: 60 }], seconds: 1200, seed: 1 });
      // a minute at the Spire's salvage site, stopped (what a haul there costs)
      const G = window.__game, St = G.store;
      St.data.hull = St.stats.hullMax;
      Object.assign(G.boat, { x: SPIRE.x + 20, z: SPIRE.z + 20, speed: 0, docked: false, anchored: false, busy: true });
      G.ui.joy.x = G.ui.joy.y = 0;
      const h0 = St.data.hull;
      window.__sim.render = false;
      for (let i = 0; i < 1800; i++) { G.boat.speed = 0; G.boat.busy = true; window.__sim.step(1, 1 / 30); }
      G.boat.busy = false;
      return { ...v, track: undefined, loiter_hull_per_min_at_spire: +(h0 - St.data.hull).toFixed(1), wall_at_spire: +G.atmo.wall.toFixed(2) };
    }, [g, f, SPIRE]);
    await b.ctx.close();
    out.voyages.push({ fit: f.fit, arrived: r.arrived, minutes: r.minutes, hull_lost_pct: +((r.hull.lost / r.hull.start) * 100).toFixed(1), hull_lost: r.hull.lost, hull_start: r.hull.start, stormwall_s: r.stormwall_s, storm_s: r.storm_exposure_s, loiter_hull_per_min_at_spire: r.loiter_hull_per_min_at_spire, swamped: r.hull.end <= 0 });
  }
  console.log(`${g.id.padEnd(12)} ` + out.voyages.map((v) => `${v.fit.trim()}: ${v.arrived ? '' : 'NOT ARRIVED '}${v.hull_lost_pct}% (${v.stormwall_s}s wall, spire ${v.loiter_hull_per_min_at_spire}/min)`).join(' | '));
  rows.push(out);
}
writeFileSync(path.join(OUT, 'tuning.json'), JSON.stringify({ ...provenance({ server: srv.kind }), evidence_class: 'simulation-measured (STORMWALL values patched in a throwaway page; `current` is the code as committed)', grid: rows }, null, 2) + '\n');
await browser.close();
await srv.close();
