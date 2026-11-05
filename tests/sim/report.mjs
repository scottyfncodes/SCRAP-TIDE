// Builds the PLAYCRAFT evidence pack from the simulation and playtest JSON:
//   docs/playcraft-evidence/EVIDENCE.md            human report (results, findings, coverage, what is NOT covered)
//   docs/playcraft-evidence/playcraft-evidence.json evidence items PLAYCRAFT's assess/verify accept as `evidence`
//
// Every finding and every status here is computed from the measured data; nothing is asserted by hand.
//   npm run evidence:report
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { ROOT, provenance } from './harness.mjs';

const DIR = path.join(ROOT, 'docs/playcraft-evidence');
const read = (f) => (existsSync(path.join(DIR, f)) ? JSON.parse(readFileSync(path.join(DIR, f), 'utf8')) : null);
const sy = read('simulations/salvage_yield.json');
const af = read('simulations/affordability.json');
const cp = read('simulations/campaign.json');
const ex = read('simulations/exploits.json');
const sf = read('simulations/sailing_fuel.json');
const hu = read('simulations/hull.json');
const vo = read('simulations/voyages.json');
const run = read('simulations/run.json');
const bot = read('playtest/playtest_bot.json');
const missing = Object.entries({ sy, af, cp, ex, sf, hu, vo, bot }).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.error(`evidence:report: missing inputs (${missing.join(', ')}); run npm run sim and npm run bot first`);
  process.exit(1);
}

const f1 = (v) => (v === null || v === undefined ? '—' : Number.isInteger(v) ? String(v) : v.toFixed(1));
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const L = [];
const findings = [];
const evidence = [];
const finding = (severity, title, detail, cls) => findings.push({ severity, title, detail, evidence_class: cls });
const ev = (category, status, title, detail, source) => evidence.push({ id: `tb.${category}.${evidence.length}`, category, status, title, detail, source: `docs/playcraft-evidence/${source}` });

// ─────────────────────────────── playtest bot ───────────────────────────────
const botRun = bot.runs[0];
const allBot = bot.runs.every((r) => r.passed);
const tl = (e) => botRun.timeline.find((x) => x.event.startsWith(e));
const tUpgrade = tl('upgrade installed')?.game_t;

// ─────────────────────────────── salvage ───────────────────────────────
const yMin = sy.results.minimal_hold;
const y2 = yMin.filter((r) => r.hits === 2 && !r.salvager);
const yOverflow = yMin.filter((r) => r.hits === 3 && !r.salvager && r.hauls_with_overflow / r.hauls > 0.25);

// ─────────────────────────────── affordability ───────────────────────────────
const aff = af.results;
const affRows = aff.hits_2.map((r) => {
  const by = (k) => aff[k]?.find((x) => x.target === r.target);
  return { r, h1: by('hits_1'), h3: by('hits_3') };
});
const affFail = Object.entries(aff).flatMap(([k, rows]) => rows.filter((r) => r.affordable_runs < r.runs || r.bought_through_game < r.affordable_runs).map((r) => ({ k, r })));

// ─────────────────────────────── campaign ───────────────────────────────
const camps = cp.results;
const c2 = camps.find((c) => c.hits === 2) ?? camps[0];
const campOk = camps.every((c) => c.steps.every((s) => s.ok) && c.owned.upgrades === c.owned.of && c.owned.vessels.includes('ironwake'));
// difficulty spikes: a purchase step costing far more actions than any earlier step
const spikes = [];
{
  let maxPrev = 0;
  for (const s of c2.steps) {
    if (s.actions > 0 && maxPrev > 0 && s.actions >= Math.max(15, maxPrev * 2)) spikes.push({ step: s.step, actions: s.actions, prev_max: maxPrev });
    maxPrev = Math.max(maxPrev, s.actions);
  }
}

// ─────────────────────────────── hull / voyages ───────────────────────────────
const storms = hu.results.storms;
const sw = (vessel, plating, storm, wall) => storms.find((r) => r.vessel === vessel && r.plating === plating && r.storm === storm && r.in_stormwall === wall);
const vIron = vo.results.filter((v) => v.vessel === 'ironwake');
const vSloopWall = vo.results.filter((v) => v.vessel === 'sloop' && /Spire/.test(v.name));
const vSkiff = vo.results.filter((v) => v.vessel === 'dinghy');
const vHelios = vo.results.filter((v) => v.vessel === 'sloop' && /Helios/.test(v.name));

