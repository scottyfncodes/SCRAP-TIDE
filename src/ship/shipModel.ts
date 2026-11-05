// Modular vessel construction. Every functional upgrade and cosmetic maps to visible parts.
import * as THREE from 'three';
import { paint, xf, merge, vcMat, toonMat, canvasTex, weather } from '../world/materials';
import { COSMETIC_MAP, type VesselId } from '../data/ship';
import { item } from '../data/items';
import type { Store } from '../state/store';
import { model, crewModel, part, glowMat, kitGeo, sceneModel, tintModel, cullModel, offsetModel, nodeOrigin, type Tint } from '../world/assets';
import { CREW_MAP } from '../data/crew';

interface HullSpec {
  L: number; // length
  W: number; // half beam
  D: number; // depth below sheer
  sheer: number; // gunwale height at mid
  bowRise: number;
  transom: number; // stern width factor
}

const HULLS: Record<VesselId, HullSpec> = {
  dinghy: { L: 4.4, W: 0.92, D: 0.75, sheer: 0.55, bowRise: 0.3, transom: 0.72 },
  sloop: { L: 10, W: 1.9, D: 1.5, sheer: 1.2, bowRise: 0.7, transom: 0.65 },
  ironwake: { L: 13, W: 1.15, D: 1.5, sheer: 1.3, bowRise: 0.6, transom: 0.7 }, // per hull; two hulls
};
const CAT_OFFSET = 2.7; // Ironwake hull centre offset (x)
const KIT_SCALE: Record<VesselId, number> = { dinghy: 0.62, sloop: 1, ironwake: 1.25 };

// GITCRAFT TIDEBREAKERS Coastal Sloop (public/models/tb_coastal_sloop.glb). Its hull is lofted from HULLS.sloop, so it
// shares this file's frame exactly: metres, Y-up, bow +Z, y = 0 at the waterline, scale 1.
const SLOOP_FILE = 'tb_coastal_sloop';
const SLOOP_ROOF = 2.06; // top of the model's cabin roof
const SLOOP_FLAG_MATERIAL = 'GC_Cloth_0a2142'; // the model's masthead pennant (swapped for an equipped flag cosmetic)
// The outrigger floats + cross-beams, modelled for the sloop in MeshCraft (creative/3d-sloop/outriggers), in the same frame.
const OUTRIGGER_FILE = 'tb_sloop_outriggers';
// Captain at the helm: in the cockpit between the cabin's after wall (z -3.7) and the transom, beside the tiller.
const SLOOP_HELM = new THREE.Vector3(-0.55, 0, -4.3);
// ...and with the ship's wheel fitted: standing to port of the wheel, clear of its rim, facing forward
const SLOOP_WHEEL_HELM = new THREE.Vector3(-0.98, 0, -4.55);
// the model's stern lantern hangs 3 cm in front of the wheel hub; with the wheel fitted it moves onto the starboard rail
const SLOOP_LANTERN = 'GC_Plain_ff9f2e_e2';
const SLOOP_LANTERN_SHIFT = new THREE.Vector3(1.25, -0.69, -0.1);
const CONTAINER_FILE = 'tb_upg_container_cabin';
const CONTAINER_ROOF = 2.28; // its roof: the solar array, radar and spotlight stand 0.22 m higher on it
// the model's cabin (walls, roof, portholes), replaced by the Container Cabin
const SLOOP_CABIN = ['GC_Plank_f2ead8', 'GC_Plank_5e331b', 'GC_Metal_f4c542_m9'];
const inCabin = (c: THREE.Vector3) => Math.abs(c.x) < 1.2 && c.y > 0.95 && c.y < 2.2 && c.z > -3.9 && c.z < -1.3;

/**
 * The rest of the Trimaran's upgrades (MeshCraft, creative/3d-sloop/upgrades), modelled in the sloop's own frame and
 * laid out together so that none overlaps another, the helm, the wheel or the captain with everything fitted (an
 * overlap audit in Blender checks every pair, with the moving parts swept through their range). Static nodes join
 * the ship's batched kit mesh; `pivot` is a moving part the game turns. `roof` nodes stand on the cabin roof.
 */
const SLOOP_KIT: Record<string, { file: string; body?: string[]; pivot?: string; roof?: string[]; restY?: number }> = {
  solar_array: { file: 'tb_upg_solar_array', body: ['tb_upg_solar_array_mesh'], roof: ['tb_upg_solar_array_mesh'] },
  radar_mast: { file: 'tb_upg_radar_mast', body: ['tb_upg_radar_mast_mesh'], pivot: 'radar_scanner', roof: ['tb_upg_radar_mast_mesh', 'radar_scanner'] },
  deck_turbine: { file: 'tb_upg_deck_turbine', body: ['tb_upg_deck_turbine_mesh'], pivot: 'deck_turbine_rotor' },
  fishing_rig: { file: 'tb_upg_fishing_rig', body: ['tb_upg_fishing_rig_mesh'] },
  engine_outboard: { file: 'tb_upg_outboard', body: ['tb_upg_outboard_mesh'] },
  engine_twin: { file: 'tb_upg_twin_diesel', body: ['tb_upg_twin_diesel_mesh'] },
  harpoon_turret: { file: 'tb_upg_harpoon_turret', body: ['tb_upg_harpoon_turret_mesh'], pivot: 'harpoon_mount' },
  salvage_crane: { file: 'tb_upg_salvage_crane', pivot: 'salvage_crane', restY: -Math.PI / 2 },
  tank_drums: { file: 'tb_upg_fuel_drums', body: ['tb_upg_fuel_drums_mesh'] },
  cargo_net: { file: 'tb_upg_cargo_nets', body: ['tb_upg_cargo_nets_mesh'] },
  hull_armor: { file: 'tb_upg_armour_plating', body: ['tb_upg_armour_plating_mesh'] },
  deck_lights: { file: 'tb_upg_deck_lights', body: ['deck_lights_strings', 'deck_spotlight'], roof: ['deck_spotlight'] },
};

/**
 * The sloop's upgrade models (GITCRAFT TIDEBREAKERS 3D package), each modelled at its socket's origin. An owned
 * upgrade mounts as a child of its socket_* node; if its file failed to load, the code-built part is drawn instead.
 */
const SLOOP_UPGRADES: Record<string, { file: string; socket: string; at?: [number, number, number] }> = {
  sail_canvas: { file: 'tb_upg_canvas_mainsail', socket: 'socket_sail' },
  // the crates' rope hoop rises to 2.48 m on the centreline, through the boom (2.37 m): sit them 0.5 m to starboard
  cargo_crate: { file: 'tb_upg_cargo_crates', socket: 'socket_storage', at: [0.5, 0, 0] },
  // socket_navigation is 0.3 m inside the cabin's front wall: stand the binnacle just forward of it
  compass_brass: { file: 'tb_upg_brass_compass', socket: 'socket_navigation', at: [0, 0, 0.42] },
  rudder_ash: { file: 'tb_upg_wheel_rudder', socket: 'socket_steering' },
  hull_copper: { file: 'tb_upg_copper_hull', socket: 'socket_hull' },
};
const SLOOP_MAST_Z = 1.0; // the model's mast (socket_sail)

// The Patchwork Skiff (public/models/tb_patchwork_skiff.glb, MeshCraft, creative/3d-skiff): the starter boat as a
// scrap-welded raider skiff (mismatched strakes, riveted corrugated patches, a spiked bumper ram, oil-drum sponsons,
// tyre fenders, a car-seat helm). Lofted from HULLS.dinghy, so it shares this file's frame at scale 1: it replaces the
// procedural hull, floorboards and thwarts; the captain's seat, crew spots, mast step and upgrades keep their places.
const SKIFF_FILE = 'tb_patchwork_skiff';

