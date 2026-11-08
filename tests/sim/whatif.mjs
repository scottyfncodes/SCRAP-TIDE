// What-if balance runs: change game DATA inside a throwaway simulation page (never the repo, never production) and
// re-measure with the same simulations. For sizing proposals before anyone edits the game.
//
//   node tests/sim/whatif.mjs            → docs/playcraft-evidence/whatif/trimaran.json
//
// Each variant boots a fresh page, applies its patch to the live data objects (VESSELS, SALVAGE_SITES …) and runs
// the campaign + the Trimaran affordability simulation from tests/sim/sims.page.js.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, loadPlaywright, devServer, boot, provenance } from './harness.mjs';

const OUT = path.join(ROOT, 'docs/playcraft-evidence/whatif');
mkdirSync(OUT, { recursive: true });
const pw = loadPlaywright();
const srv = await devServer(5321);
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

// patches are source strings evaluated in the page with the game's data modules in scope as `D`
const RESPAWN_25 = "for (const id of ['sv_stump', 'sv_boxyard', 'sv_hollow_sub']) D.world.SALVAGE_MAP[id].respawn = Math.round(D.world.SALVAGE_MAP[id].respawn * 0.75);";
const ALL = [
  { id: 'baseline', label: 'current game (winch #2 + sea clock #1 merged)', patch: '' },
  { id: 'gold_380', label: 'Trimaran 420g → 380g', patch: 'D.ship.VESSELS.sloop.cost.gold = 380;' },
  { id: 'gold_340', label: 'Trimaran 420g → 340g', patch: 'D.ship.VESSELS.sloop.cost.gold = 340;' },
  { id: 'gold_350', label: 'Trimaran 420g → 350g', patch: 'D.ship.VESSELS.sloop.cost.gold = 350;' },
  { id: 'gold_320', label: 'Trimaran 420g → 320g', patch: 'D.ship.VESSELS.sloop.cost.gold = 320;' },
  { id: 'gold_300', label: 'Trimaran 420g → 300g', patch: 'D.ship.VESSELS.sloop.cost.gold = 300;' },
  { id: 'gold_340_respawn', label: 'Trimaran 340g + Drift respawns −25%', patch: 'D.ship.VESSELS.sloop.cost.gold = 340; ' + RESPAWN_25 },
];
// `node tests/sim/whatif.mjs gold_320 baseline` runs only those variants
const pick = process.argv.slice(2);
const VARIANTS = pick.length ? ALL.filter((v) => pick.includes(v.id)) : ALL;

const rows = [];
for (const v of VARIANTS) {
  const out = { id: v.id, label: v.label, campaign: [] };
  for (const seed of [1, 2, 3, 4, 5]) {
    const b = await boot(browser, pw, srv.url, { seed: 20261105, query: '?ship=skiff' });
    const r = await b.page.evaluate(async ([patch, seed]) => {
      const D = { ship: await import('/src/data/ship.ts'), world: await import('/src/data/world.ts') };
      new Function('D', patch)(D);
      const S = await import('/tests/sim/sims.page.js');
      return S.campaign({ seed, hits: 2 });
    }, [v.patch, seed]);
    await b.ctx.close();
    const step = (re) => r.steps.find((s) => re.test(s.step));
    const before = r.steps.slice(0, r.steps.indexOf(step(/Trimaran/)));
    out.campaign.push({
      seed,
      trimaran_actions: step(/Trimaran/).actions, trimaran_hauls: step(/Trimaran/).hauls, trimaran_wait_min: step(/Trimaran/).respawn_wait_min,
      max_earlier_step: Math.max(...before.map((s) => s.actions)), actions_before_trimaran: before.reduce((a, s) => a + s.actions, 0),
      ironwake_actions: step(/Ironwake/).actions, total_actions: r.totals.actions, total_wait_h: r.totals.respawn_wait_h,
    });
  }
  const m = (k) => +(out.campaign.reduce((a, c) => a + c[k], 0) / out.campaign.length).toFixed(1);
  out.mean = { trimaran_actions: m('trimaran_actions'), trimaran_wait_min: m('trimaran_wait_min'), max_earlier_step: m('max_earlier_step'), spike_ratio: +(m('trimaran_actions') / m('max_earlier_step')).toFixed(2), actions_before_trimaran: m('actions_before_trimaran'), ironwake_actions: m('ironwake_actions'), total_actions: m('total_actions') };
  console.log(`${v.label.padEnd(60)} trimaran ${out.mean.trimaran_actions} actions (×${out.mean.spike_ratio} the largest earlier step), wait ${out.mean.trimaran_wait_min} min, campaign ${out.mean.total_actions}`);
  rows.push(out);
}
writeFileSync(path.join(OUT, process.env.WHATIF_OUT || 'trimaran.json'), JSON.stringify({ ...provenance({ server: srv.kind }), evidence_class: 'simulation-measured (what-if: data patched in a throwaway page; not the shipped game)', winch: '2/3', seeds: [1, 2, 3, 4, 5], variants: rows }, null, 2) + '\n');
await browser.close();
await srv.close();
