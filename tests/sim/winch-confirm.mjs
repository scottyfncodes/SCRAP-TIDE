// Winch payouts confirmation: 5 × 1000 hauls per site × winch hits × Salvager (Salvage.finish on the live game).
//   node tests/sim/winch-confirm.mjs  → docs/playcraft-evidence/winch_payouts_confirm_n5000.json
import { writeFileSync } from 'node:fs';
import { loadPlaywright, devServer, boot, provenance } from './harness.mjs';
const pw = loadPlaywright();
const srv = await devServer(5331);
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const SITES = ['sv_stump', 'sv_boxyard', 'sv_hollow_sub', 'sv_meridian_a', 'sv_meridian_b', 'sv_meridian_c', 'sv_rig', 'sv_tanker', 'sv_graveyard', 'sv_spire'];
const rows = [];
// 5 pages × 1000 hauls per row (each haul plays a sound; one page can't hold 40 000 audio graphs), pooled
for (const id of SITES) {
  const parts = [];
  for (const seed of [771, 772, 773, 774, 775]) {
    const { page, ctx } = await boot(browser, pw, srv.url, { seed, query: '?ship=skiff' });
    parts.push(await page.evaluate(async (id) => { const S = await import('/tests/sim/sims.page.js'); return S.salvageYield({ n: 1000, hold: 'minimal', only: [id] }); }, id));
    await ctx.close();
  }
  for (const r of parts[0]) {
    const same = parts.map((p) => p.find((x) => x.hits === r.hits && x.salvager === r.salvager));
    rows.push({ ...r, hauls: 5000, gold_per_haul: { mean: same.reduce((a, x) => a + x.gold_per_haul.mean, 0) / same.length } });
  }
  console.log('  done', id);
}
const out = [];
for (const site of [...new Set(rows.map((r) => r.site))]) for (const sal of [false, true]) {
  const g = [0, 1, 2, 3].map((h) => rows.find((r) => r.site === site && r.hits === h && r.salvager === sal).gold_per_haul.mean);
  out.push({ site, name: rows.find((r) => r.site === site).name, salvager: sal, gold: g, gain_pct: [0, 1, 2].map((h) => +(((g[h + 1] - g[h]) / g[h]) * 100).toFixed(1)) });
}
const min = Math.min(...out.flatMap((r) => r.gain_pct));
writeFileSync(new URL('../../docs/playcraft-evidence/winch_payouts_confirm_n5000.json', import.meta.url), JSON.stringify({ ...provenance({ seed: 777 }), evidence_class: 'simulation-measured', method: 'salvageYield (Salvage.finish on the live game), 5 × 1000 hauls (5 seeds) per site × hits × Salvager, empty hold of the boat that reaches the site', min_gain_per_hit_pct: min, rows: out }, null, 2) + '\n');
for (const r of out) console.log(r.name.slice(0, 22).padEnd(22), r.salvager ? 'salvager' : '        ', r.gain_pct.join(' / '));
console.log('min gain per hit:', min);
await browser.close(); await srv.close();
