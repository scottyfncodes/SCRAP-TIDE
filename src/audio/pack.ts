// The file-based layer of the soundscape (GITCRAFT AudioCraft, see creative/audio/): voice lines, the adaptive
// drowned-world theme, stingers and impact layers. Everything procedural stays in audio.ts; this only adds what synthesis
// does badly. Files are lazy-loaded after the first tap (nothing at boot), decoded once and cached, and play through the
// existing buses, so the SFX and MUSIC sliders still apply. OGG Vorbis where the browser takes it, AAC (.m4a) on iPhone
// Safari. If a file can't load, the caller's synthesized sound has already played, so nothing is lost.
import { audio } from './audio';

const BASE = `${import.meta.env.BASE_URL}audio/`;

/** One consistent voice per character (Kokoro-82M voices, see creative/audio/voice/tb_vo.dialogue.json). */
export const VOICE_LINES = {
  dockhand_hail: 'Driftholm. Tie off, and keep your hands where I can see them.',
  dockhand_return: 'Still floating, then. Unload before it rots.',
  dockhand_reach: "Past the swell there's a whole city under you. Mind the raiders. They mind nobody.",
  dockhand_stormwall: 'Nobody comes back from the Stormwall, Captain. Not in a boat like that.',
  kai_joined: 'Eleven days on that raft. I saw you coming from six miles out.',
  kai_storm: 'Storm ahead, Captain. Go round, or brace.',
  kai_raiders: 'Rustfang runners! Coming in hard!',
  kai_green: 'Is that… green? Captain, that thing is alive.',
  tomas_joined: "Forty years on that roof. Take me where the fish haven't heard of me.",
  tomas_catch: 'Silverfin on the line. We eat tonight.',
  ines_joined: "Show me a harpoon, and I'll show you a quiet voyage.",
  ines_raiders: "Hold the wheel steady. I've got the ugly one.",
  ines_hit: 'Hooked. Let them swim home and tell the others.',
  bram_joined: 'Rustfang took my boat. I know where they keep the good stuff.',
  bram_salvage: 'Easy… easy. There. The sea gave something back.',
  bram_story: 'Somebody lived down there once. Kept this safe, right till the water came.',
  juno_joined: "You can't keep an outboard alive? Lucky for you, I can.",
  juno_upgrade: "Bolted, patched and prayed over. She'll hold.",
  juno_hull: "She's taking water! Give me two minutes and a hammer!",
  raider_threat: 'Cut your engine, and hand over the hold!',
  raider_taunt: "Nice boat. It's ours now.",
  raider_flee: "Fall back! They've got a harpoon!",
  // ── Old Wren on the radio (game/narration.ts): the world, and how to work a boat in it ──
  wren_intro: "The sea rose, and it never went back. The cities are under your keel now. What's left of us lives on what floats.",
  wren_intro2: "I'm Wren. I draw the charts here in Driftholm. Take the radio, Captain. I'll be in your ear until you stop needing me.",
  wren_steer: "Thumb on the wheel, and drag it toward where you want to go. She'll come round. The gold arrow points at your next job.",
  wren_tower: 'That tower was offices, once. Slow down beside the buoy, and tap Salvage.',
  wren_winch: 'Watch the needle. Reel in when it crosses the green. Catch the gold centre, and the sea gives a little extra.',
  wren_bank: "Good. Now, nothing you haul is yours until it's on the dock. Come home and tie up.",
  wren_refit: "Sell what you don't need to Pip. Then see Marlo. Every part he fits, you'll see it on the boat.",
  wren_turtle: "Now, the errand. A bottle washed up on Turtle Atoll, to the west. Follow the gold arrow. Don't read what's inside.",
  wren_anchor: 'Shallow water. Let go of the wheel, drop the anchor, and go ashore.',
  wren_walk: 'Same thumb, same wheel. It moves your feet now. Walk the beach, and look for the glint.',
  wren_map: 'You read it. Good. The landmarks on that map are real. Stand where it says, and dig.',
  wren_home: 'Bring it home, Captain. And watch the sky. Squalls come up fast out here.',
  wren_log: "That's your first voyage done. From here, the Captain's Log tells you what's next. Salvage. Refit. Push further out.",
  wren_wind: "Feel her slow down? You're pointing into the wind. Turn away a little, and the sail fills again.",
  wren_hold: 'Your hold is full. Take it home and bank it, before the sea takes it back.',
  wren_hull: "She's taking water. Patch her from the Ship screen, or limp home to Marlo.",
  wren_engine: "An engine. Tap the engine button to run it. It's fast, and it's thirsty.",
  wren_fuel: "Fuel's low. Sail when the wind lets you. Save the engine for when it won't.",
  wren_night: 'Dark comes quick out here. Your lookout dial still shows the way home.',
  wren_storm: "Storm cell. Go round it if you can. If you can't, hold on, and mind your hull.",
  wren_raiders: 'Rustfang. They ride wave runners, and they take what they like. Outrun them under engine, or fit a harpoon and teach them manners.',
  wren_reach: 'The Sunken Reach. A whole city under you. Richer salvage out here, and worse company.',
  wren_wall: 'The Stormwall. Nobody I know has come back from it. Be the first.',
  wren_crew: "Crew aren't passengers. Each one does a job you'd only do badly. Find more of them.",
  wren_green: 'Is that green? Keep it alive, Captain. That is the rarest thing left in the world.',
  wren_trimaran: "Three hulls. She'll take the open swell now. Rig Helios is west, past the edge of my chart.",
  wren_back: 'Still floating, Captain. Good. Your log has the next job.',
} as const;
export type VoiceId = keyof typeof VOICE_LINES;
export type Stinger = 'salvage' | 'discovery' | 'upgrade' | 'crew';
const SFX = { hull: ['sfx_hull_thud_01', 'sfx_hull_thud_02', 'sfx_hull_thud_03'], harpoonFire: ['sfx_harpoon_whoosh'], harpoonHit: ['sfx_harpoon_hit_01', 'sfx_harpoon_hit_02'] };
export type SfxLayer = keyof typeof SFX;

