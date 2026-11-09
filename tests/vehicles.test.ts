// Loop pass Phase 4: the Wave Runner and the Hot Air Balloon (pure rules, data, previews, saves).
import { beforeEach, describe, expect, it } from 'vitest';
import { RNG } from '../src/core/noise';
import { item } from '../src/data/items';
import { runnerStats, UPGRADES, PLAY_EFFECT } from '../src/data/ship';
import { previewVehicleUpgrades } from '../src/state/preview';

const mem = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
(globalThis as any).window = globalThis;
const { transferCargo, crashDrop, isCrash, raiderSteal, balloonSight, wreckMarkKind, vehicleFiles, stowSpots } = await import('../src/game/vehicles');
const { Store, SAVE_VERSION } = await import('../src/state/store');
const { previewShip } = await import('../src/state/preview');
const { VEHICLE_MODEL_FILES, UPGRADE_MODEL_FILES } = await import('../src/world/assets');

describe('Wave Runner', () => {
  it('carries 1 load, 2 with the tow sled; the tank extends its range; boost is its own upgrade', () => {
    const has = (ids: string[]) => (id: string) => ids.includes(id);
    expect(runnerStats(has([])).owned).toBe(false);
    const base = runnerStats(has(['wr_runner']));
    expect(base.cargo).toBe(1);
    expect(runnerStats(has(['wr_runner', 'wr_sled'])).cargo).toBe(2);
    expect(runnerStats(has(['wr_runner', 'wr_tank'])).range).toBeGreaterThan(base.range);
    expect(runnerStats(has(['wr_runner', 'wr_boost'])).boost).toBe(true);
    expect(base.speed).toBeGreaterThan(14 * 1.4); // faster than any hull under engine
  });
  it('cargo only counts once unloaded onto the boat: what fits moves, the rest stays on the runner', () => {
    const r = transferCargo([{ id: 'gold_watch', n: 1 }, { id: 'scrap_metal', n: 3 }], (id) => (id === 'scrap_metal' ? 2 : 5));
    expect(r.moved).toEqual([{ id: 'gold_watch', n: 1 }, { id: 'scrap_metal', n: 2 }]);
    expect(r.left).toEqual([{ id: 'scrap_metal', n: 1 }]);
  });
  it('unloading into a real hold adds it to cargo, where it banks at the dock like anything else', () => {
    mem.clear();
    const st = new Store();
    const r = transferCargo([{ id: 'sextant', n: 1 }], (id) => st.room(id));
    for (const m of r.moved) st.addCargo(m.id, m.n);
    expect(st.data.cargo).toEqual([{ id: 'sextant', n: 1 }]);
    st.unloadToVault();
    expect(st.data.vault).toEqual([{ id: 'sextant', n: 1 }]);
  });
  it('a crash drops everything carried; only hard impacts and rogue waves count as crashes', () => {
    const r = crashDrop([{ id: 'pearl', n: 1 }, { id: 'rope', n: 2 }]);
    expect(r.dropped).toHaveLength(2);
    expect(r.kept).toEqual([]);
    expect(isCrash(4, 'land')).toBe(false);
    expect(isCrash(14, 'land')).toBe(true);
    expect(isCrash(8, 'object')).toBe(true);
    expect(isCrash(0, 'wave')).toBe(true);
  });
});

describe('raider steal logic', () => {
  it('raiders snatch one unit of a valuable non-legendary stack, never a legendary find, nothing from an empty hold', () => {
    const rng = new RNG(5);
    const cargo = [{ id: 'scrap_metal', n: 9 }, { id: 'diamond_ring', n: 1 }, { id: 'ship_in_bottle', n: 1 }, { id: 'rope', n: 2 }];
    for (let i = 0; i < 200; i++) {
      const s = raiderSteal(cargo, () => rng.next())!;
      expect(s.n).toBe(1);
      expect(s.id).not.toBe('ship_in_bottle');
      expect(item(s.id).value).toBeGreaterThanOrEqual(item('rope').value);
    }
    expect(raiderSteal([], Math.random)).toBeNull();
    expect(raiderSteal([{ id: 'sun_mask', n: 1 }], Math.random)).toBeNull();
  });
});

