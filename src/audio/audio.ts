// Procedural WebAudio soundscape: waves against the hull, wind in the rigging, engines, rain and thunder,
// winches and harpoons, creaks, gulls, discovery stingers and sparse drowned-world music.
// Everything is synthesized so the game ships with zero audio assets.

type Ctx = AudioContext;

export class Audio {
  ctx: Ctx | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private waves!: GainNode;
  private wavesFilter!: BiquadFilterNode;
  private wind!: GainNode;
  private underwaterLP!: BiquadFilterNode;
  private noiseBuf!: AudioBuffer;
  sfxVol = 0.8;
  musicVol = 0.5;
  private nextGull = 4;
  private nextCreak = 2;
  private nextPhrase = 20;
  private region = 'shallows';
  private engineOsc: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain!: GainNode;
  private rainGain!: GainNode;
  private rigGain!: GainNode;
  private winchGain!: GainNode;
  private winchOsc: OscillatorNode | null = null;
  private nextSlap = 1;

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.underwaterLP = ctx.createBiquadFilter();
    this.underwaterLP.type = 'lowpass';
    this.underwaterLP.frequency.value = 20000;
    this.master.connect(this.underwaterLP).connect(ctx.destination);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.sfxVol;
    this.sfxBus.connect(this.master);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicVol * 0.5;
    this.musicBus.connect(this.master);

