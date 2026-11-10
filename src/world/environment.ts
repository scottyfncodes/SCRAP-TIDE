// Builds all static world geometry from data: terrain, foliage, landmarks, the harbor town.
import * as THREE from 'three';
import { ISLANDS, WORLD, TREASURE_MAPS, type IslandDef } from '../data/world';
import { heightAt } from './terrain';
import { vcMat, merge, paint, xf, canvasTex, toonMat } from './materials';
import * as P from './props';
import { kitGeo, glowMat, model, characterModel, type Character } from './assets';
import { RNG, fbm } from '../core/noise';
import { Shanty } from './shanty';
import { Kit, signalStack, bathtubLifeboat, trolleyPots, tollGate, TOLL } from './jury';
import { jury } from '../state/look';
import { inkWorld } from './hero';

export interface Collider { x: number; z: number; r: number }
export interface Rect { x0: number; x1: number; z0: number; z1: number }

export class Environment {
  colliders: Collider[] = [];
  boatRects: Rect[] = [];
  animators: ((t: number, dt: number) => void)[] = [];
  pierTip = new THREE.Vector3();
  npcs: THREE.Object3D[] = [];
  /** rigged townsfolk that replaced the stand-ins, with a timer for their next gesture */
  private folk: { c: Character; next: number }[] = [];
  lighthouseLamp?: THREE.Mesh;
  /** world position of the last tree's canopy (a landmark visible from the water) */
  landmarkGreen?: THREE.Vector3;
  /** Driftholm's guarded greenhouse */
  gardenGlow?: THREE.Vector3;

  constructor(private scene: THREE.Scene) {
    this.buildTerrain();
    for (const isl of ISLANDS) this.decorate(isl);
    this.buildHarbor();
  }

