// Data-driven collectible + resource definitions.
// Add new discoveries here; the catalog, cargo, merchants and loot tables read from this list.

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type Category =
  | 'treasure'
  | 'artifact'
  | 'history'
  | 'ocean'
  | 'wreck'
  | 'curiosity'
  | 'resource';

export interface ItemDef {
  id: string;
  name: string;
  category: Category;
  rarity: Rarity;
  value: number; // base sell price at the appraiser
  icon: string; // icon shape key (see ui/icons.ts)
  colors: [string, string]; // primary / accent
  stack: number; // how many fit in one cargo slot
  desc: string;
  displayable?: boolean; // can be mounted as a ship trophy
}

export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#c9b48a',
  uncommon: '#5fc47a',
  rare: '#4aa3ff',
  epic: '#b26bff',
  legendary: '#ffb627',
};
export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

export const CATEGORY_LABEL: Record<Category, string> = {
  treasure: 'Treasure',
  artifact: 'Ancient Artifacts',
  history: 'Pirate History',
  ocean: 'Ocean Finds',
  wreck: 'Shipwreck Recovery',
  curiosity: 'Curiosities',
  resource: 'Materials',
};

export const ITEMS: ItemDef[] = [
  // ── Treasure ──
  { id: 'doubloon', name: 'Gold Doubloon', category: 'treasure', rarity: 'common', value: 12, icon: 'coin', colors: ['#f4c542', '#b8860b'], stack: 20,
    desc: 'Heavy, slightly bent, and stamped with a king nobody remembers.' },
  { id: 'silver_piece', name: 'Silver Piece-of-Eight', category: 'treasure', rarity: 'common', value: 6, icon: 'coin', colors: ['#d9dde3', '#8a95a3'], stack: 20,
    desc: 'Cut into eight wedges for making change. Somebody got shortchanged.' },
  { id: 'pearl', name: 'Lagoon Pearl', category: 'treasure', rarity: 'uncommon', value: 30, icon: 'pearl', colors: ['#fff6ea', '#e3c9b4'], stack: 10,
    desc: 'Pale pink and perfectly round. Oysters in the Shallows are generous.' },
  { id: 'gold_ring', name: 'Signet Ring', category: 'treasure', rarity: 'uncommon', value: 40, icon: 'ring', colors: ['#f4c542', '#c0392b'], stack: 10,
    desc: 'Engraved with a leaping fish. Far too big for any finger you own.' },
  { id: 'sea_emerald', name: 'Sea Emerald', category: 'treasure', rarity: 'rare', value: 75, icon: 'gem', colors: ['#2ecc71', '#0e6b3a'], stack: 10,
    desc: 'A green stone that seems to hold a little bit of the ocean inside it.' },
  { id: 'gold_bar', name: 'Lightkeeper’s Gold Bar', category: 'treasure', rarity: 'rare', value: 140, icon: 'bar', colors: ['#f4c542', '#a87400'], stack: 5,
    desc: 'Stamped with a lighthouse. Lightkeepers were paid better than you thought.' },

  // ── Ancient artifacts ──
  { id: 'turtle_idol', name: 'Carved Turtle Idol', category: 'artifact', rarity: 'rare', value: 90, icon: 'idol', colors: ['#3fa58c', '#1d5c4c'], stack: 1, displayable: true,
    desc: 'Green stone, worn smooth by hands and tides. The turtle seems to be smiling.' },
  { id: 'clay_whistle', name: 'Clay Bird Whistle', category: 'artifact', rarity: 'uncommon', value: 35, icon: 'whistle', colors: ['#c8744a', '#7a3d22'], stack: 1, displayable: true,
    desc: 'Blow into it and every gull in earshot turns to look.' },
  { id: 'sun_mask', name: 'Sunburst Mask', category: 'artifact', rarity: 'epic', value: 240, icon: 'mask', colors: ['#f4a52a', '#8c2f12'], stack: 1, displayable: true,
    desc: 'Hammered gold with eyes of polished shell. It was not made for a human face.' },

  // ── Pirate history ──
  { id: 'journal_redfinch', name: 'Redfinch’s Journal Page', category: 'history', rarity: 'uncommon', value: 25, icon: 'page', colors: ['#efdcb0', '#7a4a21'], stack: 5,
    desc: '“Day 41. The lighthouse keeper owes me a debt. I have hidden half the chart where only the tide can read it.”' },
  { id: 'tattered_flag', name: 'Tattered Jolly Flag', category: 'history', rarity: 'rare', value: 80, icon: 'flag', colors: ['#1c1c22', '#efe6d2'], stack: 1, displayable: true,
    desc: 'The flag of Captain Redfinch’s Wren. More hole than flag, but unmistakable.' },

  // ── Ocean finds ──
  { id: 'conch', name: 'Queen Conch', category: 'ocean', rarity: 'common', value: 5, icon: 'conch', colors: ['#f6b08a', '#e0607e'], stack: 10,
    desc: 'Hold it to your ear. Yes, it’s the ocean. It’s always the ocean.' },
  { id: 'spiral_shell', name: 'Spiral Shell', category: 'ocean', rarity: 'common', value: 3, icon: 'spiral', colors: ['#f3e0c2', '#a97a4f'], stack: 10,
    desc: 'A tidy little staircase someone used to live in.' },
  { id: 'sand_dollar', name: 'Sand Dollar', category: 'ocean', rarity: 'common', value: 4, icon: 'sanddollar', colors: ['#f2ead8', '#c9b48a'], stack: 10,
    desc: 'Not accepted as currency. You checked.' },
  { id: 'starfish', name: 'Sunset Starfish', category: 'ocean', rarity: 'common', value: 4, icon: 'starfish', colors: ['#ff8a4c', '#c4472a'], stack: 10,
    desc: 'Dried and harmless. Has five arms and zero opinions.' },
  { id: 'sea_glass', name: 'Sea Glass', category: 'ocean', rarity: 'common', value: 3, icon: 'seaglass', colors: ['#7fd8c9', '#2e8b7a'], stack: 10,
    desc: 'A bottle that took fifty years to become a gem.' },
  { id: 'coral_branch', name: 'Fire Coral Branch', category: 'ocean', rarity: 'uncommon', value: 14, icon: 'coral', colors: ['#ff5d5d', '#a3202a'], stack: 10,
    desc: 'Broken off by a storm. Do not touch the living kind.' },

  // ── Shipwreck recovery ──
  { id: 'ship_bell', name: 'Bronze Ship’s Bell', category: 'wreck', rarity: 'uncommon', value: 45, icon: 'bell', colors: ['#c98f3c', '#6b4416'], stack: 1, displayable: true,
    desc: 'Engraved “WREN”. Still rings, if a little sadly.' },
  { id: 'spyglass', name: 'Brass Spyglass', category: 'wreck', rarity: 'rare', value: 85, icon: 'spyglass', colors: ['#d4a64a', '#5a3a1a'], stack: 1, displayable: true,
    desc: 'The lens is cracked, so everything looks like two of itself.' },
  { id: 'sextant', name: 'Navigator’s Sextant', category: 'wreck', rarity: 'rare', value: 95, icon: 'sextant', colors: ['#d4a64a', '#30505e'], stack: 1, displayable: true,
    desc: 'For measuring the angle between the sun and your bad decisions.' },

  // ── Curiosities ──
  { id: 'old_key', name: 'Barnacled Key', category: 'curiosity', rarity: 'uncommon', value: 20, icon: 'key', colors: ['#8a6d3b', '#3f5b4f'], stack: 5,
    desc: 'Opens something, somewhere. Probably not anything nearby. Probably.' },
  { id: 'strange_coin', name: 'Two-Headed Coin', category: 'curiosity', rarity: 'rare', value: 60, icon: 'coin', colors: ['#b9a4ff', '#5a3fa0'], stack: 5,
    desc: 'Both sides show the same face. The face is winking.' },
  { id: 'bottle_letter', name: 'Unsent Letter', category: 'curiosity', rarity: 'common', value: 8, icon: 'bottle', colors: ['#7fc6a4', '#efdcb0'], stack: 5,
    desc: '“Dear Mum, the island is lovely, the parrot is not.”' },

  // ── Materials ──
  { id: 'driftwood', name: 'Driftwood', category: 'resource', rarity: 'common', value: 2, icon: 'plank', colors: ['#b48a5a', '#6e4b2a'], stack: 10,
    desc: 'Sun-bleached timber. The shipwright always wants more.' },
  { id: 'rope', name: 'Salvaged Rope', category: 'resource', rarity: 'common', value: 3, icon: 'rope', colors: ['#d9b77a', '#8a6a35'], stack: 10,
    desc: 'Still strong. Smells strongly of seaweed.' },
  { id: 'iron_nails', name: 'Iron Nails', category: 'resource', rarity: 'common', value: 3, icon: 'nails', colors: ['#7d8691', '#3a4048'], stack: 10,
    desc: 'Rusty, but a shipwright can straighten anything.' },
  { id: 'canvas', name: 'Sailcloth Scrap', category: 'resource', rarity: 'common', value: 4, icon: 'cloth', colors: ['#f1e6cc', '#b8a27a'], stack: 10,
    desc: 'Torn from a sail that saw better days.' },
];

export const ITEM_MAP: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const CATALOG_ITEMS = ITEMS.filter((i) => i.category !== 'resource');

export function item(id: string): ItemDef {
  const d = ITEM_MAP[id];
  if (!d) throw new Error('Unknown item ' + id);
  return d;
}