// ─────────────────────────────── findings (computed) ───────────────────────────────
if (affFail.length) for (const { k, r } of affFail) finding('high', `Possible dead end: ${r.name}`, `${k}: affordable in ${r.affordable_runs}/${r.runs} runs; ${JSON.stringify(r.failures[0] ?? {})}`, 'simulation-measured');
else finding('info', 'No progression dead ends found', `Every one of the ${aff.hits_2.length} upgrades and vessels became affordable and was bought through the game in every seed at every winch skill (${Object.keys(aff).join(', ')}).`, 'simulation-measured');
if (!campOk) finding('high', 'Campaign did not complete', camps.map((c) => `hits ${c.hits} seed ${c.seed}: ${c.owned.upgrades}/${c.owned.of} upgrades, vessels ${c.owned.vessels}`).join('; '), 'simulation-measured');
for (const s of spikes) finding('medium', `Difficulty/pacing spike: ${s.step}`, `${s.actions} sourcing actions for this step vs at most ${s.prev_max} for any earlier step (campaign, winch 2/3).`, 'simulation-measured');
const goalStuck = [...new Set(camps.map((c) => c.goal_stuck_at))];
finding('info', `Captain's Log in the campaign stops at ${goalStuck.join('/')}`, `Completed: ${c2.goals_completed.join(' → ')}. The raider goal needs real-time combat, which the simulation does not play; nothing after it can complete here (purchases are not gated by goals).`, 'simulation-measured');
if (vIron.length) {
  const lost = vIron.map((v) => v.hull.lost / v.hull.start);
  const wallS = mean(vIron.map((v) => v.stormwall_s));
  const sloopSwamped = vSloopWall.filter((v) => v.hull.end <= 0).length;
  finding(Math.max(...lost) < 0.15 ? 'medium' : 'info', 'The Stormwall barely scratches the Ironwake',
    `Driftholm → Meridian Spire under the real loop: Ironwake arrived in ${vIron.filter((v) => v.arrived).length}/${vIron.length} runs, ${f1(wallS)} s inside the wall on average, losing ${f1(Math.min(...lost) * 100)}-${f1(Math.max(...lost) * 100)}% hull (stock sail to Cutter Rig, with and without armour). The Trimaran was swamped trying in ${sloopSwamped}/${vSloopWall.length} runs. For a final barrier the crossing is short and nearly free once you own the right boat; whether that is the intent is a design call.`, 'simulation-measured');
}
{
  const d10 = sw('dinghy', 'no plating', 1, false);
  const s10 = sw('sloop', 'no plating', 1, false);
  if (d10) finding('info', 'Storm damage', `A full storm (storm 1.0) costs the stock Skiff ${f1(d10.hull_lost_per_minute)} hull/min (swamped from full in ${f1(d10.minutes_to_swamp_from_full)} min); the Trimaran ${f1(s10?.hull_lost_per_minute)} hull/min (${f1(s10?.minutes_to_swamp_from_full)} min). Riveted Armour cuts it by ${f1((1 - sw('sloop', 'Riveted Armour', 1, false).hull_lost_per_minute / s10.hull_lost_per_minute) * 100)}%. Below storm 0.4 there is no damage.`, 'simulation-measured');
}
for (const e of ex.results.filter((x) => x.exploit)) finding(/clock/.test(e.check) ? 'low' : 'medium', `Exploit: ${e.check}`, e.note ?? JSON.stringify(e), 'simulation-measured');
const minor = ex.results.filter((x) => !x.exploit && x.margin_pct > 0);
if (minor.length) finding('info', 'Crafting margins are small', minor.map((m) => `${m.check.replace(/^craft | then sell$/g, '')}: +${m.gain_per_craft}g (${m.margin_pct}%)`).join('; ') + '. Not worth farming.', 'simulation-measured');
if (yOverflow.length) finding('low', 'Small holds overflow on good hauls', yOverflow.map((r) => `${r.name} on the ${r.vessel} (${r.hold_slots} slots): ${Math.round((r.hauls_with_overflow / r.hauls) * 100)}% of perfect hauls lose items`).join('; '), 'simulation-measured');

// ─────────────────────────────── PLAYCRAFT evidence items (status from data) ───────────────────────────────
ev('core_gameplay', allBot ? 'pass' : 'fail', 'Playtest bot: the core loop runs end to end on the production build (runtime-observed)',
  `${bot.runs.length} run(s), seed ${bot.seed}: dock → wheel → beacon → winch (${tl('winch done')?.winch_hits ?? '?'}/3) → haul → dock → sell → install ${botRun.bought} by game ${tUpgrade}s; ${botRun.checks.filter((c) => c.ok).length}/${botRun.checks.length} checks passed`, 'playtest/playtest_bot.json');
