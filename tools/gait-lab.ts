// Dev-only animation lab (npm run dev → /tools/gait-lab.html). Renders the captain side-on on a ground grid that
// scrolls at the body's speed, so foot sliding is visible against the ground lines.
//   ?mode=old    the shipped Walk sped up the way the game used to (timeScale 0.75 + v·0.28 at 5.2 m/s)
//   ?mode=walk | run | blend&v=3   the procedural gait, phase-locked to ground speed
//   ?strip=1&t=0.0  freeze at phase t (for frame strips)
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { WALK, RUN, captureRest, buildGaitClip, strideAt } from '../src/player/gait';

const qs = new URLSearchParams(location.search);
const mode = qs.get('mode') ?? 'run';
const view = qs.get('view') ?? 'side';
const W = innerWidth, H = innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(W, H);
renderer.setPixelRatio(devicePixelRatio);
document.body.append(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#cfc6ae');
const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 100);
if (view === 'front') cam.position.set(0.0, 1.0, 6.5);
else if (view === 'three') cam.position.set(4.2, 1.6, 3.6);
else cam.position.set(6.2, 0.95, 0);
cam.lookAt(0, 0.85, 0);
scene.add(new THREE.HemisphereLight('#fff6e0', '#5a4a3a', 2.2));
const sun = new THREE.DirectionalLight('#ffffff', 1.6);
sun.position.set(3, 6, 2);
scene.add(sun);
// ground with stripes every 0.25 m that scroll at the body speed
const stripes = new THREE.Group();
for (let i = -40; i <= 40; i++) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.002, i % 4 === 0 ? 0.03 : 0.012), new THREE.MeshBasicMaterial({ color: i % 4 === 0 ? '#5a4c38' : '#8d7d62' }));
  m.position.z = i * 0.25;
  stripes.add(m);
}
scene.add(stripes);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 30), new THREE.MeshLambertMaterial({ color: '#b9a985' }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.001;
scene.add(ground);

const hud = document.getElementById('hud')!;
const buf = await (await fetch('/models/tb_captain.glb')).arrayBuffer();
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const g = await new Promise<any>((res, rej) => loader.parse(buf, '', res, rej));
const root = g.scene as THREE.Object3D;
scene.add(root);
const rest = captureRest(root)!;
const mixer = new THREE.AnimationMixer(root);
const walk = mixer.clipAction(buildGaitClip(rest, WALK));
const run = mixer.clipAction(buildGaitClip(rest, RUN));
const oldWalk = mixer.clipAction(g.animations.find((c: THREE.AnimationClip) => c.name === 'Walk'));
const v = mode === 'old' ? 5.2 / 0.972 : mode === 'walk' ? WALK.speed : mode === 'run' ? RUN.speed : +(qs.get('v') ?? 3);
let phase = +(qs.get('t') ?? 0);
const freeze = qs.has('strip');
let z = 0;
if (mode === 'old') {
  oldWalk.play();
  oldWalk.timeScale = 0.75 + 5.2 * 0.28;
} else {
  for (const a of [walk, run]) {
    a.play();
    a.timeScale = 0;
  }
}
const clock = new THREE.Clock();
function frame() {
  const dt = freeze ? 0 : Math.min(clock.getDelta(), 1 / 30);
  if (mode === 'old') {
    if (freeze) oldWalk.time = phase * oldWalk.getClip().duration;
    mixer.update(dt);
  } else {
    const s = strideAt(WALK, RUN, v);
    phase = (phase + dt / s.cycle) % 1;
    walk.setEffectiveWeight(1 - s.run);
    run.setEffectiveWeight(s.run);
    walk.time = phase * walk.getClip().duration;
    run.time = phase * run.getClip().duration;
    mixer.update(0);
    hud.textContent = `${mode}  v=${(v * 0.972).toFixed(2)} m/s  cycle=${s.cycle.toFixed(2)}s  run=${s.run.toFixed(2)}  phase=${phase.toFixed(2)}`;
  }
  z = (z + v * dt) % 1;
  stripes.position.z = -z;
  renderer.render(scene, cam);
  requestAnimationFrame(frame);
}
frame();
(window as any).__ready = true;
