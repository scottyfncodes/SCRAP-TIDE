// A pinch-to-zoom, drag-to-pan map surface for the Maps & Charts panel (world chart and treasure maps).
//
// Touch: two-finger pinch zooms about the fingers' midpoint (and pans with it), one finger drags, double-tap zooms in.
// Mouse: wheel zooms about the cursor, drag pans, double-click zooms. Buttons: zoom in, zoom out, centre on the ship.
// The map owns its gestures (touch-action: none, captured pointers), so nothing reaches the game underneath: the
// game's camera gestures are bound to the WebGL canvas only and steering is paused while a panel is open.
// The content is re-painted as vectors at each view, so text and lines stay crisp at every zoom level.

/** world → CSS pixel transform: px = (x - x0) * s, py = (z - z0) * s */
export interface ChartView {
  x0: number;
  z0: number;
  s: number;
  /** zoom relative to "whole map fits" (1) */
  zoom: number;
}

export interface MapContent {
  bounds: { x0: number; z0: number; x1: number; z1: number };
  /** width / height of the map surface */
  aspect: number;
  maxZoom: number;
  /** where the locate button goes (the ship), if anywhere */
  focus?: { x: number; z: number };
  /** initial view; defaults to the whole map */
  start?: { cx: number; cz: number; zoom: number };
  label: string;
  paint(ctx: CanvasRenderingContext2D, w: number, h: number, view: ChartView): void;
}

