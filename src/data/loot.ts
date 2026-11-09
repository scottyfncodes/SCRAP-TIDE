// Loot tiers, the Salvage Log's sets and wreck rarity (loop pass Phase 2).
//
// The five item rarities stay as they are (saves, icons and the catalog use them); on top of them every find has
// one of four display tiers: Junk, Common, Rare, Legendary. Tier colours keep to the BEAUTIFUL RUIN palette, and
// green stays reserved for living things.
import { item, ITEM_MAP } from './items';

export type Tier = 'junk' | 'common' | 'rare' | 'legendary';
export const TIERS: Tier[] = ['junk', 'common', 'rare', 'legendary'];
export const TIER_LABEL: Record<Tier, string> = { junk: 'Junk', common: 'Common', rare: 'Rare', legendary: 'Legendary' };
export const TIER_COLOR: Record<Tier, string> = { junk: '#8d877a', common: '#d9cfb4', rare: '#4f9ad8', legendary: '#f0c445' };

/** The display tier of an item: bulk materials and beach shells are Junk; epic and legendary finds are Legendary. */
export function tierOf(id: string): Tier {
  const d = item(id);
  if (d.rarity === 'epic' || d.rarity === 'legendary') return 'legendary';
  if (d.rarity === 'rare') return 'rare';
  if (d.rarity === 'common' && (d.category === 'resource' || d.category === 'ocean')) return 'junk';
  return 'common';
}
export const tierRank = (t: Tier) => TIERS.indexOf(t);
/** The best tier in a haul. */
export function bestTier(ids: string[]): Tier {
  let best: Tier = 'junk';
  for (const id of ids) if (tierRank(tierOf(id)) > tierRank(best)) best = tierOf(id);
  return best;
}

// ── wrecks: a tier for each drifting wreck, rarer in riskier water ──────────────────────────────────────────
export type WreckTier = 'common' | 'rare' | 'legendary';
/**
 * Weights for a wreck's tier from how risky its spot is (0 = beside a dock in calm water, 1 = far out, in a storm
 * track or raider water). Rare and Legendary wrecks are uncommon everywhere and close to absent near home.
 */
export function wreckWeights(risk: number): Record<WreckTier, number> {
  const r = Math.max(0, Math.min(1, risk));
  return { common: 1, rare: 0.06 + 0.42 * r, legendary: r < 0.45 ? 0 : 0.015 + 0.13 * (r - 0.45) * 2 };
}
export function rollWreckTier(rng: () => number, risk: number): WreckTier {
  const w = wreckWeights(risk);
  let x = rng() * (w.common + w.rare + w.legendary);
  if ((x -= w.common) < 0) return 'common';
  if ((x -= w.rare) < 0) return 'rare';
  return 'legendary';
}

/** What a wreck of each tier can bring up: item ids with weights. Higher tiers keep a little junk in the mix. */
export const WRECK_LOOT: Record<WreckTier, { id: string; w: number; n: [number, number] }[]> = {
  common: [
    { id: 'scrap_metal', w: 6, n: [1, 3] }, { id: 'rope', w: 4, n: [1, 2] }, { id: 'canvas', w: 3, n: [1, 2] }, { id: 'wire', w: 3, n: [1, 2] },
    { id: 'transistor_radio', w: 1.2, n: [1, 1] }, { id: 'ship_bell', w: 0.8, n: [1, 1] }, { id: 'old_key', w: 1, n: [1, 1] }, { id: 'gold_watch', w: 0.6, n: [1, 1] },
    { id: 'rubber_duck', w: 1, n: [1, 1] }, { id: 'fuel_can', w: 2, n: [1, 1] },
  ],
  rare: [
    { id: 'scrap_metal', w: 3, n: [2, 3] }, { id: 'electronics', w: 3, n: [1, 2] }, { id: 'engine_parts', w: 2, n: [1, 1] },
    { id: 'spyglass', w: 1.5, n: [1, 1] }, { id: 'sextant', w: 1.5, n: [1, 1] }, { id: 'strange_coin', w: 1.5, n: [1, 1] }, { id: 'snow_globe', w: 1.2, n: [1, 1] },
    { id: 'diamond_ring', w: 1, n: [1, 1] }, { id: 'polaroid', w: 1, n: [1, 1] }, { id: 'gold_bar', w: 0.8, n: [1, 1] },
  ],
  legendary: [
    { id: 'alloy_plate', w: 3, n: [1, 2] }, { id: 'engine_parts', w: 2, n: [1, 2] }, { id: 'gold_bar', w: 2, n: [1, 2] },
    { id: 'ship_in_bottle', w: 1.4, n: [1, 1] }, { id: 'sun_mask', w: 0.8, n: [1, 1] }, { id: 'diamond_ring', w: 1.5, n: [1, 1] }, { id: 'sextant', w: 1, n: [1, 1] },
  ],
};
/** Base loot rolls for a wreck of each tier (the winch adds to these as for any site). */
export const WRECK_ROLLS: Record<WreckTier, number> = { common: 3, rare: 4, legendary: 5 };

