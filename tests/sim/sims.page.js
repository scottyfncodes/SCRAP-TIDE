// Runs INSIDE the game page (vite dev server), against the live game object window.__game and the game's own data
// and state modules (same module instances the game uses). Every measurement goes through the game's real code:
//   Salvage.finish (loot rolls + hold room), Salvage.openCache, Game.updateCaches (flotsam), Game.sell,
//   Game.buyUpgrade / buyVessel, Game.craft, Store.canAfford / stats, Game.damage, Game.updateHull, Game.updateGoals,
//   Game.rescue, Game.dockAt, and the whole frame loop (Game.update) for sailing, fuel, storms and voyages.
// The only things replaced are presentation calls (cards/toasts/panels) so thousands of hauls don't stack DOM.
import { freshSave } from '/src/state/store.ts';
import { UPGRADES, UPGRADE_MAP, VESSELS } from '/src/data/ship.ts';
import { SALVAGE_SITES, SALVAGE_MAP, CACHE_POOL, SETTLEMENT_MAP, WORLD, CASTAWAYS } from '/src/data/world.ts';
import { ITEMS, item } from '/src/data/items.ts';
import { RECIPES } from '/src/data/crafting.ts';
import { GOALS } from '/src/data/progress.ts';
import { heightAt, swellFactor, isReef } from '/src/world/terrain.ts';

const G = window.__game;
const S = G.store;
const sim = window.__sim;

// ── presentation-only stubs ─────────────────────────────────────────────────────────────────────────────────
const UI_STUBS = ['toast', 'revealChest', 'revealInfo', 'revealItem', 'banner', 'openPanel', 'hit'];
const captured = { reveals: [] };
for (const k of UI_STUBS) if (typeof G.ui[k] === 'function') G.ui[k] = (...a) => (k === 'revealChest' ? captured.reveals.push(a[2]) : undefined);
G.haptic = () => {};

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────────────────
const clone = (o) => JSON.parse(JSON.stringify(o));
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const pct = (a, p) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};
const r2 = (v) => (v === null || v === undefined || Number.isNaN(v) ? v : Math.round(v * 100) / 100);
const REGION_VESSEL = { shallows: 'dinghy', emerald: 'sloop', stormwall: 'ironwake' };
const VESSEL_RANK = { dinghy: 0, sloop: 1, ironwake: 2 };
const value = (id) => item(id).value;

/** The upgrade's `requires` chain, prerequisites first. */
function chain(id) {
  const out = [];
  for (let u = UPGRADE_MAP[id]; u; u = u.requires ? UPGRADE_MAP[u.requires] : null) out.unshift(u.id);
  return out;
}
/** Cheapest vessel that can reach a shop that sells the upgrade (Rig Helios is past the swell). */
function vesselToBuy(u) {
  const shops = u.where ?? ['driftholm'];
  return shops.some((s) => s !== 'helios') ? 'dinghy' : 'sloop';
}

/** A save in a given configuration, built from the game's own freshSave(). Never written to storage (preview). */
function setState({ vessel = 'dinghy', upgrades = [], crew = [], gold = 0, goal = GOALS.length - 1, quest = 'free' } = {}) {
  const d = freshSave();
  d.vessel = vessel;
  d.vesselsOwned = [...new Set(['dinghy', vessel])];
  d.upgrades = [...upgrades];
  d.crew = [...crew];
  d.gold = gold;
  d.goal = goal;
  d.quest = quest;
  d.timeOfDay = 0.5;
  S.data = d;
  d.hull = S.stats.hullMax;
  d.fuel = S.stats.fuelCap;
  Object.assign(G.boat, { docked: true, dockedAt: 'driftholm', anchored: false, busy: false, speed: 0 });
  G.engineOn = false;
  G.mode = 'sail';
  return d;
}

function inventory() {
  const m = {};
  for (const s of [...S.data.vault, ...S.data.cargo]) m[s.id] = (m[s.id] ?? 0) + s.n;
  return m;
}
function diff(a, b) {
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const d = (b[k] ?? 0) - (a[k] ?? 0);
    if (d) out[k] = d;
  }
  return out;
}

