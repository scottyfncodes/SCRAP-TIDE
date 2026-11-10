// Wind you can see: a few faint streaks drifting downwind through the air around the boat (upwind sailing, #5).
// One instanced draw of thin flat ribbons, additive and depth-test only, so it costs next to nothing on a phone and
// never hides the hull. Placement is a fixed hash of the streak's index and life cycle, not Math.random, so the
// playtest bot's seeded run is unaffected.
import * as THREE from 'three';

const COUNT = 14;
const RADIUS = 34; // streaks live in a disc this wide around the boat
const DRIFT = 7; // m/s along the wind
const LIFE = 3.2; // s, each streak fades in and out over its life
const NEAR_FADE = [9, 20] as const; // m from the camera: invisible inside the first, full strength past the second

const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export class WindStreaks {
  readonly mesh: THREE.InstancedMesh;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private p = new THREE.Vector3();
  private s = new THREE.Vector3();
  private c = new THREE.Color();
  private up = new THREE.Vector3(0, 1, 0);
  /** each streak's spawn point, fixed for its life (picked around the boat when its cycle starts) */
  private cycle = new Int32Array(COUNT).fill(-1);
  private anchor = new Float32Array(COUNT * 2);

  constructor() {
    // a thin ribbon 1 m long (scaled per streak), lying flat, long axis along +z, tapered by vertex colour at the ends
    const g = new THREE.PlaneGeometry(0.09, 1, 1, 6);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const v = Math.sin((pos.getZ(i) + 0.5) * Math.PI); // 0 at both ends, 1 mid-streak
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.MeshBasicMaterial({ color: '#dfe9ee', vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.mesh = new THREE.InstancedMesh(g, mat, COUNT);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.setColorAt(0, this.c.setScalar(0));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.mesh.name = 'wind_streaks';
  }

  /**
   * Place the streaks for time `t` around (x, z) with the wind blowing toward `windDir`. `strength` 0..1 scales how
   * visible they are (dimmer at night, stronger in a storm; 0 hides them).
   */
  update(t: number, x: number, z: number, windDir: number, strength: number, cam?: { x: number; y: number; z: number }) {
    this.mesh.visible = strength > 0.01;
    if (!this.mesh.visible) return;
    const wx = Math.sin(windDir), wz = Math.cos(windDir);
    this.q.setFromAxisAngle(this.up, windDir);
    for (let i = 0; i < COUNT; i++) {
      const phase = t / LIFE + i / COUNT;
      const cycle = Math.floor(phase);
      const age = phase - cycle; // 0..1 through this streak's life
      const seed = i * 17 + cycle * 101;
      if (this.cycle[i] !== cycle) {
        // a fresh spot in the disc around the boat; it stays put in the world for the streak's life
        this.cycle[i] = cycle;
        const a = hash(seed) * Math.PI * 2, r = Math.sqrt(hash(seed + 1)) * RADIUS;
        this.anchor[i * 2] = x + Math.cos(a) * r;
        this.anchor[i * 2 + 1] = z + Math.sin(a) * r;
      }
      const ox = this.anchor[i * 2], oz = this.anchor[i * 2 + 1];
      const travel = (age - 0.5) * DRIFT * LIFE;
      this.p.set(ox + wx * travel, 1.4 + hash(seed + 2) * 3.2, oz + wz * travel);
      const len = 1.6 + hash(seed + 3) * 2.2; // wisps, not ruler lines
      this.s.set(1, 1, len);
      this.m.compose(this.p, this.q, this.s);
      this.mesh.setMatrixAt(i, this.m);
      let fade = Math.sin(age * Math.PI);
      // a streak that drifts close to the camera would fill the screen as a hard white slash: fade it out up close
      if (cam) {
        const d = Math.hypot(this.p.x - cam.x, this.p.y - cam.y, this.p.z - cam.z);
        fade *= THREE.MathUtils.smoothstep(d, NEAR_FADE[0], NEAR_FADE[1]);
      }
      this.mesh.setColorAt(i, this.c.setScalar(fade * fade * 0.2 * strength));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