/** Theme stems (sample-aligned, 25.26 s loop in D dorian) and how loud each is per region / danger. */
const STEMS = ['pad', 'bass', 'arp', 'lead', 'drums'] as const;
type Stem = (typeof STEMS)[number];
const MIX: Record<string, Partial<Record<Stem, number>>> = {
  shallows: { pad: 0.75, bass: 0.55 }, // the Drift: just the bed
  harbor: { pad: 0.6, lead: 0.25 },
  emerald: { pad: 0.7, bass: 0.6, arp: 0.45 }, // the Sunken Reach: the arp wakes up
  stormwall: { pad: 0.9, bass: 0.8, arp: 0.25, lead: 0.5, drums: 0.25 },
};
const DANGER: Partial<Record<Stem, number>> = { drums: 0.85, arp: 0.6, lead: 0.55, bass: 0.85 }; // raider combat

/**
 * The tape shelf: every piece is five sample-aligned stems (GITCRAFT AudioCraft, creative/audio/music), so the same
 * region and raider-danger mix plays over whichever tape is on. Only the tape that is playing is ever downloaded.
 */
export const TAPES = [
  { id: 'drowned', name: 'Drowned World', note: 'The theme. Slow and deep', file: 'tb_theme', loop: 25.2632 },
  { id: 'fairwind', name: 'Fair Wind', note: 'A running sea, bright', file: 'tb_tape_fairwind', loop: 40 },
  { id: 'slackwater', name: 'Slack Water', note: 'Calm, for the long hauls', file: 'tb_tape_slackwater', loop: 43.6364 },
  { id: 'salvageday', name: 'Salvage Day', note: 'A good haul. Light on its feet', file: 'tb_tape_salvageday', loop: 35.5556 },
  { id: 'ironwake', name: 'Ironwake', note: 'Big water, bigger boat', file: 'tb_tape_ironwake', loop: 41.7391 },
  { id: 'longdark', name: 'The Long Dark', note: 'Night watch. Low and far from home', file: 'tb_tape_longdark', loop: 48 },
  { id: 'rustdiesel', name: 'Rust & Diesel', note: 'Trouble on the water', file: 'tb_tape_rustdiesel', loop: 36.9231 },
] as const;
export type TapeId = (typeof TAPES)[number]['id'];
const TAPE_MAP = Object.fromEntries(TAPES.map((t) => [t.id, t])) as Record<TapeId, (typeof TAPES)[number]>;

