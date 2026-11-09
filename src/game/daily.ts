// The Daily Tide (loop pass Phase 3): one seeded trip per real calendar day (UTC), the same for every player.
// The seed fixes where the wrecks are, their tiers, and which sea events come when. Score = what you bank, plus
// small bonuses; sink and you score what the hold was worth at the end... nothing. Free play is always open too:
// the Daily Tide never blocks anything, has no energy and can be replayed (your best run of the day counts).
import { RNG } from '../core/noise';
import type { WreckTier } from '../data/loot';

export type SeaEventKind = 'rogue_wave' | 'surfacing_wreck' | 'rival' | 'creature' | 'raiders';
export interface PlannedEvent {
  kind: SeaEventKind;
  at: number; // trip seconds
}
export interface PlannedWreck {
  bearing: number; // rad from the pier, world space
  dist: number; // m from the pier
  tier: WreckTier;
}
export interface DailyPlan {
  date: string; // YYYY-MM-DD (UTC)
  seed: number;
  wrecks: PlannedWreck[];
  events: PlannedEvent[];
}

/** "2026-11-09" for a Date, in UTC so every player shares the same day. */
export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** A stable 31-bit seed for a day key. */
export function daySeed(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 1) || 1;
}

/** Days between two day keys (b - a). */
export function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

/**
 * Sea events for one trip. Two or three, spread over the trip, never two at once. `pool` lets Phase 4 add the raider
 * event only when the Wave Runner exists in the build.
 */
export function planEvents(rng: () => number, tripLen: number, pool: SeaEventKind[] = ['rogue_wave', 'surfacing_wreck', 'rival', 'creature']): PlannedEvent[] {
  const n = 2 + (rng() < 0.5 ? 1 : 0);
  const kinds = [...pool];
  const out: PlannedEvent[] = [];
  const span = Math.max(60, tripLen - 50);
  for (let i = 0; i < n && kinds.length; i++) {
    const k = kinds.splice(Math.floor(rng() * kinds.length), 1)[0];
    const slot = span / n;
    out.push({ kind: k, at: Math.round(35 + slot * i + rng() * slot * 0.6) });
  }
  return out;
}

/** The whole Daily Tide plan for a date. Same date, same plan, everywhere. */
export function dailyPlan(key: string, pool?: SeaEventKind[]): DailyPlan {
  const seed = daySeed(key);
  const r = new RNG(seed);
  const rng = () => r.next();
  const wrecks: PlannedWreck[] = [];
  const tiers: WreckTier[] = ['common', 'common', 'rare', rng() < 0.4 ? 'legendary' : 'rare'];
  for (const tier of tiers) {
    const far = tier === 'common' ? 0.3 : tier === 'rare' ? 0.6 : 0.9;
    wrecks.push({ bearing: rng() * Math.PI * 2, dist: Math.round(140 + far * 260 + rng() * 60), tier });
  }
  return { date: key, seed, wrecks, events: planEvents(rng, 240, pool) };
}

export interface DailyScore {
  banked: number; // hold value banked at the end
  perfects: number;
  events: number; // events survived / won
  legendary: number; // legendary finds banked
  sunk: boolean;
  total: number;
}
export function scoreDaily(s: Omit<DailyScore, 'total'>): DailyScore {
  const total = s.sunk ? 0 : s.banked + s.perfects * 10 + s.events * 25 + s.legendary * 50;
  return { ...s, total };
}

/** The streak after playing on `today`, given the last day played and the streak then. */
export function nextStreak(last: string | null, streak: number, today: string): number {
  if (!last) return 1;
  const d = dayDiff(last, today);
  if (d <= 0) return Math.max(1, streak); // same day: no change
  return d === 1 ? streak + 1 : 1;
}

/** The shareable emoji result. */
export function shareText(date: string, sc: DailyScore, streak: number, eventsSeen: SeaEventKind[]): string {
  const icon: Record<SeaEventKind, string> = { rogue_wave: '🌊', surfacing_wreck: '⚓', rival: '⛵', creature: '🐙', raiders: '🏴‍☠️' };
  const bar = (n: number, max: number) => '🟨'.repeat(Math.min(max, n)) + '⬛'.repeat(Math.max(0, max - Math.min(max, n)));
  return [
    `SCRAP TIDE · Daily Tide ${date}`,
    sc.sunk ? '💀 Swamped. The sea kept it all.' : `💰 ${sc.total} pts · banked ${sc.banked}g`,
    `🎯 ${bar(sc.perfects, 5)}`,
    `${eventsSeen.map((e) => icon[e]).join('')} ${sc.events}/${eventsSeen.length} events beaten${sc.legendary ? ' · 👑 legendary' : ''}`,
    `🔥 ${streak}-day streak`,
  ].join('\n');
}