// ── 1. salvage yield per site (real Salvage.finish) ────────────────────────────────────────────────────────
export function salvageYield({ n = 150, hold = 'minimal', only = null } = {}) {
  const rows = [];
  for (const site of SALVAGE_SITES) {
    if (only && !only.includes(site.id)) continue;
    const vessel = hold === 'large' ? 'ironwake' : REGION_VESSEL[site.region];
    const upgrades = [...(site.heavy ? ['salvage_crane'] : []), ...(hold === 'large' ? ['cargo_crate', 'cargo_net'] : [])];
    for (const salvager of [false, true]) {
      // first haul (guaranteed finds) once
      setState({ vessel, upgrades, crew: salvager ? ['bram'] : [] });
      const b0 = inventory();
      G.salvage.finish(site, 2);
      const first = diff(b0, inventory());
      for (const hits of [0, 1, 2, 3]) {
        const gold = [], counts = {}, items = [];
        let overflowHauls = 0;
        for (let i = 0; i < n; i++) {
          // each haul queues delayed effects (cheers, voice lines) on the virtual clock: let them fire now and then
          if (i % 50 === 49) sim.advance(10000);
          const d = setState({ vessel, upgrades, crew: salvager ? ['bram'] : [] });
          d.firstHauls = [site.id];
          const before = inventory();
          captured.reveals.length = 0;
          G.salvage.finish(site, hits);
          const got = diff(before, inventory());
          if (captured.reveals.some((t) => /didn’t fit/.test(t ?? ''))) overflowHauls++;
          let g = 0;
          for (const [id, k] of Object.entries(got)) {
            g += value(id) * k;
            counts[id] = (counts[id] ?? 0) + k;
          }
          gold.push(g);
          items.push(Object.values(got).reduce((a, b) => a + b, 0));
        }
        rows.push({
          site: site.id, name: site.name, region: site.region, heavy: !!site.heavy, difficulty: site.difficulty, respawn_s: site.respawn,
          vessel, hold_slots: S.stats.cargo, salvager, hits, hauls: n,
          gold_per_haul: { mean: r2(mean(gold)), p10: pct(gold, 10), p50: pct(gold, 50), p90: pct(gold, 90) },
          items_per_haul: r2(mean(items)),
          per_haul_mean: Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, r2(v / n)])),
          hauls_with_overflow: overflowHauls,
          gold_per_respawn_minute: r2(mean(gold) / (site.respawn / 60)),
          first_haul: hits === 2 ? first : undefined,
        });
      }
    }
  }
  return rows;
}

// ── winch window (real Salvage.begin, the mini-game's parameters captured, then cancelled) ─────────────────
export function winchWindows() {
  const rows = [];
  const orig = G.ui.openWinch;
  let got = null;
  G.ui.openWinch = (o) => {
    got = o;
    return Promise.resolve(-1);
  };
  try {
    for (const site of SALVAGE_SITES) {
      for (const [label, upgrades, crew] of [['no gear', [], []], ['crane', ['salvage_crane'], []], ['crane + Salvager', ['salvage_crane'], ['bram']]]) {
        setState({ vessel: REGION_VESSEL[site.region], upgrades, crew });
        Object.assign(G.boat, { docked: false, x: site.x, z: site.z, speed: 0 });
        got = null;
        G.salvage.begin();
        rows.push({ site: site.id, difficulty: site.difficulty, heavy: !!site.heavy, gear: label, window: got ? r2(got.window) : null, needle_speed: got ? r2(got.speed) : null, blocked: got ? null : 'begin() refused (heavy site without a crane)' });
        G.boat.busy = false;
      }
    }
  } finally {
    G.ui.openWinch = orig;
  }
  return rows;
}

// ── 2. economy: actions needed to afford a target, playing by the real rules ──────────────────────────────
const FLOTSAM_TABLE = { barrel_raft: ['crude_oil', 'scrap_metal', 'rope'], net_tangle: ['rope', 'plastic', 'fish'], hull_shard: ['driftwood', 'iron_nails', 'canvas'], algae_mat: ['algae_mat', 'sea_lettuce'] };
const flotsamPickedAt = new Map();

function haul(site, hits) {
  G.boat.docked = false;
  G.boat.busy = false;
  G.salvage.finish(site, hits);
}
function cache(region) {
  G.salvage.openCache(region);
}
/** Ease through a piece of flotsam: the game's own pick-over code (Game.updateCaches) does the rest. */
function flotsam(kind) {
  const now = Date.now();
  // the game re-stocks a picked piece after 240 s (setTimeout in updateCaches); mirror that on the virtual clock
  for (const f of G.drowned.flotsam) if (f.picked && now - (flotsamPickedAt.get(f) ?? -1e12) >= 240000) f.picked = false;
  const f = G.drowned.flotsam.find((x) => x.kind === kind && !x.picked && (REGION_OF(x.x, x.z) === 'shallows' || VESSEL_RANK[S.data.vessel] > 0));
  if (!f) return false;
  Object.assign(G.boat, { x: f.x, z: f.z, speed: 0, docked: false, busy: false });
  G.updateCaches(1 / 30);
  if (f.picked) flotsamPickedAt.set(f, now);
  return f.picked;
}
const REGION_OF = (x, z) => (G.atmo.wallAt(x, z) > 0.5 ? 'stormwall' : swellFactor(x, z) > 0.5 ? 'emerald' : 'shallows');

function dockAndSell(keep) {
  Object.assign(G.boat, { docked: true, dockedAt: 'driftholm', speed: 0 });
  S.unloadToVault();
  const inv = inventory();
  let sold = 0;
  for (const [id, n] of Object.entries(inv)) {
    const extra = n - (keep[id] ?? 0);
    if (extra > 0) {
      const g0 = S.data.gold;
      G.sell(id, extra);
      sold += S.data.gold - g0;
    }
  }
  return sold;
}

