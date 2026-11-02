// Builds all static world geometry from data: terrain, foliage, landmarks, the harbor town.
import * as THREE from 'three';
import { ISLANDS, WORLD, TREASURE_MAPS, type IslandDef } from '../data/world';
import { heightAt } from './terrain';
import { vcMat, merge, paint, xf, canvasTex, toonMat } from './materials';
import * as P from './props';
import { RNG, fbm } from '../core/noise';

export interface Collider { x: number; z: number; r: number }
export interface Rect { x0: number; x1: number; z0: number; z1: number }

export class Environment {
  colliders: Collider[] = [];
  boatRects: Rect[] = [];
  animators: ((t: number, dt: number) => void)[] = [];
  pierTip = new THREE.Vector3();
  npcs: THREE.Object3D[] = [];
  lighthouseLamp?: THREE.Mesh;

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
    const exclude: { x: number; z: number; r: number }[] = [];
    for (const l of isl.landmarks) exclude.push({ x: isl.x + l.x, z: isl.z + l.z, r: l.type === 'wreck' ? 14 : l.type === 'lighthouse' ? 6 : 5 });
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

    const leaf = isl.style === 'jungle' ? '#2f9a3e' : '#45b54d';
    const leafDark = isl.style === 'jungle' ? '#16602a' : '#1f7a37';
    for (let i = 0; i < isl.palms; i++) {
      place(40, 0.5, 6, 0.6, 1.4, (x, y, z) => {
        sway.push(xf(P.palm(rng, rng.range(6, 9.5), rng.range(0.15, 0.45), leaf, leafDark), x, y - 0.2, z));
        this.colliders.push({ x, z, r: 0.7 });
      });
    }
    for (let i = 0; i < isl.rocks; i++) {
      place(30, -1.2, 20, 2, 1.5, (x, y, z) => {
        const s = rng.range(0.8, isl.style === 'rocky' ? 3.2 : 2.2);
        geos.push(xf(P.rock(rng, s, rng.range(0.5, 0.85), isl.style === 'jungle' ? '#8c9484' : '#a69a8c', isl.style === 'jungle'), x, y + s * 0.15, z, 0, rng.range(0, 6), 0));
        if (y > -0.3) this.colliders.push({ x, z, r: s * 0.9 });
      });
    }
    for (let i = 0; i < isl.foliage; i++) {
      place(30, 1.0, 30, 1.2, 1.6, (x, y, z) => {
        const kind = rng.next();
        if (kind < 0.45) sway.push(xf(P.bigLeaves(rng, rng.range(0.9, 1.6), isl.style === 'jungle' ? '#2f8f3a' : '#3fa84a'), x, y, z));
        else if (kind < 0.8) sway.push(xf(P.bush(rng, rng.range(0.8, 1.4), isl.style === 'jungle' ? '#2e8a3c' : '#52b84a'), x, y - 0.1, z));
        else sway.push(xf(P.grassTuft(rng), x, y, z));
      });
    }
    // grass tufts everywhere for richness
    for (let i = 0; i < isl.r * 2.4; i++) {
      place(6, 1.0, 30, 1.5, 0.3, (x, y, z) => sway.push(xf(P.grassTuft(rng, isl.style === 'jungle' ? '#3d9e45' : '#7ccc55'), x, y, z)));
    }

