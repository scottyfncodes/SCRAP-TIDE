// Loop pass Phase 3: the Daily Tide (seeded per UTC day), its score, streak and share text; sea-event decisions.
import { beforeEach, describe, expect, it } from 'vitest';
import { dayKey, daySeed, dayDiff, dailyPlan, planEvents, scoreDaily, nextStreak, shareText } from '../src/game/daily';
import { RNG } from '../src/core/noise';

const mem = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
(globalThis as any).window = globalThis;
const { Store, SAVE_VERSION } = await import('../src/state/store');

describe('Daily Tide seed', () => {
  it('the day is the UTC calendar day, so every player shares it', () => {
    expect(dayKey(new Date('2026-11-09T23:30:00-08:00'))).toBe('2026-11-10');
    expect(dayKey(new Date('2026-11-09T00:00:01Z'))).toBe('2026-11-09');
    expect(dayDiff('2026-11-09', '2026-11-10')).toBe(1);
    expect(dayDiff('2026-02-28', '2026-03-01')).toBe(1);
  });
  it('the same date always gives the same map and event set', () => {
    const a = dailyPlan('2026-11-09'), b = dailyPlan('2026-11-09');
    expect(a).toEqual(b);
    expect(daySeed('2026-11-09')).toBe(daySeed('2026-11-09'));
  });
  it('different dates give different seas', () => {
    const days = ['2026-11-09', '2026-11-10', '2026-11-11', '2027-01-01'].map((d) => JSON.stringify(dailyPlan(d).wrecks));
    expect(new Set(days).size).toBe(days.length);
  });
  it('each plan has wrecks of every tier but Legendary sometimes, and 2–3 distinct, spread-out events', () => {
    for (let i = 0; i < 60; i++) {
      const key = dayKey(new Date(Date.UTC(2026, 0, 1 + i)));
      const p = dailyPlan(key);
      expect(p.wrecks.filter((w) => w.tier === 'common').length).toBe(2);
      expect(p.wrecks.some((w) => w.tier === 'rare')).toBe(true);
      expect(p.events.length).toBeGreaterThanOrEqual(2);
      expect(p.events.length).toBeLessThanOrEqual(3);
      expect(new Set(p.events.map((e) => e.kind)).size).toBe(p.events.length);
      for (let j = 1; j < p.events.length; j++) expect(p.events[j].at).toBeGreaterThan(p.events[j - 1].at + 20);
      expect(p.events.every((e) => e.kind !== 'raiders')).toBe(true); // only when the pool includes it
    }
  });
  it('free-play events are randomised from the pool given', () => {
    const r = new RNG(3);
    const e = planEvents(() => r.next(), 240, ['rogue_wave', 'raiders']);
    expect(e.every((x) => ['rogue_wave', 'raiders'].includes(x.kind))).toBe(true);
  });
});

describe('score, streak, share', () => {
  it('scores what you bank plus small bonuses; sinking scores zero', () => {
    expect(scoreDaily({ banked: 200, perfects: 3, events: 2, legendary: 1, sunk: false }).total).toBe(200 + 30 + 50 + 50);
    expect(scoreDaily({ banked: 200, perfects: 3, events: 2, legendary: 1, sunk: true }).total).toBe(0);
  });
  it('the streak grows on consecutive days, holds on a replay, and restarts after a gap', () => {
    expect(nextStreak(null, 0, '2026-11-09')).toBe(1);
    expect(nextStreak('2026-11-09', 1, '2026-11-10')).toBe(2);
    expect(nextStreak('2026-11-10', 2, '2026-11-10')).toBe(2);
    expect(nextStreak('2026-11-10', 5, '2026-11-13')).toBe(1);
  });
  it('the share text has the date, score, events and streak, and no green (green means alive)', () => {
    const t = shareText('2026-11-09', scoreDaily({ banked: 120, perfects: 2, events: 1, legendary: 0, sunk: false }), 4, ['rogue_wave', 'rival']);
    expect(t).toContain('2026-11-09');
    expect(t).toContain('4-day streak');
    expect(t).toContain('🌊⛵');
    expect(t).not.toMatch(/🟩|💚|✅/u);
  });
});

describe('save migration v7 → v8', () => {
  beforeEach(() => mem.clear());
  it('adds the Daily Tide record and keeps everything else', () => {
    mem.set('tidebreakers.save.v1', JSON.stringify({ version: 7, gold: 77, vesselsOwned: ['dinghy', 'sloop'], vessel: 'sloop', upgrades: ['radar_mast', 'compass_brass'], cosmetics: ['flag_harbor'], quest: 'free', setsDone: ['set_beach'], tiers: { junk: 3, common: 2, rare: 1, legendary: 0 } }));
    const d = new Store().data;
    expect(d.version).toBe(SAVE_VERSION);
    expect(d.vesselsOwned).toEqual(['dinghy', 'sloop']);
    expect(d.upgrades).toEqual(['radar_mast', 'compass_brass']);
    expect(d.cosmetics).toContain('flag_harbor');
    expect(d.setsDone).toEqual(['set_beach']);
    expect(d.tiers.rare).toBe(1);
    expect(d.daily).toEqual({ last: null, streak: 0, best: {}, runs: 0, active: null, perfects: 0, legendary: 0 });
  });
});
