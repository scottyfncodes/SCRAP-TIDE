// Data-driven world layout: regions, islands, landmarks, hidden caches and treasure maps.

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
  // A visible object that holds something specific (bottle, chest, drawer).
  id: string;
  kind: 'bottle' | 'chest' | 'crate' | 'drawer';
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

export type RegionId = 'shallows' | 'emerald';

export interface RegionDef {
  id: RegionId;
  name: string;
  blurb: string;
}

export const REGIONS: Record<RegionId, RegionDef> = {
  shallows: { id: 'shallows', name: 'The Shallows', blurb: 'Friendly turquoise water, small islands and smaller secrets.' },
  emerald: { id: 'emerald', name: 'The Emerald Coast', blurb: 'Jungle-choked islands and the ruins of people who loved the sun.' },
};

export const WORLD = {
  size: 1300, // square extent centered on origin
  deepFloor: -18,
  shallowsCenter: { x: 0, z: 30 },
  shallowsRadius: 365, // beyond this, the open swell begins (needs a sloop)
  harborDock: { x: 0, z: 200, endZ: 172 },
  spawn: { x: 6, z: 168, heading: Math.PI }, // facing north (-z)
  reef: { x: 40, z: -175, r: 72, w: 5 },
  wind: { dir: -Math.PI * 0.62 }, // radians, direction wind blows toward
};

export const ISLANDS: IslandDef[] = [
  {
    id: 'harbor', name: 'Port Saltwhistle', region: 'shallows', x: 0, z: 320, r: 112, peak: 13, seed: 11, style: 'harbor',
    palms: 26, rocks: 10, foliage: 30, shells: 0, landmarks: [], caches: [], finds: [],
    blurb: 'Home port. Smells of tar, fried fish and big plans.',
  },
  {
    id: 'turtle', name: 'Turtle Cay', region: 'shallows', x: -150, z: 70, r: 40, peak: 9, seed: 23, style: 'tropical',
    palms: 18, rocks: 6, foliage: 16, shells: 7,
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
    ],
    blurb: 'Shaped like a sleeping turtle, if you squint and are kind.',
  },
  {
    id: 'lantern', name: 'Lantern Rock', region: 'shallows', x: 175, z: 10, r: 32, peak: 15, seed: 37, style: 'rocky',
    palms: 6, rocks: 16, foliage: 8, shells: 5,
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
    ],
    blurb: 'A lighthouse that has not been lit in thirty years. It still watches.',
  },
  {
    id: 'gull', name: 'Gull Sandbar', region: 'shallows', x: 40, z: -175, r: 22, peak: 2.4, seed: 51, style: 'sandbar',
    palms: 3, rocks: 3, foliage: 3, shells: 8,
    landmarks: [{ type: 'wreck', x: 2, z: 0, rot: 0.5 }],
    caches: [{ id: 'gull_c1', x: -12, z: 8, loot: [{ id: 'coral_branch', n: 2 }] }],
    finds: [
      { id: 'wreck_cabin', kind: 'crate', x: 5.1, z: 5.7, label: 'Search the captain’s cabin', loot: [{ id: 'sextant', n: 1 }, { id: 'tattered_flag', n: 1 }], fragment: 'redfinch_a' },
      { id: 'wreck_bell', kind: 'crate', x: -0.4, z: -4.4, label: 'Pry loose the ship’s bell', loot: [{ id: 'ship_bell', n: 1 }, { id: 'rope', n: 3 }] },
      { id: 'wreck_hold', kind: 'crate', x: 0.9, z: 1.2, label: 'Dig through the cargo hold', loot: [{ id: 'spyglass', n: 1 }, { id: 'iron_nails', n: 4 }, { id: 'canvas', n: 3 }] },
    ],
    blurb: 'A ring of breakers guards the wreck of the Wren. Only a strong hull gets through.',
  },
  {
    id: 'mossjaw', name: 'Mossjaw Isle', region: 'emerald', x: -330, z: -320, r: 58, peak: 22, seed: 77, style: 'jungle',
    palms: 22, rocks: 10, foliage: 40, shells: 6,
    landmarks: [
      { type: 'arch', x: -8, z: 10, rot: 0.3 },
      { type: 'pillars', x: 18, z: -6 },
      { type: 'waterfall', x: -4, z: -22 },
    ],
    caches: [
      { id: 'moss_c1', x: 30, z: 20, loot: [{ id: 'sea_emerald', n: 1 }] },
      { id: 'moss_c2', x: -30, z: 0, loot: [{ id: 'clay_whistle', n: 1 }, { id: 'doubloon', n: 3 }] },
    ],
    finds: [],
    blurb: 'Green on green on green. Somewhere under the moss, someone carved a sun.',
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
    { id: 'spiral_shell', w: 6 }, { id: 'conch', w: 4 }, { id: 'sand_dollar', w: 4 }, { id: 'starfish', w: 4 },
    { id: 'sea_glass', w: 3 }, { id: 'driftwood', w: 6 }, { id: 'coral_branch', w: 1 }, { id: 'bottle_letter', w: 1 }, { id: 'rope', w: 1 },
  ],
  emerald: [
    { id: 'conch', w: 4 }, { id: 'starfish', w: 3 }, { id: 'coral_branch', w: 3 }, { id: 'driftwood', w: 6 }, { id: 'pearl', w: 1 },
  ],
};

// Random dig finds when you dig somewhere that isn't a cache or treasure.
export const DIG_POOL: { id: string; w: number }[] = [
  { id: 'spiral_shell', w: 5 }, { id: 'silver_piece', w: 2 }, { id: 'sea_glass', w: 3 }, { id: 'iron_nails', w: 1 }, { id: 'doubloon', w: 1 },
];
