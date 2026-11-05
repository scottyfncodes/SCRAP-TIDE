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
// Drowned-world palette: storm-grey overcast days with a dirty-teal haze, sour amber dawns, rust and burnt-sienna
// sunsets, oil-black nights under a cold moon. Strong contrast, never pastel.
const KEYS: Key[] = [
  { t: 0.0, top: '#070b0d', hor: '#18232a', fog: '#141d22', sun: '#86a4ab', sunI: 0.6, hemiSky: '#3f565d', hemiGnd: '#14120f', hemiI: 0.95 },
  { t: 0.2, top: '#0d1418', hor: '#2a3433', fog: '#232c2c', sun: '#93a29d', sunI: 0.55, hemiSky: '#4c5d5d', hemiGnd: '#201c17', hemiI: 1.0 },
  { t: 0.26, top: '#344046', hor: '#b5764a', fog: '#866a55', sun: '#e39b5d', sunI: 1.5, hemiSky: '#a09283', hemiGnd: '#5c4535', hemiI: 1.15 },
  { t: 0.33, top: '#5b7480', hor: '#b4b4a6', fog: '#a3a69a', sun: '#f2dcb4', sunI: 2.3, hemiSky: '#bcc3ba', hemiGnd: '#7c6b53', hemiI: 1.35 },
  { t: 0.5, top: '#6a8794', hor: '#c9c6b4', fog: '#b4b5a8', sun: '#fff1d6', sunI: 2.75, hemiSky: '#c8cdc4', hemiGnd: '#8a7458', hemiI: 1.4 },
  { t: 0.66, top: '#475558', hor: '#bb976b', fog: '#a08a6f', sun: '#ebba7a', sunI: 2.05, hemiSky: '#bdb09a', hemiGnd: '#7d6147', hemiI: 1.35 },
  { t: 0.74, top: '#36383b', hor: '#c45a2b', fog: '#874a31', sun: '#ea7a3c', sunI: 1.65, hemiSky: '#ab7d68', hemiGnd: '#5c3626', hemiI: 1.15 },
  { t: 0.8, top: '#1a1c20', hor: '#57392f', fog: '#3a2c28', sun: '#a06e5c', sunI: 0.75, hemiSky: '#5c5452', hemiGnd: '#2b211d', hemiI: 0.95 },
  { t: 0.88, top: '#090d10', hor: '#1d272c', fog: '#172024', sun: '#86a4ab', sunI: 0.6, hemiSky: '#3f565d', hemiGnd: '#14120f', hemiI: 0.95 },
  { t: 1.0, top: '#070b0d', hor: '#18232a', fog: '#141d22', sun: '#86a4ab', sunI: 0.6, hemiSky: '#3f565d', hemiGnd: '#14120f', hemiI: 0.95 },
];
const STORM = { top: new THREE.Color('#22282a'), hor: new THREE.Color('#465050'), fog: new THREE.Color('#414a49'), hemiSky: new THREE.Color('#77827e') };

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
  /** Calm effects: lightning lights the world at a third of its strength. */
  calm = false;
  get flash() {
    return this.lightning * (this.calm ? 0.3 : 1);
  }
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
    // a permanent sea haze: the horizon is always a little lost
    this.fogNear = 150 - st * 100 - this.night * 40;
    this.fogFar = 860 - st * 520 - this.night * 200;

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
    this.skyTop.lerp(_a.set('#c4d2d8'), flash * 0.5);
    this.skyHorizon.lerp(_a.set('#dce6e6'), flash * 0.4);
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
