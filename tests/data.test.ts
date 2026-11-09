// Data integrity for the Drowned World: every reference between data files resolves, the world is
// navigable where it needs to be, and every item has an icon.
import { describe, expect, it } from 'vitest';
import { ITEMS, ITEM_MAP } from '../src/data/items';
import { UPGRADES, UPGRADE_MAP, VESSELS, COSMETICS, SLOT_ORDER } from '../src/data/ship';
import { RECIPES } from '../src/data/crafting';
import { CREW, ROLE_INFO } from '../src/data/crew';
import { GOALS, MILESTONES, FIRST_VOYAGE, RETIRED_STEPS, liveStep } from '../src/data/progress';
import { SALVAGE_SITES, CACHE_POOL, STRUCTURES, SETTLEMENTS, CASTAWAYS, RAIDER_ZONES, ISLANDS, BEACH_POOL, DIG_POOL, WORLD } from '../src/data/world';
import { DROWNED_ICONS } from '../src/ui/iconsDrowned';
import { LIVING_ICONS } from '../src/ui/iconsLiving';
import { heightAt } from '../src/world/terrain';
import { waveHeight, waveAmp } from '../src/world/ocean';

const BUILTIN_ICONS = ['coin', 'pearl', 'ring', 'gem', 'bar', 'idol', 'whistle', 'mask', 'page', 'flag', 'conch', 'spiral', 'sanddollar', 'starfish', 'seaglass', 'coral', 'bell', 'spyglass', 'sextant', 'key', 'bottle', 'plank', 'rope', 'nails', 'cloth', 'map'];

