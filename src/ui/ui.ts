// DOM UI: HUD, touch controls, panels (harbor, catalog, maps, ship, cargo, settings), reveals.
import { goalProgressText } from '../game/goalHelp';
import { pickLine, CHARACTER_MAP } from '../data/characters';
import { ARCS } from '../data/arcs';
import { openRumours, canReach } from '../game/leads';
import { SHIP_NAMES, REFIT_STAGES, RENOWN, refitStage, renownTitle } from '../data/renown';
import { CONTRACT_MAP, boardFor, contractReady, contractProgress, standingRank, gardenStage, freshFood, GARDENS, GARDEN_POINTS, MAX_ACTIVE, type PortId } from '../data/contracts';
import { ITEMS, CATALOG_ITEMS, ITEM_MAP, RARITY_COLOR, RARITY_LABEL, RARITY_ORDER, CATEGORY_LABEL, LIVING_GREEN, isLiving, item, type Category } from '../data/items';
import { UPGRADES, VESSELS, COSMETICS, COSMETIC_MAP, SLOT_LABEL, SLOT_ORDER, UPGRADE_MAP, type Cost } from '../data/ship';
import { RECIPES } from '../data/crafting';
import { CREW, CREW_MAP, ROLE_INFO } from '../data/crew';
import { GOALS } from '../data/progress';
import { SETTLEMENT_MAP, type SettlementDef } from '../data/world';
import { MILESTONES, FIRST_VOYAGE } from '../data/progress';
import { TREASURE_MAPS, FRAGMENT_MAP, ISLAND_MAP } from '../data/world';
import { iconSVG } from './icons';
import { drawTreasureMap, paintWorldChart, bakeChartLayers, CHART_BOUNDS } from './mapArt';
import { ZoomableMap } from './mapView';

/** the world chart's view, remembered between openings of the Maps panel this visit */
let chartView: { cx: number; cz: number; zoom: number } | null = null;
import type { Store } from '../state/store';
import { audio } from '../audio/audio';
import { SAIL_LABEL, type PointOfSail } from '../game/pointOfSail';
import { pack } from '../audio/pack';
import { wordmarkSVG } from './brand';
import { wheelSVG } from './helmWheel';
import { PERFECT_SHARE, pullGrade } from '../game/haul';
import { clockText } from '../game/trip';
import { tierOf, tierRank, TIER_COLOR, TIER_LABEL, SETS, SET_MAP, bonusText, type Tier } from '../data/loot';
import { PLAY_EFFECT } from '../data/ship';
import { jobText } from '../game/dockJobs';

export interface GameAPI {
  store: Store;
  sell(id: string, n: number): void;
  buyUpgrade(id: string): void;
  buyVessel(id: string): void;
  buyCosmetic(id: string): void;
  equip(slot: 'paint' | 'sail' | 'flag', id: string): void;
  setTrophy(slot: number, id: string | null): void;
  jettison(id: string): void;
  setSail(): void;
  setActiveMap(id: string): void;
  questEvent(e: 'read_map' | 'catalog'): void;
  setShowcase(on: boolean): void;
  shipState(): { x: number; z: number; heading: number };
  isDocked(): boolean;
  dockedSettlement(): SettlementDef | null;
  resetSave(): void;
  start(): void;
  toggleEngine(): void;
  craft(id: string): void;
  refuel(): void;
  buyFuel(): void;
  repair(withKit: boolean): void;
  recruit(id: string): void;
  dismiss(id: string): void;
  chartExtras(): import('./mapArt').ChartExtras;
  sideLead(): import('../game/leads').Lead | null;
  toggleFollowSide(): void;
  pinRumour(id: string): void;
  nameShip(): void;
  acceptContract(id: string): void;
  completeContract(id: string): void;
  plantGreen(id: string): void;
  haptic(ms: number | number[]): void;
  startDaily(): void;
  today(): string;
}

export interface StatusInfo {
  fuel: number; fuelCap: number; hull: number; hullMax: number; clock: string; phase: string; weather: string;
  engine: boolean; engineOn: boolean; sailing: boolean;
}

export interface Action {
  id: string;
  label: string;
  primary?: boolean;
  glow?: boolean;
  disabled?: boolean;
}

const ICON = {
  catalog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5c3-1.5 5-1.5 8 0v15c-3-1.5-5-1.5-8 0z"/><path d="M12 5c3-1.5 5-1.5 8 0v15c-3-1.5-5-1.5-8 0"/></svg>',
  maps: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/><path d="M16 10l3 3M19 10l-3 3"/></svg>',
  ship: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 16h18l-3 4H6z"/><path d="M12 3v13"/><path d="M12 4l6 10h-6"/><path d="M11 6l-5 8h5"/></svg>',
  cargo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M4 12h16M10 12v3h4v-3"/><path d="M7 8V5h10v3"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
};

const el = (html: string) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
};

function costHTML(store: Store, c: Cost) {
  const parts = !c.gold ? [] : [`<span class="${store.data.gold < c.gold ? 'lack' : ''}"><span class="pill-coin" style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#e5c65e;border:1px solid #9a7a26"></span>${c.gold}</span>`];
  for (const m of c.mats ?? []) {
    const have = store.countOwned(m.id);
    parts.push(`<span class="${have < m.n ? 'lack' : ''}">${iconSVG(m.id, { size: 16 })}${have}/${m.n} ${item(m.id).name}</span>`);
  }
  return `<div class="cost">${parts.join('')}</div>`;
}

const NPCS = {
  pip: { name: 'Pip Farthing', role: 'Trader', color: '#f4d06f', face: '\u{1F9D0}' },
  marlo: { name: 'Marlo Keelhart', role: 'Shipwright & Mechanic', color: '#9ec5e8', face: '\u{1F9D4}' },
  wren: { name: 'Old Wren', role: 'Charts & Rumours', color: '#a8d5ba', face: '\u{1F475}' },
  odessa: { name: 'Odessa Brightly', role: 'Paint, Sails & Curios', color: '#f2b5c4', face: '\u{1F469}‍\u{1F3A8}' },
  sal: { name: 'Old Sal', role: 'Fish Trader', color: '#9fd8c8', face: '\u{1F3A3}' },
  nori: { name: 'Nori Kettle', role: 'Raft-wright', color: '#d8c49f', face: '\u{1F6E0}' },
  dace: { name: 'Foreman Dace', role: 'Rig Trader', color: '#f2b825', face: '\u{1F477}' },
  vik: { name: 'Vik Ashby', role: 'Rig Mechanic', color: '#ff9f45', face: '\u{1F527}' },
};
const SETTLEMENT_NPCS: Record<string, { trader: keyof typeof NPCS; wright: keyof typeof NPCS }> = {
  driftholm: { trader: 'pip', wright: 'marlo' },
  hollow: { trader: 'sal', wright: 'nori' },
  helios: { trader: 'dace', wright: 'vik' },
};

export class UI {
  root: HTMLElement;
  private npcRecent = new Set<string>();
  private greetings = new Map<string, string>(); // this visit's greetings, so re-rendering the panel keeps them
  joy = { x: 0, y: 0, active: false };
  onAction: (id: string) => void = () => {};
  private hud!: HTMLElement;
  private goldEl!: HTMLElement;
  private engineEl!: HTMLElement;
  private radarEl!: HTMLElement;
  private lastStatus = '';
  private cargoEl!: HTMLElement;
  /** The hold went over capacity this visit (chests and story finds always come aboard); explained once per overflow. */
  private holdOver = false;
  private questEl!: HTMLElement;
  private actionsEl!: HTMLElement;
  private toastsEl!: HTMLElement;
  private wpEl!: HTMLElement;
  private compassEl!: HTMLElement;
  private speedEl!: HTMLElement;
  private hitEl!: HTMLElement;
  private digEl!: HTMLElement;
  private bannerEl!: HTMLElement;
  private fadeEl!: HTMLElement;
  private closeTray: () => void = () => {};
  private sheet: HTMLElement | null = null;
  private revealQueue: (() => HTMLElement)[] = [];
  private revealOpen = false;
  private lastActionsKey = '';
  private seenCatalog = new Set<string>();
  panelOpen = false;
  /** the Maps panel is up: the game draws the 3D scene behind it at half rate so pinch/pan get the GPU */
  mapOpen = false;

  constructor(private game: GameAPI) {
    this.root = document.getElementById('ui')!;
    this.buildHUD();
    this.game.store.on(() => this.refreshHUD());
    try {
      const seen = JSON.parse(localStorage.getItem('tidebreakers.seen') || '[]');
      seen.forEach((s: string) => this.seenCatalog.add(s));
    } catch {
      /* ignore */
    }
  }

  get store() {
    return this.game.store;
  }

