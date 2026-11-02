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
  treasure: 'Valuables',
  artifact: 'Relics of the Before',
  history: 'Old World Records',
  ocean: 'Ocean Finds',
  wreck: 'Salvage Recovery',
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

  // ── Old world records ──
  { id: 'journal_redfinch', name: 'Redfinch’s Journal Page', category: 'history', rarity: 'uncommon', value: 25, icon: 'page', colors: ['#efdcb0', '#7a4a21'], stack: 5,
    desc: '“Day 41. The lighthouse keeper owes me a debt. I have hidden half the chart where only the tide can read it.”' },
  { id: 'tattered_flag', name: 'Tattered Jolly Flag', category: 'history', rarity: 'rare', value: 80, icon: 'flag', colors: ['#1c1c22', '#efe6d2'], stack: 1, displayable: true,
    desc: 'The flag of the trawler Wren, Captain Redfinch’s salvage boat. More hole than flag, but unmistakable.' },

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


  // ── The drowned world (Waterworld expansion) ──
  { id: 'gold_watch', name: 'Stopped Gold Watch', category: 'treasure', rarity: 'uncommon', value: 55, icon: 'watch', colors: ['#f4c542', '#3a4148'], stack: 5,
    desc: 'Stopped at 4:17. Everybody’s watch stopped at 4:17, the day the sea came in.' },
  { id: 'diamond_ring', name: 'Engagement Diamond', category: 'treasure', rarity: 'rare', value: 120, icon: 'diamond', colors: ['#e9fbf6', '#f4c542'], stack: 5,
    desc: 'Someone said yes. The sea said no.' },
  { id: 'summit_chart', name: 'Chart of the Last Summit', category: 'artifact', rarity: 'legendary', value: 500, icon: 'chart', colors: ['#efdcb0', '#c0392b'], stack: 1, displayable: true,
    desc: 'Pinned under glass at the top of the Meridian Spire: a chart to a mountain that might still be dry.' },
  { id: 'vinyl_record', name: '“Songs for Dry Days” LP', category: 'history', rarity: 'uncommon', value: 35, icon: 'record', colors: ['#1c1c22', '#e0607e'], stack: 5, displayable: true,
    desc: 'Warped into a gentle saddle. Track four is about rain. Nobody laughs at it any more.' },
  { id: 'polaroid', name: 'Photograph of Dry Land', category: 'history', rarity: 'rare', value: 70, icon: 'photo', colors: ['#f6ead0', '#3fa55a'], stack: 5,
    desc: 'A family on grass. Actual grass, all the way to the edge of the picture.' },
  { id: 'rig_badge', name: 'Helios Crew Badge', category: 'history', rarity: 'uncommon', value: 30, icon: 'badge', colors: ['#f2b825', '#c8352a'], stack: 5,
    desc: '“HELIOS PRODUCTION · 2,000 DAYS WITHOUT INCIDENT.” The counter stopped.' },
  { id: 'transistor_radio', name: 'Transistor Radio', category: 'wreck', rarity: 'uncommon', value: 40, icon: 'radio', colors: ['#c8744a', '#3a4148'], stack: 1, displayable: true,
    desc: 'Dry it out, give it a battery, and it hisses. Some nights the hiss sounds like a voice.' },
  { id: 'street_sign', name: 'Meridian Ave. Sign', category: 'wreck', rarity: 'uncommon', value: 45, icon: 'sign', colors: ['#3fa55a', '#f6ead0'], stack: 1, displayable: true,
    desc: 'Pried off a lamppost forty feet underwater. Traffic was lighter than expected.' },
  { id: 'traffic_light', name: 'Traffic Light', category: 'wreck', rarity: 'rare', value: 90, icon: 'light', colors: ['#2b2f36', '#f2b825'], stack: 1, displayable: true,
    desc: 'Stuck on amber forever. Proceed with caution.' },
  { id: 'ship_in_bottle', name: 'Ship in a Bottle', category: 'wreck', rarity: 'epic', value: 180, icon: 'shipbottle', colors: ['#7fc6a4', '#8a5a34'], stack: 1, displayable: true,
    desc: 'From the captain’s cabin of the Meridian Star. A ship, in a bottle, in a ship, in the sea.' },
  { id: 'seed_packet', name: 'Sealed Seed Packet', category: 'curiosity', rarity: 'rare', value: 80, icon: 'seed', colors: ['#e8c46a', '#3fa55a'], stack: 5,
    desc: '“Heirloom Tomato. Plant after last frost.” Frost. Imagine.' },
  { id: 'snow_globe', name: 'Snow Globe', category: 'curiosity', rarity: 'rare', value: 65, icon: 'globe', colors: ['#cff1ff', '#c0392b'], stack: 1, displayable: true,
    desc: 'A tiny city under tiny snow. The city is dry. The snow is the only weather.' },
  { id: 'rubber_duck', name: 'Rubber Duck', category: 'curiosity', rarity: 'common', value: 8, icon: 'duck', colors: ['#f4c542', '#e8742a'], stack: 5, displayable: true,
    desc: 'The only species that thrived.' },

  // ── Materials ──
  { id: 'driftwood', name: 'Driftwood', category: 'resource', rarity: 'common', value: 2, icon: 'plank', colors: ['#b48a5a', '#6e4b2a'], stack: 10,
    desc: 'Sun-bleached timber. The shipwright always wants more.' },
  { id: 'rope', name: 'Salvaged Rope', category: 'resource', rarity: 'common', value: 3, icon: 'rope', colors: ['#d9b77a', '#8a6a35'], stack: 10,
    desc: 'Still strong. Smells strongly of seaweed.' },
  { id: 'iron_nails', name: 'Iron Nails', category: 'resource', rarity: 'common', value: 3, icon: 'nails', colors: ['#7d8691', '#3a4048'], stack: 10,
    desc: 'Rusty, but a shipwright can straighten anything.' },
  { id: 'canvas', name: 'Sailcloth Scrap', category: 'resource', rarity: 'common', value: 4, icon: 'cloth', colors: ['#f1e6cc', '#b8a27a'], stack: 10,
    desc: 'Torn from a sail that saw better days.' },
  { id: 'scrap_metal', name: 'Scrap Metal', category: 'resource', rarity: 'common', value: 4, icon: 'scrap', colors: ['#8a8f96', '#a24b21'], stack: 10,
    desc: 'Rusty plate, bent rebar, a hubcap. Everything floating is a part of something.' },
  { id: 'wire', name: 'Copper Wire', category: 'resource', rarity: 'common', value: 5, icon: 'wire', colors: ['#d2702f', '#3a4148'], stack: 10,
    desc: 'Stripped from drowned walls. Mechanics pay well for it.' },
  { id: 'plastic', name: 'Salvaged Plastic', category: 'resource', rarity: 'common', value: 3, icon: 'plastic', colors: ['#2f6fb0', '#e8742a'], stack: 10,
    desc: 'It will outlive us all. Might as well make it useful.' },
  { id: 'electronics', name: 'Circuit Boards', category: 'resource', rarity: 'uncommon', value: 9, icon: 'chip', colors: ['#3e8c80', '#f2b825'], stack: 10,
    desc: 'Green boards, gold traces. Radar won’t build itself.' },
  { id: 'crude_oil', name: 'Crude Oil', category: 'resource', rarity: 'common', value: 6, icon: 'oil', colors: ['#1c1c22', '#6b2e14'], stack: 10,
    desc: 'Black, thick and precious. Refine it on a workbench into fuel.' },
  { id: 'fuel_can', name: 'Fuel Can', category: 'resource', rarity: 'common', value: 10, icon: 'fuel', colors: ['#c8352a', '#f2b825'], stack: 5,
    desc: 'Twenty units of go. Use it from the Ship screen to fill your tank.' },
  { id: 'engine_parts', name: 'Engine Parts', category: 'resource', rarity: 'uncommon', value: 25, icon: 'gear', colors: ['#7f8a94', '#3a4148'], stack: 5,
    desc: 'Pistons, gaskets, a carburettor that still smells of petrol.' },
  { id: 'alloy_plate', name: 'Alloy Plate', category: 'resource', rarity: 'uncommon', value: 20, icon: 'plate', colors: ['#9aa9b4', '#3a4148'], stack: 5,
    desc: 'Hammered and riveted scrap. Hulls, armour and pride.' },
  { id: 'hull_patch', name: 'Hull Patch Kit', category: 'resource', rarity: 'common', value: 12, icon: 'patch', colors: ['#c9a97a', '#2f6fb0'], stack: 5,
    desc: 'Plank, plastic and pitch. Repairs 35 hull from the Ship screen.' },
  { id: 'fish', name: 'Silverfin', category: 'resource', rarity: 'common', value: 6, icon: 'fish', colors: ['#9ec5e8', '#2e5872'], stack: 10,
    desc: 'Caught by your Fisher. Everyone in every settlement will buy fish.' },
];

export const ITEM_MAP: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const CATALOG_ITEMS = ITEMS.filter((i) => i.category !== 'resource');

export function item(id: string): ItemDef {
  const d = ITEM_MAP[id];
  if (!d) throw new Error('Unknown item ' + id);
  return d;
}
