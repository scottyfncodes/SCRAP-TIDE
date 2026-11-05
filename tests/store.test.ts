// Save system: v1 saves (the pirate-era game) migrate forward losslessly; derived stats follow upgrades and crew.
import { beforeEach, describe, expect, it } from 'vitest';

const mem = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
};
(globalThis as any).window = globalThis;

const { Store, SAVE_VERSION } = await import('../src/state/store');

describe('Store', () => {
  beforeEach(() => mem.clear());

  it('starts a fresh v2 save in the Drift with fuel and hull', () => {
    const s = new Store();
    expect(s.isNew).toBe(true);
    expect(s.data.version).toBe(SAVE_VERSION);
    expect(s.data.fuel).toBeGreaterThan(0);
    expect(s.data.hull).toBe(s.stats.hullMax);
    expect(s.data.crew).toEqual([]);
  });

  it('a save made mid-way through the old 13-step First Voyage continues from the matching live step', () => {
    for (const [old, live] of [['steer', 'leave_dock'], ['anchor', 'ashore'], ['read_map', 'dig_x'], ['sell', 'upgrade'], ['catalog', 'upgrade'], ['find_bottle', 'find_bottle'], ['free', 'free']]) {
      mem.clear();
      const seed = new Store();
      (seed.data as any).quest = old;
      seed.saveNow();
      expect(new Store().data.quest, old).toBe(live);
    }
    mem.clear();
    expect(new Store().data.quest).toBe('leave_dock');
  });

  it('v3 keeps the boat’s name (trimmed to the stern plate) and old saves start unnamed', () => {
    mem.clear();
    const seed = new Store();
    seed.data.shipName = 'A Name Far Too Long For Any Stern Plate';
    seed.saveNow();
    expect(new Store().data.shipName).toHaveLength(24);
    mem.clear();
    mem.set('tidebreakers.save.v1', JSON.stringify({ version: 2, gold: 40 }));
    const old = new Store();
    expect(old.data.shipName).toBe('');
    expect(old.data.renown).toBe('drifter');
  });

  it('Marlo’s welcome price halves the gold of the part chosen on the First Voyage, and nothing else', () => {
    mem.clear();
    const s = new Store();
    expect(s.upgradeCost('sail_canvas').gold).toBe(60);
    s.data.flags.push('welcome_sail_canvas');
    expect(s.upgradeCost('sail_canvas').gold).toBe(30);
    expect(s.upgradeCost('rudder_ash').gold).toBe(45);
    expect(s.upgradeCost('cargo_crate').mats).toEqual([{ id: 'driftwood', n: 3 }]);
  });

  it('calm effects default off without a reduced-motion preference, and old saves gain the setting', () => {
    expect(new Store().data.settings.calm).toBe(false);
    mem.clear();
    const old = new Store();
    delete (old.data.settings as any).calm;
    old.commit();
    expect(new Store().data.settings.calm).toBe(false);
  });

  it('migrates a v1 save without losing progress', () => {
    const v1 = {
      version: 1, gold: 512, vessel: 'sloop', vesselsOwned: ['dinghy', 'sloop'], upgrades: ['sail_canvas', 'hull_copper', 'not_a_real_upgrade'],
      discoveries: { doubloon: { first: 1, where: 'Turtle Cay', count: 6 } }, cargo: [{ id: 'doubloon', n: 3 }, { id: 'gone_item', n: 1 }],
      vault: [], trophies: ['ship_bell', null, null], quest: 'free', mapsCompleted: ['turtle_map'],
      ship: { x: 10, z: 20, heading: 1, anchored: false, docked: false },
    };
    mem.set('tidebreakers.save.v1', JSON.stringify(v1));
    const s = new Store();
    expect(s.isNew).toBe(false);
    expect(s.data.version).toBe(SAVE_VERSION);
    expect(s.data.gold).toBe(512);
    expect(s.data.vessel).toBe('sloop');
    expect(s.data.upgrades).toEqual(['sail_canvas', 'hull_copper']);
    expect(s.data.cargo).toEqual([{ id: 'doubloon', n: 3 }]);
    expect(s.data.discoveries.doubloon.count).toBe(6);
    expect(s.data.trophies).toHaveLength(4);
    expect(s.data.hull).toBe(100); // full hull for the vessel they own
    expect(s.data.ship.dockedAt).toBe('driftholm');
    expect(s.data.goal).toBe(0);
  });

  it('derives boat stats from upgrades and crew', () => {
    const s = new Store();
    const base = s.stats;
    expect(base.engine).toBe(0);
    s.data.upgrades.push('engine_outboard', 'tank_drums', 'cabin_container', 'hull_copper', 'hull_armor', 'radar_mast', 'compass_brass');
    let st = s.stats;
    expect(st.engine).toBeGreaterThan(0);
    expect(st.fuelCap).toBe(base.fuelCap + 60);
    expect(st.berths).toBe(base.berths + 2);
    expect(st.armor).toBeGreaterThan(0);
    expect(st.hullMax).toBe(base.hullMax + 60); // best-in-slot, not cumulative
    expect(st.radar).toBeGreaterThan(0);
    const fuelUse = st.fuelUse;
    s.data.crew.push('juno'); // mechanic
    st = s.stats;
    expect(st.fuelUse).toBeLessThan(fuelUse);
    s.data.crew.push('mara'); // navigator
    expect(s.stats.speed).toBeGreaterThan(st.speed);
  });

  it('the Captain’s Log only advances on the current goal and pays out once', () => {
    const s = new Store();
    const g0 = s.goal.id;
    expect(s.completeGoal('g_engine')).toBe(0);
    const before = s.data.gold;
    const reward = s.completeGoal(g0);
    expect(reward).toBeGreaterThan(0);
    expect(s.data.gold).toBe(before + reward);
    expect(s.completeGoal(g0)).toBe(0);
  });

  it('hauls and flags drive the new milestones', () => {
    const s = new Store();
    s.data.hauls = 10;
    s.data.flags.push('docked_helios');
    const done = s.checkMilestones().map((m) => m.id);
    expect(done).toContain('m_salvager');
    expect(done).toContain('m_helios');
    expect(s.data.cosmetics).toContain('sail_billboard');
    expect(s.data.cosmetics).toContain('flag_helios');
  });

  it('saves and reloads the drowned-world fields', () => {
    const s = new Store();
    s.data.fuel = 12.5;
    s.data.crew = ['kai'];
    s.data.salvaged = { sv_stump: 123 };
    s.saveNow();
    const r = new Store();
    expect(r.data.fuel).toBe(12.5);
    expect(r.data.crew).toEqual(['kai']);
    expect(r.data.salvaged.sv_stump).toBe(123);
  });
});
