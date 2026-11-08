// Data-driven vessel classes, functional upgrades and cosmetics.
// Every upgrade is visible on the boat: `visual` names a procedural part or a GITCRAFT MeshCraft model node
// from public/models/tb_boat_kit.glb (see ship/shipModel.ts).

export type VesselId = 'dinghy' | 'sloop' | 'brig' | 'ironwake';
export type UpgradeSlot =
  | 'sail'
  | 'engine'
  | 'hull'
  | 'storage'
  | 'tank'
  | 'steering'
  | 'navigation'
  | 'salvage'
  | 'defense'
  | 'power'
  | 'quarters'
  | 'lighting'
  | 'fishing';

export interface VesselDef {
  id: VesselId;
  name: string;
  speed: number; // top sail speed (units/s)
  turn: number; // rad/s at speed
  cargo: number; // cargo slots
  trophySlots: number;
  berths: number; // crew capacity
  hull: number; // base hull integrity
  crossSwell: boolean;
  crossStorm: boolean;
  cost?: Cost;
  builtAt?: string[]; // settlements whose yard can build her (default: Driftholm)
  desc: string;
}

export interface Cost {
  gold: number;
  mats?: { id: string; n: number }[];
}

export interface UpgradeEffects {
  speedMul?: number;
  turnMul?: number;
  cargo?: number;
  reef?: boolean;
  compass?: boolean;
  engine?: number; // engine top speed (units/s), ignores wind
  fuelUse?: number; // fuel per second at full throttle
  fuelCap?: number;
  hull?: number; // +max hull
  armor?: number; // 0..1 damage reduction
  salvage?: number; // crane tier: unlocks heavy sites, widens the winch window
  harpoon?: number; // raider repel range
  radar?: number; // salvage/cache detection range
  berths?: number;
  light?: number;
  fishing?: number; // catches per minute
  solar?: number; // fuel regen per minute
}

export interface UpgradeDef {
  id: string;
  slot: UpgradeSlot;
  tier: number;
  name: string;
  cost: Cost;
  requires?: string;
  where?: string[]; // settlements whose shipwright sells it (default: Driftholm)
  effects: UpgradeEffects;
  desc: string;
  visual: string;
}

