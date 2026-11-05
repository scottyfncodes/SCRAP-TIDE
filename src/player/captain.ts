// The player's captain. Starts as a lightweight procedural stand-in and switches to the rigged GITCRAFT survivor
// (creative/3d-characters/captain: Idle / Sit / Dig / Cheer clips) as soon as it has streamed in.
// Locomotion is the procedural Walk/Run from gait.ts, phase-locked to ground speed (see docs/expedition-pass).
import * as THREE from 'three';
import { paint, xf, merge, vcMat } from '../world/materials';
import { part, type Character } from '../world/assets';
import { WALK, RUN, captureRest, buildGaitClip, strideAt } from './gait';

const CLIP_FOR: Record<string, string> = { idle: 'Idle', sit: 'Sit', dig: 'Dig', cheer: 'Cheer' };

interface Loco {
  walk: THREE.AnimationAction;
  run: THREE.AnimationAction;
  phase: number;
}

export class Captain {
  root = new THREE.Group();
  body = new THREE.Group(); // the procedural stand-in (hidden once the rigged survivor loads)
  private legL: THREE.Object3D;
  private legR: THREE.Object3D;
  private armL: THREE.Object3D;
  private armR: THREE.Object3D;
  private shovel: THREE.Object3D;
  private head: THREE.Object3D;
  pose: 'idle' | 'walk' | 'sit' | 'dig' | 'cheer' = 'idle';
  private phase = 0;
  private digT = 0;
  /** the rigged survivor, once loaded */
  char: Character | null = null;
  private tool: THREE.Object3D | null = null;
  private loco: Loco | null = null;
  /** blend weight per action, eased toward the pose's targets and always normalised to 1 (no bind-pose leak) */
  private weights = new Map<THREE.AnimationAction, number>();
  private targets = new Map<THREE.AnimationAction, number>(); // reused every frame (no per-frame allocation)
  private lastYaw = 0;
  private lastSpeed = 0;
  private lean = new THREE.Vector2();
  /** current walk↔run mix (0..1), for footstep weight */
  runMix = 0;
  /** heel strike: side +1 left / -1 right, run mix 0..1 */
  onStep: ((side: 1 | -1, run: number) => void) | null = null;

  /** Swap the stand-in for the rigged character. */
  useCharacter(c: Character) {
    this.char = c;
    this.body.visible = false;
    c.root.scale.setScalar(1.08);
    this.root.add(c.root);
    // a salvaged shovel in the right hand, shown while digging
    const hand = c.root.getObjectByName('mixamorigRightHand');
    if (hand) {
      // (GITCRAFT fittings kit, creative/3d-finds: modelled in this frame; the code-built shovel is the fallback)
      const kitShovel = part('tb_fittings_kit', 'shovel');
      const sh = new THREE.Mesh(
        kitShovel
          ? kitShovel.geo
          : merge([
              paint(xf(new THREE.CylinderGeometry(0.016, 0.016, 0.95, 5), 0, 0.12, 0), '#8a5a34'),
              paint(xf(new THREE.BoxGeometry(0.17, 0.22, 0.014), 0, -0.42, 0.02), '#7f8a94'),
            ]),
        vcMat({ weather: 0.6 })
      );
      // bone space: the hand bone runs along its local Y; stand the shaft across the fist
      sh.rotation.set(Math.PI / 2, 0, 0);
      sh.position.set(0, 0.06, 0);
      sh.visible = false;
      hand.add(sh);
      this.tool = sh;
    }
    // procedural Walk + Run baked onto this skeleton (captured in its rest pose, before any clip plays)
    const rest = captureRest(c.root);
    if (rest) {
      const walk = c.mixer.clipAction(buildGaitClip(rest, WALK));
      const run = c.mixer.clipAction(buildGaitClip(rest, RUN));
      for (const a of [walk, run]) a.timeScale = 0; // time is driven from the ground-speed phase
      c.actions.GaitWalk = walk;
      c.actions.GaitRun = run;
      this.loco = { walk, run, phase: 0 };
    }
    for (const a of Object.values(c.actions)) {
      a.play();
      a.setEffectiveWeight(0);
      this.weights.set(a, 0);
    }
    const idle = c.actions.Idle;
    if (idle) {
      idle.setEffectiveWeight(1);
      this.weights.set(idle, 1);
    }
  }

  /** world-units per rig-unit (the captain group's scale × the character's) */
  private get rigScale() {
    return this.root.scale.x * (this.char?.root.scale.x ?? 1);
  }

