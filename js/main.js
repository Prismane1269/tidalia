/* ==========================================================================
   TIDALIA — boot: asset-aware cinematic loader, module init, master loop
   ========================================================================== */
(function () {
  'use strict';
  const T = (window.TIDALIA = window.TIDALIA || {});
  const U = T.util;

  /* ------------------------------------------------------------ asset state */
  T.assets = {
    value: 0, ready: false, texturesReady: false,
    _expected: 0, _done: {},
    /** a 3D scene is about to boot */
    expect(name) { this._expected++; this._pending = (this._pending || {}); this._pending[name] = true; },
    /** a 3D scene has booted (geometry up, textures may still stream) */
    done(name) {
      this._done[name] = true;
      delete (this._pending || {})[name];
      this.ready = Object.keys(this._done).length >= this._expected;
    },
    /** pages with no texture-streaming scene are texture-ready from the start */
    requireTextures(name) { this._tex = (this._tex || {}); this._tex[name] = false; this.texturesReady = false; },
    texturesDone(name) {
      this._tex = this._tex || {};
      this._tex[name] = true;
      const need = Object.keys(this._tex).filter((k) => this._tex[k] === false);
      this.texturesReady = need.length === 0;
    },
    progress(v) { this.value = Math.max(this.value, U.clamp(v)); }
  };
  // no streaming 3D textures on this page? then we are texture-ready immediately
  T.assets.texturesReady = !document.getElementById('journey-canvas') && !document.getElementById('realms-canvas');

  /* ------------------------------------------------------------ loader */
  function runLoader() {
    const loader = document.getElementById('loader');
    if (!loader) return;
    const bar = loader.querySelector('.loader-bar i');
    const pct = loader.querySelector('.loader-pct');
    const hint = loader.querySelector('.loader-hint');
    const started = performance.now();
    let p = 0, target = 0, pageLoaded = false;

    const hints = ['calibrating the tide…', 'pressing the first record…', 'tuning 8 tentacles…', 'finding the lagoon…'];
    let hi = 0;
    const hintTimer = setInterval(() => { if (hint) { hi = (hi + 1) % hints.length; hint.textContent = hints[hi]; } }, 1400);

    window.addEventListener('load', () => { pageLoaded = true; });
    setTimeout(() => { pageLoaded = true; }, 7000);   // never let the loader trap anyone

    function tick() {
      const elapsed = (performance.now() - started) / 1000;
      const scenesUp = T.assets.ready && T.assets.texturesReady;
      const ready = (scenesUp && (pageLoaded || elapsed > 1.4)) || elapsed > 5.2 ||
        (elapsed > 1.9 && T.assets.ready && T.assets.value >= 0.25);   // progressive: reveal, stream the rest
      target = ready ? 100 : Math.min(94, 18 + T.assets.value * 62 + Math.min(26, elapsed * 26));
      // once everything is up, finish briskly instead of creeping asymptotically
      const step = ready ? Math.max(2.6, (target - p) * 0.2) : Math.max(0.6, (target - p) * 0.09);
      p = Math.min(target, p + step);
      if (ready && elapsed > 1.5 && p > 76) p = Math.min(100, p + 4);
      if (bar) bar.style.width = p.toFixed(1) + '%';
      if (pct) pct.textContent = String(Math.round(p)).padStart(2, '0') + '%';
      if (ready && p > 98.4) {
        clearInterval(hintTimer);
        if (bar) bar.style.width = '100%';
        if (pct) pct.textContent = '100%';
        loader.classList.add('is-done');
        document.documentElement.classList.add('is-ready');
        document.dispatchEvent(new CustomEvent('tidalia:ready'));
        setTimeout(() => { loader.style.display = 'none'; }, 900);
        return;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------ boot */
  function boot() {
    document.documentElement.classList.add('js');

    // init modules (registration order is dependency order)
    T.modules.forEach((m) => {
      if (!m.init) return;
      try { m.init(); } catch (e) { console.error('[init ' + (m.name || '?') + ']', e); }
    });

    // after every scene has registered, settle: a page whose scenes are all up
    // (or that has no 3D scenes at all) is ready right away
    T.assets.ready = Object.keys(T.assets._done).length >= T.assets._expected;

    // reflect sound state on first paint
    document.dispatchEvent(new CustomEvent('tidalia:sound', { detail: { on: false } }));

    // start the single render loop
    T.start();

    // smooth-scroll to hash once things are ready
    if (window.location.hash) {
      const el = document.querySelector(window.location.hash);
      if (el) setTimeout(() => { window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - 70, behavior: 'auto' }); }, 260);
    }

    // pause rendering work when the tab is hidden (battery friendliness)
    document.addEventListener('visibilitychange', () => {
      T.hidden = document.hidden;
      T.modules.forEach((m) => { m.hiddenPaused = document.hidden; });
    });

    runLoader();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
