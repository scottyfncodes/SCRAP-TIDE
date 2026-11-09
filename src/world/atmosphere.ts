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
// BEAUTIFUL RUIN (SCRAP TIDE art direction): warm sunlight against a cool sea. Clear abyss-blue skies over a pale,
// sun-bleached horizon haze by day; Sun Gold mornings and afternoons; Oxide Rust sunsets; deep Abyss Blue nights under
// a cold moon. The haze is warm sand, not grey: the world is breathtaking at distance and weathered up close.
const KEYS: Key[] = [
  { t: 0.0, top: '#04111a', hor: '#123342', fog: '#0f2b38', sun: '#8fb6c6', sunI: 0.62, hemiSky: '#365f70', hemiGnd: '#0f1513', hemiI: 0.95 },
  { t: 0.2, top: '#08192a', hor: '#24434c', fog: '#1f3c45', sun: '#98aeb0', sunI: 0.55, hemiSky: '#47636a', hemiGnd: '#1d1b16', hemiI: 1.0 },
  { t: 0.26, top: '#2c5068', hor: '#e2a062', fog: '#a98364', sun: '#f2a85c', sunI: 1.55, hemiSky: '#a69684', hemiGnd: '#5e4634', hemiI: 1.15 },
  { t: 0.33, top: '#3b7a9c', hor: '#d8cfaa', fog: '#b4c0b2', sun: '#f6dca6', sunI: 2.35, hemiSky: '#b4c8c6', hemiGnd: '#80704f', hemiI: 1.35 },
  { t: 0.5, top: '#2b77a2', hor: '#d6d3b8', fog: '#b2c5c0', sun: '#fff0cc', sunI: 2.8, hemiSky: '#b8d0d2', hemiGnd: '#8e7754', hemiI: 1.4 },
  { t: 0.66, top: '#336f8e', hor: '#dfbd80', fog: '#bfad88', sun: '#f3c86c', sunI: 2.15, hemiSky: '#c2bba2', hemiGnd: '#80634a', hemiI: 1.35 },
  { t: 0.74, top: '#294b60', hor: '#d76a3a', fog: '#995638', sun: '#f08c40', sunI: 1.7, hemiSky: '#b08a72', hemiGnd: '#5e3828', hemiI: 1.15 },
  { t: 0.8, top: '#0f2232', hor: '#5d3c37', fog: '#392d31', sun: '#a6705c', sunI: 0.75, hemiSky: '#55565c', hemiGnd: '#2b211d', hemiI: 0.95 },
  { t: 0.88, top: '#05121c', hor: '#173643', fog: '#132f3b', sun: '#8fb6c6', sunI: 0.62, hemiSky: '#365f70', hemiGnd: '#0f1513', hemiI: 0.95 },
  { t: 1.0, top: '#04111a', hor: '#123342', fog: '#0f2b38', sun: '#8fb6c6', sunI: 0.62, hemiSky: '#365f70', hemiGnd: '#0f1513', hemiI: 0.95 },
];
const STORM = { top: new THREE.Color('#1c272d'), hor: new THREE.Color('#435158'), fog: new THREE.Color('#3c4a50'), hemiSky: new THREE.Color('#74838a') };

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
  /** The trip squall (game/trip.ts) at the player, 0..1: it rides on top of the roaming cells. */
  squall = 0;
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
    const s = Math.max(this.stormAt(px, pz), this.squall);
    this.storm += (s - this.storm) * Math.min(1, dt * 0.8);
    this.wall = this.wallAt(px, pz);
    const st = this.storm;
    this.skyTop.lerp(STORM.top.clone().multiplyScalar(1 - this.night * 0.6), st * 0.85);
    this.skyHorizon.lerp(STORM.hor.clone().multiplyScalar(1 - this.night * 0.6), st * 0.85);
    this.fogColor.lerp(STORM.fog.clone().multiplyScalar(1 - this.night * 0.6), st * 0.9);
    this.hemiSky.lerp(STORM.hemiSky, st * 0.6);
    this.sunIntensity *= 1 - st * 0.7;
    // a permanent sea haze: the horizon is always a little lost
    this.fogNear = 165 - st * 115 - this.night * 45;
    this.fogFar = 900 - st * 560 - this.night * 220;

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
