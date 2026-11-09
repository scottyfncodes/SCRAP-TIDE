// How many loot rolls a salvage haul gets from the winch mini-game (balance pass 1, docs/proposals/balance-pass-1.md).
//
// Every pull landed in the green adds loot: a site with 3 base rolls pays 1 / 2 / 3 / 4 rolls for 0-3 hits
// (previously 1 / 2 / 2 / 4, so the second hit paid nothing). Perfect hauls pay exactly what they did before.
// A Salvager on the crew still adds one roll on top.
export function haulRolls(siteRolls: number, hits: number, salvager = false): number {
  return Math.max(1, Math.round(siteRolls * (0.2 + 0.35 * hits))) + (salvager ? 1 : 0);
}

/**
 * Bonus loot rolls for pulls landed dead centre (the gold "perfect" strip inside the green, loop pass Phase 1):
 * one for the first perfect, a second for two or more. A miss never takes anything away.
 */
export function perfectBonus(perfects: number): number {
  return Math.max(0, Math.min(2, perfects | 0));
}

/** Width of the perfect strip as a share of the green window, and whether a needle position hits it. */
export const PERFECT_SHARE = 0.34;
export function pullGrade(pos: number, zoneLeft: number, window: number, share = PERFECT_SHARE): 'perfect' | 'hit' | 'miss' {
  if (pos < zoneLeft || pos > zoneLeft + window) return 'miss';
  const mid = zoneLeft + window / 2;
  return Math.abs(pos - mid) <= (window * share) / 2 ? 'perfect' : 'hit';
}