  // ───────── HUD ─────────
  private buildHUD() {
    this.hud = el(`<div class="hud" style="position:absolute;inset:0;pointer-events:none"></div>`);
    // Top HUD: one status plate (gold, hold, time, hull/fuel) and the objective on the left; navigation on the right
    // (Maps one tap away, everything else in the Menu tray), with the radar and treasure compass under it.
    const NAV = [
      { p: 'maps', icon: ICON.maps, label: 'Maps' },
      { p: 'ship', icon: ICON.ship, label: 'Ship' },
      { p: 'cargo', icon: ICON.cargo, label: 'Cargo' },
      { p: 'catalog', icon: ICON.catalog, label: 'Catalog' },
      { p: 'settings', icon: ICON.settings, label: 'Settings' },
    ];
    const top = el(`<div class="hud-top">
      <div class="hud-left">
        <div class="status-plate">
          <div class="sp-row"><span class="chip gold-pill" title="Gold"><span class="coin"></span><span class="gold">0</span></span><button class="chip cargo-pill" data-p="cargo" aria-label="Hold: open cargo">⛵ <span class="cargo">0/6</span></button><span class="clock"></span></div>
          <div class="status"><div class="gauge hull"><i></i><span>HULL</span></div><div class="gauge fuel"><i></i><span>FUEL</span></div></div>
          <div class="trip" style="display:none"><span class="t-hold" title="Hold value: only counts once you dock">⛃ <b>0</b>g</span><span class="t-dock" title="Nearest dock"><svg viewBox="0 0 10 10"><path d="M5 0 L9 9 L5 7 L1 9Z"/></svg><b>0</b>m</span><span class="t-bar"><i></i></span><span class="t-clock"></span></div>
        </div>
        <div class="quest"><div class="q-label">Objective</div><div class="q-text"></div><div class="q-need"></div><div class="q-hint"></div><button class="q-side"></button></div>
      </div>
      <div class="hud-right">
        <div class="nav-btns">
          <button class="icon-btn" data-p="maps" aria-label="Maps">${ICON.maps}<span>MAPS</span></button>
          <button class="icon-btn nav-toggle" aria-label="Menu" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg><span>MENU</span></button>
        </div>
        <div class="nav-tray" role="menu">${NAV.map((n) => `<button class="tray-btn" role="menuitem" data-p="${n.p}">${n.icon}<span>${n.label}</span></button>`).join('')}</div>
      </div>
    </div>`);
    this.goldEl = top.querySelector('.gold')!;
    this.cargoEl = top.querySelector('.cargo')!;
    this.questEl = top.querySelector('.quest')!;
    this.questEl.addEventListener('click', () => this.questEl.classList.toggle('open'));
    this.questEl.querySelector('.q-side')!.addEventListener('click', (e) => {
      e.stopPropagation();
      audio.ui();
      this.game.toggleFollowSide();
      this.refreshHUD();
    });
    const tray = top.querySelector('.nav-tray') as HTMLElement;
    const toggle = top.querySelector('.nav-toggle') as HTMLElement;
    const setTray = (open: boolean) => {
      tray.classList.toggle('open', open);
      toggle.classList.toggle('on', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    this.closeTray = () => setTray(false);
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      audio.ui();
      setTray(!tray.classList.contains('open'));
    });
    // a tap anywhere else folds the tray away
    window.addEventListener('pointerdown', (e) => {
      if (tray.classList.contains('open') && !tray.contains(e.target as Node) && !toggle.contains(e.target as Node)) setTray(false);
    });
    top.querySelectorAll<HTMLElement>('[data-p]').forEach((b) =>
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        audio.ui();
        setTray(false);
        this.openPanel(b.dataset.p!);
      })
    );
    this.hud.append(top);

    // joystick
    const stick = el(`<div class="stick" data-vessel="${this.store.data.vessel}">${wheelSVG(this.store.data.vessel)}<div class="knob"></div><div class="stick-label">STEER</div></div>`);
    const knob = stick.querySelector('.knob') as HTMLElement;
    this.stickEl = stick;
    this.wheelEl = stick.querySelector('.wheel') as SVGElement;
    let pid = -1;
    const R = 50;
    const move = (e: PointerEvent) => {
      const r = stick.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2);
      let dy = e.clientY - (r.top + r.height / 2);
      const len = Math.hypot(dx, dy);
      if (len > R) {
        dx = (dx / len) * R;
        dy = (dy / len) * R;
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.wheelEl.style.transform = `rotate(${dx * 0.9}deg)`;
      this.joy.x = dx / R;
      this.joy.y = -dy / R;
    };
    stick.addEventListener('pointerdown', (e) => {
      pid = e.pointerId;
      stick.setPointerCapture(pid);
      this.joy.active = true;
      audio.unlock();
      move(e);
    });
    stick.addEventListener('pointermove', (e) => {
      if (e.pointerId === pid) move(e);
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      pid = -1;
      this.joy.x = this.joy.y = 0;
      this.joy.active = false;
      knob.style.transform = '';
      this.wheelEl.style.transform = '';
    };
    stick.addEventListener('pointerup', end);
    stick.addEventListener('pointercancel', end);

    this.actionsEl = el(`<div class="actions"></div>`);
    this.toastsEl = el(`<div class="toasts"></div>`);
    this.wpEl = el(`<div class="waypoint" style="opacity:0"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" fill="rgba(8,28,38,.6)" stroke="#e5c65e" stroke-width="3"/><path d="M22 8 L30 26 L22 22 L14 26 Z" fill="#e5c65e"/></svg><div class="wp-dist"></div></div>`);
    this.compassEl = el(`<div class="compass" style="display:none"><svg class="needle" viewBox="0 0 6 46"><path d="M3 0 L6 23 L0 23Z" fill="#c0392b"/><path d="M3 46 L6 23 L0 23Z" fill="#2b1d14"/></svg><div class="cl">X</div></div>`);
    // the wind dial (upwind sailing, #5): camera-relative like the wheel. The red wedge is the no-go cone around where
    // the wind comes from (its arrow blows in from that side); the boat is your bow. Bow in the red = the sail luffs.
    this.speedEl = el(`<div class="speed"><div class="wind" role="img" aria-label="Wind dial: keep your bow out of the red wedge"><svg viewBox="-22 -22 44 44">`
      + `<circle r="20" fill="rgba(13,17,19,.35)" stroke="rgba(217,210,191,.35)" stroke-width="1.5"/>`
      + `<g class="wd-wind"><path class="wd-nogo" d="M0 0 L-10 -17.32 A20 20 0 0 1 10 -17.32 Z"/><path class="wd-arrow" d="M0 -21 L0 -11 M-3.2 -14.6 L0 -10.6 L3.2 -14.6"/></g>`
      + `<g class="wd-boat"><path class="wd-bowline" d="M0 -9 L0 -19.5"/><path class="wd-hull" d="M0 -10 C3.6 -5 3.8 3 2.8 8 L-2.8 8 C-3.8 3 -3.6 -5 0 -10Z"/></g>`
      + `</svg></div><div class="kn"><b>0.0</b> kn</div><small class="pos"></small></div>`);
    this.hitEl = el(`<div class="hit-flash"></div>`);
    this.digEl = el(`<div class="dig-meter" style="opacity:0"><div class="dm-text"></div><div class="dm-bar"><div class="dm-fill"></div></div></div>`);
    this.bannerEl = el(`<div class="region-banner"><div class="rb-inner"><div class="rb-title"></div><div class="rb-sub"></div></div></div>`);
    this.fadeEl = el(`<div class="fade"></div>`);
    this.engineEl = el(`<button class="engine-btn none"><b>⚙</b>ENGINE</button>`);
    this.engineEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      audio.unlock();
      this.game.toggleEngine();
    });
    // the radar: a small scope by default, tap to enlarge (remembered on this device only; never in the save)
    // (the range label sits outside the button so text-matching test helpers never mistake "LOOKOUT" for a button)
    this.radarEl = el(`<div class="radar-box"><button class="radar" aria-label="Radar: tap to enlarge"><canvas width="208" height="208"></canvas></button><span class="rl">RADAR</span></div>`);
    const scope = this.radarEl.querySelector('.radar') as HTMLElement;
    try {
      if (localStorage.getItem('scraptide.radarBig') === '1') scope.classList.add('big');
    } catch {
      /* ignore */
    }
    scope.addEventListener('click', (e) => {
      e.stopPropagation();
      audio.ui();
      const big = scope.classList.toggle('big');
      scope.setAttribute('aria-label', big ? 'Radar: tap to shrink' : 'Radar: tap to enlarge');
      try {
        localStorage.setItem('scraptide.radarBig', big ? '1' : '0');
      } catch {
        /* ignore */
      }
    });
    top.querySelector('.hud-right')!.append(this.radarEl, this.compassEl);
    // the helm: one bottom-left cluster (wind dial + speed and the engine toggle above the wheel); actions bottom-right
    const helm = el(`<div class="helm"><div class="helm-row"></div></div>`);
    helm.firstElementChild!.append(this.speedEl, this.engineEl);
    helm.append(stick);
    this.hud.append(this.hitEl, helm, this.actionsEl, this.toastsEl, this.wpEl, this.digEl, this.bannerEl);
    this.root.append(this.hud, this.fadeEl);

    // keyboard for desktop testing
    const keys = new Set<string>();
    const upd = () => {
      if (this.joy.active && !keys.size) return;
      const x = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
      const y = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
      this.joy.x = x;
      this.joy.y = y;
    };
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        keys.add(k);
        audio.unlock();
        upd();
      }
      if (k === ' ' || k === 'e') {
        const b = this.actionsEl.querySelector<HTMLElement>('.act:not(.secondary)');
        b?.click();
      }
      if (k === 'escape') {
        this.closeTray();
        this.closePanel();
      }
      if (k === 'q') this.game.toggleEngine();
    });
    window.addEventListener('keyup', (e) => {
      keys.delete(e.key.toLowerCase());
      upd();
    });
    this.applyCalm();
    this.refreshHUD();
  }

  /** Calm effects (Settings; on by default when the device asks for reduced motion). */
  applyCalm() {
    const on = !!this.store.data.settings.calm;
    document.body.classList.toggle('calm', on);
  }

  refreshHUD() {
    const s = this.store;
    this.goldEl.textContent = String(s.data.gold);
    const used = s.slotsUsed();
    const cap = s.stats.cargo;
    this.cargoEl.textContent = `${used}/${cap}`;
    const pill = this.cargoEl.parentElement!;
    pill.classList.toggle('full', used >= cap);
    pill.classList.toggle('over', used > cap);
    pill.title = used > cap ? `Hold over capacity by ${used - cap}: chests and story finds always come aboard. Dock to unload.` : '';
    if (used > cap && !this.holdOver) {
      this.toast(`Hold over capacity (${used}/${cap}). Chests and story finds always come aboard; dock to unload.`, { color: '#ffb9a8', life: 4.5 });
    }
    this.holdOver = used > cap;
    let q: { text: string; hint: string } = FIRST_VOYAGE.find((q) => q.id === s.data.quest)!;
    if (s.data.quest === 'free') q = GOALS[s.data.goal];
    const qt = this.questEl.querySelector('.q-text')!;
    if (qt.textContent !== q.text) {
      qt.textContent = q.text;
      this.questEl.classList.remove('pulse');
      void this.questEl.offsetWidth;
      this.questEl.classList.add('pulse');
    }
    this.questEl.querySelector('.q-hint')!.textContent = q.hint;
    // build goals: what's still needed, always visible (the hint only shows when the card is tapped open)
    const raw = s.data.quest === 'free' ? goalProgressText(s, GOALS[s.data.goal]?.id ?? '') : null;
    const need = raw && raw.includes(' · ') ? raw.split(' · ').map((p) => p.replace(/ /g, '\u00a0')).join(' · ') : raw; // never split an item across lines
    const qn = this.questEl.querySelector('.q-need') as HTMLElement;
    if (qn.textContent !== (need ?? '')) qn.textContent = need ?? '';
    qn.style.display = need ? '' : 'none';
    // the second road: one optional lead beside the main goal, tap to follow it instead
    const side = s.data.quest === 'free' ? this.game.sideLead() : null;
    const qs = this.questEl.querySelector('.q-side') as HTMLElement;
    const sideText = side ? `${s.data.followSide ? '▶' : 'Side:'} ${side.label}` : '';
    if (qs.textContent !== sideText) qs.textContent = sideText;
    qs.style.display = side ? '' : 'none';
    qs.classList.toggle('on', !!side && s.data.followSide);
    this.questEl.querySelector('.q-label')!.textContent = s.data.quest === 'free' ? `Captain’s Log · ${s.data.goal + 1}/${GOALS.length}` : `First Voyage · ${s.questIndex() + 1}/${FIRST_VOYAGE.length - 1}`;
  }

  setHUDVisible(v: boolean) {
    this.hud.style.display = v ? '' : 'none';
  }

  setActions(list: Action[]) {
    const key = JSON.stringify(list);
    if (key === this.lastActionsKey) return;
    this.lastActionsKey = key;
    this.actionsEl.innerHTML = '';
    list.forEach((a, i) => {
      const b = el(`<button class="act ${i > 0 ? 'secondary' : ''} ${a.glow ? 'glow' : ''} ${a.disabled ? 'disabled' : ''}">${a.label}</button>`);
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        audio.unlock();
        if (a.disabled) {
          audio.deny();
        } else audio.ui();
        this.onAction(a.id);
      });
      this.actionsEl.append(b);
    });
  }

  setWaypoint(screen: { x: number; y: number; angle: number; onScreen: boolean } | null, dist = 0) {
    if (!screen) {
      this.wpEl.style.opacity = '0';
      return;
    }
    this.wpEl.style.opacity = '1';
    this.wpEl.style.left = `${screen.x}px`;
    this.wpEl.style.top = `${screen.y}px`;
    (this.wpEl.querySelector('svg') as SVGElement).style.transform = `rotate(${screen.angle}rad)`;
    this.wpEl.querySelector('.wp-dist')!.textContent = `${Math.round(dist)}m`;
  }

  setCompass(angle: number | null, label = 'X') {
    if (angle === null) {
      this.compassEl.style.display = 'none';
      return;
    }
    this.compassEl.style.display = '';
    (this.compassEl.querySelector('.needle') as SVGElement).style.transform = `rotate(${angle}rad)`;
    this.compassEl.querySelector('.cl')!.textContent = label;
  }

  /**
   * Speed readout and wind dial. `windAngle` is the screen angle the wind blows toward (clockwise from up). With
   * `sail`, the dial also shows the bow (`heading`, same convention) against the no-go wedge, and the label names the
   * point of sail; `luff` (0..1) lights the wedge while the sail is luffing.
   */
  setSpeed(knots: number | null, windAngle: number, eff: number, motoring = false, sail?: { heading: number; point: PointOfSail; luff: number }) {
    if (knots === null) {
      this.speedEl.style.display = 'none';
      return;
    }
    this.speedEl.style.display = '';
    // the wedge and arrow sit on the side the wind comes from: half a turn from where it blows
    (this.speedEl.querySelector('.wd-wind') as SVGElement).style.transform = `rotate(${windAngle + Math.PI}rad)`;
    (this.speedEl.querySelector('.wd-boat') as SVGElement).style.transform = `rotate(${sail ? sail.heading : 0}rad)`;
    const luffing = !!sail && !motoring && sail.luff > 0.5;
    this.speedEl.classList.toggle('luffing', luffing);
    const kn = this.speedEl.querySelector('.kn')!;
    kn.querySelector('b')!.textContent = knots.toFixed(1);
    const sm = this.speedEl.querySelector('small')!;
    const pos = sail && !motoring ? SAIL_LABEL[sail.point] : null;
    const label = motoring ? 'under power' : pos ? pos.label : eff > 0.92 ? 'good wind' : eff > 0.7 ? 'fair wind' : 'into the wind';
    if (sm.textContent !== label) {
      sm.textContent = label;
      sm.className = `pos ${motoring ? 'power' : pos ? pos.cls : eff > 0.92 ? 'good' : eff > 0.7 ? '' : 'bad'}`;
    }
  }

  /** Red edge flash when the hull takes a hit; a slow pulse while it is critical. */
  hit() {
    this.hitEl.classList.remove('on');
    void this.hitEl.offsetWidth;
    this.hitEl.classList.add('on');
  }
  /**
   * The trip strip (loop pass Phase 1): what the hold is worth, how far the nearest dock is (the arrow points at
   * it, camera-relative), and the squall clock. `left` null = no clock on this trip (the First Voyage).
   */
  setTrip(t: { hold: number; dock: number; dockAngle: number; left: number | null; frac: number; phase: string; show: boolean }) {
    const strip = this.hud.querySelector('.trip') as HTMLElement;
    strip.style.display = t.show ? '' : 'none';
    if (!t.show) return;
    const key = `${t.hold}|${Math.round(t.dock / 5)}|${Math.round(t.dockAngle * 20)}|${t.left === null ? '-' : Math.ceil(t.left)}|${t.phase}`;
    if (key === this.lastTrip) return;
    this.lastTrip = key;
    const hold = strip.querySelector('.t-hold b')!;
    if (hold.textContent !== String(t.hold)) {
      hold.textContent = String(t.hold);
      strip.querySelector('.t-hold')!.classList.remove('bump');
      void (strip.querySelector('.t-hold') as HTMLElement).offsetWidth;
      strip.querySelector('.t-hold')!.classList.add('bump');
    }
    strip.querySelector('.t-dock b')!.textContent = t.dock >= 1000 ? `${(t.dock / 1000).toFixed(1)}k` : String(Math.round(t.dock / 5) * 5);
    (strip.querySelector('.t-dock svg') as SVGElement).style.transform = `rotate(${t.dockAngle}rad)`;
    const bar = strip.querySelector('.t-bar') as HTMLElement;
    const clock = strip.querySelector('.t-clock') as HTMLElement;
    bar.style.display = clock.style.display = t.left === null ? 'none' : '';
    (bar.firstElementChild as HTMLElement).style.width = `${Math.round(Math.min(1, t.frac) * 100)}%`;
    clock.textContent = t.left === null ? '' : t.phase === 'squall' ? 'SQUALL!' : `⛈ ${clockText(t.left)}`;
    strip.dataset.phase = t.phase;
  }
  private lastTrip = '';

  /** The Daily Tide's end screen: score breakdown, the shareable emoji result and the streak (loop pass Phase 3). */
  dailyEnd(date: string, sc: { banked: number; perfects: number; events: number; legendary: number; sunk: boolean; total: number }, streak: number, share: string, best: boolean) {
    audio.discover(sc.sunk ? 0 : 4);
    this.queueReveal(() => {
      const row = (k: string, v: string) => `<tr><td>${k}</td><td>${v}</td></tr>`;
      const node = el(`<div class="reveal daily-end"><div class="reveal-card" style="--rc:#f0c445"><div class="rays"></div>
        <div class="r-kicker">Daily Tide · ${date}</div>
        <div class="r-name">${sc.sunk ? 'Swamped' : `${sc.total} points`}${best ? ' <span class="best">new best</span>' : ''}</div>
        <table class="d-score">${row('Hold banked', `${sc.banked}g`)}${row('Perfect pulls', `${sc.perfects} × 10`)}${row('Sea events beaten', `${sc.events} × 25`)}${row('Legendary finds', `${sc.legendary} × 50`)}${sc.sunk ? row('Swamped', 'score 0') : ''}<tr class="tot"><td>Total</td><td>${sc.total}</td></tr></table>
        <div class="d-streak">🔥 <b>${streak}</b>-day streak</div>
        <pre class="d-share">${share}</pre>
        <div class="d-btns"><button class="btn ghost r-ok">Done</button><button class="btn d-copy">Share result</button></div>
        <div class="note">A new Daily Tide every day at 00:00 UTC. Free play is always open.</div></div></div>`);
      node.querySelector('.d-copy')!.addEventListener('click', async (e) => {
        e.stopPropagation();
        const b = e.currentTarget as HTMLElement;
        try {
          if (navigator.share) await navigator.share({ text: share });
          else await navigator.clipboard.writeText(share);
          b.textContent = 'Copied ✔';
        } catch {
          b.textContent = 'Select the text above to copy';
        }
      });
      return node;
    });
  }

  /** The balloon spotted something: a short ping toast (loop pass Phase 4). */
  markPing(kind: string) {
    const label: Record<string, string> = { wreck: 'Wreck', wreck_rare: 'Rare wreck', wreck_legendary: 'LEGENDARY wreck', storm: 'Storm edge', wave: 'Rogue wave', rival: 'Rival' };
    this.toast(`Marked: ${label[kind] ?? kind}`, { color: kind === 'wreck_legendary' ? '#f0c445' : kind === 'wreck_rare' ? '#4f9ad8' : '#d9cfb4', life: 1.6 });
    audio.ui();
  }

  /** A big, short banner in the middle of the screen (banking a hold, a perfect haul). */
  stamp(title: string, sub = '', color = '#f0c445') {
    const n = el(`<div class="stamp" style="--sc:${color}"><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</div>`);
    this.hud.append(n);
    setTimeout(() => n.remove(), 2100);
  }

  private stickEl!: HTMLElement;
  private wheelEl!: SVGElement;
  /** Swap the helm wheel for the vessel you're sailing (called whenever the ship is rebuilt). */
  setWheel(vessel: string) {
    if (!this.stickEl || this.stickEl.dataset.vessel === vessel) return;
    this.stickEl.dataset.vessel = vessel;
    const t = document.createElement('template');
    t.innerHTML = wheelSVG(vessel).trim();
    const svg = t.content.firstElementChild as unknown as SVGElement;
    this.wheelEl.replaceWith(svg);
    this.wheelEl = svg;
  }

  setCritical(on: boolean) {
    this.hud.classList.toggle('hull-critical', on);
  }

  setStatus(st: StatusInfo) {
    const key = `${Math.round(st.fuel)}|${Math.round(st.fuelCap)}|${Math.round(st.hull)}|${Math.round(st.hullMax)}|${st.clock}|${st.weather}|${st.engine}|${st.engineOn}|${st.sailing}`;
    if (key === this.lastStatus) return;
    this.lastStatus = key;
    const fuel = this.hud.querySelector('.gauge.fuel') as HTMLElement;
    const hull = this.hud.querySelector('.gauge.hull') as HTMLElement;
    const fk = st.fuel / st.fuelCap, hk = st.hull / st.hullMax;
    (fuel.firstElementChild as HTMLElement).style.width = `${Math.round(fk * 100)}%`;
    (hull.firstElementChild as HTMLElement).style.width = `${Math.round(hk * 100)}%`;
    fuel.lastElementChild!.textContent = `FUEL ${Math.round(st.fuel)}/${Math.round(st.fuelCap)}`;
    hull.lastElementChild!.textContent = `HULL ${Math.round(st.hull)}/${Math.round(st.hullMax)}`;
    fuel.classList.toggle('low', fk < 0.2 && st.engine);
    hull.classList.toggle('low', hk < 0.3);
    fuel.style.display = st.engine ? '' : 'none';
    this.hud.querySelector('.clock')!.textContent = `${st.clock} · ${st.phase} · ${st.weather}`;
    this.engineEl.classList.toggle('on', st.engineOn);
    this.engineEl.classList.toggle('none', !st.engine);
    this.engineEl.style.display = st.sailing ? '' : 'none';
  }

  /** Minimap: blips relative to the player, rotated so "up" is the camera's forward. */
  setRadar(blips: { x: number; z: number; kind: string }[], range: number, heading: number, camYaw: number, hasRadar: boolean) {
    const c = this.radarEl.querySelector('canvas') as HTMLCanvasElement;
    const ctx = c.getContext('2d')!;
    const W = c.width, R = W / 2;
    ctx.clearRect(0, 0, W, W);
    ctx.strokeStyle = 'rgba(226,170,80,.24)'; // salvaged amber CRT: green is reserved for living things
    ctx.lineWidth = 2;
    for (const k of [0.33, 0.66]) {
      ctx.beginPath();
      ctx.arc(R, R, R * k, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(R, 6); ctx.lineTo(R, W - 6); ctx.moveTo(6, R); ctx.lineTo(W - 6, R);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.lineWidth = 2;
    if (hasRadar) {
      const sweep = (performance.now() / 1000) * 2.2;
      const g = ctx.createConicGradient ? ctx.createConicGradient(sweep, R, R) : null;
      if (g) {
        g.addColorStop(0, 'rgba(236,180,90,.4)');
        g.addColorStop(0.12, 'rgba(236,180,90,0)');
        g.addColorStop(1, 'rgba(236,180,90,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(R, R, R, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const cos = Math.cos(camYaw), sin = Math.sin(camYaw);
    const col: Record<string, string> = { site: '#e8b83a', site_done: 'rgba(232,184,58,.32)', town: '#9fd0c8', cache: '#d9c8a0', raider: '#ff5a2a', castaway: '#f2ede0', plant: LIVING_GREEN, wreck: '#d9cfb4', wreck_rare: '#4f9ad8', wreck_legendary: '#f0c445', boat: '#ffffff', mark: '#ffffff', mark_storm: '#9aa9b4', mark_wave: '#e9fbf6', mark_rival: '#ff7a5c' };
    for (const b of blips) {
      // world → screen: camera forward is up
      const fx = b.x * sin + b.z * cos; // forward component
      const rx = -b.x * cos + b.z * sin; // right component
      let px = rx / range, py = -fx / range;
      const len = Math.hypot(px, py);
      if (len > 0.92) {
        px *= 0.92 / len;
        py *= 0.92 / len;
      }
      ctx.fillStyle = col[b.kind] ?? '#fff';
      ctx.beginPath();
      const r = b.kind === 'town' ? 8 : b.kind === 'raider' ? 7 : b.kind === 'wreck_legendary' ? 8 + Math.sin(performance.now() / 200) * 1.5 : b.kind === 'wreck_rare' ? 7 : b.kind === 'plant' ? 5 + Math.sin(performance.now() / 260) * 1.5 : 6;
      if (b.kind === 'raider') {
        ctx.moveTo(R + px * R, R + py * R - r);
        ctx.lineTo(R + px * R + r, R + py * R + r);
        ctx.lineTo(R + px * R - r, R + py * R + r);
      } else ctx.arc(R + px * R, R + py * R, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // player arrow
    const rel = heading - camYaw;
    ctx.save();
    ctx.translate(R, R);
    ctx.rotate(-rel);
    ctx.fillStyle = '#e8f2e8';
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(7, 8);
    ctx.lineTo(0, 4);
    ctx.lineTo(-7, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    this.radarEl.querySelector('.rl')!.textContent = hasRadar ? `RADAR · ${range}m` : 'LOOKOUT';
  }

  /** Winch mini-game: tap REEL while the needle is in the green. Resolves hits (0..pulls), or -1 if cancelled. */
  /** Perfect pulls in the last winch game (read by Salvage after it resolves). */
  lastPerfects = 0;

  openWinch(o: { title: string; sub: string; window: number; speed: number; pulls: number; crane?: boolean; perfectShare?: number }): Promise<number> {
    return new Promise((resolve) => {
      this.panelOpen = true;
      this.lastPerfects = 0;
      const wrap = el(`<div class="winch-wrap"><div class="winch"><h3>${o.crane ? '🏗 ' : ''}${o.title}</h3><div class="w-sub">${o.sub}</div>
        <div class="w-track"><div class="w-zone"><div class="w-perfect"></div></div><div class="w-needle"></div></div>
        <div class="w-pips">${'<i></i>'.repeat(o.pulls)}</div>
        <button class="act w-reel">${o.crane ? 'LIFT!' : 'REEL IN!'}</button><div class="w-msg">Tap in the green. Gold centre = bonus loot</div>
        <button class="btn ghost w-cancel" style="margin-top:6px">Cut the line</button></div></div>`);
      this.root.append(wrap);
      const zone = wrap.querySelector('.w-zone') as HTMLElement;
      const perfect = wrap.querySelector('.w-perfect') as HTMLElement;
      const needle = wrap.querySelector('.w-needle') as HTMLElement;
      const msg = wrap.querySelector('.w-msg') as HTMLElement;
      const pips = [...wrap.querySelectorAll('.w-pips i')] as HTMLElement[];
      let zx = 0.5, hits = 0, perfects = 0, pull = 0, t = Math.random() * 3, raf = 0, lock = false;
      const share = Math.min(0.7, PERFECT_SHARE + (o.perfectShare ?? 0));
      perfect.style.width = `${share * 100}%`;
      perfect.style.left = `${((1 - share) / 2) * 100}%`;
      const place = () => {
        zx = 0.15 + Math.random() * (0.7 - o.window);
        zone.style.left = `${zx * 100}%`;
        zone.style.width = `${o.window * 100}%`;
      };
      place();
      let last = performance.now();
      const pos = () => 0.5 + 0.48 * Math.sin(t * o.speed * 2.4) * Math.cos(t * o.speed * 0.7);
      const tick = (now: number) => {
        t += (now - last) / 1000;
        last = now;
        if (!lock) needle.style.left = `${pos() * 100}%`;
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      const done = (v: number) => {
        cancelAnimationFrame(raf);
        wrap.remove();
        this.panelOpen = false;
        this.lastPerfects = v < 0 ? 0 : perfects;
        resolve(v);
      };
      wrap.querySelector('.w-reel')!.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (lock) return;
        const grade = pullGrade(pos(), zx, o.window, share);
        const ok = grade !== 'miss';
        pips[pull].classList.add(grade === 'perfect' ? 'perfect' : ok ? 'hit' : 'miss');
        if (ok) hits++;
        if (grade === 'perfect') perfects++;
        pull++;
        audio.reel(ok);
        if (grade === 'perfect') audio.perfect();
        this.game.haptic(grade === 'perfect' ? [20, 30, 40] : ok ? 25 : [10, 30, 10]);
        msg.textContent = grade === 'perfect' ? 'PERFECT! Bonus loot!' : ok ? ['Got a bite of steel!', 'It’s coming up!', 'Heavy… heavy… YES!'][hits - 1] ?? 'Hauled!' : 'Slipped, but it’s still on the hook';
        msg.style.color = grade === 'perfect' ? '#a87400' : ok ? '#0e6670' : '#8a5a2a';
        wrap.querySelector('.winch')!.classList.remove('w-pop');
        void (wrap.querySelector('.winch') as HTMLElement).offsetWidth;
        if (grade === 'perfect') wrap.querySelector('.winch')!.classList.add('w-pop');
        lock = true;
        setTimeout(() => {
          lock = false;
          if (pull >= o.pulls) done(hits);
          else place();
        }, 520);
      });
      wrap.querySelector('.w-cancel')!.addEventListener('click', () => done(-1));
    });
  }

  /**
   * The harpoon: a quick, non-blocking timing ring (loop pass Phase 1). A ring closes on the target; tap HARPOON when
   * it lands on the gold band. Resolves 'perfect' | 'hit' | 'miss' (a miss just means try again).
   */
  harpoonRing(label: string): Promise<'perfect' | 'hit' | 'miss'> {
    return new Promise((resolve) => {
      this.harpoonEl?.remove();
      const wrap = el(`<div class="harpoon-ring" role="button" aria-label="Harpoon: tap when the ring meets the band"><svg viewBox="0 0 120 120"><circle class="hr-band" cx="60" cy="60" r="24"/><circle class="hr-perfect" cx="60" cy="60" r="24"/><circle class="hr-ring" cx="60" cy="60" r="56"/><path class="hr-x" d="M60 50v20M50 60h20"/></svg><div class="hr-label">${label}</div></div>`);
      this.harpoonEl = wrap;
      this.hud.append(wrap);
      const ring = wrap.querySelector('.hr-ring') as SVGCircleElement;
      const DUR = 1.3;
      const t0 = performance.now();
      wrap.dataset.t0 = String(t0); // tests time their tap from the ring's own clock
      let raf = 0, over = false;
      const radius = () => {
        const k = ((performance.now() - t0) / 1000) / DUR;
        return 56 - k * 50; // 56 → 6
      };
      const finish = (g: 'perfect' | 'hit' | 'miss') => {
        if (over) return;
        over = true;
        cancelAnimationFrame(raf);
        wrap.classList.add(`hr-${g}`);
        setTimeout(() => wrap.remove(), 380);
        if (this.harpoonEl === wrap) this.harpoonEl = null;
        resolve(g);
      };
      const tick = () => {
        const r = radius();
        if (r <= 6) return finish('miss');
        ring.setAttribute('r', String(r));
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      wrap.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        const d = Math.abs(radius() - 24);
        finish(d <= 4 ? 'perfect' : d <= 11 ? 'hit' : 'miss');
      });
    });
  }
  private harpoonEl: HTMLElement | null = null;

  setDigMeter(heat: number | null, text = '') {
    if (heat === null) {
      this.digEl.style.opacity = '0';
      return;
    }
    this.digEl.style.opacity = '1';
    this.digEl.querySelector('.dm-text')!.textContent = text;
    (this.digEl.querySelector('.dm-fill') as HTMLElement).style.width = `${Math.round(heat * 100)}%`;
  }

  banner(title: string, sub: string) {
    this.bannerEl.querySelector('.rb-title')!.textContent = title;
    this.bannerEl.querySelector('.rb-sub')!.textContent = sub;
    this.bannerEl.classList.add('show');
    clearTimeout((this.bannerEl as any)._t);
    (this.bannerEl as any)._t = setTimeout(() => this.bannerEl.classList.remove('show'), 3800);
  }

  async fade(fn: () => void) {
    this.fadeEl.classList.add('on');
    await new Promise((r) => setTimeout(r, 460));
    fn();
    await new Promise((r) => setTimeout(r, 120));
    this.fadeEl.classList.remove('on');
  }

  toast(text: string, opts: { icon?: string; color?: string; life?: number } = {}) {
    const t = el(`<div class="toast" style="--c:${opts.color ?? '#f4c542'};--life:${opts.life ?? 2.6}s">${opts.icon ? iconSVG(opts.icon, { size: 28 }) : ''}<span>${text}</span></div>`);
    this.toastsEl.append(t);
    while (this.toastsEl.children.length > 4) this.toastsEl.firstElementChild!.remove();
    setTimeout(() => t.remove(), (opts.life ?? 2.6) * 1000 + 500);
  }

  // ───────── reveals ─────────
  private queueReveal(make: () => HTMLElement) {
    this.revealQueue.push(make);
    if (!this.revealOpen) this.nextReveal();
  }
  private nextReveal() {
    const make = this.revealQueue.shift();
    if (!make) {
      this.revealOpen = false;
      return;
    }
    this.revealOpen = true;
    const node = make();
    const close = () => {
      node.remove();
      audio.ui();
      this.nextReveal();
    };
    node.querySelector('.r-ok')?.addEventListener('click', (e) => {
      e.stopPropagation();
      close();
    });
    this.root.append(node);
  }

  revealItem(id: string, n: number, isNew: boolean) {
    const d = item(id);
    const rc = RARITY_COLOR[d.rarity];
    const alive = isLiving(id);
    audio.discover(RARITY_ORDER.indexOf(d.rarity));
    if (alive || RARITY_ORDER.indexOf(d.rarity) >= 2) pack.sting('discovery', 0.75);
    if (alive && this.store.hasRole('lookout')) setTimeout(() => pack.say('kai_green', 600), 1500);
    this.queueReveal(() =>
      el(`<div class="reveal${alive ? ' living' : ''}"><div class="reveal-card" style="--rc:${alive ? LIVING_GREEN : rc}"><div class="rays"></div>
        ${alive ? '<div class="alive-stamp">ALIVE</div>' : ''}
        <div class="r-kicker">${alive ? 'Living green' : isNew ? 'New Discovery!' : 'Found'}</div>
        <div class="r-icon">${iconSVG(id, { size: 120 })}</div>
        <div class="r-name">${d.name}${n > 1 ? ` ×${n}` : ''}</div>
        <span class="r-rarity" style="background:${rc}">${RARITY_LABEL[d.rarity]} · ${CATEGORY_LABEL[d.category]}</span>
        <div class="r-desc">${d.desc}</div>
        <button class="btn r-ok" style="min-width:160px">${isNew ? 'Add to Catalog' : 'Stow it'}</button></div></div>`)
    );
  }

  revealChest(title: string, loot: { id: string; n: number }[], sub: string, best: Tier = 'common') {
    // loot pass Phase 2: rarest first; each chip flips in with its tier colour; Rare and Legendary get a stamp
    const sorted = [...loot].sort((a, b) => tierRank(tierOf(b.id)) - tierRank(tierOf(a.id)));
    const hi = best === 'rare' || best === 'legendary';
    const rc = hi ? TIER_COLOR[best] : '#ffd25e';
    if (hi) setTimeout(() => audio.discover(best === 'legendary' ? 5 : 3), 350);
    this.queueReveal(() =>
      el(`<div class="reveal tier-${best}"><div class="reveal-card" style="--rc:${rc}"><div class="rays"></div>
        ${hi ? `<div class="tier-stamp" style="--tc:${TIER_COLOR[best]}">${TIER_LABEL[best].toUpperCase()} FIND</div>` : ''}
        <div class="r-kicker">${sub}</div>
        <div class="r-name">${title}</div>
        <div class="r-loot">${sorted.map((l, i) => { const t = tierOf(l.id); return `<div class="lchip tchip t-${t}" style="--c:${TIER_COLOR[t]};animation-delay:${0.25 + i * 0.16}s">${iconSVG(l.id, { size: 30 })}<span>${item(l.id).name}${l.n > 1 ? ` ×${l.n}` : ''}</span><em>${TIER_LABEL[t]}</em></div>`; }).join('')}</div>
        <button class="btn r-ok" style="min-width:160px">Haul it aboard</button></div></div>`)
    );
  }

  /** A living plant comes aboard: the one card in the game that is green. */
  revealLiving(loot: { id: string; n: number }[], where: string) {
    const main = loot.find((l) => isLiving(l.id)) ?? loot[0];
    const d = item(main.id);
    const rarer = RARITY_ORDER.indexOf(d.rarity);
    this.queueReveal(() =>
      el(`<div class="reveal living"><div class="reveal-card" style="--rc:${LIVING_GREEN}"><div class="rays"></div>
        <div class="alive-stamp">ALIVE</div>
        <div class="r-kicker">Found growing on ${where}</div>
        <div class="r-icon">${iconSVG(main.id, { size: 120 })}</div>
        <div class="r-name">${d.name}</div>
        <span class="r-rarity" style="background:${RARITY_COLOR[d.rarity]}">${RARITY_LABEL[d.rarity]} · Living green</span>
        <div class="r-desc">${d.desc}</div>
        ${loot.length > 1 ? `<div class="r-loot">${loot.map((l, i) => `<div class="lchip" style="--c:${isLiving(l.id) ? LIVING_GREEN : RARITY_COLOR[item(l.id).rarity]};animation-delay:${0.15 + i * 0.12}s">${iconSVG(l.id, { size: 30 })}${item(l.id).name}${l.n > 1 ? ` ×${l.n}` : ''}</div>`).join('')}</div>` : ''}
        <div class="r-note">${rarer >= 3 ? 'Every settlement on the water will want this. Keep it out of the salt and away from raiders.' : rarer >= 2 ? 'A healthy green plant. People will stop you on the dock to look at it.' : 'Small, but alive. Out here that counts for a lot.'}</div>
        <button class="btn r-ok living-ok" style="min-width:160px">Shelter it aboard</button></div></div>`)
    );
  }

  revealFragment(fragId: string, mapComplete: boolean) {
    const f = FRAGMENT_MAP[fragId];
    const m = TREASURE_MAPS.find((m) => m.id === f.mapId)!;
    audio.discover(3);
    this.queueReveal(() => {
      const node = el(`<div class="reveal"><div class="reveal-card" style="--rc:#c0392b"><div class="rays"></div>
        <div class="r-kicker">${mapComplete ? 'Map complete!' : 'Map fragment found'}</div>
        <div class="r-name">${f.name}</div>
        <canvas class="map-canvas" style="position:relative;margin-top:8px"></canvas>
        <div class="r-desc">${mapComplete ? 'All the pieces fit. Study it in MAPS.' : `Part of “${m.name}”. The rest is somewhere else…`}</div>
        <button class="btn r-ok" style="min-width:160px">${mapComplete ? 'Study the map' : 'Keep it safe'}</button></div></div>`);
      drawTreasureMap(node.querySelector('canvas')!, m, this.store.data.fragments);
      if (mapComplete) node.querySelector('.r-ok')!.addEventListener('click', () => setTimeout(() => this.openPanel('maps', m.id), 50));
      return node;
    });
  }

  revealMilestone(name: string, desc: string, reward: string) {
    audio.discover(4);
    this.queueReveal(() =>
      el(`<div class="reveal"><div class="reveal-card" style="--rc:#4f9a95"><div class="rays"></div>
        <div class="r-kicker">Collection Milestone</div>
        <div class="r-name">${name}</div>
        <div class="r-desc">${desc}<br><br><b>Reward:</b> ${reward}</div>
        <button class="btn r-ok" style="min-width:160px">Splendid!</button></div></div>`)
    );
  }

  /**
   * A choice card: one button per option, each closes the card and runs its pick. (The first option comes first in
   * the DOM, so scripted players that tap "the reveal button" make a choice instead of stalling.)
   */
  revealChoice(kicker: string, title: string, body: string, options: { label: string; sub?: string; pick: () => void }[]) {
    this.queueReveal(() => {
      const node = el(`<div class="reveal"><div class="reveal-card" style="--rc:#d6a62a"><div class="rays"></div>
        <div class="r-kicker">${kicker}</div><div class="r-name">${title}</div><div class="r-desc">${body}</div>
        <div class="choices">${options.map((o, i) => `<button class="btn ${i ? 'ghost' : ''} choice" data-i="${i}">${o.label}${o.sub ? `<small>${o.sub}</small>` : ''}</button>`).join('')}</div>
        <button class="r-ok" hidden></button></div></div>`);
      node.querySelectorAll<HTMLElement>('.choice').forEach((b) => b.addEventListener('click', (e) => {
        e.stopPropagation();
        options[Number(b.dataset.i)].pick();
        (node.querySelector('.r-ok') as HTMLElement).click();
      }));
      return node;
    });
  }

  /** Name your boat: a text field and a few names the Drift would give her. */
  promptShipName(current: string, onName: (name: string) => void) {
    this.queueReveal(() => {
      const picks = [...SHIP_NAMES].sort(() => Math.random() - 0.5).slice(0, 4);
      const node = el(`<div class="reveal"><div class="reveal-card" style="--rc:#d6a62a"><div class="rays"></div>
        <div class="r-kicker">Every boat on the water has a name</div><div class="r-name">Name her</div>
        <div class="r-desc">Paint it on the stern. Marlo will call her by it, and so will everyone else.</div>
        <input class="ship-name" maxlength="24" autocomplete="off" spellcheck="false" placeholder="${picks[0]}" value="${current.replace(/"/g, '')}">
        <div class="name-picks">${picks.map((n) => `<span class="pick" role="button" tabindex="0">${n}</span>`).join('')}</div>
        <button class="btn r-ok" style="min-width:160px">Paint it on</button></div></div>`);
      const input = node.querySelector('input') as HTMLInputElement;
      node.querySelectorAll<HTMLElement>('.pick').forEach((b) => b.addEventListener('click', (e) => {
        e.stopPropagation();
        input.value = b.textContent ?? '';
      }));
      node.querySelector('.r-ok')!.addEventListener('click', () => onName((input.value.trim() || input.placeholder).slice(0, 24)));
      return node;
    });
  }

  revealInfo(kicker: string, title: string, body: string, btn = 'Aye') {
    this.queueReveal(() =>
      el(`<div class="reveal"><div class="reveal-card" style="--rc:#4aa3ff"><div class="rays"></div>
        <div class="r-kicker">${kicker}</div><div class="r-name">${title}</div><div class="r-desc">${body}</div>
        <button class="btn r-ok" style="min-width:160px">${btn}</button></div></div>`)
    );
  }

  // ───────── title ─────────
  showTitle(isNew: boolean) {
    this.setHUDVisible(false);
    const node = el(`<div class="title-screen"><div class="ts-inner">
      <div class="ts-kicker">Year 61 · After the Water</div>
      <h1 class="ts-logo">${wordmarkSVG()}</h1>
      <div class="ts-sub">The world drowned. You didn’t.</div>
      <button class="act glow">${isNew ? 'Set Sail' : 'Continue Voyage'}</button>
      <div class="ts-small">${isNew ? 'Best with sound on · Add to Home Screen for full-screen' : `${this.store.discoveryCount} discoveries · ${this.store.data.gold} gold · ${VESSELS[this.store.data.vessel].name}`}</div>
    </div></div>`);
    node.querySelector('.act')!.addEventListener('click', () => {
      audio.unlock();
      audio.ui();
      node.remove();
      this.setHUDVisible(true);
      this.game.start();
    });
    this.root.append(node);
  }

  // ───────── panels ─────────
  closePanel() {
    if (!this.sheet) return;
    this.sheet.remove();
    this.sheet = null;
    this.panelOpen = false;
    this.mapOpen = false;
    this.game.setShowcase(false);
  }

  private openSheet(title: string, sub: string, opts: { short?: boolean } = {}) {
    this.closePanel();
    this.panelOpen = true;
    const wrap = el(`<div class="sheet-wrap"><div class="sheet" ${opts.short ? 'style="max-height:58%"' : ''}>
      <div class="sheet-head"><div style="flex:1"><h2>${title}</h2><div class="sub">${sub}</div></div><button class="close-btn">✕</button></div>
      <div class="tabs" style="display:none"></div>
      <div class="sheet-body"></div></div></div>`);
    if (opts.short) wrap.style.background = 'transparent';
    wrap.addEventListener('pointerdown', (e) => {
      if (e.target === wrap) this.closePanel();
    });
    wrap.querySelector('.close-btn')!.addEventListener('click', () => {
      audio.ui();
      this.closePanel();
    });
    this.root.append(wrap);
    this.sheet = wrap;
    return { body: wrap.querySelector('.sheet-body') as HTMLElement, tabs: wrap.querySelector('.tabs') as HTMLElement, wrap };
  }

  private setTabs(tabsEl: HTMLElement, tabs: { id: string; label: string }[], current: string, onPick: (id: string) => void) {
    tabsEl.style.display = '';
    tabsEl.innerHTML = '';
    for (const t of tabs) {
      const b = el(`<button class="tab ${t.id === current ? 'on' : ''}">${t.label}</button>`);
      b.addEventListener('click', () => {
        audio.ui();
        onPick(t.id);
      });
      tabsEl.append(b);
    }
  }

  openPanel(name: string, arg?: string) {
    switch (name) {
      case 'catalog':
        return this.catalogPanel(arg as Category | undefined);
      case 'maps':
        return this.mapsPanel(arg);
      case 'ship':
        return this.shipPanel();
      case 'cargo':
        return this.cargoPanel();
      case 'settings':
        return this.settingsPanel();
      case 'harbor':
        this.greetings.clear(); // a fresh visit: people say something new
        return this.harborPanel();
      case 'appraiser':
        return this.appraiserPanel();
      case 'shipwright':
        return this.shipwrightPanel();
      case 'cartographer':
        return this.cartographerPanel();
      case 'curios':
        return this.curiosPanel();
      case 'workbench':
        return this.workbenchPanel();
      case 'crewboard':
        return this.crewBoardPanel();
    }
  }

  // Settlement hub (Driftholm, Rooftop Hollow, Rig Helios)
  harborPanel() {
    const sett = this.game.dockedSettlement() ?? SETTLEMENT_MAP.driftholm;
    const home = sett.id === 'driftholm';
    const { body } = this.openSheet(sett.name, home ? 'Home raft-town · your cargo is unloaded into the vault' : `${sett.kind} · trade straight from your hold`);
    const s = this.store;
    const npc = SETTLEMENT_NPCS[sett.id];
    const vaultCount = s.data.vault.reduce((a, b) => a + b.n, 0);
    const sellable = [...s.data.vault, ...s.data.cargo].filter((v) => item(v.id).category !== 'resource').length;
    const st = s.stats;
    // who's aboard and what's in the hold colours what people say (src/data/characters.ts)
    const ctx: Record<string, boolean> = {
      sellable: sellable > 0, empty: sellable === 0,
      green: [...s.data.vault, ...s.data.cargo].some((v) => isLiving(v.id)),
      fragment: s.data.fragments.length > s.data.mapsCompleted.length,
      reach: s.data.regionsSeen.includes('emerald'),
      bare: s.data.upgrades.length === 0,
      damaged: s.data.hull < st.hullMax * 0.6,
      sloop: s.data.vessel === 'sloop', brig: s.data.vessel === 'brig', ironwake: s.data.vessel === 'ironwake',
      repelled: s.data.raidersRepelled > 0,
      tomas_aboard: s.data.crew.includes('tomas'), juno_aboard: s.data.crew.includes('juno'),
      named: !!s.data.shipName,
    };
    const greet = (id: string) => {
      const kept = this.greetings.get(id);
      if (kept !== undefined) return kept;
      const text = pickLine(id, 'dock', ctx, { recent: this.npcRecent });
      if (text) this.npcRecent.add(text);
      if (this.npcRecent.size > 24) this.npcRecent.delete(this.npcRecent.values().next().value!);
      const out = text ? `“${text.replace('{ship}', s.data.shipName)}”` : '';
      this.greetings.set(id, out);
      return out;
    };
    let html = `<div class="speech">${sett.blurb}</div>`;
    if (sett.services.includes('appraiser')) html += this.npcCard(npc.trader, 'appraiser', greet(npc.trader));
    if (sett.services.includes('shipwright')) html += this.npcCard(npc.wright, 'shipwright', greet(npc.wright));
    if (sett.services.includes('cartographer')) html += this.npcCard('wren', 'cartographer', greet('wren'));
    if (sett.services.includes('curios')) html += this.npcCard('odessa', 'curios', greet('odessa'));
    const recruitable = CREW.filter((c) => (c.home === sett.id || (home && c.home === 'castaway' && s.data.castaways.some((cw) => cw.endsWith(c.id)))) && !s.data.crew.includes(c.id));
    // the work board (PR 2.2): jobs here, jobs done here, and what this port thinks of you
    const port = sett.id as PortId;
    const standing = s.data.standing[port] ?? 0;
    const rank = standingRank(standing);
    const disc = s.portDiscount(port);
    const mine = s.data.contracts.active.map((a) => ({ a, c: CONTRACT_MAP[a.id] })).filter((x) => x.c);
    const here = mine.filter((x) => x.c.port === port);
    const board = boardFor(port, s.data).slice(0, 3);
    // dock contracts (loop pass Phase 2): three rotating jobs, paid when you dock, refilled straight away
    const today = this.game.today();
    const best = s.data.daily.best[today];
    html += `<button class="act daily-btn">🌊 DAILY TIDE · ${today}<small>${best !== undefined ? `today's best ${best} · ` : ''}🔥 ${s.data.daily.last && s.data.daily.last !== today ? s.data.daily.streak : s.data.daily.streak || 0}-day streak · same sea for everyone</small></button>`;
    html += `<div class="section-title">Dock board <small>${s.data.jobs.done} done · paid on docking</small></div>`;
    for (const j of s.data.jobs.board) {
      const prog = j.kind === 'bank' ? `${Math.min(j.progress, j.n)}/${j.n}g` : `${Math.min(j.progress, j.n)}/${j.n}`;
      html += `<div class="row job dock ${j.done ? 'done-job' : ''}"><div class="r-main"><div class="r-title">${jobText(j, (id) => item(id).name)}</div><div class="jobbar"><i style="width:${Math.min(100, (j.progress / j.n) * 100)}%"></i></div></div><b style="font-size:13px;white-space:nowrap">${j.done ? '✔ ' : ''}${prog} · ${j.reward}g</b></div>`;
    }
    html += `<div class="section-title">Work board · ${rank.name}${disc < 1 ? ` · ${Math.round((1 - disc) * 100)}% off here` : ''}</div>`;
    for (const { a, c } of here) {
      const ready = contractReady(c, a, s.data, s);
      html += `<div class="row job ${ready ? 'ready' : ''}"><div class="r-main"><div class="r-title">${c.title}</div><div class="r-sub">${contractProgress(c, a, s.data, s)}</div></div>${ready ? `<button class="btn job-done" data-id="${c.id}">Get paid</button>` : '<span class="rar">Taken</span>'}</div>`;
    }
    for (const c of board) {
      const who = CHARACTER_MAP[c.giver]?.name.split(' ').slice(-1)[0] ?? '';
      html += `<div class="row job"><div class="r-main"><div class="r-title">${c.title} <span class="who">· ${CHARACTER_MAP[c.giver]?.name ?? who}</span></div><div class="r-sub">“${c.text}”</div><div class="r-sub"><b>${[c.reward.gold ? `${c.reward.gold}g` : '', ...(c.reward.mats ?? []).map((m) => `${m.n} ${item(m.id).name}`), c.reward.cosmetic ? 'a new flag' : '', `+${c.reward.standing} standing`].filter(Boolean).join(' · ')}</b></div></div>
        <button class="btn ghost job-take" data-id="${c.id}" ${mine.length >= MAX_ACTIVE ? 'disabled' : ''}>Take it</button></div>`;
    }
    if (!here.length && !board.length) html += `<div class="note">Nothing posted here right now. Come back after the next job elsewhere.</div>`;
    else if (mine.length - here.length > 0) html += `<div class="note">${mine.length - here.length} job${mine.length - here.length > 1 ? 's' : ''} from other ports in hand · ${mine.length}/${MAX_ACTIVE}</div>`;
    // the Green Choice: sell it, or plant it where people can eat (Driftholm and the Hollow have room)
    const garden = GARDENS.find((g) => g.port === port);
    const living = [...new Set([...s.data.vault, ...s.data.cargo].filter((v) => isLiving(v.id)).map((v) => v.id))];
    if (garden && living.length) {
      const stg = gardenStage(s.data.garden[port] ?? 0);
      html += `<div class="section-title green">The Green Choice · ${garden.name} ${stg}/3</div>
        <div class="note">Sell it to the trader for gold, or plant it in ${garden.where}. A garden feeds your crew: <b>+25% fishing and at-sea repairs</b> per stage (now ${Math.round((freshFood(s.data) - 1) * 100)}%).</div>`;
      for (const id of living) {
        const d = item(id);
        html += `<div class="row living"><div class="r-main"><div class="r-title">${d.name} ×${s.countOwned(id)}</div><div class="r-sub">Sells for ${d.value}g · plants as +${GARDEN_POINTS[d.rarity]} garden</div></div><button class="btn plant" data-id="${id}">🌱 Plant it</button></div>`;
      }
    }
    html += `<div class="section-title">Services</div><div class="svc">
      ${sett.services.includes('fuel') ? `<button class="btn fuelb" ${st.engine ? '' : 'disabled'}>⛽ Fill tank · ${+(sett.fuelPrice * disc).toFixed(1)}g/unit</button>` : ''}
      ${sett.services.includes('repair') ? `<button class="btn ghost repb" ${s.data.hull >= st.hullMax - 0.5 ? 'disabled' : ''}>🔧 Repair hull · ${Math.ceil((st.hullMax - s.data.hull) * 0.6 * disc)}g</button>` : ''}
      ${sett.services.includes('workbench') ? '<button class="btn ghost wbb">🛠 Workbench</button>' : ''}
      ${sett.services.includes('recruit') ? `<button class="btn ghost crb">👥 Crew board${recruitable.length ? ` (${recruitable.length})` : ''}</button>` : ''}
    </div>`;
    html += `<div class="note">${home ? `Vault: ${vaultCount} items stored · ` : ''}${s.discoveryCount}/${CATALOG_ITEMS.length} discoveries · crew ${s.data.crew.length}/${st.berths}</div>
      <button class="act setsail">⛵ Cast off</button>`;
    body.innerHTML = html;
    body.querySelectorAll<HTMLElement>('.npc').forEach((n) => n.addEventListener('click', () => {
      audio.ui();
      this.openPanel(n.dataset.go!);
    }));
    body.querySelector('.fuelb')?.addEventListener('click', () => {
      this.game.buyFuel();
      this.harborPanel();
    });
    body.querySelector('.repb')?.addEventListener('click', () => {
      this.game.repair(false);
      this.harborPanel();
    });
    body.querySelector('.wbb')?.addEventListener('click', () => this.workbenchPanel());
    body.querySelectorAll<HTMLElement>('.job-take').forEach((b) => b.addEventListener('click', () => {
      this.game.acceptContract(b.dataset.id!);
      this.harborPanel();
    }));
    body.querySelectorAll<HTMLElement>('.job-done').forEach((b) => b.addEventListener('click', () => {
      this.game.completeContract(b.dataset.id!);
      this.harborPanel();
    }));
    body.querySelectorAll<HTMLElement>('.plant').forEach((b) => b.addEventListener('click', () => {
      this.game.plantGreen(b.dataset.id!);
      this.harborPanel();
    }));
    body.querySelector('.crb')?.addEventListener('click', () => this.crewBoardPanel());
    body.querySelector('.daily-btn')?.addEventListener('click', () => {
      audio.ui();
      this.game.startDaily();
    });
    body.querySelector('.setsail')!.addEventListener('click', () => {
      this.closePanel();
      this.game.setSail();
    });
  }

  workbenchPanel() {
    const { body } = this.openSheet('Workbench', 'Turn salvage into parts, fuel and patches');
    const s = this.store;
    const render = () => {
      body.innerHTML = `<div class="note">Materials come from your hold and vault. Crafted parts go to the ${this.game.isDocked() ? 'vault' : 'hold'}.</div>`;
      for (const r of RECIPES) {
        const can = s.canAfford({ gold: 0, mats: r.needs });
        const row = el(`<div class="row">${iconSVG(r.makes.id)}<div class="r-main"><div class="r-title">${r.name} → ${item(r.makes.id).name} ×${r.makes.n}</div><div class="r-sub">${r.desc}</div>${costHTML(s, { gold: 0, mats: r.needs })}</div><button class="btn" ${can ? '' : 'disabled'}>Craft</button></div>`);
        row.querySelector('button')!.addEventListener('click', () => {
          this.game.craft(r.id);
          render();
        });
        body.append(row);
      }
      this.backBtn(body);
    };
    render();
  }

  crewBoardPanel() {
    const sett = this.game.dockedSettlement();
    const { body } = this.openSheet('Crew Board', `Berths aboard: ${this.store.data.crew.length}/${this.store.stats.berths}`);
    const s = this.store;
    const render = () => {
      body.innerHTML = '';
      const here = CREW.filter((c) => !s.data.crew.includes(c.id) && (c.home === sett?.id || (sett?.id === 'driftholm' && c.home === 'castaway' && s.data.castaways.some((cw) => cw.endsWith(c.id)))));
      if (!here.length) body.append(el(`<div class="empty">Nobody here is looking for a berth right now. Castaways drift in the Drift and the Reach…</div>`));
      for (const c of here) {
        const info = ROLE_INFO[c.role];
        const needUp = c.requires?.upgrade && !s.has(c.requires.upgrade);
        const full = s.data.crew.length >= s.stats.berths;
        const row = el(`<div class="row"><div class="crew-face" style="background:${info.color}">${info.icon}</div><div class="r-main"><div class="r-title">${c.name} · ${info.label}</div><div class="r-sub">${c.pitch}</div>${CHARACTER_MAP[c.id] ? `<div class="r-sub"><i>${CHARACTER_MAP[c.id].pronouns} · ${CHARACTER_MAP[c.id].voice} Wants ${CHARACTER_MAP[c.id].want.charAt(0).toLowerCase()}${CHARACTER_MAP[c.id].want.slice(1)}</i></div>` : ''}<div class="r-sub"><b>${info.perk}</b></div>${needUp ? `<div class="r-sub"><b>Needs: ${UPGRADE_MAP[c.requires!.upgrade!].name}</b></div>` : ''}</div>
          <button class="btn" ${needUp || full || (c.cost ?? 0) > s.data.gold ? 'disabled' : ''}>${c.cost ? `Hire ${c.cost}g` : 'Sign on'}</button></div>`);
        row.querySelector('button')!.addEventListener('click', () => {
          this.game.recruit(c.id);
          render();
        });
        body.append(row);
      }
      if (s.data.crew.length >= s.stats.berths) body.append(el(`<div class="note">All berths taken. A bigger vessel or a Container Cabin adds room.</div>`));
      this.backBtn(body);
    };
    render();
  }

  private npcCard(id: keyof typeof NPCS, go: string, line: string) {
    const n = NPCS[id];
    return `<button class="npc" data-go="${go}"><div class="avatar" style="background:${n.color}">${n.face}</div><div><div class="n-role">${n.role}</div><div class="n-name">${n.name}</div><div class="n-line">${line}</div></div></button>`;
  }

  private backBtn(body: HTMLElement) {
    if (!this.game.isDocked()) return;
    const b = el(`<button class="btn ghost" style="margin-bottom:10px">← Back to ${this.game.dockedSettlement()?.name ?? 'the harbor'}</button>`);
    b.addEventListener('click', () => this.harborPanel());
    body.prepend(b);
  }

  appraiserPanel() {
    const sett = this.game.dockedSettlement();
    const trader = NPCS[SETTLEMENT_NPCS[sett?.id ?? 'driftholm']?.trader ?? 'pip'];
    const { body } = this.openSheet(`${trader.name.split(' ').slice(-1)[0]}’s Trading Post`, 'Sell old-world finds, salvage and fish for gold');
    const s = this.store;
    const render = () => {
      const stacks = [...s.data.vault, ...s.data.cargo].reduce((acc, st) => {
        acc[st.id] = (acc[st.id] ?? 0) + st.n;
        return acc;
      }, {} as Record<string, number>);
      const ids = Object.keys(stacks).sort((a, b) => item(b).value - item(a).value);
      const total = ids.reduce((sum, id) => sum + item(id).value * stacks[id], 0);
      body.innerHTML = `<div class="speech"><b>${trader.name.split(' ')[0]}:</b> ${ids.length ? `“A fair price for any of it. Your Catalog keeps the record forever, even if you sell. Total worth: <b>${total}g</b>.”` : '“Nothing to trade! Go pull something out of the sea.”'}</div>`;
      for (const id of ids) {
        const d = item(id);
        const n = stacks[id];
        const isTrophy = s.data.trophies.includes(id);
        const row = el(`<div class="row" style="border-color:${RARITY_COLOR[d.rarity]}">${iconSVG(id)}<div class="r-main"><div class="r-title">${d.name} ×${n}</div><div class="r-sub">${d.value}g each · ${RARITY_LABEL[d.rarity]}${d.displayable ? ' · can be displayed on your ship' : ''}${d.category === 'resource' ? ' · used for upgrades & crafting' : ''}</div></div>
          <div style="display:flex;flex-direction:column;gap:6px"><button class="btn s1">Sell 1</button>${n > 1 ? `<button class="btn ghost sa">All ${d.value * n}g</button>` : ''}</div></div>`);
        if (isTrophy) row.querySelector('.r-sub')!.innerHTML += ' · <b>on display</b>';
        row.querySelector('.s1')!.addEventListener('click', () => {
          this.game.sell(id, 1);
          render();
        });
        row.querySelector('.sa')?.addEventListener('click', () => {
          this.game.sell(id, n);
          render();
        });
        body.append(row);
      }
      this.backBtn(body);
    };
    render();
  }

  shipwrightPanel() {
    const sett = this.game.dockedSettlement() ?? SETTLEMENT_MAP.driftholm;
    const wright = NPCS[SETTLEMENT_NPCS[sett.id]?.wright ?? 'marlo'];
    const { body } = this.openSheet(`${wright.name}`, `${wright.role} · ${sett.name}`, { short: true });
    this.game.setShowcase(true);
    const s = this.store;
    const render = () => {
      const st = s.stats;
      body.innerHTML = `<div class="speech"><b>${wright.name.split(' ')[0]}:</b> “Every part I fit, you’ll see on her. Bring scrap, wire and electronics: the sea’s full of them.”</div>
        <div class="statgrid"><div class="stat"><b>${st.speed.toFixed(1)}</b><span>sail speed</span></div><div class="stat"><b>${st.engine || '—'}</b><span>engine speed</span></div><div class="stat"><b>${st.cargo}</b><span>cargo slots</span></div>
        <div class="stat"><b>${Math.round(st.hullMax)}</b><span>hull</span></div><div class="stat"><b>${st.fuelCap}</b><span>fuel tank</span></div><div class="stat"><b>${st.berths}</b><span>crew berths</span></div></div>`;
      for (const slot of SLOT_ORDER) {
        const list = UPGRADES.filter((u) => u.slot === slot);
        if (!list.length) continue;
        body.append(el(`<div class="section-title">${SLOT_LABEL[slot]}</div>`));
        for (const u of list) {
          const owned = s.has(u.id);
          const locked = !!u.requires && !s.has(u.requires);
          const sold = (u.where ?? ['driftholm']).includes(sett.id) || (u.id === 'engine_twin' && sett.id === 'driftholm' && s.data.flags.includes('juno_diesel')); // Juno builds her own
          const cost = s.upgradeCost(u.id, sett.id);
          const afford = s.canAfford(cost);
          const welcome = s.data.flags.includes(`welcome_${u.id}`);
          const where = (u.where ?? ['driftholm']).map((w) => SETTLEMENT_MAP[w]?.name).join(' or ');
          const row = el(`<div class="row ${owned ? 'owned' : ''} ${locked || !sold ? 'locked' : ''}"><div class="r-main"><div class="r-title">${u.name}${owned ? ' ✔' : ''}</div><div class="r-sub">${u.desc}</div>${PLAY_EFFECT[u.id] ? `<div class="play-fx">${PLAY_EFFECT[u.id]}</div>` : ''}${owned ? '' : locked ? `<div class="r-sub"><b>Requires ${UPGRADE_MAP[u.requires!].name}</b></div>` : !sold ? `<div class="r-sub"><b>Fitted at ${where}</b></div>` : `${welcome ? '<div class="r-sub"><b>Marlo’s welcome price: half the gold</b></div>' : ''}${costHTML(s, cost)}`}</div>
            ${owned ? '<span class="rar" style="background:#168d9c">Installed</span>' : `<button class="btn" ${!afford || locked || !sold ? 'disabled' : ''}>Install</button>`}</div>`);
          row.querySelector('button')?.addEventListener('click', () => {
            this.game.buyUpgrade(u.id);
            render();
          });
          body.append(row);
        }
      }
      body.append(el(`<div class="section-title">Vessels <small>new hulls, new horizons</small></div>`));
      for (const v of Object.values(VESSELS)) {
        const owned = s.data.vesselsOwned.includes(v.id);
        const current = s.data.vessel === v.id;
        const yards = [...(v.builtAt ?? ['driftholm']), ...(v.id === 'brig' && s.data.flags.includes('juno_diesel') ? ['driftholm'] : [])]; // Juno builds her own
        const canBuild = yards.includes(sett.id);
        const row = el(`<div class="row ${owned ? 'owned' : ''}"><div class="r-main"><div class="r-title">${v.name}${current ? ' (aboard)' : ''}</div><div class="r-sub">${v.desc}<br>Sail ${v.speed} · Cargo ${v.cargo} · Hull ${v.hull} · Crew ${v.berths} · Trophies ${v.trophySlots}${v.crossSwell ? ' · crosses the open swell' : ''}${v.crossStorm ? ' · survives the Stormwall' : ''}</div>${!owned && v.cost ? costHTML(s, v.cost) : ''}${!owned && !canBuild ? `<div class="r-sub"><b>Built at ${yards.map((y) => SETTLEMENT_MAP[y]?.name).join(' or ')}</b></div>` : ''}</div>
          ${current ? '<span class="rar" style="background:#168d9c">Yours</span>' : owned ? '<button class="btn ghost">Switch</button>' : `<button class="btn" ${!canBuild || (v.cost && !s.canAfford(v.cost)) ? 'disabled' : ''}>Commission</button>`}</div>`);
        row.querySelector('button')?.addEventListener('click', () => {
          this.game.buyVessel(v.id);
          render();
        });
        body.append(row);
      }
      body.append(el(`<div class="note">Upgrades carry over to every vessel you own. Materials come from salvage sites, drifting caches, beaches and the workbench.</div>`));
      this.backBtn(body);
    };
    render();
  }

  cartographerPanel() {
    const { body } = this.openSheet('Wren’s Charts', 'Cartographer · maps and rumours');
    const s = this.store;
    const hints: string[] = [];
    for (const m of TREASURE_MAPS) {
      if (s.data.mapsCompleted.includes(m.id)) continue;
      const have = m.fragments.filter((f) => s.data.fragments.includes(f));
      if (!have.length) continue;
      if (have.length < m.fragments.length) {
        const missing = m.fragments.filter((f) => !s.data.fragments.includes(f)).map((f) => FRAGMENT_MAP[f].where);
        hints.push(`“That’s half of <b>${m.name}</b>. The other half? I’d wager on: <i>${missing.join(', ')}</i>.”`);
      } else hints.push(`“<b>${m.name}</b> is whole! That coastline is <b>${ISLAND_MAP[m.island].name}</b>. Read the clue, captain.”`);
    }
    const render = () => {
      const open = openRumours(s.data);
      const reach = { crossSwell: s.stats.crossSwell, crossStorm: s.stats.crossStorm, heavy: !!s.stats.salvage };
      body.innerHTML = `<div class="speech"><b>Old Wren:</b> ${hints[0] ?? '“Every chart is a promise someone forgot to keep. Here are a few I haven’t kept.”'}</div>${hints.slice(1).map((h) => `<div class="speech">${h}</div>`).join('')}
        <div class="section-title">Rumours</div>
        <div class="note">Pin a rumour and it becomes your Captain’s Log side lead. Tap the side lead on the Log to follow it.</div>`;
      for (const r of open) {
        const pinned = s.data.pinned.includes(r.id);
        const far = !canReach(r.region, reach);
        const row = el(`<div class="row rumour${pinned ? ' pinned' : ''}"><div class="r-main"><div class="r-title">${pinned ? '📌 ' : ''}${r.label}</div><div class="r-sub">“${r.text}”</div>${far ? `<div class="r-sub"><b>${r.region === 'stormwall' ? 'Needs a hull that survives the Stormwall' : 'Needs a boat that can cross the open swell'}</b></div>` : ''}</div>
          <button class="btn ${pinned ? 'ghost' : ''}">${pinned ? 'Unpin' : 'Pin it'}</button></div>`);
        row.querySelector('button')!.addEventListener('click', () => {
          this.game.pinRumour(r.id);
          render();
        });
        body.append(row);
      }
      if (!open.length) body.append(el(`<div class="empty">“That’s every rumour I’ve got. Go and make some new ones.”</div>`));
      const mapsBtn = el(`<button class="btn">Open my maps</button>`);
      mapsBtn.addEventListener('click', () => this.openPanel('maps'));
      body.append(mapsBtn);
      this.backBtn(body);
    };
    render();
  }

  curiosPanel() {
    const { body } = this.openSheet('Brightly’s Curios', 'Paints, sails, flags & trophy displays', { short: true });
    this.game.setShowcase(true);
    this.renderCustomize(body, true);
    this.backBtn(body);
  }

  private renderCustomize(body: HTMLElement, shop: boolean) {
    const s = this.store;
    const render = () => {
      body.innerHTML = shop ? `<div class="speech"><b>Odessa:</b> “Rare pieces come from adventures, darling, not from me. But I do a lovely red.”</div>` : '';
      for (const slot of ['paint', 'sail', 'flag'] as const) {
        body.append(el(`<div class="section-title">${slot === 'paint' ? 'Hull Paint' : slot === 'sail' ? 'Sail Pattern' : 'Flag'}</div>`));
        const wrap = el(`<div class="swatches"></div>`);
        for (const c of COSMETICS.filter((c) => c.slot === slot)) {
          const owned = s.data.cosmetics.includes(c.id);
          const on = s.data.equipped[slot] === c.id;
          const how = owned ? '' : c.cost ? `${c.cost}g` : c.unlock ? `\u{1F512} ${MILESTONES.find((m) => m.id === c.unlock)?.name}` : '';
          const bg = c.id === 'flag_none' ? 'repeating-linear-gradient(45deg,#ddd 0 6px,#fff 6px 12px)' : `linear-gradient(135deg, ${c.colors[0]} 0 55%, ${c.colors[1]} 55%)`;
          const sw = el(`<button class="swatch ${on ? 'on' : ''} ${!owned && !(shop && c.cost) ? 'locked' : ''}"><div class="sw" style="background:${bg}"></div>${c.name}<div style="color:${RARITY_COLOR[c.rarity]};font-weight:900">${how}</div></button>`);
          sw.addEventListener('click', () => {
            if (owned) this.game.equip(slot, c.id);
            else if (shop && c.cost) this.game.buyCosmetic(c.id);
            else {
              audio.deny();
              this.toast(c.unlock ? `Unlocked by the “${MILESTONES.find((m) => m.id === c.unlock)?.name}” milestone` : 'Available at Brightly’s Curios in port');
            }
            render();
          });
          wrap.append(sw);
        }
        body.append(wrap);
      }
      // trophies
      const slots = s.stats.trophySlots;
      body.append(el(`<div class="section-title">Trophy Displays <small>${slots} slot${slots > 1 ? 's' : ''} on your ${s.vesselDef.name}</small></div>`));
      const displayable = ITEMS.filter((i) => i.displayable && s.countOwned(i.id) > 0);
      for (let i = 0; i < slots; i++) {
        const cur = s.data.trophies[i];
        const row = el(`<div class="row">${cur ? iconSVG(cur) : '<div style="width:44px;height:44px;border:2px dashed #c9a46a;border-radius:10px"></div>'}<div class="r-main"><div class="r-title">${cur ? item(cur).name : `Empty display ${i + 1}`}</div><div class="r-sub">${displayable.length ? 'Tap a find below to mount it here' : 'Find artifacts or wreck salvage to display them on deck'}</div></div>${cur ? '<button class="btn ghost">Remove</button>' : ''}</div>`);
        row.querySelector('button')?.addEventListener('click', () => {
          this.game.setTrophy(i, null);
          render();
        });
        body.append(row);
      }
      if (displayable.length) {
        const grid = el(`<div class="grid"></div>`);
        for (const d of displayable) {
          const on = s.data.trophies.includes(d.id);
          const c = el(`<button class="cell" style="--c:${on ? '#4f9a95' : RARITY_COLOR[d.rarity]}">${iconSVG(d.id)}<div class="c-name">${d.name}</div>${on ? '<div class="c-n">✔</div>' : ''}</button>`);
          c.addEventListener('click', () => {
            if (on) return;
            const free = s.data.trophies.slice(0, slots).findIndex((t) => !t);
            this.game.setTrophy(free >= 0 ? free : 0, d.id);
            render();
          });
          grid.append(c);
        }
        body.append(grid);
      }
    };
    render();
  }

  shipPanel() {
    const s = this.store;
    const { body, tabs } = this.openSheet(s.data.shipName || s.vesselDef.name, `${s.data.shipName ? `${s.vesselDef.name} · ` : ''}${refitStage(s.data.upgrades.length).name} · Captain, ${renownTitle(s.data).title}`, { short: true });
    this.game.setShowcase(true);
    let tab = 'stats';
    const render = () => {
      const tl = [{ id: 'stats', label: 'Equipment' }, { id: 'crew', label: `Crew ${s.data.crew.length}/${s.stats.berths}` }, { id: 'look', label: 'Customize' }];
      if (s.has('cabin_container')) tl.splice(2, 0, { id: 'bench', label: 'Workbench' });
      this.setTabs(tabs, tl, tab, (t) => {
        tab = t;
        render();
      });
      body.innerHTML = '';
      if (tab === 'look') this.renderCustomize(body, false);
      else if (tab === 'bench') {
        for (const r of RECIPES) {
          const can = s.canAfford({ gold: 0, mats: r.needs });
          const row = el(`<div class="row">${iconSVG(r.makes.id)}<div class="r-main"><div class="r-title">${r.name}</div><div class="r-sub">${r.needs.map((n) => `${n.n}× ${item(n.id).name} (${s.countOwned(n.id)})`).join(' + ')} → ${r.makes.n}× ${item(r.makes.id).name}</div></div><button class="btn" ${can ? '' : 'disabled'}>Craft</button></div>`);
          row.querySelector('button')!.addEventListener('click', () => {
            this.game.craft(r.id);
            render();
          });
          body.append(row);
        }
      } else if (tab === 'crew') {
        if (!s.data.crew.length) body.append(el(`<div class="empty">No crew yet. Rescue castaways adrift, or hire survivors from settlement crew boards.</div>`));
        for (const id of s.data.crew) {
          const c = CREW_MAP[id];
          const info = ROLE_INFO[c.role];
          const story = ARCS.filter((b) => b.who === id);
          const seen = story.filter((b) => s.data.beats.includes(b.id));
          const row = el(`<div class="row"><div class="crew-face" style="background:${info.color}">${info.icon}</div><div class="r-main"><div class="r-title">${c.name} · ${info.label}</div><div class="r-sub"><b>${info.perk}</b></div><div class="r-sub">Story ${seen.length}/${story.length}${seen.length ? `: ${seen.map((b) => b.title.replace(/[“”]/g, '')).join(' · ')}` : ''}</div></div><button class="btn ghost">Ashore</button></div>`);
          row.querySelector('button')!.addEventListener('click', () => {
            this.game.dismiss(id);
            this.toast(`${c.name} will wait for you on the crew board at ${SETTLEMENT_MAP[c.home]?.name ?? 'Driftholm'}.`);
            render();
          });
          body.append(row);
        }
      } else {
        const st = s.stats;
        body.innerHTML = `<div class="statgrid"><div class="stat"><b>${st.speed.toFixed(1)}</b><span>sail speed</span></div><div class="stat"><b>${st.engine || '—'}</b><span>engine</span></div><div class="stat"><b>${st.cargo}</b><span>cargo slots</span></div>
          <div class="stat"><b>${Math.round(s.data.hull)}/${st.hullMax}</b><span>hull</span></div><div class="stat"><b>${Math.round(s.data.fuel)}/${st.fuelCap}</b><span>fuel</span></div><div class="stat"><b>${st.armor ? Math.round(st.armor * 100) + '%' : '—'}</b><span>armour</span></div>
          <div class="stat"><b>${st.reef ? 'Yes' : 'No'}</b><span>reef-safe</span></div><div class="stat"><b>${st.crossSwell ? 'Yes' : 'No'}</b><span>open swell</span></div><div class="stat"><b>${st.crossStorm ? 'Yes' : 'No'}</b><span>Stormwall</span></div></div>
          <div class="svc"><button class="btn rf" ${s.countOwned('fuel_can') && s.data.fuel < st.fuelCap - 2 ? '' : 'disabled'}>⛽ Pour fuel cans (${s.countOwned('fuel_can')})</button><button class="btn ghost pk" ${s.countOwned('hull_patch') && s.data.hull < st.hullMax ? '' : 'disabled'}>🩹 Patch hull (${s.countOwned('hull_patch')})</button></div>`;
        const stage = refitStage(s.data.upgrades.length);
        const next = REFIT_STAGES.find((r) => r.min > s.data.upgrades.length);
        const title = renownTitle(s.data);
        const ren = el(`<div class="renown"><div class="section-title">Her refit · ${stage.name}</div>
          <div class="note">${stage.look}${next ? ` <b>${next.min - s.data.upgrades.length} more part${next.min - s.data.upgrades.length > 1 ? 's' : ''}</b> and she’s ${next.name}: ${next.look.charAt(0).toLowerCase()}${next.look.slice(1)}` : ''}</div>
          <div class="section-title">Renown · Captain, ${title.title}</div>
          ${RENOWN.map((r) => `<div class="rank ${r.earned(s.data) ? 'got' : ''}"><b>${r.earned(s.data) ? '✓' : '○'} ${r.title}</b> <span>${r.how}</span></div>`).join('')}
          <button class="btn ghost rename">✎ ${s.data.shipName ? `Rename the ${s.data.shipName}` : 'Name her'}</button></div>`);
        ren.querySelector('.rename')!.addEventListener('click', () => this.game.nameShip());
        body.append(ren);
        body.querySelector('.rf')!.addEventListener('click', () => {
          this.game.refuel();
          render();
        });
        body.querySelector('.pk')!.addEventListener('click', () => {
          this.game.repair(true);
          render();
        });
        for (const slot of SLOT_ORDER) {
          const best = s.bestInSlot(slot);
          body.append(el(`<div class="row ${best ? 'owned' : ''}"><div class="r-main"><div class="r-title">${SLOT_LABEL[slot]}: ${best ? best.name : 'Stock'}</div><div class="r-sub">${best ? best.desc : 'Visit a shipwright to fit one.'}</div></div></div>`));
        }
      }
    };
    render();
  }

  cargoPanel() {
    const s = this.store;
    const { body, tabs } = this.openSheet('Cargo Hold', `${s.slotsUsed()}/${s.stats.cargo} slots used`);
    let tab = 'cargo';
    const render = () => {
      this.setTabs(tabs, [{ id: 'cargo', label: `Aboard (${s.slotsUsed()}/${s.stats.cargo})` }, { id: 'vault', label: 'Harbor Vault' }], tab, (t) => {
        tab = t;
        render();
      });
      const list = tab === 'cargo' ? s.data.cargo : s.data.vault;
      body.innerHTML = list.length ? '' : `<div class="empty">${tab === 'cargo' ? 'Your hold is empty. Go find something!' : 'Nothing stored. Dock at Driftholm to unload cargo here.'}</div>`;
      if (tab === 'cargo') body.prepend(el(`<div class="note">Small things stack. Treasure chests and story finds always come aboard${s.slotsUsed() > s.stats.cargo ? `, so the hold can run over: <b>${s.slotsUsed()}/${s.stats.cargo}</b>; until you unload, only part-filled stacks have room` : ''}. Docking unloads everything into your vault.</div>`));
      for (const st of list) {
        const d = item(st.id);
        const slots = Math.ceil(st.n / d.stack);
        const row = el(`<div class="row${isLiving(st.id) ? ' living' : ''}" style="border-color:${isLiving(st.id) ? LIVING_GREEN : RARITY_COLOR[d.rarity]}">${iconSVG(st.id)}<div class="r-main"><div class="r-title">${d.name} ×${st.n}</div><div class="r-sub">${tab === 'cargo' ? `${slots} slot${slots > 1 ? 's' : ''} · stacks to ${d.stack}` : CATEGORY_LABEL[d.category]} · worth ${d.value}g each</div></div>${tab === 'cargo' ? '<button class="btn ghost">Toss 1</button>' : ''}</div>`);
        row.querySelector('button')?.addEventListener('click', () => {
          this.game.jettison(st.id);
          render();
        });
        body.append(row);
      }
    };
    render();
  }

  catalogPanel(cat?: Category) {
    const s = this.store;
    this.game.questEvent('catalog');
    const cats = [...new Set(CATALOG_ITEMS.map((i) => i.category))] as Category[];
    const setsDone = SETS.filter((st) => st.items.every((id) => s.data.discoveries[id])).length;
    const { body, tabs } = this.openSheet('Salvage Log', `${s.discoveryCount} of ${CATALOG_ITEMS.length} found · ${setsDone}/${SETS.length} sets complete`);
    let tab: string = cat ?? 'all';
    let selected: string | null = null;
    const render = () => {
      this.setTabs(tabs, [{ id: 'all', label: 'All' }, { id: 'sets', label: '⚑ Sets' }, ...cats.map((c) => ({ id: c, label: CATEGORY_LABEL[c] })), { id: 'milestones', label: '★ Milestones' }], tab, (t) => {
        tab = t;
        selected = null;
        render();
      });
      body.innerHTML = '';
      if (tab === 'sets') {
        body.append(el(`<div class="note">Find every item in a set for a small bonus that lasts forever. Tiers: ${(['junk', 'common', 'rare', 'legendary'] as Tier[]).map((t) => `<b style="color:${TIER_COLOR[t]}">●</b> ${TIER_LABEL[t]}`).join(' · ')}</div>`));
        for (const st of SETS) {
          const got = st.items.filter((id) => s.data.discoveries[id]);
          const done = got.length === st.items.length;
          body.append(el(`<div class="set-card ${done ? 'done' : ''}"><div class="s-head"><span class="s-name">${done ? '★ ' : ''}${st.name}</span><span class="s-bonus">${bonusText(st.bonus)}</span></div>
            <div class="r-sub">${st.blurb}</div><div class="progress" style="margin-top:6px"><div style="width:${(got.length / st.items.length) * 100}%"></div></div>
            <div class="s-items">${st.items.map((id) => { const d = ITEM_MAP[id]; const have = !!s.data.discoveries[id]; return `<span class="${have ? 'got' : 'miss'}"><b style="color:${TIER_COLOR[tierOf(id)]}">●</b>${have ? d.name : '???'}</span>`; }).join('')}</div></div>`));
        }
        return;
      }
      if (tab === 'milestones') {
        for (const m of MILESTONES) {
          const done = s.data.milestones.includes(m.id);
          let prog = 0, need = 1;
          if (m.cond.kind === 'category') { prog = s.categoryCount(m.cond.category); need = m.cond.n; }
          else if (m.cond.kind === 'chests') { prog = s.data.chestsOpened; need = m.cond.n; }
          else if (m.cond.kind === 'discoveries') { prog = s.discoveryCount; need = m.cond.n; }
          else if (m.cond.kind === 'hauls') { prog = s.data.hauls; need = m.cond.n; }
          else { prog = s.data.flags.includes(m.cond.flag) ? 1 : 0; need = 1; }
          const reward = [m.reward.gold ? `${m.reward.gold}g` : '', m.reward.cosmetic ? COSMETIC_MAP[m.reward.cosmetic].name : ''].filter(Boolean).join(' + ');
          body.append(el(`<div class="row ${done ? 'owned' : ''}"><div class="r-main"><div class="r-title">${done ? '★ ' : ''}${m.name}</div><div class="r-sub">${m.desc} · Reward: ${reward}</div><div class="progress" style="margin-top:6px"><div style="width:${Math.min(100, (prog / need) * 100)}%"></div></div></div><b style="font-size:13px">${Math.min(prog, need)}/${need}</b></div>`));
        }
        return;
      }
      const list = CATALOG_ITEMS.filter((i) => tab === 'all' || i.category === tab);
      if (selected) {
        const d = ITEM_MAP[selected];
        const disc = s.data.discoveries[selected];
        const isl = disc ? disc.where : '';
        body.append(el(`<div class="detail" style="--c:${RARITY_COLOR[d.rarity]}"><div class="d-icon">${iconSVG(d.id, { size: 84 })}</div><div style="flex:1"><h3>${d.name}</h3>
          <span class="rar" style="background:${TIER_COLOR[tierOf(d.id)]};color:#14110d">${TIER_LABEL[tierOf(d.id)]}</span> <span class="rar" style="background:${RARITY_COLOR[d.rarity]}">${RARITY_LABEL[d.rarity]}</span>${SETS.filter((st) => st.items.includes(d.id)).map((st) => ` <span class="rar" style="background:#2b2f36">⚑ ${st.name}</span>`).join('')}
          <p>${d.desc}</p><div class="meta"><span>\u{1F4CD} ${isl}</span><span>\u{1F4C5} ${new Date(disc.first).toLocaleDateString()}</span><span>Found ×${disc.count}</span><span>Owned ×${s.countOwned(d.id)}</span><span>${CATEGORY_LABEL[d.category]}</span><span>Value ${d.value}g</span>${d.displayable ? '<span>✨ Displayable</span>' : ''}</div></div></div>`));
      }
      const groups = tab === 'all' ? cats : [tab as Category];
      for (const c of groups) {
        const items = list.filter((i) => i.category === c);
        const found = items.filter((i) => s.data.discoveries[i.id]).length;
        body.append(el(`<div class="section-title">${CATEGORY_LABEL[c]} <small>${found}/${items.length}</small></div>`));
        body.append(el(`<div class="progress" style="margin-bottom:8px"><div style="width:${(found / items.length) * 100}%"></div></div>`));
        const grid = el(`<div class="grid"></div>`);
        for (const d of items) {
          const disc = s.data.discoveries[d.id];
          const isNew = disc && !this.seenCatalog.has(d.id);
          const cell = el(`<button class="cell ${disc ? '' : 'unknown'} ${isNew ? 'new' : ''} ${disc && d.category === 'living' ? 'living' : ''}" style="--c:${disc ? (d.category === 'living' ? LIVING_GREEN : RARITY_COLOR[d.rarity]) : ''};--tc:${TIER_COLOR[tierOf(d.id)]}"><i class="tier-dot"></i>${iconSVG(d.id, { silhouette: !disc })}<div class="c-name">${disc ? d.name : '???'}</div>${disc ? `<div class="c-n">×${disc.count}</div>` : ''}</button>`);
          cell.addEventListener('click', () => {
            if (!disc) {
              audio.deny();
              this.toast(`Undiscovered ${CATEGORY_LABEL[d.category].toLowerCase()} · ${RARITY_LABEL[d.rarity]}`, { color: RARITY_COLOR[d.rarity] });
              return;
            }
            audio.ui();
            selected = d.id;
            render();
            body.scrollTop = 0;
          });
          grid.append(cell);
        }
        body.append(grid);
      }
      // mark seen
      list.forEach((d) => s.data.discoveries[d.id] && this.seenCatalog.add(d.id));
      try {
        if (!s.sandbox) localStorage.setItem('tidebreakers.seen', JSON.stringify([...this.seenCatalog]));
      } catch {
        /* ignore */
      }
    };
    render();
  }

  mapsPanel(focus?: string) {
    const s = this.store;
    const { body, tabs } = this.openSheet('Maps & Charts', 'Treasure maps and the known world');
    this.mapOpen = true;
    const owned = TREASURE_MAPS.filter((m) => m.fragments.some((f) => s.data.fragments.includes(f)));
    let tab = focus ?? s.data.activeMap ?? owned[0]?.id ?? 'world';
    if (tab !== 'world' && !owned.find((m) => m.id === tab)) tab = 'world';
    const render = () => {
      this.setTabs(tabs, [...owned.map((m) => ({ id: m.id, label: (s.data.mapsCompleted.includes(m.id) ? '✔ ' : '') + m.name })), { id: 'world', label: '\u{1F30D} World Chart' }], tab, (t) => {
        tab = t;
        render();
      });
      body.innerHTML = '';
      if (tab === 'world') {
        const am = s.data.activeMap ? TREASURE_MAPS.find((m) => m.id === s.data.activeMap) : null;
        const tgt = am && am.fragments.every((f) => s.data.fragments.includes(f)) && !s.data.mapsCompleted.includes(am.id) ? { x: ISLAND_MAP[am.island].x + am.x, z: ISLAND_MAP[am.island].z + am.z } : null;
        const ship = this.game.shipState();
        const extras = this.game.chartExtras();
        const visited = s.data.islandsVisited;
        const zm = new ZoomableMap({
          bounds: CHART_BOUNDS, aspect: 1, maxZoom: 8, focus: { x: ship.x, z: ship.z }, start: chartView ?? undefined,
          label: 'World chart. Pinch or use the buttons to zoom, drag to pan.',
          paint: (ctx, w, h, view) => paintWorldChart(ctx, w, h, view, visited, ship, tgt, extras),
        });
        zm.onView = (v) => (chartView = v);
        body.append(zm.el);
        bakeChartLayers(() => zm.refresh());
        body.append(el(`<div class="zmap-hint">Pinch or double-tap to zoom · drag to pan · \u2316 finds your boat</div>`));
        body.append(el(`<div class="note">The dashed ring is the open swell (Scrap Trimaran). The dark ring is the Stormwall (Ironwake). Gold diamonds are salvage sites; faded ones are picked clean for now.</div>`));
        if (!owned.length) body.append(el(`<div class="empty">No treasure maps yet. Bottles wash up on beaches…</div>`));
        return;
      }
      const m = TREASURE_MAPS.find((m) => m.id === tab)!;
      const complete = m.fragments.every((f) => s.data.fragments.includes(f));
      const done = s.data.mapsCompleted.includes(m.id);
      const art = document.createElement('canvas');
      drawTreasureMap(art, m, s.data.fragments, 2);
      const zm = new ZoomableMap({
        bounds: { x0: 0, z0: 0, x1: 480, z1: 360 }, aspect: 4 / 3, maxZoom: 3, label: `${m.name}. Pinch or use the buttons to zoom, drag to pan.`,
        paint: (ctx, w, h, view) => {
          ctx.fillStyle = '#c9a46a';
          ctx.fillRect(0, 0, w, h);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(art, -view.x0 * view.s, -view.z0 * view.s, 480 * view.s, 360 * view.s);
        },
      });
      body.append(zm.el);
      body.append(el(`<div class="clue">${complete ? `“${m.clue}”` : '“…the rest of the clue is on the missing half.”'}</div>`));
      body.append(el(`<div class="note">${m.fragments.map((f) => `${s.data.fragments.includes(f) ? '✔' : '✘'} ${FRAGMENT_MAP[f].name}`).join(' · ')}</div>`));
      if (done) body.append(el(`<div class="note"><b>Treasure recovered.</b> The X has been dug.</div>`));
      else if (complete) {
        const active = s.data.activeMap === m.id;
        const b = el(`<button class="btn ${active ? 'green' : ''}" style="width:100%">${active ? '✔ Following this map' : 'Follow this map'}</button>`);
        b.addEventListener('click', () => {
          this.game.setActiveMap(m.id);
          render();
        });
        body.append(b);
        body.append(el(`<div class="note">Sail to the island, go ashore, match the landmarks, and DIG where the X is.${s.stats.compass ? ' Your Brass Compass will point the way.' : ''}</div>`));
        if (m.id === 'turtle_map' || complete) this.game.questEvent('read_map');
      }
    };
    render();
  }

  settingsPanel() {
    const s = this.store;
    const { body } = this.openSheet('Settings', `Last saved ${s.lastSaved ? new Date(s.lastSaved).toLocaleTimeString() : 'just now'}${s.storageOk ? '' : ' · ⚠ storage unavailable'}`);
    body.innerHTML = `
      <div class="setting-row">Sound effects <input type="range" min="0" max="1" step="0.05" value="${s.data.settings.sfx}" class="sfx"></div>
      <div class="setting-row">Music <input type="range" min="0" max="1" step="0.05" value="${s.data.settings.music}" class="mus"></div>
      <div class="setting-row">Vibration <input type="checkbox" class="hap" ${s.data.settings.haptics ? 'checked' : ''} style="width:26px;height:26px"></div>
      <div class="setting-row">Calm effects <span class="note" style="flex:1;margin:0 8px;text-align:left">no screen shake, softer flashes</span><input type="checkbox" class="calm" ${s.data.settings.calm ? 'checked' : ''} style="width:26px;height:26px"></div>
      <div class="section-title">Progress</div>
      <div class="statgrid"><div class="stat"><b>${s.discoveryCount}</b><span>discoveries</span></div><div class="stat"><b>${s.data.stats.goldEarned}</b><span>gold earned</span></div><div class="stat"><b>${Math.round(s.data.stats.distance)}</b><span>meters sailed</span></div>
      <div class="stat"><b>${s.data.hauls}</b><span>salvage hauls</span></div><div class="stat"><b>${s.data.upgrades.length}</b><span>upgrades</span></div><div class="stat"><b>${s.data.chestsOpened}</b><span>chests opened</span></div></div>
      <button class="btn green save" style="width:100%;margin:6px 0">Save now</button>
      <div class="note">Progress saves automatically on this device after every discovery, sale and upgrade.</div>
      <div class="section-title">How to play</div>
      <div class="note" style="text-align:left">• Drag the wheel toward where you want to go. Push further for more sail or throttle.<br>• Tap ENGINE to motor against the wind (burns fuel).<br>• Drag anywhere else to look around. Pinch to zoom.<br>• Slow down beside a beacon buoy and tap SALVAGE. Reel when the needle is in the green.<br>• Sail into drifting caches. Rescue castaways to grow your crew.<br>• Storms batter the hull: armour, a Mechanic and patch kits keep you afloat.<br>• Anchor near islands to go ashore and DIG at the X on treasure maps.</div>
      <button class="btn danger reset" style="width:100%;margin-top:16px">Start a new voyage (erase save)</button>`;
    const sfx = body.querySelector('.sfx') as HTMLInputElement;
    const mus = body.querySelector('.mus') as HTMLInputElement;
    const hap = body.querySelector('.hap') as HTMLInputElement;
    const calm = body.querySelector('.calm') as HTMLInputElement;
    const apply = () => {
      s.data.settings.calm = calm.checked;
      this.applyCalm();
      s.data.settings.sfx = +sfx.value;
      s.data.settings.music = +mus.value;
      s.data.settings.haptics = hap.checked;
      audio.setVolumes(+sfx.value, +mus.value);
      s.commit();
    };
    sfx.addEventListener('input', apply);
    mus.addEventListener('input', apply);
    hap.addEventListener('change', apply);
    calm.addEventListener('change', apply);
    body.querySelector('.save')!.addEventListener('click', () => {
      s.saveNow();
      this.toast('Progress saved ✔', { color: '#4f9a95' });
    });
    let armed = false;
    const rb = body.querySelector('.reset') as HTMLButtonElement;
    rb.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        rb.textContent = 'Tap again to erase everything';
        return;
      }
      this.closePanel();
      this.game.resetSave();
    });
  }
}
