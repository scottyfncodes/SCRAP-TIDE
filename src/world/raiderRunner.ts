// The Rustfang ride: a wave runner in raider colours with a rigged raider astride it.
//
// The raiders used to patrol in scrap skiffs, and the wave-runner event's riders were a plain capsule on a runner
// painted one flat red. Now every raider in the game is the same thing and it reads as a threat at a glance: the
// GITCRAFT wave runner (creative/3d-vehicles) in rust red and soot black, a welded ram of rebar spikes on the bow, a
// whip aerial flying a torn red rag with a lit lamp at its foot, and the Rustfang survivor (creative/3d-characters)
// crouched over the bars, posed by the same helm poser that seats the captain (player/helm.ts). Closing for the ram,
// the rider lets go with one hand and swings the blade.
import * as THREE from 'three';
import { sceneModel, tintModel, characterModel, glowMat, type Character } from './assets';
import { paint, xf, merge, vcMat } from './materials';
import { HelmPoser, newTargets, type HelmTargets } from '../player/helm';

const FILE = 'tb_waverunner';
const RUST = '#8e2f1c', SOOT = '#26211f', STEEL = '#5a5f66', RAG = '#c0392b';

export interface RaiderRunner {
  obj: THREE.Object3D;
  /** null until the cast has streamed in */
  rider: Character | null;
  poser: HelmPoser | null;
  targets: HelmTargets;
  /** 0..1 eased: swinging the blade */
  swing: number;
  t: number;
  rag: THREE.Object3D | null;
  /** was built on the model (false: the stand-in hull, rebuilt once the file arrives) */
  model: boolean;
}

/** The welded dress: bow ram, side blades, aerial, rag and lamp. One mesh + one glow mesh, shared by every runner. */
let dress: { solid: THREE.BufferGeometry; glow: THREE.BufferGeometry; rag: THREE.BufferGeometry } | null = null;
function dressGeo() {
  if (dress) return dress;
  const solid: THREE.BufferGeometry[] = [];
  // a ram of three rebar spikes off the bow, on a plate
  solid.push(paint(xf(new THREE.BoxGeometry(0.5, 0.2, 0.08), 0, 0.36, 1.26, -0.25, 0, 0), STEEL, 0.06));
  for (const [x, len] of [[-0.19, 0.5], [0, 0.72], [0.19, 0.5]] as const) solid.push(paint(xf(new THREE.ConeGeometry(0.05, len, 5), x, 0.38, 1.28 + len / 2, Math.PI / 2, 0, 0), STEEL));
  // saw-tooth blades welded along each flank
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) solid.push(paint(xf(new THREE.ConeGeometry(0.06, 0.24, 4), sx * 0.5, 0.36, 0.75 - i * 0.42, 0, 0, -sx * 1.25), i % 2 ? STEEL : '#3a3f45'));
  // a tyre lashed over the engine cowl and a jerry can on the tail
  solid.push(paint(xf(new THREE.TorusGeometry(0.2, 0.075, 5, 10), 0, 0.5, -1.18, Math.PI / 2 - 0.3, 0, 0), '#1b1b1f'));
  solid.push(paint(xf(new THREE.BoxGeometry(0.2, 0.28, 0.14), 0.26, 0.6, -0.98), '#7a2a22', 0.05));
  // whip aerial
  solid.push(paint(xf(new THREE.CylinderGeometry(0.012, 0.02, 2.1, 4), -0.22, 1.55, -1.12, -0.16, 0, 0), '#1b1b1f'));
  const glow = paint(xf(new THREE.SphereGeometry(0.075, 6, 5), -0.22, 0.62, -0.96), '#ff5a2a');
  // the rag: a torn pennant, hinged at the aerial so it can stream
  const rag = new THREE.BufferGeometry();
  rag.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, -0.24, 0, 0, -0.05, -0.28, 0, -0.05, -0.28, 0, -0.24, 0, 0, -0.17, -0.42, 0, -0.05, -0.28, 0, -0.17, -0.42, 0, -0.09, -0.58], 3));
  rag.computeVertexNormals();
  dress = { solid: merge(solid), glow, rag: paint(rag, RAG) };
  return dress;
}