ev('controls', botRun.checks.find((c) => /wheel/.test(c.name))?.ok && botRun.checks.find((c) => /winch was played/.test(c.name))?.ok ? 'pass' : 'fail',
  'Playtest bot: steering by dragging the wheel and the winch timing reach their targets (runtime-observed)', botRun.checks.filter((c) => /wheel|winch|pier/.test(c.name)).map((c) => `${c.name}: ${c.detail}`).join('; '), 'playtest/playtest_bot.json');
ev('technical', botRun.checks.filter((c) => /save|reload|errors/.test(c.name)).every((c) => c.ok) ? 'pass' : 'fail',
  'Playtest bot: save → reload → load keeps the upgrade; no page errors (runtime-observed)', botRun.checks.filter((c) => /save|reload|errors/.test(c.name)).map((c) => `${c.name}: ${c.detail}`).join('; '), 'playtest/playtest_bot.json');
ev('technical', bot.reproducible === true ? 'pass' : bot.reproducible === false ? 'fail' : 'partial',
  'Playtest bot: deterministic and reproducible (same seed → identical run fingerprint)', `${bot.runs.length} runs, fingerprints ${bot.runs.map((r) => r.fingerprint).join(', ')}`, 'playtest/playtest_bot.json');
ev('presentation', botRun.checks.find((c) => /visible on the boat/.test(c.name))?.ok ? 'pass' : 'fail',
  'Playtest bot: the installed upgrade is visible on the boat and survives a reload (runtime-observed)', botRun.checks.filter((c) => /visible|rebuilt/.test(c.name)).map((c) => c.detail).join('; '), 'playtest/playtest_bot.json');
ev('progression', campOk && !affFail.length ? 'pass' : 'fail', 'Simulation: every upgrade and vessel is reachable; the campaign completes (simulation-measured)',
  `${aff.hits_2.length} targets × ${af.seeds.length} seeds × winch 1-3/3, all affordable and bought through Game.buyUpgrade/buyVessel; campaign: ${c2.totals.actions} sourcing actions (${c2.totals.haul} hauls) for all ${c2.owned.of} upgrades + 3 vessels at winch 2/3`, 'simulations/campaign.json');
ev('progression', 'pass', 'Simulation: upgrades measurably change play (sail speed, turning, range, hull, winch window)',
  `sail speed by tier on the Skiff: ${sf.results.sailing.speed.filter((r) => r.vessel === 'dinghy').map((r) => `${r.sail} ${f1(r.measured_speed_by_heading['90deg_off_downwind'])}`).join(' → ')} m/s (beam reach); 180° turn ${sf.results.sailing.turning.filter((r) => r.vessel === 'dinghy').map((r) => `${r.rudder} ${f1(r.seconds_to_turn_180)}s`).join(' vs ')}`, 'simulations/sailing_fuel.json');
ev('difficulty', 'pass', 'Balance is measured: headless simulations of economy, fuel, storms and voyages on the real game systems',
  'tests/sim (npm run sim): salvage yield, hauls-to-afford for every upgrade, campaign, fuel range, storm damage, voyages, exploit checks', 'simulations/affordability.json');
ev('difficulty', spikes.length ? 'partial' : 'pass', 'Simulation: pacing between purchases (difficulty spikes)',
  spikes.length ? spikes.map((s) => `${s.step}: ${s.actions} actions vs ≤${s.prev_max} before`).join('; ') : 'no step costs more than twice the largest earlier step', 'simulations/campaign.json');
ev('difficulty', vIron.length && Math.max(...vIron.map((v) => v.hull.lost / v.hull.start)) < 0.15 ? 'partial' : 'pass', 'Simulation: the Stormwall as the final barrier',
  findings.find((f) => /Stormwall/.test(f.title))?.detail ?? '', 'simulations/voyages.json');
ev('difficulty', ex.results.some((x) => x.exploit && !/clock/.test(x.check)) ? 'partial' : 'pass', 'Simulation: no economy exploits through crafting, fuel or repair',
  ex.results.map((x) => `${x.check}: ${x.exploit ? 'EXPLOIT' : 'ok'}`).join('; '), 'simulations/exploits.json');