/** The upgrade model files the Trimaran needs for these owned upgrades (loaded lazily: see world/assets.ts). */
export function sloopUpgradeFiles(owned: readonly string[]): string[] {
  const files = new Set<string>();
  for (const id of owned) {
    const f = SLOOP_UPGRADES[id]?.file ?? SLOOP_KIT[id]?.file ?? (id === 'cabin_container' ? CONTAINER_FILE : null);
    if (f) files.add(f);
  }
  return [...files];
}
// the model's base mainsail and its band (the jib, forward of the mast, shares the cloth material)
const SLOOP_SAIL_CLOTH = 'GC_Cloth_f1e6cc';
const SLOOP_SAIL_BAND = 'GC_Cloth_c0392b';
// the model's tiller: on the centreline between the cabin and the transom (rails share the material, far outboard)
const SLOOP_TILLER_WOOD = 'GC_Wood_9a5a2e';
const isTiller = (c: THREE.Vector3) => Math.abs(c.x) < 0.15 && c.y > 1.25 && c.y < 2.0 && c.z < -3.25 && c.z > -4.8;

/**
 * The models were built in Seafoam Green paint with Red Stripe sails; these are the materials that carry those
 * colours, so every paint and sail cosmetic recolours them (the cabin, deck, spars and fittings keep their own colours).
 */
function cosmeticTints(paint: string[], sail: string[]): Record<string, Tint> {
  return {
    GC_Plank_4fb39a: paint[0], // hull planking (and the outrigger floats)
    GC_Wood_f2ead8: paint[1], // trim band along the gunwale (and the floats)
    GC_Cloth_f1e6cc: sail[0], // mainsail + jib cloth
    GC_Cloth_c0392b: sail[1], // the mainsail's band
    // Canvas Mainsail upgrade: the sail cosmetic, with its second colour as a band where the base sail has one
    GC_Cloth_f6ead0: { base: sail[0], band: sail[1], from: 0.3, to: 0.5 },
    // Copper-Banded Hull: the sheathing stays copper; its rub-strakes are painted in the trim colour
    GC_Metal_c98a12_m9: paint[1],
    // Container Cabin: painted steel in the hull colour, corner posts and rails in the trim colour
    GC_Steel_4fb39a_m3: paint[0],
    GC_Steel_f2ead8_m3: paint[1],
  };
}

/** The sloop model with its socket_* nodes intact, or null (procedural fallback) if the GLB failed to load. */
function sloopModel() {
  const root = sceneModel(SLOOP_FILE, { shadows: true, side: THREE.DoubleSide });
  const boat = root?.getObjectByName('tidebreakers_coastal_sloop');
  if (!root || !boat) return null;
  root.updateMatrixWorld(true);
  const at = (n: string) => root.getObjectByName(n)?.getWorldPosition(new THREE.Vector3()) ?? null;
  const deck = at('socket_storage');
  const flag = at('socket_flag');
  if (!deck || !flag) return null;
  let pennant: THREE.Object3D | null = null;
  root.traverse((o) => {
    if (o.userData.srcMaterial === SLOOP_FLAG_MATERIAL) pennant = o;
  });
  return { root, deckY: deck.y, flag, pennant: pennant as THREE.Object3D | null };
}

const PATCH = [new THREE.Color('#a24b21'), new THREE.Color('#7f8a94'), new THREE.Color('#2f6fb0')];

/** Lofted hull surface with plank striping and scrap patches. Bow points +z. */
function hullGeometry(h: HullSpec, color: string, trim: string) {
  const nu = 22;
  const nv = 12;
  const pos: number[] = [];
  const col: number[] = [];
  const c1 = new THREE.Color(color);
  const c2 = new THREE.Color(color).multiplyScalar(0.86);
  const ct = new THREE.Color(trim);
  const P = (u: number, v: number) => {
    // u: 0 stern → 1 bow, v: -1..1 port→starboard around the bottom
    const width = h.W * (u < 0.45 ? h.transom + (1 - h.transom) * Math.sin((u / 0.45) * Math.PI * 0.5) : Math.cos(((u - 0.45) / 0.55) * Math.PI * 0.5) ** 0.85);
    const sheerY = h.sheer + h.bowRise * Math.pow(u, 3) + 0.08 * Math.pow(1 - u, 2);
    const keel = h.D * (1 - 0.6 * Math.pow(Math.max(0, u - 0.6) / 0.4, 2)) * (0.85 + 0.15 * Math.sin(u * Math.PI));
    const a = Math.abs(v);
    const x = width * Math.sign(v) * Math.pow(a, 0.75);
    const y = sheerY - keel * (1 - Math.pow(a, 2.2));
    const z = (u - 0.5) * h.L;
    return new THREE.Vector3(x, y, z);
  };
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const u0 = i / nu, u1 = (i + 1) / nu;
      const v0 = -1 + (2 * j) / nv, v1 = -1 + (2 * (j + 1)) / nv;
      const a = P(u0, v0), b = P(u1, v0), c = P(u1, v1), d = P(u0, v1);
      const plank = (Math.floor(Math.abs((v0 + v1) / 2) * 6) % 2) === 0 ? c1 : c2;
      const isTrim = Math.abs(v0) > 0.82 || Math.abs(v1) > 0.82;
      // scrap patchwork: riveted plates of rust, steel and old paint welded over the planks
      const ph = Math.sin(i * 12.9898 + Math.floor(j / 2) * 78.233) * 43758.5453;
      const r = ph - Math.floor(ph);
      const patch = r < 0.09 ? PATCH[0] : r < 0.16 ? PATCH[1] : r < 0.21 ? PATCH[2] : null;
      const cc = isTrim ? ct : patch && Math.abs(v0) < 0.8 ? patch : plank;
      for (const p of [a, b, c, a, c, d]) {
        pos.push(p.x, p.y, p.z);
        col.push(cc.r, cc.g, cc.b);
      }
    }
  }
  // transom (flat stern board)
  const sternTop = P(0, -1), sternTop2 = P(0, 1);
  const ring: THREE.Vector3[] = [];
  for (let j = 0; j <= nv; j++) ring.push(P(0, -1 + (2 * j) / nv));
  const center = new THREE.Vector3(0, (sternTop.y + P(0, 0).y) / 2, -h.L / 2);
  for (let j = 0; j < nv; j++) {
    for (const p of [center, ring[j + 1], ring[j]]) {
      pos.push(p.x, p.y, p.z);
      col.push(c2.r, c2.g, c2.b);
    }
  }
  void sternTop2;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('sway', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3), 1));
  g.computeVertexNormals();
  return { g, P };
}