    // landmarks
    for (const l of isl.landmarks) {
      const x = isl.x + l.x;
      const z = isl.z + l.z;
      const y = heightAt(x, z);
      const rot = l.rot ?? 0;
      switch (l.type) {
        case 'twin_palms': {
          const a = P.palm(new RNG(5), 10, 0.0);
          sway.push(xf(a, x - 1.2, y - 0.2, z, 0, 0, 0.22));
          sway.push(xf(P.palm(new RNG(6), 11, 0.0), x + 1.2, y - 0.2, z, 0, 0, -0.22));
          this.colliders.push({ x: x - 1.2, z, r: 0.7 }, { x: x + 1.2, z, r: 0.7 });
          break;
        }
        case 'big_palm':
          sway.push(xf(P.palm(new RNG(8), 14, 0.35), x, y - 0.2, z));
          this.colliders.push({ x, z, r: 0.9 });
          break;
        case 'skull_rock':
          geos.push(xf(P.skullRock(rng), x, y - 0.3, z, 0, Math.atan2(isl.x - x, isl.z - z) + Math.PI, 0));
          this.colliders.push({ x, z, r: 3.4 });
          break;
        case 'lighthouse': {
          geos.push(xf(P.lighthouse(), x, y - 0.2, z, 0, rot, 0));
          this.colliders.push({ x, z, r: 2.9 });
          const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff1b0, transparent: true, opacity: 0.0 }));
          lamp.position.set(x, y + 17.3, z);
          this.lighthouseLamp = lamp;
          this.scene.add(lamp);
          break;
        }
        case 'hut':
          geos.push(xf(P.hut(), x, y - 0.1, z, 0, rot, 0));
          this.colliders.push({ x, z, r: 2.6 });
          break;
        case 'wreck': {
          geos.push(xf(P.brokenWreck(rng), x, y - 0.8, z, 0, rot, 0));
          // ribs are walkable-around; collide on the hull ends
          const fx = Math.sin(rot), fz = Math.cos(rot);
          for (const k of [-8, -4, 4]) this.colliders.push({ x: x + fx * k + fz * 3.9, z: z + fz * k - fx * 3.9, r: 1.0 });
          this.colliders.push({ x: x + fx * 9.5, z: z + fz * 9.5, r: 2.5 });
          break;
        }
        case 'arch':
          geos.push(xf(P.arch(rng), x, y - 0.2, z, 0, rot, 0));
          for (const s of [-1, 1]) this.colliders.push({ x: x + Math.cos(rot) * s * 3.2, z: z - Math.sin(rot) * s * 3.2, r: 1.3 });
          break;
        case 'pillars':
          geos.push(xf(P.pillars(rng), x, y - 0.2, z));
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;
            this.colliders.push({ x: x + Math.cos(a) * 4.5, z: z + Math.sin(a) * 4.5, r: 1 });
          }
          break;
        case 'waterfall': {
          geos.push(xf(P.waterfallRocks(rng), x, y - 0.5, z));
          this.colliders.push({ x, z: z - 2, r: 5 });
          this.addWaterfall(x, y, z);
          break;
        }
        case 'boulder':
          geos.push(xf(P.rock(rng, 3, 0.8), x, y, z));
          this.colliders.push({ x, z, r: 2.8 });
          break;
      }
    }

    if (geos.length) {
      const m = new THREE.Mesh(merge(geos), vcMat());
      m.castShadow = true;
      m.receiveShadow = true;
      this.scene.add(m);
    }
    if (sway.length) {
      const m = new THREE.Mesh(merge(sway), vcMat({ sway: true, side: THREE.DoubleSide }));
      m.castShadow = true;
      this.scene.add(m);
    }
  }

  private addWaterfall(x: number, y: number, z: number) {
    const tex = canvasTex(64, 256, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 64, 0);
      g.addColorStop(0, 'rgba(160,230,255,0.5)');
      g.addColorStop(0.5, 'rgba(240,255,255,0.95)');
      g.addColorStop(1, 'rgba(160,230,255,0.5)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 256);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (let i = 0; i < 40; i++) ctx.fillRect(Math.random() * 64, Math.random() * 256, 2, 10 + Math.random() * 30);
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 9, 1, 1), mat);
    fall.position.set(x, y + 4.2, z + 0.4);
    this.scene.add(fall);
    const mist = new THREE.Mesh(new THREE.CircleGeometry(3, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }));
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
    const pierEnd = WORLD.harborDock.endZ;
    const pierStart = shoreZ + 6;
    const deckY = 1.3;
    const plank = '#a3784c';
    const plank2 = '#8f6640';
    // main pier
    for (let z = pierEnd; z < pierStart; z += 0.9) {
      geos.push(paint(xf(new THREE.BoxGeometry(5.2, 0.22, 0.82), rng.range(-0.05, 0.05), deckY, z, 0, rng.range(-0.02, 0.02), 0), rng.next() > 0.5 ? plank : plank2, 0.08));
    }
    for (let z = pierEnd; z < pierStart; z += 4) {
      for (const sx of [-2.5, 2.5]) geos.push(paint(xf(new THREE.CylinderGeometry(0.28, 0.32, 6, 7), sx, deckY - 2.5, z), '#5e4128'));
    }
    // finger piers
    const fingers = [{ z: 186, dir: -1, len: 16 }, { z: 196, dir: 1, len: 18 }];
    for (const f of fingers) {
      for (let x = 2.5; x < f.len; x += 0.9) geos.push(paint(xf(new THREE.BoxGeometry(0.82, 0.22, 3.4), f.dir * x, deckY, f.z), rng.next() > 0.5 ? plank : plank2, 0.08));
      for (let x = 4; x < f.len; x += 4) for (const sz of [-1.6, 1.6]) geos.push(paint(xf(new THREE.CylinderGeometry(0.25, 0.3, 6, 7), f.dir * x, deckY - 2.5, f.z + sz), '#5e4128'));
      this.boatRects.push({ x0: Math.min(0, f.dir * f.len), x1: Math.max(0, f.dir * f.len), z0: f.z - 2, z1: f.z + 2 });
    }
    this.boatRects.push({ x0: -3, x1: 3, z0: pierEnd - 0.5, z1: pierStart });
    this.pierTip.set(5.5, 0, pierEnd + 3);
    // bollards, barrels, crates, lamps on pier
    for (let z = pierEnd + 2; z < pierStart; z += 9) {
      geos.push(paint(xf(new THREE.CylinderGeometry(0.22, 0.3, 0.6, 8), 2.2, deckY + 0.4, z), '#3b3b3b'));
      const lamp = new THREE.Group();
      geos.push(paint(xf(new THREE.CylinderGeometry(0.08, 0.1, 3, 6), -2.2, deckY + 1.6, z + 3), '#2f2f2f'));
      geos.push(paint(xf(new THREE.BoxGeometry(0.45, 0.6, 0.45), -2.2, deckY + 3.2, z + 3), '#f6d27a'));
      void lamp;
    }
    for (let i = 0; i < 6; i++) geos.push(xf(P.barrel(), rng.range(-1.8, 1.8) + (i % 2 ? 0 : 0), deckY + 0.1, pierStart - 3 - i * 4.5 + rng.range(-1, 1), 0, rng.range(0, 3), 0, 0.8));
    for (let i = 0; i < 4; i++) geos.push(xf(P.crate(rng.range(0.8, 1.1)), rng.range(-1.5, 1.5), deckY + 0.1, pierStart - 6 - i * 7, 0, rng.range(0, 1), 0));

    // shops along the waterfront (decorative, each matches a harbor service)
    const shops: { x: number; name: string; wall: string; roof: string; awning: [string, string]; sign: string }[] = [
      { x: -42, name: 'SHIPWRIGHT', wall: '#d4b48a', roof: '#7a4a2a', awning: ['#2f6fb0', '#f2ead8'], sign: '⚓' },
      { x: -20, name: 'APPRAISER', wall: '#f0d8a8', roof: '#b0472f', awning: ['#e0a92a', '#fff4d6'], sign: '⚖' },
      { x: 20, name: 'MAPS', wall: '#cfe0d2', roof: '#3d6b5a', awning: ['#2e8b7a', '#f2ead8'], sign: '⌖' },
      { x: 42, name: 'CURIOS', wall: '#f2c9c0', roof: '#6b3a5a', awning: ['#c0392b', '#fff4d6'], sign: '✦' },
    ];
    for (const s of shops) {
      const z = shoreZ + 14;
      const y = heightAt(s.x, z);
      geos.push(paint(xf(new THREE.BoxGeometry(10, 5.5, 8), s.x, y + 2.75, z), s.wall, 0.04));
      geos.push(paint(xf(new THREE.ConeGeometry(7.6, 3.6, 4), s.x, y + 7.3, z, 0, Math.PI / 4, 0, [1.05, 1, 0.85]), s.roof, 0.05));
      geos.push(paint(xf(new THREE.BoxGeometry(1.8, 3, 0.3), s.x, y + 1.5, z - 4.05), '#5a3a1e'));
      geos.push(paint(xf(new THREE.BoxGeometry(1.6, 1.4, 0.2), s.x - 3, y + 3.2, z - 4.05), '#2a4058'));
      geos.push(paint(xf(new THREE.BoxGeometry(1.6, 1.4, 0.2), s.x + 3, y + 3.2, z - 4.05), '#2a4058'));
      // striped awning
      for (let i = 0; i < 8; i++) {
        const seg = new THREE.BoxGeometry(1.25, 0.12, 3);
        geos.push(paint(xf(seg, s.x - 4.4 + i * 1.25, y + 4.6, z - 5.4, -0.35, 0, 0), i % 2 ? s.awning[0] : s.awning[1]));
      }
      for (const sx of [-4.8, 4.8]) geos.push(paint(xf(new THREE.CylinderGeometry(0.1, 0.1, 4.2, 6), s.x + sx, y + 2.1, z - 6.6), '#5e4128'));
      this.addSign(s.name, s.sign, s.x, y + 6.0, z - 4.2);
      this.colliders.push({ x: s.x, z, r: 6 });
      // shopkeeper
      const npc = new THREE.Mesh(P.person(rng, s.awning[0], rng.next() > 0.5 ? '#3b2a1e' : null), vcMat());
      npc.position.set(s.x + 1.5, y, z - 7);
      npc.rotation.y = rng.range(-0.4, 0.4);
      this.scene.add(npc);
      this.npcs.push(npc);
    }
    // shipwright slipway with a hull frame under construction
    {
      const x = -62, z = shoreZ + 4;
      const y = heightAt(x, z);
      for (let i = 0; i < 7; i++) {
        const rib = new THREE.TorusGeometry(2.6 - Math.abs(i - 3) * 0.25, 0.16, 4, 8, Math.PI);
        geos.push(paint(xf(rib, x, y + 2.8, z - 6 + i * 1.6, 0, 0, Math.PI), '#b48a5a'));
      }
      geos.push(paint(xf(new THREE.BoxGeometry(0.4, 0.4, 12), x, y + 0.3, z - 1.2), '#6e4527'));
      for (let i = 0; i < 4; i++) geos.push(xf(P.crate(0.9), x + 5 + rng.range(-1, 1), y, z - 4 + i * 2.2));
    }
    // houses climbing the hill
    const houseCols = ['#f7e1a0', '#a8d8ea', '#f4b6a6', '#c7e8b5', '#fdf1d6', '#e4c1f9', '#ffd6a5'];
    const roofCols = ['#b0472f', '#3d6b5a', '#2f4f7a', '#7a4a2a', '#8a3b5a'];
    for (let i = 0; i < 26; i++) {
      const x = rng.range(-90, 90);
      const z = shoreZ + rng.range(26, 85);
      if (Math.abs(x) < 8 && z < shoreZ + 34) continue;
      const y = heightAt(x, z);
      if (y < 1) continue;
      const w = rng.range(4, 6.5), h = rng.range(3.5, 6), d = rng.range(4, 6);
      const ry = rng.range(-0.3, 0.3);
      geos.push(paint(xf(new THREE.BoxGeometry(w, h, d), x, y + h / 2 - 0.3, z, 0, ry, 0), rng.pick(houseCols), 0.04));
      geos.push(paint(xf(new THREE.ConeGeometry(Math.max(w, d) * 0.78, 2.6, 4), x, y + h + 1.0, z, 0, Math.PI / 4 + ry, 0, [1, 1, d / w]), rng.pick(roofCols), 0.05));
      geos.push(paint(xf(new THREE.BoxGeometry(0.9, 1.1, 0.1), x, y + h * 0.6, z - d / 2 - 0.05, 0, ry, 0), '#2a4058'));
    }
    // a little watchtower with a big flag
    {
      const x = 18, z = shoreZ + 3;
      const y = heightAt(x, z);
      for (const [dx, dz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) geos.push(paint(xf(new THREE.CylinderGeometry(0.2, 0.25, 9, 6), x + dx, y + 4.5, z + dz), '#6e4527'));
      geos.push(paint(xf(new THREE.BoxGeometry(3.4, 0.4, 3.4), x, y + 9, z), '#8f6640'));
      geos.push(paint(xf(new THREE.ConeGeometry(2.8, 2.2, 4), x, y + 10.8, z, 0, Math.PI / 4, 0), '#b0472f'));
      geos.push(paint(xf(new THREE.CylinderGeometry(0.08, 0.08, 6, 5), x, y + 14, z), '#3b3b3b'));
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.8, 8, 2), toonMat('#3a86ff', { side: THREE.DoubleSide }));
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
    // moored boats around the fingers for life
    const boatCols = ['#c0392b', '#2f6fb0', '#e0a92a', '#4fb39a'];
    for (let i = 0; i < 5; i++) {
      const f = fingers[i % 2];
      const x = f.dir * (5 + (i >> 1) * 5.5);
      const z = f.z + (i % 2 ? -4 : 4) * (i > 2 ? -1 : 1);
      const g = new THREE.Group();
      const hull = new THREE.Mesh(merge([
        paint(xf(new THREE.CylinderGeometry(1.2, 0.7, 5.5, 10, 1, false, 0, Math.PI), 0, 0, 0, Math.PI / 2, 0, Math.PI), rng.pick(boatCols)),
        paint(xf(new THREE.BoxGeometry(2.2, 0.15, 5), 0, 0.05, 0), '#a3784c'),
        paint(xf(new THREE.CylinderGeometry(0.07, 0.08, 5, 5), 0, 2.5, 0.3), '#6e4527'),
      ]), vcMat());
      g.add(hull);
      g.position.set(x, 0.1, z);
      g.rotation.y = rng.range(-0.2, 0.2);
      this.scene.add(g);
      const ph = rng.range(0, 6);
      this.animators.push((t) => {
        g.position.y = 0.15 + Math.sin(t * 1.3 + ph) * 0.12;
        g.rotation.z = Math.sin(t * 1.1 + ph) * 0.04;
      });
      this.boatRects.push({ x0: x - 1.3, x1: x + 1.3, z0: z - 3, z1: z + 3 });
    }
    // waterfront palms
    for (let i = 0; i < 10; i++) {
      const x = (i < 5 ? -1 : 1) * rng.range(12, 95);
      const z = shoreZ + rng.range(-1, 6);
      const y = heightAt(x, z);
      if (y < 0.4) continue;
      sway.push(xf(P.palm(rng, rng.range(6, 9), 0.3), x, y - 0.2, z));
    }
    // dockside folks
    for (let i = 0; i < 4; i++) {
      const npc = new THREE.Mesh(P.person(rng, rng.pick(['#e07a5f', '#3d405b', '#81b29a', '#f2cc8f']), rng.next() > 0.5 ? '#2b1d14' : null), vcMat());
      npc.position.set(rng.range(-1.5, 1.5), deckY + 0.1, pierStart - 8 - i * 9);
      npc.rotation.y = rng.range(0, Math.PI * 2);
      this.scene.add(npc);
      this.npcs.push(npc);
    }
    this.animators.push((t) => {
      this.npcs.forEach((n, i) => {
        n.scale.y = 1 + Math.sin(t * 2 + i) * 0.02;
        n.rotation.y += Math.sin(t * 0.3 + i * 2) * 0.002;
      });
    });

    const m = new THREE.Mesh(merge(geos), vcMat());
    m.castShadow = true;
    m.receiveShadow = true;
    this.scene.add(m);
    if (sway.length) {
      const s = new THREE.Mesh(merge(sway), vcMat({ sway: true, side: THREE.DoubleSide }));
      s.castShadow = true;
      this.scene.add(s);
    }
  }

  private addSign(text: string, glyph: string, x: number, y: number, z: number) {
    const tex = canvasTex(512, 128, (ctx) => {
      ctx.fillStyle = '#5a3a1e';
      ctx.fillRect(0, 0, 512, 128);
      ctx.strokeStyle = '#e8c46a';
      ctx.lineWidth = 8;
      ctx.strokeRect(8, 8, 496, 112);
      ctx.fillStyle = '#f6e7c1';
      ctx.font = 'bold 64px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${glyph} ${text}`, 256, 68);
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ map: tex }));
    sign.position.set(x, y, z);
    sign.rotation.y = Math.PI;
    this.scene.add(sign);
  }

  update(t: number, dt: number) {
    for (const a of this.animators) a(t, dt);
    if (this.lighthouseLamp) {
      (this.lighthouseLamp.material as THREE.MeshBasicMaterial).opacity = 0.0;
    }
  }
}