  // ───────── terrain ─────────
  private buildTerrain() {
    const patches: { x: number; z: number; half: number; step: number; style: IslandDef['style'] }[] = [];
    for (const isl of ISLANDS) {
      if (isl.id === 'gull') continue;
      patches.push({ x: isl.x, z: isl.z, half: isl.r * 2.55, step: isl.r > 80 ? 2.6 : isl.r > 45 ? 1.7 : 1.25, style: isl.style });
    }
    const R = WORLD.reef;
    patches.push({ x: R.x, z: R.z, half: R.r + 16, step: 1.35, style: 'sandbar' });

    for (const p of patches) {
      const segs = Math.round((p.half * 2) / p.step);
      const geo = new THREE.PlaneGeometry(p.half * 2, p.half * 2, segs, segs);
      geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position;
      const cols = new Float32Array(pos.count * 3);
      const c = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) + p.x;
        const z = pos.getZ(i) + p.z;
        const h = heightAt(x, z);
        pos.setY(i, h);
        const hx = heightAt(x + 1, z) - h;
        const hz = heightAt(x, z + 1) - h;
        const slope = Math.hypot(hx, hz);
        terrainColor(c, x, z, h, slope, p.style);
        cols[i * 3] = c.r;
        cols[i * 3 + 1] = c.g;
        cols[i * 3 + 2] = c.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      geo.deleteAttribute('uv');
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, vcMat());
      mesh.position.set(p.x, 0, p.z);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    }
  }

  // ───────── props ─────────
  private decorate(isl: IslandDef) {
    const rng = new RNG(isl.seed * 31 + 7);
    const geos: THREE.BufferGeometry[] = [];
    const sway: THREE.BufferGeometry[] = [];
    const glows: THREE.BufferGeometry[] = [];
    const exclude: { x: number; z: number; r: number }[] = [];
    for (const l of isl.landmarks) exclude.push({ x: isl.x + l.x, z: isl.z + l.z, r: l.type === 'wreck' ? 14 : l.type === 'lighthouse' ? 6 : l.type === 'cave' ? 7 : 5 });
    for (const f of isl.finds) exclude.push({ x: isl.x + f.x, z: isl.z + f.z, r: 3 });
    for (const m of TREASURE_MAPS) if (m.island === isl.id) exclude.push({ x: isl.x + m.x, z: isl.z + m.z, r: 4 });
    if (isl.style === 'harbor') exclude.push({ x: 0, z: 222, r: 85 }); // town area handled separately

    const free = (x: number, z: number, r: number) => {
      for (const e of exclude) if (Math.hypot(x - e.x, z - e.z) < e.r + r) return false;
      return true;
    };
    const place = (tries: number, minH: number, maxH: number, maxSlope: number, r: number, fn: (x: number, y: number, z: number) => void) => {
      for (let t = 0; t < tries; t++) {
        const a = rng.range(0, Math.PI * 2);
        const d = Math.sqrt(rng.next()) * isl.r * 1.05;
        const x = isl.x + Math.cos(a) * d;
        const z = isl.z + Math.sin(a) * d;
        const h = heightAt(x, z);
        if (h < minH || h > maxH) continue;
        const slope = Math.hypot(heightAt(x + 1, z) - h, heightAt(x, z + 1) - h);
        if (slope > maxSlope) continue;
        if (!free(x, z, r)) continue;
        exclude.push({ x, z, r });
        fn(x, h, z);
        return true;
      }
      return false;
    };

    // Nothing grows out here unless someone guards it. Palms are bleached trunks, scrub is dead brush, and the
    // sand is littered with what the sea threw up. Living green appears only as a find or behind a garden wall.
    const kit = (file: string, node: string, x: number, y: number, z: number, ry = 0, sc = 1, rz = 0) => {
      const k = kitGeo(file, node, x, y, z, ry, sc, rz);
      if (k) {
        geos.push(k.geo);
        if (k.glow) glows.push(k.glow);
      }
      return !!k;
    };
    // GITCRAFT coast kit pieces (creative/3d-coast); the code-built prop is only drawn if the kit failed to load.
    // A fallback draws its shape from its own seeded RNG, so the island's layout (and its colliders) is the same
    // whichever one is drawn.
    const fr = (x: number, z: number) => new RNG(Math.floor(x * 31 + z * 17) >>> 0);
    const coast = (node: string, x: number, y: number, z: number, ry: number, sc: number, fallback: () => THREE.BufferGeometry, rz = 0) => {
      if (!kit('tb_coast_kit', node, x, y, z, ry, sc, rz)) geos.push(fallback());
    };
    const landmark = (node: string, x: number, y: number, z: number, ry: number, fallback: () => THREE.BufferGeometry) => {
      if (!kit('tb_landmark_kit', node, x, y, z, ry)) geos.push(fallback());
    };
    const PALMS = ['dead_palm_a', 'dead_palm_b', 'dead_palm_c', 'dead_palm_d'];
    const ROCKS = ['rock_a', 'rock_b', 'rock_c', 'rock_d'];
    for (let i = 0; i < isl.palms; i++) {
      place(40, 0.5, 9, 0.6, 1.4, (x, y, z) => {
        if (rng.next() < 0.3 && kit('tb_outpost_kit', 'dead_tree', x, y - 0.3, z, rng.range(0, 6), rng.range(0.7, 1.05))) this.colliders.push({ x, z, r: 0.8 });
        else {
          const h = rng.range(4.5, 8.5), lean = rng.range(0.15, 0.5), ry = rng.range(0, 6), v = PALMS[rng.int(0, 3)];
          coast(v, x, y - 0.2, z, ry, h / 7, () => xf(P.deadPalm(fr(x, z), h, lean), x, y - 0.2, z));
          this.colliders.push({ x, z, r: 0.6 });
        }
      });
    }
    for (let i = 0; i < isl.rocks; i++) {
      place(30, -1.2, 20, 2, 1.5, (x, y, z) => {
        const s = rng.range(0.8, isl.style === 'rocky' ? 3.2 : 2.2);
        const squash = rng.range(0.5, 0.85), ry = rng.range(0, 6);
        // drowned rubble (rock_c) only on the scrap-strewn islands, not on Canopy Rise's old stone
        const v = ROCKS[isl.style === 'jungle' ? rng.int(0, 1) * 3 : rng.int(0, 3)];
        coast(v, x, y - s * 0.12, z, ry, s, () => xf(P.rock(fr(x, z), s, squash, isl.style === 'jungle' ? '#585650' : '#625a52', false), x, y + s * 0.15, z, 0, ry, 0));
        if (y > -0.3) this.colliders.push({ x, z, r: s * 0.9 });
      });
    }
    for (let i = 0; i < isl.foliage; i++) {
      place(30, 0.6, 30, 1.2, 1.6, (x, y, z) => {
        const k = rng.next();
        if (k < 0.3 && kit('tb_outpost_kit', 'scrap_heap', x, y - 0.15, z, rng.range(0, 6), rng.range(0.55, 0.85))) this.colliders.push({ x, z, r: 1.4 });
        else if (k < 0.5) {
          const len = rng.range(2, 4), ry = rng.range(0, 6);
          coast('driftwood', x, y - 0.05, z, ry, len / 3.2, () => paint(xf(new THREE.CylinderGeometry(0.2, 0.26, len, 6), x, y + 0.2, z, 0, ry, Math.PI / 2), '#a89c84', 0.1)); // bleached driftwood log
        } else {
          const sc = rng.range(0.8, 1.4);
          coast(rng.next() < 0.7 ? 'scrub_a' : 'scrub_b', x, y - 0.05, z, rng.range(0, 6), sc, () => xf(P.deadScrub(fr(x, z), sc), x, y, z));
        }
      });
    }
    // dry tufts, sparse
    for (let i = 0; i < isl.r * 0.9; i++) {
      place(6, 1.0, 30, 1.5, 0.3, (x, y, z) => {
        const tint = rng.next() < 0.5 ? '#7c7258' : '#8a8068';
        coast('grass_tuft', x, y - 0.02, z, rng.range(0, 6), rng.range(0.8, 1.3), () => xf(P.grassTuft(fr(x, z), tint), x, y, z));
      });
    }

    // landmarks
    for (const l of isl.landmarks) {
      const x = isl.x + l.x;
      const z = isl.z + l.z;
      const y = heightAt(x, z);
      const rot = l.rot ?? 0;
      switch (l.type) {
        case 'twin_palms': {
          // the "two sisters": twin dead trunks leaning apart, still the tallest things on the atoll
          coast('dead_palm_d', x - 1.2, y - 0.2, z, 0, 10 / 7, () => xf(P.deadPalm(new RNG(5), 10, 0.0), x - 1.2, y - 0.2, z, 0, 0, 0.22), 0.22);
          coast('dead_palm_d', x + 1.2, y - 0.2, z, Math.PI, 11 / 7, () => xf(P.deadPalm(new RNG(9), 11, 0.0), x + 1.2, y - 0.2, z, 0, 0, -0.22), -0.22);
          this.colliders.push({ x: x - 1.2, z, r: 0.7 }, { x: x + 1.2, z, r: 0.7 });
          break;
        }
        case 'big_palm':
          coast('dead_palm_a', x, y - 0.2, z, 0.8, 13 / 7, () => xf(P.deadPalm(new RNG(8), 13, 0.35), x, y - 0.2, z));
          this.colliders.push({ x, z, r: 0.9 });
          break;
        case 'skull_rock':
          landmark('skull_rock', x, y - 0.3, z, Math.atan2(isl.x - x, isl.z - z) + Math.PI, () => xf(P.skullRock(fr(x, z)), x, y - 0.3, z, 0, Math.atan2(isl.x - x, isl.z - z) + Math.PI, 0));
          this.colliders.push({ x, z, r: 3.4 });
          break;
        case 'lighthouse': {
          landmark('lighthouse', x, y - 0.2, z, rot, () => xf(P.lighthouse(), x, y - 0.2, z, 0, rot, 0));
          this.colliders.push({ x, z, r: 2.9 });
          const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff1b0, transparent: true, opacity: 0.0 }));
          lamp.position.set(x, y + 17.3, z);
          this.lighthouseLamp = lamp;
          this.scene.add(lamp);
          break;
        }
        case 'hut':
          landmark('hut', x, y - 0.1, z, rot, () => xf(P.hut(), x, y - 0.1, z, 0, rot, 0));
          this.colliders.push({ x, z, r: 2.6 });
          break;
        case 'wreck': {
          landmark('wreck', x, y - 0.8, z, rot, () => xf(P.brokenWreck(fr(x, z)), x, y - 0.8, z, 0, rot, 0));
          // ribs are walkable-around; collide on the hull ends
          const fx = Math.sin(rot), fz = Math.cos(rot);
          for (const k of [-8, -4, 4]) this.colliders.push({ x: x + fx * k + fz * 3.9, z: z + fz * k - fx * 3.9, r: 1.0 });
          this.colliders.push({ x: x + fx * 9.5, z: z + fz * 9.5, r: 2.5 });
          break;
        }
        case 'arch':
          landmark('sun_arch', x, y - 0.2, z, rot, () => xf(P.arch(fr(x, z)), x, y - 0.2, z, 0, rot, 0));
          for (const s of [-1, 1]) this.colliders.push({ x: x + Math.cos(rot) * s * 3.2, z: z - Math.sin(rot) * s * 3.2, r: 1.3 });
          break;
        case 'pillars':
          landmark('pillar_ring', x, y - 0.2, z, 0, () => xf(P.pillars(fr(x, z)), x, y - 0.2, z));
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;
            this.colliders.push({ x: x + Math.cos(a) * 4.5, z: z + Math.sin(a) * 4.5, r: 1 });
          }
          break;
        case 'waterfall': {
          // fresh water: a spring forced out of an old storm-drain pipe, caught in drums before it can reach the sea
          // (the spring node carries the rocks, the culvert pipe and its flange, the pool and the catch drums)
          landmark('spring', x, y - 0.5, z, 0, () =>
            merge([
              xf(P.waterfallRocks(fr(x, z)), x, y - 0.5, z),
              paint(xf(new THREE.CylinderGeometry(0.75, 0.75, 3.2, 10), x, y + 8.6, z - 1.2, Math.PI / 2, 0, 0), '#6b2e14', 0.05),
              paint(xf(new THREE.TorusGeometry(0.78, 0.14, 5, 10), x, y + 8.6, z + 0.4), '#3a4148'),
              ...[0, 1, 2, 3].map((k) => paint(xf(new THREE.CylinderGeometry(0.55, 0.55, 1.3, 9), x - 2.2 + k * 1.3, y + 0.5, z + 4.6), ['#2f6fb0', '#3e8c80', '#2f6fb0', '#a24b21'][k], 0.06)),
            ])
          );
          this.colliders.push({ x, z: z - 2, r: 5 });
          this.addWaterfall(x, y, z);
          break;
        }
        case 'cave': {
          // the mouth faces out to sea, so it is seen from the water first
          const face = Math.atan2(x - isl.x, z - isl.z);
          geos.push(xf(P.caveMouth(fr(x, z)), x, y - 0.4, z, 0, face, 0, 1.2));
          this.colliders.push({ x: x - Math.sin(face) * 3.2, z: z - Math.cos(face) * 3.2, r: 3.2 });
          for (const s2 of [-1, 1]) this.colliders.push({ x: x + Math.cos(face) * s2 * 2.8, z: z - Math.sin(face) * s2 * 2.8, r: 1.4 });
          break;
        }
        case 'boulder':
          coast('rock_a', x, y - 0.35, z, rot, 3, () => xf(P.rock(fr(x, z), 3, 0.8), x, y, z));
          this.colliders.push({ x, z, r: 2.8 });
          break;
      }
    }

    if (isl.id === 'mossjaw') this.lastGarden(isl, geos, glows);
    if (geos.length) {
      const m = new THREE.Mesh(merge(geos), vcMat());
      m.castShadow = true;
      m.receiveShadow = true;
      this.scene.add(m);
      inkWorld(m);
    }
    if (glows.length) this.scene.add(new THREE.Mesh(merge(glows), glowMat()));
    if (sway.length) {
      const m = new THREE.Mesh(merge(sway), vcMat({ sway: true, side: THREE.DoubleSide }));
      m.castShadow = true;
      this.scene.add(m);
    }
  }

  /** Canopy Rise: the exceptional settlement. The last tree, a greenhouse, guarded beds, scrap walls and a lookout. */
  private lastGarden(isl: IslandDef, geos: THREE.BufferGeometry[], glows: THREE.BufferGeometry[]) {
    const at = (lx: number, lz: number) => ({ x: isl.x + lx, z: isl.z + lz, y: heightAt(isl.x + lx, isl.z + lz) });
    const put = (node: string, file: string, lx: number, lz: number, ry = 0, sc = 1, sink = 0.2) => {
      const p = at(lx, lz);
      const k = kitGeo(file, node, p.x, p.y - sink, p.z, ry, sc);
      if (k) {
        geos.push(k.geo);
        if (k.glow) glows.push(k.glow);
      }
      return p;
    };
    const tree = put('last_tree', 'tb_flora_kit', 12, 6, 0.4, 1.25, 0.4);
    this.colliders.push({ x: tree.x, z: tree.z, r: 3.6 });
    this.landmarkGreen = new THREE.Vector3(tree.x, tree.y + 9, tree.z);
    const gh = put('greenhouse', 'tb_flora_kit', -20, -6, 0, 1, 0.1);
    for (const dx of [-2.4, 0, 2.4]) this.colliders.push({ x: gh.x + dx, z: gh.z, r: 2.3 });
    for (const [lx, lz] of [[22, 14], [22, 21]] as const) {
      const g = put('garden_plot', 'tb_flora_kit', lx, lz, 0, 1, 0.15);
      this.colliders.push({ x: g.x - 1.6, z: g.z, r: 2 }, { x: g.x + 1.6, z: g.z, r: 2 });
    }
    // the scrap ring that kept everyone else out
    const cx = 12, cz = 6, R = 24;
    for (const a of [0.15, 1.35, 4.9, 5.75]) {
      const lx = cx + Math.cos(a) * R, lz = cz + Math.sin(a) * R;
      const w = put(a > 4 ? 'atoll_wall_burnt' : 'atoll_wall', 'tb_atoll_kit', lx, lz, -a - Math.PI / 2, 0.55, 0.75);
      for (const t of [-3.4, 0, 3.4]) this.colliders.push({ x: w.x - Math.sin(a) * t, z: w.z + Math.cos(a) * t, r: 1.4 });
    }
    const lk = put('watchtower', 'tb_atoll_kit', 30, -2, 0.6, 0.85, 0.9);
    this.colliders.push({ x: lk.x, z: lk.z, r: 2.4 });
    put('rain_catcher', 'tb_outpost_kit', -12, 8, 0.3, 0.8, 0.8);
    this.colliders.push({ x: at(-12, 8).x, z: at(-12, 8).z, r: 2.2 });
  }

  private addWaterfall(x: number, y: number, z: number) {
    const tex = canvasTex(64, 256, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 64, 0);
      g.addColorStop(0, 'rgba(170,200,196,0.35)');
      g.addColorStop(0.5, 'rgba(225,240,236,0.9)');
      g.addColorStop(1, 'rgba(170,200,196,0.35)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 256);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (let i = 0; i < 40; i++) ctx.fillRect(Math.random() * 64, Math.random() * 256, 2, 10 + Math.random() * 30);
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 9, 1, 1), mat);
    fall.position.set(x, y + 4.2, z + 0.4);
    this.scene.add(fall);
    const mist = new THREE.Mesh(new THREE.CircleGeometry(1.6, 16), new THREE.MeshBasicMaterial({ color: 0xdfe8e2, transparent: true, opacity: 0.4, depthWrite: false }));
    mist.rotation.x = -Math.PI / 2;
    mist.position.set(x, y + 0.2, z + 2.2);
    this.scene.add(mist);
    this.animators.push((t) => {
      tex.offset.y = t * 1.3;
      mist.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
    });
  }

  // ───────── harbor town ─────────
  private buildHarbor() {
    const rng = new RNG(4242);
    const geos: THREE.BufferGeometry[] = [];
    const sway: THREE.BufferGeometry[] = [];
    // find shoreline along x = 0
    let shoreZ = 230;
    for (let z = 160; z < 300; z += 0.5) {
      if (heightAt(0, z) > 0.6) {
        shoreZ = z;
        break;
      }
    }
    const glows: THREE.BufferGeometry[] = [];
    const kit = (file: string, node: string, x: number, y: number, z: number, ry = 0, sc = 1, rz = 0) => {
      const k = kitGeo(file, node, x, y, z, ry, sc, rz);
      if (k) {
        geos.push(k.geo);
        if (k.glow) glows.push(k.glow);
      }
      return !!k;
    };
    // salvage architecture (src/world/shanty.ts): dwellings assembled from plank, tin, canvas and rope
    const shanty = new Shanty(new RNG(7717));
    const takeShanty = (x: number, y: number, z: number, ry = 0, sc = 1) => {
      const t = shanty.take(x, y, z, ry, sc);
      geos.push(...t.geos);
      glows.push(...t.glows);
    };
    const pierEnd = WORLD.harborDock.endZ;
    const pierStart = shoreZ + 6;
    const deckY = 1.3;
    // mismatched decking: bleached boards, a darker plank, the odd steel plate laid over a hole
    const plank = '#a2927a';
    const plank2 = '#7d6a52';
    // Driftholm's pier, built from the GITCRAFT coast kit's 4 m pier sections (planks, stringers, braced pilings, a
    // tyre fender); the code-built planks and pilings below are the fallback if the kit failed to load
    const pierKit = kitGeo('tb_coast_kit', 'pier_section', 0, deckY, 0) !== null;
    const fingers = [{ z: 186, dir: -1, len: 16 }, { z: 196, dir: 1, len: 18 }];
    if (pierKit) {
      for (let z = pierEnd + 2; z - 2 < pierStart; z += 4) kit('tb_coast_kit', 'pier_section', 0, deckY, z, rng.next() < 0.5 ? 0 : Math.PI);
      for (const f of fingers) for (let x = 2.5 + 2; x - 2 < f.len; x += 4) kit('tb_coast_kit', 'finger_section', f.dir * x, deckY, f.z, f.dir > 0 ? 0 : Math.PI);
    }
    // main pier
    for (let z = pierEnd; z < pierStart && !pierKit; z += 0.9) {
      const r = rng.next();
      geos.push(paint(xf(new THREE.BoxGeometry(r > 0.9 ? 3.4 : 5.2, 0.22, 0.82), rng.range(-0.3, 0.3), deckY, z, 0, rng.range(-0.04, 0.04), 0), r > 0.86 ? '#6f7275' : r > 0.45 ? plank : plank2, 0.1));
    }
    for (let z = pierEnd; z < pierStart && !pierKit; z += 4) {
      // pilings: old pipe, I-beam and tarred timber, whatever was long enough
      for (const sx of [-2.5, 2.5]) geos.push(paint(xf(new THREE.CylinderGeometry(0.28, 0.32, 6, 7), sx, deckY - 2.5, z), rng.pick(['#5a3a28', '#4a4d50', '#6b2e14'])));
      geos.push(paint(xf(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 8), 2.75, deckY - 0.3, z), '#222222')); // tyre fender
    }
    // finger piers
    for (const f of fingers) {
      for (let x = 2.5; x < f.len && !pierKit; x += 0.9) geos.push(paint(xf(new THREE.BoxGeometry(0.82, 0.22, 3.4), f.dir * x, deckY, f.z), rng.next() > 0.5 ? plank : plank2, 0.08));
      for (let x = 4; x < f.len && !pierKit; x += 4) for (const sz of [-1.6, 1.6]) geos.push(paint(xf(new THREE.CylinderGeometry(0.25, 0.3, 6, 7), f.dir * x, deckY - 2.5, f.z + sz), '#5e4128'));
      this.boatRects.push({ x0: Math.min(0, f.dir * f.len), x1: Math.max(0, f.dir * f.len), z0: f.z - 2, z1: f.z + 2 });
    }
    this.boatRects.push({ x0: -3, x1: 3, z0: pierEnd - 0.5, z1: pierStart });
    this.pierTip.set(5.5, 0, pierEnd + 3);
    // bollards, barrels, crates, lamps on pier
    for (let z = pierEnd + 2; z < pierStart; z += 9) {
      if (!kit('tb_coast_kit', 'bollard', 2.2, deckY + 0.1, z, rng.range(0, 6))) geos.push(paint(xf(new THREE.CylinderGeometry(0.22, 0.3, 0.6, 8), 2.2, deckY + 0.4, z), '#3b3b3b'));
      // the dock lamp's head hangs out over the deck and glows at night
      if (!kit('tb_coast_kit', 'pier_lamp', -2.2, deckY + 0.1, z + 3)) {
        geos.push(paint(xf(new THREE.CylinderGeometry(0.08, 0.1, 3, 6), -2.2, deckY + 1.6, z + 3), '#2f2f2f'));
        geos.push(paint(xf(new THREE.BoxGeometry(0.45, 0.6, 0.45), -2.2, deckY + 3.2, z + 3), '#f6d27a'));
      }
    }
    for (let i = 0; i < 6; i++) {
      const bx = rng.range(-1.8, 1.8), bz = pierStart - 3 - i * 4.5 + rng.range(-1, 1), ry = rng.range(0, 3);
      if (!kit('tb_coast_kit', 'barrel', bx, deckY + 0.1, bz, ry, 0.8)) geos.push(xf(P.barrel(), bx, deckY + 0.1, bz, 0, ry, 0, 0.8));
    }
    for (let i = 0; i < 4; i++) {
      const sc = rng.range(0.8, 1.1), cx = rng.range(-1.5, 1.5), cz = pierStart - 6 - i * 7, ry = rng.range(0, 1);
      if (!kit('tb_coast_kit', 'cargo_crate', cx, deckY + 0.1, cz, ry, 1.2 * sc)) geos.push(xf(P.crate(sc), cx, deckY + 0.1, cz, 0, ry, 0));
    }

    // the services live in salvaged containers and patchwork shacks, each with a hand-painted board
    const shops: { x: number; name: string; tint: string; sign: string; kind: 'container' | 'shack' }[] = [
      { x: -42, name: 'SHIPWRIGHT', tint: '#3f5a66', sign: '⚓', kind: 'container' },
      { x: -20, name: 'TRADER', tint: '#a8822e', sign: '⚖', kind: 'shack' },
      { x: 20, name: 'CHARTS', tint: '#3e6a60', sign: '⌖', kind: 'shack' },
      { x: 42, name: 'CURIOS', tint: '#8a3226', sign: '✦', kind: 'container' },
    ];
    for (const s of shops) {
      const z = shoreZ + 14;
      const y = heightAt(s.x, z);
      if (s.kind === 'container') kit('tb_atoll_kit', 'container_home', s.x, y - 0.95, z + 0.5, Math.PI, 0.82);
      else {
        // a two-storey shopfront facing the harbour, its stall out front
        shanty.dwelling({ base: 'ground', storeys: 2, roof: 'gable', accent: 'mast', awning: false, w: 7, d: 6.4, lit: true });
        takeShanty(s.x, y - 0.1, z, Math.PI);
        kit('tb_outpost_kit', 'market_stall', s.x + 1, y - 0.9, z - 5.5, Math.PI, 0.75);
      }
      this.addSign(s.name, s.sign, s.x, y + 6.0, z - 4.2, s.tint);
      this.colliders.push({ x: s.x, z, r: 6 });
      // shopkeeper
      const npc = new THREE.Mesh(P.person(rng, s.tint, rng.next() > 0.5 ? '#3b2a1e' : null), vcMat());
      // stand in front of the counter (shack shops have a market stall out front), feet on the ground
      const nz = z - (s.kind === 'shack' ? 10.5 : 7);
      npc.position.set(s.x + 1.5, Math.max(heightAt(s.x + 1.5, nz), 0.2), nz);
      npc.rotation.y = rng.range(-0.4, 0.4);
      this.scene.add(npc);
      this.npcs.push(npc);
    }
    // shipwright slipway with a hull frame under construction
    {
      const x = -62, z = shoreZ + 4;
      const y = heightAt(x, z);
      if (!kit('tb_landmark_kit', 'slipway', x, y, z)) {
        for (let i = 0; i < 7; i++) {
          const rib = new THREE.TorusGeometry(2.6 - Math.abs(i - 3) * 0.25, 0.16, 4, 8, Math.PI);
          geos.push(paint(xf(rib, x, y + 2.8, z - 6 + i * 1.6, 0, 0, Math.PI), i % 3 ? '#8a4a26' : '#6f7275')); // ribs cut from old steel
        }
        geos.push(paint(xf(new THREE.BoxGeometry(0.4, 0.4, 12), x, y + 0.3, z - 1.2), '#6e4527'));
      }
      for (let i = 0; i < 4; i++) {
        const cx = x + 5 + rng.range(-1, 1), cz = z - 4 + i * 2.2;
        if (!kit('tb_coast_kit', 'cargo_crate', cx, y, cz, i * 0.4, 1.08)) geos.push(xf(P.crate(0.9), cx, y, cz));
      }
    }
    // the shanty climbing the hill: stacked containers, raft shacks hauled ashore, tanks and rain catchers
    const spots: [number, number][] = [];
    for (let i = 0; i < 40 && spots.length < 16; i++) {
      const x = rng.range(-88, 88);
      const z = shoreZ + rng.range(28, 80);
      if (Math.abs(x) < 9 && z < shoreZ + 36) continue;
      if (Math.abs(x - 14) < 12 && Math.abs(z - (shoreZ + 42)) < 10) continue; // the guarded garden
      if (spots.some(([a, b]) => Math.hypot(a - x, b - z) < 13)) continue;
      if (heightAt(x, z) < 1) continue;
      spots.push([x, z]);
    }
    spots.forEach(([x, z], i) => {
      const y = heightAt(x, z);
      const ry = rng.range(-0.4, 0.4) + (i % 2 ? Math.PI : 0);
      const pick = i % 5;
      // mostly homes built from salvage, facing down to the harbour; the odd stacked container and rain catcher
      if (pick === 3) kit('tb_atoll_kit', 'container_home', x, y - 0.95, z, ry, 0.7);
      else if (pick === 2 && i % 2) kit('tb_outpost_kit', 'rain_catcher', x, y - 0.9, z, ry, 0.9);
      else {
        shanty.dwelling({ base: 'ground', storeys: i % 4 === 0 ? 2 : 1 });
        takeShanty(x, y - 0.1, z, Math.PI + rng.range(-0.35, 0.35), rng.range(0.95, 1.15));
      }
      this.colliders.push({ x, z, r: pick === 0 || pick === 3 ? 5 : 3.6 });
    });
    // the freshwater tank stands highest, where everyone can see it is still full
    {
      const x = -26, z = shoreZ + 40;
      kit('tb_atoll_kit', 'water_tank', x, heightAt(x, z) - 0.95, z, 0.3, 1.0);
      this.colliders.push({ x, z, r: 4.6 });
    }
    // the guarded garden: a greenhouse and a bed of green behind a scrap fence
    {
      const x = 14, z = shoreZ + 42;
      const y = heightAt(x, z);
      kit('tb_flora_kit', 'greenhouse', x, y - 0.15, z, 0.2, 1.0);
      kit('tb_flora_kit', 'garden_plot', x + 0.5, heightAt(x, z + 6) - 0.2, z + 6.5, 0.2, 0.9);
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2;
        const fx = x + Math.cos(a) * 7.5, fz = z + 3 + Math.sin(a) * 7;
        const tilt = rng.range(-0.06, 0.06), tint = rng.pick(['#7f8a94', '#a24b21', '#3e8c80', '#8e918c', '#6b2e14']);
        if (!kit('tb_coast_kit', 'fence_panel', fx, heightAt(fx, fz) - 0.2, fz, -a + Math.PI / 2, 1, tilt))
          geos.push(paint(xf(new THREE.BoxGeometry(4.6, 1.6, 0.12), fx, heightAt(fx, fz) + 0.6, fz, 0, -a + Math.PI / 2, tilt), tint));
      }
      this.colliders.push({ x, z, r: 4 }, { x, z: z + 6.5, r: 3 });
      this.gardenGlow = new THREE.Vector3(x, y + 2, z);
    }
    // a little watchtower with a big flag
    {
      const x = 18, z = shoreZ + 3;
      const y = heightAt(x, z);
      kit('tb_atoll_kit', 'watchtower', x, y - 0.95, z, 0.4, 0.9);
      if (!kit('tb_coast_kit', 'flagpole', x, y + 11, z)) geos.push(paint(xf(new THREE.CylinderGeometry(0.08, 0.08, 6, 5), x, y + 14, z), '#3b3b3b'));
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.8, 8, 2), toonMat('#7a3a22', { side: THREE.DoubleSide }));
      flag.position.set(x + 1.5, y + 16, z);
      this.scene.add(flag);
      const fp = flag.geometry.attributes.position;
      const base = Float32Array.from(fp.array as Float32Array);
      this.animators.push((t) => {
        for (let i = 0; i < fp.count; i++) {
          const px = base[i * 3];
          fp.setZ(i, Math.sin(px * 2.2 - t * 6) * 0.25 * (px + 1.5) / 3);
        }
        fp.needsUpdate = true;
      });
    }
    // scavenger boats tied up along the fingers: patched hulls, outboards, tarps, every one different
    for (let i = 0; i < 5; i++) {
      const f = fingers[i % 2];
      const x = f.dir * (5 + (i >> 1) * 5.5);
      const z = f.z + (i % 2 ? -4 : 4) * (i > 2 ? -1 : 1);
      const g = model('tb_outpost_kit', 'scrap_boat') ?? new THREE.Group();
      g.scale.setScalar(rng.range(0.85, 1.05));
      g.traverse((o) => ((o as THREE.Mesh).isMesh && (o.castShadow = true)));
      g.position.set(x, 0.1, z);
      g.rotation.y = rng.range(-0.2, 0.2) + (i % 2 ? Math.PI : 0);
      this.scene.add(g);
      const ph = rng.range(0, 6);
      this.animators.push((t) => {
        g.position.y = 0.05 + Math.sin(t * 1.3 + ph) * 0.12;
        g.rotation.z = Math.sin(t * 1.1 + ph) * 0.04;
      });
      this.boatRects.push({ x0: x - 1.3, x1: x + 1.3, z0: z - 3, z1: z + 3 });
    }
    // the waterfront: nets drying on poles, a scrap heap, two dead trees nobody has cut for firewood yet
    for (const [x, kind] of [[-30, 'net_tower'], [33, 'net_tower'], [-70, 'scrap_heap'], [64, 'dead_tree'], [-82, 'dead_tree'], [78, 'scrap_heap']] as const) {
      const z = shoreZ + 3 + (kind === 'dead_tree' ? 5 : 0);
      const y = heightAt(x, z);
      if (y < 0.2) continue;
      kit('tb_outpost_kit', kind, x, y - (kind === 'net_tower' ? 0.9 : 0.2), z, rng.range(0, 6), kind === 'net_tower' ? 0.9 : 1);
      this.colliders.push({ x, z, r: 1.8 });
    }
    // dockside folks
    for (let i = 0; i < 4; i++) {
      const npc = new THREE.Mesh(P.person(rng, rng.pick(['#7a4a36', '#3d4248', '#56685c', '#8a7a52']), rng.next() > 0.5 ? '#2b1d14' : null), vcMat());
      npc.position.set(rng.range(-1.5, 1.5), deckY + 0.1, pierStart - 8 - i * 9);
      npc.rotation.y = rng.range(0, Math.PI * 2);
      this.scene.add(npc);
      this.npcs.push(npc);
    }
    this.animators.push((t) => {
      if (this.folk.length) return;
      this.npcs.forEach((n, i) => {
        n.scale.y = 1 + Math.sin(t * 2 + i) * 0.02;
        n.rotation.y += Math.sin(t * 0.3 + i * 2) * 0.002;
      });
    });

    // Jury-Rigged (?look=jury): the Signal Stack, the pier's lifeboat and lobster pots, and the Rustfang Toll outside
    // the harbour, merged into this same batch (src/world/jury.ts). Nothing here runs in the default look.
    if (jury()) this.buildJury(geos, glows, shoreZ, pierEnd, deckY);
    const merged = merge(geos);
    const m = new THREE.Mesh(merged, vcMat({ accent: !!merged.attributes.accent }));
    m.castShadow = true;
    m.receiveShadow = true;
    this.scene.add(m);
    inkWorld(m);
    if (glows.length) this.scene.add(new THREE.Mesh(merge(glows), glowMat()));
    if (sway.length) {
      const s = new THREE.Mesh(merge(sway), vcMat({ sway: true, side: THREE.DoubleSide }));
      s.castShadow = true;
      this.scene.add(s);
    }
  }

  /** Measurement hooks for docs/jury-rigged (scripts/jury-shots.mjs): the Signal Stack and the rest of the town. */
  juryProbe: { stackBase: THREE.Vector3; stackTop: THREE.Vector3; town: THREE.Box3[] } | null = null;

  private buildJury(geos: THREE.BufferGeometry[], glows: THREE.BufferGeometry[], shoreZ: number, pierEnd: number, deckY: number) {
    const town = geos.map((g) => (g.computeBoundingBox(), g.boundingBox!.clone()));
    const k = new Kit();
    // the Signal Stack on the beach east of the pier root, centre stage from the harbour mouth
    const sx = 12, sz = shoreZ - 1;
    const sy = Math.max(heightAt(sx, sz), 0.2) - 0.15;
    const st = signalStack(k);
    k.place(st.start, sx, sy, sz, 0.12);
    const mGlow = new THREE.Matrix4().compose(new THREE.Vector3(sx, sy, sz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.12, 0)), new THREE.Vector3(1, 1, 1));
    for (const g of k.glows.slice(st.startGlow)) g.applyMatrix4(mGlow);
    this.colliders.push({ x: sx, z: sz, r: 5 });
    // the pier: a bath for a lifeboat on the east side, trolley lobster pots on the west edge
    const bt = bathtubLifeboat(k, 1);
    k.place(bt, 1.9, deckY + 0.1, pierEnd + 14, 0);
    const tp = trolleyPots(k);
    k.place(tp, -1.55, deckY + 0.11, pierEnd + 23, 0);
    // the toll, out on the approach
    const tg = tollGate(k);
    k.place(tg.start, TOLL.x, 0.1, TOLL.z, TOLL.ry);
    const mT = new THREE.Matrix4().compose(new THREE.Vector3(TOLL.x, 0.1, TOLL.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, TOLL.ry, 0)), new THREE.Vector3(1, 1, 1));
    for (const g of k.glows.slice(tg.startGlow)) g.applyMatrix4(mT);
    geos.push(...k.geos);
    glows.push(...k.glows);
    this.juryProbe = { stackBase: new THREE.Vector3(sx, sy, sz), stackTop: new THREE.Vector3(sx, sy + st.height, sz), town };
  }

  /** A hand-painted board nailed to the front: stencil letters on scrap, paint runs, a coloured stripe. */
  private addSign(text: string, glyph: string, x: number, y: number, z: number, tint = '#3e6a60') {
    const tex = canvasTex(512, 128, (ctx) => {
      ctx.fillStyle = '#6f6656';
      ctx.fillRect(0, 0, 512, 128);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = ['#7d7362', '#625a4c', '#857a66', '#5a5245'][i];
        ctx.fillRect(0, i * 32, 512, 30);
      }
      ctx.fillStyle = tint;
      ctx.fillRect(0, 96, 512, 14);
      ctx.fillStyle = 'rgba(60,30,15,.5)';
      for (let i = 0; i < 9; i++) ctx.fillRect(Math.random() * 500, Math.random() * 120, 3 + Math.random() * 10, 2 + Math.random() * 6);
      ctx.fillStyle = '#e8dfc8';
      ctx.font = '900 62px "Saira Stencil One", Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${glyph} ${text}`, 256, 52);
      ctx.fillStyle = 'rgba(232,223,200,.55)';
      for (let i = 0; i < 6; i++) ctx.fillRect(90 + Math.random() * 330, 76, 3, 6 + Math.random() * 16); // paint runs
      ctx.fillStyle = '#2a2a2a';
      for (const px of [14, 498]) for (const py of [16, 112]) ctx.fillRect(px - 3, py - 3, 6, 6);
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ map: tex }));
    sign.position.set(x, y, z);
    sign.rotation.y = Math.PI;
    sign.rotation.z = (Math.random() - 0.5) * 0.06;
    this.scene.add(sign);
  }

  /** Swap the stand-in townsfolk for the rigged GITCRAFT survivors once they have streamed in. */
  upgradeNpcs() {
    if (this.folk.length) return;
    const kinds = ['tb_npc_trader', 'tb_npc_elder', 'tb_npc_dockhand'];
    this.npcs = this.npcs.map((old, i) => {
      const c = characterModel(kinds[(i * 2 + (i > 3 ? 1 : 0)) % kinds.length]);
      if (!c) return old;
      c.root.position.copy(old.position);
      c.root.rotation.y = old.rotation.y;
      c.root.scale.setScalar(0.95 + ((i * 37) % 10) / 100);
      c.root.traverse((o) => (o.castShadow = true));
      this.scene.add(c.root);
      this.scene.remove(old);
      const idle = c.actions.Idle;
      if (idle) {
        idle.time = i * 1.3;
        idle.timeScale = 0.9 + (i % 3) * 0.08;
        idle.play();
      }
      this.folk.push({ c, next: 4 + i * 2.7 });
      return c.root;
    });
  }

  update(t: number, dt: number) {
    for (const a of this.animators) a(t, dt);
    for (const f of this.folk) {
      // now and then somebody waves at a passing boat or haggles over the counter
      f.next -= dt;
      if (f.next <= 0 && f.c.actions.Interact && f.c.actions.Idle) {
        f.next = 9 + Math.random() * 12;
        const it = f.c.actions.Interact;
        it.reset().setLoop(THREE.LoopOnce, 1).play();
        f.c.actions.Idle.crossFadeTo(it, 0.3, false);
        setTimeout(() => {
          f.c.actions.Idle.reset().play();
          it.crossFadeTo(f.c.actions.Idle, 0.4, false);
        }, it.getClip().duration * 1000 - 300);
      }
      if (f.c.root.visible) f.c.mixer.update(dt);
    }
    if (this.lighthouseLamp) {
      (this.lighthouseLamp.material as THREE.MeshBasicMaterial).opacity = 0.0;
    }
  }
}