/** What to hold on to for this target: its materials, plus recipe inputs for materials still missing. */
function keepFor(cost) {
  const keep = {};
  const inv = inventory();
  for (const m of cost.mats ?? []) {
    keep[m.id] = (keep[m.id] ?? 0) + m.n;
    const missing = m.n - (inv[m.id] ?? 0);
    if (missing > 0) {
      const r = RECIPES.find((x) => x.makes.id === m.id);
      if (r) for (const need of r.needs) keep[need.id] = (keep[need.id] ?? 0) + need.n * Math.ceil(missing / r.makes.n);
    }
  }
  return keep;
}
function craftToward(cost) {
  let crafted = 0;
  for (let guard = 0; guard < 50; guard++) {
    const inv = inventory();
    let did = false;
    for (const m of cost.mats ?? []) {
      if ((inv[m.id] ?? 0) >= m.n) continue;
      const r = RECIPES.find((x) => x.makes.id === m.id);
      if (!r) continue;
      // don't eat a material the target itself needs
      const ok = r.needs.every((nd) => (inv[nd.id] ?? 0) - nd.n >= ((cost.mats ?? []).find((x) => x.id === nd.id)?.n ?? 0));
      if (ok && S.canAfford({ gold: 0, mats: r.needs })) {
        G.craft(r.id);
        crafted++;
        did = true;
        break;
      }
    }
    if (!did) break;
  }
  return crafted;
}

function missingMats(cost) {
  const inv = inventory();
  const out = {};
  for (const m of cost.mats ?? []) {
    const k = m.n - (inv[m.id] ?? 0);
    if (k > 0) out[m.id] = k;
  }
  return out;
}
/** Share of a loot table's weight that is any of `ids`. */
function share(loot, ids) {
  const tot = loot.reduce((a, b) => a + b.w, 0);
  return loot.filter((l) => ids.includes(l.id)).reduce((a, b) => a + b.w, 0) / tot;
}

function reachableRegions() {
  const st = S.stats;
  return ['shallows', ...(st.crossSwell ? ['emerald'] : []), ...(st.crossStorm ? ['stormwall'] : [])];
}

/** One sourcing decision, as a player who knows the loot tables would make it. Returns the action taken. */
function act(cost, hits, goldRank) {
  const miss = missingMats(cost);
  const want = Object.keys(miss);
  // recipe inputs still missing (beyond what is held and what the target itself needs) count as half
  const inv = inventory();
  const reserved = Object.fromEntries((cost.mats ?? []).map((m) => [m.id, m.n]));
  const recipeNeed = {};
  for (const id of want) {
    const r = RECIPES.find((x) => x.makes.id === id);
    if (!r) continue;
    for (const nd of r.needs) recipeNeed[nd.id] = (recipeNeed[nd.id] ?? 0) + nd.n * Math.ceil(miss[id] / r.makes.n);
  }
  const recipeIn = Object.keys(recipeNeed).filter((id) => recipeNeed[id] > (inv[id] ?? 0) - (reserved[id] ?? 0));
  const regions = reachableRegions();
  const ready = SALVAGE_SITES.filter((s) => G.salvage.usable(s));
  const cands = [];
  for (const s of ready) {
    const sc = want.length ? share(s.loot, want) * s.rolls + 0.5 * share(s.loot, recipeIn) * s.rolls : (goldRank[s.id] ?? 1);
    cands.push({ kind: 'haul', id: s.id, score: sc });
  }
  for (const r of regions) {
    const pool = CACHE_POOL[r];
    const sc = want.length ? share(pool, want) * 1.5 + 0.5 * share(pool, recipeIn) * 1.5 : -1;
    cands.push({ kind: 'cache', id: r, score: sc });
  }
  for (const [kind, ids] of Object.entries(FLOTSAM_TABLE)) {
    const sc = want.length ? ids.filter((i) => want.includes(i)).length * 0.65 + 0.3 * ids.filter((i) => recipeIn.includes(i)).length * 0.65 : -1;
    cands.push({ kind: 'flotsam', id: kind, score: sc });
  }
  cands.sort((a, b) => b.score - a.score);
  const best = cands[0];
  if (!best || best.score <= 0) {
    // nothing useful is ready: wait for the soonest salvage site to respawn (virtual clock)
    const sites = SALVAGE_SITES.filter((s) => regions.includes(s.region) && !(s.heavy && !S.stats.salvage) && s.respawn);
    const wait = Math.min(...sites.map((s) => G.salvage.cooldown(s)));
    if (!Number.isFinite(wait)) return { kind: 'stuck' };
    sim.advance((wait + 1) * 1000);
    return { kind: 'wait', s: wait + 1 };
  }
  if (best.kind === 'haul') haul(SALVAGE_MAP[best.id], hits);
  else if (best.kind === 'cache') cache(best.id);
  else if (!flotsam(best.id)) {
    sim.advance(30000);
    return { kind: 'wait', s: 30 };
  }
  return best;
}