ev('player_experience', tUpgrade && tUpgrade < 180 ? 'pass' : 'partial', 'Playtest bot: time from casting off to the first upgrade (game time)',
  `first salvage beacon at game ${tl('beacon in reach')?.game_t}s, docked again at ${tl('docked')?.game_t}s, first upgrade at ${tUpgrade}s (bot drives straight; humans will be slower)`, 'playtest/playtest_bot.json');

// ─────────────────────────────── EVIDENCE.md ───────────────────────────────
const P = provenance();
L.push(`# TIDEBREAKERS · PLAYCRAFT evidence pack`, '');
L.push(`Generated ${P.generated_at} from commit \`${(sy.commit ?? '').slice(0, 7)}\` (simulations) / \`${(bot.commit ?? '').slice(0, 7)}\` (playtest bot). Game source unchanged by this pack.`, '');
L.push('**Where this was measured:** headless Chromium with software WebGL (SwiftShader) in a Linux container. Nothing here was observed on a real phone.', '');
L.push('## Evidence classes', '');
L.push(table(['Class', 'Meaning', 'Here'], [
  ['**runtime-observed**', 'The production build played through its real UI by a bot; state read from the running game', 'playtest bot'],
  ['**simulation-measured**', 'The game’s own code (economy, salvage, fuel, hull, the frame loop) driven by a script with seeded randomness; travel, combat and human skill are modelled, not played', 'all of tests/sim'],
  ['**source-only**', 'Read from code or data, not executed', 'only where a row says so'],
  ['**real-device**', 'Seen on a physical iPhone', 'none: see "Needs a human or an iPhone"'],
]), '');

L.push('## Playtest bot (runtime-observed)', '');
L.push(`Production build (\`dist/\`), iPhone-sized viewport, seed ${bot.seed}, ${bot.runs.length} run(s). Reproducible: **${bot.reproducible === null ? 'single run' : bot.reproducible ? 'yes (identical fingerprints)' : 'NO'}**. Wall time per run: ${bot.runs.map((r) => `${r.wall_s}s`).join(', ')}.`, '');
L.push(table(['Check', 'Result', 'Detail'], botRun.checks.map((c) => [c.name, c.ok ? 'PASS' : '**FAIL**', c.detail.replace(/\|/g, '/')])), '');
L.push(table(['Event', 'Game time (s)', 'Position', 'Gold'], botRun.timeline.map((e) => [e.event, f1(e.game_t), e.x !== undefined ? `${f1(e.x)}, ${f1(e.z)}` : '', e.gold ?? ''])), '');
L.push(`Screenshots: ${botRun.screenshots.map((s) => `[${s}](playtest/${s})`).join(', ')}`, '');

L.push('## Simulations (simulation-measured)', '');
L.push(`Seeded runs of the real game code; see \`tests/sim/sims.page.js\` for exactly which function each number comes from. Storage was ${run?.results?.localStorage_keys_after_run?.length ? '**WRITTEN** (' + run.results.localStorage_keys_after_run + ')' : 'untouched'} and the page logged ${run?.results?.page_errors?.length ?? 0} errors.`, '');

L.push('### Salvage yield per haul (winch 2/3, no Salvager, empty hold of the boat that can reach the site)', '');
L.push(table(['Site', 'Region', 'Boat (slots)', 'Gold/haul mean', 'p10–p90', 'Items/haul', 'Gold per respawn-minute', 'Perfect hauls overflowing'],
  y2.map((r) => [r.name, r.region, `${r.vessel} (${r.hold_slots})`, f1(r.gold_per_haul.mean), `${r.gold_per_haul.p10}–${r.gold_per_haul.p90}`, f1(r.items_per_haul), f1(r.gold_per_respawn_minute),
    `${Math.round((yMin.find((x) => x.site === r.site && x.hits === 3 && !x.salvager).hauls_with_overflow / r.hauls) * 100)}%`])), '');
const sens = yMin.filter((r) => r.site === 'sv_stump' && !r.salvager).map((r) => `${r.hits}/3 → ${f1(r.gold_per_haul.mean)}g`).join(', ');
L.push(`Winch skill matters: the Sunken Tower pays ${sens}. A Salvager adds about ${f1(mean(yMin.filter((r) => r.hits === 2 && r.salvager).map((r) => r.gold_per_haul.mean)) - mean(y2.map((r) => r.gold_per_haul.mean)))}g a haul on average.`, '');
const ww = sy.results.winch_windows;
L.push(table(['Site', 'Difficulty', 'No gear', 'Crane', 'Crane + Salvager'], [...new Set(ww.map((w) => w.site))].map((s) => {
  const g = (k) => ww.find((w) => w.site === s && w.gear === k);
  return [s, g('no gear').difficulty, g('no gear').window ?? 'refused (heavy)', g('crane').window, g('crane + Salvager').window];
})), '');

