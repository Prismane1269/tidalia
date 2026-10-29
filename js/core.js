/* ==========================================================================
   TIDALIA — core: module registry, scroll driver, pointer, math utils
   Everything renders from ONE requestAnimationFrame loop (see main.js)
   ========================================================================== */
(function () {
  'use strict';

  const T = (window.TIDALIA = window.TIDALIA || {});
  T.version = '1.0.0';
  T.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  T.touch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  T.modules = [];

  /* ---------------------------------------------------------------- utils */
  const U = T.util = {
    clamp: (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    /* frame-rate independent smoothing */
    damp: (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt)),
    /* smoothstep / ease curves */
    smooth: (t) => t * t * (3 - 2 * t),
    easeOut: (t) => 1 - Math.pow(1 - t, 3),
    easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    /* map p from [a,b] -> [0,1] clamped, then optionally eased */
    range: (p, a, b, easing) => {
      const t = U.clamp((p - a) / (b - a));
      return easing ? easing(t) : t;
    },
    /* fade in over [a,b] then out over [c,d] */
    window: (p, a, b, c, d) => U.range(p, a, b) * (1 - U.range(p, c, d)),
    rand: (seed) => {
      // deterministic pseudo random 0..1
      const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    },
    hash(str) {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
      return (h >>> 0);
    },
    fmtTime: (s) => {
      const m = Math.floor(s / 60), r = Math.floor(s % 60);
      return m + ':' + String(r).padStart(2, '0');
    },
    $(sel, root) { return (root || document).querySelector(sel); },
    $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); },
    on(el, ev, fn, opt) { if (el) el.addEventListener(ev, fn, opt); }
  };

  /* ---------------------------------------------------------------- scroll */
  const Scroll = T.Scroll = {
    y: 0, prevY: 0, vel: 0, vh: window.innerHeight, vw: window.innerWidth,
    docH: document.body.scrollHeight,
    _cache: new Map(),
    _resizeFns: [],

    /** progress 0..1 of a "spans-n-viewports" element (sticky pattern). */
    progress(el) {
      if (!el) return 0;
      let m = this._cache.get(el);
      if (!m || m.w !== this.vw || m.h !== this.docH) {
        const r = el.getBoundingClientRect();
        m = { top: r.top + this.y, height: r.height, w: this.vw, h: this.docH };
        this._cache.set(el, m);
      }
      const span = Math.max(1, m.height - this.vh);
      return U.clamp((this.y - m.top) / span);
    },

    /** 0..1 progress of an element entering from the bottom of the viewport. */
    enter(el) {
      const r = el.getBoundingClientRect();
      return U.clamp(1 - r.top / this.vh);
    },

    inView(el, pad) {
      const r = el.getBoundingClientRect();
      const p = pad || 0;
      return r.bottom > -p && r.top < this.vh + p;
    },

    /** smoothed helpers kept in a scratch registry, damped per frame */
    smooth(key, target, rate, dt) {
      const s = (this._smooth = this._smooth || {});
      if (s[key] === undefined) s[key] = target;
      s[key] = U.damp(s[key], target, rate === undefined ? 8 : rate, dt);
      return s[key];
    },

    invalidate() { this._cache.clear(); },

    onResize(fn) { this._resizeFns.push(fn); },

    _tick() {
      this.prevY = this.y;
      this.y = window.pageYOffset || document.documentElement.scrollTop || 0;
      this.vel = this.y - this.prevY;
      this.vh = window.innerHeight; this.vw = window.innerWidth;
      this.docH = document.body.scrollHeight;
    },
    init() {
      let t;
      U.on(window, 'resize', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          this.vh = window.innerHeight; this.vw = window.innerWidth;
          this.invalidate();
          this._resizeFns.forEach((f) => { try { f(); } catch (e) { console.warn(e); } });
        }, 120);
      });
      U.on(window, 'orientationchange', () => { this.invalidate(); });
      window.addEventListener('load', () => { this.invalidate(); this._resizeFns.forEach((f) => f()); });
    }
  };

  /* ---------------------------------------------------------------- pointer */
  const Pointer = T.pointer = {
    x: window.innerWidth / 2, y: window.innerHeight / 2,
    nx: 0, ny: 0,          // normalized -1..1
    sx: 0, sy: 0,          // smoothed -1..1
    dx: 0, dy: 0,
    down: false,
    init() {
      U.on(window, 'pointermove', (e) => {
        this.dx = e.clientX - this.x; this.dy = e.clientY - this.y;
        this.x = e.clientX; this.y = e.clientY;
        this.nx = (e.clientX / window.innerWidth) * 2 - 1;
        this.ny = -((e.clientY / window.innerHeight) * 2 - 1);
      }, { passive: true });
      U.on(window, 'pointerdown', () => { this.down = true; document.body.classList.add('is-cursor-down'); });
      U.on(window, 'pointerup', () => { this.down = false; document.body.classList.remove('is-cursor-down'); });
      U.on(window, 'pointerleave', () => { this.nx = 0; this.ny = 0; });
    },
    update(dt) {
      this.sx = U.damp(this.sx, this.nx, 4, dt);
      this.sy = U.damp(this.sy, this.ny, 4, dt);
    }
  };

  /* ---------------------------------------------------------------- module API */
  T.register = function (mod) { T.modules.push(mod); };

  /* ---------------------------------------------------------------- loop */
  let last = performance.now(), running = false;
  T.fps = 60;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000) || 0.016;
    last = now;
    T.fps = T.fps * 0.92 + (1 / Math.max(0.0001, dt)) * 0.08;
    Scroll._tick();
    Pointer.update(dt);
    const t = now / 1000;
    for (let i = 0; i < T.modules.length; i++) {
      const m = T.modules[i];
      if (!m.update) continue;
      if (m.paused && m.paused()) continue;
      try { m.update(t, dt, Scroll, Pointer); } catch (e) { console.error('[' + (m.name || i) + '] ' + (e && e.message) + ' @ ' + ((e && e.stack) || '').split('\n')[1]); }
    }
    requestAnimationFrame(frame);
  }
  T.start = function () {
    if (running) return; running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  };

  Scroll.init();
  Pointer.init();
})();
