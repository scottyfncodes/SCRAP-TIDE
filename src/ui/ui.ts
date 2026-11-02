// DOM UI: HUD, touch controls, panels (harbor, catalog, maps, ship, cargo, settings), reveals.
import { ITEMS, CATALOG_ITEMS, ITEM_MAP, RARITY_COLOR, RARITY_LABEL, RARITY_ORDER, CATEGORY_LABEL, item, type Category } from '../data/items';
import { UPGRADES, VESSELS, COSMETICS, COSMETIC_MAP, SLOT_LABEL, UPGRADE_MAP, type Cost, type UpgradeSlot } from '../data/ship';
import { MILESTONES, FIRST_VOYAGE } from '../data/progress';
import { TREASURE_MAPS, FRAGMENT_MAP, ISLAND_MAP } from '../data/world';
import { iconSVG } from './icons';
import { drawTreasureMap, drawWorldChart } from './mapArt';
import type { Store } from '../state/store';
import { audio } from '../audio/audio';

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
  resetSave(): void;
  start(): void;
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

const WHEEL_SVG = `<svg class="wheel" viewBox="0 0 150 150"><g fill="none" stroke="#5a3a1e" stroke-linecap="round">
${Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return `<line x1="${75 + Math.cos(a) * 20}" y1="${75 + Math.sin(a) * 20}" x2="${75 + Math.cos(a) * 72}" y2="${75 + Math.sin(a) * 72}" stroke-width="8"/>`; }).join('')}
<circle cx="75" cy="75" r="56" stroke-width="12" stroke="#8a5f36"/><circle cx="75" cy="75" r="56" stroke-width="3" stroke="#3f2a17"/></g>
<circle cx="75" cy="75" r="60" fill="rgba(43,29,20,.18)"/></svg>`;

const el = (html: string) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
};

function costHTML(store: Store, c: Cost) {
  const parts = [`<span class="${store.data.gold < c.gold ? 'lack' : ''}"><span class="pill-coin" style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#f4c542;border:1px solid #b8860b"></span>${c.gold}</span>`];
  for (const m of c.mats ?? []) {
    const have = store.countOwned(m.id);
    parts.push(`<span class="${have < m.n ? 'lack' : ''}">${iconSVG(m.id, { size: 16 })}${have}/${m.n} ${item(m.id).name}</span>`);
  }
  return `<div class="cost">${parts.join('')}</div>`;
}

const NPCS = {
  pip: { name: 'Pip Farthing', role: 'Treasure Appraiser', color: '#f4d06f', face: '\u{1F9D0}' },
  marlo: { name: 'Marlo Keelhart', role: 'Shipwright', color: '#9ec5e8', face: '\u{1F9D4}' },
  wren: { name: 'Old Wren', role: 'Cartographer', color: '#a8d5ba', face: '\u{1F475}' },
  odessa: { name: 'Odessa Brightly', role: 'Curio & Decor', color: '#f2b5c4', face: '\u{1F469}‍\u{1F3A8}' },
};

