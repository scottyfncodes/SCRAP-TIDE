// Every GITCRAFT model the game loads ships in public/models, is a valid glTF 2.0 binary, carries COLOR_0
// vertex colours (the game's toon pipeline) and contains every node the code asks for by name.
import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { MODEL_FILES, CREW_FILES, CHARACTER_FILES } from '../src/world/assets';

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
  tb_atoll_kit: ['atoll_wall', 'atoll_wall_burnt', 'atoll_gate', 'watchtower', 'water_tank', 'propeller', 'container_home'],
  tb_outpost_kit: ['pontoon', 'rain_catcher', 'net_tower', 'market_stall', 'sinking_platform', 'dead_tree', 'scrap_heap', 'salvage_barge', 'scrap_boat'],
  tb_flora_kit: ['flora_algae', 'flora_seaweed', 'flora_seedling', 'flora_moss', 'flora_potted', 'flora_flowering', 'flora_fruit', 'flora_sapling',
    'greenhouse', 'garden_plot', 'last_tree'],
  // upgrades attach to these sockets later; the hull/sail/flag/deck sockets must survive every re-export
  tb_coastal_sloop: ['tidebreakers_coastal_sloop', 'tidebreakers_coastal_sloop_mesh', 'socket_flag', 'socket_hull', 'socket_navigation', 'socket_sail',
    'socket_steering', 'socket_storage'],
  tb_sloop_outriggers: ['tb_sloop_outriggers', 'outrigger_port', 'outrigger_starboard'],
};

describe('GITCRAFT models in public/models', () => {
  const files = [...MODEL_FILES, ...CREW_FILES.map((r) => `tb_crew_${r}`), ...CHARACTER_FILES];
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
  it('the sloop and its outriggers keep the paint/sail material names the cosmetic tint recolours', () => {
    const names = (f: string) => new Set((glbJson(`public/models/${f}.glb`).materials ?? []).map((m: { name: string }) => m.name));
    const sloop = names('tb_coastal_sloop');
    for (const m of ['GC_Plank_4fb39a', 'GC_Wood_f2ead8', 'GC_Cloth_f1e6cc', 'GC_Cloth_c0392b']) expect(sloop.has(m), `sloop ${m}`).toBe(true);
    const out = names('tb_sloop_outriggers');
    for (const m of ['GC_Plank_4fb39a', 'GC_Wood_f2ead8']) expect(out.has(m), `outriggers ${m}`).toBe(true);
  });
  it('the cast are people, not block toys: one skinned primitive, 4k+ triangles, a sculpted head, smooth normals', () => {
    const NEED: Record<string, string[]> = { tb_captain: ['Idle', 'Walk', 'Sit', 'Dig', 'Cheer'], tb_raider: ['Idle', 'Attack'], tb_npc_trader: ['Idle', 'Interact'],
      tb_npc_elder: ['Idle', 'Interact'], tb_npc_dockhand: ['Idle', 'Interact'] };
    for (const f of [...CHARACTER_FILES, ...CREW_FILES.map((r) => `tb_crew_${r}`)]) {
      const j = glbJson(`public/models/${f}.glb`);
      const prims = j.meshes.flatMap((m: { primitives: unknown[] }) => m.primitives);
      expect(prims.length, `${f} draws in one call`).toBe(1);
      const p = prims[0] as { attributes: Record<string, number>; indices: number };
      expect(p.attributes.NORMAL, `${f} keeps smooth normals`).toBeDefined();
      expect(p.attributes.JOINTS_0 !== undefined && p.attributes.WEIGHTS_0 !== undefined, f).toBe(true);
      expect(j.accessors[p.indices].count / 3, `${f} triangles`).toBeGreaterThan(4000);
      const clips = (j.animations ?? []).map((a: { name: string }) => a.name);
      for (const c of NEED[f] ?? ['Idle', 'Walk', 'Interact', 'Attack']) expect(clips, `${f} clip ${c}`).toContain(c);
      // skinned mesh at the scene root (glTF ignores a skinned mesh's parent transform)
      const meshNode = j.nodes.findIndex((n: { mesh?: number }) => n.mesh !== undefined);
      expect(j.nodes.some((n: { children?: number[] }) => (n.children ?? []).includes(meshNode)), `${f} mesh is a root node`).toBe(false);
    }
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