    // noise buffer
    const len = ctx.sampleRate * 3;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02; // brown-ish
      d[i] = last * 3.5;
    }
    // waves bed
    const wsrc = ctx.createBufferSource();
    wsrc.buffer = this.noiseBuf;
    wsrc.loop = true;
    this.wavesFilter = ctx.createBiquadFilter();
    this.wavesFilter.type = 'lowpass';
    this.wavesFilter.frequency.value = 600;
    this.waves = ctx.createGain();
    this.waves.gain.value = 0.25;
    wsrc.connect(this.wavesFilter).connect(this.waves).connect(this.sfxBus);
    wsrc.start();
    // swell LFO on waves
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 0.12;
    lfo.connect(lfoG).connect(this.waves.gain);
    lfo.start();
    // wind
    const wn = ctx.createBufferSource();
    wn.buffer = this.noiseBuf;
    wn.loop = true;
    wn.playbackRate.value = 1.7;
    const wf = ctx.createBiquadFilter();
    wf.type = 'bandpass';
    wf.frequency.value = 900;
    wf.Q.value = 0.7;
    this.wind = ctx.createGain();
    this.wind.gain.value = 0.0;
    wn.connect(wf).connect(this.wind).connect(this.sfxBus);
    wn.start();
    // engine: two detuned saws through a lowpass, amplitude-modulated by a putter LFO
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    const ef = ctx.createBiquadFilter();
    ef.type = 'lowpass';
    ef.frequency.value = 420;
    this.engineOsc = ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 48;
    this.engineOsc2 = ctx.createOscillator();
    this.engineOsc2.type = 'square';
    this.engineOsc2.frequency.value = 24.3;
    const putter = ctx.createOscillator();
    putter.frequency.value = 11;
    const putterG = ctx.createGain();
    putterG.gain.value = 0.35;
    const am = ctx.createGain();
    am.gain.value = 0.6;
    putter.connect(putterG).connect(am.gain);
    this.engineOsc.connect(ef);
    this.engineOsc2.connect(ef);
    ef.connect(am).connect(this.engineGain).connect(this.sfxBus);
    this.engineOsc.start();
    this.engineOsc2.start();
    putter.start();
    // rain: bright filtered noise
    const rn = ctx.createBufferSource();
    rn.buffer = this.noiseBuf;
    rn.loop = true;
    rn.playbackRate.value = 3.2;
    const rf = ctx.createBiquadFilter();
    rf.type = 'highpass';
    rf.frequency.value = 2500;
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0;
    rn.connect(rf).connect(this.rainGain).connect(this.sfxBus);
    rn.start();
    // wind whistling in the rigging: resonant band that wanders
    const rg = ctx.createBufferSource();
    rg.buffer = this.noiseBuf;
    rg.loop = true;
    rg.playbackRate.value = 2.4;
    const rgf = ctx.createBiquadFilter();
    rgf.type = 'bandpass';
    rgf.frequency.value = 1700;
    rgf.Q.value = 14;
    const wander = ctx.createOscillator();
    wander.frequency.value = 0.21;
    const wanderG = ctx.createGain();
    wanderG.gain.value = 500;
    wander.connect(wanderG).connect(rgf.frequency);
    wander.start();
    this.rigGain = ctx.createGain();
    this.rigGain.gain.value = 0;
    rg.connect(rgf).connect(this.rigGain).connect(this.sfxBus);
    rg.start();
    this.winchGain = ctx.createGain();
    this.winchGain.gain.value = 0;
    this.winchGain.connect(this.sfxBus);
  }

  /** Engine drone; level 0 = off. */
  engine(level: number, big = false) {
    if (!this.ctx || !this.engineOsc || !this.engineOsc2) return;
    const t = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(level * (big ? 0.16 : 0.11), t, 0.25);
    const base = big ? 34 : 48;
    this.engineOsc.frequency.setTargetAtTime(base + level * (big ? 30 : 46), t, 0.3);
    this.engineOsc2.frequency.setTargetAtTime((base + level * (big ? 30 : 46)) * 0.506, t, 0.3);
  }
  engineStart(on: boolean) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (on) {
      for (let i = 0; i < 4; i++) {
        this.tone(55 + i * 6, t + i * 0.11, 0.1, 'sawtooth', 0.12);
        this.noiseBurst(t + i * 0.11, 0.08, 400, 0.2, 'lowpass');
      }
    } else this.tone(60, t, 0.4, 'sawtooth', 0.06);
  }
  thunder(strength = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.noiseBurst(t, 2.4 * strength + 0.6, 120, 0.9 * strength, 'lowpass');
    this.noiseBurst(t + 0.05, 0.25, 1800, 0.25 * strength, 'bandpass');
    this.tone(38, t, 1.8, 'sine', 0.25 * strength);
  }
  winch(on: boolean) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (on && !this.winchOsc) {
      const o = this.ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = 7;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 2200;
      f.Q.value = 3;
      o.connect(f).connect(this.winchGain);
      o.start();
      this.winchOsc = o;
      this.winchGain.gain.setTargetAtTime(0.05, t, 0.1);
    } else if (!on && this.winchOsc) {
      this.winchGain.gain.setTargetAtTime(0, t, 0.1);
      const o = this.winchOsc;
      setTimeout(() => o.stop(), 400);
      this.winchOsc = null;
    }
  }
  reel(ok: boolean) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (ok) {
      this.tone(220, t, 0.15, 'square', 0.08);
      this.tone(330, t + 0.08, 0.2, 'square', 0.08);
      this.noiseBurst(t, 0.3, 900, 0.3, 'lowpass');
    } else {
      this.tone(140, t, 0.3, 'sawtooth', 0.1);
      this.noiseBurst(t, 0.2, 3000, 0.2);
    }
  }
  harpoon() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.noiseBurst(t, 0.12, 2500, 0.5, 'highpass');
    this.tone(900, t, 0.25, 'sawtooth', 0.06);
    setTimeout(() => this.splash(true), 250);
  }
  raiderHorn() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(196, t, 0.7, 'sawtooth', 0.08);
    this.tone(185, t + 0.75, 0.9, 'sawtooth', 0.08);
  }

  setVolumes(sfx: number, music: number) {
    this.sfxVol = sfx;
    this.musicVol = music;
    if (!this.ctx) return;
    this.sfxBus.gain.value = sfx;
    this.musicBus.gain.value = music * 0.5;
  }

  /** Called every frame with sailing state. */
  ambience(dt: number, speed: number, onShore: boolean, swell: number, region: string, storm = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.wind.gain.setTargetAtTime(Math.min(0.26, speed * 0.016 + swell * 0.12 + storm * 0.12), t, 0.5);
    this.wavesFilter.frequency.setTargetAtTime(onShore ? 900 : 500 + speed * 40 + swell * 500 + storm * 400, t, 0.5);
    this.waves.gain.setTargetAtTime(0.25 + storm * 0.25, t, 1);
    this.rainGain.gain.setTargetAtTime(storm > 0.08 ? storm * 0.14 : 0, t, 0.8);
    this.rigGain.gain.setTargetAtTime(onShore ? 0 : Math.min(0.05, speed * 0.003 + storm * 0.04), t, 0.6);
    // waves slapping the hull
    this.nextSlap -= dt * (0.6 + speed * 0.08 + storm);
    if (!onShore && this.nextSlap < 0) {
      this.nextSlap = 1.2 + Math.random() * 1.6;
      this.noiseBurst(t, 0.22, 260 + Math.random() * 160, 0.18 + storm * 0.2, 'lowpass');
    }
    this.nextGull -= dt;
    if (this.nextGull < 0) {
      this.nextGull = 6 + Math.random() * 12;
      this.gull();
    }
    this.nextCreak -= dt;
    if (!onShore && this.nextCreak < 0) {
      this.nextCreak = 3 + Math.random() * 5;
      this.creak();
    }
    if (region !== this.region) {
      this.region = region;
      this.nextPhrase = 1;
    }
    this.nextPhrase -= dt;
    if (this.nextPhrase < 0) {
      // Sparse musical phrases instead of a constant loop.
      this.nextPhrase = 35 + Math.random() * 40;
      this.phrase(region);
    }
  }

  private env(g: GainNode, t: number, a: number, peak: number, dec: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }

  private tone(freq: number, when: number, dur: number, type: OscillatorType, vol: number, bus?: AudioNode, detune = 0) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    const g = ctx.createGain();
    this.env(g, when, 0.01, vol, dur);
    o.connect(g).connect(bus ?? this.sfxBus);
    o.start(when);
    o.stop(when + dur + 0.05);
  }

  private noiseBurst(when: number, dur: number, freq: number, vol: number, type: BiquadFilterType = 'bandpass') {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    s.playbackRate.value = 2;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    this.env(g, when, 0.005, vol, dur);
    s.connect(f).connect(g).connect(this.sfxBus);
    s.start(when, Math.random() * 2);
    s.stop(when + dur + 0.05);
  }

  gull() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      const g = this.ctx.createGain();
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1800;
      const w = t + i * 0.22;
      o.frequency.setValueAtTime(1300, w);
      o.frequency.exponentialRampToValueAtTime(800, w + 0.18);
      this.env(g, w, 0.02, 0.03, 0.16);
      o.connect(f).connect(g).connect(this.sfxBus);
      o.start(w);
      o.stop(w + 0.25);
    }
  }

  creak() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(90 + Math.random() * 40, t);
    o.frequency.linearRampToValueAtTime(70 + Math.random() * 30, t + 0.4);
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 600;
    f.Q.value = 6;
    const g = this.ctx.createGain();
    this.env(g, t, 0.08, 0.035, 0.4);
    o.connect(f).connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + 0.6);
  }

  splash(big = false) {
    if (!this.ctx) return;
    this.noiseBurst(this.ctx.currentTime, big ? 0.9 : 0.4, big ? 700 : 1200, big ? 0.5 : 0.25, 'lowpass');
  }
  dig() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.noiseBurst(t, 0.18, 500, 0.5, 'lowpass');
    this.tone(70, t, 0.12, 'sine', 0.2);
  }
  clunk() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(160, t, 0.25, 'square', 0.12);
    this.tone(110, t + 0.02, 0.3, 'triangle', 0.2);
    this.noiseBurst(t, 0.1, 2000, 0.2);
  }
  anchor(down: boolean) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 8; i++) this.noiseBurst(t + i * 0.06, 0.04, 3000 + Math.random() * 2000, 0.12);
    if (down) setTimeout(() => this.splash(true), 450);
  }
  pickup() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(880, t, 0.12, 'triangle', 0.18);
    this.tone(1320, t + 0.07, 0.18, 'triangle', 0.14);
  }
  coins(n = 6) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < n; i++) {
      const w = t + i * 0.05 + Math.random() * 0.03;
      this.tone(2400 + Math.random() * 900, w, 0.12, 'square', 0.04);
      this.tone(3600 + Math.random() * 900, w, 0.08, 'sine', 0.05);
    }
  }
  ui() {
    if (!this.ctx) return;
    this.tone(660, this.ctx.currentTime, 0.06, 'sine', 0.08);
  }
  deny() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(220, t, 0.12, 'triangle', 0.15);
    this.tone(180, t + 0.1, 0.16, 'triangle', 0.15);
  }
  hammer() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      this.tone(320, t + i * 0.18, 0.08, 'square', 0.1);
      this.noiseBurst(t + i * 0.18, 0.06, 2500, 0.25);
    }
  }
  /** Rarity-scaled discovery fanfare. */
  discover(rarity: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const scale = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568];
    const n = 3 + rarity;
    for (let i = 0; i < n; i++) {
      this.tone(scale[i % scale.length] * (i >= scale.length ? 2 : 1), t + i * 0.09, 0.5, 'triangle', 0.12);
      this.tone(scale[i % scale.length] * 0.5, t + i * 0.09, 0.4, 'sine', 0.06, undefined, 4);
    }
    if (rarity >= 2) {
      // shimmering pad
      for (const f of [523.25, 659.25, 783.99]) this.tone(f, t + n * 0.09, 1.6, 'sine', 0.06, undefined, 6);
    }
  }
  chestOpen() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(140, t, 0.5, 'sawtooth', 0.04);
    this.noiseBurst(t, 0.4, 800, 0.2);
    setTimeout(() => this.discover(3), 300);
    setTimeout(() => this.coins(14), 450);
  }
  /** Short, sparse melodic phrase flavored by region. */
  phrase(region: string) {
    if (!this.ctx || this.musicVol <= 0) return;
    const t = this.ctx.currentTime;
    const sets: Record<string, number[]> = {
      shallows: [293.66, 329.63, 392, 440, 493.88, 587.33], // open, hopeful D pentatonic
      emerald: [220, 261.63, 293.66, 329.63, 392, 440], // A minor pentatonic: the drowned cities
      stormwall: [155.56, 185, 207.65, 233.08, 277.18], // low and uneasy
      harbor: [392, 440, 493.88, 587.33, 659.25],
    };
    const notes = sets[region] ?? sets.shallows;
    let w = t;
    const len = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < len; i++) {
      const f = notes[Math.floor(Math.random() * notes.length)];
      const dur = [0.3, 0.45, 0.6][Math.floor(Math.random() * 3)];
      this.tone(f, w, dur * 1.6, 'triangle', 0.07, this.musicBus);
      if (i % 3 === 0) this.tone(f / 2, w, dur * 3, 'sine', 0.05, this.musicBus);
      if (i === 0) this.tone(f / 4, w, len * 0.5, 'sine', 0.035, this.musicBus, 3); // long drone under the phrase
      w += dur;
    }
  }
  setUnderwater(on: boolean) {
    if (!this.ctx) return;
    this.underwaterLP.frequency.setTargetAtTime(on ? 500 : 20000, this.ctx.currentTime, 0.2);
  }
}

export const audio = new Audio();
