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
  kai_raiders: 'Rustfang skiffs! Coming in hard!',
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
} as const;
export type VoiceId = keyof typeof VOICE_LINES;
export type Stinger = 'salvage' | 'discovery' | 'upgrade' | 'crew';
const SFX = { hull: ['sfx_hull_thud_01', 'sfx_hull_thud_02', 'sfx_hull_thud_03'], harpoonFire: ['sfx_harpoon_whoosh'], harpoonHit: ['sfx_harpoon_hit_01', 'sfx_harpoon_hit_02'] };
export type SfxLayer = keyof typeof SFX;

/** Theme stems (sample-aligned, 25.26 s loop in D dorian) and how loud each is per region / danger. */
const STEMS = ['pad', 'bass', 'arp', 'lead', 'drums'] as const;
type Stem = (typeof STEMS)[number];
const LOOP_S = 25.2632;
const MIX: Record<string, Partial<Record<Stem, number>>> = {
  shallows: { pad: 0.75, bass: 0.55 }, // the Drift: just the bed
  harbor: { pad: 0.6, lead: 0.25 },
  emerald: { pad: 0.7, bass: 0.6, arp: 0.45 }, // the Sunken Reach: the arp wakes up
  stormwall: { pad: 0.9, bass: 0.8, arp: 0.25, lead: 0.5, drums: 0.25 },
};
const DANGER: Partial<Record<Stem, number>> = { drums: 0.85, arp: 0.6, lead: 0.55, bass: 0.85 }; // raider combat

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
    if (!ctx || audio.sfxVol <= 0 || this.speaking) return;
    const now = ctx.currentTime;
    if (now - (this.lastSaid.get(id) ?? -1e9) < cooldown) return;
    this.lastSaid.set(id, now);
    this.load(`vo/${id}`).then((buf) => {
      if (!buf || this.speaking) return;
      const s = this.play(buf, this.voiceBus!);
      this.speaking = s;
      this.duck(true);
      s.onended = () => {
        this.speaking = null;
        this.duck(false);
      };
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

  /** Start the theme (all stems on one clock). Skipped while MUSIC is at 0; retried when it comes back up. */
  private startTheme() {
    const ctx = this.ready();
    if (!ctx || this.themeLoading || audio.musicVol <= 0) return;
    this.themeLoading = true;
    Promise.all(STEMS.map((s) => this.load(`music/tb_theme_${s}`))).then((bufs) => {
      if (bufs.some((b) => !b)) return; // keep the synth phrases
      this.themeBus = ctx.createGain();
      this.themeBus.gain.value = 1;
      this.themeBus.connect(audio.musicBus);
      const at = ctx.currentTime + 0.1;
      const mix = themeMix(this.region, this.danger);
      STEMS.forEach((s, i) => {
        const src = ctx.createBufferSource();
        src.buffer = bufs[i]!;
        src.loop = true;
        src.loopEnd = Math.min(LOOP_S, bufs[i]!.duration); // ignore any encoder padding
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(mix[s], at + 4);
        src.connect(g).connect(this.themeBus!);
        src.start(at);
        this.stemGain.set(s, g);
      });
      audio.themeOn = true;
    });
  }

  /** Called every frame: region and raider danger (0..1) steer the stem mix. */
  music(region: string, danger: number) {
    if (!audio.ctx) return;
    if (!this.themeLoading) this.startTheme();
    if (region === this.region && Math.abs(danger - this.danger) < 0.05) return;
    this.region = region;
    this.danger = danger;
    if (!this.stemGain.size) return;
    const mix = themeMix(region, danger);
    const t = audio.ctx.currentTime;
    for (const [s, g] of this.stemGain) g.gain.setTargetAtTime(mix[s], t, danger > 0.5 ? 0.6 : 2.5);
  }
}

export const pack = new AudioPack();
