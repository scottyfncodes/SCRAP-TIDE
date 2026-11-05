// Contracts, port standing and the Green Choice (design bible PR 2.2).
// Every settlement NPC posts work. Ports remember what you did for them (standing), and grow where you can see it.
// Living plants pose the game's central choice: sell for gold, or plant them where people can eat.
// Conditions are plain data so they can be checked against a save without running the game.
import { CASTAWAYS, SALVAGE_SITES, SEA_MARKS, SETTLEMENT_MAP, ISLAND_MAP } from './world';
import { ITEM_MAP, type Rarity } from './items';

export type ContractKind = 'deliver' | 'salvage' | 'find' | 'rescue' | 'repel';
export type PortId = 'driftholm' | 'hollow' | 'helios';

export interface ContractDef {
  id: string;
  giver: string; // character id (src/data/characters.ts)
  port: PortId;
  kind: ContractKind;
  title: string;
  text: string; // what the giver says
  need: { item?: string; n?: number; site?: string; flag?: string; find?: string; castaway?: string; repel?: number };
  reward: { gold?: number; mats?: { id: string; n: number }[]; cosmetic?: string; standing: number; growth?: string };
  after?: string; // another contract that must be done first
  target?: { x: number; z: number }; // where the work is, for the Captain's Log
}

const site = (id: string) => SALVAGE_SITES.find((s) => s.id === id)!;
const mark = (id: string) => SEA_MARKS.find((m) => m.id === id)!;
const at = (o: { x: number; z: number }) => ({ x: o.x, z: o.z });

