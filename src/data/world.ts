// Data-driven world layout for the Drowned World: regions, islands (the last high ground), landmarks,
// hidden caches, treasure maps, drowned structures, settlements, salvage sites and hazard zones.

export type IslandStyle = 'harbor' | 'tropical' | 'rocky' | 'sandbar' | 'jungle';
export type LandmarkType =
  | 'twin_palms'
  | 'skull_rock'
  | 'lighthouse'
  | 'wreck'
  | 'arch'
  | 'pillars'
  | 'waterfall'
  | 'hut'
  | 'big_palm'
  | 'boulder';

export interface Landmark {
  type: LandmarkType;
  x: number; // relative to island center
  z: number;
  rot?: number;
}

export interface Cache {
  id: string;
  x: number; // relative
  z: number;
  loot: { id: string; n: number }[];
}

export interface ScriptedFind {
  // A visible object that holds something specific (bottle, chest, drawer), or a living plant ('plant',
  // drawn with the GITCRAFT flora kit node named in `plant`).
  id: string;
  kind: 'bottle' | 'chest' | 'crate' | 'drawer' | 'plant';
  plant?: string;
  x: number;
  z: number;
  label: string;
  loot: { id: string; n: number }[];
  fragment?: string; // map fragment id
  requiresItem?: string; // key etc.
  requiresText?: string;
}

export interface IslandDef {
  id: string;
  name: string;
  region: RegionId;
  x: number;
  z: number;
  r: number; // land radius
  peak: number;
  seed: number;
  style: IslandStyle;
  palms: number;
  rocks: number;
  foliage: number;
  shells: number; // beach pickups each visit
  landmarks: Landmark[];
  caches: Cache[];
  finds: ScriptedFind[];
  blurb: string;
}

export type RegionId = 'shallows' | 'emerald' | 'stormwall';

export interface RegionDef {
  id: RegionId;
  name: string;
  blurb: string;
}

export const REGIONS: Record<RegionId, RegionDef> = {
  shallows: { id: 'shallows', name: 'The Drift', blurb: 'Silted shallows over a drowned county. Rooftops, dead reefs and rumours.' },
  emerald: { id: 'emerald', name: 'The Sunken Reach', blurb: 'Open swell over the old cities. Towers, rigs and raiders.' },
  stormwall: { id: 'stormwall', name: 'The Stormwall', blurb: 'A storm that never ends. Something tall stands inside it.' },
};

export const WORLD = {
  size: 2400, // square extent centered on origin
  deepFloor: -18,
  shallowsCenter: { x: 0, z: 30 },
  shallowsRadius: 365, // beyond this, the open swell begins (needs the Scrap Trimaran)
  stormRadius: 900, // beyond this, the permanent Stormwall (needs the Ironwake)
  harborDock: { x: 0, z: 200, endZ: 172 },
  spawn: { x: 6, z: 168, heading: Math.PI }, // facing north (-z)
  reef: { x: 40, z: -175, r: 72, w: 5 },
  wind: { dir: -Math.PI * 0.62 }, // radians, direction wind blows toward
};

