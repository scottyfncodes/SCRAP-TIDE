// Upwind sailing, Option A (balance pass 1, #5): feel, not speed. The boat sails exactly as before (`windEff` is the
// unchanged speed curve, moved here so it can be tested); what's new is that pointing too close to the wind now *looks*
// and *sounds* wrong: the sails luff, the HUD's wind dial shows the no-go wedge, and the crew say so.
// Everything here is pure (no DOM, no three.js, no randomness) so it is unit-tested and can't disturb the simulation.
import { angleDiff } from '../core/noise';
import { CREW_MAP, type CrewRole } from '../data/crew';

const DEG = Math.PI / 180;

/** Half-width of the no-go cone either side of dead upwind: inside it the sails luff. */
export const NO_GO = 30 * DEG;
/** At or inside this the luff is total; between here and NO_GO it eases out. */
export const LUFF_FULL = 12 * DEG;

/**
 * Sail speed multiplier for a heading. UNCHANGED from the original `Game.windEff`: 1.0 on a beam reach, 0.9 dead
 * downwind, 0.45 dead upwind. `windDir` is the direction the wind blows *toward*.
 */
export function windEff(heading: number, windDir: number) {
  const c = Math.cos(angleDiff(heading, windDir));
  return c >= 0 ? 1 - 0.1 * c : 1 - 0.55 * -c;
}

/** How far the bow is off dead upwind, in radians: 0 = straight into the wind, π = dead downwind. */
export function offWind(heading: number, windDir: number) {
  return Math.abs(angleDiff(heading, windDir + Math.PI));
}

/** How hard the sails luff (0..1) at an angle off the wind: 1 inside LUFF_FULL, easing to 0 at NO_GO. */
export function luffAmount(off: number) {
  if (off >= NO_GO) return 0;
  if (off <= LUFF_FULL) return 1;
  const u = (NO_GO - off) / (NO_GO - LUFF_FULL);
  return u * u * (3 - 2 * u);
}

export type PointOfSail = 'luffing' | 'close' | 'beam' | 'broad' | 'run';

/** The point of sail for an angle off the wind (the bands sailors use; the no-go edge is NO_GO). */
export function pointOfSail(off: number): PointOfSail {
  if (off < NO_GO) return 'luffing';
  if (off < 60 * DEG) return 'close';
  if (off < 120 * DEG) return 'beam';
  if (off < 150 * DEG) return 'broad';
  return 'run';
}

/** HUD label and colour class under the speed readout for each point of sail. */
export const SAIL_LABEL: Record<PointOfSail, { label: string; cls: string }> = {
  luffing: { label: 'luffing', cls: 'luff' },
  close: { label: 'close-hauled', cls: 'bad' },
  beam: { label: 'beam reach', cls: 'good' },
  broad: { label: 'broad reach', cls: 'good' },
  run: { label: 'running', cls: '' },
};

/**
 * Which way to steer to bear away (turn the bow off the wind), as the player sees it on the wheel. A larger heading
 * turns the bow to the left of the chase camera (the wheel maps screen-right to a smaller heading), so a bow that sits
 * at a larger heading than dead upwind falls off by turning further left.
 */
export function bearAwaySide(heading: number, windDir: number): 'left' | 'right' {
  return angleDiff(windDir + Math.PI, heading) >= 0 ? 'left' : 'right';
}

/** Who speaks up about a luffing sail: the crew member whose job it most is, if anyone is aboard. */
const SPEAKER_ORDER: CrewRole[] = ['navigator', 'lookout', 'salvager', 'mechanic', 'fisher', 'defender'];

/** What each of them says. One voice per character, matching their recruit pitch. */
const LUFF_LINES: Record<string, { luff: string; ok: string }> = {
  mara: { luff: 'You’re pinching, Captain. Bear away {side} and she’ll fill.', ok: 'There. She’s drawing.' },
  kai: { luff: 'Sail’s flogging! Wind’s right on the nose. Fall off {side}!', ok: 'Better. I can hear her pulling.' },
  bram: { luff: 'She’s luffing. Nobody sails straight into it. Ease off {side}.', ok: 'That’s it. Full sail.' },
  juno: { luff: 'Hear that flapping? That’s the wind laughing at us. Turn {side}, off it.', ok: 'Quiet canvas. I like quiet canvas.' },
  tomas: { luff: 'Forty years I’ve watched folk sail into the wind. Bear off {side}, Captain.', ok: 'Aye. That’s how she likes it.' },
  ines: { luff: 'Too close to the wind. Bear away {side} and she’ll draw.', ok: 'Good. Now we’re moving.' },
};

export interface CrewLine {
  /** Who is speaking (crew id), or null when no crew is aboard and it's the sail itself telling you. */
  speaker: string | null;
  text: string;
  color: string;
}

/** The crew aboard who would speak up, by role priority (first match wins). */
export function luffSpeaker(crew: string[]): string | null {
  for (const role of SPEAKER_ORDER) {
    const id = crew.find((c) => CREW_MAP[c]?.role === role && LUFF_LINES[c]);
    if (id) return id;
  }
  return null;
}

/**
 * The line shown when the sail has luffed for a while. `first` (once per session) adds how to read the WIND dial.
 * `side` is from bearAwaySide.
 */
export function luffLine(crew: string[], side: 'left' | 'right', first: boolean): CrewLine {
  const id = luffSpeaker(crew);
  const dial = 'Keep your bow out of the red wedge on the wind dial.';
  if (!id) {
    return {
      speaker: null,
      text: first
        ? `The sail is luffing: you’re pointing too close to the wind. Steer a little ${side}, until your bow is out of the red wedge on the wind dial.`
        : `Sail’s luffing. Too close to the wind: steer a little ${side}.`,
      color: '#e08a5a',
    };
  }
  const def = CREW_MAP[id];
  const said = LUFF_LINES[id].luff.replace('{side}', `to the ${side}`);
  return { speaker: id, text: `<b>${def.name.split(' ')[0]}:</b> “${said}”${first ? ` ${dial}` : ''}`, color: '#e08a5a' };
}

/** The line once the sail fills again after a luff warning. */
export function drawingLine(crew: string[]): CrewLine {
  const id = luffSpeaker(crew);
  if (!id) return { speaker: null, text: 'The sail fills and draws again.', color: '#c9a25a' };
  return { speaker: id, text: `<b>${CREW_MAP[id].name.split(' ')[0]}:</b> “${LUFF_LINES[id].ok}”`, color: '#c9a25a' };
}

/** Seconds the sail must luff, under sail, before anyone says anything (a quick swing through the wind is fine). */
export const LUFF_WARN_AFTER = 2.5;
/** Seconds before the same warning can repeat. */
export const LUFF_WARN_COOLDOWN = 40;