  private animate(dt: number, speed: number) {
    const c = this.char!;
    const loco = this.loco;
    const moving = this.pose === 'walk' && speed > 0.05;
    const v = speed / this.rigScale;
    const target = this.targets;
    target.clear();
    let rate = 9;
    if (moving && loco) {
      const s = strideAt(WALK, RUN, v);
      this.runMix = s.run;
      target.set(loco.walk, 1 - s.run);
      target.set(loco.run, s.run);
      const prev = loco.phase;
      loco.phase = (loco.phase + dt / s.cycle) % 1;
      // heel strikes: left at phase 0, right at 0.5
      if (this.onStep && (this.weights.get(loco.walk)! + this.weights.get(loco.run)!) > 0.5) {
        if (loco.phase < prev) this.onStep(1, s.run);
        else if (prev < 0.5 && loco.phase >= 0.5) this.onStep(-1, s.run);
      }
      rate = 12;
    } else {
      const a = c.actions[CLIP_FOR[this.pose === 'walk' ? 'idle' : this.pose]] ?? c.actions.Idle;
      if (a) {
        // restart one-shot style clips when they come in from nothing
        if ((this.weights.get(a) ?? 0) < 0.02 && this.pose !== 'idle') a.reset().play();
        target.set(a, 1);
      }
      if (this.pose === 'idle' || this.pose === 'walk') rate = 7;
    }
    let sum = 0;
    const k = 1 - Math.exp(-dt * rate);
    for (const [a, w] of this.weights) {
      const t = target.get(a) ?? 0;
      const nw = w + (t - w) * k;
      this.weights.set(a, nw);
      sum += nw;
    }
    for (const [a, w] of this.weights) a.setEffectiveWeight(sum > 1e-4 ? w / sum : 0);
    if (loco) {
      loco.walk.time = loco.phase * loco.walk.getClip().duration;
      loco.run.time = loco.phase * loco.run.getClip().duration;
    }
    // lean into turns (centripetal) and into acceleration, around the feet
    const yaw = this.root.rotation.y;
    let dyaw = yaw - this.lastYaw;
    dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
    this.lastYaw = yaw;
    const omega = dt > 0 ? dyaw / dt : 0;
    const accel = dt > 0 ? (speed - this.lastSpeed) / dt : 0;
    this.lastSpeed = speed;
    const grounded = this.pose === 'walk' || this.pose === 'idle';
    const turnLean = grounded ? THREE.MathUtils.clamp(-Math.atan((speed * omega) / 9.8) * 0.75, -0.28, 0.28) : 0;
    const accLean = grounded ? THREE.MathUtils.clamp(accel * 0.018, -0.12, 0.14) : 0;
    const lk = 1 - Math.exp(-dt * 8);
    this.lean.x += (accLean - this.lean.x) * lk;
    this.lean.y += (turnLean - this.lean.y) * lk;
    c.root.rotation.set(this.lean.x, 0, this.lean.y);
    c.mixer.update(dt);
  }

  constructor() {
    const mat = vcMat({ weather: 0.45 });
    const limb = (len: number, color: string, w = 0.13) => {
      const g = new THREE.Group();
      const m = new THREE.Mesh(merge([paint(xf(new THREE.CapsuleGeometry(w, len, 3, 6), 0, -len / 2 - w * 0.5, 0), color)]), mat);
      m.castShadow = true;
      g.add(m);
      return g;
    };
    // torso: striped shirt
    const torsoParts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 4; i++) torsoParts.push(paint(xf(new THREE.CylinderGeometry(0.34 - i * 0.015, 0.36 - i * 0.015, 0.16, 12), 0, 0.82 + i * 0.16, 0), i % 2 ? '#5b4c33' : '#4a3f2c'));
    torsoParts.push(paint(xf(new THREE.CylinderGeometry(0.37, 0.37, 0.1, 12), 0, 0.72, 0), '#3a4148')); // belt
    torsoParts.push(paint(xf(new THREE.BoxGeometry(0.16, 0.12, 0.06), 0, 0.72, 0.36), '#8a7a4a')); // buckle
    const torso = new THREE.Mesh(merge(torsoParts), mat);
    torso.castShadow = true;
    this.body.add(torso);

    // head with bandana + tricorn
    const head = new THREE.Group();
    const hp: THREE.BufferGeometry[] = [];
    hp.push(paint(xf(new THREE.SphereGeometry(0.34, 14, 10), 0, 0, 0), '#e8b896'));
    hp.push(paint(xf(new THREE.SphereGeometry(0.055, 6, 4), -0.12, 0.04, 0.31), '#1a1a1a'));
    hp.push(paint(xf(new THREE.SphereGeometry(0.055, 6, 4), 0.12, 0.04, 0.31), '#1a1a1a'));
    hp.push(paint(xf(new THREE.SphereGeometry(0.06, 6, 4), 0, -0.05, 0.34), '#d99a7a'));
    hp.push(paint(xf(new THREE.TorusGeometry(0.08, 0.018, 4, 8, Math.PI), 0, -0.12, 0.3, 0, 0, Math.PI), '#7a3a2a'));
    hp.push(paint(xf(new THREE.SphereGeometry(0.35, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), 0, 0.03, 0), '#7e3524')); // bandana
    // weathered wide-brim sun hat with salvage goggles on the band
    hp.push(paint(xf(new THREE.CylinderGeometry(0.62, 0.66, 0.05, 14), 0, 0.27, 0), '#3f3a31'));
    hp.push(paint(xf(new THREE.CylinderGeometry(0.27, 0.33, 0.26, 12), 0, 0.41, 0), '#4a443a'));
    hp.push(paint(xf(new THREE.TorusGeometry(0.315, 0.035, 4, 14), 0, 0.31, 0, Math.PI / 2, 0, 0), '#3a4148'));
    for (const gx of [-0.11, 0.11]) hp.push(paint(xf(new THREE.CylinderGeometry(0.085, 0.085, 0.07, 10), gx, 0.36, 0.3, Math.PI / 2, 0, 0), '#c8943a'));
    const hm = new THREE.Mesh(merge(hp), mat);
    hm.castShadow = true;
    head.add(hm);
    head.position.y = 1.72;
    this.head = head;
    this.body.add(head);

