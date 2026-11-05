// How many loot rolls a salvage haul gets from the winch mini-game (balance pass 1, docs/proposals/balance-pass-1.md).
//
// Every pull landed in the green adds loot: a site with 3 base rolls pays 1 / 2 / 3 / 4 rolls for 0-3 hits
// (previously 1 / 2 / 2 / 4, so the second hit paid nothing). Perfect hauls pay exactly what they did before.
// A Salvager on the crew still adds one roll on top.
export function haulRolls(siteRolls: number, hits: number, salvager = false): number {
  return Math.max(1, Math.round(siteRolls * (0.2 + 0.35 * hits))) + (salvager ? 1 : 0);
}
