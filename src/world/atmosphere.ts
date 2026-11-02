// Time of day, storms and the Stormwall. One place computes every lighting/weather value per frame;
// the ocean, sky, fog and lights all read from it so they always agree.
import * as THREE from 'three';
import { WORLD } from '../data/world';
import { smoothstep, clamp } from '../core/noise';

export const DAY_SECONDS = 480; // one full day/night cycle

interface Key {
  t: number;
  top: string;
  hor: string;
  fog: string;
  sun: string;
  sunI: number;
  hemiSky: string;
  hemiGnd: string;
  hemiI: number;
}

// 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset
const KEYS: Key[] = [
  { t: 0.0, top: '#081a33', hor: '#1d3a5c', fog: '#16304d', sun: '#9fb6e8', sunI: 0.55, hemiSky: '#5a78b8', hemiGnd: '#1b2a3c', hemiI: 0.9 },
  { t: 0.2, top: '#0d2240', hor: '#3a4d72', fog: '#2c4466', sun: '#a9b8e0', sunI: 0.5, hemiSky: '#6680b8', hemiGnd: '#2a3346', hemiI: 0.95 },
  { t: 0.26, top: '#2f5d93', hor: '#f0a57a', fog: '#c9a08e', sun: '#ffb37a', sunI: 1.5, hemiSky: '#c9b8d8', hemiGnd: '#8a6c5c', hemiI: 1.2 },
  { t: 0.33, top: '#3a8fd6', hor: '#bfe3ee', fog: '#b9dbe6', sun: '#ffe2bd', sunI: 2.2, hemiSky: '#cfeeff', hemiGnd: '#b8a98a', hemiI: 1.45 },
  { t: 0.5, top: '#2f86d8', hor: '#c4ebf4', fog: '#c1e5ee', sun: '#fff4dc', sunI: 2.5, hemiSky: '#d6f1ff', hemiGnd: '#c2b28e', hemiI: 1.55 },
  { t: 0.66, top: '#3576b8', hor: '#f3c58c', fog: '#e3c39c', sun: '#ffc27a', sunI: 2.2, hemiSky: '#e6d6c0', hemiGnd: '#b48e6a', hemiI: 1.4 },
  { t: 0.74, top: '#3b4f8a', hor: '#ff8a5a', fog: '#d88a6e', sun: '#ff8c4a', sunI: 1.6, hemiSky: '#d79a8a', hemiGnd: '#7a4f48', hemiI: 1.15 },
  { t: 0.8, top: '#1f2c5a', hor: '#8a5a7a', fog: '#5a4a68', sun: '#c08ab8', sunI: 0.7, hemiSky: '#7a6aa0', hemiGnd: '#3a3044', hemiI: 0.95 },
  { t: 0.88, top: '#0b1d38', hor: '#24405f', fog: '#1b3452', sun: '#9fb6e8', sunI: 0.55, hemiSky: '#5a78b8', hemiGnd: '#1b2a3c', hemiI: 0.9 },
  { t: 1.0, top: '#081a33', hor: '#1d3a5c', fog: '#16304d', sun: '#9fb6e8', sunI: 0.55, hemiSky: '#5a78b8', hemiGnd: '#1b2a3c', hemiI: 0.9 },
];
const STORM = { top: new THREE.Color('#2e3a48'), hor: new THREE.Color('#5d6a76'), fog: new THREE.Color('#56636f'), hemiSky: new THREE.Color('#8496a8') };

export interface StormCell {
  x: number;
  z: number;
  r: number;
  vx: number;
  vz: number;
}

const _a = new THREE.Color(), _b = new THREE.Color();
function lerpHex(out: THREE.Color, a: string, b: string, k: number) {
  return out.copy(_a.set(a)).lerp(_b.set(b), k);
}

export class Atmosphere {
  time = 0.33;
  storms: StormCell[] = [
    { x: -120, z: -260, r: 150, vx: 2.2, vz: 0.9 },
    { x: 420, z: 260, r: 190, vx: -1.6, vz: 1.4 },
    { x: -420, z: -560, r: 210, vx: 1.2, vz: 1.8 },
  ];
  // per-frame outputs
  sunDir = new THREE.Vector3();
  sunColor = new THREE.Color();
  sunIntensity = 2;
  skyTop = new THREE.Color();
  skyHorizon = new THREE.Color();
  fogColor = new THREE.Color();
  fogNear = 240;
  fogFar = 900;
  hemiSky = new THREE.Color();
  hemiGround = new THREE.Color();
  hemiIntensity = 1.4;
  storm = 0; // 0..1 at the player
  wall = 0; // Stormwall part of storm
  night = 0; // 0 day .. 1 deep night
  lightning = 0; // flash 0..1
  private flashT = 0;
  private nextFlash = 4;
  onThunder: (dist: number) => void = () => {};