export class UI {
  root: HTMLElement;
  joy = { x: 0, y: 0, active: false };
  onAction: (id: string) => void = () => {};
  private hud!: HTMLElement;
  private goldEl!: HTMLElement;
  private cargoEl!: HTMLElement;
  private questEl!: HTMLElement;
  private actionsEl!: HTMLElement;
  private toastsEl!: HTMLElement;
  private wpEl!: HTMLElement;
  private compassEl!: HTMLElement;
  private speedEl!: HTMLElement;
  private digEl!: HTMLElement;
  private bannerEl!: HTMLElement;
  private fadeEl!: HTMLElement;
  private sheet: HTMLElement | null = null;
  private revealQueue: (() => HTMLElement)[] = [];
  private revealOpen = false;
  private lastActionsKey = '';
  private seenCatalog = new Set<string>();
  panelOpen = false;

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
    const top = el(`<div class="hud-top">
      <div class="stats"><div class="pill gold-pill"><span class="coin"></span><span class="gold">0</span></div><div class="pill cargo-pill">⛵ <span class="cargo">0/6</span></div></div>
      <div class="quest"><div class="q-label">Objective</div><div class="q-text"></div><div class="q-hint"></div></div>
      <div class="menu-btns">
        <button class="icon-btn" data-p="catalog">${ICON.catalog}<span>CATALOG</span></button>
        <button class="icon-btn" data-p="maps">${ICON.maps}<span>MAPS</span></button>
        <button class="icon-btn" data-p="ship">${ICON.ship}<span>SHIP</span></button>
        <button class="icon-btn" data-p="cargo">${ICON.cargo}<span>CARGO</span></button>
      </div>
    </div>`);
    this.goldEl = top.querySelector('.gold')!;
    this.cargoEl = top.querySelector('.cargo')!;
    this.questEl = top.querySelector('.quest')!;
    this.questEl.addEventListener('click', () => this.questEl.classList.toggle('open'));
    top.querySelectorAll<HTMLElement>('.icon-btn').forEach((b) =>
      b.addEventListener('click', () => {
        audio.ui();
        this.openPanel(b.dataset.p!);
      })
    );
    const settings = el(`<button class="icon-btn" style="position:absolute;left:calc(var(--safe-l) + 10px);top:calc(var(--safe-t) + 96px);width:40px;height:40px">${ICON.settings}</button>`);
    settings.addEventListener('click', () => this.openPanel('settings'));
    this.hud.append(top, settings);

