// Push-your-luck trips (loop pass, Phase 1).
//
// A trip runs from casting off to docking at any settlement. While you are out, a squall builds behind you: the trip
// clock fills, and once it runs out the squall is on you (rain, swell and hull damage that grows until you dock or
// are swamped). Loot sits in the hold and only counts once you dock. Swamped: the hold goes over the side, but gold,
// upgrades, ships and everything already in the vault are never touched.
//
// Pure functions only: the game reads them every frame, the tests read them directly.
import { item } from '../data/items';

export interface TripStats {
  solar: number; // fuel regen per minute (solar 2.5, turbine 6)
  fuelCap: number;
  tripBonus?: number; // Salvage Log sets (s)
}

/** Base trip length, seconds of open water before the squall arrives. */
export const TRIP_BASE = 210;
/** Seconds from the squall's arrival to full strength. */
export const SQUALL_RAMP = 25;
/** Warn this many seconds before the squall arrives. */
export const SQUALL_WARN = 45;

/** How long a trip lasts before the squall arrives (s). The Wind Turbine and the Fuel Drum Rack extend it. */
export function tripLength(st: TripStats): number {
  let t = TRIP_BASE;
  if (st.solar >= 6) t += 60; // Deck Wind Turbine (with the array)
  else if (st.solar > 0) t += 20; // Solar Array alone
  if (st.fuelCap > 40) t += 20; // Fuel Drum Rack
  return t + (st.tripBonus ?? 0);
}

/** 0 before the squall arrives, then ramps to 1 over SQUALL_RAMP seconds. */
export function squallLevel(elapsed: number, length: number): number {
  if (elapsed <= length) return 0;
  return Math.min(1, (elapsed - length) / SQUALL_RAMP);
}

/** Extra hull damage per second from the squall (on top of the storm's own), before armour. */
export function squallDamage(level: number, elapsed: number, length: number): number {
  if (level <= 0) return 0;
  return level * (2 + 0.05 * Math.max(0, elapsed - length - SQUALL_RAMP));
}

/** Seconds left before the squall (0 once it is here). */
export function tripLeft(elapsed: number, length: number): number {
  return Math.max(0, length - elapsed);
}

export type TripPhase = 'calm' | 'warn' | 'squall';
export function tripPhase(elapsed: number, length: number): TripPhase {
  if (elapsed > length) return 'squall';
  if (length - elapsed <= SQUALL_WARN) return 'warn';
  return 'calm';
}

/** What the hold would sell for at base price (the hold counter). */
export function holdValue(cargo: { id: string; n: number }[]): number {
  let v = 0;
  for (const s of cargo) v += item(s.id).value * s.n;
  return v;
}

/**
 * Items that never go over the side when you are swamped: one-of-a-kind story finds (epic and legendary), so a
 * lost hold can never break a character arc or contract chain.
 */
export function keepsOnSink(id: string): boolean {
  const r = item(id).rarity;
  return r === 'epic' || r === 'legendary';
}

/** Split a hold into what is lost and what stays when swamped. Mutates nothing. */
export function sinkHold(cargo: { id: string; n: number }[]) {
  const kept: { id: string; n: number }[] = [];
  const lost: { id: string; n: number }[] = [];
  for (const s of cargo) (keepsOnSink(s.id) ? kept : lost).push({ id: s.id, n: s.n });
  return { kept, lost, lostValue: holdValue(lost) };
}

/** "3:05" */
export function clockText(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** How fast the trip clock runs: the dark eats it 1.5× faster without deck lights (loop pass Phase 2). */
export function clockRate(night: number, lights: boolean): number {
  return lights ? 1 : 1 + 0.5 * Math.max(0, Math.min(1, (night - 0.5) * 2));
}
