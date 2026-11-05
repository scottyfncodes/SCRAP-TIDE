// The sea clock (balance pass 1, #1, docs/proposals/balance-pass-1.md): the time salvage sites respawn on.
//
// While the game is open it advances only with the browser's monotonic clock (performance.now), which changing the
// phone's clock cannot touch, so a clock change mid-session does nothing. Between sessions (a reload or relaunch:
// a new page) the time away is taken from the device clock, forwards only and at most OFFLINE_CAP_MS: setting the
// clock back can no longer lock sites, and setting it forward credits at most the cap.
//
// A browser has no trusted clock across a relaunch, so a forward clock change followed by quitting and reopening the
// app still credits up to the cap. With today's respawns (4-15 min) that equals simply having been away that long.

/** Most device-clock time credited between two sessions. */
export const OFFLINE_CAP_MS = 2 * 60 * 60 * 1000;

/**
 * How far the sea clock moves for one sync.
 * @param perfDelta monotonic ms since the last sync in this session
 * @param wallDelta device-clock ms since the last sync (anything: the user can set the clock)
 * @param inSession false for the first sync after loading a save (the gap between sessions)
 */
export function seaAdvance(perfDelta: number, wallDelta: number, inSession: boolean, cap = OFFLINE_CAP_MS): number {
  if (inSession) return Math.max(0, perfDelta);
  return Math.min(Math.max(0, wallDelta), cap);
}