describe('Hot Air Balloon', () => {
  it('sees further the higher it goes', () => {
    expect(balloonSight(100)).toBeGreaterThan(balloonSight(30));
    expect(balloonSight(1000)).toBeLessThanOrEqual(760);
  });
  it('marks a wreck with its tier only when the Salvage Radar is fitted', () => {
    expect(wreckMarkKind('legendary', true)).toBe('wreck_legendary');
    expect(wreckMarkKind('rare', true)).toBe('wreck_rare');
    expect(wreckMarkKind('legendary', false)).toBe('wreck');
    expect(wreckMarkKind('common', true)).toBe('wreck');
  });
  it('balloon marks persist with the trip in the save (they stay on the minimap after landing, and after a reload)', () => {
    mem.clear();
    const st = new Store();
    st.data.trip = { on: true, t: 30, hauls: 0, startGold: 0, marks: [{ kind: 'wreck_rare', x: 100, z: -40, id: 'wr_1' }, { kind: 'storm', x: 300, z: 10 }] };
    st.saveNow();
    const back = new Store().data;
    expect(back.trip.marks).toEqual([{ kind: 'wreck_rare', x: 100, z: -40, id: 'wr_1' }, { kind: 'storm', x: 300, z: 10 }]);
  });
  it('the balloon is a late-game unlock (needs the Salvage Radar) and the winch needs the balloon', () => {
    const bl = UPGRADES.find((u) => u.id === 'bl_balloon')!;
    expect(bl.requires).toBe('radar_mast');
    expect(bl.cost.gold).toBeGreaterThanOrEqual(400);
    expect(UPGRADES.find((u) => u.id === 'bl_winch')!.requires).toBe('bl_balloon');
    for (const id of ['wr_runner', 'wr_tank', 'wr_sled', 'wr_boost', 'bl_balloon', 'bl_winch']) expect(PLAY_EFFECT[id], id).toBeTruthy();
  });
});

describe('previews and lazy models', () => {
  it('?vehicle=waverunner and ?vehicle=balloon fit the vehicle and its add-ons on the Trimaran', () => {
    expect(previewVehicleUpgrades('?vehicle=waverunner')).toEqual(['wr_runner', 'wr_tank', 'wr_sled', 'wr_boost']);
    expect(previewVehicleUpgrades('?vehicle=balloon')).toEqual(['compass_brass', 'radar_mast', 'bl_balloon', 'bl_winch']);
    expect(previewVehicleUpgrades('?ship=trimaran')).toBeNull();
    expect(previewShip('?vehicle=balloon')).toBe('sloop');
    expect(previewShip('?vehicle=balloon&ship=brig')).toBe('brig');
  });
  it('vehicle models load only when owned (or previewed), never at boot', () => {
    expect(vehicleFiles([])).toEqual([]);
    expect(vehicleFiles(['wr_runner'])).toEqual(['tb_waverunner']);
    expect(vehicleFiles(['wr_runner', 'bl_balloon'])).toEqual(['tb_waverunner', 'tb_balloon']);
    expect([...VEHICLE_MODEL_FILES].sort()).toEqual(['tb_balloon', 'tb_waverunner']);
    expect(UPGRADE_MODEL_FILES).not.toContain('tb_waverunner');
  });
  it('on the Trimaran the runner hangs off the port float and the balloon rides the starboard float', () => {
    const s = stowSpots('sloop', 2);
    expect(s.runner.x).toBeLessThan(-4.375); // in slings outboard of the port float, clear of the beams
    expect(s.balloon.x).toBeCloseTo(4.375);
  });
});

describe('save migration v8 → v9', () => {
  beforeEach(() => mem.clear());
  it('adds balloon marks to the trip; keeps owned ships, upgrades, cosmetics and the daily streak', () => {
    mem.set('tidebreakers.save.v1', JSON.stringify({ version: 8, gold: 640, vessel: 'sloop', vesselsOwned: ['dinghy', 'sloop', 'ironwake'], upgrades: ['wr_runner', 'radar_mast'], cosmetics: ['sail_sunset'], equipped: { sail: 'sail_sunset' }, quest: 'free', trip: { on: true, t: 12, hauls: 0, startGold: 600 }, daily: { last: '2026-11-08', streak: 3, best: { '2026-11-08': 210 }, runs: 5, active: null } }));
    const d = new Store().data;
    expect(d.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBe(9);
    expect(d.vesselsOwned).toEqual(['dinghy', 'sloop', 'ironwake']);
    expect(d.upgrades).toEqual(['wr_runner', 'radar_mast']);
    expect(d.equipped.sail).toBe('sail_sunset');
    expect(d.trip.marks).toEqual([]);
    expect(d.daily.streak).toBe(3);
  });
});