function terrainColor(c: THREE.Color, x: number, z: number, h: number, slope: number, style: IslandDef['style']) {
  const n = fbm(x * 0.08, z * 0.08, 2, 3);
  if (h < -0.2) {
    // silted seabed: grey mud fading to murky teal-black in deeper water
    const d = Math.min(1, -h / 14);
    c.set('#6f6a58').lerp(new THREE.Color('#1c3433'), Math.pow(d, 0.7));
    c.multiplyScalar(0.88 + n * 0.2);
    return;
  }
  if (h < 0.55) {
    // the tide line: wet, oily sand with tar smears
    c.set('#5e5646').multiplyScalar(0.9 + n * 0.16);
    if (fbm(x * 0.21 + 9, z * 0.21, 2, 5) > 0.62) c.lerp(new THREE.Color('#1d1a17'), 0.65);
    return;
  }
  // salt-bleached grey sand, dead khaki scrub, the odd sickly green hollow, scorched rock
  const sand = new THREE.Color(style === 'harbor' ? '#8a8170' : '#9a8f78');
  // no living green on open ground: dead khaki scrub, packed mud, salt crust. Canopy Rise ('jungle') is dark terraced soil.
  const grassBase = style === 'jungle' ? '#4f4634' : style === 'rocky' ? '#78705a' : style === 'harbor' ? '#6c6452' : '#7d7258';
  const grass = new THREE.Color(grassBase);
  const rockC = new THREE.Color(style === 'jungle' ? '#4f5248' : '#5d5650');
  const grassLine = style === 'sandbar' ? 99 : style === 'rocky' ? 2.2 : 1.6;
  const gt = Math.min(1, Math.max(0, (h - grassLine) / 0.9 + (n - 0.5) * 0.8));
  c.copy(sand).lerp(grass, gt);
  if (gt > 0.3) {
    const patch = fbm(x * 0.025 + 40, z * 0.025, 3, 8);
    c.lerp(new THREE.Color(style === 'jungle' ? '#3a3026' : '#4c4638'), Math.max(0, (patch - 0.45) * 1.6) * gt); // damp mud hollows
    c.lerp(new THREE.Color('#a39a86'), Math.max(0, (0.45 - patch) * 1.4) * gt); // salt-crusted, sun-dried patches
  }
  const rt = Math.min(1, Math.max(0, (slope - (style === 'rocky' ? 0.55 : 0.8)) * 2.5));
  c.lerp(rockC, rt);
  // scattered scorch and rust bleed from buried junk
  const junk = fbm(x * 0.13 - 17, z * 0.13 + 4, 2, 11);
  if (junk > 0.64) c.lerp(new THREE.Color(style === 'jungle' ? '#3f3428' : '#5a3220'), Math.min(1, (junk - 0.64) * 4) * (style === 'jungle' ? 0.3 : 0.5));
  c.multiplyScalar(0.9 + n * 0.16);
}
