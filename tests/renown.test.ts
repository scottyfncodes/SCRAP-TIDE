// Refit stages, renown titles and the boat's name (design bible PR 1.4).
import { describe, expect, it } from 'vitest';
import { REFIT_STAGES, RENOWN, SHIP_NAMES, refitStage, renownTitle } from '../src/data/renown';
import { UPGRADES } from '../src/data/ship';

const blank = { hauls: 0, chestsOpened: 0, regionsSeen: ['shallows'], flags: [] as string[] };

describe('refit stages', () => {
  it('Stripped → Rigged at 3 parts → Fitted Out at 7, all reachable with the parts that exist', () => {
    expect(refitStage(0).id).toBe('stripped');
    expect(refitStage(2).id).toBe('stripped');
    expect(refitStage(3).id).toBe('rigged');
    expect(refitStage(6).id).toBe('rigged');
    expect(refitStage(7).id).toBe('fitted');
    expect(REFIT_STAGES[REFIT_STAGES.length - 1].min).toBeLessThanOrEqual(UPGRADES.length);
  });
});

describe('renown', () => {
  it('is earned by deeds in order: Drifter, Scavenger, Rover, Tidebreaker', () => {
    expect(renownTitle(blank).title).toBe('Drifter');
    expect(renownTitle({ ...blank, hauls: 1 }).title).toBe('Drifter'); // a haul alone isn't enough
    expect(renownTitle({ ...blank, hauls: 1, chestsOpened: 1 }).title).toBe('Scavenger');
    expect(renownTitle({ ...blank, hauls: 1, chestsOpened: 1, regionsSeen: ['shallows', 'emerald'] }).title).toBe('Rover');
    expect(renownTitle({ ...blank, flags: ['reached_spire'], regionsSeen: ['emerald'] }).title).toBe('Tidebreaker');
    expect(RENOWN.map((r) => r.id)).toEqual(['drifter', 'scavenger', 'rover', 'tidebreaker']);
  });
  it('offers names that fit on a stern plate', () => {
    expect(SHIP_NAMES.length).toBeGreaterThanOrEqual(8);
    for (const n of SHIP_NAMES) expect(n.length, n).toBeLessThanOrEqual(24);
  });
});