/** Keep sourcing (and selling surplus) until `cost` is affordable. */
function grind(cost, { hits = 2, goldRank = {}, maxActions = 900 } = {}) {
  const tally = { haul: 0, cache: 0, flotsam: 0, crafted: 0, wait_s: 0, sold_gold: 0, sites: {} };
  const t0 = Date.now();
  const MAX_WAIT_S = 7 * 24 * 3600; // a week of in-game respawn waiting is a dead end for any player
  for (let acts = 0; acts < maxActions && tally.wait_s < MAX_WAIT_S; ) {
    tally.crafted += craftToward(cost);
    tally.sold_gold += dockAndSell(keepFor(cost));
    if (S.canAfford(cost)) return { ok: true, ...tally, virtual_min: r2((Date.now() - t0) / 60000) };
    const a = act(cost, hits, goldRank);
    if (a.kind === 'stuck') return { ok: false, reason: 'no source can produce the missing materials', missing: missingMats(cost), ...tally };
    if (a.kind === 'wait') tally.wait_s += a.s;
    else {
      acts++;
      tally[a.kind]++;
      if (a.kind === 'haul') tally.sites[a.id] = (tally.sites[a.id] ?? 0) + 1;
    }
    sim.advance(a.kind === 'cache' ? 6000 : 0); // caches spawn at most every 6 s while sailing (updateCaches)
  }
  return { ok: false, reason: tally.wait_s >= MAX_WAIT_S ? 'not affordable after a week of respawn waits' : `not affordable after ${maxActions} actions`, missing: missingMats(cost), gold: S.data.gold, ...tally };
}

export function goldRankFrom(yieldRows) {
  const rank = {};
  for (const r of yieldRows) if (r.hits === 2 && !r.salvager) rank[r.site] = r.gold_per_haul.mean;
  return rank;
}

/** Per target, from the state a player could first buy it in: prerequisites owned, nothing else, 15 starting gold. */
export function affordability({ seeds = [1, 2, 3, 4, 5, 6, 7, 8], hits = 2, goldRank = {}, only = null } = {}) {
  const targets = [
    ...UPGRADES.map((u) => ({ kind: 'upgrade', id: u.id, name: u.name, cost: u.cost, vessel: vesselToBuy(u), prereq: chain(u.id).slice(0, -1) })),
    { kind: 'vessel', id: 'sloop', name: VESSELS.sloop.name, cost: VESSELS.sloop.cost, vessel: 'dinghy', prereq: [] },
    { kind: 'vessel', id: 'ironwake', name: VESSELS.ironwake.name, cost: VESSELS.ironwake.cost, vessel: 'sloop', prereq: [] },
  ];
  const rows = [];
  for (const t of targets) {
    if (only && !only.includes(t.id)) continue;
    const runs = [];
    for (const seed of seeds) {
      sim.reseed(seed * 7919 + 13);
      setState({ vessel: t.vessel, upgrades: t.prereq, gold: 15 });
      flotsamPickedAt.clear();
      for (const f of G.drowned.flotsam) f.picked = false;
      const r = grind(t.cost, { hits, goldRank });
      // and actually buy it through the game
      if (r.ok) {
        if (t.kind === 'upgrade') G.buyUpgrade(t.id);
        else G.buyVessel(t.id);
        r.bought = t.kind === 'upgrade' ? S.has(t.id) : S.data.vesselsOwned.includes(t.id);
      }
      runs.push(r);
    }
    const ok = runs.filter((r) => r.ok);
    const acts = ok.map((r) => r.haul + r.cache + r.flotsam);
    rows.push({
      target: t.id, kind: t.kind, name: t.name, cost: t.cost, start: { vessel: t.vessel, owned: t.prereq, gold: 15 }, hits,
      runs: runs.length, affordable_runs: ok.length, bought_through_game: ok.filter((r) => r.bought).length,
      hauls: { mean: r2(mean(ok.map((r) => r.haul))), p90: pct(ok.map((r) => r.haul), 90), max: Math.max(0, ...ok.map((r) => r.haul)) },
      caches: r2(mean(ok.map((r) => r.cache))), flotsam: r2(mean(ok.map((r) => r.flotsam))), crafted: r2(mean(ok.map((r) => r.crafted))),
      actions: { mean: r2(mean(acts)), p90: pct(acts, 90) },
      respawn_wait_min: r2(mean(ok.map((r) => r.wait_s)) / 60),
      failures: runs.filter((r) => !r.ok).map((r) => ({ reason: r.reason, missing: r.missing, hauls: r.haul, caches: r.cache, flotsam: r.flotsam, crafted: r.crafted, wait_min: r2(r.wait_s / 60), sites: r.sites })),
    });
  }
  return rows;
}