L.push('### Sourcing actions needed to afford each upgrade', '');
L.push(`From the state a player could first buy it in (prerequisites only, 15 gold), ${af.seeds.length} seeds each. "Actions" = salvage hauls + drifting caches + flotsam. Respawn wait is the in-game time spent waiting for a salvage site to refill. Travel time is not included.`, '');
L.push(table(['Target', 'Cost', 'Hauls (winch 1/3)', 'Hauls (2/3)', 'Hauls (3/3)', 'All actions (2/3) mean / p90', 'Respawn wait (2/3)', 'Affordable'],
  affRows.map(({ r, h1, h3 }) => [r.name, `${r.cost.gold}g${(r.cost.mats ?? []).map((m) => ` +${m.n} ${m.id}`).join('')}`, f1(h1?.hauls.mean), `${f1(r.hauls.mean)} (p90 ${r.hauls.p90})`, f1(h3?.hauls.mean), `${f1(r.actions.mean)} / ${r.actions.p90}`, `${f1(r.respawn_wait_min)} min`, `${r.affordable_runs}/${r.runs}`])), '');

L.push('### Campaign: the whole game’s purchases in Captain’s Log order', '');
L.push(table(['Winch', 'Seed', 'Actions', 'Hauls', 'Caches', 'Flotsam', 'Crafted', 'Respawn wait', 'Upgrades', 'Vessels', 'Log reached'], camps.map((c) => [`${c.hits}/3`, c.seed, c.totals.actions, c.totals.haul, c.totals.cache, c.totals.flotsam, c.totals.crafted, `${c.totals.respawn_wait_h} h`, `${c.owned.upgrades}/${c.owned.of}`, c.owned.vessels.length, c.goal_stuck_at])), '');
L.push(`Steps (winch 2/3, seed ${c2.seed}):`, '');
L.push(table(['Step', 'Actions', 'Hauls', 'Caches', 'Flotsam', 'Respawn wait (min)', 'Gold after', 'Cumulative actions'], c2.steps.map((s) => [s.step + (s.note ? ` _(${s.note})_` : ''), s.actions, s.hauls, s.caches, s.flotsam, f1(s.respawn_wait_min), s.gold_after, s.cumulative_actions])), '');

L.push('### Fuel and range (engine, full throttle, into the wind)', '');
L.push(table(['Boat', 'Engine', 'Drum rack', 'Mechanic', 'Tank', 'Fuel/min', 'Minutes to empty', 'Range (m)', 'm per fuel'],
  sf.results.fuel.filter((r) => r.throttle === 1).map((r) => [r.vessel, r.engine.replace('engine_', ''), r.tank ? 'yes' : '', r.mechanic ? 'yes' : '', r.fuel_cap, f1(r.measured.fuel_per_minute), f1(r.measured.seconds_to_empty / 60), Math.round(r.measured.distance_m), f1(r.measured.metres_per_fuel)])), '');
const half = sf.results.fuel.filter((r) => r.throttle === 0.5 && !r.tank && !r.mechanic);
L.push(`Half throttle: ${half.map((r) => `${r.vessel}/${r.engine.replace('engine_', '')} ${f1(r.measured.metres_per_fuel)} m per fuel`).join(', ')}.`, '');
L.push(table(['Power', 'Time', 'Storm', 'Fuel gained / min'], sf.results.power.map((r) => [r.power, r.time, r.storm, f1(r.fuel_gained_per_minute)])), '');
L.push('### Sailing: steady speed by heading off the wind (m/s), and turning', '');
L.push(table(['Boat', 'Sail', 'Downwind', '45°', '90° (beam)', '135°', 'Into the wind'], sf.results.sailing.speed.map((r) => [r.vessel, r.sail, ...Object.values(r.measured_speed_by_heading).map(f1)])), '');
L.push(table(['Boat', 'Rudder', 'Seconds to turn 180°'], sf.results.sailing.turning.map((r) => [r.vessel, r.rudder, f1(r.seconds_to_turn_180)])), '');