function sailTexture(cosmeticId: string, patched: boolean) {
  const cos = COSMETIC_MAP[cosmeticId] ?? COSMETIC_MAP.sail_plain;
  return canvasTex(256, 256, (ctx) => {
    const [a, b] = cos.colors;
    ctx.fillStyle = a;
    ctx.fillRect(0, 0, 256, 256);
    if (cos.id === 'sail_stripe') {
      ctx.fillStyle = b;
      ctx.fillRect(0, 100, 256, 40);
    } else if (cos.id === 'sail_sunset') {
      const g = ctx.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, a);
      g.addColorStop(1, b);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      for (let i = 0; i < 4; i++) ctx.fillRect(0, 30 + i * 60, 256, 10);
    } else if (cos.id === 'sail_tarp') {
      // stitched tarps: blue panels with orange and grey patches
      const cols = ['#2f6fb0', '#3a7fc0', '#e8742a', '#9aa9b4', '#2f6fb0', '#e8742a'];
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        ctx.fillStyle = cols[(i * 3 + j * 5) % cols.length];
        ctx.fillRect(i * 64 + 2, j * 64 + 2, 60, 60);
      }
    } else if (cos.id === 'sail_billboard') {
      // a salvaged billboard: faded ad text and a sun
      ctx.fillStyle = '#e9d7b0';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#f2b825';
      ctx.beginPath();
      ctx.arc(70, 80, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = b;
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText('SUNNY', 120, 96);
      ctx.fillText('DAYS', 120, 146);
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('MERIDIAN BEACH RESORT', 14, 220);
      ctx.fillStyle = 'rgba(162,75,33,0.35)';
      for (let i = 0; i < 6; i++) ctx.fillRect(20 + i * 40, 0, 6, 256);
    } else if (cos.id === 'sail_shells') {
      ctx.fillStyle = b;
      for (let i = 0; i < 9; i++) {
        const x = 40 + (i % 3) * 88, y = 40 + Math.floor(i / 3) * 88;
        ctx.beginPath();
        ctx.moveTo(x, y + 22);
        for (let k = 0; k <= 6; k++) {
          const ang = Math.PI + (k / 6) * Math.PI;
          ctx.lineTo(x + Math.cos(ang) * 22, y + Math.sin(ang) * 22 + 6);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
    // seams
    ctx.strokeStyle = 'rgba(80,60,30,0.18)';
    ctx.lineWidth = 2;
    for (let x = 32; x < 256; x += 42) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
    grimeCloth(ctx, 256, 256, cos.id.length * 7 + 3);
    if (patched) {
      const patches = [[60, 70, 50, 40, '#d8c39a'], [150, 160, 60, 46, '#c9b48a'], [120, 40, 34, 30, '#e3d1a8']] as const;
      for (const [x, y, w, h, c] of patches) {
        ctx.fillStyle = c;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#7a5534';
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
        ctx.setLineDash([]);
      }
      // seagull-shaped hole
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(180, 90);
      ctx.quadraticCurveTo(195, 75, 210, 90);
      ctx.quadraticCurveTo(225, 75, 240, 90);
      ctx.lineTo(210, 98);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  });
}

/** Years of salt, sun and diesel smoke on canvas: mildew blotches, water stains, rust drips from the grommets and grimy edges. */
export function grimeCloth(ctx: CanvasRenderingContext2D, w: number, h: number, seed = 1) {
  let r = seed * 9301 + 49297;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 14; i++) {
    const x = rnd() * w, y = rnd() * h, rad = 10 + rnd() * 46;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const col = rnd() > 0.5 ? '70,58,36' : '52,60,40';
    g.addColorStop(0, `rgba(${col},${0.10 + rnd() * 0.16})`);
    g.addColorStop(0.7, `rgba(${col},${0.05 + rnd() * 0.06})`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // tide-mark rings where water dried on the cloth
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = `rgba(90,70,40,${0.12 + rnd() * 0.12})`;
    ctx.beginPath();
    ctx.ellipse(rnd() * w, rnd() * h, 12 + rnd() * 30, 8 + rnd() * 20, rnd() * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  // rust drips
  for (let i = 0; i < 6; i++) {
    const x = 10 + rnd() * (w - 20), len = 20 + rnd() * 90;
    const g = ctx.createLinearGradient(0, 0, 0, len);
    g.addColorStop(0, 'rgba(120,52,18,0.45)');
    g.addColorStop(1, 'rgba(120,52,18,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 2 + rnd() * 3, len);
  }
  // grimy edges and a soot-darkened foot
  const e = ctx.createLinearGradient(0, 0, 0, h);
  e.addColorStop(0, 'rgba(30,24,18,0.18)');
  e.addColorStop(0.2, 'rgba(30,24,18,0)');
  e.addColorStop(0.75, 'rgba(30,24,18,0)');
  e.addColorStop(1, 'rgba(30,24,18,0.38)');
  ctx.fillStyle = e;
  ctx.fillRect(0, 0, w, h);
}

function flagTexture(id: string) {
  const cos = COSMETIC_MAP[id];
  return canvasTex(128, 80, (ctx) => {
    const [a, b] = cos.colors;
    ctx.fillStyle = a;
    ctx.fillRect(0, 0, 128, 80);
    if (id === 'flag_harbor') {
      ctx.fillStyle = b;
      ctx.fillRect(0, 30, 128, 20);
      ctx.beginPath();
      ctx.arc(40, 40, 14, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'flag_helios') {
      ctx.fillStyle = b;
      ctx.beginPath();
      ctx.arc(64, 40, 16, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.fillRect(64 + Math.cos(a) * 22 - 3, 40 + Math.sin(a) * 22 - 3, 6, 6);
      }
    } else if (id === 'flag_wren') {
      ctx.fillStyle = b;
      ctx.beginPath();
      ctx.arc(64, 34, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = a;
      ctx.fillRect(56, 30, 5, 6);
      ctx.fillRect(67, 30, 5, 6);
      ctx.strokeStyle = b;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(40, 54);
      ctx.lineTo(88, 72);
      ctx.moveTo(88, 54);
      ctx.lineTo(40, 72);
      ctx.stroke();
      // tatters
      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 5; i++) ctx.fillRect(118 - i * 3, i * 16, 12, 6);
      ctx.globalCompositeOperation = 'source-over';
    }
  });
}

/** Small 3D representation of an item for trophy displays. */
export function trophyGeometry(id: string): THREE.BufferGeometry {
  const d = item(id);
  const [a, b] = d.colors;
  const parts: THREE.BufferGeometry[] = [];
  parts.push(paint(xf(new THREE.CylinderGeometry(0.22, 0.26, 0.14, 10), 0, 0.07, 0), '#5a3a1e'));
  switch (d.icon) {
    case 'idol':
      parts.push(paint(xf(new THREE.SphereGeometry(0.2, 10, 8), 0, 0.3, 0, 0, 0, 0, [1.2, 0.6, 1]), a));
      parts.push(paint(xf(new THREE.SphereGeometry(0.08, 8, 6), 0, 0.33, 0.2), b));
      break;
    case 'bell':
      parts.push(paint(xf(new THREE.CylinderGeometry(0.08, 0.2, 0.3, 10), 0, 0.32, 0), a));
      parts.push(paint(xf(new THREE.TorusGeometry(0.06, 0.02, 4, 8), 0, 0.5, 0), b));
      break;
    case 'mask':
      parts.push(paint(xf(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 12), 0, 0.38, 0, Math.PI / 2, 0, 0), a));
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        parts.push(paint(xf(new THREE.ConeGeometry(0.05, 0.14, 4), Math.cos(ang) * 0.27, 0.38 + Math.sin(ang) * 0.27, 0, 0, 0, ang - Math.PI / 2), a));
      }
      break;
    case 'spyglass':
    case 'sextant':
      parts.push(paint(xf(new THREE.CylinderGeometry(0.05, 0.08, 0.5, 8), 0, 0.3, 0, 0, 0, 1.1), a));
      parts.push(paint(xf(new THREE.TorusGeometry(0.08, 0.02, 4, 8), 0.1, 0.36, 0), b));
      break;
    case 'flag':
      parts.push(paint(xf(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 4), -0.1, 0.4, 0), '#3b3b3b'));
      parts.push(paint(xf(new THREE.BoxGeometry(0.3, 0.2, 0.01), 0.05, 0.58, 0), a));
      break;
    case 'whistle':
      parts.push(paint(xf(new THREE.SphereGeometry(0.13, 8, 6), 0, 0.25, 0, 0, 0, 0, [1.4, 1, 1]), a));
      parts.push(paint(xf(new THREE.ConeGeometry(0.05, 0.12, 6), 0.2, 0.27, 0, 0, 0, -Math.PI / 2), b));
      break;
    case 'plant':
    case 'bloom':
    case 'fruitvine':
    case 'sapling': {
      // living trophies are the real GITCRAFT flora models: a green plant riding on deck is a statement
      const [node, sc] = ({ plant: ['flora_potted', 0.42], bloom: ['flora_flowering', 0.46], fruitvine: ['flora_fruit', 0.26], sapling: ['flora_sapling', 0.24] } as const)[d.icon];
      const k = kitGeo('tb_flora_kit', node, 0, 0.14, 0, 0, sc);
      parts.push(k ? k.geo : paint(xf(new THREE.IcosahedronGeometry(0.16, 1), 0, 0.28, 0), a));
      break;
    }
    default:
      parts.push(paint(xf(new THREE.IcosahedronGeometry(0.16, 1), 0, 0.28, 0), a));
  }
  return merge(parts);
}

export interface ShipParts {
  group: THREE.Group;
  sails: THREE.Mesh[];
  flag: THREE.Mesh | null;
  anchor: THREE.Object3D;
  rope: THREE.Mesh;
  seat: THREE.Vector3; // where the captain sits
  wake: THREE.Vector3; // stern point
  length: number;
  beam: number;
  /** the hull's footprint at the waterline (half-length, half-beam of one hull, twin-hull centre offset) */
  waterline: { halfLen: number; halfBeam: number; twin: number };
  rotors: THREE.Object3D[];
  crew: { id: string; root: THREE.Object3D; mixer: THREE.AnimationMixer; actions: Record<string, THREE.AnimationAction> }[];
  lamp: THREE.PointLight | null;
  harpoon: THREE.Object3D | null;
  crane: THREE.Object3D | null;
  radar: THREE.Object3D | null;
  engine: THREE.Object3D | null;
}

export function buildShip(store: Store): ShipParts {
  const s = store.data;
  const vessel = s.vessel;
  const h = HULLS[vessel];
  const paintCos = COSMETIC_MAP[s.equipped.paint] ?? COSMETIC_MAP.paint_driftwood;
  const [hullColor, trimColor] = paintCos.colors;
  const group = new THREE.Group();
  const parts: THREE.BufferGeometry[] = [];
  const hullOut = hullGeometry(h, hullColor, trimColor);
  const cat = vessel === 'ironwake';
  // the sloop is the GITCRAFT model: it replaces the lofted hull, deck, cabin, rails, helm, mast, rudder, sails and pennant
  const glb = vessel === 'sloop' ? sloopModel() : null;
  // how far the model's deck sits from the procedural one, so deck-mounted parts and the captain stand on it
  const lift = glb ? glb.deckY - (h.sheer - 0.05) : 0;
  if (glb) group.add(glb.root);
  const skiff = vessel === 'dinghy' ? sceneModel(SKIFF_FILE, { shadows: true, side: THREE.DoubleSide }) : null;
  if (skiff) group.add(skiff);
  // outrigger floats: the MeshCraft model when it loaded, else the kit floats placed further down
  const outriggers = vessel === 'sloop' ? sceneModel(OUTRIGGER_FILE, { shadows: true, side: THREE.DoubleSide }) : null;
  if (outriggers) group.add(outriggers);
  // the Scrap Trimaran's welded dress: corrugated patches, a spiked bumper ram, gunwale spikes, tyres and chain, modelled
  // clear of every upgrade body (creative/3d-sloop/scrap), so it rides on the sloop whatever is fitted
  const scrap = vessel === 'sloop' ? sceneModel('tb_sloop_scrap', { shadows: true }) : null;
  if (scrap) group.add(scrap);
  // owned upgrades mount on the model's sockets; `fitted` marks the ones whose model loaded (else: code-built part)
  const fitted: Record<string, boolean> = {};
  let container: THREE.Object3D | null = null;
  if (glb) {
    for (const [id, u] of Object.entries(SLOOP_UPGRADES)) {
      if (!store.has(id)) continue;
      const socket = glb.root.getObjectByName(u.socket);
      const m = socket && sceneModel(u.file, { shadows: true, side: THREE.DoubleSide });
      if (!socket || !m) continue;
      m.name = `upgrade_${id}`;
      if (u.at) m.position.set(...u.at);
      socket.add(m);
      fitted[id] = true;
    }
    // the canvas mainsail (its model, or the code-built sail standing in for it) replaces the model's base
    // mainsail, keeping the jib; the wheel replaces the model's tiller
    if (store.has('sail_canvas')) {
      cullModel(glb.root, SLOOP_SAIL_CLOTH, 'mainsail', (c) => c.z < SLOOP_MAST_Z);
      cullModel(glb.root, SLOOP_SAIL_BAND, 'band', () => true);
    }
    // Cutter Rig + Jib: the model's jib (its cloth forward of the mast) only shows once that upgrade is owned
    if (!store.has('sail_cutter')) cullModel(glb.root, SLOOP_SAIL_CLOTH, 'jib', (c) => c.z >= SLOOP_MAST_Z);
    if (fitted.rudder_ash) {
      cullModel(glb.root, SLOOP_TILLER_WOOD, 'tiller', isTiller);
      offsetModel(glb.root, SLOOP_LANTERN, SLOOP_LANTERN_SHIFT);
    }
    // Container Cabin: replaces the model's cabin on the same footprint
    if (store.has('cabin_container')) {
      const c = sceneModel(CONTAINER_FILE, { shadows: true, side: THREE.DoubleSide });
      if (c) {
        c.name = 'upgrade_cabin_container';
        group.add(c);
        for (const mat of SLOOP_CABIN) cullModel(glb.root, mat, 'cabin', inCabin);
        container = c;
        fitted.cabin_container = true;
      }
    }
  }
  const sailCos = COSMETIC_MAP[s.equipped.sail] ?? COSMETIC_MAP.sail_plain;
  const tints = cosmeticTints(paintCos.colors, sailCos.colors);
  if (glb) tintModel(glb.root, tints);
  if (outriggers) tintModel(outriggers, tints);
  if (skiff) tintModel(skiff, tints);
  if (container) tintModel(container, tints);
  const roofTop = container ? CONTAINER_ROOF : SLOOP_ROOF;
  // Ironwake: two hulls; P() then measures from the outer side of each hull
  const P = cat
    ? (u: number, v: number) => {
        const p = hullOut.P(u, v);
        p.x += (v < 0 ? -1 : 1) * CAT_OFFSET;
        return p;
      }
    : hullOut.P;
  if (cat) {
    const port = hullOut.g.clone();
    port.translate(-CAT_OFFSET, 0, 0);
    hullOut.g.translate(CAT_OFFSET, 0, 0);
    parts.push(hullOut.g, port);
    // bridge deck between the hulls, on cross-beams
    parts.push(paint(xf(new THREE.BoxGeometry(CAT_OFFSET * 2 + 0.6, 0.3, h.L * 0.72), 0, h.sheer - 0.05, -0.4), '#3a4148', 0.06));
    for (const z of [-3.8, 0, 3.8]) parts.push(paint(xf(new THREE.BoxGeometry(CAT_OFFSET * 2 + 1.6, 0.35, 0.5), 0, h.sheer - 0.35, z), '#a24b21'));
  } else if (!glb && !skiff) parts.push(hullOut.g);
  const wood = '#a3784c';
  const woodDark = '#6e4b2a';

  // copper bands along waterline
  if (store.has('hull_copper') && !fitted.hull_copper) {
    for (let i = 0; i < 18; i++) {
      for (const side of [-1, 1]) {
        const u = 0.04 + i * 0.052;
        const p = P(u, side * 0.62);
        const p2 = P(u + 0.05, side * 0.62);
        const len = p.distanceTo(p2);
        const box = new THREE.BoxGeometry(0.05, 0.16 * (h.D / 0.75) * 0.6, len * 1.05);
        const mid = p.clone().add(p2).multiplyScalar(0.5);
        const yaw = Math.atan2(p2.x - p.x, p2.z - p.z);
        parts.push(paint(xf(box, mid.x + side * 0.02, mid.y, mid.z, 0, yaw, 0), i % 2 ? '#d07a3a' : '#b8652c'));
      }
    }
  }

  let mastH: number;
  let mastZ: number;
  const seat = new THREE.Vector3();
  const sailTier = store.bestInSlot('sail')?.tier ?? 0;

  if (vessel === 'dinghy') {
    // floorboards + thwarts (the skiff model has its own pallet floor, plank thwart and car-seat helm)
    if (!skiff) {
    parts.push(paint(xf(new THREE.BoxGeometry(h.W * 1.1, 0.06, h.L * 0.7), 0, h.sheer - h.D * 0.72, -0.1), wood, 0.05));
    parts.push(paint(xf(new THREE.BoxGeometry(h.W * 1.75, 0.08, 0.35), 0, h.sheer - 0.2, 0.55), wood));
    parts.push(paint(xf(new THREE.BoxGeometry(h.W * 1.5, 0.08, 0.4), 0, h.sheer - 0.18, -1.3), wood));
    // little storage box under aft seat
    parts.push(paint(xf(new THREE.BoxGeometry(0.7, 0.35, 0.36), 0, h.sheer - 0.42, -1.3), woodDark));
    }
    // paddle resting across the gunwale
    parts.push(paint(xf(new THREE.CylinderGeometry(0.035, 0.035, 2.2, 5), 0.45, h.sheer + 0.05, -0.4, Math.PI / 2, 0.15, 0), '#c9a074'));
    parts.push(paint(xf(new THREE.BoxGeometry(0.22, 0.03, 0.55), 0.6, h.sheer + 0.05, 0.62, 0, 0.15, 0), '#c9a074'));
    mastH = sailTier >= 2 ? 4.6 : sailTier >= 1 ? 4.0 : 3.0;
    mastZ = 0.75;
    seat.set(0, h.sheer - 0.12, -1.3);
  } else {
    // decked sloop: deck, cabin, bowsprit, rails, helm
    const deckY = h.sheer - 0.05;
    if (!glb) {
      const deck: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 16; i++) {
        const u = 0.03 + i * 0.058;
        const p = P(u, 1);
        const w = Math.max(0.2, Math.abs(p.x) * 1.92);
        deck.push(paint(xf(new THREE.BoxGeometry(w, 0.1, h.L * 0.058), 0, deckY + (p.y - h.sheer) * 0.6, p.z), i % 2 ? wood : '#97704a', 0.05));
      }
      parts.push(...deck);
      if (!store.has('cabin_container')) {
        // a wheelhouse knocked together from doors and a car roof
        parts.push(paint(xf(new THREE.BoxGeometry(2.2, 1.2, 2.8), 0, deckY + 0.6, -2.4), cat ? '#7f8a94' : '#c9a074', 0.04));
        parts.push(paint(xf(new THREE.BoxGeometry(2.5, 0.18, 3.1), 0, deckY + 1.25, -2.4), cat ? '#2f6fb0' : '#7a4a2a'));
        for (const sx of [-1, 1]) parts.push(paint(xf(new THREE.BoxGeometry(0.05, 0.5, 0.6), sx * 1.11, deckY + 0.7, -2.2), '#2a4058'));
      }
      parts.push(paint(xf(new THREE.CylinderGeometry(0.1, 0.14, 3.2, 6), 0, h.sheer + h.bowRise + 0.1, h.L / 2 + 1.0, Math.PI / 2 - 0.2, 0, 0), woodDark));
      // rails
      for (let i = 0; i < 14; i++) {
        for (const side of [-1, 1]) {
          const u = 0.06 + i * 0.066;
          const p = P(u, side);
          parts.push(paint(xf(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 4), p.x * 0.97, p.y + 0.27, p.z), woodDark));
        }
      }
      for (const side of [-1, 1]) {
        for (let i = 0; i < 13; i++) {
          const u = 0.06 + i * 0.066;
          const a = P(u, side), b = P(u + 0.066, side);
          const len = a.distanceTo(b);
          const mid = a.clone().add(b).multiplyScalar(0.5);
          parts.push(paint(xf(new THREE.BoxGeometry(0.09, 0.07, len * 1.05), mid.x * 0.97, mid.y + 0.55, mid.z, 0, Math.atan2(b.x - a.x, b.z - a.z), 0), trimColor));
        }
      }
      // helm wheel at the stern
      parts.push(paint(xf(new THREE.TorusGeometry(0.45, 0.05, 5, 12), 0, deckY + 1.0, -4.2, 0, 0, 0), woodDark));
      for (let k = 0; k < 4; k++) parts.push(paint(xf(new THREE.BoxGeometry(0.04, 1.0, 0.04), 0, deckY + 1.0, -4.2, 0, 0, (k / 4) * Math.PI), woodDark));
      parts.push(paint(xf(new THREE.BoxGeometry(0.2, 0.9, 0.2), 0, deckY + 0.45, -4.25), woodDark));
    }
    mastH = (sailTier >= 2 ? 10.5 : sailTier >= 1 ? 9.5 : 8.5) * (cat ? 1.2 : 1);
    mastZ = glb ? SLOOP_MAST_Z : 0.8;
    seat.set(0, deckY + 0.05 + lift, cat ? -4.6 : -3.6);
    // on the model the old seat is inside the cabin; sit at the helm in the cockpit instead
    if (glb) {
      const helm = fitted.rudder_ash ? SLOOP_WHEEL_HELM : SLOOP_HELM;
      seat.set(helm.x, glb.deckY + 0.05, helm.z);
    }
  }

  // mast
  // (on the skiff: a length of rusty scaffold pipe, with a strip of hazard tape)
  if (!glb) parts.push(paint(xf(new THREE.CylinderGeometry(0.06 * (vessel !== 'dinghy' ? 2.2 : 1), 0.08 * (vessel !== 'dinghy' ? 2.2 : 1), mastH, 7), 0, h.sheer - h.D * 0.6 + mastH / 2, mastZ), skiff ? '#6d6a66' : woodDark));
  if (skiff) {
    parts.push(paint(xf(new THREE.CylinderGeometry(0.085, 0.085, 0.16, 7), 0, h.sheer + 0.5, mastZ), '#f4c542'));
    parts.push(paint(xf(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 7), 0, h.sheer + 0.5, mastZ), '#1b1b1f'));
    parts.push(paint(xf(new THREE.CylinderGeometry(0.075, 0.075, 0.5, 7), 0, h.sheer + 1.3, mastZ), '#a24b21'));
  }
  const mastBase = h.sheer - h.D * 0.6;

  // rudder
  const bigRudder = store.has('rudder_ash');
  // on the model, the code-built ash rudder only stands in when the wheel & rudder model failed to load
  const codeRudder = bigRudder && !fitted.rudder_ash;
  const rs = (vessel !== 'dinghy' ? 2 : 1) * (bigRudder ? 1.35 : 1);
  if (!glb || codeRudder) parts.push(paint(xf(new THREE.BoxGeometry(0.07, 0.75 * rs, 0.42 * rs), 0, h.sheer - 0.55 * rs, -h.L / 2 - 0.16 * rs), bigRudder ? '#d9c08c' : woodDark));
  if (!glb || codeRudder) parts.push(paint(xf(new THREE.CylinderGeometry(0.03 * rs, 0.03 * rs, 0.9 * rs, 5), 0, h.sheer + 0.12, -h.L / 2 + 0.25 * rs, Math.PI / 2 - 0.25, 0, 0), bigRudder ? '#c9a074' : woodDark));
  if (bigRudder && (!glb || codeRudder)) parts.push(paint(xf(new THREE.SphereGeometry(0.06 * rs, 6, 4), 0, h.sheer + 0.24, -h.L / 2 + 0.7 * rs), '#d4a64a'));

  // storage upgrades
  if (store.has('cargo_crate') && !fitted.cargo_crate) {
    const sc = vessel !== 'dinghy' ? 1.5 : 1;
    const cz = vessel !== 'dinghy' ? -0.6 : -1.75;
    const cy = h.sheer + lift;
    parts.push(paint(xf(new THREE.BoxGeometry(0.85 * sc, 0.55 * sc, 0.55 * sc), 0, cy + 0.12 * sc, cz), '#b48a5a', 0.05));
    parts.push(paint(xf(new THREE.BoxGeometry(0.9 * sc, 0.08, 0.6 * sc), 0, cy + 0.4 * sc, cz), '#7a5534'));
    parts.push(paint(xf(new THREE.BoxGeometry(0.06, 0.6 * sc, 0.62 * sc), 0.2 * sc, cy + 0.12 * sc, cz), '#d9b77a'));
    parts.push(paint(xf(new THREE.BoxGeometry(0.06, 0.6 * sc, 0.62 * sc), -0.2 * sc, cy + 0.12 * sc, cz), '#d9b77a'));
  }
  if (store.has('cargo_net') && !(glb && part(SLOOP_KIT.cargo_net.file, SLOOP_KIT.cargo_net.body![0], true))) {
    for (const side of [-1, 1]) {
      const p = P(0.45, side);
      for (let k = 0; k < 3; k++) parts.push(paint(xf(new THREE.SphereGeometry(0.22 * (vessel !== 'dinghy' ? 1.6 : 1), 7, 5), p.x + side * 0.12, p.y - 0.18, p.z - 0.4 + k * 0.4, 0, 0, 0, [0.7, 1, 1]), k % 2 ? '#d9b77a' : '#c9a46a', 0.1));
    }
  }
  // compass binnacle on bow
  if (store.has('compass_brass') && !fitted.compass_brass) {
    // (on the model, the old spot is inside the cabin: stand in front of it, at socket_navigation)
    const bz = glb ? -1.25 : vessel !== 'dinghy' ? -3.3 : 1.55;
    const by = (vessel !== 'dinghy' ? h.sheer + 0.05 : h.sheer - 0.05) + lift;
    parts.push(paint(xf(new THREE.CylinderGeometry(0.1, 0.13, 0.3, 8), 0, by + 0.15, bz), '#6e4b2a'));
    parts.push(paint(xf(new THREE.SphereGeometry(0.16, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0, by + 0.3, bz), '#d4a64a'));
    parts.push(paint(xf(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 12), 0, by + 0.31, bz), '#b8862b'));
  }
  // trophies
  const trophyPos = cat
    ? [new THREE.Vector3(0, h.sheer + 0.15, 4.2), new THREE.Vector3(-1.6, h.sheer + 0.15, 2.8), new THREE.Vector3(1.6, h.sheer + 0.15, 2.8), new THREE.Vector3(0, h.sheer + 0.15, 1.6)]
    : glb
      ? [new THREE.Vector3(0, glb.deckY, 3.2), new THREE.Vector3(-0.6, roofTop, -2.6), new THREE.Vector3(0.6, roofTop, -2.6)]
      : vessel !== 'dinghy'
      ? [new THREE.Vector3(0, h.sheer + 0.05, 3.2), new THREE.Vector3(-0.9, h.sheer + 1.3, -2.4), new THREE.Vector3(0.9, h.sheer + 1.3, -2.4)]
      : [new THREE.Vector3(0, h.sheer + 0.02, 1.85)];
  for (let i = 0; i < trophyPos.length; i++) {
    const t = s.trophies[i];
    if (!t) continue;
    const g = trophyGeometry(t);
    const p = trophyPos[i];
    parts.push(xf(g, p.x, p.y, p.z, 0, 0, 0, vessel !== 'dinghy' ? 1.5 : 1.1));
  }

  // anchor (hangs at bow when stowed)
  const anchor = new THREE.Group();
  const anchorMesh = new THREE.Mesh(
    merge([
      paint(xf(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 5), 0, 0, 0), '#4a4a4a'),
      paint(xf(new THREE.TorusGeometry(0.22, 0.04, 4, 10, Math.PI), 0, -0.28, 0, 0, 0, Math.PI), '#4a4a4a'),
      paint(xf(new THREE.TorusGeometry(0.07, 0.025, 4, 8), 0, 0.33, 0), '#4a4a4a'),
    ]),
    vcMat()
  );
  anchor.add(anchorMesh);
  const bow = P(0.97, 1);
  anchor.position.set(0.35 * (vessel !== 'dinghy' ? 2 : 1), bow.y - 0.1, bow.z - 0.25);
  anchor.scale.setScalar(vessel !== 'dinghy' ? 1.8 : 1);
  group.add(anchor);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 4), toonMat('#c9a46a'));
  rope.visible = false;
  group.add(rope);

  if (parts.length) {
    const hull = new THREE.Mesh(merge(parts), vcMat({ side: THREE.DoubleSide }));
    hull.castShadow = true;
    hull.receiveShadow = true;
    group.add(hull);
  }

  // sails
  const sails: THREE.Mesh[] = [];
  const sc = vessel !== 'dinghy' ? 2.2 : 1;
  // code-built sails: always without the model; on the model only as the canvas mainsail's fallback
  const codeSail = !glb || (sailTier >= 1 && !fitted.sail_canvas);
  if (codeSail) {
    const sailMat = weather(new THREE.MeshToonMaterial({ map: sailTexture(s.equipped.sail, sailTier === 0), side: THREE.DoubleSide, transparent: true, alphaTest: 0.5 }), 0.7);
    if (sailTier === 0) {
      // stubby patched lateen-ish triangle
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(1.2 * sc, 0.1);
      shape.lineTo(0, 2.4 * sc);
      shape.closePath();
      const g = new THREE.ShapeGeometry(shape, 1);
      planeUVs(g);
      subdivideForBillow(g);
      const m = new THREE.Mesh(g, sailMat);
      m.position.set(0, mastBase + 0.45 * sc + (vessel !== 'dinghy' ? 1.2 : 0), mastZ - 0.05);
      m.rotation.y = Math.PI / 2;
      m.castShadow = true;
      sails.push(m);
    } else {
      // gaff mainsail: trapezoid, bigger at higher tiers
      const H = (sailTier >= 2 ? 3.6 : 3.1) * sc * (vessel !== 'dinghy' ? 1.25 : 1);
      const Wb = (sailTier >= 2 ? 2.2 : 1.9) * sc;
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(Wb, 0);
      shape.lineTo(Wb * 0.75, H * 0.92);
      shape.lineTo(0, H);
      shape.closePath();
      const g = new THREE.ShapeGeometry(shape, 1);
      planeUVs(g);
      subdivideForBillow(g);
      const m = new THREE.Mesh(g, sailMat);
      m.position.set(0, mastBase + 0.55 * sc, mastZ - 0.06);
      m.rotation.y = Math.PI / 2;
      m.castShadow = true;
      sails.push(m);
      // boom + gaff spars
      const spar = toonMat('#6e4b2a');
      const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * sc, 0.035 * sc, Wb + 0.2, 5), spar);
      m.add(boom);
      boom.rotation.set(0, 0, Math.PI / 2);
      boom.position.set(Wb / 2, 0, 0);
      const gaff = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * sc, 0.03 * sc, Wb * 0.8, 5), spar);
      gaff.rotation.set(0, 0, Math.PI / 2 - 0.1);
      gaff.position.set(Wb * 0.37, H * 0.96, 0);
      m.add(gaff);
      if (sailTier >= 2) {
        const js = new THREE.Shape();
        js.moveTo(0, 0);
        js.lineTo(-1.5 * sc, 0);
        js.lineTo(0, (mastH - 0.6) * 0.9);
        js.closePath();
        const jg = new THREE.ShapeGeometry(js, 1);
        planeUVs(jg);
        subdivideForBillow(jg);
        const jib = new THREE.Mesh(jg, sailMat);
        jib.position.set(0, mastBase + 0.5 * sc, mastZ + 0.1);
        jib.rotation.y = Math.PI / 2;
        jib.castShadow = true;
        sails.push(jib);
      }
    }
  }
  sails.forEach((m) => group.add(m));

  // flag at masthead
  let flag: THREE.Mesh | null = null;
  if (s.equipped.flag !== 'flag_none') {
    const fg = new THREE.PlaneGeometry(0.7 * sc, 0.42 * sc, 6, 1);
    fg.translate(0.35 * sc, 0, 0);
    flag = new THREE.Mesh(fg, weather(new THREE.MeshToonMaterial({ map: flagTexture(s.equipped.flag), side: THREE.DoubleSide, transparent: true, alphaTest: 0.5 }), 0.6));
    flag.position.set(0, mastBase + mastH - 0.2, mastZ);
    if (glb) {
      // fly the equipped flag from the model's masthead, streaming aft, in place of its plain pennant
      flag.position.set(glb.flag.x, glb.flag.y - 0.21 * sc, glb.flag.z);
      flag.rotation.y = Math.PI / 2;
      if (glb.pennant) glb.pennant.visible = false;
    }
    flag.userData.base = Float32Array.from(fg.attributes.position.array as Float32Array);
    group.add(flag);
  }

  // ── GITCRAFT MeshCraft boat kit: every installed upgrade is a real model on its socket ──
  const K = KIT_SCALE[vessel];
  const beam = cat ? CAT_OFFSET + h.W : h.W;
  const dy = vessel === 'dinghy' ? h.sheer - 0.15 : h.sheer + (cat ? 0.12 : -0.02) + lift;
  const rotors: THREE.Object3D[] = [];
  // static kit parts are baked into one toon mesh + one glow mesh (2 draw calls for every upgrade);
  // parts that move (crane, harpoon, turbine) stay separate objects
  const kitSolid: THREE.BufferGeometry[] = [];
  const kitGlow: THREE.BufferGeometry[] = [];
  const DYNAMIC = new Set(['salvage_crane', 'harpoon_turret', 'deck_turbine']);
  const kit = (node: string, x: number, y: number, z: number, ry = 0, sc: number | [number, number, number] = K) => {
    const scv = Array.isArray(sc) ? new THREE.Vector3(...sc) : new THREE.Vector3(sc, sc, sc);
    if (!DYNAMIC.has(node)) {
      const pr = part('tb_boat_kit', node);
      if (!pr) return null;
      const m4 = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), scv);
      kitSolid.push(pr.geo.clone().applyMatrix4(m4));
      if (pr.glow) kitGlow.push(pr.glow.clone().applyMatrix4(m4));
      const anchor = new THREE.Object3D();
      anchor.position.set(x, y, z);
      return anchor;
    }
    const m = model('tb_boat_kit', node, { shadows: true });
    if (!m) return null;
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.scale.copy(scv);
    group.add(m);
    return m;
  };
  // the MeshCraft upgrade models on the sloop: static nodes join the kit batch, a moving part becomes its own group.
  // Returns the moving part (or a marker), or null when the file failed to load (the caller then draws the kit part).
  const roofLift = roofTop - SLOOP_ROOF;
  const fit = (id: string): THREE.Object3D | null => {
    const u = SLOOP_KIT[id];
    if (!glb || !u) return null;
    const bodies = (u.body ?? []).map((n) => ({ n, p: part(u.file, n, true) }));
    if (bodies.some((b) => !b.p)) return null;
    let obj: THREE.Object3D | null = null;
    if (u.pivot) {
      const g = model(u.file, u.pivot, { shadows: true, side: THREE.DoubleSide });
      const at = nodeOrigin(u.file, u.pivot);
      if (!g || !at) return null;
      g.position.copy(at);
      if (u.roof?.includes(u.pivot)) g.position.y += roofLift;
      if (u.restY) g.rotation.y = u.restY;
      obj = g;
    } else obj = new THREE.Object3D();
    obj.name = `upgrade_${id}`;
    group.add(obj);
    for (const b of bodies) {
      const m4 = new THREE.Matrix4().makeTranslation(0, u.roof?.includes(b.n) ? roofLift : 0, 0);
      kitSolid.push(b.p!.geo.clone().applyMatrix4(m4));
      if (b.p!.glow) kitGlow.push(b.p!.glow.clone().applyMatrix4(m4));
    }
    fitted[id] = true;
    return obj;
  };
  const engineUp = store.bestInSlot('engine');
  const engine = engineUp
    ? engineUp.visual === 'engine_twin'
      ? fit('engine_twin') ?? kit('engine_twin', 0, dy, fitted.rudder_ash ? -5.3 : -h.L / 2 + 0.6 * K) // kit: stern pod clear of the wheel
      : fit('engine_outboard') ?? kit('engine_outboard', cat ? CAT_OFFSET : 0, h.sheer - 0.25, -h.L / 2 - 0.05)
    : null;
  if (engineUp?.visual === 'engine_outboard' && cat) kit('engine_outboard', -CAT_OFFSET, h.sheer - 0.25, -h.L / 2 - 0.05);
  if (vessel === 'sloop' && !outriggers) {
    // the Trimaran's outrigger floats (welded fuel tanks): the kit fallback
    kit('outrigger', h.W * 0.85, h.sheer - 0.6, -0.4, 0, 1.15);
    kit('outrigger', -h.W * 0.85, h.sheer - 0.6, -0.4, Math.PI, 1.15);
  }
  const radar = store.has('radar_mast') ? fit('radar_mast') ?? kit('radar_mast', beam * 0.45, dy, -h.L * 0.3) : null;
  if (radar && fitted.radar_mast) radar.userData.spin = true;
  const crane = store.has('salvage_crane') ? fit('salvage_crane') ?? kit('salvage_crane', -beam * 0.55, dy, h.L * 0.06, -Math.PI / 2) : null;
  const harpoon = store.has('harpoon_turret') ? fit('harpoon_turret') ?? kit('harpoon_turret', 0, dy + (vessel === 'sloop' ? 0.25 : 0), h.L * 0.36) : null;
  if (store.has('cabin_container') && !fitted.cabin_container) kit('cabin_container', 0, dy, vessel === 'dinghy' ? -0.9 : -2.3, 0, vessel === 'dinghy' ? 0.5 : K);
  const roofY = store.has('cabin_container') ? (container ? CONTAINER_ROOF : dy + 2.0 * (vessel === 'dinghy' ? 0.5 : K)) : glb ? SLOOP_ROOF : dy + 1.35;
  if (store.has('solar_array') && !fit('solar_array')) kit('solar_array', 0, vessel === 'dinghy' ? dy : roofY, vessel === 'dinghy' ? -1.5 : -2.3, Math.PI, vessel === 'dinghy' ? 0.45 : K * 0.9);
  const turbineRotor = store.has('deck_turbine') ? fit('deck_turbine') : null;
  if (turbineRotor) rotors.push(turbineRotor);
  else if (store.has('deck_turbine')) {
    const t = kit('deck_turbine', beam * 0.62, dy, -h.L * 0.43);
    const rotor = model('tb_boat_kit', 'deck_turbine_rotor');
    if (t && rotor) {
      rotor.position.set(0, 2.65, 0);
      t.add(rotor);
      rotors.push(rotor);
    }
  }
  if (store.has('tank_drums') && !fit('tank_drums')) kit('fuel_drums', -beam * 0.5, dy, -h.L * 0.22, Math.PI / 2, vessel === 'dinghy' ? 0.5 : K);
  if (store.has('fishing_rig') && !fit('fishing_rig')) kit('fishing_rig', -beam * 0.55, dy, -h.L * 0.42, Math.PI, vessel === 'dinghy' ? 0.55 : K);
  if (store.has('cargo_net')) fit('cargo_net'); // (its code-built fallback is drawn with the hull, above)
  let lamp: THREE.PointLight | null = null;
  if (store.has('deck_lights')) {
    if (!fit('deck_lights')) {
      kit('spotlight', 0.25 * K, dy, h.L * 0.44, 0);
      for (const side of [-1, 1]) {
        kit('deck_lights', side * beam * 0.98, dy + 0.85 * K, -h.L * 0.05, Math.PI / 2, [K * (h.L / 9), K, K]);
      }
    }
    lamp = new THREE.PointLight(0xffc46b, 0, 18 * K, 1.6);
    lamp.position.set(0, dy + 2.2, 0);
    group.add(lamp);
  }
  if (store.has('hull_armor') && !fit('hull_armor')) {
    for (const side of [-1, 1]) {
      for (let i = 0; i < (cat ? 6 : vessel === 'sloop' ? 5 : 3); i++) {
        const u = 0.18 + i * (cat ? 0.12 : vessel === 'sloop' ? 0.14 : 0.2);
        const p = P(u, side * 0.9);
        kit('armor_plate', p.x + side * 0.05, h.sheer - 0.45 * K, p.z, side > 0 ? 0 : Math.PI, K * (vessel === 'dinghy' ? 0.9 : 1.2));
      }
    }
  }
  // the kit helm console + wheel was placed for the code-built cabin; on the model it half-buries in the cabin's
  // after wall and its flat top reads as a slab on the roof. The model steers with its own tiller (the wheel
  // upgrade will mount on socket_steering), so it is left off there.
  if (vessel !== 'dinghy' && !glb) kit('nav_console', 0.9 * K, dy, -h.L * 0.38, Math.PI);

  if (kitSolid.length) {
    const km = new THREE.Mesh(merge(kitSolid), vcMat());
    km.castShadow = true;
    km.receiveShadow = true;
    group.add(km);
  }
  if (kitGlow.length) group.add(new THREE.Mesh(merge(kitGlow), glowMat()));

  // crew members ride on deck (MeshCraft deckhand characters, Idle clip)
  const spots = cat
    ? [[-1.8, 2.5], [1.8, 1.0], [-1.2, -1.2], [2.2, -3.6], [-2.4, -4.2], [0.8, 4.4]]
    : vessel === 'sloop'
      ? [[-0.9, 1.6], [0.9, 0.2], [-0.8, -0.8], [0.9, 2.6]]
      : [[0, 0.6], [0, -0.3]];
  const crew: ShipParts['crew'] = [];
  s.crew.forEach((id, i) => {
    const def = CREW_MAP[id];
    const spot = spots[i % spots.length];
    const c = def && crewModel(def.role);
    if (!c) return;
    c.root.position.set(spot[0], dy - (vessel === 'dinghy' ? 0.1 : 0), spot[1]);
    c.root.rotation.y = i % 2 ? -0.6 : 0.6;
    c.root.scale.setScalar(vessel === 'dinghy' ? 0.85 : 1);
    group.add(c.root);
    const idle = c.actions.Idle ?? Object.values(c.actions)[0];
    if (idle) {
      idle.time = i * 0.7;
      idle.play();
    }
    crew.push({ id, ...c });
  });

  return {
    group,
    sails,
    flag,
    anchor,
    rope,
    seat,
    wake: new THREE.Vector3(0, 0, -h.L / 2),
    length: h.L,
    beam,
    waterline: { halfLen: h.L * 0.47, halfBeam: h.W * 0.82, twin: cat ? CAT_OFFSET : 0 },
    rotors,
    crew,
    lamp,
    harpoon,
    crane,
    radar,
    engine,
  };
}

