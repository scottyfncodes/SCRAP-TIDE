// Every GITCRAFT model the game loads ships in public/models, is a valid glTF 2.0 binary, carries COLOR_0
// vertex colours (the game's toon pipeline) and contains every node the code asks for by name.
import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { MODEL_FILES, CREW_FILES } from '../src/world/assets';

function glbJson(path: string) {
  const b = readFileSync(path);
  expect(b.readUInt32LE(0)).toBe(0x46546c67); // 'glTF'
  expect(b.readUInt32LE(4)).toBe(2);
  const len = b.readUInt32LE(12);
  expect(b.readUInt32LE(16)).toBe(0x4e4f534a); // JSON chunk
  return JSON.parse(b.subarray(20, 20 + len).toString('utf8'));
}

// nodes the game code asks for by name (drowned.ts, shipModel.ts, game.ts, raiders.ts)
const NEEDED: Record<string, string[]> = {
  tb_tower_glass: ['tower_glass_body'],
  tb_tower_brick: ['tower_brick_body'],
  tb_tower_spire: ['tower_spire_body'],
  tb_tower_stump: ['tower_stump_body'],
  tb_oil_rig: ['oil_rig_body'],
  tb_tanker_wreck: ['tanker_body'],
  tb_containers: ['container_red', 'container_blue', 'container_yellow', 'container_teal'],
  tb_settlement_kit: ['mod_shack', 'mod_market', 'mod_turbine', 'mod_turbine_rotor', 'mod_water', 'mod_walkway'],
  tb_boat_kit: ['engine_outboard', 'engine_twin', 'radar_mast', 'salvage_crane', 'harpoon_turret', 'deck_turbine', 'deck_turbine_rotor', 'solar_array',
    'cabin_container', 'fuel_drums', 'spotlight', 'fishing_rig', 'outrigger', 'deck_lights', 'armor_plate', 'nav_console'],
  tb_raider_skiff: ['raider_body'],
  tb_debris_kit: ['cache_crate', 'buoy', 'debris_patch', 'oil_drum', 'castaway_raft'],
  tb_trawler_wreck: ['trawler_body'],
  tb_port_crane: ['crane_body'],
  tb_flotsam_kit: ['barrel_raft', 'net_tangle', 'bell_buoy', 'hull_shard'],
};

describe('GITCRAFT models in public/models', () => {
  const files = [...MODEL_FILES, ...CREW_FILES.map((r) => `tb_crew_${r}`)];
  it.each(files)('%s is a valid, vertex-coloured glTF with its nodes', (name) => {
    const path = `public/models/${name}.glb`;
    expect(existsSync(path), path).toBe(true);
    expect(statSync(path).size).toBeLessThan(400_000);
    const j = glbJson(path);
    expect(j.asset.version).toBe('2.0');
    const names = new Set((j.nodes ?? []).map((n: { name?: string }) => n.name));
    for (const n of NEEDED[name] ?? []) expect(names.has(n), `${name} missing node ${n}`).toBe(true);
    for (const m of j.meshes ?? []) for (const p of m.primitives) expect(p.attributes.COLOR_0, `${name}/${m.name}`).toBeDefined();
  });
  it('crew characters are rigged with Mixamo-named bones and an Idle clip', () => {
    for (const r of CREW_FILES) {
      const j = glbJson(`public/models/tb_crew_${r}.glb`);
      expect(j.skins?.length).toBeGreaterThan(0);
      expect((j.animations ?? []).map((a: { name: string }) => a.name)).toContain('Idle');
      expect(j.nodes.some((n: { name?: string }) => /mixamorig:Hips|Hips/.test(n.name ?? ''))).toBe(true);
    }
  });
});
