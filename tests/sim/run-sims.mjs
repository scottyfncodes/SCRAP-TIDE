// PLAYCRAFT simulation suite: measures TIDEBREAKERS' economy, fuel, hull and progression by running the game's real
// systems in headless Chromium (see harness.mjs and sims.page.js).
//
//   npm run sim              full suite → docs/playcraft-evidence/simulations/
//   npm run sim -- --quick   fewer samples (smoke)
//
// Nothing is saved: the page runs a `?ship=skiff` preview store (never written to localStorage) in a fresh browser
// context, and the run checks afterwards that storage is still empty.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, loadPlaywright, devServer, boot, provenance, hashJSON } from './harness.mjs';

const quick = process.argv.includes('--quick');
const OUT = path.join(ROOT, 'docs/playcraft-evidence/simulations');
mkdirSync(OUT, { recursive: true });

const pw = loadPlaywright();
const srv = await devServer();
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const SEED = 20261105;
const errors = [];
const storageKeys = new Set();
let bootMs = 0;
// Every simulation gets a freshly booted page: results don't depend on what ran before, and one long run can't
// exhaust the page for the next (software WebGL pages crash after enough frames).
const run = async (name, fn, args) => {
  const b = await boot(browser, pw, srv.url, { seed: SEED, query: '?ship=skiff' });
  bootMs = Math.max(bootMs, b.bootMs);
  await b.page.evaluate(async () => {
    window.__sims = await import('/tests/sim/sims.page.js');
  });
  const t0 = Date.now();
  const result = await b.page.evaluate(([fn, args]) => window.__sims[fn](args), [fn, args]);
  const ms = Date.now() - t0;
  for (const k of await b.page.evaluate(() => Object.keys(localStorage))) storageKeys.add(k);
  errors.push(...b.errors);
  await b.ctx.close();
  console.log(`  ${name}: ${ms} ms`);
  return { result, ms };
};

const meta = provenance({ server: srv.kind, seed: SEED, quick, boot_ms: bootMs });
const write = (file, body) => {
  const doc = { ...meta, ...body, result_hash: hashJSON(body.results) };
  writeFileSync(path.join(OUT, file), JSON.stringify(doc, null, 2) + '\n');
  return doc;
};

console.log('PLAYCRAFT simulations');
const yieldMin = await run('salvage yield (boat that reaches the site)', 'salvageYield', { n: quick ? 30 : 1000, hold: 'minimal' });
const yieldLarge = await run('salvage yield (30-slot hold)', 'salvageYield', { n: quick ? 30 : 1000, hold: 'large' });
const winch = await run('winch windows', 'winchWindows', {});
const goldRank = {};
for (const r of yieldMin.result) if (r.hits === 2 && !r.salvager) goldRank[r.site] = r.gold_per_haul.mean;
write('salvage_yield.json', {
  simulation: 'salvage_yield',
  evidence_class: 'simulation-measured',
  method: 'Salvage.finish(site, hits) called on the live game for every site × winch result (0-3 hits) × Salvager on/off, each haul from a reset save with an empty hold. Gold = sum of item.value for what actually came aboard (Game.gain respects hold room). Hits are fixed per row: the winch skill itself is a human input.',
  results: { minimal_hold: yieldMin.result, large_hold: yieldLarge.result, winch_windows: winch.result },
});

const seeds = quick ? [1, 2] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const afford = {};
for (const hits of quick ? [2] : [1, 2, 3]) afford[`hits_${hits}`] = (await run(`affordability (winch ${hits}/3)`, 'affordability', { seeds, hits, goldRank })).result;
write('affordability.json', {
  simulation: 'affordability',
  evidence_class: 'simulation-measured',
  method: 'For every upgrade and vessel: start from the game’s freshSave() with only its prerequisites (and the boat needed to reach its shop), 15 gold. Repeat: craft what helps (Game.craft), dock and sell surplus (Store.unloadToVault + Game.sell), then take the most useful ready source — a salvage haul (Salvage.finish; respawn timers on a virtual clock), a drifting cache (Salvage.openCache; at most one per 6 s) or flotsam (Game.updateCaches with the boat in it) — until Store.canAfford(cost); then buy it through Game.buyUpgrade/buyVessel. Travel between places is not simulated (teleported); beach finds and treasure digs are not used, so these are upper bounds on effort from salvage alone.',
  seeds,
  results: afford,
});

const camp = [];
for (const hits of quick ? [2] : [1, 2, 3]) for (const seed of quick ? [1] : [1, 2, 3]) camp.push((await run(`campaign (winch ${hits}/3, seed ${seed})`, 'campaign', { seed, hits, goldRank })).result);
write('campaign.json', {
  simulation: 'campaign',
  evidence_class: 'simulation-measured',
  method: 'One save from freshSave(): the Captain’s Log in order (Game.updateGoals pays its rewards), every purchase through Game.buyUpgrade/buyVessel, crew via Game.rescue, Rig Helios via Game.dockAt, milestones via the real Store.checkMilestones. Sourcing as in affordability. Raider combat is not simulated.',
  results: camp,
});