function terrainColor(c: THREE.Color, x: number, z: number, h: number, slope: number, style: IslandDef['style']) {
  const n = fbm(x * 0.08, z * 0.08, 2, 3);
  if (h < -0.2) {
    // seabed sand fading to teal in deeper water
    const d = Math.min(1, -h / 14);
    c.set('#ecd9a8').lerp(new THREE.Color('#3c8f93'), Math.pow(d, 0.7));
    c.multiplyScalar(0.92 + n * 0.16);
    return;
  }
  if (h < 0.55) {
    c.set('#d8bf8a').multiplyScalar(0.95 + n * 0.1); // wet sand
    return;
  }
  const sand = new THREE.Color('#f4e2b2');
  const grassBase = style === 'jungle' ? '#2f8f3a' : style === 'rocky' ? '#8cb85a' : style === 'harbor' ? '#79c25a' : '#6cc04a';
  const grass = new THREE.Color(grassBase);
  const rockC = new THREE.Color(style === 'jungle' ? '#7b8570' : '#a39686');
  const grassLine = style === 'sandbar' ? 99 : style === 'rocky' ? 2.2 : 1.6;
  const gt = Math.min(1, Math.max(0, (h - grassLine) / 0.9 + (n - 0.5) * 0.8));
  c.copy(sand).lerp(grass, gt);
  if (gt > 0.3) {
    // broad meadow patches: sunlit yellow-green vs. shady deep green
    const patch = fbm(x * 0.025 + 40, z * 0.025, 3, 8);
    c.lerp(new THREE.Color(style === 'jungle' ? '#1f6e2c' : '#3f9a3c'), Math.max(0, (patch - 0.45) * 1.6) * gt);
    c.lerp(new THREE.Color(style === 'jungle' ? '#5aa83f' : '#a9d65a'), Math.max(0, (0.45 - patch) * 1.4) * gt);
  }
  const rt = Math.min(1, Math.max(0, (slope - (style === 'rocky' ? 0.55 : 0.8)) * 2.5));
  c.lerp(rockC, rt);
  c.multiplyScalar(0.94 + n * 0.12);
}