// ── 3. the campaign: the Captain's Log in order, then everything else ─────────────────────────────────────
export function campaign({ seed = 1, hits = 2, goldRank = {} } = {}) {
  sim.reseed(seed * 104729 + 7);
  setState({ vessel: 'dinghy', gold: 15, goal: 0, quest: 'free' });
  for (const f of G.drowned.flotsam) f.picked = false;
  flotsamPickedAt.clear();
  const steps = [];
  let total = { haul: 0, cache: 0, flotsam: 0, wait_s: 0, crafted: 0 };
  const goalsDone = () => GOALS.slice(0, S.data.goal).map((g) => g.id);
  const tickGoals = () => {
    for (let i = 0; i < GOALS.length; i++) {
      const before = S.data.goal;
      G.goalTimer = 0;
      G.updateGoals(1);
      if (S.data.goal === before) break;
    }
  };
  const record = (label, r, extra = {}) => {
    tickGoals();
    const acts = r ? r.haul + r.cache + r.flotsam : 0;
    if (r) for (const k of Object.keys(total)) total[k] += r[k] ?? 0;
    steps.push({ step: label, ok: r ? r.ok : true, actions: acts, hauls: r?.haul ?? 0, caches: r?.cache ?? 0, flotsam: r?.flotsam ?? 0, crafted: r?.crafted ?? 0,
      respawn_wait_min: r2((r?.wait_s ?? 0) / 60), cumulative_actions: total.haul + total.cache + total.flotsam, gold_after: S.data.gold,
      gold_earned_total: S.data.stats.goldEarned, captains_log: GOALS[S.data.goal]?.id, failure: r && !r.ok ? { reason: r.reason, missing: r.missing } : undefined, ...extra });
  };
  const buy = (id) => {
    const u = UPGRADE_MAP[id];
    if (S.has(id)) return;
    const r = grind(u.cost, { hits, goldRank });
    if (r.ok) G.buyUpgrade(id);
    record(`buy ${u.name}`, r, { bought: S.has(id) });
  };
  const vessel = (id) => {
    const r = grind(VESSELS[id].cost, { hits, goldRank });
    if (r.ok) G.buyVessel(id);
    record(`commission ${VESSELS[id].name}`, r, { bought: S.data.vesselsOwned.includes(id) });
  };
  // first voyage ends with the Canvas Mainsail
  buy('sail_canvas');
  // g_salvage: the Sunken Tower
  haul(SALVAGE_MAP.sv_stump, hits);
  dockAndSell({});
  total.haul++;
  record('salvage the Sunken Tower', null);
  buy('engine_outboard');
  // g_crew: Kai on the raft (Game.rescue)
  const kai = CASTAWAYS.find((c) => c.crew === 'kai');
  Object.assign(G.boat, { docked: false, speed: 0, x: kai.x, z: kai.z });
  G.rescue(kai.id);
  record('rescue Kai (castaway)', null, { crew: [...S.data.crew] });
  for (const id of ['cargo_crate', 'hull_copper', 'rudder_ash', 'salvage_crane']) buy(id);
  vessel('sloop');
  // g_helios: dock at Rig Helios (Game.dockAt)
  Object.assign(G.boat, { x: SETTLEMENT_MAP.helios.x, z: SETTLEMENT_MAP.helios.z, speed: 0, docked: false });
  G.dockAt('helios');
  record('dock at Rig Helios', null);
  // g_meridian: first haul at Old Meridian
  haul(SALVAGE_MAP.sv_meridian_a, hits);
  dockAndSell({});
  total.haul++;
  record('salvage Old Meridian', null);
  for (const id of ['harpoon_turret', 'hull_armor', 'engine_twin', 'compass_brass', 'radar_mast']) buy(id);
  record('drive off a Rustfang raider', null, { note: 'NOT SIMULATED: raider combat is real-time; the Captain’s Log waits here. Purchases are not gated by it.' });
  vessel('ironwake');
  // everything else still for sale
  for (const u of UPGRADES) if (!S.has(u.id)) buy(u.id);
  return {
    seed, hits, steps,
    totals: { ...total, actions: total.haul + total.cache + total.flotsam, respawn_wait_h: r2(total.wait_s / 3600) },
    owned: { vessels: [...S.data.vesselsOwned], upgrades: S.data.upgrades.length, of: UPGRADES.length },
    goals_completed: goalsDone(),
    goal_stuck_at: GOALS[S.data.goal]?.id,
    milestones: [...S.data.milestones],
    gold_earned: S.data.stats.goldEarned,
  };
}

// ── 4. exploits: real round trips through the game's own buy/sell/craft/repair ───────────────────────────
export function exploits() {
  const out = [];
  // crafting arbitrage: craft (Game.craft) then sell (Game.sell); compare with selling the inputs
  for (const r of RECIPES) {
    setState({ gold: 0 });
    for (const n of r.needs) S.addTo(S.data.vault, n.id, n.n);
    const g0 = S.data.gold;
    const inputValue = r.needs.reduce((a, n) => a + value(n.id) * n.n, 0);
    G.boat.docked = true;
    G.craft(r.id);
    G.sell(r.makes.id, r.makes.n);
    const outValue = S.data.gold - g0;
    const margin = inputValue ? (outValue - inputValue) / inputValue : 0;
    out.push({ check: `craft ${r.name} then sell`, input_value: inputValue, output_value: outValue, gain_per_craft: outValue - inputValue, margin_pct: Math.round(margin * 100),
      exploit: margin > 0.25, note: margin > 0 ? (margin > 0.25 ? 'crafting and selling makes money from nothing but salvage time' : 'small positive margin (a few gold); not worth farming') : undefined });
  }
  // fuel: buy fuel (Game.buyFuel) vs the value of a fuel can (20 fuel)
  for (const sid of ['driftholm', 'hollow', 'helios']) {
    setState({ upgrades: ['engine_outboard'], gold: 500 });
    S.data.fuel = 0;
    G.dockedSettlement = () => SETTLEMENT_MAP[sid];
    const g0 = S.data.gold;
    G.buyFuel();
    const spent = g0 - S.data.gold;
    const per = spent / S.data.fuel;
    out.push({ check: `buy fuel at ${sid}`, gold_per_fuel: r2(per), fuel_can_sell_value_per_fuel: r2(value('fuel_can') / 20), exploit: value('fuel_can') / 20 > per,
      note: 'cans cannot be bought back from fuel, so this is only an exploit if fuel can be turned into cans (it cannot)' });
  }
  delete G.dockedSettlement;
  // repair (Game.repair) for gold vs a patch kit's material value
  setState({ gold: 1000 });
  S.data.hull = S.stats.hullMax - 35;
  let g0 = S.data.gold;
  G.repair(false);
  const repairGold = g0 - S.data.gold;
  const kitValue = value('driftwood') * 2 + value('plastic') * 2;
  out.push({ check: 'repair 35 hull at a dock vs a patch kit', dock_repair_gold: repairGold, patch_kit_material_value: kitValue, note: 'a kit also works at sea' });
  // salvage respawn uses the device clock (Date.now): moving the clock forward refreshes every site
  setState({});
  S.data.salvaged.sv_stump = Date.now();
  const before = G.salvage.ready(SALVAGE_MAP.sv_stump);
  sim.advance(SALVAGE_MAP.sv_stump.respawn * 1000 + 1000);
  const after = G.salvage.ready(SALVAGE_MAP.sv_stump);
  out.push({ check: 'salvage respawn follows the device clock', ready_right_after_haul: before, ready_after_clock_jump: after, exploit: !before && after,
    note: 'Salvage.ready compares Date.now() with the saved haul time, so changing the phone’s clock skips respawn timers. Severity is a design call (single-player).' });
  // full hold check: Salvage.begin refuses when nothing would fit
  return out;
}

