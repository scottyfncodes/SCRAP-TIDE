// Persistent player state. Saved to localStorage with schema versioning + backup slot.
import { CATALOG_ITEMS, ITEM_MAP, item, type Category } from '../data/items';
import { VESSELS, UPGRADE_MAP, BASE_FUEL, type UpgradeDef, type VesselId, type Cost } from '../data/ship';
import { CREW_MAP, type CrewRole } from '../data/crew';
import { GOALS } from '../data/progress';
import { MILESTONES, FIRST_VOYAGE, type QuestStepId } from '../data/progress';
import { WORLD } from '../data/world';

const KEY = 'tidebreakers.save.v1';
const BACKUP_KEY = 'tidebreakers.save.v1.bak';
export const SAVE_VERSION = 2;

export interface Stack {
  id: string;
  n: number;
}

export interface Discovery {
  first: number; // timestamp
  where: string;
  count: number; // total ever found
}

export interface SaveData {
  version: number;
  created: number;
  updated: number;
  gold: number;
  cargo: Stack[];
  vault: Stack[];
  discoveries: Record<string, Discovery>;
  fragments: string[];
  mapsRead: string[];
  mapsCompleted: string[];
  activeMap: string | null;
  cachesFound: string[];
  findsOpened: string[];
  islandsVisited: string[];
  regionsSeen: string[];
  vessel: VesselId;
  vesselsOwned: VesselId[];
  upgrades: string[];
  cosmetics: string[];
  equipped: { paint: string; sail: string; flag: string };
  trophies: (string | null)[];
  milestones: string[];
  quest: QuestStepId;
  chestsOpened: number;
  flags: string[];
  stats: { goldEarned: number; digs: number; distance: number; trips: number };
  ship: { x: number; z: number; heading: number; anchored: boolean; docked: boolean; dockedAt: string };
  settings: { sfx: number; music: number; haptics: boolean; calm: boolean };
  // v2: the drowned world
  fuel: number;
  hull: number;
  crew: string[];
  hauls: number;
  salvaged: Record<string, number>; // site id -> Date.now() of the last haul
  firstHauls: string[];
  castaways: string[];
  goal: number; // index into GOALS
  timeOfDay: number; // 0..1 (0.25 = sunrise, 0.5 = noon, 0.75 = sunset)
  raidersRepelled: number;
  settlementsVisited: string[];
}

export function freshSave(): SaveData {
  const now = Date.now();
  return {
    version: SAVE_VERSION,
    created: now,
    updated: now,
    gold: 15,
    cargo: [],
    vault: [],
    discoveries: {},
    fragments: [],
    mapsRead: [],
    mapsCompleted: [],
    activeMap: null,
    cachesFound: [],
    findsOpened: [],
    islandsVisited: ['harbor'],
    regionsSeen: ['shallows'],
    vessel: 'dinghy',
    vesselsOwned: ['dinghy'],
    upgrades: [],
    cosmetics: ['paint_driftwood', 'sail_plain', 'flag_none'],
    equipped: { paint: 'paint_driftwood', sail: 'sail_plain', flag: 'flag_none' },
    trophies: [null, null, null, null],
    milestones: [],
    quest: 'steer',
    chestsOpened: 0,
    flags: [],
    stats: { goldEarned: 0, digs: 0, distance: 0, trips: 0 },
    ship: { x: WORLD.spawn.x, z: WORLD.spawn.z, heading: WORLD.spawn.heading, anchored: false, docked: true, dockedAt: 'driftholm' },
    settings: { sfx: 0.8, music: 0.5, haptics: true, calm: prefersReducedMotion() },
    fuel: 30,
    hull: 60,
    crew: [],
    hauls: 0,
    salvaged: {},
    firstHauls: [],
    castaways: [],
    goal: 0,
    timeOfDay: 0.33,
    raidersRepelled: 0,
    settlementsVisited: ['driftholm'],
  };
}