// ── the Salvage Log's sets ──────────────────────────────────────────────────────────────────────────────────
export type SetBonus =
  | { kind: 'sell'; pct: number } // +% to every sale
  | { kind: 'trip'; sec: number } // longer before the squall
  | { kind: 'cargo'; n: number } // more hold slots
  | { kind: 'window'; add: number } // wider winch window
  | { kind: 'hull'; n: number } // more max hull
  | { kind: 'perfect'; add: number }; // wider perfect strip (share of the window)

export interface SetDef {
  id: string;
  name: string;
  items: string[];
  bonus: SetBonus;
  blurb: string;
}

export const SETS: SetDef[] = [
  { id: 'set_beach', name: 'Beachcomber’s Jar', items: ['conch', 'spiral_shell', 'sand_dollar', 'starfish', 'sea_glass', 'coral_branch'], bonus: { kind: 'cargo', n: 2 }, blurb: 'Everything the tide leaves on the sand.' },
  { id: 'set_office', name: 'The Last Office', items: ['transistor_radio', 'vinyl_record', 'polaroid', 'street_sign'], bonus: { kind: 'sell', pct: 5 }, blurb: 'Desk drawers of a drowned city.' },
  { id: 'set_nav', name: 'Navigator’s Kit', items: ['sextant', 'spyglass', 'ship_bell', 'old_key'], bonus: { kind: 'trip', sec: 20 }, blurb: 'Instruments that still find their way home.' },
  { id: 'set_jewel', name: 'Jeweller’s Tray', items: ['doubloon', 'silver_piece', 'pearl', 'gold_ring', 'gold_watch', 'diamond_ring'], bonus: { kind: 'window', add: 0.03 }, blurb: 'Small, heavy and worth the dive.' },
  { id: 'set_curio', name: 'Curio Cabinet', items: ['rubber_duck', 'snow_globe', 'strange_coin', 'bottle_letter'], bonus: { kind: 'perfect', add: 0.08 }, blurb: 'Things nobody needs and everybody wants.' },
  { id: 'set_green', name: 'First Garden', items: ['algae_mat', 'sea_lettuce', 'seedling_tin', 'live_moss'], bonus: { kind: 'hull', n: 15 }, blurb: 'Proof that something still grows.' },
  { id: 'set_wreck', name: 'Wreck Trophies', items: ['traffic_light', 'rig_badge', 'tattered_flag', 'ship_in_bottle'], bonus: { kind: 'sell', pct: 5 }, blurb: 'Hung on the wall of every captain worth the name.' },
];
export const SET_MAP: Record<string, SetDef> = Object.fromEntries(SETS.map((s) => [s.id, s]));

export function bonusText(b: SetBonus): string {
  switch (b.kind) {
    case 'sell': return `+${b.pct}% on every sale`;
    case 'trip': return `+${b.sec}s before the squall`;
    case 'cargo': return `+${b.n} hold slots`;
    case 'window': return 'Wider winch green zone';
    case 'hull': return `+${b.n} max hull`;
    case 'perfect': return 'Wider gold perfect strip';
  }
}

/** Sets complete for a set of discovered item ids. */
export function completedSets(found: (id: string) => boolean): SetDef[] {
  return SETS.filter((s) => s.items.every(found));
}

/** The summed permanent bonus of every completed set. */
export function setBonuses(found: (id: string) => boolean) {
  const out = { sell: 0, trip: 0, cargo: 0, window: 0, hull: 0, perfect: 0 };
  for (const s of completedSets(found)) {
    const b = s.bonus;
    if (b.kind === 'sell') out.sell += b.pct;
    else if (b.kind === 'trip') out.trip += b.sec;
    else if (b.kind === 'cargo') out.cargo += b.n;
    else if (b.kind === 'window') out.window += b.add;
    else if (b.kind === 'hull') out.hull += b.n;
    else out.perfect += b.add;
  }
  return out;
}

/** Every set item is a real item (checked by tests). */
export const SET_ITEMS_OK = () => SETS.every((s) => s.items.every((id) => !!ITEM_MAP[id]));
