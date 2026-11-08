// Mid/late-game progression: the Trimaran → Salt Brig → Ironwake steps of the campaign, and the Ironwake from a fixed
// start (to separate its own randomness from what earlier steps leave behind). Measures only; changes no game data.
//
//   node tests/sim/progression.mjs [seeds=10]   → docs/playcraft-evidence/simulations/progression.json
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, loadPlaywright, devServer, boot, provenance, hashJSON } from './harness.mjs';

const N = Number(process.argv[2] ?? 10);
const SEEDS = Array.from({ length: N }, (_, i) => i + 1);
const pw = loadPlaywright();
const srv = await devServer(5322);
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
// One fresh page per run: the sea clock and salvage timers outlive setState(), so seeds sharing a page are not
// independent (seed 2 after seed 1 measured 21 Trimaran actions; seed 2 alone, 16).
const call = async (fn, arg) => {
  const b = await boot(browser, pw, srv.url, { seed: 20261105, query: '?ship=skiff' });
  const r = await b.page.evaluate(async ([fn, arg]) => (await import('/tests/sim/sims.page.js'))[fn](arg), [fn, arg]);
  await b.ctx.close();
  return r;
};

const STEPS = { sloop: /Trimaran/, brig: /Salt Brig/, ironwake: /Ironwake/ };
const campaign = [];
for (const seed of SEEDS) {
  const r = await call('campaign', { seed, hits: 2 });
  const row = { seed, total_actions: r.totals.actions, goal_stuck_at: r.goal_stuck_at };
  const idx = (re) => r.steps.findIndex((s) => re.test(s.step));
  row.max_before_trimaran = Math.max(...r.steps.slice(0, idx(STEPS.sloop)).map((s) => s.actions));
  for (const [k, re] of Object.entries(STEPS)) {
    const s = r.steps[idx(re)];
    row[k] = { ok: s.ok, bought: s.bought, actions: s.actions, wait_min: s.respawn_wait_min, start: s.start, short_of: s.short_of };
  }
  campaign.push(row);
  console.log(`campaign seed ${seed}: trimaran ${row.sloop.actions}, brig ${row.brig.actions}, ironwake ${row.ironwake.actions} (start gold ${row.ironwake.start.gold})`);
}
// determinism: seed 1 again, in its own fresh page
const again = await call('campaign', { seed: 1, hits: 2 });
const deterministic = again.totals.actions === campaign[0].total_actions;

// the Brig and the Ironwake from a fixed start (15 gold, previous hull owned, nothing carried over), one page per seed
const fixedRuns = [];
for (const seed of Array.from({ length: 2 * N }, (_, i) => i + 1)) {
  const rows = await call('affordability', { seeds: [seed], hits: 2, only: ['brig', 'ironwake'] });
  fixedRuns.push(...rows.map((r) => ({ seed, target: r.target, ok: r.affordable_runs === 1, actions: r.actions.mean, hauls: r.hauls.mean, wait_min: r.respawn_wait_min })));
  console.log(`fixed start seed ${seed}: ` + rows.map((r) => `${r.target} ${r.actions.mean}`).join(', '));
}
const fixed = ['brig', 'ironwake'].map((t) => {
  const rs = fixedRuns.filter((r) => r.target === t);
  return { target: t, affordable: `${rs.filter((r) => r.ok).length}/${rs.length}`, actions: rs.map((r) => r.actions), wait_min: rs.map((r) => r.wait_min) };
});

const st = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  return { mean: +mean.toFixed(1), min: s[0], max: s[s.length - 1], sd: +Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / s.length).toFixed(1) };
};
const summary = {
  trimaran: st(campaign.map((c) => c.sloop.actions)),
  brig: st(campaign.map((c) => c.brig.actions)),
  ironwake: st(campaign.map((c) => c.ironwake.actions)),
  wait_min: { trimaran: st(campaign.map((c) => c.sloop.wait_min)), brig: st(campaign.map((c) => c.brig.wait_min)), ironwake: st(campaign.map((c) => c.ironwake.wait_min)) },
  ratio_brig_to_trimaran: +(st(campaign.map((c) => c.brig.actions)).mean / st(campaign.map((c) => c.sloop.actions)).mean).toFixed(2),
  ratio_ironwake_to_brig: +(st(campaign.map((c) => c.ironwake.actions)).mean / st(campaign.map((c) => c.brig.actions)).mean).toFixed(2),
  fixed_start: Object.fromEntries(fixed.map((r) => [r.target, { affordable: r.affordable, actions: st(r.actions), wait_min: st(r.wait_min) }])),
  deterministic,
};
console.log(JSON.stringify(summary, null, 1));
writeFileSync(path.join(ROOT, 'docs/playcraft-evidence/simulations/progression.json'), JSON.stringify({
  ...provenance({ server: srv.kind }), simulation: 'progression', evidence_class: 'simulation-measured', winch: '2/3', seeds: SEEDS,
  method: 'campaign() as in campaign.json, now with the Salt Brig before the Ironwake (the Captain’s Log order); per vessel step: actions, respawn wait, the gold and materials it started with, and which materials were still short at each action. Fixed start: affordability() for the Brig (from the Trimaran) and the Ironwake (from the Brig), 15 gold, nothing carried over.',
  summary, campaign, fixed_start: fixedRuns, result_hash: hashJSON({ campaign, fixed }),
}, null, 2) + '\n');
await browser.close();
await srv.close();