export const ISLANDS: IslandDef[] = [
  {
    id: 'harbor', name: 'Driftholm', region: 'shallows', x: 0, z: 320, r: 112, peak: 13, seed: 11, style: 'harbor',
    palms: 8, rocks: 12, foliage: 10, shells: 0, landmarks: [], caches: [], finds: [],
    blurb: 'Rafts lashed to the last hill of the old harbour town. Home.',
  },
  {
    id: 'turtle', name: 'Turtle Atoll', region: 'shallows', x: -150, z: 70, r: 40, peak: 9, seed: 23, style: 'tropical',
    palms: 7, rocks: 8, foliage: 8, shells: 7,
    landmarks: [
      { type: 'skull_rock', x: 14, z: -12 },
      { type: 'twin_palms', x: -12, z: -6 },
      { type: 'big_palm', x: 2, z: 18 },
    ],
    caches: [
      { id: 'turtle_c1', x: 22, z: 16, loot: [{ id: 'old_key', n: 1 }] },
      { id: 'turtle_c2', x: -24, z: 14, loot: [{ id: 'silver_piece', n: 4 }] },
      { id: 'turtle_c3', x: -2, z: -26, loot: [{ id: 'clay_whistle', n: 1 }] },
    ],
    finds: [
      { id: 'turtle_bottle', kind: 'bottle', x: 6, z: 33, label: 'Search the bottle', loot: [], fragment: 'turtle_scrap' },
      { id: 'turtle_seedling', kind: 'plant', plant: 'flora_seedling', x: -16, z: 6, label: 'Lift the seedling tin', loot: [{ id: 'seedling_tin', n: 1 }] },
    ],
    blurb: 'A ring of dead coral around the top of a drowned hill. Shaped like a turtle, if you squint. Something green was seen here.',
  },
  {
    id: 'lantern', name: 'Lantern Rock', region: 'shallows', x: 175, z: 10, r: 32, peak: 15, seed: 37, style: 'rocky',
    palms: 3, rocks: 18, foliage: 5, shells: 5,
    landmarks: [
      { type: 'lighthouse', x: 6, z: -6 },
      { type: 'hut', x: -10, z: 8, rot: 0.6 },
    ],
    caches: [
      { id: 'lantern_c1', x: -18, z: -14, loot: [{ id: 'sea_glass', n: 3 }, { id: 'pearl', n: 1 }] },
      { id: 'lantern_c2', x: 18, z: 16, loot: [{ id: 'strange_coin', n: 1 }] },
    ],
    finds: [
      { id: 'lantern_drawer', kind: 'drawer', x: -6, z: 13, label: 'Open the keeper’s sea-chest', loot: [{ id: 'gold_bar', n: 1 }, { id: 'journal_redfinch', n: 1 }],
        fragment: 'redfinch_b', requiresItem: 'old_key', requiresText: 'The sea-chest is locked tight. A barnacled lock… someone buried the key nearby, maybe on another island.' },
      { id: 'lantern_moss', kind: 'plant', plant: 'flora_moss', x: 2, z: -14, label: 'Peel up the moss', loot: [{ id: 'live_moss', n: 1 }] },
    ],
    blurb: 'The old coast light. The coast is gone. The light still watches.',
  },
  {
    id: 'gull', name: 'Gull Shoal', region: 'shallows', x: 40, z: -175, r: 22, peak: 2.4, seed: 51, style: 'sandbar',
    palms: 3, rocks: 3, foliage: 3, shells: 8,
    landmarks: [{ type: 'wreck', x: 2, z: 0, rot: 0.5 }],
    caches: [{ id: 'gull_c1', x: -12, z: 8, loot: [{ id: 'coral_branch', n: 2 }] }],
    finds: [
      { id: 'wreck_cabin', kind: 'crate', x: 5.1, z: 5.7, label: 'Search the captain’s cabin', loot: [{ id: 'sextant', n: 1 }, { id: 'tattered_flag', n: 1 }], fragment: 'redfinch_a' },
      { id: 'wreck_bell', kind: 'crate', x: -0.4, z: -4.4, label: 'Pry loose the ship’s bell', loot: [{ id: 'ship_bell', n: 1 }, { id: 'rope', n: 3 }] },
      { id: 'wreck_hold', kind: 'crate', x: 0.9, z: 1.2, label: 'Dig through the cargo hold', loot: [{ id: 'spyglass', n: 1 }, { id: 'iron_nails', n: 4 }, { id: 'canvas', n: 3 }] },
      { id: 'gull_weed', kind: 'plant', plant: 'flora_seaweed', x: -8, z: -8, label: 'Gather the sea-lettuce', loot: [{ id: 'sea_lettuce', n: 3 }, { id: 'algae_mat', n: 2 }] },
    ],
    blurb: 'A ring of breakers guards the wreck of the trawler Wren. Only a strong hull gets through.',
  },
  {
    id: 'mossjaw', name: 'Canopy Rise', region: 'emerald', x: -330, z: -320, r: 58, peak: 22, seed: 77, style: 'jungle',
    palms: 9, rocks: 12, foliage: 10, shells: 6,
    landmarks: [
      { type: 'arch', x: -8, z: 10, rot: 0.3 },
      { type: 'pillars', x: 18, z: -6 },
      { type: 'waterfall', x: -4, z: -22 },
    ],
    caches: [
      { id: 'moss_c1', x: 30, z: 20, loot: [{ id: 'sea_emerald', n: 1 }] },
      { id: 'moss_c2', x: -30, z: 0, loot: [{ id: 'clay_whistle', n: 1 }, { id: 'doubloon', n: 3 }] },
    ],
    finds: [
      { id: 'canopy_flowers', kind: 'plant', plant: 'flora_flowering', x: -25.5, z: -6, label: 'Take the flowers under glass', loot: [{ id: 'flowering_jar', n: 1 }] },
      { id: 'canopy_potted', kind: 'plant', plant: 'flora_potted', x: 20, z: 10, label: 'Take the potted green', loot: [{ id: 'potted_green', n: 1 }, { id: 'jar_of_soil', n: 1 }] },
      { id: 'canopy_vine', kind: 'plant', plant: 'flora_fruit', x: 27, z: 19, label: 'Haul the tomato vine', loot: [{ id: 'fruit_vine', n: 1 }] },
      { id: 'canopy_sapling', kind: 'plant', plant: 'flora_sapling', x: 16, z: 3, label: 'Take a sapling from the last tree', loot: [{ id: 'tree_sapling', n: 1 }] },
    ],
    blurb: 'The last hilltop with soil on it. The gardeners are long gone, but behind their scrap walls the last tree still stands.',
  },
];