/** Is the runner model in yet? */
export const runnerReady = () => !!sceneModel(FILE);

export function buildRaiderRunner(phase = 0): RaiderRunner {
  const obj = new THREE.Group();
  const m = sceneModel(FILE, { shadows: true });
  if (m) {
    tintModel(m, { GC_Steel_4fb39a_m3: RUST, GC_Steel_f2ead8_m3: SOOT, GC_Cloth_c9a46b: '#4a2a22', GC_Plain_f4c542: '#d9b648' });
    const sled = m.getObjectByName('waverunner_sled');
    if (sled) sled.visible = false;
    obj.add(m);
  } else {
    const hull = new THREE.Mesh(merge([paint(xf(new THREE.CapsuleGeometry(0.42, 1.9, 4, 8), 0, 0.2, 0, Math.PI / 2, 0, 0, [1, 0.6, 1]), RUST), paint(xf(new THREE.BoxGeometry(0.3, 0.22, 0.9), 0, 0.55, -0.35), SOOT)]), vcMat());
    obj.add(hull);
  }
  const d = dressGeo();
  const solid = new THREE.Mesh(d.solid, vcMat({ weather: 0.7 }));
  solid.castShadow = true;
  obj.add(solid, new THREE.Mesh(d.glow, glowMat()));
  const rag = new THREE.Mesh(d.rag, vcMat({ side: THREE.DoubleSide }));
  rag.position.set(-0.22, 2.55, -1.29);
  obj.add(rag);
  const r: RaiderRunner = { obj, rider: null, poser: null, targets: newTargets(), swing: 0, t: phase, rag, model: !!m };
  mountRider(r);
  return r;
}

/** Put the Rustfang rider on (a no-op until the cast has streamed in, or if one is already aboard). */
export function mountRider(r: RaiderRunner) {
  if (r.rider) return;
  const c = characterModel('tb_raider');
  if (!c) return;
  const poser = new HelmPoser(c.root); // bind pose, before any clip plays
  if (!poser.ok) return;
  r.obj.add(c.root);
  const idle = c.actions.Idle;
  if (idle) {
    idle.time = r.t;
    idle.play();
  }
  r.rider = c;
  r.poser = poser;
  poseRaider(r, 0, 0, 0.5, false); // astride from the first frame, however far off they are
}

/**
 * Animate one runner's rider for this frame: crouched over the bars, leaning into the turn (`turn` -1..1, + = to
 * port), flat out with `speed` 0..1, and with `attack` on, one hand off the bars swinging the blade overhead.
 */
export function poseRaider(r: RaiderRunner, dt: number, turn: number, speed: number, attack: boolean) {
  r.t += dt;
  r.swing += ((attack ? 1 : 0) - r.swing) * (1 - Math.exp(-dt * 6));
  if (r.rag) {
    // the rag streams aft with speed and snaps about
    r.rag.rotation.x = -0.9 + speed * 0.75 + Math.sin(r.t * 9) * 0.08 * (0.3 + speed);
    r.rag.rotation.y = Math.sin(r.t * 6.3) * 0.25 - turn * 0.5;
  }
  const c = r.rider, p = r.poser;
  if (!c || !p) return;
  p.undo();
  c.mixer.update(dt);
  const t = r.targets, k = r.swing;
  const crouch = 0.3 + speed * 0.28;
  t.seated = 1;
  t.hips.set(turn * 0.05, 0.86 - speed * 0.04, -0.5);
  t.yaw = turn * 0.12;
  t.lean = crouch;
  t.side = turn * 0.3;
  t.footL.set(0.33, 0.33, -0.12);
  t.footR.set(-0.33, 0.33, -0.12);
  t.handL.set(0.27, 0.9, 0.16);
  // the blade hand: on the bar, or up and chopping
  const chop = Math.sin(r.t * 7.5);
  t.handR.set(-0.27 - k * 0.3, 0.9 + k * (0.75 + chop * 0.22), 0.16 - k * (0.25 - chop * 0.3));
  t.look = turn * 0.4;
  t.nod = -crouch * 0.9; // chin up: eyes on the prey, not the cowl
  p.apply(r.obj, t, 1);
}