/** The tapes that suit the water you are in (first = the one to open on). */
export function tapePool(sea: { region: string; night: number; storm: number }): TapeId[] {
  if (sea.storm > 0.5 || sea.region === 'stormwall') return ['rustdiesel', 'ironwake'];
  if (sea.night > 0.6) return ['longdark', 'slackwater', 'drowned'];
  if (sea.region === 'emerald') return ['ironwake', 'fairwind', 'drowned'];
  if (sea.region === 'harbor') return ['slackwater', 'salvageday', 'drowned'];
  return ['drowned', 'fairwind', 'salvageday', 'slackwater'];
}

/**
 * AUTO: which tape should be on. A tape that suits the water plays three times through, then the next in the pool
 * takes over; one that no longer suits (night fell, a storm came up) plays its loop out first. Pure, so it is tested.
 */
export function autoTape(sea: { region: string; night: number; storm: number }, playing: TapeId | null, loopsPlayed: number): TapeId {
  const pool = tapePool(sea);
  if (!playing) return pool[0];
  const i = pool.indexOf(playing);
  if (i < 0) return loopsPlayed >= 1 ? pool[0] : playing;
  return loopsPlayed >= 3 ? pool[(i + 1) % pool.length] : playing;
}

/** Pick the format once: OGG Vorbis if the browser says it can, AAC otherwise (iPhone Safari). */
export function audioExt(canPlay: (t: string) => string = (t) => document.createElement('audio').canPlayType(t)): 'ogg' | 'm4a' {
  try {
    return canPlay('audio/ogg; codecs="vorbis"') ? 'ogg' : 'm4a';
  } catch {
    return 'm4a';
  }
}

/** Target stem gains for a region at a given raider danger (0..1). Pure, so it is unit-tested. */
export function themeMix(region: string, danger: number): Record<Stem, number> {
  const base = MIX[region] ?? MIX.shallows;
  const out = {} as Record<Stem, number>;
  for (const s of STEMS) out[s] = Math.max(base[s] ?? 0, (DANGER[s] ?? 0) * Math.min(1, Math.max(0, danger)));
  return out;
}

class AudioPack {
  private ext: 'ogg' | 'm4a' | null = null;
  private cache = new Map<string, Promise<AudioBuffer | null>>();
  private voiceBus: GainNode | null = null;
  private themeBus: GainNode | null = null;
  private stemGain = new Map<Stem, GainNode>();
  private themeLoading = false;
  private speaking: AudioBufferSourceNode | null = null;
  private lastSaid = new Map<string, number>();
  private region = 'shallows';
  private danger = 0;

  private ready() {
    const ctx = audio.ctx;
    if (!ctx) return null;
    if (!this.ext) this.ext = audioExt();
    if (!this.voiceBus) {
      this.voiceBus = ctx.createGain();
      this.voiceBus.gain.value = 1.15;
      this.voiceBus.connect(audio.sfxBus);
    }
    return ctx;
  }

