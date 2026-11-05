// Salvage: pull up the drowned world. Sites are data (data/world.ts SALVAGE_SITES). Hauling is a short
// winch mini-game; gear (Salvage Crane) and crew (Salvager) widen the window and add loot rolls.
import * as THREE from 'three';
import type { Game } from './game';
import { SALVAGE_SITES, CACHE_POOL, type SalvageSiteDef, type LootRoll, type RegionId } from '../data/world';
import { item } from '../data/items';
import { audio } from '../audio/audio';
import { pack } from '../audio/pack';
import { haulRolls } from './haul';

function roll(rng: () => number, list: LootRoll[]) {
  const total = list.reduce((a, b) => a + b.w, 0);
  let r = rng() * total;
  for (const e of list) {
    r -= e.w;
    if (r <= 0) return e;
  }
  return list[list.length - 1];
}

export class Salvage {
  private hookAnim = 0;

  constructor(private g: Game) {}

  siteInReach(): SalvageSiteDef | null {
    const b = this.g.boat;
    let best: SalvageSiteDef | null = null;
    let bd = Infinity;
    for (const s of SALVAGE_SITES) {
      const d = Math.hypot(s.x - b.x, s.z - b.z) - s.r - this.g.ship.beam - 10;
      if (d < 0 && d < bd) {
        bd = d;
        best = s;
      }
    }
    return best;
  }

  ready(s: SalvageSiteDef) {
    const last = this.g.store.data.salvaged[s.id];
    if (!last) return true;
    if (!s.respawn) return false;
    return Date.now() - last >= s.respawn * 1000;
  }

  /** Seconds until a site can be hauled again. */
  cooldown(s: SalvageSiteDef) {
    const last = this.g.store.data.salvaged[s.id];
    if (!last) return 0;
    return Math.max(0, Math.ceil((s.respawn * 1000 - (Date.now() - last)) / 1000));
  }

  /** Ready now, and this boat can work it (region reachable; heavy sites need the crane). */
  usable(s: SalvageSiteDef) {
    const st = this.g.store.stats;
    if (!this.ready(s)) return false;
    if (s.region === 'emerald' && !st.crossSwell) return false;
    if (s.region === 'stormwall' && !st.crossStorm) return false;
    return !(s.heavy && !st.salvage);
  }

