// Data-driven vessel classes, functional upgrades and cosmetics.

export type VesselId = 'dinghy' | 'sloop';
export type UpgradeSlot = 'sail' | 'storage' | 'navigation' | 'steering' | 'hull';

export interface VesselDef {
  id: VesselId;
  name: string;
  speed: number; // top speed (units/s)
  turn: number; // rad/s at speed
  cargo: number; // cargo slots
  trophySlots: number;
  crossSwell: boolean;
  cost?: Cost;
  desc: string;
}

export interface Cost {
  gold: number;
  mats?: { id: string; n: number }[];
}

export interface UpgradeDef {
  id: string;
  slot: UpgradeSlot;
  tier: number;
  name: string;
  cost: Cost;
  requires?: string;
  effects: { speedMul?: number; turnMul?: number; cargo?: number; reef?: boolean; compass?: boolean };
  desc: string;
  visual: string;
}

export interface CosmeticDef {
  id: string;
  slot: 'paint' | 'sail' | 'flag';
  name: string;
  colors: string[];
  cost?: number; // purchasable from the decoration stall
  unlock?: string; // milestone id that grants it
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export const VESSELS: Record<VesselId, VesselDef> = {
  dinghy: {
    id: 'dinghy', name: 'Leaky Dinghy', speed: 6.5, turn: 1.15, cargo: 6, trophySlots: 1, crossSwell: false,
    desc: 'Eight planks of optimism and a sail the size of a bedsheet.',
  },
  sloop: {
    id: 'sloop', name: 'Coastal Sloop', speed: 10.5, turn: 0.95, cargo: 14, trophySlots: 3, crossSwell: true,
    cost: { gold: 420, mats: [{ id: 'driftwood', n: 8 }, { id: 'rope', n: 4 }, { id: 'canvas', n: 3 }, { id: 'iron_nails', n: 4 }] },
    desc: 'A real deck, a real keel, a tall mast. Built to cross the open swell to the Emerald Coast.',
  },
};

export const UPGRADES: UpgradeDef[] = [
  { id: 'sail_canvas', slot: 'sail', tier: 1, name: 'Canvas Mainsail', cost: { gold: 60 },
    effects: { speedMul: 1.4 }, visual: 'sail1',
    desc: 'A proper sail with a proper yard. 40% faster, and it doesn’t have a hole shaped like a seagull.' },
  { id: 'sail_cutter', slot: 'sail', tier: 2, name: 'Cutter Rig + Jib', requires: 'sail_canvas', cost: { gold: 150, mats: [{ id: 'canvas', n: 3 }, { id: 'rope', n: 2 }] },
    effects: { speedMul: 1.7 }, visual: 'sail2',
    desc: 'Adds a jib sail up front. Catches the wind from more angles. 70% faster than stock.' },
  { id: 'cargo_crate', slot: 'storage', tier: 1, name: 'Lashed Cargo Crate', cost: { gold: 40, mats: [{ id: 'driftwood', n: 3 }] },
    effects: { cargo: 4 }, visual: 'crate1',
    desc: 'A sturdy crate lashed to the stern. +4 cargo slots.' },
  { id: 'cargo_net', slot: 'storage', tier: 2, name: 'Rope Cargo Nets', requires: 'cargo_crate', cost: { gold: 85, mats: [{ id: 'rope', n: 3 }] },
    effects: { cargo: 8 }, visual: 'crate2',
    desc: 'Nets slung along the sides for bulky finds. +8 cargo slots total.' },
  { id: 'compass_brass', slot: 'navigation', tier: 1, name: 'Brass Compass', cost: { gold: 90 },
    effects: { compass: true }, visual: 'compass',
    desc: 'Mounted on the bow. Points toward the X on whichever treasure map you’re following.' },
  { id: 'rudder_ash', slot: 'steering', tier: 1, name: 'Ash-Wood Rudder', cost: { gold: 45, mats: [{ id: 'driftwood', n: 2 }] },
    effects: { turnMul: 1.45 }, visual: 'rudder',
    desc: 'A bigger blade and a tiller with a grip. Turns 45% sharper.' },
  { id: 'hull_copper', slot: 'hull', tier: 1, name: 'Copper-Banded Hull', cost: { gold: 130, mats: [{ id: 'driftwood', n: 4 }] },
    effects: { reef: true }, visual: 'copper',
    desc: 'Copper sheathing along the waterline. Lets you scrape over the reef breakers around Gull Sandbar.' },
];

export const COSMETICS: CosmeticDef[] = [
  { id: 'paint_driftwood', slot: 'paint', name: 'Bare Driftwood', colors: ['#a77b4f', '#7a5534'], rarity: 'common' },
  { id: 'paint_seafoam', slot: 'paint', name: 'Seafoam Green', colors: ['#4fb39a', '#f2ead8'], cost: 25, rarity: 'common' },
  { id: 'paint_crimson', slot: 'paint', name: 'Harbor Crimson', colors: ['#c0392b', '#f4c542'], cost: 35, rarity: 'uncommon' },
  { id: 'paint_midnight', slot: 'paint', name: 'Midnight Navy', colors: ['#22325a', '#e8c46a'], cost: 45, rarity: 'uncommon' },
  { id: 'paint_gilded', slot: 'paint', name: 'Gilded Hunter', colors: ['#2b1d14', '#f4c542'], unlock: 'm_first_chest', rarity: 'rare' },

  { id: 'sail_plain', slot: 'sail', name: 'Plain Canvas', colors: ['#f1e6cc', '#f1e6cc'], rarity: 'common' },
  { id: 'sail_stripe', slot: 'sail', name: 'Red Stripe', colors: ['#f1e6cc', '#c0392b'], cost: 20, rarity: 'common' },
  { id: 'sail_sunset', slot: 'sail', name: 'Sunset Bands', colors: ['#ffcf7a', '#ff6b4a'], cost: 40, rarity: 'uncommon' },
  { id: 'sail_shells', slot: 'sail', name: 'Beachcomber Shells', colors: ['#f1e6cc', '#e0607e'], unlock: 'm_beachcomber', rarity: 'rare' },

  { id: 'flag_none', slot: 'flag', name: 'No Flag', colors: ['#000', '#000'], rarity: 'common' },
  { id: 'flag_harbor', slot: 'flag', name: 'Saltwhistle Pennant', colors: ['#3a86ff', '#ffffff'], cost: 15, rarity: 'common' },
  { id: 'flag_wren', slot: 'flag', name: 'Colors of the Wren', colors: ['#1c1c22', '#efe6d2'], unlock: 'm_wreck', rarity: 'epic' },
];

export const UPGRADE_MAP: Record<string, UpgradeDef> = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
export const COSMETIC_MAP: Record<string, CosmeticDef> = Object.fromEntries(COSMETICS.map((c) => [c.id, c]));

export const SLOT_LABEL: Record<UpgradeSlot, string> = {
  sail: 'Sails',
  storage: 'Storage',
  navigation: 'Navigation',
  steering: 'Steering',
  hull: 'Hull',
};