    this.legL = limb(0.42, '#3a3a34', 0.12);
    this.legR = limb(0.42, '#3a3a34', 0.12);
    this.legL.position.set(-0.15, 0.72, 0);
    this.legR.position.set(0.15, 0.72, 0);
    // boots
    for (const leg of [this.legL, this.legR]) {
      const boot = new THREE.Mesh(merge([paint(xf(new THREE.BoxGeometry(0.22, 0.16, 0.34), 0, -0.68, 0.05), '#2b1d14')]), mat);
      leg.add(boot);
    }
    this.armL = limb(0.42, '#e8b896', 0.1);
    this.armR = limb(0.42, '#e8b896', 0.1);
    this.armL.position.set(-0.44, 1.38, 0);
    this.armR.position.set(0.44, 1.38, 0);
    this.body.add(this.legL, this.legR, this.armL, this.armR);

    const sh = new THREE.Group();
    const shm = new THREE.Mesh(
      merge([
        paint(xf(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 5), 0, -0.3, 0.2, 0.3, 0, 0), '#8a5a34'),
        paint(xf(new THREE.BoxGeometry(0.26, 0.32, 0.03), 0, -0.85, 0.36, 0.3, 0, 0), '#9aa3ad'),
      ]),
      mat
    );
    sh.add(shm);
    sh.visible = false;
    this.armR.add(sh);
    this.shovel = sh;

    this.root.add(this.body);
    this.root.scale.setScalar(0.9);
  }

  dig() {
    this.digT = this.char ? 1.1 : 0.7;
    this.pose = 'dig';
  }

  update(dt: number, speed: number) {
    if (this.char) {
      if (this.pose === 'dig') {
        this.digT -= dt;
        if (this.digT <= 0) this.pose = 'idle';
      }
      if (this.tool) this.tool.visible = this.pose === 'dig';
      this.animate(dt, speed);
      return;
    }
    this.phase += dt * (4 + speed * 2.2);
    const s = Math.sin(this.phase);
    this.shovel.visible = this.pose === 'dig';
    this.body.position.y = 0;
    this.body.rotation.x = 0;
    this.legL.rotation.x = this.legR.rotation.x = 0;
    this.armL.rotation.set(0, 0, 0.15);
    this.armR.rotation.set(0, 0, -0.15);
    this.head.rotation.set(0, 0, 0);
    switch (this.pose) {
      case 'walk':
        this.legL.rotation.x = s * 0.7;
        this.legR.rotation.x = -s * 0.7;
        this.armL.rotation.x = -s * 0.6;
        this.armR.rotation.x = s * 0.6;
        this.body.position.y = Math.abs(Math.cos(this.phase)) * 0.08;
        break;
      case 'sit':
        this.legL.rotation.x = this.legR.rotation.x = -1.35;
        this.body.position.y = -0.55;
        this.armR.rotation.set(-0.9, 0, -0.2);
        this.armL.rotation.set(-0.5 + Math.sin(this.phase * 0.3) * 0.1, 0, 0.3);
        this.head.rotation.y = Math.sin(this.phase * 0.15) * 0.4;
        break;
      case 'dig': {
        this.digT -= dt;
        const k = Math.max(0, this.digT / 0.7);
        const swing = Math.sin((1 - k) * Math.PI);
        this.body.rotation.x = 0.35 * swing;
        this.armR.rotation.set(-0.4 - swing * 1.2, 0, -0.1);
        this.armL.rotation.set(-0.6 - swing * 1.0, 0, 0.3);
        if (this.digT <= 0) this.pose = 'idle';
        break;
      }
      case 'cheer':
        this.armL.rotation.set(0, 0, 2.6 + s * 0.2);
        this.armR.rotation.set(0, 0, -2.6 - s * 0.2);
        this.body.position.y = Math.abs(s) * 0.25;
        break;
      default:
        this.body.position.y = Math.sin(this.phase * 0.4) * 0.02;
        this.armL.rotation.z = 0.15 + Math.sin(this.phase * 0.4) * 0.04;
    }
  }
}