export const CONTRACTS: ContractDef[] = [
  // ── Driftholm ──
  { id: 'c_pip_radio', giver: 'pip', port: 'driftholm', kind: 'deliver', title: 'Something that plays',
    text: 'The Sunken Tower coughs up a radio now and then. The Hollow wants music. I want to hear it first.',
    need: { item: 'transistor_radio', n: 1 }, reward: { gold: 70, standing: 1 }, target: at(site('sv_stump')) },
  { id: 'c_pip_photo', giver: 'pip', port: 'driftholm', kind: 'deliver', title: 'A Photograph of Dry Land', after: 'c_pip_radio',
    text: 'Somebody on Meridian Plaza’s roof kept a photograph of dry land. I’ll pay double what it’s worth. Don’t ask me why.',
    need: { item: 'polaroid', n: 1 }, reward: { gold: 150, standing: 2 }, target: at(site('sv_meridian_a')) },
  { id: 'c_pip_boxes', giver: 'pip', port: 'driftholm', kind: 'salvage', title: 'Work the Box Yard',
    text: 'Four boxes floated in on a storm. Haul one up and tell me what the old world shipped in them.',
    need: { site: 'sv_boxyard' }, reward: { gold: 45, standing: 1 }, target: at(site('sv_boxyard')) },
  { id: 'c_marlo_nails', giver: 'marlo', port: 'driftholm', kind: 'deliver', title: 'Nails, not stories',
    text: 'I’m out of nails and patience. Bring me eight. The patience I’ll find myself.',
    need: { item: 'iron_nails', n: 8 }, reward: { gold: 40, mats: [{ id: 'hull_patch', n: 1 }], standing: 1 } },
  { id: 'c_marlo_plate', giver: 'marlo', port: 'driftholm', kind: 'deliver', title: 'Plate for the pier', after: 'c_marlo_nails',
    text: 'The pier’s rotting under the shipwright. Two alloy plates and I’ll patch your hull for nothing, twice.',
    need: { item: 'alloy_plate', n: 2 }, reward: { mats: [{ id: 'hull_patch', n: 2 }], gold: 30, standing: 2 } },
  { id: 'c_wren_bell', giver: 'wren', port: 'driftholm', kind: 'find', title: 'Why the bell stopped',
    text: 'Find the bell west of the Hollow that stopped ringing, and tell me who silenced it.',
    need: { flag: 'found_mark_bell' }, reward: { gold: 40, standing: 1 }, target: at(mark('mark_bell')) },
  { id: 'c_wren_wreck', giver: 'wren', port: 'driftholm', kind: 'find', title: 'The captain’s cabin',
    text: 'The Wren’s cabin is still down there inside the reef. Whatever he kept in it, bring me word of it.',
    need: { find: 'wreck_cabin' }, reward: { gold: 60, standing: 2 }, target: at(ISLAND_MAP.gull) },
  { id: 'c_odessa_red', giver: 'odessa', port: 'driftholm', kind: 'deliver', title: 'Flare-red',
    text: 'Helios crude, boiled down, makes the only red that doesn’t fade out here. Three barrels, darling, and you can fly the Sunburst.',
    need: { item: 'crude_oil', n: 3 }, reward: { cosmetic: 'flag_helios', standing: 1 } },
  // ── Rooftop Hollow ──
  { id: 'c_nori_nails', giver: 'nori', port: 'hollow', kind: 'deliver', title: 'Shore up the stilts',
    text: 'The underfloors are rotting. Eight nails and I can brace the worst of it, and lash a new deck off the dock.',
    need: { item: 'iron_nails', n: 8 }, reward: { gold: 30, standing: 3, growth: 'hollow_deck' }, target: at(site('sv_hollow_sub')) },
  { id: 'c_nori_rope', giver: 'nori', port: 'hollow', kind: 'deliver', title: 'Rope for the lashings',
    text: 'Rope’s the one thing the flood couldn’t make worthless. Six lengths, and the Hollow owes you.',
    need: { item: 'rope', n: 6 }, reward: { gold: 30, standing: 1 } },
  { id: 'c_sal_record', giver: 'sal', port: 'hollow', kind: 'deliver', title: 'Songs for Dry Days',
    text: 'No music on this roof since the generator died. There’s a record called Songs for Dry Days somewhere under us. Find it.',
    need: { item: 'vinyl_record', n: 1 }, reward: { gold: 50, standing: 3, growth: 'hollow_music' }, target: at(site('sv_hollow_sub')) },
  { id: 'c_sal_fish', giver: 'sal', port: 'hollow', kind: 'deliver', title: 'Forty mouths',
    text: 'Forty of us. Six Silverfin buys a day without arguments.',
    need: { item: 'fish', n: 6 }, reward: { gold: 40, standing: 1 } },
  // ── Rig Helios ──
  { id: 'c_dace_fuel', giver: 'dace', port: 'helios', kind: 'deliver', title: 'The Fuel Run',
    text: 'The flare eats crude and the lower deck’s running thin. Six barrels. I pay in plate, not promises.',
    need: { item: 'crude_oil', n: 6 }, reward: { mats: [{ id: 'alloy_plate', n: 2 }], standing: 2 }, target: at(site('sv_rig')) },
  { id: 'c_dace_raider', giver: 'dace', port: 'helios', kind: 'repel', title: 'Rustfang excepted',
    text: 'Rustfang skiffs have been sniffing round my barges. Put a harpoon in one. Then we’ll talk about a second flare.',
    need: { repel: 1 }, reward: { gold: 120, standing: 3, growth: 'helios_flare' }, target: { x: 270, z: 640 } },
  { id: 'c_vik_parts', giver: 'vik', port: 'helios', kind: 'deliver', title: 'Proper parts',
    text: 'Two sets of engine parts. Rebuilt, not salvaged. Yes, I can tell.',
    need: { item: 'engine_parts', n: 2 }, reward: { gold: 90, standing: 1 } },
  { id: 'c_vik_hold', giver: 'vik', port: 'helios', kind: 'find', title: 'Count their skiffs',
    text: 'Sail past Rustfang Hold and come back with a number. I sell harpoons. I like to know how many.',
    need: { flag: 'seen_hold' }, reward: { gold: 60, standing: 1 }, target: { x: 350, z: 625 } },
  { id: 'c_vik_bram', giver: 'vik', port: 'helios', kind: 'rescue', title: 'The man on the lamppost',
    text: 'Someone’s been shouting from a raft in Old Meridian for a week. Bad for business. Fetch him.',
    need: { castaway: 'cw_bram' }, reward: { gold: 50, standing: 2 }, target: at(CASTAWAYS.find((c) => c.id === 'cw_bram')!) },
];
export const CONTRACT_MAP: Record<string, ContractDef> = Object.fromEntries(CONTRACTS.map((c) => [c.id, c]));