function migrate(raw: any): SaveData {
  const base = freshSave();
  if (!raw || typeof raw !== 'object') return base;
  // Shallow-merge so new fields added in later versions get defaults.
  const merged: SaveData = { ...base, ...raw };
  merged.equipped = { ...base.equipped, ...(raw.equipped || {}) };
  merged.ship = { ...base.ship, ...(raw.ship || {}) };
  merged.stats = { ...base.stats, ...(raw.stats || {}) };
  merged.settings = { ...base.settings, ...(raw.settings || {}) };
  merged.cargo = (merged.cargo || []).filter((s) => ITEM_MAP[s.id]);
  merged.vault = (merged.vault || []).filter((s) => ITEM_MAP[s.id]);
  while (merged.trophies.length < 4) merged.trophies.push(null);
  merged.crew = (merged.crew || []).filter((c) => CREW_MAP[c]);
  merged.salvaged = { ...(raw.salvaged || {}) };
  if (!VESSELS[merged.vessel]) merged.vessel = 'dinghy';
  merged.vesselsOwned = (merged.vesselsOwned || ['dinghy']).filter((v) => VESSELS[v]);
  merged.upgrades = (merged.upgrades || []).filter((u) => UPGRADE_MAP[u]);
  if (raw.hull === undefined) merged.hull = VESSELS[merged.vessel].hull;
  merged.goal = Math.max(0, Math.min(GOALS.length - 1, merged.goal | 0));
  merged.version = SAVE_VERSION;
  return merged;
}

type Listener = () => void;

export class Store {
  data: SaveData;
  private listeners = new Set<Listener>();
  private saveTimer = 0;
  lastSaved = 0;
  storageOk = true;
  isNew = false;

  /**
   * Set by a `?ship=` preview link: this visit starts in that vessel without unlocking it, on an in-memory copy of
   * the save. A preview store never writes to (or clears) localStorage, so the real saved game is untouched.
   */
  readonly preview: VesselId | null;

  /** Upgrades a `upgrades=` preview link fitted for this visit (null outside such a preview). */
  readonly previewUpgrades: string[] | null;

  constructor(opts: { preview?: VesselId | null; upgrades?: string[] | null } = {}) {
    this.data = this.load();
    this.previewUpgrades = opts.upgrades?.length ? opts.upgrades : null;
    // an upgrades-only link previews the save's own boat
    this.preview = opts.preview ?? (this.previewUpgrades ? this.data.vessel : null);
    if (this.preview) this.applyPreview(this.data);
  }

  /** Fit the preview's vessel and upgrades to (an in-memory copy of) the save. */
  private applyPreview(d: SaveData) {
    const hullFrac = Math.min(1, d.hull / this.stats.hullMax);
    const fuelFrac = Math.min(1, d.fuel / this.stats.fuelCap);
    d.vessel = this.preview!;
    if (!d.vesselsOwned.includes(d.vessel)) d.vesselsOwned.push(d.vessel);
    if (this.previewUpgrades) for (const id of this.previewUpgrades) if (!d.upgrades.includes(id)) d.upgrades.push(id);
    d.hull = Math.round(hullFrac * this.stats.hullMax); // same condition, the new boat's scale
    d.fuel = Math.round(fuelFrac * this.stats.fuelCap);
  }

