// The drowned world: places every structure, settlement module, salvage marker and debris field from data,
// using the GITCRAFT MeshCraft models (public/models). Each piece falls back to simple procedural geometry
// if its model failed to load, so the game always runs.
import * as THREE from 'three';
import { STRUCTURES, SALVAGE_SITES, OUTPOSTS, type StructureDef, type OutpostDef } from '../data/world';
import { model, kitGeo, glowMat } from './assets';
import { vcMat, paint, xf, merge } from './materials';
import { RNG } from '../core/noise';
import { Shanty } from './shanty';
import { inkWorld } from './hero';
import { heightAt } from './terrain';

export interface Circle { x: number; z: number; r: number }

const FILE: Record<StructureDef['kind'], [string, string]> = {
  tower_glass: ['tb_tower_glass', 'tower_glass_body'],
  tower_brick: ['tb_tower_brick', 'tower_brick_body'],
  tower_spire: ['tb_tower_spire', 'tower_spire_body'],
  tower_stump: ['tb_tower_stump', 'tower_stump_body'],
  oil_rig: ['tb_oil_rig', 'oil_rig_body'],
  tanker: ['tb_tanker_wreck', 'tanker_body'],
  container: ['tb_containers', 'container_red'],
  mega_spire: ['tb_tower_spire', 'tower_spire_body'],
  trawler: ['tb_trawler_wreck', 'trawler_body'],
  crane: ['tb_port_crane', 'crane_body'],
};

function fallback(kind: StructureDef['kind']) {
  const h = kind === 'container' ? 2.6 : kind === 'oil_rig' ? 26 : kind === 'tanker' ? 30 : kind === 'tower_stump' ? 14 : kind === 'trawler' ? 6 : 40;
  const w = kind === 'container' ? 12 : 14;
  const g = paint(xf(new THREE.BoxGeometry(w, h + 10, kind === 'container' ? 2.4 : w), 0, h / 2 - 5, 0), kind === 'container' ? '#c8352a' : '#7f8a94');
  return new THREE.Mesh(g, vcMat());
}

export class DrownedWorld {
  colliders: Circle[] = [];
  animators: ((t: number, dt: number) => void)[] = [];
  glows: THREE.Object3D[] = [];
  siteMarkers = new Map<string, THREE.Object3D>();
  hollowTop = 21.5;
  /** world positions of tolling bell buoys (the audio listens for these) */
  bells: THREE.Vector3[] = [];
  /** camera position, set by the game each frame: distant small dressing is hidden (it is lost in the haze anyway) */
  focus = new THREE.Vector3();
  /** drifting flotsam the player can pick over by sailing slowly through it */
  flotsam: { x: number; z: number; kind: string; picked: boolean; obj: THREE.Object3D }[] = [];
  /** every kit node placed in the world (static pieces are merged into per-settlement batches, so they have no scene name) */
  placedNodes = new Set<string>();
  /** static kit pieces, merged per settlement into one toon mesh + one glow mesh (a whole town = 2 draw calls) */
  private batch = 'misc';
  private batches = new Map<string, { geos: THREE.BufferGeometry[]; glows: THREE.BufferGeometry[]; x: number; z: number; n: number }>();
  private batchMeshes: { obj: THREE.Object3D; x: number; z: number; r: number }[] = [];
  /** procedural salvage architecture (src/world/shanty.ts), merged into the same settlement batches */
  private shanty = new Shanty(new RNG(6161));

  constructor(private scene: THREE.Scene) {
    for (const s of STRUCTURES) this.place(s);
    this.batch = 'driftholm';
    this.buildDriftholmRafts();
    this.batch = 'hollow';
    this.buildRooftopHollow();
    this.batch = 'helios';
    this.buildHeliosDock();
    for (const o of OUTPOSTS) {
      this.batch = o.id;
      this.buildOutpost(o);
    }
    this.flushBatches();
    this.scatterDebris();
    this.bellBuoys();
    this.markSites();
  }