// ── 5. sailing, fuel and range: the real frame loop (Game.update) ──────────────────────────────────────────
/** A stretch of open water at least `len` m long along heading `h` (no land, reef, swell, wreck or pier). */
function clearLane(h, len = 240) {
  const cs = G.drowned.colliders;
  for (let r = 60; r < 330; r += 15) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
      const x0 = WORLD.shallowsCenter.x + Math.sin(a) * r, z0 = WORLD.shallowsCenter.z + Math.cos(a) * r;
      {
        let ok = true;
        for (let s = -30; s <= len + 30 && ok; s += 4) {
          const x = x0 + Math.sin(h) * s, z = z0 + Math.cos(h) * s;
          if (heightAt(x, z) > -3 || swellFactor(x, z) > 0.3 || isReef(x, z) || G.atmo.wallAt(x, z) > 0.2) ok = false;
          else if (cs.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 8)) ok = false;
          else if (G.env.boatRects.some((q) => x > q.x0 - 6 && x < q.x1 + 6 && z > q.z0 - 6 && z < q.z1 + 6)) ok = false;
        }
        if (ok) return { x: x0, z: z0, h, len };
      }
    }
  }
  throw new Error(`no clear lane found for heading ${h}`);
}
const LANES = new Map();
let LANE = null;

/** Hold the wheel toward a world heading (camera-relative, exactly as the game reads the wheel). */
function holdHeading(h, mag = 1) {
  const c = G.camYaw;
  G.ui.joy.x = -Math.sin(h - c) * mag;
  G.ui.joy.y = Math.cos(h - c) * mag;
  G.ui.joy.active = true;
}