    // joystick
    const stick = el(`<div class="stick">${WHEEL_SVG}<div class="knob"></div><div class="stick-label">STEER</div></div>`);
    const knob = stick.querySelector('.knob') as HTMLElement;
    const wheel = stick.querySelector('.wheel') as SVGElement;
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
      wheel.style.transform = `rotate(${dx * 0.9}deg)`;
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
      wheel.style.transform = '';
    };
    stick.addEventListener('pointerup', end);
    stick.addEventListener('pointercancel', end);
    this.hud.append(stick);

    this.actionsEl = el(`<div class="actions"></div>`);
    this.toastsEl = el(`<div class="toasts"></div>`);
    this.wpEl = el(`<div class="waypoint" style="opacity:0"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" fill="rgba(43,29,20,.55)" stroke="#f4c542" stroke-width="3"/><path d="M22 8 L30 26 L22 22 L14 26 Z" fill="#f4c542"/></svg><div class="wp-dist"></div></div>`);
    this.compassEl = el(`<div class="compass" style="display:none"><svg class="needle" viewBox="0 0 6 46"><path d="M3 0 L6 23 L0 23Z" fill="#c0392b"/><path d="M3 46 L6 23 L0 23Z" fill="#2b1d14"/></svg><div class="cl">X</div></div>`);
    this.speedEl = el(`<div class="speed"><div class="wind"><svg viewBox="0 0 24 24"><path d="M12 3 L17 15 L12 12 L7 15Z" fill="#fff"/></svg><span>WIND</span></div><div class="kn"></div></div>`);
    this.digEl = el(`<div class="dig-meter" style="opacity:0"><div class="dm-text"></div><div class="dm-bar"><div class="dm-fill"></div></div></div>`);
    this.bannerEl = el(`<div class="region-banner"><div class="rb-inner"><div class="rb-title"></div><div class="rb-sub"></div></div></div>`);
    this.fadeEl = el(`<div class="fade"></div>`);
    this.hud.append(this.actionsEl, this.toastsEl, this.wpEl, this.compassEl, this.speedEl, this.digEl, this.bannerEl);
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
      if (k === 'escape') this.closePanel();
    });
    window.addEventListener('keyup', (e) => {
      keys.delete(e.key.toLowerCase());
      upd();
    });
    this.refreshHUD();
  }

  refreshHUD() {
    const s = this.store;
    this.goldEl.textContent = String(s.data.gold);
    const used = s.slotsUsed();
    const cap = s.stats.cargo;
    this.cargoEl.textContent = `${used}/${cap}`;
    this.cargoEl.parentElement!.classList.toggle('full', used >= cap);
    const q = FIRST_VOYAGE.find((q) => q.id === s.data.quest)!;
    const qt = this.questEl.querySelector('.q-text')!;
    if (qt.textContent !== q.text) {
      qt.textContent = q.text;
      this.questEl.classList.remove('pulse');
      void this.questEl.offsetWidth;
      this.questEl.classList.add('pulse');
    }
    this.questEl.querySelector('.q-hint')!.textContent = q.hint;
    this.questEl.querySelector('.q-label')!.textContent = s.data.quest === 'free' ? 'Captain’s Log' : `First Voyage · ${s.questIndex() + 1}/${FIRST_VOYAGE.length - 1}`;
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

  setSpeed(knots: number | null, windAngle: number, eff: number) {
    if (knots === null) {
      this.speedEl.style.display = 'none';
      return;
    }
    this.speedEl.style.display = '';
    (this.speedEl.querySelector('.wind svg') as SVGElement).style.transform = `rotate(${windAngle}rad)`;
    this.speedEl.querySelector('.kn')!.textContent = `${knots.toFixed(1)} kn · ${eff > 0.92 ? 'good wind' : eff > 0.7 ? 'fair wind' : 'into the wind'}`;
  }

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
    audio.discover(RARITY_ORDER.indexOf(d.rarity));
    this.queueReveal(() =>
      el(`<div class="reveal"><div class="reveal-card" style="--rc:${rc}"><div class="rays"></div>
        <div class="r-kicker">${isNew ? 'New Discovery!' : 'Found'}</div>
        <div class="r-icon">${iconSVG(id, { size: 120 })}</div>
        <div class="r-name">${d.name}${n > 1 ? ` ×${n}` : ''}</div>
        <span class="r-rarity" style="background:${rc}">${RARITY_LABEL[d.rarity]} · ${CATEGORY_LABEL[d.category]}</span>
        <div class="r-desc">${d.desc}</div>
        <button class="btn r-ok" style="min-width:160px">${isNew ? 'Add to Catalog' : 'Stow it'}</button></div></div>`)
    );
  }

  revealChest(title: string, loot: { id: string; n: number }[], sub: string) {
    this.queueReveal(() =>
      el(`<div class="reveal"><div class="reveal-card" style="--rc:#ffd25e"><div class="rays"></div>
        <div class="r-kicker">${sub}</div>
        <div class="r-name">${title}</div>
        <div class="r-loot">${loot.map((l, i) => `<div class="lchip" style="--c:${RARITY_COLOR[item(l.id).rarity]};animation-delay:${0.15 + i * 0.12}s">${iconSVG(l.id, { size: 30 })}${item(l.id).name}${l.n > 1 ? ` ×${l.n}` : ''}</div>`).join('')}</div>
        <button class="btn r-ok" style="min-width:160px">Haul it aboard</button></div></div>`)
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
      el(`<div class="reveal"><div class="reveal-card" style="--rc:#5fc47a"><div class="rays"></div>
        <div class="r-kicker">Collection Milestone</div>
        <div class="r-name">${name}</div>
        <div class="r-desc">${desc}<br><br><b>Reward:</b> ${reward}</div>
        <button class="btn r-ok" style="min-width:160px">Splendid!</button></div></div>`)
    );
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
      <div class="ts-logo">TIDEBREAKERS</div>
      <div class="ts-sub">The ocean is full of secrets.</div>
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
        return this.harborPanel();
      case 'appraiser':
        return this.appraiserPanel();
      case 'shipwright':
        return this.shipwrightPanel();
      case 'cartographer':
        return this.cartographerPanel();
      case 'curios':
        return this.curiosPanel();
    }
  }

  // Harbor hub
  harborPanel() {
    const { body } = this.openSheet('Port Saltwhistle', 'Home port · your cargo is unloaded into the vault');
    const s = this.store;
    const vaultCount = s.data.vault.reduce((a, b) => a + b.n, 0);
    const sellable = s.data.vault.filter((v) => item(v.id).category !== 'resource').length;
    body.innerHTML = `
      ${this.npcCard('pip', 'appraiser', sellable ? `“Ooh, what have you brought me? Let’s have a look!”` : '“Bring me treasure and I’ll bring you gold.”')}
      ${this.npcCard('marlo', 'shipwright', '“That dinghy floats out of habit. Let’s fix that.”')}
      ${this.npcCard('wren', 'cartographer', s.data.fragments.length ? '“A map fragment! Show it to old Wren.”' : '“Every map is a promise someone forgot to keep.”')}
      ${this.npcCard('odessa', 'curios', '“A ship should look like its captain. Yours looks… damp.”')}
      <div class="note">Vault: ${vaultCount} items stored · ${s.discoveryCount}/${CATALOG_ITEMS.length} discoveries cataloged</div>
      <button class="act setsail">⛵ Set Sail</button>`;
    body.querySelectorAll<HTMLElement>('.npc').forEach((n) => n.addEventListener('click', () => {
      audio.ui();
      this.openPanel(n.dataset.go!);
    }));
    body.querySelector('.setsail')!.addEventListener('click', () => {
      this.closePanel();
      this.game.setSail();
    });
  }

  private npcCard(id: keyof typeof NPCS, go: string, line: string) {
    const n = NPCS[id];
    return `<button class="npc" data-go="${go}"><div class="avatar" style="background:${n.color}">${n.face}</div><div><div class="n-role">${n.role}</div><div class="n-name">${n.name}</div><div class="n-line">${line}</div></div></button>`;
  }

  private backBtn(body: HTMLElement) {
    if (!this.game.isDocked()) return;
    const b = el(`<button class="btn ghost" style="margin-bottom:10px">← Back to the harbor</button>`);
    b.addEventListener('click', () => this.harborPanel());
    body.prepend(b);
  }

  appraiserPanel() {
    const { body } = this.openSheet('Pip’s Appraisals', 'Sell treasure and materials for gold');
    const s = this.store;
    const render = () => {
      const stacks = [...s.data.vault, ...s.data.cargo].reduce((acc, st) => {
        acc[st.id] = (acc[st.id] ?? 0) + st.n;
        return acc;
      }, {} as Record<string, number>);
      const ids = Object.keys(stacks).sort((a, b) => item(b).value - item(a).value);
      const total = ids.reduce((sum, id) => sum + item(id).value * stacks[id], 0);
      body.innerHTML = `<div class="speech"><b>Pip:</b> ${ids.length ? `“I’ll give you a fair price for any of it. Your Catalog keeps the record forever, even if you sell. Total worth: <b>${total}g</b>.”` : '“Nothing to appraise! Go dig something up.”'}</div>`;
      for (const id of ids) {
        const d = item(id);
        const n = stacks[id];
        const isTrophy = s.data.trophies.includes(id);
        const row = el(`<div class="row" style="border-color:${RARITY_COLOR[d.rarity]}">${iconSVG(id)}<div class="r-main"><div class="r-title">${d.name} ×${n}</div><div class="r-sub">${d.value}g each · ${RARITY_LABEL[d.rarity]}${d.displayable ? ' · can be displayed on your ship' : ''}${d.category === 'resource' ? ' · used by the shipwright' : ''}</div></div>
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
    const { body } = this.openSheet('Keelhart & Daughters', 'Shipwright · functional upgrades', { short: true });
    this.game.setShowcase(true);
    const s = this.store;
    const render = () => {
      const st = s.stats;
      body.innerHTML = `<div class="speech"><b>Marlo:</b> “Every plank I add, you’ll see. That’s my guarantee. Also my only guarantee.”</div>
        <div class="statgrid"><div class="stat"><b>${st.speed.toFixed(1)}</b><span>top speed</span></div><div class="stat"><b>${st.cargo}</b><span>cargo slots</span></div><div class="stat"><b>${st.turn.toFixed(2)}</b><span>turning</span></div></div>`;
      const slots: UpgradeSlot[] = ['sail', 'storage', 'steering', 'navigation', 'hull'];
      for (const slot of slots) {
        body.append(el(`<div class="section-title">${SLOT_LABEL[slot]}</div>`));
        for (const u of UPGRADES.filter((u) => u.slot === slot)) {
          const owned = s.has(u.id);
          const locked = !!u.requires && !s.has(u.requires);
          const afford = s.canAfford(u.cost);
          const row = el(`<div class="row ${owned ? 'owned' : ''} ${locked ? 'locked' : ''}"><div class="r-main"><div class="r-title">${u.name}${owned ? ' ✔' : ''}</div><div class="r-sub">${u.desc}</div>${owned ? '' : locked ? `<div class="r-sub"><b>Requires ${UPGRADE_MAP[u.requires!].name}</b></div>` : costHTML(s, u.cost)}</div>
            ${owned ? '<span class="rar" style="background:#3fa55a">Installed</span>' : `<button class="btn" ${!afford || locked ? 'disabled' : ''}>Install</button>`}</div>`);
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
        const row = el(`<div class="row ${owned ? 'owned' : ''}"><div class="r-main"><div class="r-title">${v.name}${current ? ' (sailing)' : ''}</div><div class="r-sub">${v.desc}<br>Speed ${v.speed} · Cargo ${v.cargo} · Trophy slots ${v.trophySlots}${v.crossSwell ? ' · crosses the open swell' : ''}</div>${!owned && v.cost ? costHTML(s, v.cost) : ''}</div>
          ${current ? '<span class="rar" style="background:#3fa55a">Yours</span>' : owned ? '<button class="btn ghost">Switch</button>' : `<button class="btn" ${v.cost && !s.canAfford(v.cost) ? 'disabled' : ''}>Commission</button>`}</div>`);
        row.querySelector('button')?.addEventListener('click', () => {
          this.game.buyVessel(v.id);
          render();
        });
        body.append(row);
      }
      body.append(el(`<div class="note">Upgrades carry over to every vessel you own. Materials come from beaches, digs and wrecks.</div>`));
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
    const rumours = [
      '“The Wren went down inside the reef ring north of here. Breakers ate her. Copper on your hull and you’d slide right over.”',
      '“The Lantern Rock keeper kept his sea-chest locked. Kept the key somewhere silly, too. Keepers are like that.”',
      '“Beyond the swell lies the Emerald Coast. Dinghies need not apply.”',
      '“Dig where the sand looks lonely. Treasure gets lonely.”',
    ];
    body.innerHTML = `<div class="speech"><b>Old Wren:</b> ${hints[0] ?? rumours[Math.floor(Math.random() * rumours.length)]}</div>${hints.slice(1).map((h) => `<div class="speech">${h}</div>`).join('')}
      <div class="speech" style="background:#fffaf0">${rumours.filter((r) => !hints.includes(r)).slice(0, 2).join('<br><br>')}</div>
      <button class="btn">Open my maps</button>`;
    body.querySelector('.btn')!.addEventListener('click', () => this.openPanel('maps'));
    this.backBtn(body);
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
          const c = el(`<button class="cell" style="--c:${on ? '#3fa55a' : RARITY_COLOR[d.rarity]}">${iconSVG(d.id)}<div class="c-name">${d.name}</div>${on ? '<div class="c-n">✔</div>' : ''}</button>`);
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
    const { body, tabs } = this.openSheet(s.vesselDef.name, 'Your ship · stats, decoration & trophies', { short: true });
    this.game.setShowcase(true);
    let tab = 'look';
    const render = () => {
      this.setTabs(tabs, [{ id: 'look', label: 'Customize' }, { id: 'stats', label: 'Equipment' }], tab, (t) => {
        tab = t;
        render();
      });
      body.innerHTML = '';
      if (tab === 'look') this.renderCustomize(body, false);
      else {
        const st = s.stats;
        body.innerHTML = `<div class="statgrid"><div class="stat"><b>${st.speed.toFixed(1)}</b><span>top speed</span></div><div class="stat"><b>${st.cargo}</b><span>cargo slots</span></div><div class="stat"><b>${st.turn.toFixed(2)}</b><span>turning</span></div>
          <div class="stat"><b>${st.reef ? 'Yes' : 'No'}</b><span>reef-safe hull</span></div><div class="stat"><b>${st.crossSwell ? 'Yes' : 'No'}</b><span>open swell</span></div><div class="stat"><b>${st.compass ? 'Yes' : 'No'}</b><span>treasure compass</span></div></div>`;
        for (const slot of ['sail', 'storage', 'steering', 'navigation', 'hull'] as UpgradeSlot[]) {
          const best = s.bestInSlot(slot);
          body.append(el(`<div class="row ${best ? 'owned' : ''}"><div class="r-main"><div class="r-title">${SLOT_LABEL[slot]}: ${best ? best.name : 'Stock'}</div><div class="r-sub">${best ? best.desc : 'Visit Marlo the Shipwright in port to upgrade.'}</div></div></div>`));
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
      body.innerHTML = list.length ? '' : `<div class="empty">${tab === 'cargo' ? 'Your hold is empty. Go find something!' : 'Nothing stored. Dock at Port Saltwhistle to unload cargo here.'}</div>`;
      if (tab === 'cargo') body.prepend(el(`<div class="note">Small things stack. Treasure chests and story finds always come aboard. Docking unloads everything into your vault.</div>`));
      for (const st of list) {
        const d = item(st.id);
        const slots = Math.ceil(st.n / d.stack);
        const row = el(`<div class="row" style="border-color:${RARITY_COLOR[d.rarity]}">${iconSVG(st.id)}<div class="r-main"><div class="r-title">${d.name} ×${st.n}</div><div class="r-sub">${tab === 'cargo' ? `${slots} slot${slots > 1 ? 's' : ''} · stacks to ${d.stack}` : CATEGORY_LABEL[d.category]} · worth ${d.value}g each</div></div>${tab === 'cargo' ? '<button class="btn ghost">Toss 1</button>' : ''}</div>`);
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
    const { body, tabs } = this.openSheet('Discovery Catalog', `${s.discoveryCount} of ${CATALOG_ITEMS.length} discovered · ${Math.round((s.discoveryCount / CATALOG_ITEMS.length) * 100)}%`);
    let tab: string = cat ?? 'all';
    let selected: string | null = null;
    const render = () => {
      this.setTabs(tabs, [{ id: 'all', label: 'All' }, ...cats.map((c) => ({ id: c, label: CATEGORY_LABEL[c] })), { id: 'milestones', label: '★ Milestones' }], tab, (t) => {
        tab = t;
        selected = null;
        render();
      });
      body.innerHTML = '';
      if (tab === 'milestones') {
        for (const m of MILESTONES) {
          const done = s.data.milestones.includes(m.id);
          let prog = 0, need = 1;
          if (m.cond.kind === 'category') { prog = s.categoryCount(m.cond.category); need = m.cond.n; }
          else if (m.cond.kind === 'chests') { prog = s.data.chestsOpened; need = m.cond.n; }
          else { prog = s.discoveryCount; need = m.cond.n; }
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
          <span class="rar" style="background:${RARITY_COLOR[d.rarity]}">${RARITY_LABEL[d.rarity]}</span>
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
          const cell = el(`<button class="cell ${disc ? '' : 'unknown'} ${isNew ? 'new' : ''}" style="--c:${disc ? RARITY_COLOR[d.rarity] : ''}">${iconSVG(d.id, { silhouette: !disc })}<div class="c-name">${disc ? d.name : '???'}</div>${disc ? `<div class="c-n">×${disc.count}</div>` : ''}</button>`);
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
        localStorage.setItem('tidebreakers.seen', JSON.stringify([...this.seenCatalog]));
      } catch {
        /* ignore */
      }
    };
    render();
  }

  mapsPanel(focus?: string) {
    const s = this.store;
    const { body, tabs } = this.openSheet('Maps & Charts', 'Treasure maps and the known world');
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
        const c = document.createElement('canvas');
        c.className = 'map-canvas';
        const am = s.data.activeMap ? TREASURE_MAPS.find((m) => m.id === s.data.activeMap) : null;
        const tgt = am && am.fragments.every((f) => s.data.fragments.includes(f)) && !s.data.mapsCompleted.includes(am.id) ? { x: ISLAND_MAP[am.island].x + am.x, z: ISLAND_MAP[am.island].z + am.z } : null;
        drawWorldChart(c, s.data.islandsVisited, this.game.shipState(), tgt);
        body.append(c);
        body.append(el(`<div class="note">Islands visited: ${s.data.islandsVisited.length - 1} · The dashed ring marks the open swell. The red ring is the reef.</div>`));
        if (!owned.length) body.append(el(`<div class="empty">No treasure maps yet. Bottles wash up on beaches…</div>`));
        return;
      }
      const m = TREASURE_MAPS.find((m) => m.id === tab)!;
      const complete = m.fragments.every((f) => s.data.fragments.includes(f));
      const done = s.data.mapsCompleted.includes(m.id);
      const c = document.createElement('canvas');
      c.className = 'map-canvas';
      drawTreasureMap(c, m, s.data.fragments);
      body.append(c);
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
      <div class="section-title">Progress</div>
      <div class="statgrid"><div class="stat"><b>${s.discoveryCount}</b><span>discoveries</span></div><div class="stat"><b>${s.data.stats.goldEarned}</b><span>gold earned</span></div><div class="stat"><b>${Math.round(s.data.stats.distance)}</b><span>meters sailed</span></div>
      <div class="stat"><b>${s.data.islandsVisited.length - 1}</b><span>islands visited</span></div><div class="stat"><b>${s.data.upgrades.length}</b><span>upgrades</span></div><div class="stat"><b>${s.data.chestsOpened}</b><span>chests opened</span></div></div>
      <button class="btn green save" style="width:100%;margin:6px 0">Save now</button>
      <div class="note">Progress saves automatically on this device after every discovery, sale and upgrade.</div>
      <div class="section-title">How to play</div>
      <div class="note" style="text-align:left">• Drag the ship’s wheel toward where you want to go. Push further for more sail.<br>• Drag anywhere else on screen to look around. Pinch to zoom.<br>• Sailing with the wind at your side or back is fastest.<br>• Anchor near islands to go ashore. Shells glint on beaches.<br>• Read treasure maps carefully and DIG at the X.</div>
      <button class="btn danger reset" style="width:100%;margin-top:16px">Start a new voyage (erase save)</button>`;
    const sfx = body.querySelector('.sfx') as HTMLInputElement;
    const mus = body.querySelector('.mus') as HTMLInputElement;
    const hap = body.querySelector('.hap') as HTMLInputElement;
    const apply = () => {
      s.data.settings.sfx = +sfx.value;
      s.data.settings.music = +mus.value;
      s.data.settings.haptics = hap.checked;
      audio.setVolumes(+sfx.value, +mus.value);
      s.commit();
    };
    sfx.addEventListener('input', apply);
    mus.addEventListener('input', apply);
    hap.addEventListener('change', apply);
    body.querySelector('.save')!.addEventListener('click', () => {
      s.saveNow();
      this.toast('Progress saved ✔', { color: '#3fa55a' });
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