export interface CosmeticDef {
  id: string;
  slot: 'paint' | 'sail' | 'flag';
  name: string;
  colors: string[];
  cost?: number;
  unlock?: string; // milestone id that grants it
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export const VESSELS: Record<VesselId, VesselDef> = {
  dinghy: {
    id: 'dinghy', name: 'Patchwork Skiff', speed: 6.5, turn: 1.15, cargo: 6, trophySlots: 1, berths: 1, hull: 60, crossSwell: false, crossStorm: false,
    desc: 'Eight planks, a car bonnet and a sail stitched from a billboard. Floats out of habit.',
  },
  sloop: {
    id: 'sloop', name: 'Scrap Trimaran', speed: 10.5, turn: 0.95, cargo: 14, trophySlots: 3, berths: 2, hull: 100, crossSwell: true, crossStorm: false,
    cost: { gold: 420, mats: [{ id: 'driftwood', n: 8 }, { id: 'scrap_metal', n: 6 }, { id: 'canvas', n: 3 }, { id: 'iron_nails', n: 4 }] },
    desc: 'A real deck, a keel, and two outrigger floats welded from fuel tanks. Built to cross the open swell to the Sunken Reach.',
  },
  // the missing rung (design bible PR 2.5): a square-rigged brig welded from Rustfang prize steel
  brig: {
    id: 'brig', name: 'Salt Brig', speed: 11.5, turn: 0.9, cargo: 18, trophySlots: 3, berths: 3, hull: 130, crossSwell: true, crossStorm: false,
    cost: { gold: 800, mats: [{ id: 'canvas', n: 6 }, { id: 'rope', n: 6 }, { id: 'alloy_plate', n: 3 }, { id: 'engine_parts', n: 2 }] },
    builtAt: ['helios'],
    desc: 'Two masts of square sails cut from billboards, a hull of Rustfang prize plate, harpoon mounts on both rails. The first thing in the Reach that raiders steer around.',
  },
  ironwake: {
    id: 'ironwake', name: 'Ironwake Expedition Cat', speed: 12.5, turn: 0.85, cargo: 22, trophySlots: 4, berths: 4, hull: 160, crossSwell: true, crossStorm: true,
    cost: { gold: 1400, mats: [{ id: 'alloy_plate', n: 8 }, { id: 'engine_parts', n: 4 }, { id: 'electronics', n: 6 }, { id: 'canvas', n: 6 }] },
    desc: 'Twin armoured hulls under a working deck the size of a house. The only boat in the Drift built to go through the Stormwall.',
  },
};

export const UPGRADES: UpgradeDef[] = [
  // Sails
  { id: 'sail_canvas', slot: 'sail', tier: 1, name: 'Canvas Mainsail', cost: { gold: 60 }, effects: { speedMul: 1.4 }, visual: 'sail1',
    desc: 'A proper sail on a proper yard. 40% faster, and it doesn’t have a hole shaped like a seagull.' },
  { id: 'sail_cutter', slot: 'sail', tier: 2, name: 'Cutter Rig + Jib', requires: 'sail_canvas', cost: { gold: 150, mats: [{ id: 'canvas', n: 3 }, { id: 'rope', n: 2 }] },
    effects: { speedMul: 1.7 }, visual: 'sail2', desc: 'Adds a jib up front. Catches the wind from more angles. 70% faster than stock.' },
  // Engines
  { id: 'engine_outboard', slot: 'engine', tier: 1, name: 'Salvaged Outboard', cost: { gold: 90, mats: [{ id: 'scrap_metal', n: 4 }, { id: 'wire', n: 2 }] },
    effects: { engine: 9, fuelUse: 0.22 }, visual: 'engine_outboard',
    desc: 'A two-stroke that coughs, then roars. Tap ENGINE to motor anywhere, wind or no wind. Burns fuel.' },
  { id: 'engine_twin', slot: 'engine', tier: 2, name: 'Twin Diesel Drive', requires: 'engine_outboard', where: ['helios'],
    cost: { gold: 380, mats: [{ id: 'engine_parts', n: 3 }, { id: 'scrap_metal', n: 6 }, { id: 'wire', n: 3 }] },
    effects: { engine: 14, fuelUse: 0.3 }, visual: 'engine_twin', desc: 'Two diesels pulled from a harbour tug. Outruns raiders and storms. Only Rig Helios can fit one.' },
  // Hull
  { id: 'hull_copper', slot: 'hull', tier: 1, name: 'Copper-Banded Hull', cost: { gold: 130, mats: [{ id: 'driftwood', n: 4 }] }, effects: { reef: true, hull: 20 }, visual: 'copper',
    desc: 'Copper sheathing along the waterline. Lets you scrape over the reef breakers around Gull Shoal. +20 hull.' },
  { id: 'hull_armor', slot: 'hull', tier: 2, name: 'Riveted Armour Plating', requires: 'hull_copper', where: ['helios', 'driftholm'],
    cost: { gold: 260, mats: [{ id: 'alloy_plate', n: 4 }, { id: 'iron_nails', n: 6 }] },
    effects: { reef: true, hull: 60, armor: 0.45 }, visual: 'armor_plate', desc: 'Alloy plate bolted over the hull. Storms and raider rams do 45% less damage. +60 hull.' },
  // Storage
  { id: 'cargo_crate', slot: 'storage', tier: 1, name: 'Lashed Cargo Crate', cost: { gold: 40, mats: [{ id: 'driftwood', n: 3 }] }, effects: { cargo: 4 }, visual: 'crate1',
    desc: 'A sturdy crate lashed to the stern. +4 cargo slots.' },
  { id: 'cargo_net', slot: 'storage', tier: 2, name: 'Rope Cargo Nets', requires: 'cargo_crate', cost: { gold: 85, mats: [{ id: 'rope', n: 3 }] }, effects: { cargo: 8 }, visual: 'crate2',
    desc: 'Nets slung along the sides for bulky finds. +8 cargo slots total.' },
  // Fuel tank
  { id: 'tank_drums', slot: 'tank', tier: 1, name: 'Fuel Drum Rack', requires: 'engine_outboard', cost: { gold: 70, mats: [{ id: 'scrap_metal', n: 2 }, { id: 'rope', n: 2 }] },
    effects: { fuelCap: 60 }, visual: 'fuel_drums', desc: 'Four lashed drums. +60 fuel capacity. Go further, come back.' },
  // Steering
  { id: 'rudder_ash', slot: 'steering', tier: 1, name: 'Ash-Wood Rudder', cost: { gold: 45, mats: [{ id: 'driftwood', n: 2 }] }, effects: { turnMul: 1.45 }, visual: 'rudder',
    desc: 'A bigger blade and a tiller with a grip. Turns 45% sharper.' },
  // Navigation
  { id: 'compass_brass', slot: 'navigation', tier: 1, name: 'Brass Compass', cost: { gold: 90 }, effects: { compass: true }, visual: 'compass',
    desc: 'Mounted on the bow. Points toward the X on whichever treasure map you’re following.' },
  { id: 'radar_mast', slot: 'navigation', tier: 2, name: 'Salvage Radar', requires: 'compass_brass', where: ['helios'],
    cost: { gold: 240, mats: [{ id: 'electronics', n: 4 }, { id: 'wire', n: 3 }, { id: 'scrap_metal', n: 2 }] },
    effects: { compass: true, radar: 420 }, visual: 'radar_mast', desc: 'A spinning dish on a lattice mast. Pings salvage sites and drifting caches within 420 m.' },
  // Salvage
  { id: 'salvage_crane', slot: 'salvage', tier: 1, name: 'Salvage Crane & Winch', cost: { gold: 160, mats: [{ id: 'scrap_metal', n: 6 }, { id: 'rope', n: 3 }, { id: 'wire', n: 2 }] },
    effects: { salvage: 1 }, visual: 'salvage_crane', desc: 'Hydraulic boom and a drum winch. Lifts heavy salvage (tankers, rigs, the Spire) and widens your winch window.' },
  // Defense
  { id: 'harpoon_turret', slot: 'defense', tier: 1, name: 'Harpoon Turret', where: ['helios'], cost: { gold: 220, mats: [{ id: 'scrap_metal', n: 5 }, { id: 'engine_parts', n: 1 }, { id: 'rope', n: 4 }] },
    effects: { harpoon: 32 }, visual: 'harpoon_turret', desc: 'A pneumatic harpoon on a swivel. Raiders that come close get a very pointed warning.' },
  // Power
  { id: 'solar_array', slot: 'power', tier: 1, name: 'Solar Array', cost: { gold: 120, mats: [{ id: 'electronics', n: 3 }, { id: 'wire', n: 2 }, { id: 'plastic', n: 3 }] },
    effects: { solar: 2.5 }, visual: 'solar_array', desc: 'Four cracked panels and a charge controller. Trickles 2.5 fuel a minute back into the tank by day.' },
  { id: 'deck_turbine', slot: 'power', tier: 2, name: 'Deck Wind Turbine', requires: 'solar_array', cost: { gold: 180, mats: [{ id: 'engine_parts', n: 1 }, { id: 'wire', n: 3 }, { id: 'plastic', n: 2 }] },
    effects: { solar: 6 }, visual: 'deck_turbine', desc: 'Spins day and night. With the solar array: 6 fuel a minute, more in a storm.' },
  // Quarters
  { id: 'cabin_container', slot: 'quarters', tier: 1, name: 'Container Cabin', requires: 'cargo_crate', cost: { gold: 200, mats: [{ id: 'scrap_metal', n: 6 }, { id: 'driftwood', n: 4 }, { id: 'plastic', n: 2 }] },
    effects: { berths: 2 }, visual: 'cabin_container', desc: 'Half a shipping container with bunks, a porthole and a tomato plant. +2 crew berths.' },
  // Lighting
  { id: 'deck_lights', slot: 'lighting', tier: 1, name: 'String Lights & Spotlight', cost: { gold: 50, mats: [{ id: 'wire', n: 2 }, { id: 'electronics', n: 1 }] },
    effects: { light: 1 }, visual: 'spotlight', desc: 'Warm bulbs along the rail and a spotlight on the bow. Your boat glows at night and caches glint in the dark.' },
  // Fishing
  { id: 'fishing_rig', slot: 'fishing', tier: 1, name: 'Trolling Rods', where: ['hollow', 'driftholm'], cost: { gold: 60, mats: [{ id: 'rope', n: 2 }, { id: 'driftwood', n: 2 }] },
    effects: { fishing: 1 }, visual: 'fishing_rig', desc: 'Two rods off the stern. Catch Silverfin while you sail. A Fisher on the crew triples the catch.' },
];

export const COSMETICS: CosmeticDef[] = [
  { id: 'paint_driftwood', slot: 'paint', name: 'Bare Driftwood', colors: ['#a77b4f', '#7a5534'], rarity: 'common' },
  { id: 'paint_seafoam', slot: 'paint', name: 'Seafoam Green', colors: ['#4fb39a', '#f2ead8'], cost: 25, rarity: 'common' },
  { id: 'paint_crimson', slot: 'paint', name: 'Harbor Crimson', colors: ['#c0392b', '#f4c542'], cost: 35, rarity: 'uncommon' },
  { id: 'paint_midnight', slot: 'paint', name: 'Midnight Navy', colors: ['#22325a', '#e8c46a'], cost: 45, rarity: 'uncommon' },
  { id: 'paint_hazard', slot: 'paint', name: 'Hazard Stripe', colors: ['#f2b825', '#2b2f36'], cost: 60, rarity: 'uncommon' },
  { id: 'paint_rust', slot: 'paint', name: 'Honest Rust', colors: ['#a24b21', '#7f8a94'], cost: 40, rarity: 'common' },
  { id: 'paint_gilded', slot: 'paint', name: 'Gilded Hunter', colors: ['#2b1d14', '#f4c542'], unlock: 'm_first_chest', rarity: 'rare' },
  { id: 'paint_storm', slot: 'paint', name: 'Stormbreaker', colors: ['#3c4a5c', '#e9fbf6'], unlock: 'm_stormwall', rarity: 'legendary' },

  { id: 'sail_plain', slot: 'sail', name: 'Plain Canvas', colors: ['#f1e6cc', '#f1e6cc'], rarity: 'common' },
  { id: 'sail_stripe', slot: 'sail', name: 'Red Stripe', colors: ['#f1e6cc', '#c0392b'], cost: 20, rarity: 'common' },
  { id: 'sail_sunset', slot: 'sail', name: 'Sunset Bands', colors: ['#ffcf7a', '#ff6b4a'], cost: 40, rarity: 'uncommon' },
  { id: 'sail_tarp', slot: 'sail', name: 'Blue Tarp Patchwork', colors: ['#2f6fb0', '#e8742a'], cost: 30, rarity: 'common' },
  { id: 'sail_shells', slot: 'sail', name: 'Beachcomber Shells', colors: ['#f1e6cc', '#e0607e'], unlock: 'm_beachcomber', rarity: 'rare' },
  { id: 'sail_billboard', slot: 'sail', name: 'Old Billboard', colors: ['#f6ead0', '#2b2f36'], unlock: 'm_salvager', rarity: 'epic' },

  { id: 'flag_none', slot: 'flag', name: 'No Flag', colors: ['#000', '#000'], rarity: 'common' },
  { id: 'flag_harbor', slot: 'flag', name: 'Driftholm Pennant', colors: ['#3a86ff', '#ffffff'], cost: 15, rarity: 'common' },
  { id: 'flag_wren', slot: 'flag', name: 'Colors of the Wren', colors: ['#1c1c22', '#efe6d2'], unlock: 'm_wreck', rarity: 'epic' },
  { id: 'flag_helios', slot: 'flag', name: 'Helios Sunburst', colors: ['#c8352a', '#f2b825'], unlock: 'm_helios', rarity: 'rare' },
  // sewn by Odessa for captains who have been through the Stormwall (character arc, PR 2.3)
  { id: 'flag_tidebreaker', slot: 'flag', name: 'Tidebreaker Colours', colors: ['#1a1a17', '#d6a62a'], rarity: 'legendary' },
];

export const UPGRADE_MAP: Record<string, UpgradeDef> = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
export const COSMETIC_MAP: Record<string, CosmeticDef> = Object.fromEntries(COSMETICS.map((c) => [c.id, c]));

export const SLOT_LABEL: Record<UpgradeSlot, string> = {
  sail: 'Sails',
  engine: 'Engine',
  hull: 'Hull',
  storage: 'Storage',
  tank: 'Fuel Tank',
  steering: 'Steering',
  navigation: 'Navigation',
  salvage: 'Salvage Gear',
  defense: 'Defense',
  power: 'Power',
  quarters: 'Living Quarters',
  lighting: 'Lighting',
  fishing: 'Fishing',
};
export const SLOT_ORDER = Object.keys(SLOT_LABEL) as UpgradeSlot[];

export const BASE_FUEL = 40;