// ───────── state ─────────
export interface ActiveContract { id: string; at: number; base: number } // accepted at (sea clock), raiders repelled then
export interface ContractState {
  contracts: { active: ActiveContract[]; done: string[] };
  standing: Partial<Record<PortId, number>>;
  garden: Partial<Record<PortId, number>>;
  flags: string[];
  findsOpened: string[];
  castaways: string[];
  salvaged: Record<string, number>;
  raidersRepelled: number;
}
export interface Holdings { countOwned(id: string): number }

export const MAX_ACTIVE = 3;

/** Contracts a port's board shows: not done, not already taken, prerequisites met. */
export function boardFor(port: string, d: ContractState): ContractDef[] {
  return CONTRACTS.filter((c) => c.port === port && !d.contracts.done.includes(c.id) && !d.contracts.active.some((a) => a.id === c.id) &&
    (!c.after || d.contracts.done.includes(c.after)));
}

/** Is an accepted contract's work done (for deliveries: are the goods aboard or in the vault)? */
export function contractReady(c: ContractDef, a: ActiveContract, d: ContractState, h: Holdings): boolean {
  const n = c.need;
  switch (c.kind) {
    case 'deliver': return h.countOwned(n.item!) >= (n.n ?? 1);
    case 'salvage': return (d.salvaged[n.site!] ?? -Infinity) > a.at;
    case 'find': return (!!n.flag && d.flags.includes(n.flag)) || (!!n.find && d.findsOpened.includes(n.find));
    case 'rescue': return d.castaways.includes(n.castaway!);
    case 'repel': return d.raidersRepelled - a.base >= (n.repel ?? 1);
  }
}

/** One line on progress, for the board and the Log. */
export function contractProgress(c: ContractDef, a: ActiveContract, d: ContractState, h: Holdings): string {
  if (contractReady(c, a, d, h)) return `Done: report to ${SETTLEMENT_MAP[c.port].name}`;
  if (c.kind === 'deliver') return `${Math.min(h.countOwned(c.need.item!), c.need.n ?? 1)}/${c.need.n ?? 1} ${ITEM_MAP[c.need.item!].name}`;
  if (c.kind === 'repel') return `${Math.max(0, d.raidersRepelled - a.base)}/${c.need.repel} raiders driven off`;
  return 'Not yet';
}

// ───────── standing: what a port thinks of you ─────────
export const STANDING_RANKS = [
  { min: 0, name: 'Stranger', perk: '' },
  { min: 2, name: 'Known', perk: 'People here greet you by name.' },
  { min: 5, name: 'Trusted', perk: '10% off parts, fuel and repairs here.' },
  { min: 9, name: 'Kin', perk: '20% off parts, fuel and repairs here.' },
] as const;

export function standingRank(n: number) {
  let r: (typeof STANDING_RANKS)[number] = STANDING_RANKS[0];
  for (const s of STANDING_RANKS) if (n >= s.min) r = s;
  return r;
}

/** Price multiplier at a port for parts, fuel and repairs. */
export function portDiscount(n: number) {
  return n >= 9 ? 0.8 : n >= 5 ? 0.9 : 1;
}

// ───────── the Green Choice ─────────
/** Garden points a planted living thing is worth, by rarity. */
export const GARDEN_POINTS: Record<Rarity, number> = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 6 };
/** Ports with somewhere to plant: Driftholm's hill and the Hollow's roof. */
export const GARDENS: { port: PortId; name: string; where: string }[] = [
  { port: 'driftholm', name: 'The Pier Garden', where: 'a raft of planters off Driftholm’s pier' },
  { port: 'hollow', name: 'The Roof Garden', where: 'the roof of Rooftop Hollow, among the forty' },
];
export const GARDEN_STAGES = [2, 6, 12]; // points for stage 1, 2, 3

export function gardenStage(points: number) {
  return GARDEN_STAGES.filter((t) => points >= t).length;
}

/** Fresh food from the gardens: +25% fishing and at-sea repairs per garden stage, across both gardens. */
export function freshFood(d: { garden: Partial<Record<PortId, number>> }) {
  const stages = GARDENS.reduce((a, g) => a + gardenStage(d.garden[g.port] ?? 0), 0);
  return 1 + stages * 0.25;
}
