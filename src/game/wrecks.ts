// Drifting wrecks (loop pass Phase 2): every trip the sea turns up a few capsized hulls to salvage, each with a tier.
// Common wrecks sit anywhere; Rare and Legendary ones only turn up in risky water (far from a dock, in a storm track,
// raider water, the Reach or the Stormwall), so the best loot is always a gamble. They are salvage sites like any
// other (the same winch), but once only, and they drift off when the trip ends.
// Phase 3 reuses spawnAt() for the surfacing wreck event (a wreck that sinks again after 30 s).
import * as THREE from 'three';
import type { Game } from './game';
import { model } from '../world/assets';
import { heightAt, swellFactor } from '../world/terrain';
import { WORLD, SETTLEMENTS, RAIDER_ZONES, type SalvageSiteDef, type RegionId } from '../data/world';
import { rollWreckTier, WRECK_LOOT, WRECK_ROLLS, TIER_COLOR, type WreckTier } from '../data/loot';

export interface Wreck {
  site: SalvageSiteDef;
  tier: WreckTier;
  obj: THREE.Object3D;
  beam: THREE.Mesh;
  hauled: boolean;
  /** seconds left before it sinks (surfacing wrecks only) */
  sinkIn?: number;
  /** a rival scavenger got to it first (Phase 3) */
  taken?: boolean;
}

const NAMES: Record<WreckTier, string[]> = {
  common: ['Capsized Trawler', 'Upturned Ferry Boat', 'Rolled Fishing Smack', 'Drifting Hulk'],
  rare: ['Rare Wreck: Harbour Launch', 'Rare Wreck: Pilot Boat', 'Rare Wreck: Rusted Yacht'],
  legendary: ['Legendary Wreck: Coast Guard Cutter', 'Legendary Wreck: The Last Ferry', 'Legendary Wreck: Treasury Barge'],
};

/** How risky a spot is, 0..1: distance from the nearest dock, storms, raider water and region. */
export function spotRisk(x: number, z: number, storm: number): number {
  let dock = Infinity;
  for (const s of SETTLEMENTS) dock = Math.min(dock, Math.hypot(x - s.x, z - s.z));
  let r = Math.min(1, Math.max(0, (dock - 120) / 520)) * 0.55;
  r += Math.min(0.3, storm * 0.35);
  for (const z0 of RAIDER_ZONES) if (Math.hypot(x - z0.x, z - z0.z) < z0.r) r += 0.3;
  const c = WORLD.shallowsCenter;
  if (Math.hypot(x - c.x, z - c.z) > WORLD.stormRadius - 60) r += 0.3;
  else if (swellFactor(x, z) > 0.5) r += 0.12;
  return Math.max(0, Math.min(1, r));
}

let serial = 0;

export class Wrecks {
  list: Wreck[] = [];
  private timer = 3;

  constructor(private g: Game) {}

  get sites(): SalvageSiteDef[] {
    return this.list.filter((w) => !w.hauled && !w.taken).map((w) => w.site);
  }
  byId(id: string) {
    return this.list.find((w) => w.site.id === id) ?? null;
  }

  /** A wreck of a given tier at a spot (also used by sea events). */
  spawnAt(x: number, z: number, tier: WreckTier, opts: { sinkIn?: number; name?: string } = {}): Wreck {
    const region: RegionId = this.g.atmo.wallAt(x, z) > 0.5 ? 'stormwall' : swellFactor(x, z) > 0.5 ? 'emerald' : 'shallows';
    const names = NAMES[tier];
    const site: SalvageSiteDef = {
      id: `wr_${++serial}`,
      name: opts.name ?? names[serial % names.length],
      kind: 'wreck',
      x, z, r: 9,
      region: region === 'stormwall' ? 'stormwall' : region === 'emerald' ? 'emerald' : 'shallows',
      difficulty: tier === 'common' ? 1 : tier === 'rare' ? 2 : 3,
      rolls: WRECK_ROLLS[tier],
      respawn: 0,
      loot: WRECK_LOOT[tier].map((l) => ({ id: l.id, w: l.w, n: l.n })),
      blurb: tier === 'legendary' ? 'Gold paint under the barnacles. Somebody important went down with her.' : tier === 'rare' ? 'Not picked over yet. Her lockers are still shut.' : 'A rolled hull, drifting. Worth a pull or two.',
    };
    const obj = this.buildObj(tier);
    obj.position.set(x, 0, z);
    obj.rotation.y = (x * 0.37 + z * 0.11) % 6.28;
    this.g.scene.add(obj);
    const beam = obj.userData.beam as THREE.Mesh;
    const w: Wreck = { site, tier, obj, beam, hauled: false, sinkIn: opts.sinkIn };
    this.list.push(w);
    return w;
  }

