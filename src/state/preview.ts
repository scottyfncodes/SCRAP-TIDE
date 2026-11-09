// Preview link: ?ship=skiff | trimaran | ironwake starts this visit in that vessel without unlocking it, and
// &upgrades=all (or a comma list of upgrade ids) fits those upgrades. The visit runs on an in-memory copy of the
// save; nothing is ever written back to localStorage.
import { UPGRADES, type VesselId } from '../data/ship';

const SHIP_ALIASES: Record<string, VesselId> = {
  skiff: 'dinghy',
  dinghy: 'dinghy',
  patchwork: 'dinghy',
  trimaran: 'sloop',
  sloop: 'sloop',
  brig: 'brig',
  saltbrig: 'brig',
  ironwake: 'ironwake',
  cat: 'ironwake',
};

/** The vessel a `?ship=` preview link asks for, or null for a normal visit. */
export function previewShip(search: string): VesselId | null {
  const q = new URLSearchParams(search);
  const v = q.get('ship');
  if (!v && q.get('vehicle')) return 'sloop'; // vehicles ride on the Trimaran
  return v ? SHIP_ALIASES[v.trim().toLowerCase()] ?? null : null;
}

/** The current page's preview vessel (null outside a browser or without `?ship=`). */
export function pagePreviewShip(): VesselId | null {
  return typeof location === 'undefined' ? null : previewShip(location.search);
}

/** The upgrades an `upgrades=` preview link fits: `all`, or a comma list of upgrade ids (unknown ids ignored). */
export function previewUpgrades(search: string): string[] | null {
  const v = new URLSearchParams(search).get('upgrades');
  if (!v) return null;
  const want = v.trim().toLowerCase();
  if (want === 'all') return UPGRADES.map((u) => u.id);
  const ids = new Set(UPGRADES.map((u) => u.id));
  const list = want.split(',').map((x) => x.trim()).filter((x) => ids.has(x));
  return list.length ? list : null;
}

export function pagePreviewUpgrades(): string[] | null {
  if (typeof location === 'undefined') return null;
  const base = previewUpgrades(location.search);
  const veh = previewVehicleUpgrades(location.search);
  return veh ? [...new Set([...(base ?? []), ...veh])] : base;
}

/**
 * `?vehicle=waverunner` / `?vehicle=balloon` (loop pass Phase 4): fit that vehicle and all its add-ons for this
 * visit without unlocking it, like ?ship=. A vehicle link alone previews the save's own boat as the Trimaran, where
 * both vehicles ride. (The balloon also fits the radar it needs.)
 */
export function previewVehicleUpgrades(search: string): string[] | null {
  const v = new URLSearchParams(search).get('vehicle')?.trim().toLowerCase();
  if (!v) return null;
  const out: string[] = [];
  const want = v.split(',').map((x) => x.trim());
  const all = want.includes('all');
  if (all || want.some((x) => /^(wave|waverunner|wave_runner|runner|jetski)$/.test(x))) out.push('wr_runner', 'wr_tank', 'wr_sled', 'wr_boost');
  if (all || want.some((x) => /^(balloon|airballoon|hotair)$/.test(x))) out.push('compass_brass', 'radar_mast', 'bl_balloon', 'bl_winch');
  return out.length ? out : null;
}

/** The vehicle a ?vehicle= link asks to start in (null outside such a preview). */
export function pagePreviewVehicle(): 'runner' | 'balloon' | null {
  if (typeof location === 'undefined') return null;
  const v = new URLSearchParams(location.search).get('vehicle')?.toLowerCase() ?? '';
  return /^(balloon|airballoon|hotair)/.test(v) ? 'balloon' : /^(wave|runner|jet)/.test(v) ? 'runner' : null;
}