export interface MapFragmentDef {
  id: string;
  mapId: string;
  name: string;
  where: string;
}

export interface TreasureMapDef {
  id: string;
  name: string;
  island: string;
  fragments: string[];
  // X marks the spot (relative to island center)
  x: number;
  z: number;
  clue: string;
  landmarks: LandmarkType[]; // drawn on the map
  loot: { id: string; n: number }[];
  chestTier: 'small' | 'grand';
}

export const MAP_FRAGMENTS: MapFragmentDef[] = [
  { id: 'turtle_scrap', mapId: 'turtle_map', name: 'Soggy Map Scrap', where: 'In a bottle on Turtle Cay' },
  { id: 'redfinch_a', mapId: 'redfinch_map', name: 'Redfinch’s Chart (left half)', where: 'Wreck of the Wren' },
  { id: 'redfinch_b', mapId: 'redfinch_map', name: 'Redfinch’s Chart (right half)', where: 'Lantern Rock' },
];

export const TREASURE_MAPS: TreasureMapDef[] = [
  {
    id: 'turtle_map', name: 'The Turtle’s Belly', island: 'turtle', fragments: ['turtle_scrap'],
    x: 2, z: -11,
    clue: 'Stand between the grinning skull and the two sisters. Dig where the turtle keeps its lunch.',
    landmarks: ['skull_rock', 'twin_palms', 'big_palm'],
    loot: [{ id: 'doubloon', n: 6 }, { id: 'pearl', n: 1 }, { id: 'turtle_idol', n: 1 }, { id: 'gold_ring', n: 1 }],
    chestTier: 'small',
  },
  {
    id: 'redfinch_map', name: 'Redfinch’s Sun Hoard', island: 'mossjaw', fragments: ['redfinch_a', 'redfinch_b'],
    x: -8, z: 10,
    clue: 'Past the swell where the green begins. Under the stone mouth, the sun sleeps.',
    landmarks: ['arch', 'pillars', 'waterfall'],
    loot: [{ id: 'sun_mask', n: 1 }, { id: 'gold_bar', n: 2 }, { id: 'sea_emerald', n: 2 }, { id: 'doubloon', n: 15 }],
    chestTier: 'grand',
  },
];

export const ISLAND_MAP: Record<string, IslandDef> = Object.fromEntries(ISLANDS.map((i) => [i.id, i]));
export const TREASURE_MAP_MAP: Record<string, TreasureMapDef> = Object.fromEntries(TREASURE_MAPS.map((m) => [m.id, m]));
export const FRAGMENT_MAP: Record<string, MapFragmentDef> = Object.fromEntries(MAP_FRAGMENTS.map((f) => [f.id, f]));