type V = { cx: number; cz: number; zoom: number };
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export class ZoomableMap {
  readonly el: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private v: V;
  private raf = 0;
  private anim: { from: V; to: V; t0: number; dur: number } | null = null;
  private pts = new Map<number, { x: number; y: number }>();
  private pinch: { d: number; mx: number; my: number } | null = null;
  private tap: { t: number; x: number; y: number; moved: number } | null = null;
  private lastTap = { t: 0, x: 0, y: 0 };
  private ro: ResizeObserver | null = null;
  /** called whenever the view settles (to remember it between openings) */
  onView: ((v: V) => void) | null = null;

  constructor(private content: MapContent) {
    const b = content.bounds;
    this.v = content.start ? { ...content.start } : { cx: (b.x0 + b.x1) / 2, cz: (b.z0 + b.z1) / 2, zoom: 1 };
    const el = document.createElement('div');
    el.className = 'zmap';
    el.style.setProperty('--aspect', String(content.aspect));
    el.innerHTML = `<canvas role="img" aria-label="${content.label}"></canvas>
      <div class="zmap-btns">
        <button class="zmap-btn" data-z="in" aria-label="Zoom in">+</button>
        <button class="zmap-btn" data-z="out" aria-label="Zoom out">&minus;</button>
        ${content.focus ? '<button class="zmap-btn" data-z="me" aria-label="Centre on your boat">&#x2316;</button>' : ''}
      </div>`;
    this.el = el;
    this.canvas = el.querySelector('canvas')!;
    this.ctx = this.canvas.getContext('2d')!;
    this.bind();
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(el);
    }
    requestAnimationFrame(() => this.resize());
  }

  /** current view (for tests and for remembering it) */
  get view(): V {
    return { ...this.v };
  }

  private baseScale() {
    const b = this.content.bounds;
    return Math.min(this.w / (b.x1 - b.x0), this.h / (b.z1 - b.z0));
  }

  /** keep the zoom in range and never let the map leave the frame */
  private clampView(v: V): V {
    const b = this.content.bounds;
    const zoom = clamp(v.zoom, 1, this.content.maxZoom);
    const s = this.baseScale() * zoom || 1;
    const hw = this.w / s / 2, hh = this.h / s / 2;
    const mx = (b.x0 + b.x1) / 2, mz = (b.z0 + b.z1) / 2;
    const cx = hw * 2 >= b.x1 - b.x0 ? mx : clamp(v.cx, b.x0 + hw, b.x1 - hw);
    const cz = hh * 2 >= b.z1 - b.z0 ? mz : clamp(v.cz, b.z0 + hh, b.z1 - hh);
    return { cx, cz, zoom };
  }

  private chartView(v: V): ChartView {
    const s = this.baseScale() * v.zoom;
    return { x0: v.cx - this.w / s / 2, z0: v.cz - this.h / s / 2, s, zoom: v.zoom };
  }

  private toWorld(px: number, py: number, v = this.v) {
    const cv = this.chartView(v);
    return { x: cv.x0 + px / cv.s, z: cv.z0 + py / cv.s };
  }

  /** zoom to `zoom` keeping the world point under screen (px, py) where it is */
  private zoomAbout(v: V, zoom: number, px: number, py: number): V {
    const wpt = this.toWorld(px, py, v);
    const nz = clamp(zoom, 1, this.content.maxZoom);
    const s = this.baseScale() * nz;
    return this.clampView({ zoom: nz, cx: wpt.x - (px - this.w / 2) / s, cz: wpt.z - (py - this.h / 2) / s });
  }

  private set(v: V, animate = 0) {
    const to = this.clampView(v);
    if (animate > 0) this.anim = { from: { ...this.v }, to, t0: performance.now(), dur: animate };
    else {
      this.anim = null;
      this.v = to;
    }
    this.request();
  }

  /** repaint (e.g. when content finished loading) */
  refresh() {
    this.request();
  }

  private request() {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.draw();
    });
  }

  private resize() {
    const r = this.el.getBoundingClientRect();
    const w = Math.round(r.width), h = Math.round(r.width / this.content.aspect);
    if (!w || (w === this.w && h === this.h)) return;
    this.w = w;
    this.h = h;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.height = `${h}px`;
    this.v = this.clampView(this.v);
    this.draw();
  }

  private draw() {
    if (!this.w) return;
    if (this.anim) {
      const k = clamp((performance.now() - this.anim.t0) / this.anim.dur, 0, 1);
      const e = 1 - Math.pow(1 - k, 3);
      const { from, to } = this.anim;
      // interpolate zoom geometrically so it feels even
      this.v = { cx: from.cx + (to.cx - from.cx) * e, cz: from.cz + (to.cz - from.cz) * e, zoom: from.zoom * Math.pow(to.zoom / from.zoom, e) };
      if (k < 1) this.request();
      else {
        this.anim = null;
        this.onView?.(this.v);
      }
    }
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    this.content.paint(ctx, this.w, this.h, this.chartView(this.v));
    const d = this.el.dataset;
    d.zoom = this.v.zoom.toFixed(3);
    d.cx = this.v.cx.toFixed(1);
    d.cz = this.v.cz.toFixed(1);
  }

  private local(e: { clientX: number; clientY: number }) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private bind() {
    const c = this.canvas;
    const stop = (e: Event) => {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
    };
    c.addEventListener('pointerdown', (e) => {
      stop(e);
      c.setPointerCapture?.(e.pointerId);
      const p = this.local(e);
      this.pts.set(e.pointerId, p);
      this.anim = null;
      if (this.pts.size === 1) this.tap = { t: performance.now(), x: p.x, y: p.y, moved: 0 };
      else this.tap = null;
      if (this.pts.size === 2) this.pinch = this.pinchState();
    });
    c.addEventListener('pointermove', (e) => {
      const prev = this.pts.get(e.pointerId);
      if (!prev) return;
      stop(e);
      const p = this.local(e);
      if (this.pts.size === 1) {
        const s = this.baseScale() * this.v.zoom;
        if (this.tap) this.tap.moved += Math.hypot(p.x - prev.x, p.y - prev.y);
        this.pts.set(e.pointerId, p);
        this.set({ ...this.v, cx: this.v.cx - (p.x - prev.x) / s, cz: this.v.cz - (p.y - prev.y) / s });
        return;
      }
      this.pts.set(e.pointerId, p);
      if (this.pts.size >= 2 && this.pinch) {
        const now = this.pinchState();
        // zoom about the previous midpoint, then follow the midpoint as it moves
        let v = this.zoomAbout(this.v, (this.v.zoom * now.d) / Math.max(1, this.pinch.d), this.pinch.mx, this.pinch.my);
        const s = this.baseScale() * v.zoom;
        v = { ...v, cx: v.cx - (now.mx - this.pinch.mx) / s, cz: v.cz - (now.my - this.pinch.my) / s };
        this.set(v);
        this.pinch = now;
      }
    });
    const up = (e: PointerEvent) => {
      if (!this.pts.has(e.pointerId)) return;
      stop(e);
      this.pts.delete(e.pointerId);
      if (this.pts.size === 1) {
        this.pinch = null;
        this.tap = null;
      }
      if (this.pts.size === 0) {
        this.pinch = null;
        const t = this.tap;
        this.tap = null;
        const now = performance.now();
        if (t && now - t.t < 300 && t.moved < 10) {
          const lt = this.lastTap;
          if (now - lt.t < 350 && Math.hypot(t.x - lt.x, t.y - lt.y) < 30) {
            // double-tap: zoom in about the tap; at max zoom, back out to the whole chart
            const atMax = this.v.zoom >= this.content.maxZoom * 0.98;
            this.set(atMax ? { ...this.v, zoom: 1 } : this.zoomAbout(this.v, this.v.zoom * 2, t.x, t.y), 260);
            this.lastTap = { t: 0, x: 0, y: 0 };
            return;
          }
          this.lastTap = { t: now, x: t.x, y: t.y };
        }
        this.onView?.(this.v);
      }
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('lostpointercapture', (e) => {
      this.pts.delete(e.pointerId);
      if (this.pts.size < 2) this.pinch = null;
    });
    c.addEventListener('wheel', (e) => {
      stop(e);
      const p = this.local(e);
      this.set(this.zoomAbout(this.v, this.v.zoom * Math.exp(-e.deltaY * 0.0022), p.x, p.y));
      this.onView?.(this.v);
    }, { passive: false });
    // iOS Safari's own pinch gesture (the page is already user-scalable=no; this keeps it off the map too)
    c.addEventListener('gesturestart', stop as EventListener);
    c.addEventListener('dblclick', stop);
    c.addEventListener('contextmenu', stop);
    this.el.querySelector('.zmap-btns')!.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button');
      if (!b) return;
      e.stopPropagation();
      const z = b.dataset.z;
      if (z === 'in') this.set(this.zoomAbout(this.v, this.v.zoom * 1.8, this.w / 2, this.h / 2), 220);
      else if (z === 'out') this.set(this.zoomAbout(this.v, this.v.zoom / 1.8, this.w / 2, this.h / 2), 220);
      else if (z === 'me' && this.content.focus) this.set({ cx: this.content.focus.x, cz: this.content.focus.z, zoom: Math.max(this.v.zoom, 4) }, 320);
    });
  }

  private pinchState() {
    const [a, b] = [...this.pts.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  }
}