  private load(path: string): Promise<AudioBuffer | null> {
    const ctx = this.ready();
    if (!ctx) return Promise.resolve(null);
    let p = this.cache.get(path);
    if (!p) {
      const get = (ext: string) =>
        fetch(`${BASE}${path}.${ext}`)
          .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`))))
          .then((b) => new Promise<AudioBuffer>((res, rej) => ctx.decodeAudioData(b, res, rej)));
      // a browser that claims Vorbis but can't decode it gets the AAC file instead
      p = get(this.ext!)
        .catch(() => (this.ext === 'ogg' ? get('m4a') : Promise.reject(new Error('decode'))))
        .catch(() => null);
      this.cache.set(path, p);
    }
    return p;
  }

  private play(buf: AudioBuffer, bus: AudioNode, vol = 1, rate = 1) {
    const ctx = audio.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = vol;
    s.connect(g).connect(bus);
    s.start();
    return s;
  }

  /** A character speaks (one line at a time; the same line not again within `cooldown` s). Music ducks under it. */
  say(id: VoiceId, cooldown = 30) {
    const ctx = this.ready();
    if (!ctx || audio.sfxVol <= 0 || this.busy) return;
    const now = ctx.currentTime;
    if (now - (this.lastSaid.get(id) ?? -1e9) < cooldown) return;
    this.lastSaid.set(id, now);
    this.load(`vo/${id}`).then((buf) => {
      if (!buf || this.busy) return;
      const s = this.play(buf, this.voiceBus!);
      this.speaking = s;
      this.speakEnd = performance.now() + buf.duration * 1000 + 600;
      this.duck(true);
      s.onended = () => {
        if (this.speaking === s) this.speaking = null;
        this.duck(false);
      };
    });
  }

  /** Is a voice line playing right now? */
  get busy() {
    // by the clock as well as the 'ended' event: a stalled audio device must not leave a line "playing" forever
    if (this.speaking && performance.now() > this.speakEnd) this.speaking = null;
    return !!this.speaking;
  }
  private speakEnd = 0;

  /**
   * The narrator speaks: like say(), without a cooldown, and it resolves with the line's length in seconds once it
   * starts (0 if sound is off, the file is missing or someone else is mid-line), so a caption can stay up as long.
   */
  speak(id: VoiceId): Promise<number> {
    const ctx = this.ready();
    if (!ctx || audio.sfxVol <= 0 || this.busy) return Promise.resolve(0);
    return this.load(`vo/${id}`).then((buf) => {
      if (!buf || this.busy) return 0;
      const s = this.play(buf, this.voiceBus!);
      this.speaking = s;
      this.speakEnd = performance.now() + buf.duration * 1000 + 600;
      this.duck(true);
      s.onended = () => {
        if (this.speaking === s) this.speaking = null;
        this.duck(false);
      };
      return buf.duration;
    });
  }

  sting(name: Stinger, vol = 0.8) {
    if (!this.ready() || audio.sfxVol <= 0) return;
    this.load(`stingers/stinger_${name}`).then((b) => b && this.play(b, audio.sfxBus, vol));
  }

  /** A recorded layer on top of a synthesized hit (variations picked at random, slight pitch drift). */
  layer(name: SfxLayer, vol = 0.7) {
    if (!this.ready() || audio.sfxVol <= 0) return;
    const list = SFX[name];
    this.load(`sfx/${list[Math.floor(Math.random() * list.length)]}`).then((b) => b && this.play(b, audio.sfxBus, vol, 0.92 + Math.random() * 0.16));
  }

  /** A StudioCraft one-shot from public/audio/sfx (the vehicles, loop pass Phase 4). Returns false if it isn't loaded
   * yet, so the caller can play its procedural stand-in. */
  oneShot(name: string, vol = 0.7, rate = 1) {
    if (!this.ready() || audio.sfxVol <= 0) return false;
    const p = this.load(`sfx/${name}`);
    let played = false;
    p.then((b) => {
      if (b) {
        this.play(b, audio.sfxBus, vol, rate);
        played = true;
      }
    });
    return played || this.cache.has(`sfx/${name}`);
  }

  private loops = new Map<string, { gain: GainNode | null; want: number }>();
  /** A seamless StudioCraft loop (burner, high wind) held at a gain; 0 silences it. Loaded on first use. */
  loopGain(name: string, k: number) {
    const ctx = this.ready();
    if (!ctx) return;
    let l = this.loops.get(name);
    if (!l) {
      l = { gain: null, want: k };
      this.loops.set(name, l);
      const rec = l;
      this.load(`sfx/${name}`).then((b) => {
        if (!b) return;
        const s = ctx.createBufferSource();
        s.buffer = b;
        s.loop = true;
        rec.gain = ctx.createGain();
        rec.gain.gain.value = rec.want;
        s.connect(rec.gain).connect(audio.sfxBus);
        s.start();
      });
    }
    l.want = k;
    if (l.gain) l.gain.gain.setTargetAtTime(k, ctx.currentTime, 0.08);
  }
  /** Is a loop playing (loaded)? Until it is, the synth stands in. */
  loopReady(name: string) {
    return !!this.loops.get(name)?.gain;
  }

  /** Warm the cache for the short one-shots once the game is running (a few KB each). */
  prefetch() {
    if (!this.ready()) return;
    for (const s of ['salvage', 'discovery', 'upgrade', 'crew']) this.load(`stingers/stinger_${s}`);
    for (const l of Object.values(SFX).flat()) this.load(`sfx/${l}`);
  }

  private duck(on: boolean) {
    if (!this.themeBus || !audio.ctx) return;
    this.themeBus.gain.setTargetAtTime(on ? 0.45 : 1, audio.ctx.currentTime, on ? 0.08 : 0.6);
  }

  /** The tape the player chose in Settings ('auto': the sea picks, see autoTape). */
  tape: TapeId | 'auto' = 'auto';
  /** the tape on the deck right now (null until the first one has loaded) */
  playing: TapeId | null = null;
  private deckAt = 0;
  private sea = { night: 0, storm: 0 };

  /** Choose a tape (Settings). It crossfades in on the next frame. */
  setTape(id: string) {
    this.tape = id === 'auto' || TAPES.some((t) => t.id === id) ? (id as TapeId | 'auto') : 'auto';
  }

  /** Put a tape on: all five stems on one clock, faded in over the outgoing tape. Skipped while MUSIC is at 0. */
  private startTape(id: TapeId) {
    const ctx = this.ready();
    if (!ctx || this.themeLoading || audio.musicVol <= 0) return;
    const tape = TAPE_MAP[id];
    this.themeLoading = true;
    Promise.all(STEMS.map((s) => this.load(`music/${tape.file}_${s}`))).then((bufs) => {
      this.themeLoading = false;
      if (bufs.some((b) => !b)) {
        this.failed.add(id); // keep what is playing (or the synth phrases); don't ask for this tape again
        return;
      }
      const old = this.themeBus;
      const bus = ctx.createGain();
      const at = ctx.currentTime + 0.1, fade = old ? 3.5 : 4;
      bus.gain.setValueAtTime(old ? 0 : 1, at);
      if (old) {
        bus.gain.linearRampToValueAtTime(1, at + fade);
        old.gain.cancelScheduledValues(at);
        old.gain.setValueAtTime(old.gain.value, at);
        old.gain.linearRampToValueAtTime(0, at + fade);
        const stale = this.sources;
        setTimeout(() => {
          for (const src of stale) {
            try {
              src.stop();
            } catch {
              /* already stopped */
            }
          }
          old.disconnect();
        }, (fade + 0.4) * 1000);
      }
      bus.connect(audio.musicBus);
      this.themeBus = bus;
      this.sources = [];
      this.stemGain.clear();
      const mix = themeMix(this.region, this.danger);
      STEMS.forEach((s, i) => {
        const src = ctx.createBufferSource();
        src.buffer = bufs[i]!;
        src.loop = true;
        src.loopEnd = Math.min(tape.loop, bufs[i]!.duration); // ignore any encoder padding
        const g = ctx.createGain();
        g.gain.setValueAtTime(old ? mix[s] : 0, at);
        if (!old) g.gain.linearRampToValueAtTime(mix[s], at + fade);
        src.connect(g).connect(bus);
        src.start(at);
        this.sources.push(src);
        this.stemGain.set(s, g);
      });
      this.playing = id;
      this.deckAt = at;
      audio.themeOn = true;
    });
  }
  private sources: AudioBufferSourceNode[] = [];
  private failed = new Set<TapeId>();

  /** Called every frame: region and raider danger (0..1) steer the stem mix; night and storm help pick the tape. */
  music(region: string, danger: number, night = 0, storm = 0) {
    const ctx = audio.ctx;
    if (!ctx) return;
    this.sea.night = night;
    this.sea.storm = storm;
    if (!this.themeLoading) {
      const played = this.playing ? (ctx.currentTime - this.deckAt) / TAPE_MAP[this.playing].loop : 0;
      let want: TapeId = this.tape === 'auto' ? autoTape({ region, night, storm }, this.playing, played) : this.tape;
      if (this.failed.has(want)) want = this.playing ?? 'drowned';
      // never swap tapes mid-chase: the fight keeps the tune it started with
      if (want !== this.playing && !(this.playing && danger > 0.2 && this.tape === 'auto') && !this.failed.has(want)) this.startTape(want);
    }
    if (region === this.region && Math.abs(danger - this.danger) < 0.05) return;
    this.region = region;
    this.danger = danger;
    if (!this.stemGain.size) return;
    const mix = themeMix(region, danger);
    const t = ctx.currentTime;
    for (const [s, g] of this.stemGain) g.gain.setTargetAtTime(mix[s], t, danger > 0.5 ? 0.6 : 2.5);
  }
}

export const pack = new AudioPack();