function planeUVs(g: THREE.BufferGeometry) {
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = (p.getX(i) - bb.min.x) / (bb.max.x - bb.min.x || 1);
    uv[i * 2 + 1] = (p.getY(i) - bb.min.y) / (bb.max.y - bb.min.y || 1);
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/** Replace a simple shape geometry with a subdivided one so it can billow. */
function subdivideForBillow(g: THREE.BufferGeometry) {
  // Loop subdivision-lite: split each triangle into 16 smaller ones.
  const src = g.index ? g.toNonIndexed() : g;
  const p = src.attributes.position;
  const uv = src.attributes.uv;
  const outP: number[] = [];
  const outUV: number[] = [];
  const N = 5;
  for (let t = 0; t < p.count; t += 3) {
    const A = [p.getX(t), p.getY(t), uv.getX(t), uv.getY(t)];
    const B = [p.getX(t + 1), p.getY(t + 1), uv.getX(t + 1), uv.getY(t + 1)];
    const Cc = [p.getX(t + 2), p.getY(t + 2), uv.getX(t + 2), uv.getY(t + 2)];
    const at = (i: number, j: number) => {
      const a = 1 - (i + j) / N, b = i / N, c = j / N;
      return [0, 1, 2, 3].map((k) => A[k] * a + B[k] * b + Cc[k] * c);
    };
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N - i; j++) {
        const tri = [at(i, j), at(i + 1, j), at(i, j + 1)];
        for (const v of tri) {
          outP.push(v[0], v[1], 0);
          outUV.push(v[2], v[3]);
        }
        if (i + j < N - 1) {
          const tri2 = [at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)];
          for (const v of tri2) {
            outP.push(v[0], v[1], 0);
            outUV.push(v[2], v[3]);
          }
        }
      }
    }
  }
  g.setIndex(null);
  g.setAttribute('position', new THREE.Float32BufferAttribute(outP, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(outUV, 2));
  g.deleteAttribute('normal');
  g.computeVertexNormals();
  g.userData.base = Float32Array.from(outP);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < outP.length; i += 3) {
    minX = Math.min(minX, outP[i]);
    maxX = Math.max(maxX, outP[i]);
    minY = Math.min(minY, outP[i + 1]);
    maxY = Math.max(maxY, outP[i + 1]);
  }
  g.userData.bb = [minX, minY, maxX - minX || 1, maxY - minY || 1];
}

