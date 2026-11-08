// Captain's Log help for the "build it" goals (Salvaged Outboard, Scrap Trimaran, Ironwake): what the player still
// needs, shown on the log card, and where the gold marker should point (a salvage site that drops a missing
// material, or Driftholm once everything is in hand). Pure functions over the store and the world data.
import { UPGRADES, VESSELS, type Cost, type VesselId } from '../data/ship';
import { SALVAGE_SITES, type SalvageSiteDef } from '../data/world';
import { item } from '../data/items';

/** Which goals are "build it" goals, and what they build. */
export const GOAL_BUILDS: Record<string, { upgrade?: string; vessel?: VesselId }> = {
  g_engine: { upgrade: 'engine_outboard' },
  g_trimaran: { vessel: 'sloop' },
  g_brig: { vessel: 'brig' },
  g_ironwake: { vessel: 'ironwake' },
};

export interface StoreLike {
  data: { gold: number };
  countOwned(id: string): number;
}

export interface Need {
  id: string; // 'gold' or an item id
  name: string;
  have: number;
  need: number;
}

export function goalCost(goalId: string): Cost | null {
  const b = GOAL_BUILDS[goalId];
  if (!b) return null;
  if (b.upgrade) return UPGRADES.find((u) => u.id === b.upgrade)?.cost ?? null;
  if (b.vessel) return VESSELS[b.vessel].cost ?? null;
  return null;
}

/** Every requirement of the goal's build, with what the player owns (hold + vault). Null for other goals. */
export function goalNeeds(s: StoreLike, goalId: string): Need[] | null {
  const c = goalCost(goalId);
  if (!c) return null;
  const out: Need[] = [{ id: 'gold', name: 'Gold', have: s.data.gold, need: c.gold }];
  for (const m of c.mats ?? []) out.push({ id: m.id, name: item(m.id).name, have: s.countOwned(m.id), need: m.n });
  return out;
}

/** One line for the log card: "Gold 60/90 · Scrap Metal 2/4 · Copper Wire 0/2", or the go-and-build line. */
export function goalProgressText(s: StoreLike, goalId: string): string | null {
  const needs = goalNeeds(s, goalId);
  if (!needs) return null;
  if (needs.every((n) => n.have >= n.need)) return 'Everything’s aboard: dock at Driftholm and see Marlo.';
  return needs.map((n) => `${n.have >= n.need ? '✓ ' : ''}${n.name} ${Math.min(n.have, n.need)}/${n.need}`).join(' · ');
}

/** Item ids still short. Gold isn't an item: selling finds covers it, so it never picks a salvage site. */
export function missingMats(s: StoreLike, goalId: string): string[] {
  return (goalNeeds(s, goalId) ?? []).filter((n) => n.id !== 'gold' && n.have < n.need).map((n) => n.id);
}

/**
 * Where the marker points for a build goal: the nearest ready, reachable salvage site whose loot includes a missing
 * material; Driftholm when nothing is missing (or only gold is). Null when it isn't a build goal or no site fits.
 */
export function goalTarget(
  s: StoreLike,
  goalId: string,
  from: { x: number; z: number },
  home: { x: number; z: number },
  usable: (site: SalvageSiteDef) => boolean,
): { x: number; z: number; site?: string } | null {
  if (!GOAL_BUILDS[goalId]) return null;
  const missing = missingMats(s, goalId);
  if (!missing.length) return { x: home.x, z: home.z };
  let best: SalvageSiteDef | null = null;
  let bd = Infinity;
  for (const site of SALVAGE_SITES) {
    if (!usable(site)) continue;
    const drops = [...site.loot.map((l) => l.id), ...(site.first ?? []).map((f) => f.id)];
    if (!missing.some((m) => drops.includes(m))) continue;
    const d = Math.hypot(site.x - from.x, site.z - from.z);
    if (d < bd) {
      bd = d;
      best = site;
    }
  }
  return best ? { x: best.x, z: best.z, site: best.id } : null;
}