// Beach pickups rolled per visit, by region.
export const BEACH_POOL: Record<RegionId, { id: string; w: number }[]> = {
  shallows: [
    { id: 'spiral_shell', w: 3 }, { id: 'conch', w: 2 }, { id: 'sand_dollar', w: 2 }, { id: 'starfish', w: 2 }, { id: 'plastic', w: 4 },
    { id: 'sea_glass', w: 3 }, { id: 'driftwood', w: 6 }, { id: 'coral_branch', w: 1 }, { id: 'bottle_letter', w: 1 }, { id: 'rope', w: 2 },
    { id: 'algae_mat', w: 3 }, { id: 'sea_lettuce', w: 1.5 },
  ],
  emerald: [
    { id: 'conch', w: 2 }, { id: 'starfish', w: 2 }, { id: 'coral_branch', w: 3 }, { id: 'driftwood', w: 6 }, { id: 'pearl', w: 1 },
    { id: 'plastic', w: 4 }, { id: 'rubber_duck', w: 1 }, { id: 'algae_mat', w: 3 }, { id: 'sea_lettuce', w: 2 }, { id: 'seedling_tin', w: 0.25 },
  ],
  stormwall: [{ id: 'driftwood', w: 4 }, { id: 'scrap_metal', w: 3 }],
};

// Random dig finds when you dig somewhere that isn't a cache or treasure.
export const DIG_POOL: { id: string; w: number }[] = [
  { id: 'spiral_shell', w: 5 }, { id: 'silver_piece', w: 2 }, { id: 'sea_glass', w: 3 }, { id: 'iron_nails', w: 2 }, { id: 'doubloon', w: 1 },
  { id: 'scrap_metal', w: 2 }, { id: 'plastic', w: 2 }, { id: 'gold_watch', w: 0.3 },
];

// ───────────────────────── Drowned World ─────────────────────────

export type StructureKind = 'tower_glass' | 'tower_brick' | 'tower_spire' | 'tower_stump' | 'oil_rig' | 'tanker' | 'container' | 'mega_spire' | 'trawler' | 'crane';

/** Drowned structures placed in open water. Models come from the GITCRAFT MeshCraft kit (public/models). */
export interface StructureDef {
  kind: StructureKind;
  x: number;
  z: number;
  rot?: number; // radians around Y
  scale?: number;
  variant?: string; // e.g. container colour
  r: number; // boat collision radius (0 = none)
}

const city = (cx: number, cz: number): StructureDef[] => [
  { kind: 'tower_glass', x: cx, z: cz, rot: 0.2, r: 13 },
  { kind: 'tower_spire', x: cx + 70, z: cz - 40, r: 9 },
  { kind: 'tower_brick', x: cx - 55, z: cz + 30, rot: -0.3, r: 13 },
  { kind: 'tower_glass', x: cx + 30, z: cz + 75, rot: 0.9, scale: 0.8, r: 11 },
  { kind: 'tower_stump', x: cx - 40, z: cz - 60, rot: 1.4, r: 10 },
  { kind: 'tower_brick', x: cx + 95, z: cz + 40, rot: 1.2, scale: 1.1, r: 14 },
  { kind: 'tower_glass', x: cx - 110, z: cz - 15, rot: -0.6, scale: 1.25, r: 15 },
  { kind: 'tower_stump', x: cx + 10, z: cz - 120, rot: 2.6, scale: 1.2, r: 11 },
];