  /** The GITCRAFT outpost kit's scrap boat, rolled over, with a tier-coloured beacon shaft; a code-built hull if the
   * kit is missing. */
  private buildObj(tier: WreckTier): THREE.Object3D {
    const g = new THREE.Group();
    const hull = model('tb_outpost_kit', 'scrap_boat', { shadows: true });
    if (hull) {
      hull.rotation.z = Math.PI * 0.82;
      hull.position.y = 0.5;
      hull.scale.setScalar(1.35);
      g.add(hull);
    } else {
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(1.4, 5, 4, 8), new THREE.MeshToonMaterial({ color: tier === 'common' ? 0x5c4a3a : 0x46525a }));
      m.rotation.x = Math.PI / 2;
      m.scale.set(1.2, 1, 0.6);
      m.position.y = 0.2;
      g.add(m);
    }
    const buoy = model('tb_debris_kit', 'buoy');
    if (buoy) {
      buoy.position.set(3.2, -0.1, 0);
      g.add(buoy);
    }
    const col = new THREE.Color(tier === 'common' ? '#e8d9a8' : TIER_COLOR[tier]);
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(tier === 'legendary' ? 0.9 : 0.6, 0.3, tier === 'common' ? 10 : 26, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: tier === 'common' ? 0.18 : 0.38, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    );
    beam.position.y = tier === 'common' ? 5 : 13;
    beam.frustumCulled = false;
    g.add(beam);
    g.userData.beam = beam;
    return g;
  }

  /** A trip starts: clear the old wrecks and let new ones drift in. */
  onTripStart() {
    this.clear();
    this.timer = 2;
  }
  clear() {
    for (const w of this.list) this.g.scene.remove(w.obj);
    this.list = [];
  }
  remove(w: Wreck) {
    this.g.scene.remove(w.obj);
    this.list = this.list.filter((o) => o !== w);
  }

  /** Called by Salvage when a wreck has been hauled. */
  hauled(id: string) {
    const w = this.byId(id);
    if (!w) return;
    w.hauled = true;
    // it settles and goes under a few seconds later
    let k = 0;
    this.g.anims.push((dt) => {
      k += dt;
      w.obj.position.y = -k * 0.8;
      if (k > 4) {
        this.remove(w);
        return false;
      }
      return true;
    });
  }

  update(dt: number) {
    const g = this.g, b = g.boat;
    const t = g.renderT;
    const night = g.atmo.night;
    for (const w of [...this.list]) {
      if (w.hauled) continue;
      const s = g.ocean.sample(w.site.x, w.site.z, t);
      if (w.sinkIn === undefined) w.obj.position.y = s.y - 0.3;
      w.obj.rotation.x = s.dz * 0.5;
      w.obj.rotation.z = s.dx * 0.5;
      // the beam pulses; at night with deck lights it glints brighter (and it always shows rarer tiers)
      const m = w.beam.material as THREE.MeshBasicMaterial;
      const base = w.tier === 'common' ? 0.14 : 0.32;
      m.opacity = (base + 0.1 * Math.sin(t * 3 + w.site.x)) * (1 + night * (g.store.stats.nightOk ? 1 : 0.3));
      if (w.sinkIn !== undefined) {
        w.sinkIn -= dt;
        w.obj.position.y = s.y - 0.3 - Math.max(0, 6 - w.sinkIn) * 0.12;
        if (w.sinkIn <= 0) {
          g.foam.emit(new THREE.Vector3(w.site.x, 0.4, w.site.z), 30, '#ffffff', 3, 3, 1.2, 6, 1);
          this.remove(w);
          g.onWreckLost?.(w);
          continue;
        }
      }
      // far behind and forgotten: it drifts away
      if (Math.hypot(w.site.x - b.x, w.site.z - b.z) > 900) this.remove(w);
    }
    // a few wrecks per trip, ahead and to the sides, in open water
    if (!g.store.data.trip.on || b.docked || g.mode !== 'sail') return;
    if (g.store.data.daily.active) return; // the Daily Tide's wrecks are fixed by its seed
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 45;
    if (this.list.filter((w) => !w.hauled).length >= 3) return;
    for (let tries = 0; tries < 10; tries++) {
      const a = b.heading + (Math.random() - 0.5) * 2.6;
      const d = 140 + Math.random() * 280;
      const x = b.x + Math.sin(a) * d, z = b.z + Math.cos(a) * d;
      if (heightAt(x, z) > -4 || Math.hypot(x, z) > WORLD.size / 2 - 80) continue;
      if (g.drowned.colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 10)) continue;
      if (this.list.some((w) => Math.hypot(w.site.x - x, w.site.z - z) < 60)) continue;
      const risk = spotRisk(x, z, g.atmo.stormAt(x, z));
      const tier = rollWreckTier(Math.random, risk);
      if (tier !== 'common' && !g.crossOk(x, z)) continue; // never tease a tier the boat can't reach
      this.spawnAt(x, z, tier);
      break;
    }
  }
}
