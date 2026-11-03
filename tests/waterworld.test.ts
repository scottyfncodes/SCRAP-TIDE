// Waterworld art-direction invariants: green means alive, every plant find has a model and a living item,
// living items span the rarity tiers, and the new settlements sit in open water away from the landmarks.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ITEMS, ITEM_MAP, RARITY_COLOR, LIVING_GREEN, isLiving } from '../src/data/items';
import { ISLANDS, OUTPOSTS, STRUCTURES, SETTLEMENTS, BEACH_POOL, CACHE_POOL } from '../src/data/world';
import { LIVING_ICONS } from '../src/ui/iconsLiving';
import { heightAt } from '../src/world/terrain';

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const greenness = (h: string) => { const [r, g, b] = hex(h); return g - Math.max(r, b); };

function glbNodes(path: string): string[] {
  const b = readFileSync(path);
  const len = b.readUInt32LE(12);
  return (JSON.parse(b.subarray(20, 20 + len).toString('utf8')).nodes ?? []).map((n: { name?: string }) => n.name);
}

describe('green means alive', () => {
  it('no rarity colour is green, so green can only mean a living plant', () => {
    for (const c of Object.values(RARITY_COLOR)) expect(greenness(c), c).toBeLessThan(0.08);
    expect(greenness(LIVING_GREEN)).toBeGreaterThan(0.3);
  });
  it('living items cover every rarity tier from algae to a legendary tree, each with a plant icon', () => {
    const living = ITEMS.filter((i) => i.category === 'living');
    for (const r of ['common', 'uncommon', 'rare', 'legendary'] as const) expect(living.some((i) => i.rarity === r), r).toBe(true);
    for (const i of living) if (i.id !== 'seed_packet') expect(LIVING_ICONS[i.icon], i.id).toBeDefined();
  });
  it('rarer plants are worth more', () => {
    const v = (id: string) => ITEM_MAP[id].value;
    expect(v('algae_mat')).toBeLessThan(v('seedling_tin'));
    expect(v('seedling_tin')).toBeLessThan(v('potted_green'));
    expect(v('potted_green')).toBeLessThan(v('fruit_vine'));
    expect(v('fruit_vine')).toBeLessThan(v('tree_sapling'));
  });
});

describe('plant finds', () => {
  const flora = new Set(glbNodes('public/models/tb_flora_kit.glb'));
  const finds = ISLANDS.flatMap((i) => i.finds.filter((f) => f.kind === 'plant').map((f) => ({ ...f, isl: i })));
  it('exist on several islands, each with a flora-kit model and living loot', () => {
    expect(new Set(finds.map((f) => f.isl.id)).size).toBeGreaterThanOrEqual(4);
    for (const f of finds) {
      expect(flora.has(f.plant!), `${f.id} → ${f.plant}`).toBe(true);
      expect(f.loot.some((l) => isLiving(l.id)), f.id).toBe(true);
    }
  });
  it('sit on dry land you can walk to', () => {
    for (const f of finds) expect(heightAt(f.isl.x + f.x, f.isl.z + f.z), f.id).toBeGreaterThan(0.4);
  });
  it('the legendary sapling grows only on Canopy Rise', () => {
    const s = finds.filter((f) => f.loot.some((l) => l.id === 'tree_sapling'));
    expect(s.map((f) => f.isl.id)).toEqual(['mossjaw']);
  });
  it('common greens wash up and drift; rare ones never do', () => {
    const pools = [...Object.values(BEACH_POOL).flat().map((p) => p.id), ...Object.values(CACHE_POOL).flat().map((p) => p.id)];
    expect(pools).toContain('algae_mat');
    for (const id of ['potted_green', 'flowering_jar', 'fruit_vine', 'tree_sapling']) expect(pools).not.toContain(id);
  });
});

describe('settlement hierarchy', () => {
  it('outposts, the fort and the story pieces float in open water clear of structures and settlements', () => {
    for (const o of OUTPOSTS) {
      expect(heightAt(o.x, o.z), o.id).toBeLessThan(-3);
      for (const s of STRUCTURES) expect(Math.hypot(s.x - o.x, s.z - o.z), `${o.id} vs ${s.kind}`).toBeGreaterThan(o.r + s.r - 4);
      for (const s of SETTLEMENTS) expect(Math.hypot(s.x - o.x, s.z - o.z), `${o.id} vs ${s.id}`).toBeGreaterThan(60);
    }
    expect(OUTPOSTS.filter((o) => o.kind === 'outpost').length).toBeGreaterThanOrEqual(3);
    expect(OUTPOSTS.some((o) => o.kind === 'raider_fort')).toBe(true);
  });
  it('every atoll/outpost node the world builder uses exists in the GITCRAFT kits', () => {
    const atoll = new Set(glbNodes('public/models/tb_atoll_kit.glb'));
    const outpost = new Set(glbNodes('public/models/tb_outpost_kit.glb'));
    const src = readFileSync('src/world/drowned.ts', 'utf8') + readFileSync('src/world/environment.ts', 'utf8');
    for (const [, file, node] of src.matchAll(/'(tb_atoll_kit|tb_outpost_kit)', '([a-z_]+)'/g)) expect((file === 'tb_atoll_kit' ? atoll : outpost).has(node), `${file}#${node}`).toBe(true);
  });
});