export const STRUCTURES: StructureDef[] = [
  // The Drift: the first drowned buildings you see from Driftholm
  { kind: 'tower_stump', x: 92, z: 150, rot: 0.4, r: 10 },
  { kind: 'tower_brick', x: -235, z: -70, rot: 0.5, r: 13 },
  { kind: 'tower_glass', x: 255, z: 210, rot: -0.4, scale: 0.85, r: 12 },
  { kind: 'container', x: 212, z: -118, rot: 0.3, variant: 'red', r: 7 },
  { kind: 'container', x: 220, z: -108, rot: 0.25, variant: 'blue', r: 7 },
  { kind: 'container', x: 202, z: -132, rot: 1.6, variant: 'yellow', r: 7 },
  { kind: 'container', x: 230, z: -128, rot: -0.9, variant: 'teal', r: 7 },
  // The Sunken Reach: Old Meridian, the drowned city
  ...city(500, -440),
  // Rig Helios, the trading post on the old production platform
  { kind: 'oil_rig', x: -540, z: 170, rot: 0.6, r: 22 },
  // Rustfang Graveyard: the tanker and its spilled boxes
  { kind: 'tanker', x: 270, z: 650, rot: 2.2, r: 26 },
  { kind: 'container', x: 300, z: 600, rot: 0.8, variant: 'red', r: 7 },
  { kind: 'container', x: 240, z: 610, rot: 2.1, variant: 'yellow', r: 7 },
  { kind: 'container', x: 320, z: 690, rot: 1.1, variant: 'teal', r: 7 },
  { kind: 'container', x: 215, z: 700, rot: -0.4, variant: 'blue', r: 7 },
  { kind: 'tower_stump', x: 190, z: 590, rot: 2.0, scale: 0.9, r: 9 },
  // The Stormwall: the Meridian Spire
  { kind: 'mega_spire', x: -210, z: -1040, r: 16 },
  // Wrecks and dead machinery: storytelling silhouettes between the landmarks (GITCRAFT salvage pass)
  { kind: 'trawler', x: -300, z: 120, rot: 1.1, r: 9 },
  { kind: 'trawler', x: 330, z: 60, rot: -2.3, scale: 0.9, r: 8 },
  { kind: 'trawler', x: 40, z: -60, rot: 0.4, r: 9 },
  { kind: 'trawler', x: 360, z: 560, rot: 2.8, scale: 1.15, r: 10 },
  { kind: 'trawler', x: -470, z: 260, rot: -0.7, r: 9 },
  { kind: 'crane', x: 380, z: -520, rot: 0.9, r: 13 },
  { kind: 'crane', x: 330, z: 760, rot: -1.4, scale: 1.1, r: 14 },
  { kind: 'crane', x: -330, z: -170, rot: 2.2, scale: 0.9, r: 12 },
  { kind: 'tower_glass', x: -150, z: -990, rot: 0.3, scale: 1.4, r: 17 },
  { kind: 'tower_brick', x: -280, z: -990, rot: -0.2, scale: 1.3, r: 16 },
];

export type ServiceId = 'appraiser' | 'shipwright' | 'cartographer' | 'curios' | 'fuel' | 'repair' | 'workbench' | 'recruit';

export interface SettlementDef {
  id: string;
  name: string;
  kind: string;
  x: number; // dock point
  z: number;
  dockR: number;
  services: ServiceId[];
  blurb: string;
  fuelPrice: number; // gold per unit
}

export const SETTLEMENTS: SettlementDef[] = [
  { id: 'driftholm', name: 'Driftholm', kind: 'Home raft-town', x: 6, z: 168, dockR: 18,
    services: ['appraiser', 'shipwright', 'cartographer', 'curios', 'fuel', 'repair', 'workbench', 'recruit'], fuelPrice: 2,
    blurb: 'Rafts lashed to the last hill of the old harbour. Your vault and your people are here.' },
  { id: 'hollow', name: 'Rooftop Hollow', kind: 'Fishing community', x: -228, z: -48, dockR: 16,
    services: ['appraiser', 'shipwright', 'fuel', 'repair', 'recruit'], fuelPrice: 3,
    blurb: 'Forty fishers living on the roof of a drowned apartment block. They trade fish for anything.' },
  { id: 'helios', name: 'Rig Helios', kind: 'Trading post', x: -540, z: 170, dockR: 30,
    services: ['appraiser', 'shipwright', 'fuel', 'repair', 'workbench', 'recruit'], fuelPrice: 2,
    blurb: 'An oil platform turned market. The flare still burns. Engines, radar and hard bargains.' },
];
export const SETTLEMENT_MAP: Record<string, SettlementDef> = Object.fromEntries(SETTLEMENTS.map((s) => [s.id, s]));

export interface LootRoll {
  id: string;
  w: number;
  n: [number, number];
}

export type SalvageKind = 'rooftop' | 'containers' | 'wreck' | 'rig' | 'spire';

export interface SalvageSiteDef {
  id: string;
  name: string;
  kind: SalvageKind;
  x: number;
  z: number;
  r: number; // interaction radius
  region: RegionId;
  difficulty: number; // 1..3: narrows the winch window
  heavy?: boolean; // needs the Salvage Crane
  rolls: number; // loot rolls per haul
  respawn: number; // seconds until it can be salvaged again (0 = only once)
  loot: LootRoll[];
  first?: { id: string; n: number }[]; // guaranteed loot on the first haul
  blurb: string;
}

const L = (id: string, w: number, a: number, b = a): LootRoll => ({ id, w, n: [a, b] });

