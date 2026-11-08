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
  const v = new URLSearchParams(search).get('ship');
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
  return typeof location === 'undefined' ? null : previewUpgrades(location.search);
}
