// Sea caves and the Redfinch Line's third map (design bible PR 1.5).
import { describe, expect, it } from 'vitest';
import { ISLANDS, TREASURE_MAPS, FRAGMENT_MAP, ISLAND_MAP } from '../src/data/world';
import { UPGRADE_MAP } from '../src/data/ship';
import { ITEM_MAP } from '../src/data/items';
import { RUMOURS } from '../src/data/rumours';
import { heightAt } from '../src/world/terrain';

const caves = ISLANDS.flatMap((i) => i.landmarks.filter((l) => l.type === 'cave').map((l) => ({ isl: i, l })));
const caveFinds = ISLANDS.flatMap((i) => i.finds.filter((f) => f.requiresUpgrade).map((f) => ({ isl: i, f })));

describe('sea caves', () => {
  it('three cave mouths, on Turtle Atoll, Lantern Rock and Canopy Rise, each on land', () => {
    expect(caves.map((c) => c.isl.id).sort()).toEqual(['lantern', 'mossjaw', 'turtle']);
    for (const { isl, l } of caves) expect(heightAt(isl.x + l.x, isl.z + l.z), isl.id).toBeGreaterThan(0.5);
  });
  it('each cave holds one find that needs String Lights & Spotlight, sitting in its mouth', () => {
    expect(caveFinds).toHaveLength(3);
    for (const { isl, f } of caveFinds) {
      expect(f.requiresUpgrade).toBe('deck_lights');
      expect(UPGRADE_MAP[f.requiresUpgrade!]).toBeDefined();
      const cave = isl.landmarks.find((l) => l.type === 'cave')!;
      expect(Math.hypot(f.x - cave.x, f.z - cave.z), f.id).toBeLessThan(3);
      for (const l of f.loot) expect(ITEM_MAP[l.id], l.id).toBeDefined();
      expect(f.requiresText).toMatch(/light/i);
    }
  });
});

describe('The Keeper’s Light', () => {
  const m = TREASURE_MAPS.find((t) => t.id === 'keeper_map')!;
  it('is found in the Belly cave and dug on Lantern Rock, beside the cave the clue names', () => {
    const frag = FRAGMENT_MAP[m.fragments[0]];
    expect(frag.mapId).toBe('keeper_map');
    expect(caveFinds.find(({ f }) => f.fragment === frag.id)?.isl.id).toBe('turtle');
    const isl = ISLAND_MAP[m.island];
    expect(heightAt(isl.x + m.x, isl.z + m.z)).toBeGreaterThan(0.5);
    for (const t of m.landmarks) expect(isl.landmarks.some((l) => l.type === t), t).toBe(true);
  });
  it('Old Wren has a rumour that points at the Belly', () => {
    expect(RUMOURS.some((r) => r.done.find === 'turtle_cave')).toBe(true);
  });
});