export const SALVAGE_SITES: SalvageSiteDef[] = [
  { id: 'sv_stump', name: 'The Sunken Tower', kind: 'rooftop', x: 92, z: 150, r: 20, region: 'shallows', difficulty: 1, rolls: 3, respawn: 240,
    loot: [L('scrap_metal', 6, 1, 3), L('wire', 4, 1, 2), L('plastic', 4, 1, 3), L('rubber_duck', 1, 1), L('fuel_can', 2, 1)],
    first: [{ id: 'transistor_radio', n: 1 }, { id: 'scrap_metal', n: 3 }],
    blurb: 'The top four floors of an office block. Somebody already took the chairs.' },
  { id: 'sv_boxyard', name: 'The Box Yard', kind: 'containers', x: 216, z: -120, r: 22, region: 'shallows', difficulty: 1, rolls: 3, respawn: 300,
    loot: [L('plastic', 5, 2, 4), L('canvas', 3, 1, 3), L('rope', 3, 1, 3), L('electronics', 2, 1), L('snow_globe', 1, 1), L('fuel_can', 2, 1)],
    first: [{ id: 'electronics', n: 2 }, { id: 'canvas', n: 2 }],
    blurb: 'Four shipping containers that floated in on a storm and never left.' },
  { id: 'sv_hollow_sub', name: 'Hollow Underfloors', kind: 'rooftop', x: -250, z: -88, r: 18, region: 'shallows', difficulty: 2, rolls: 3, respawn: 360,
    loot: [L('scrap_metal', 4, 1, 3), L('vinyl_record', 1, 1), L('wire', 3, 1, 2), L('gold_watch', 1, 1), L('iron_nails', 4, 2, 4)],
    blurb: 'The flooded floors under Rooftop Hollow. The fishers let you dive if you share.' },
  { id: 'sv_meridian_a', name: 'Meridian Plaza', kind: 'rooftop', x: 500, z: -440, r: 24, region: 'emerald', difficulty: 2, rolls: 4, respawn: 420,
    loot: [L('electronics', 4, 1, 2), L('scrap_metal', 5, 2, 4), L('street_sign', 1, 1), L('polaroid', 1, 1), L('gold_watch', 1, 1), L('wire', 4, 1, 3)],
    first: [{ id: 'street_sign', n: 1 }],
    blurb: 'The tallest roof of Old Meridian. The view is the whole drowned city.' },
  { id: 'sv_meridian_b', name: 'Broadcast Spire', kind: 'rooftop', x: 570, z: -480, r: 20, region: 'emerald', difficulty: 3, heavy: true, rolls: 4, respawn: 480,
    loot: [L('electronics', 5, 2, 3), L('wire', 4, 2, 3), L('seed_packet', 1, 1), L('traffic_light', 1, 1), L('engine_parts', 2, 1)],
    first: [{ id: 'traffic_light', n: 1 }],
    blurb: 'The antenna still hums when the wind is right. Heavy gear down there.' },
  { id: 'sv_meridian_c', name: 'The Leaning Block', kind: 'rooftop', x: 460, z: -500, r: 18, region: 'emerald', difficulty: 2, rolls: 3, respawn: 420,
    loot: [L('scrap_metal', 5, 2, 4), L('plastic', 4, 2, 3), L('vinyl_record', 2, 1), L('rubber_duck', 2, 1), L('diamond_ring', 1, 1)],
    blurb: 'It has been falling over for fifty years. Very slowly.' },
  { id: 'sv_rig', name: 'Helios Lower Deck', kind: 'rig', x: -555, z: 150, r: 26, region: 'emerald', difficulty: 2, heavy: true, rolls: 3, respawn: 360,
    loot: [L('crude_oil', 6, 1, 3), L('scrap_metal', 4, 1, 3), L('engine_parts', 2, 1), L('rig_badge', 1, 1)],
    first: [{ id: 'rig_badge', n: 1 }, { id: 'crude_oil', n: 3 }],
    blurb: 'The flooded pump deck. Crude still seeps from the old lines.' },
  { id: 'sv_tanker', name: 'Hull of the Meridian Star', kind: 'wreck', x: 270, z: 650, r: 34, region: 'emerald', difficulty: 3, heavy: true, rolls: 5, respawn: 600,
    loot: [L('crude_oil', 5, 2, 4), L('scrap_metal', 6, 3, 5), L('engine_parts', 3, 1, 2), L('alloy_plate', 2, 1), L('ship_in_bottle', 1, 1), L('gold_bar', 1, 1)],
    first: [{ id: 'ship_in_bottle', n: 1 }, { id: 'engine_parts', n: 2 }],
    blurb: 'A supertanker, standing on her stern. Rustfang raiders call it theirs.' },
  { id: 'sv_graveyard', name: 'Graveyard Boxes', kind: 'containers', x: 280, z: 620, r: 22, region: 'emerald', difficulty: 2, rolls: 4, respawn: 420,
    loot: [L('electronics', 3, 1, 3), L('canvas', 3, 2, 3), L('plastic', 4, 2, 4), L('snow_globe', 1, 1), L('fuel_can', 3, 1, 2)],
    blurb: 'Boxes spilled from the tanker when she went down.' },
  { id: 'sv_spire', name: 'The Meridian Spire', kind: 'spire', x: -210, z: -1040, r: 30, region: 'stormwall', difficulty: 3, heavy: true, rolls: 5, respawn: 900,
    loot: [L('electronics', 4, 2, 4), L('alloy_plate', 3, 1, 2), L('diamond_ring', 2, 1), L('gold_bar', 2, 1), L('seed_packet', 2, 1), L('jar_of_soil', 1, 1)],
    first: [{ id: 'summit_chart', n: 1 }, { id: 'gold_bar', n: 2 }],
    blurb: 'The tallest thing left in the world. At the top: the chart everybody whispers about.' },
];
export const SALVAGE_MAP: Record<string, SalvageSiteDef> = Object.fromEntries(SALVAGE_SITES.map((s) => [s.id, s]));

