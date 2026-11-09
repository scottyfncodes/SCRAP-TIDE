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
  | 'living'
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
// Survivor-paint rarity scale. Green is deliberately absent: in this world green means *alive* (LIVING_GREEN).
export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#a99d80',
  uncommon: '#4f9a95',
  rare: '#d08a34',
  epic: '#c0503a',
  legendary: '#f0c445',
};
/** The one saturated colour in the world: living plants, and only living plants. */
export const LIVING_GREEN = '#57e05f';
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
  living: 'Living Green',
  resource: 'Materials',
};

export const ITEMS: ItemDef[] = [
  // ── Treasure ──
  { id: 'doubloon', name: 'Gold Doubloon', category: 'treasure', rarity: 'common', value: 12, icon: 'coin', colors: ['#f4c542', '#b8860b'], stack: 20,
    desc: 'Heavy, slightly bent, and stamped with a king nobody remembers.' },
  { id: 'silver_piece', name: 'Silver Piece-of-Eight', category: 'treasure', rarity: 'common', value: 6, icon: 'coin', colors: ['#d9dde3', '#8a95a3'], stack: 20,
    desc: 'Cut into eight wedges for making change. Somebody got shortchanged.' },
  { id: 'pearl', name: 'Oil-Stained Pearl', category: 'treasure', rarity: 'uncommon', value: 30, icon: 'pearl', colors: ['#fff6ea', '#e3c9b4'], stack: 10,
    desc: 'Grey-pink and nearly round. The oysters taste of diesel, but they still make these.' },
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
  // the Redfinch Line (design bible PR 2.4)
  { id: 'gannet_bell', name: 'The Gannet’s Bell', category: 'history', rarity: 'epic', value: 140, icon: 'bell', colors: ['#9a7a3c', '#3f2c12'], stack: 1, displayable: true,
    desc: 'Engraved “GANNET”. Bram’s boat, before Rustfang made a gate of her. It rings a note lower than the Wren’s.' },
  { id: 'dace_ledger', name: 'Rustfang Tribute Ledger', category: 'history', rarity: 'rare', value: 60, icon: 'page', colors: ['#d9c79a', '#5c260f'], stack: 1,
    desc: 'Fifteen years of payments from Rig Helios to Rustfang Hold, every one signed “D.” Rig rules: nobody steals. Rustfang excepted.' },
  { id: 'tattered_flag', name: 'Tattered Trawler Flag', category: 'history', rarity: 'rare', value: 80, icon: 'flag', colors: ['#1c1c22', '#efe6d2'], stack: 1, displayable: true,
    desc: 'The flag of the trawler Wren, Captain Redfinch’s salvage boat. More hole than flag, but unmistakable.' },

  // ── Ocean finds ──
  { id: 'conch', name: 'Bleached Conch', category: 'ocean', rarity: 'common', value: 5, icon: 'conch', colors: ['#f6b08a', '#e0607e'], stack: 10,
    desc: 'Hold it to your ear. Yes, it’s the ocean. It’s always the ocean.' },
  { id: 'spiral_shell', name: 'Spiral Shell', category: 'ocean', rarity: 'common', value: 3, icon: 'spiral', colors: ['#f3e0c2', '#a97a4f'], stack: 10,
    desc: 'A tidy little staircase someone used to live in.' },
  { id: 'sand_dollar', name: 'Sand Dollar', category: 'ocean', rarity: 'common', value: 4, icon: 'sanddollar', colors: ['#f2ead8', '#c9b48a'], stack: 10,
    desc: 'Not accepted as currency. You checked.' },
  { id: 'starfish', name: 'Dried Starfish', category: 'ocean', rarity: 'common', value: 4, icon: 'starfish', colors: ['#ff8a4c', '#c4472a'], stack: 10,
    desc: 'Dried and harmless. Has five arms and zero opinions.' },
  { id: 'sea_glass', name: 'Sea Glass', category: 'ocean', rarity: 'common', value: 3, icon: 'seaglass', colors: ['#7fd8c9', '#2e8b7a'], stack: 10,
    desc: 'A bottle that took fifty years to become a gem.' },
  { id: 'coral_branch', name: 'Dead Coral Branch', category: 'ocean', rarity: 'uncommon', value: 14, icon: 'coral', colors: ['#ff5d5d', '#a3202a'], stack: 10,
    desc: 'White as bone. The reefs died with the cities; this is what is left of them.' },

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
  { id: 'street_sign', name: 'Meridian Ave. Sign', category: 'wreck', rarity: 'uncommon', value: 45, icon: 'sign', colors: ['#4e6e5c', '#e6dcc4'], stack: 1, displayable: true,
    desc: 'Pried off a lamppost forty feet underwater. Traffic was lighter than expected.' },
  { id: 'traffic_light', name: 'Traffic Light', category: 'wreck', rarity: 'rare', value: 90, icon: 'light', colors: ['#2b2f36', '#f2b825'], stack: 1, displayable: true,
    desc: 'Stuck on amber forever. Proceed with caution.' },
  { id: 'ship_in_bottle', name: 'Ship in a Bottle', category: 'wreck', rarity: 'epic', value: 180, icon: 'shipbottle', colors: ['#7fc6a4', '#8a5a34'], stack: 1, displayable: true,
    desc: 'From the captain’s cabin of the Meridian Star. A ship, in a bottle, in a ship, in the sea.' },
  { id: 'seed_packet', name: 'Sealed Seed Packet', category: 'living', rarity: 'rare', value: 80, icon: 'seed', colors: ['#e8c46a', '#3fa55a'], stack: 5,
    desc: '“Heirloom Tomato. Plant after last frost.” Frost. Imagine.' },
  { id: 'snow_globe', name: 'Snow Globe', category: 'curiosity', rarity: 'rare', value: 65, icon: 'globe', colors: ['#cff1ff', '#c0392b'], stack: 1, displayable: true,
    desc: 'A tiny city under tiny snow. The city is dry. The snow is the only weather.' },
  { id: 'rubber_duck', name: 'Rubber Duck', category: 'curiosity', rarity: 'common', value: 8, icon: 'duck', colors: ['#f4c542', '#e8742a'], stack: 5, displayable: true,
    desc: 'The only species that thrived.' },

  // ── Living green: the rarest thing in the world is anything still growing ──
  { id: 'algae_mat', name: 'Algae Mat', category: 'living', rarity: 'common', value: 4, icon: 'algae', colors: ['#7a9a3a', '#3f5226'], stack: 10,
    desc: 'Slimy, salty and alive. Pressed and dried it feeds fish, fires and the very poor.' },
  { id: 'sea_lettuce', name: 'Sea-Lettuce Scrap', category: 'living', rarity: 'common', value: 5, icon: 'seaweed', colors: ['#6aa83e', '#2f5a2a'], stack: 10,
    desc: 'A green rag of weed peeled off a drowned wall. People eat it. People are hungry.' },
  { id: 'seedling_tin', name: 'Seedling in a Tin', category: 'living', rarity: 'uncommon', value: 45, icon: 'sprout', colors: ['#57e05f', '#8a8f96'], stack: 5,
    desc: 'Two leaves in a bean can of real soil. Somebody watered this with their own ration.' },
  { id: 'live_moss', name: 'Live Moss', category: 'living', rarity: 'uncommon', value: 35, icon: 'moss', colors: ['#5fbe3c', '#8a5a34'], stack: 5,
    desc: 'A green cushion from the shaded side of the lighthouse. It drinks the fog and keeps it.' },
  { id: 'jar_of_soil', name: 'Jar of Dry Earth', category: 'living', rarity: 'rare', value: 110, icon: 'soiljar', colors: ['#5a3f28', '#cfe2df'], stack: 5,
    desc: 'Real dirt: brown, crumbling, full of tiny living things. Traders weigh it on gold scales.' },
  { id: 'potted_green', name: 'Potted Green', category: 'living', rarity: 'rare', value: 130, icon: 'plant', colors: ['#3fcb45', '#2f6fb0'], stack: 1, displayable: true,
    desc: 'A healthy, leafy plant in a blue bucket. People will stop you on the dock just to look at it.' },
  { id: 'flowering_jar', name: 'Flowers Under Glass', category: 'living', rarity: 'rare', value: 160, icon: 'bloom', colors: ['#f6d343', '#3fcb45'], stack: 1, displayable: true,
    desc: 'Yellow and white blooms in a sealed jar. Nobody born after the Water has smelled a flower outdoors.' },
  { id: 'fruit_vine', name: 'Fruiting Tomato Vine', category: 'living', rarity: 'epic', value: 260, icon: 'fruitvine', colors: ['#d8402e', '#3fcb45'], stack: 1, displayable: true,
    desc: 'Six red tomatoes on a staked vine in an oil drum. Worth a boat. Worth a fight.' },
  { id: 'tree_sapling', name: 'Living Tree Sapling', category: 'living', rarity: 'legendary', value: 650, icon: 'sapling', colors: ['#3fcb45', '#3e8c80'], stack: 1, displayable: true,
    desc: 'A lemon sapling from the last tree on Canopy Rise, caged in wire. Plant it and in ten years you have shade. Nobody has had shade in sixty.' },

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
export const isLiving = (id: string) => ITEM_MAP[id]?.category === 'living';

export function item(id: string): ItemDef {
  const d = ITEM_MAP[id];
  if (!d) throw new Error('Unknown item ' + id);
  return d;
}