function sailRun({ seconds, heading, throttle = 1, engine = false, storm = 0, timeOfDay = 0.5, stopWhenEmpty = false, measureFrom = 0 }) {
  const key = Math.round(((heading % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) * 100);
  if (!LANES.has(key)) LANES.set(key, clearLane(heading));
  LANE = LANES.get(key);
  Object.assign(G.boat, { x: LANE.x, z: LANE.z, heading, speed: 0, docked: false, anchored: false, busy: false });
  G.camYaw = heading;
  G.mode = 'sail';
  G.started = true;
  G.ui.panelOpen = false;
  G.engineOn = engine;
  const dt = 1 / 30;
  let dist = 0, t = 0, speeds = [], hits = 0, fuelUsedAt = null;
  const hull0 = S.data.hull;
  const frames = Math.round(seconds / dt);
  sim.render = false;
  for (let i = 0; i < frames; i++) {
    G.atmo.time = timeOfDay;
    G.atmo.storm = storm;
    G.atmo.wall = 0;
    if (engine && !G.engineOn && S.data.fuel > 0) G.engineOn = true;
    holdHeading(heading, throttle);
    const d0 = S.data.stats.distance;
    const sp0 = G.boat.speed;
    sim.step(1, dt);
    t += dt;
    if (t >= measureFrom) {
      dist += S.data.stats.distance - d0;
      speeds.push(G.boat.speed);
    }
    if (sp0 > 3 && G.boat.speed < sp0 * 0.5) hits++;
    // stay in the lane: put the boat back at the start, same heading and speed (distance is already counted)
    if (Math.hypot(G.boat.x - LANE.x, G.boat.z - LANE.z) > LANE.len - 20) Object.assign(G.boat, { x: LANE.x, z: LANE.z, heading });
    if (engine && S.data.fuel <= 0 && fuelUsedAt === null) {
      fuelUsedAt = t;
      if (stopWhenEmpty) break;
    }
  }
  G.ui.joy.x = G.ui.joy.y = 0;
  G.ui.joy.active = false;
  return { seconds: r2(t), distance_m: r2(dist), mean_speed: r2(mean(speeds)), max_speed: r2(Math.max(...speeds)), fuel_empty_at_s: fuelUsedAt === null ? null : r2(fuelUsedAt), collisions: hits, hull_lost: r2(hull0 - S.data.hull) };
}

export function fuelRange({ vessels = ['dinghy', 'sloop', 'ironwake'] } = {}) {
  const rows = [];
  const configs = [];
  for (const vessel of vessels)
    for (const engine of ['engine_outboard', 'engine_twin'])
      for (const tank of [false, true])
        for (const mechanic of [false, true]) configs.push({ vessel, engine, tank, mechanic });
  for (const c of configs) {
    const ups = c.engine === 'engine_twin' ? ['engine_outboard', 'engine_twin'] : ['engine_outboard'];
    if (c.tank) ups.push('tank_drums');
    for (const throttle of [1, 0.5]) {
      setState({ vessel: c.vessel, upgrades: ups, crew: c.mechanic ? ['juno'] : [] });
      const cap = S.stats.fuelCap, use = S.stats.fuelUse, top = S.stats.engine;
      const f0 = S.data.fuel;
      // head into the wind so the sails add as little as possible: this is the engine's range
      // full throttle: run the tank dry; half throttle: a 3-minute sample for fuel economy (range = tank × m/fuel)
      const r = sailRun({ seconds: throttle === 1 ? 1200 : 180, heading: WORLD.wind.dir + Math.PI, throttle, engine: true, stopWhenEmpty: true });
      const used = f0 - S.data.fuel;
      const mpf = r.distance_m / used;
      rows.push({ ...c, throttle, fuel_cap: cap, fuel_use_stat_per_s: r2(use), engine_top_speed_stat: top,
        measured: { seconds_to_empty: r.fuel_empty_at_s, fuel_used: r2(used), fuel_per_minute: r2((used / r.seconds) * 60), distance_m: r.distance_m, metres_per_fuel: r2(mpf), mean_speed: r.mean_speed, collisions: r.collisions },
        range_into_wind_m: r.fuel_empty_at_s !== null ? r.distance_m : r2(cap * mpf), range_is: r.fuel_empty_at_s !== null ? 'run dry' : 'tank × measured m/fuel' });
    }
  }
  return rows;
}

export function powerRegen() {
  const rows = [];
  for (const [label, ups] of [['solar array', ['solar_array']], ['solar + deck turbine', ['solar_array', 'deck_turbine']]]) {
    for (const [tod, when] of [[0.5, 'noon'], [0.95, 'night']]) {
      for (const storm of [0, 0.8]) {
        setState({ upgrades: ['engine_outboard', ...ups] });
        S.data.fuel = 0;
        const r = sailRun({ seconds: 120, heading: WORLD.wind.dir, throttle: 0, engine: false, storm, timeOfDay: tod });
        rows.push({ power: label, time: when, storm, fuel_gained_per_minute: r2(S.data.fuel / 2), stat_per_minute: S.stats.solar, night_factor: r2(G.atmo.night) });
      }
    }
  }
  return rows;
}

/** Steady sail speed by heading off the wind, per vessel and sail; plus turning. */
export function sailingImpact() {
  const rows = [];
  for (const vessel of ['dinghy', 'sloop', 'ironwake']) {
    for (const [label, ups] of [['stock', []], ['Canvas Mainsail', ['sail_canvas']], ['Cutter Rig', ['sail_canvas', 'sail_cutter']]]) {
      const byAngle = {};
      for (const off of [0, 45, 90, 135, 180]) {
        setState({ vessel, upgrades: ups });
        const r = sailRun({ seconds: 45, heading: WORLD.wind.dir + (off * Math.PI) / 180, measureFrom: 30 });
        byAngle[`${off}deg_off_downwind`] = r.mean_speed;
        if (r.collisions) byAngle[`${off}deg_collisions`] = r.collisions;
      }
      setState({ vessel, upgrades: ups });
      rows.push({ vessel, sail: label, speed_stat: r2(S.stats.speed), measured_speed_by_heading: byAngle });
    }
  }
  // turning: time to swing 180° at speed, with and without the Ash-Wood Rudder
  const turns = [];
  for (const vessel of ['dinghy', 'sloop', 'ironwake']) {
    for (const [label, ups] of [['stock rudder', []], ['Ash-Wood Rudder', ['rudder_ash']]]) {
      setState({ vessel, upgrades: ['sail_canvas', ...ups] });
      sailRun({ seconds: 20, heading: WORLD.wind.dir + Math.PI / 2 });
      const h0 = G.boat.heading, target = h0 + Math.PI;
      let t = 0;
      const dt = 1 / 30;
      while (t < 30) {
        holdHeading(target, 1);
        G.atmo.storm = 0;
        sim.step(1, dt);
        t += dt;
        const d = Math.abs(((G.boat.heading - target + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (d < 0.05) break;
        if (Math.hypot(G.boat.x - LANE.x, G.boat.z - LANE.z) > LANE.len - 20) Object.assign(G.boat, { x: LANE.x, z: LANE.z });
      }
      turns.push({ vessel, rudder: label, turn_stat: r2(S.stats.turn), seconds_to_turn_180: r2(t) });
    }
  }
  return { speed: rows, turning: turns };
}

// ── 6. hull: storms, collisions, repairs (Game.updateHull, Game.damage) ───────────────────────────────────
export function hullStorms() {
  const rows = [];
  for (const vessel of ['dinghy', 'sloop', 'ironwake']) {
    for (const [label, ups] of [['no plating', []], ['Copper-Banded Hull', ['hull_copper']], ['Riveted Armour', ['hull_copper', 'hull_armor']]]) {
      for (const storm of [0.3, 0.5, 0.7, 0.9, 1.0]) {
        for (const wall of [0, 1]) {
          setState({ vessel, upgrades: ups });
          Object.assign(G.boat, { docked: false });
          G.mode = 'sail';
          const max = S.stats.hullMax;
          const dt = 1 / 30;
          let t = 0;
          while (t < 120 && S.data.hull > 2) {
            G.atmo.storm = storm;
            G.atmo.wall = wall;
            G.updateHull(dt);
            t += dt;
          }
          const lost = max - S.data.hull;
          const perMin = (lost / t) * 60;
          rows.push({ vessel, plating: label, hull_max: max, armor: S.stats.armor, storm, in_stormwall: !!wall,
            hull_lost_per_minute: r2(perMin), minutes_to_swamp_from_full: perMin > 0 ? r2(max / perMin) : null });
        }
      }
    }
  }
  // collision with drowned steel at speed (Game.damage(speed * 1.4), as in updateSail)
  const hits = [];
  for (const [label, ups] of [['no plating', []], ['Riveted Armour', ['hull_copper', 'hull_armor']]]) {
    for (const speed of [4, 8, 12, 16]) {
      setState({ vessel: 'sloop', upgrades: ups });
      const h0 = S.data.hull;
      G.damage(speed * 1.4, null);
      hits.push({ plating: label, speed, hull_lost: r2(h0 - S.data.hull) });
    }
  }
  // a Mechanic at sea, calm weather
  setState({ crew: ['juno'] });
  Object.assign(G.boat, { docked: false });
  S.data.hull = 10;
  for (let i = 0; i < 1800; i++) {
    G.atmo.storm = 0;
    G.updateHull(1 / 30);
  }
  const repair = { mechanic_hull_per_minute_calm: r2(S.data.hull - 10) };
  return { storms: rows, collisions: hits, repair };
}

// ── 7. voyages under the real loop: steer between waypoints, storms and obstacles included ─────────────────
export function voyage({ name, vessel, upgrades = [], crew = [], from, waypoints, seconds = 900, engine = false, seed = 1 }) {
  sim.reseed(seed * 31337 + 1);
  setState({ vessel, upgrades, crew });
  Object.assign(G.boat, { x: from.x, z: from.z, heading: Math.atan2(waypoints[0].x - from.x, waypoints[0].z - from.z), speed: 0, docked: false, anchored: false, busy: false });
  G.camYaw = G.boat.heading;
  G.started = true;
  G.mode = 'sail';
  G.ui.panelOpen = false;
  G.engineOn = engine;
  const dt = 1 / 30;
  const hull0 = S.data.hull, fuel0 = S.data.fuel, d0 = S.data.stats.distance;
  let wp = 0, t = 0, stuckT = 0, detour = 0, detourDir = 1, maxStorm = 0, stormSec = 0, wallSec = 0;
  const track = [];
  sim.render = false;
  while (t < seconds && wp < waypoints.length && S.data.hull > 0) {
    const w = waypoints[wp];
    const dx = w.x - G.boat.x, dz = w.z - G.boat.z;
    if (Math.hypot(dx, dz) < (w.r ?? 25)) {
      wp++;
      continue;
    }
    let h = Math.atan2(dx, dz);
    if (detour > 0) {
      h += detourDir * 1.1;
      detour -= dt;
    }
    holdHeading(h, 1);
    if (engine && !G.engineOn && S.data.fuel > 0) G.engineOn = true;
    const sp0 = G.boat.speed;
    sim.step(1, dt);
    t += dt;
    maxStorm = Math.max(maxStorm, G.atmo.storm);
    if (G.atmo.storm > 0.4) stormSec += dt;
    if (G.atmo.wall > 0.5) wallSec += dt;
    // a player steers round what blocks them: if the boat stalls, sheer off for a few seconds
    if (G.boat.speed < 1.2 && sp0 < 1.5 && t > 5) stuckT += dt;
    else stuckT = 0;
    if (stuckT > 2) {
      detour = 4;
      detourDir = -detourDir;
      stuckT = 0;
    }
    if (Math.round(t * 30) % 300 === 0) track.push([Math.round(G.boat.x), Math.round(G.boat.z)]);
  }
  G.ui.joy.x = G.ui.joy.y = 0;
  return {
    name, vessel, upgrades, crew, seed, engine,
    arrived: wp >= waypoints.length, waypoints_reached: wp, of: waypoints.length,
    minutes: r2(t / 60), distance_m: r2(S.data.stats.distance - d0), hull: { start: hull0, end: r2(S.data.hull), lost: r2(hull0 - S.data.hull) },
    fuel_used: r2(fuel0 - S.data.fuel), storm_exposure_s: r2(stormSec), stormwall_s: r2(wallSec), max_storm: r2(maxStorm),
    flags: S.data.flags.filter((f) => /reached|docked/.test(f)), track,
  };
}

export function ready() {
  return { items: ITEMS.length, upgrades: UPGRADES.length, sites: SALVAGE_SITES.length };
}