/** Floating caches drift into open water near the player. */
export const CACHE_POOL: Record<RegionId, LootRoll[]> = {
  shallows: [L('fuel_can', 4, 1), L('scrap_metal', 4, 1, 2), L('plastic', 4, 1, 3), L('rope', 3, 1, 2), L('driftwood', 4, 2, 4), L('bottle_letter', 1, 1), L('rubber_duck', 1, 1)],
  emerald: [L('fuel_can', 5, 1, 2), L('scrap_metal', 4, 2, 3), L('electronics', 2, 1), L('wire', 3, 1, 2), L('canvas', 2, 1, 2), L('vinyl_record', 1, 1), L('seedling_tin', 0.5, 1)],
  stormwall: [L('fuel_can', 4, 2), L('alloy_plate', 2, 1), L('engine_parts', 2, 1), L('electronics', 3, 1, 2), L('diamond_ring', 1, 1), L('jar_of_soil', 0.6, 1)],
};

/** Castaways adrift: sail up and rescue them to recruit crew. */
export interface CastawayDef { id: string; crew: string; x: number; z: number; text: string }
export const CASTAWAYS: CastawayDef[] = [
  { id: 'cw_kai', crew: 'kai', x: -60, z: -150, text: 'A raft with a ragged flag, and someone waving both arms.' },
  { id: 'cw_bram', crew: 'bram', x: 455, z: -390, text: 'Someone is shouting from a raft tied to a drowned lamppost.' },
];

/** Hostile waters: Rustfang raider skiffs patrol these zones. */
export interface RaiderZone { id: string; name: string; x: number; z: number; r: number; count: number; speed: number }
export const RAIDER_ZONES: RaiderZone[] = [
  { id: 'rz_graveyard', name: 'Rustfang Graveyard', x: 270, z: 640, r: 230, count: 3, speed: 9.5 },
  { id: 'rz_meridian', name: 'Old Meridian', x: 520, z: -450, r: 200, count: 2, speed: 8.5 },
];

/**
 * Settlement hierarchy dressing (no services: pure world-building, built from the GITCRAFT atoll/outpost kits).
 *  outpost      a handful of lashed platforms, a shelter, a crude watchtower, a mooring point
 *  raider_fort  a fortified scrap atoll: gate, burnt walls from past attacks, towers, the raiders' boats
 *  strip_wreck  a salvage barge cutting a wreck apart for parts
 *  sinking      an abandoned platform slowly going under
 */
