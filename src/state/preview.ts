// Preview link: ?ship=skiff | trimaran | ironwake starts this visit in that vessel without unlocking it.
// The visit runs on an in-memory copy of the save; nothing is ever written back to localStorage.
import type { VesselId } from '../data/ship';

const SHIP_ALIASES: Record<string, VesselId> = {
  skiff: 'dinghy',
  dinghy: 'dinghy',
  patchwork: 'dinghy',
  trimaran: 'sloop',
  sloop: 'sloop',
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