  stormAt(x: number, z: number) {
    let s = 0;
    for (const c of this.storms) s = Math.max(s, 1 - smoothstep(c.r * 0.45, c.r, Math.hypot(x - c.x, z - c.z)));
    return Math.max(s, this.wallAt(x, z));
  }
  wallAt(x: number, z: number) {
    const c = WORLD.shallowsCenter;
    return smoothstep(WORLD.stormRadius - 70, WORLD.stormRadius + 30, Math.hypot(x - c.x, z - c.z));
  }

  update(dt: number, px: number, pz: number) {
    this.time = (this.time + dt / DAY_SECONDS) % 1;
    const half = WORLD.size / 2;
    for (const c of this.storms) {
      c.x += c.vx * dt;
      c.z += c.vz * dt;
      if (c.x > half) c.x -= WORLD.size;
      if (c.x < -half) c.x += WORLD.size;
      if (c.z > half) c.z -= WORLD.size;
      if (c.z < -half) c.z += WORLD.size;
    }
    const t = this.time;
    let i = 0;
    while (i < KEYS.length - 2 && KEYS[i + 1].t < t) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const k = clamp((t - a.t) / (b.t - a.t), 0, 1);
    lerpHex(this.skyTop, a.top, b.top, k);
    lerpHex(this.skyHorizon, a.hor, b.hor, k);
    lerpHex(this.fogColor, a.fog, b.fog, k);
    lerpHex(this.sunColor, a.sun, b.sun, k);
    lerpHex(this.hemiSky, a.hemiSky, b.hemiSky, k);
    lerpHex(this.hemiGround, a.hemiGnd, b.hemiGnd, k);
    this.sunIntensity = a.sunI + (b.sunI - a.sunI) * k;
    this.hemiIntensity = a.hemiI + (b.hemiI - a.hemiI) * k;

    // sun arcs east→west; at night the moon takes its place (same light, cooler)
    const elev = Math.sin((t - 0.25) * Math.PI * 2);
    this.night = smoothstep(0.05, -0.18, elev);
    const ang = (t - 0.25) * Math.PI * 2;
    const day = new THREE.Vector3(Math.cos(ang), Math.max(0.08, Math.sin(ang)), -0.35);
    const moon = new THREE.Vector3(-Math.cos(ang) * 0.6, 0.55, 0.45);
    this.sunDir.copy(day).lerp(moon, this.night).normalize();

    // weather
    const s = this.stormAt(px, pz);
    this.storm += (s - this.storm) * Math.min(1, dt * 0.8);
    this.wall = this.wallAt(px, pz);
    const st = this.storm;
    this.skyTop.lerp(STORM.top.clone().multiplyScalar(1 - this.night * 0.6), st * 0.85);
    this.skyHorizon.lerp(STORM.hor.clone().multiplyScalar(1 - this.night * 0.6), st * 0.85);
    this.fogColor.lerp(STORM.fog.clone().multiplyScalar(1 - this.night * 0.6), st * 0.9);
    this.hemiSky.lerp(STORM.hemiSky, st * 0.6);
    this.sunIntensity *= 1 - st * 0.7;
    this.fogNear = 260 - st * 200 - this.night * 60;
    this.fogFar = 1150 - st * 780 - this.night * 250;

    // lightning
    this.lightning = Math.max(0, this.lightning - dt * 4);
    if (st > 0.45) {
      this.nextFlash -= dt;
      if (this.nextFlash <= 0) {
        this.nextFlash = 2.5 + Math.random() * 6 * (1.4 - st);
        this.lightning = 1;
        this.flashT = 0;
        this.onThunder(0.3 + Math.random() * 0.7);
      }
    }
    this.flashT += dt;
    const flash = this.lightning * (0.6 + 0.4 * Math.sin(this.flashT * 60));
    this.hemiIntensity += flash * 2.2;
    this.skyTop.lerp(_a.set('#c9d6ff'), flash * 0.5);
    this.skyHorizon.lerp(_a.set('#dfe6ff'), flash * 0.4);
  }

  /** 0 = clear, 1 = heavy, for wind/wave strength. */
  get windStrength() {
    return 0.6 + this.storm * 1.2;
  }

  label() {
    const t = this.time;
    const phase = t < 0.22 || t > 0.86 ? 'Night' : t < 0.3 ? 'Dawn' : t < 0.62 ? 'Day' : t < 0.8 ? 'Sunset' : 'Dusk';
    const w = this.wall > 0.5 ? 'Stormwall' : this.storm > 0.55 ? 'Storm' : this.storm > 0.2 ? 'Squall' : 'Calm';
    const hh = Math.floor(t * 24), mm = Math.floor((t * 24 - hh) * 60);
    return { phase, weather: w, clock: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}` };
  }
}