  private add(obj: THREE.Object3D, x: number, y: number, z: number, rot = 0, scale = 1) {
    obj.position.set(x, y, z);
    obj.rotation.y = rot;
    obj.scale.setScalar(scale);
    obj.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = !o.userData.glow;
        o.receiveShadow = !o.userData.glow;
      }
      if (o.userData.glow) this.glows.push(o);
    });
    this.scene.add(obj);
    return obj;
  }

  private place(s: StructureDef) {
    const [file, node] = FILE[s.kind];
    const name = s.kind === 'container' ? `container_${s.variant ?? 'red'}` : node;
    const obj = model(file, name) ?? fallback(s.kind);
    inkWorld(obj);
    const scale = (s.scale ?? 1) * (s.kind === 'mega_spire' ? 2.4 : 1);
    this.add(obj, s.x, s.kind === 'container' ? -1.1 : s.kind === 'tower_stump' ? -2.5 : s.kind === 'crane' ? -1.5 : 0, s.z, s.rot ?? 0, scale);
    if (s.kind === 'container') {
      // half-sunk and gently rolling
      obj.rotation.z = 0.12;
      const ph = s.x * 0.1;
      this.animators.push((t) => {
        obj.position.y = -1.1 + Math.sin(t * 0.8 + ph) * 0.18;
        obj.rotation.x = Math.sin(t * 0.6 + ph) * 0.04;
      });
    }
    if (s.r) this.colliders.push({ x: s.x, z: s.z, r: s.r });
    if (s.kind === 'oil_rig') {
      // the flare still burns: flicker its glow
      const flare = obj.children.find((c) => c.userData.glow);
      if (flare) this.animators.push((t) => flare.scale.setScalar(1 + Math.sin(t * 13) * 0.04 + Math.sin(t * 7.3) * 0.03));
    }
  }

  private module(kind: string, x: number, y: number, z: number, rot = 0, bob = true) {
    const obj = model('tb_settlement_kit', kind);
    if (!obj) {
      const m = new THREE.Mesh(paint(xf(new THREE.BoxGeometry(7, 2.4, 7), 0, 1.2, 0), '#8a5a34'), vcMat());
      this.add(m, x, y, z, rot);
      this.colliders.push({ x, z, r: 4.5 });
      return m;
    }
    this.add(obj, x, y, z, rot);
    if (kind === 'mod_turbine') {
      const rotor = model('tb_settlement_kit', 'mod_turbine_rotor');
      if (rotor) {
        const pivot = new THREE.Group();
        pivot.position.set(0, 12.3, 0);
        rotor.rotation.order = 'YXZ';
        pivot.add(rotor);
        obj.add(pivot);
        this.animators.push((t) => (rotor.rotation.z = t * 1.6));
        rotor.traverse((o) => (o.castShadow = true));
      }
    }
    if (bob) {
      const ph = x * 0.13 + z * 0.07;
      this.animators.push((t) => {
        obj.position.y = y + Math.sin(t * 0.9 + ph) * 0.12;
        obj.rotation.z = Math.sin(t * 0.7 + ph) * 0.015;
      });
    }
    if (y < 2) this.colliders.push({ x, z, r: 4.6 });
    return obj;
  }

  /** Raft districts moored either side of Driftholm's pier. */
  private buildDriftholmRafts() {
    // the raft districts are stilt houses driven into the shallows either side of the pier (salvage architecture,
    // src/world/shanty.ts), with the water still and the wind turbine on their own floats
    const west = [['mod_water', -27, 176, 0.3], ['mod_turbine', -54, 194, 0]] as const;
    const east = [['mod_turbine', 30, 177, 0.2], ['mod_water', 57, 193, 0]] as const;
    for (const [k, x, z, r] of [...west, ...east]) this.module3(k, x, z, r);
    const S = this.shanty;
    const tops: [number, number, number][] = [];
    const house = (x: number, z: number, rot: number, o: Parameters<Shanty['dwelling']>[0]) => {
      // a touch over life size: these are read from a phone across the bay
      const top = S.dwelling(o);
      this.takeShanty(x, 0, z, Math.PI + rot, 1.15, 4.6);
      tops.push([x, top * 1.15, z]);
    };
    house(-26, 194, 0.1, { base: 'stilts', storeys: 2, roof: 'gable', accent: 'mast', awning: true });
    house(-40, 184, -0.2, { base: 'stilts', roof: 'barrel', accent: 'chimney', awning: true });
    house(28, 195, 0.15, { base: 'stilts', roof: 'gable', accent: 'aerial', awning: true });
    house(42, 185, -0.3, { base: 'stilts', storeys: 2, roof: 'lean', accent: 'mast' });
    // the waterfront: a row of stilt houses over the flats below the shops (between them, so the shop boards still
    // show from the water), joined by a boardwalk on piles that runs out to the pier
    const front = [
      [-57, 209, 0.12, 'gable', 'mast', 2], [-31, 207, -0.06, 'lean', 'chimney', 1], [-9, 209, 0.05, 'barrel', 'aerial', 1],
      [9, 208, -0.08, 'gable', 'chimney', 1], [31, 207, 0.1, 'gable', 'mast', 2], [57, 209, -0.12, 'lean', 'aerial', 1],
    ] as const;
    for (const [x, z, r, roof, accent, st] of front) house(x, z, r, { base: 'stilts', roof, accent, storeys: st as 1 | 2, awning: true });
    S.boardwalk(-62, 201, -3.5, 200.5, 2.2);
    this.takeShanty(0, 0, 0);
    S.boardwalk(3.5, 200.5, 62, 201, 2.2);
    this.takeShanty(0, 0, 0);
    // the town's washing and its colours, strung roof to roof and out to the pier
    const line = (a: [number, number, number], b: [number, number, number], sag = 1.4) => {
      S.bunting(a, b, sag);
      this.takeShanty(0, 0, 0);
    };
    const at = (i: number, dy: number): [number, number, number] => [tops[i][0], tops[i][1] + dy, tops[i][2]];
    line(at(0, -0.6), at(1, -0.5));
    line(at(2, -0.5), at(3, -0.6));
    line(at(0, -0.8), [-3, 5.5, 186], 1.6);
    line(at(2, -0.6), [3, 5.5, 190], 1.6);
    for (const [a, b] of [[4, 5], [5, 6], [7, 8], [8, 9]]) line(at(a, -0.7), at(b, -0.7), 1.3);
    // walkways tie the rafts to the pier
    for (const [x, z, r] of [[-14, 196, 0], [16, 197, 0], [-34, 186, 0.6], [36, 187, -0.6]] as const) this.module3('mod_walkway', x, z, r);
    // Driftholm is a fortified atoll: scrap palisades flank the raft districts (one still scorched from the last
    // raid), watchtowers on the corners, the harbour mouth left open for boats
    const H = Math.PI / 2;
    this.kitPiece('tb_atoll_kit', 'atoll_wall', -68, 181, H, 1, true);
    this.kitPiece('tb_atoll_kit', 'atoll_wall_burnt', -68, 197, H, 1, true);
    this.kitPiece('tb_atoll_kit', 'atoll_wall', -52, 170, 0, 1, true);
    this.kitPiece('tb_atoll_kit', 'atoll_wall', 72, 181, -H, 1, true);
    this.kitPiece('tb_atoll_kit', 'atoll_wall', 72, 197, -H, 1, true);
    this.kitPiece('tb_atoll_kit', 'atoll_wall_burnt', 56, 172, Math.PI, 1, true);
    this.kitPiece('tb_atoll_kit', 'watchtower', -68, 167, 0.6, 1, true);
    this.kitPiece('tb_atoll_kit', 'watchtower', 72, 168, -0.5, 1, true);
    // the town's landmark: a supertanker's propeller, stood on end in the shallows, a lookout shack on its hub
    this.kitPiece('tb_atoll_kit', 'propeller', -30, 158, 0.25, 1, false);
    this.colliders.push({ x: -30, z: 158, r: 7 });
  }

  /**
   * Place one kit node; walls add a chain of colliders along their length. Boats bob on their own; everything else
   * (walls, towers, tanks, stalls: heavy, moored, effectively still) is merged into its settlement's static batch.
   */
  private kitPiece(file: string, node: string, x: number, z: number, rot = 0, scale = 1, _bob = true, y = 0) {
    const bob = node === 'scrap_boat';
    let obj: THREE.Object3D | null = null;
    if (bob) {
      obj = model(file, node);
      if (!obj) return null;
      this.add(obj, x, y, z, rot, scale);
      obj.traverse((m) => (m.castShadow = false)); // small and at the waterline: not worth a shadow pass
    } else {
      const k = kitGeo(file, node, x, y, z, rot, scale);
      if (!k) return null;
      let b = this.batches.get(this.batch);
      if (!b) this.batches.set(this.batch, (b = { geos: [], glows: [], x: 0, z: 0, n: 0 }));
      b.geos.push(k.geo);
      if (k.glow) b.glows.push(k.glow);
      b.x += x;
      b.z += z;
      b.n++;
    }
    this.placedNodes.add(node);
    if (/wall/.test(node)) {
      const L = 16 * scale;
      for (let t = -L / 2 + 2; t <= L / 2 - 2; t += 4) this.colliders.push({ x: x + Math.cos(rot) * t, z: z - Math.sin(rot) * t, r: 2.6 * scale });
    } else if (node === 'atoll_gate') {
      for (const t of [-7, -3.5, 0, 3.5, 7]) this.colliders.push({ x: x + Math.cos(rot) * t * scale, z: z - Math.sin(rot) * t * scale, r: 3 * scale });
    } else if (node !== 'propeller' && node !== 'scrap_boat') {
      const r = { water_tank: 4.8, container_home: 6, watchtower: 2.8, salvage_barge: 6, pontoon: 5.5, sinking_platform: 5, market_stall: 4, rain_catcher: 3.2, net_tower: 2.6 }[node] ?? 3;
      this.colliders.push({ x, z, r: r * scale });
    }
    if (bob && obj) {
      const o = obj;
      const ph = x * 0.11 + z * 0.07;
      this.animators.push((t) => {
        o.visible = Math.abs(o.position.x - this.focus.x) < 420 && Math.abs(o.position.z - this.focus.z) < 420;
        if (!o.visible) return;
        o.position.y = y + Math.sin(t * 0.9 + ph) * 0.14;
        o.rotation.z = Math.sin(t * 0.7 + ph) * 0.04;
      });
    }
    return obj;
  }

  /** Merge what the Shanty builder made into the current settlement's static batch, placed and turned. */
  private takeShanty(x: number, y: number, z: number, rot = 0, scale = 1, r = 0) {
    const t = this.shanty.take(x, y, z, rot, scale);
    let b = this.batches.get(this.batch);
    if (!b) this.batches.set(this.batch, (b = { geos: [], glows: [], x: 0, z: 0, n: 0 }));
    b.geos.push(...t.geos);
    b.glows.push(...t.glows);
    b.x += x;
    b.z += z;
    b.n++;
    if (r) this.colliders.push({ x, z, r: r * scale });
  }

  private flushBatches() {
    for (const [, b] of this.batches) {
      const grp = new THREE.Group();
      const solid = new THREE.Mesh(merge(b.geos), vcMat());
      solid.castShadow = solid.receiveShadow = true;
      grp.add(solid);
      inkWorld(solid);
      if (b.glows.length) {
        const gm = new THREE.Mesh(merge(b.glows), glowMat());
        gm.userData.glow = true;
        grp.add(gm);
        this.glows.push(gm);
      }
      solid.geometry.computeBoundingSphere();
      const bs = solid.geometry.boundingSphere!;
      this.scene.add(grp);
      this.batchMeshes.push({ obj: grp, x: bs.center.x, z: bs.center.z, r: bs.radius });
    }
    this.batches.clear();
    // whole settlements drop out once the haze has them (fog is opaque by ~860 m)
    this.animators.push(() => {
      for (const m of this.batchMeshes) m.obj.visible = Math.hypot(m.x - this.focus.x, m.z - this.focus.z) - m.r < 820;
    });
  }

  /** Settlement hierarchy dressing from data: outposts, the raider fort, a stripping yard, a platform going under. */
  private buildOutpost(o: OutpostDef) {
    const c = Math.cos(o.rot), s = Math.sin(o.rot);
    const at = (lx: number, lz: number) => [o.x + lx * c + lz * s, o.z - lx * s + lz * c] as const;
    const put = (file: string, node: string, lx: number, lz: number, r = 0, sc = 1, bob = true) => {
      const [x, z] = at(lx, lz);
      return this.kitPiece(file, node, x, z, o.rot + r, sc, bob);
    };
    if (o.kind === 'outpost') {
      put('tb_outpost_kit', 'pontoon', 0, 0);
      // a patched cabin on the pontoon, its mast the outpost's mark on the horizon
      this.shanty.dwelling({ base: 'none', w: 4.6, d: 3.8, accent: 'mast', awning: true });
      const [hx, hz] = at(-1.2, 0.2);
      this.takeShanty(hx, 0.85, hz, o.rot + 0.1 + Math.PI, 0.9);
      put('tb_atoll_kit', 'watchtower', 3.2, 2.5, 0.3, 0.6);
      put('tb_outpost_kit', 'rain_catcher', 8.5, -3, 0, 0.75);
      put('tb_outpost_kit', 'scrap_boat', -7.5, -4, 1.4, 1);
      if (o.id !== 'op_gullstep') put('tb_outpost_kit', 'net_tower', -2, 8.5, 0, 0.8);
    } else if (o.kind === 'raider_fort') {
      put('tb_atoll_kit', 'atoll_gate', 0, -20, 0, 1, false);
      const ring = [[-16, -14, -0.7], [16, -14, 0.7], [-21, 2, -1.57], [21, 2, 1.57], [-13, 17, -2.4], [13, 17, 2.4]] as const;
      ring.forEach(([lx, lz, r], i) => put('tb_atoll_kit', i % 2 ? 'atoll_wall_burnt' : 'atoll_wall', lx, lz, r, 1, false));
      put('tb_atoll_kit', 'watchtower', -10, -20, 0, 1, false);
      put('tb_atoll_kit', 'watchtower', 10, -20, 0, 1, false);
      put('tb_atoll_kit', 'container_home', -4, 2, 0.2, 0.9, false);
      put('tb_atoll_kit', 'container_home', 6, 9, -0.4, 0.85, false);
      put('tb_atoll_kit', 'water_tank', 8, -6, 0, 0.8, false);
      put('tb_outpost_kit', 'scrap_heap', -9, -8, 0, 1.6, false);
      put('tb_outpost_kit', 'scrap_boat', -26, -26, 0.8, 1.15);
      put('tb_outpost_kit', 'scrap_boat', 24, -27, -0.6, 1.1);
    } else if (o.kind === 'strip_wreck') {
      put('tb_outpost_kit', 'salvage_barge', 0, 0, 0, 1.1);
    } else {
      put('tb_outpost_kit', 'sinking_platform', 0, 0, 0, 1.2, false);
    }
  }

  private module3(kind: string, x: number, z: number, rot = 0) {
    return this.module(kind, x, 0, z, rot);
  }

  /** Rooftop Hollow: a fishing community on the roof of the drowned apartment block. */
  private buildRooftopHollow() {
    // trading settlement: nets drying, a rain catcher, a fish market at the pontoon, boats tied off the south face
    this.kitPiece('tb_outpost_kit', 'net_tower', -244, -40, 0.5);
    this.kitPiece('tb_outpost_kit', 'net_tower', -206, -62, 1.2);
    this.kitPiece('tb_outpost_kit', 'rain_catcher', -216, -40, 0.3);
    this.kitPiece('tb_outpost_kit', 'market_stall', -238, -34, 0.5 + Math.PI);
    this.kitPiece('tb_outpost_kit', 'scrap_boat', -222, -30, 2.2);
    this.kitPiece('tb_outpost_kit', 'scrap_boat', -250, -50, 1.0);
    this.kitPiece('tb_outpost_kit', 'scrap_boat', -204, -45, -0.4);
    const bx = -235, bz = -70, rot = 0.5;
    const top = this.hollowTop;
    const local = (lx: number, lz: number) => {
      const c = Math.cos(rot), s = Math.sin(rot);
      return { x: bx + lx * c + lz * s, z: bz - lx * s + lz * c };
    };
    {
      // the fish market on the roof: a two-storey shack of the building's own scrap, its mast over the bay
      const p = local(3.5, -3);
      this.shanty.dwelling({ base: 'ground', storeys: 2, roof: 'gable', accent: 'mast', awning: true, w: 6, d: 5 });
      this.takeShanty(p.x, top - 0.2, p.z, rot + Math.PI);
    }
    for (const [k, lx, lz, r] of [['mod_water', -4, 2.5, 0], ['mod_turbine', 6, 3, 0]] as const) {
      const p = local(lx, lz);
      this.module(k, p.x, top - 0.8, p.z, rot + r, false);
    }
    // pontoon dock at water level by the south face, with fishing rafts
    this.shanty.dwelling({ base: 'drums', roof: 'lean', accent: 'chimney', awning: true });
    this.takeShanty(-226, 0, -45, rot + 0.2, 1, 4.6);
    this.module3('mod_walkway', -234, -52, rot + Math.PI / 2);
    this.module3('mod_water', -214, -52, rot);
  }

  private buildHeliosDock() {
    this.module3('mod_walkway', -532, 150, 0.6 + Math.PI / 2);
    this.shanty.dwelling({ base: 'drums', roof: 'barrel', accent: 'aerial', awning: true });
    this.takeShanty(-522, 0, 142, 0.6, 1, 4.6);
    this.shanty.dwelling({ base: 'drums', storeys: 2, roof: 'gable', accent: 'mast', awning: true });
    this.takeShanty(-548, 0, 140, 0.6, 1, 4.6);
    // the market spills off the rig onto pontoons: stalls, fresh water for sale, a lookout and a stripping barge
    this.kitPiece('tb_outpost_kit', 'market_stall', -512, 150, 0.6 + Math.PI);
    this.kitPiece('tb_outpost_kit', 'market_stall', -560, 128, 0.6);
    this.kitPiece('tb_atoll_kit', 'water_tank', -506, 132, 0.2);
    this.kitPiece('tb_outpost_kit', 'rain_catcher', -568, 146, 0.4);
    this.kitPiece('tb_atoll_kit', 'watchtower', -500, 168, 0.6);
    this.kitPiece('tb_outpost_kit', 'salvage_barge', -585, 190, 2.0);
    for (const [x, z, r] of [[-520, 122, 0.8], [-538, 118, 1.9], [-498, 150, 2.6], [-572, 160, -0.3]] as const) this.kitPiece('tb_outpost_kit', 'scrap_boat', x, z, r);
  }

  /** Floating wreckage around the drowned places: planks, drums, foam and tyres. */
  private scatterDebris() {
    const rng = new RNG(4242);
    const parts: THREE.BufferGeometry[] = [];
    const patch = model('tb_debris_kit', 'debris_patch');
    const drum = model('tb_debris_kit', 'oil_drum');
    const anchors = STRUCTURES.filter((s) => s.kind !== 'container').map((s) => [s.x, s.z, s.r] as const);
    const placed: THREE.Object3D[] = [];
    for (const [ax, az, ar] of anchors) {
      for (let k = 0; k < 3; k++) {
        const a = rng.range(0, Math.PI * 2), d = ar + rng.range(6, 30);
        const src = k % 2 ? drum : patch;
        if (!src) continue;
        const o = src.clone();
        this.add(o, ax + Math.cos(a) * d, 0, az + Math.sin(a) * d, rng.range(0, 6), rng.range(0.8, 1.4));
        placed.push(o);
      }
    }
    for (const o of placed) {
      const ph = o.position.x * 0.2 + o.position.z * 0.1;
      const y0 = -0.05;
      this.animators.push((t) => {
        o.visible = Math.abs(o.position.x - this.focus.x) < 340 && Math.abs(o.position.z - this.focus.z) < 340;
        if (!o.visible) return;
        o.position.y = y0 + Math.sin(t * 1.3 + ph) * 0.15;
        o.rotation.z = Math.sin(t * 1.1 + ph) * 0.08;
      });
    }
    // flotsam in open water: rafts, ghost nets, capsized hulls drifting between the landmarks
    const kinds = ['barrel_raft', 'net_tangle', 'hull_shard'].map((n) => model('tb_flotsam_kit', n)).filter(Boolean) as THREE.Group[];
    if (kinds.length) {
      for (let i = 0, tries = 0; i < 46 && tries < 600; tries++) {
        const x = rng.range(-1000, 1000), z = rng.range(-1000, 1000);
        if (heightAt(x, z) > -4 || STRUCTURES.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + 12)) continue;
        const o = this.add(kinds[i % kinds.length].clone(), x, -0.05, z, rng.range(0, 6), rng.range(0.85, 1.25));
        o.traverse((m) => (m.castShadow = false)); // waterline-height and small: not worth a shadow pass
        this.flotsam.push({ x, z, kind: kinds[i % kinds.length].name, picked: false, obj: o });
        const ph = x * 0.13 + z * 0.07;
        this.animators.push((t) => {
          o.visible = Math.abs(o.position.x - this.focus.x) < 340 && Math.abs(o.position.z - this.focus.z) < 340;
          if (!o.visible) return;
          o.position.y = -0.05 + Math.sin(t * 1.1 + ph) * 0.18;
          o.rotation.z = Math.sin(t * 0.9 + ph) * 0.07;
          o.rotation.x = Math.sin(t * 0.7 + ph * 1.3) * 0.05;
        });
        i++;
      }
    }
    // drifting algae mats: the commonest living thing at sea, and still worth hooking
    const algae = model('tb_flora_kit', 'flora_algae');
    if (algae) {
      for (let i = 0, tries = 0; i < 28 && tries < 400; tries++) {
        const x = rng.range(-760, 760), z = rng.range(-760, 760);
        if (heightAt(x, z) > -3 || STRUCTURES.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + 10)) continue;
        const o = this.add(algae.clone(), x, 0.02, z, rng.range(0, 6), rng.range(1.6, 2.4));
        o.traverse((m) => (m.castShadow = false));
        this.flotsam.push({ x, z, kind: 'algae_mat', picked: false, obj: o });
        const ph = x * 0.1 + z * 0.13;
        this.animators.push((t) => {
          o.visible = Math.abs(o.position.x - this.focus.x) < 220 && Math.abs(o.position.z - this.focus.z) < 220;
          if (o.visible) o.position.y = 0.02 + Math.sin(t * 1.0 + ph) * 0.12;
        });
        i++;
      }
    }
    void parts;
  }

  /** Old navigation bell buoys, still tolling, mark the way into each region. */
  private bellBuoys() {
    const bell = model('tb_flotsam_kit', 'bell_buoy');
    if (!bell) return;
    for (const [x, z] of [[60, 120], [-170, 150], [150, -40], [380, -330], [-460, 120], [250, 520], [-190, -900]]) {
      if (heightAt(x, z) > -2) continue;
      const o = this.add(bell.clone(), x, 0, z, (x + z) % 6);
      this.bells.push(o.position);
      const glow = o.children.find((c) => c.userData.glow);
      const ph = x * 0.05;
      this.animators.push((t) => {
        o.visible = Math.abs(o.position.x - this.focus.x) < 520 && Math.abs(o.position.z - this.focus.z) < 520;
        if (!o.visible) return;
        o.position.y = Math.sin(t * 1.2 + ph) * 0.3 - 0.15;
        o.rotation.z = Math.sin(t * 0.95 + ph) * 0.14;
        o.rotation.x = Math.sin(t * 0.8 + ph) * 0.08;
        if (glow) glow.visible = Math.sin(t * 2.2 + ph) > 0.3;
      });
    }
  }

  /** A blinking beacon buoy beside every salvage site. */
  private markSites() {
    const buoy = model('tb_debris_kit', 'buoy');
    for (const s of SALVAGE_SITES) {
      const o = buoy ? buoy.clone() : new THREE.Mesh(paint(new THREE.CylinderGeometry(0.6, 0.6, 2, 8), '#c8352a'), vcMat());
      const a = (s.x * 13 + s.z * 7) % 6.28;
      const x = s.x + Math.cos(a) * (s.r * 0.75), z = s.z + Math.sin(a) * (s.r * 0.75);
      this.add(o, x, 0, z);
      this.siteMarkers.set(s.id, o);
      const glow = o.children.find((c) => c.userData.glow);
      const ph = a;
      this.animators.push((t) => {
        o.position.y = Math.sin(t * 1.4 + ph) * 0.25 - 0.1;
        o.rotation.z = Math.sin(t * 1.1 + ph) * 0.1;
        if (glow) glow.visible = Math.sin(t * 3 + ph) > -0.2;
      });
    }
  }

  update(t: number, dt: number, nightGlow: number) {
    for (const a of this.animators) a(t, dt);
    // glow geometry is unlit; by day it reads as paint, at night it reads as light
    void nightGlow;
  }
}