  private load(): SaveData {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        this.isNew = true;
        return freshSave();
      }
      return migrate(JSON.parse(raw));
    } catch (e) {
      console.warn('Save corrupt, trying backup', e);
      try {
        const bak = localStorage.getItem(BACKUP_KEY);
        if (bak) return migrate(JSON.parse(bak));
      } catch {
        /* fall through */
      }
      this.storageOk = false;
      this.isNew = true;
      return freshSave();
    }
  }

  saveNow() {
    this.data.updated = Date.now();
    if (this.preview) return; // preview visits are never saved
    try {
      const prev = localStorage.getItem(KEY);
      if (prev) localStorage.setItem(BACKUP_KEY, prev);
      localStorage.setItem(KEY, JSON.stringify(this.data));
      this.lastSaved = Date.now();
      this.storageOk = true;
    } catch (e) {
      this.storageOk = false;
      console.warn('Save failed', e);
    }
  }

  /** Debounced save + notify listeners. Call after every meaningful change. */
  commit() {
    this.emit();
    clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => this.saveNow(), 400);
  }

  reset() {
    if (this.preview) {
      // in a preview, "new game" only restarts this visit; the real save stays as it is
      this.data = freshSave();
      this.applyPreview(this.data);
      this.data.hull = this.stats.hullMax;
      this.isNew = true;
      this.emit();
      return;
    }
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem(BACKUP_KEY);
    } catch {
      /* ignore */
    }
    this.data = freshSave();
    this.isNew = true;
    this.saveNow();
    this.emit();
  }

  on(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  emit() {
    this.listeners.forEach((f) => f());
  }

  // ── Derived ship stats ──
  get vesselDef() {
    return VESSELS[this.data.vessel];
  }
  has(upgradeId: string) {
    return this.data.upgrades.includes(upgradeId);
  }
  bestInSlot(slot: UpgradeDef['slot']): UpgradeDef | null {
    let best: UpgradeDef | null = null;
    for (const id of this.data.upgrades) {
      const u = UPGRADE_MAP[id];
      if (u && u.slot === slot && (!best || u.tier > best.tier)) best = u;
    }
    return best;
  }
  hasRole(role: CrewRole) {
    return this.data.crew.some((c) => CREW_MAP[c]?.role === role);
  }
  get stats() {
    const v = this.vesselDef;
    const b = (slot: UpgradeDef['slot']) => this.bestInSlot(slot)?.effects ?? {};
    const sail = b('sail'), storage = b('storage'), steer = b('steering'), eng = b('engine'), hull = b('hull'), nav = b('navigation');
    const power = b('power'), tank = b('tank');
    const crewNav = this.hasRole('navigator') ? 1.1 : 1;
    return {
      speed: v.speed * (sail.speedMul ?? 1) * crewNav,
      turn: v.turn * (steer.turnMul ?? 1),
      cargo: v.cargo + (storage.cargo ?? 0),
      reef: !!hull.reef || this.data.vessel !== 'dinghy',
      compass: !!nav.compass,
      crossSwell: v.crossSwell,
      crossStorm: v.crossStorm,
      trophySlots: v.trophySlots,
      engine: eng.engine ?? 0,
      fuelUse: (eng.fuelUse ?? 0) * (this.hasRole('mechanic') ? 0.65 : 1),
      fuelCap: BASE_FUEL + (tank.fuelCap ?? 0),
      hullMax: v.hull + (hull.hull ?? 0),
      armor: hull.armor ?? 0,
      salvage: b('salvage').salvage ?? 0,
      harpoon: b('defense').harpoon ?? 0,
      radar: nav.radar ?? 0,
      berths: v.berths + (b('quarters').berths ?? 0),
      light: b('lighting').light ?? 0,
      fishing: b('fishing').fishing ?? 0,
      solar: power.solar ?? 0,
    };
  }
  get goal() {
    return GOALS[this.data.goal];
  }
  /** Advance the Captain's Log if the current goal matches. Returns the reward, or 0. */
  completeGoal(id: string): number {
    const g = GOALS[this.data.goal];
    if (!g || g.id !== id || this.data.goal >= GOALS.length - 1) return 0;
    this.data.goal++;
    this.data.gold += g.reward;
    this.data.stats.goldEarned += g.reward;
    return g.reward;
  }

  // ── Cargo ──
  slotsUsed(stacks = this.data.cargo) {
    let n = 0;
    for (const s of stacks) n += Math.ceil(s.n / item(s.id).stack);
    return n;
  }
  /** How many of `id` can fit into cargo right now. */
  room(id: string) {
    const def = item(id);
    const cap = this.stats.cargo;
    const st = this.data.cargo.find((s) => s.id === id);
    const used = this.slotsUsed();
    const free = cap - used;
    const partial = st ? (Math.ceil(st.n / def.stack) * def.stack - st.n) : 0;
    return Math.max(0, partial + free * def.stack);
  }
  addCargo(id: string, n: number): number {
    const fit = Math.min(n, this.room(id));
    if (fit <= 0) return 0;
    const st = this.data.cargo.find((s) => s.id === id);
    if (st) st.n += fit;
    else this.data.cargo.push({ id, n: fit });
    return fit;
  }
  removeFrom(list: Stack[], id: string, n: number) {
    const st = list.find((s) => s.id === id);
    if (!st) return 0;
    const take = Math.min(n, st.n);
    st.n -= take;
    if (st.n <= 0) list.splice(list.indexOf(st), 1);
    return take;
  }
  addTo(list: Stack[], id: string, n: number) {
    const st = list.find((s) => s.id === id);
    if (st) st.n += n;
    else list.push({ id, n });
  }
  countOwned(id: string) {
    const a = this.data.cargo.find((s) => s.id === id)?.n ?? 0;
    const b = this.data.vault.find((s) => s.id === id)?.n ?? 0;
    return a + b;
  }
  /** Remove from vault first then cargo. */
  consume(id: string, n: number) {
    let left = n;
    left -= this.removeFrom(this.data.vault, id, left);
    if (left > 0) left -= this.removeFrom(this.data.cargo, id, left);
    return n - left;
  }
  canAfford(c: Cost) {
    if (this.data.gold < c.gold) return false;
    for (const m of c.mats ?? []) if (this.countOwned(m.id) < m.n) return false;
    return true;
  }
  pay(c: Cost) {
    this.data.gold -= c.gold;
    for (const m of c.mats ?? []) this.consume(m.id, m.n);
  }
  unloadToVault() {
    let n = 0;
    for (const s of this.data.cargo) {
      this.addTo(this.data.vault, s.id, s.n);
      n += s.n;
    }
    this.data.cargo = [];
    return n;
  }

  // ── Discoveries ──
  /** Returns true if this is a brand-new catalog entry. */
  discover(id: string, where: string, n = 1): boolean {
    const d = this.data.discoveries[id];
    if (d) {
      d.count += n;
      return false;
    }
    this.data.discoveries[id] = { first: Date.now(), where, count: n };
    return true;
  }
  categoryCount(cat: Category) {
    return CATALOG_ITEMS.filter((i) => i.category === cat && this.data.discoveries[i.id]).length;
  }
  get discoveryCount() {
    return CATALOG_ITEMS.filter((i) => this.data.discoveries[i.id]).length;
  }

  /** Check milestones; returns newly completed ones (and applies rewards). */
  checkMilestones() {
    const done = [];
    for (const m of MILESTONES) {
      if (this.data.milestones.includes(m.id)) continue;
      const c = m.cond;
      let ok = false;
      if (c.kind === 'category') ok = this.categoryCount(c.category) >= c.n;
      else if (c.kind === 'chests') ok = this.data.chestsOpened >= c.n;
      else if (c.kind === 'discoveries') ok = this.discoveryCount >= c.n;
      else if (c.kind === 'hauls') ok = this.data.hauls >= c.n;
      else if (c.kind === 'flag') ok = this.data.flags.includes(c.flag);
      if (ok) {
        this.data.milestones.push(m.id);
        if (m.reward.gold) {
          this.data.gold += m.reward.gold;
          this.data.stats.goldEarned += m.reward.gold;
        }
        if (m.reward.cosmetic && !this.data.cosmetics.includes(m.reward.cosmetic)) this.data.cosmetics.push(m.reward.cosmetic);
        done.push(m);
      }
    }
    return done;
  }

  questIndex() {
    return FIRST_VOYAGE.findIndex((q) => q.id === this.data.quest);
  }
  advanceQuest(from: QuestStepId) {
    if (this.data.quest !== from) return false;
    const i = this.questIndex();
    if (i < FIRST_VOYAGE.length - 1) this.data.quest = FIRST_VOYAGE[i + 1].id;
    return true;
  }
}

/** The device asks for less motion (iOS: Settings → Accessibility → Motion → Reduce Motion). */
function prefersReducedMotion(): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