  nearestReady(x: number, z: number) {
    let best: SalvageSiteDef | null = null;
    let bd = Infinity;
    for (const s of SALVAGE_SITES) {
      if (!this.ready(s)) continue;
      if (s.region === 'emerald' && !this.g.store.stats.crossSwell) continue;
      if (s.region === 'stormwall' && !this.g.store.stats.crossStorm) continue;
      const d = Math.hypot(s.x - x, s.z - z);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    return best;
  }

  begin() {
    const g = this.g;
    const site = this.siteInReach();
    if (!site || g.boat.busy) return;
    const st = g.store.stats;
    if (!this.ready(site)) return g.ui.toast(`Picked clean for now. Back in ${Math.ceil(this.cooldown(site) / 60)} min.`);
    if (site.heavy && !st.salvage) {
      audio.deny();
      return g.ui.toast('Too heavy to lift by hand. Fit a Salvage Crane & Winch.', { color: '#ff6b4a', life: 3 });
    }
    if (g.boat.speed > 3) return g.ui.toast('Slow down to drop the hook.');
    // a full hold would throw the whole haul overboard and still put the site on cooldown
    const firstHaul = !!site.first && !g.store.data.firstHauls.includes(site.id); // its guaranteed finds always come aboard
    if (!firstHaul && !site.loot.some((l) => g.store.room(l.id) > 0)) {
      audio.deny();
      return g.ui.toast('Hold full: nothing from here would fit. Toss something in CARGO or dock to unload, then come back.', { color: '#ff6b4a', life: 4 });
    }
    g.boat.busy = true;
    g.engineOn = false;
    audio.winch(true);
    const salvager = g.store.hasRole('salvager');
    const window = Math.max(0.12, 0.3 - site.difficulty * 0.05 + st.salvage * 0.07 + (salvager ? 0.05 : 0));
    g.ui
      .openWinch({ title: site.name, sub: site.blurb, window, speed: 0.75 + site.difficulty * 0.3, pulls: 3 })
      .then((hits) => {
        audio.winch(false);
        g.boat.busy = false;
        if (hits < 0) return; // cancelled
        this.finish(site, hits);
      });
  }

  private finish(site: SalvageSiteDef, hits: number) {
    const g = this.g;
    const s = g.store;
    const first = !s.data.firstHauls.includes(site.id);
    const salvager = s.hasRole('salvager');
    const rolls = haulRolls(site.rolls, hits, salvager);
    const got: Record<string, number> = {};
    const rng = () => Math.random();
    for (let i = 0; i < rolls; i++) {
      const r = roll(rng, site.loot);
      const n = r.n[0] + Math.floor(rng() * (r.n[1] - r.n[0] + 1));
      got[r.id] = (got[r.id] ?? 0) + n;
    }
    const loot: { id: string; n: number }[] = [];
    if (first && site.first) for (const f of site.first) {
      g.gain(f.id, f.n, site.name, { force: true, reveal: 'none' });
      loot.push(f);
    }
    let overflow = 0;
    for (const [id, n] of Object.entries(got)) {
      const fit = g.gain(id, n, site.name, { reveal: 'none' });
      if (fit) loot.push({ id, n: fit });
      overflow += n - fit;
    }
    // one card row per item, however it arrived
    const merged = new Map<string, number>();
    for (const l of loot) merged.set(l.id, (merged.get(l.id) ?? 0) + l.n);
    loot.splice(0, loot.length, ...[...merged].map(([id, n]) => ({ id, n })));
    s.data.salvaged[site.id] = Date.now();
    s.data.hauls++;
    if (first) s.data.firstHauls.push(site.id);
    s.commit();
    g.checkMilestones();
    // feedback: the haul breaks the surface
    const p = new THREE.Vector3(g.boat.x, 0.5, g.boat.z);
    g.foam.emit(p, 40, '#ffffff', 3, 5, 1.2, 8, 1);
    g.flip.burst('splash', p.clone().setY(1.2), 4.5);
    g.sparkle.emit(p.clone().setY(1.5), 40, '#ffd25e', 3, 4, 1.2, 5, 0.6);
    audio.chestOpen();
    pack.sting('salvage', 0.7);
    if (hits >= 2) g.crewCheer(1200);
    if (s.hasRole('salvager')) setTimeout(() => pack.say(first && site.first ? 'bram_story' : 'bram_salvage', first && site.first ? 1e9 : 120), 1800);
    this.hookAnim = 1;
    const grade = hits === 3 ? 'PERFECT HAUL!' : hits === 2 ? 'Good haul' : hits === 1 ? 'Scraped something up' : 'The line slipped…';
    if (loot.length) g.ui.revealChest(site.name, loot, `${grade}${overflow ? ` · ${overflow} items didn’t fit in the hold` : ''}`);
    else g.ui.toast(`${grade} Nothing worth keeping.`);
  }

  /** A floating supply cache was hooked aboard. */
  openCache(region: RegionId) {
    const g = this.g;
    const s = g.store;
    const pool = CACHE_POOL[region] ?? CACHE_POOL.shallows;
    const n = 1 + Math.floor(Math.random() * 2) + (s.hasRole('salvager') ? 1 : 0);
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      const r = roll(Math.random, pool);
      const k = r.n[0] + Math.floor(Math.random() * (r.n[1] - r.n[0] + 1));
      if (r.id === 'fuel_can' && s.data.fuel < s.stats.fuelCap - 5) {
        s.data.fuel = Math.min(s.stats.fuelCap, s.data.fuel + 20 * k);
        out.push(`+${20 * k} fuel`);
        continue;
      }
      const fit = g.gain(r.id, k, 'a drifting cache', { reveal: 'none' });
      if (fit) out.push(`+${fit} ${item(r.id).name}`);
    }
    audio.pickup();
    audio.splash();
    g.sparkle.emit(new THREE.Vector3(g.boat.x, 1.4, g.boat.z), 24, '#bff7e6', 2, 3, 1, 3, 0.5);
    g.ui.toast(`Drifting cache: ${out.join(', ') || 'empty, sadly'}`, { icon: 'fuel_can', color: '#4f9a95', life: 3 });
    s.commit();
    g.checkMilestones();
  }

  update(dt: number) {
    if (this.hookAnim > 0) {
      this.hookAnim = Math.max(0, this.hookAnim - dt * 0.7);
      const c = this.g.ship.crane;
      if (c) c.rotation.y = -Math.PI / 2 + Math.sin(this.hookAnim * Math.PI) * 0.6;
    }
  }
}