const ex = await run('exploit checks', 'exploits', {});
write('exploits.json', { simulation: 'exploits', evidence_class: 'simulation-measured', method: 'Round trips through Game.craft + Game.sell, Game.buyFuel, Game.repair, Salvage.ready on the live game.', results: ex.result });

const fuel = { result: [] };
for (const v of ['dinghy', 'sloop', 'ironwake']) fuel.result.push(...(await run(`fuel & range (${v})`, 'fuelRange', { vessels: [v] })).result);
const power = await run('solar / turbine regen', 'powerRegen', {});
const sailing = await run('sail speed & turning', 'sailingImpact', {});
write('sailing_fuel.json', {
  simulation: 'sailing_fuel',
  evidence_class: 'simulation-measured',
  method: 'The real frame loop (Game.update → updateSail) stepped at a fixed 1/30 s, the wheel held toward a heading exactly as the UI sets it, in a clear lane of open water (the boat is put back at the lane start when it reaches the end; distance is the game’s own stats.distance). Storms forced off. Fuel runs go into the wind so the sails add as little as possible.',
  results: { fuel: fuel.result, power: power.result, sailing: sailing.result },
});

const hull = await run('hull: storms, collisions, repair', 'hullStorms', {});
write('hull.json', { simulation: 'hull', evidence_class: 'simulation-measured', method: 'Game.updateHull(dt) at fixed storm/Stormwall levels for 120 s (or until 2 hull left); Game.damage(speed × 1.4) for a wreck strike as updateSail applies it; Mechanic repair in calm water.', results: hull.result });

const H = { x: -540, z: 170 }, SPIRE = { x: -210, z: -1040 };
const voyages = [];
for (const seed of quick ? [1] : [1, 2, 3]) {
  voyages.push((await run(`voyage Driftholm → Rig Helios (Trimaran, seed ${seed})`, 'voyage', { name: 'Driftholm → Rig Helios', vessel: 'sloop', upgrades: ['sail_canvas'], from: { x: 6, z: 140 }, waypoints: [{ x: -120, z: 120 }, { x: -380, z: 160 }, { ...H, r: 70 }], seconds: 600, seed })).result);
  voyages.push((await run(`voyage Driftholm → Rig Helios (Skiff, seed ${seed})`, 'voyage', { name: 'Driftholm → Rig Helios (Skiff: should be turned back by the swell)', vessel: 'dinghy', upgrades: ['sail_canvas'], from: { x: 6, z: 140 }, waypoints: [{ x: -120, z: 120 }, { x: -380, z: 160 }, { ...H, r: 70 }], seconds: 300, seed })).result);
  for (const [sail, armour] of [[['sail_canvas', 'sail_cutter'], []], [['sail_canvas', 'sail_cutter'], ['hull_copper', 'hull_armor']], [['sail_canvas'], []], [[], []]])
    voyages.push((await run(`voyage Driftholm → Meridian Spire (Ironwake, ${sail.length ? sail.at(-1) : 'stock sail'}${armour.length ? ' + armour' : ''}, seed ${seed})`, 'voyage', { name: `Driftholm → Meridian Spire (Ironwake, ${sail.length === 2 ? 'Cutter Rig' : sail.length ? 'Canvas Mainsail' : 'stock sail'}${armour.length ? ', Riveted Armour' : ''})`, vessel: 'ironwake', upgrades: [...sail, ...armour], from: { x: 6, z: 140 }, waypoints: [{ x: -60, z: -300 }, { x: -180, z: -800 }, { ...SPIRE, r: 60 }], seconds: 900, seed })).result);
  voyages.push((await run(`voyage toward the Spire (Trimaran, seed ${seed})`, 'voyage', { name: 'Driftholm → Meridian Spire (Trimaran: should be turned back by the Stormwall)', vessel: 'sloop', upgrades: ['sail_canvas'], from: { x: 6, z: 140 }, waypoints: [{ x: -60, z: -300 }, { x: -180, z: -800 }, { ...SPIRE, r: 60 }], seconds: 420, seed })).result);
}
write('voyages.json', { simulation: 'voyages', evidence_class: 'simulation-measured', method: 'The real frame loop with the wheel held toward each waypoint in turn (the boat sheers off for 4 s when it stalls against something, as a player would). Real wind, swell, Stormwall, storm cells, collisions and hull damage. Arrival flags come from the game’s own updateIslands.', results: voyages });

// isolation check: nothing was written to any context's storage
const storage = [...storageKeys];
write('run.json', { simulation: 'run', evidence_class: 'harness', results: { page_errors: errors, localStorage_keys_after_run: storage, timings_ms: { boot_max: bootMs } } });
console.log(storage.length ? `WARNING: storage keys written: ${storage}` : 'storage untouched (preview store)');
if (errors.length) console.log('page errors:', errors.slice(0, 5));
await browser.close();
await srv.close();
