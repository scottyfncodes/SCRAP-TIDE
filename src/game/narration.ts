// Old Wren on the radio: the voice that tells a new captain what this world is and how to work a boat in it.
//
// Before this pass the game explained itself in one opening card, a quest chip and toasts, and only the dockhand and
// the crew ever spoke. Now Wren, who sends you on the First Voyage, talks you through it: a short prologue, one line
// per step of the voyage (each one an instruction in her voice), and a line the first time each system shows up
// (wind, the winch, a full hold, a holed hull, fuel, night, storms, raiders, the Reach, crew, anything green). Every
// line is voiced (Kokoro, creative/audio/voice) and captioned with her portrait, so it works with the sound off.
// One line at a time, never over another character's voice; first-time lines are remembered in the save's flags.
// Settings → "Wren's radio guide" turns the whole thing off.
import type { Game } from './game';
import { pack, VOICE_LINES, type VoiceId } from '../audio/pack';
import { isLiving } from '../data/items';

/** The line for arriving at each step of the First Voyage. */
export const STEP_LINES: Record<string, VoiceId> = {
  leave_dock: 'wren_steer',
  first_haul: 'wren_tower',
  bank_haul: 'wren_bank',
  upgrade: 'wren_refit',
  reach_turtle: 'wren_turtle',
  ashore: 'wren_anchor',
  find_bottle: 'wren_walk',
  dig_x: 'wren_map',
  return_harbor: 'wren_home',
  free: 'wren_log',
};

/** What the narrator reads from the game each frame (the game owns these; several are private there). */
export interface NarrState {
  luff: number;
  region: string;
  night: number;
  storm: number;
  danger: number;
  winch: boolean;
  engine: boolean;
}

/** How long a caption stays up with no voice to time it by (sound off): reading time for its length. */
export const readTime = (text: string) => Math.min(9, 2 + text.length * 0.055);

export const SPEAKERS: Record<string, { name: string; tag: string; portrait: 'wren' }> = {
  wren: { name: 'Old Wren', tag: 'on the radio', portrait: 'wren' },
};

export class Narrator {
  private queue: { id: VoiceId; at: number }[] = [];
  private t = typeof performance === 'undefined' ? 0 : performance.now() / 1000;
  private until = 0;
  private waiting = false;
  private quest: string | null = null;
  private poll = 0;
  private luffT = 0;
  private begun = false;

  constructor(private g: Game) {}

  get on() {
    return this.g.store.data.settings.narration !== false;
  }

  /** Queue a line (after `delay` seconds). A line already waiting isn't queued twice. */
  say(id: VoiceId, delay = 0) {
    if (!this.on || this.queue.some((q) => q.id === id)) return;
    this.queue.push({ id, at: this.t + delay });
  }

  /** Queue a line the first time only (remembered in the save). */
  once(id: VoiceId, delay = 0) {
    const flags = this.g.store.data.flags, key = `n_${id}`;
    if (!this.on || flags.includes(key)) return;
    flags.push(key);
    this.say(id, delay);
  }

  /** Play starts: the prologue on a new game; otherwise a word on where you left off. */
  begin(isNew: boolean) {
    if (this.begun) return;
    this.begun = true;
    const s = this.g.store.data;
    this.quest = s.quest;
    // a save from before Wren had a radio: don't lecture a veteran on what they already do every day
    if (!isNew && !s.flags.includes('n_seeded')) {
      const st = this.g.store.stats, vet = s.quest === 'free';
      const known: [VoiceId, boolean][] = [
        ['wren_engine', st.engine > 0], ['wren_fuel', st.engine > 0 && vet], ['wren_crew', s.crew.length > 0], ['wren_trimaran', s.vessel !== 'dinghy'],
        ['wren_green', Object.keys(s.discoveries).some(isLiving)], ['wren_winch', s.hauls > 0], ['wren_wind', vet], ['wren_hold', vet], ['wren_hull', vet],
        ['wren_night', vet], ['wren_storm', vet], ['wren_raiders', s.flags.includes('met_raiders')], ['wren_reach', s.regionsSeen.includes('emerald')], ['wren_wall', s.regionsSeen.includes('stormwall')],
      ];
      for (const [id, k] of known) if (k && !s.flags.includes(`n_${id}`)) s.flags.push(`n_${id}`);
    }
    if (!s.flags.includes('n_seeded')) s.flags.push('n_seeded');
    if (isNew) {
      this.once('wren_intro', 0.6);
      this.once('wren_intro2', 0.7);
      this.once('wren_steer', 0.8);
    } else if (s.quest !== 'free' && STEP_LINES[s.quest]) this.say(STEP_LINES[s.quest], 2.5);
    else this.say('wren_back', 2.5);
  }

  update(dt: number, n: NarrState) {
    // wall-clock, not game time: the voice plays in real seconds whatever the frame rate (or a hit-stop) does
    this.t = performance.now() / 1000;
    const g = this.g, s = g.store.data;
    if (!this.begun || !this.on) {
      if (!this.on) this.queue.length = 0;
      return;
    }
    // a new step of the First Voyage
    if (s.quest !== this.quest) {
      this.quest = s.quest;
      const line = STEP_LINES[s.quest];
      if (line) this.once(line, 1.4);
    }
    // first sight of each system (checked twice a second)
    this.luffT = n.luff > 0.5 && g.mode === 'sail' && !g.boat.docked && !g.boat.anchored ? this.luffT + dt : 0;
    this.poll -= dt;
    if (this.poll <= 0) {
      this.poll = 0.5;
      const st = g.store.stats, sea = g.mode === 'sail' && !g.boat.docked;
      if (this.luffT > 1.5) this.once('wren_wind');
      if (n.winch) this.once('wren_winch', 0.3);
      if (sea && g.store.slotsUsed() >= st.cargo && s.quest !== 'bank_haul') this.once('wren_hold');
      if (s.hull < st.hullMax * 0.5) this.once('wren_hull');
      if (st.engine > 0) this.once('wren_engine', 1.5);
      if (st.engine > 0 && n.engine && s.fuel < st.fuelCap * 0.25) this.once('wren_fuel');
      if (sea && n.night > 0.6) this.once('wren_night');
      if (sea && n.storm > 0.5) this.once('wren_storm');
      if (n.danger > 0 || g.raiderRun?.active) this.once('wren_raiders', 3.2);
      if (n.region === 'emerald') this.once('wren_reach', 2);
      if (n.region === 'stormwall') this.once('wren_wall', 2);
      if (s.crew.length) this.once('wren_crew', 6);
      if (s.vessel === 'sloop') this.once('wren_trimaran', 3);
      if (Object.keys(s.discoveries).some(isLiving)) this.once('wren_green', 4);
    }
    // one line at a time: wait out the last caption and anyone else who is talking
    if (this.waiting || this.t < this.until || pack.busy) return;
    const i = this.queue.findIndex((q) => q.at <= this.t);
    if (i < 0) return;
    const { id } = this.queue.splice(i, 1)[0];
    const text = VOICE_LINES[id];
    const who = SPEAKERS[id.split('_')[0]] ?? SPEAKERS.wren;
    this.waiting = true;
    // the caption never waits on the audio: if the voice file is slow to arrive or decode, the words go up anyway
    let shown = false;
    const show = (secs: number) => {
      if (shown) return;
      shown = true;
      const life = secs > 0 ? secs + 0.7 : readTime(text);
      this.until = performance.now() / 1000 + life + 0.5;
      this.waiting = false;
      g.ui.caption(who, text, life);
    };
    pack.speak(id).then(show, () => show(0));
    setTimeout(() => show(0), 1800);
  }
}