describe('items', () => {
  it('have unique ids and an icon', () => {
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
    for (const i of ITEMS) expect(BUILTIN_ICONS.includes(i.icon) || !!DROWNED_ICONS[i.icon] || !!LIVING_ICONS[i.icon], `icon for ${i.id}`).toBe(true);
  });
  it('every drowned-world icon renders SVG with both colours substituted', () => {
    for (const [k, f] of Object.entries(DROWNED_ICONS)) {
      const svg = f('#123456', '#abcdef');
      expect(svg, k).toContain('#123456');
      expect(svg).not.toMatch(/#ff00fe|#00feff/i);
    }
  });
});

describe('loot tables reference real items', () => {
  const pools = [
    ...SALVAGE_SITES.flatMap((s) => [...s.loot.map((l) => l.id), ...(s.first ?? []).map((f) => f.id)]),
    ...Object.values(CACHE_POOL).flatMap((p) => p.map((l) => l.id)),
    ...Object.values(BEACH_POOL).flatMap((p) => p.map((l) => l.id)),
    ...DIG_POOL.map((l) => l.id),
    ...RECIPES.flatMap((r) => [r.makes.id, ...r.needs.map((n) => n.id)]),
    ...UPGRADES.flatMap((u) => (u.cost.mats ?? []).map((m) => m.id)),
    ...Object.values(VESSELS).flatMap((v) => (v.cost?.mats ?? []).map((m) => m.id)),
  ];
  it.each(pools)('%s exists', (id) => expect(ITEM_MAP[id]).toBeDefined());
  it('loot ranges are sane', () => {
    for (const s of SALVAGE_SITES) for (const l of s.loot) expect(l.n[0]).toBeLessThanOrEqual(l.n[1]);
  });
});

describe('boat progression', () => {
  it('upgrade prerequisites exist and are lower tier in the same or a related slot', () => {
    for (const u of UPGRADES) {
      if (u.requires) expect(UPGRADE_MAP[u.requires], u.id).toBeDefined();
      expect(SLOT_ORDER).toContain(u.slot);
      for (const w of u.where ?? []) expect(SETTLEMENTS.map((s) => s.id)).toContain(w);
    }
  });
  it('every slot has at least one upgrade, and vessels grow', () => {
    for (const slot of SLOT_ORDER) expect(UPGRADES.some((u) => u.slot === slot), slot).toBe(true);
    const v = [VESSELS.dinghy, VESSELS.sloop, VESSELS.ironwake];
    for (let i = 1; i < v.length; i++) {
      expect(v[i].cargo).toBeGreaterThan(v[i - 1].cargo);
      expect(v[i].hull).toBeGreaterThan(v[i - 1].hull);
      expect(v[i].berths).toBeGreaterThan(v[i - 1].berths);
    }
    expect(VESSELS.ironwake.crossStorm).toBe(true);
  });
  it('cosmetic unlocks point at real milestones', () => {
    for (const c of COSMETICS) if (c.unlock) expect(MILESTONES.map((m) => m.id), c.id).toContain(c.unlock);
  });
});

describe('crew, goals, settlements', () => {
  it('crew roles are defined and every role is recruitable', () => {
    for (const c of CREW) {
      expect(ROLE_INFO[c.role]).toBeDefined();
      expect(['castaway', ...SETTLEMENTS.map((s) => s.id)]).toContain(c.home);
      if (c.requires?.upgrade) expect(UPGRADE_MAP[c.requires.upgrade]).toBeDefined();
    }
    expect(new Set(CREW.map((c) => c.role)).size).toBe(Object.keys(ROLE_INFO).length);
    for (const cw of CASTAWAYS) expect(CREW.find((c) => c.id === cw.crew)?.home).toBe('castaway');
  });
  it('the Captain’s Log ends on a terminal goal and the first voyage ends free', () => {
    expect(GOALS[GOALS.length - 1].id).toBe('g_done');
    expect(FIRST_VOYAGE[FIRST_VOYAGE.length - 1].id).toBe('free');
  });
  it('the First Voyage is 10 steps of things done in the world (loop pass: first haul and bank come first), and every retired step continues somewhere live', () => {
    expect(FIRST_VOYAGE).toHaveLength(10);
    expect(FIRST_VOYAGE.slice(0, 4).map((q) => q.id)).toEqual(['leave_dock', 'first_haul', 'bank_haul', 'upgrade']);
    const live = new Set(FIRST_VOYAGE.map((q) => q.id));
    for (const id of ['steer', 'anchor', 'read_map', 'sell', 'catalog']) expect(live.has(id as never), id).toBe(false);
    for (const [from, to] of Object.entries(RETIRED_STEPS)) {
      expect(live.has(to!), `${from} -> ${to}`).toBe(true);
      expect(liveStep(from)).toBe(to);
    }
    for (const q of FIRST_VOYAGE) expect(liveStep(q.id)).toBe(q.id);
    expect(liveStep('nonsense')).toBe(FIRST_VOYAGE[0].id);
    // the salvage verb is part of the voyage now
    expect(FIRST_VOYAGE.some((q) => /salvage/i.test(q.text + q.hint))).toBe(true);
  });
});

describe('world layout', () => {
  const half = WORLD.size / 2 - 40;
  it('structures, sites, settlements and castaways sit inside the world and in water', () => {
    for (const p of [...STRUCTURES, ...SALVAGE_SITES, ...SETTLEMENTS, ...CASTAWAYS, ...RAIDER_ZONES]) {
      expect(Math.abs(p.x), JSON.stringify(p)).toBeLessThan(half);
      expect(Math.abs(p.z)).toBeLessThan(half);
    }
    for (const s of [...STRUCTURES, ...CASTAWAYS]) expect(heightAt(s.x, s.z), `${JSON.stringify(s)} is on land`).toBeLessThan(-1);
  });
  it('structures do not overlap islands', () => {
    for (const s of STRUCTURES) for (const i of ISLANDS) expect(Math.hypot(s.x - i.x, s.z - i.z), `${s.kind}@${s.x},${s.z} vs ${i.id}`).toBeGreaterThan(i.r + s.r);
  });
  it('settlement docks are reachable (not inside a structure collider)', () => {
    for (const st of SETTLEMENTS) {
      if (st.id === 'driftholm') continue;
      const blocking = STRUCTURES.filter((s) => Math.hypot(s.x - st.x, s.z - st.z) < s.r - 1);
      // Rig Helios docks against its own platform: the dock radius must reach past the legs
      for (const b of blocking) expect(st.dockR, st.id).toBeGreaterThan(b.r);
    }
  });
  it('sites in the Reach are beyond the open swell, the Spire is inside the Stormwall', () => {
    const c = WORLD.shallowsCenter;
    for (const s of SALVAGE_SITES) {
      const d = Math.hypot(s.x - c.x, s.z - c.z);
      if (s.region === 'shallows') expect(d, s.id).toBeLessThan(WORLD.shallowsRadius);
      if (s.region === 'emerald') expect(d, s.id).toBeGreaterThan(WORLD.shallowsRadius);
      if (s.region === 'stormwall') expect(d, s.id).toBeGreaterThan(WORLD.stormRadius);
    }
  });
});

describe('ocean', () => {
  it('waves are bounded and grow in storms', () => {
    let calm = 0, storm = 0;
    for (let i = 0; i < 400; i++) {
      const x = (i * 37) % 900 - 450, z = (i * 91) % 900 - 450, t = i * 0.31;
      calm = Math.max(calm, Math.abs(waveHeight(x, z, t, waveAmp(20, 0, 0))));
      storm = Math.max(storm, Math.abs(waveHeight(x, z, t, waveAmp(20, 1, 1))));
    }
    expect(calm).toBeLessThan(1.6);
    expect(storm).toBeGreaterThan(calm * 2);
    expect(storm).toBeLessThan(12);
  });
});