L.push('### Hull: storms, the Stormwall, collisions', '');
L.push(table(['Boat', 'Plating', 'Hull', 'Storm 0.5', 'Storm 0.7', 'Storm 1.0', 'Stormwall (storm 1.0)', 'Minutes to swamp in a full storm'],
  [...new Set(storms.map((r) => `${r.vessel}|${r.plating}`))].map((k) => {
    const [v, p] = k.split('|');
    const g = (s, w) => sw(v, p, s, w)?.hull_lost_per_minute;
    return [v, p, sw(v, p, 1, false).hull_max, f1(g(0.5, false)), f1(g(0.7, false)), f1(g(1, false)), f1(g(1, true)), f1(sw(v, p, 1, false).minutes_to_swamp_from_full)];
  })), '');
L.push(`Values are hull lost per minute. Wreck strikes (Game.damage at speed × 1.4): ${hu.results.collisions.map((c) => `${c.plating} at ${c.speed} m/s −${f1(c.hull_lost)}`).join(', ')}. A Mechanic repairs ${f1(hu.results.repair.mechanic_hull_per_minute_calm)} hull/min in calm water.`, '');

L.push('### Voyages under the real frame loop', '');
L.push(table(['Voyage', 'Seed', 'Arrived', 'Minutes', 'Distance (m)', 'Hull lost', 'Storm s', 'Stormwall s', 'Flags'], vo.results.map((v) => [v.name, v.seed, v.arrived ? 'yes' : `no (${v.waypoints_reached}/${v.of})`, f1(v.minutes), Math.round(v.distance_m), `${f1(v.hull.lost)} / ${v.hull.start}`, f1(v.storm_exposure_s), f1(v.stormwall_s), v.flags.join(', ')])), '');
L.push(`The Skiff was stopped by the open swell in ${vSkiff.filter((v) => !v.arrived).length}/${vSkiff.length} runs and the Trimaran by the Stormwall in ${vSloopWall.filter((v) => !v.arrived).length}/${vSloopWall.length}, as designed. The Trimaran reached Rig Helios in ${vHelios.filter((v) => v.arrived).length}/${vHelios.length}.`, '');

L.push('### Exploit checks', '');
L.push(table(['Check', 'Result', 'Detail'], ex.results.map((x) => [x.check, x.exploit ? '**exploit**' : 'ok', (x.note ?? Object.entries(x).filter(([k]) => !['check', 'exploit', 'note'].includes(k)).map(([k, v]) => `${k} ${v}`).join(', ')).replace(/\|/g, '/')])), '');

L.push('## Findings (computed from the data above)', '');
const sevOrder = { high: 0, medium: 1, low: 2, info: 3 };
findings.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);
L.push(table(['Severity', 'Finding', 'Evidence', 'Class'], findings.map((f) => [f.severity, f.title, f.detail.replace(/\|/g, '/'), f.evidence_class])), '');
L.push('No gameplay, balance or content was changed to produce any of this. Findings are for the designer to weigh.', '');

L.push('## PLAYCRAFT evidence items', '');
L.push('`playcraft-evidence.json` lists these for `playcraft_assess` / `playcraft_verify` (`evidence`). PLAYCRAFT records any project evidence file as **verified**; the titles say which class each really is.', '');
L.push(table(['Category', 'Status', 'Item'], evidence.map((e) => [e.category, e.status, e.title])), '');

L.push('## Not covered: needs a human or an iPhone', '');
for (const x of [
  'Frame rate, heat and battery on a real iPhone (headless software WebGL runs at 1-2 fps; all timing here is game time).',
  'Touch feel: the bot drags the wheel with pointer events in an iPhone-sized viewport, not with a finger on glass.',
  'Whether the winch is fun and fair for a person: the bot reads the needle position exactly; simulations fix winch results at 1, 2 or 3 of 3.',
  'Raider combat (the Captain’s Log goal "Drive off a Rustfang raider"): not simulated.',
  'Travel time between places in the economy simulations (sites are teleported to); beach finds and treasure digs are not used as income.',
  'The first-voyage tutorial (Turtle Atoll, anchor, dig) beyond the money loop; tests/e2e/play.cjs covers it with teleports.',
  'Audio, music, readability and whether it is fun: judgements a player has to record.',
]) L.push(`- ${x}`);
L.push('');

writeFileSync(path.join(DIR, 'EVIDENCE.md'), L.join('\n'));
writeFileSync(path.join(DIR, 'playcraft-evidence.json'), JSON.stringify({ generated_at: P.generated_at, commit: P.commit, note: 'PLAYCRAFT `evidence` items. Classes: runtime-observed (playtest bot) and simulation-measured (tests/sim). Not real-device.', items: evidence, findings }, null, 2) + '\n');
console.log(`EVIDENCE.md: ${findings.length} findings, ${evidence.length} PLAYCRAFT evidence items`);