/** Billow sails based on wind fill (0..1), flutter flags, spin turbines and radar. */
export function animateShip(p: ShipParts, t: number, fill: number) {
  for (const r of p.rotors) r.rotation.z = t * 9;
  if (p.radar?.userData.spin) p.radar.rotation.y = t * 1.6; // the MeshCraft radar's scanner sweeps
  for (const s of p.sails) {
    const g = s.geometry;
    const base = g.userData.base as Float32Array | undefined;
    if (!base) continue;
    const pos = g.attributes.position;
    const bb = g.userData.bb as [number, number, number, number];
    const [minX, minY, w, hgt] = bb;
    for (let i = 0; i < pos.count; i++) {
      const x = (base[i * 3] - minX) / w;
      const y = (base[i * 3 + 1] - minY) / hgt;
      const belly = Math.sin(x * Math.PI) * Math.sin(Math.min(1, y * 1.2) * Math.PI * 0.9 + 0.1);
      const luff = (1 - fill) * Math.sin(t * 9 + x * 8 + y * 5) * 0.06;
      pos.setZ(i, belly * (0.12 + fill * 0.45) * (w * 0.35) + luff);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
  }
  if (p.flag) {
    const pos = p.flag.geometry.attributes.position;
    const base = p.flag.userData.base as Float32Array;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      pos.setZ(i, Math.sin(x * 6 - t * 9) * 0.08 * x * 2);
    }
    pos.needsUpdate = true;
  }
}