export interface OutpostDef { id: string; name: string; kind: 'outpost' | 'raider_fort' | 'strip_wreck' | 'sinking'; x: number; z: number; rot: number; r: number }
export const OUTPOSTS: OutpostDef[] = [
  { id: 'op_gullstep', name: 'Gullstep', kind: 'outpost', x: 110, z: 70, rot: 0.5, r: 9 },
  { id: 'op_tincan', name: 'Tin Can Rest', kind: 'outpost', x: -120, z: -110, rot: -0.4, r: 9 },
  { id: 'op_lastcall', name: 'Last Call', kind: 'outpost', x: -400, z: 20, rot: 1.2, r: 9 },
  { id: 'op_hold', name: 'Rustfang Hold', kind: 'raider_fort', x: 350, z: 625, rot: 2.6, r: 24 },
  { id: 'op_strip', name: 'The Stripping Yard', kind: 'strip_wreck', x: 54, z: -54, rot: 0.4, r: 8 },
  { id: 'op_sinking', name: 'Going Under', kind: 'sinking', x: -60, z: 40, rot: 0.9, r: 8 },
];

/**
 * Sea marks: small things left on the water by people who are gone, each with one find and one line of lore
 * (design bible PR 1.3: the empty north-west). Sail up slowly and INVESTIGATE. Built from the GITCRAFT kits.
 */
export interface SeaMarkDef { id: string; name: string; kind: 'bell' | 'billboard' | 'shrine'; x: number; z: number; region: RegionId; blurb: string; lore: string; loot: { id: string; n: number }[] }
export const SEA_MARKS: SeaMarkDef[] = [
  { id: 'mark_bell', name: 'The Silent Bell', kind: 'bell', x: -280, z: -180, region: 'shallows',
    blurb: 'A bell buoy that stopped ringing. Bells don’t stop on their own.',
    lore: 'A rag is wedged in the clapper, tied off with care. Someone didn’t want the bell calling raiders to whatever was moored here. The mooring line is still tied to the cage.',
    loot: [{ id: 'rope', n: 3 }, { id: 'iron_nails', n: 3 }, { id: 'bottle_letter', n: 1 }] },
  { id: 'mark_billboard', name: 'The Smiling Family', kind: 'billboard', x: -150, z: -270, region: 'shallows',
    blurb: 'A billboard sticking out of the swell: a family on a green lawn, smiling.',
    lore: 'Somebody climbed up and painted one word across the lawn: LIAR. Behind the board, a scavenger’s stash is lashed to the frame.',
    loot: [{ id: 'plastic', n: 3 }, { id: 'wire', n: 2 }, { id: 'canvas', n: 1 }] },
  { id: 'mark_shrine', name: 'The Lashed Shrine', kind: 'shrine', x: -490, z: -410, region: 'emerald',
    blurb: 'Oil drums lashed round a dead tree. Things hang from the branches.',
    lore: 'Keys, rings, a child’s shoe, a dog tag. A tin sign at the root says TAKE ONE, LEAVE ONE. You take a ring and leave a nail. It seems fair.',
    loot: [{ id: 'gold_ring', n: 1 }, { id: 'clay_whistle', n: 1 }] },
];

/** Named points of interest drawn on the chart. */
export const POIS = [
  { id: 'meridian', name: 'Old Meridian', x: 500, z: -440 },
  { id: 'helios', name: 'Rig Helios', x: -540, z: 170 },
  { id: 'graveyard', name: 'Rustfang Graveyard', x: 270, z: 650 },
  { id: 'hollow', name: 'Rooftop Hollow', x: -235, z: -70 },
  { id: 'spire', name: 'The Meridian Spire', x: -210, z: -1040 },
  { id: 'hold', name: 'Rustfang Hold', x: 350, z: 625, blurb: 'A raider atoll of scrap walls and a hull-plate gate. The scorch marks are from the last people who tried.' },
  ...SEA_MARKS.map((m) => ({ id: m.id, name: m.name, x: m.x, z: m.z, blurb: m.blurb })),
  { id: 'canopy', name: 'The Last Tree', x: -318, z: -312, blurb: 'Green. Actual green, on the hilltop, behind scrap walls. Someone fought to keep it alive.' },
] as { id: string; name: string; x: number; z: number; blurb?: string }[];
