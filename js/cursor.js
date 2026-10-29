/* ==========================================================================
   TIDALIA — custom cursor (dot + magnetic ring with label states)
   ========================================================================== */
(function () {
  'use strict';
  const T = (window.TIDALIA = window.TIDALIA || {});
  const U = T.util;

  T.register({
    name: 'cursor',
    init() {
      if (T.touch) return;
      const dot = document.createElement('div');
      const ring = document.createElement('div');
      dot.className = 'cursor';
      ring.className = 'cursor-ring';
      ring.innerHTML = '<span></span>';
      document.body.append(dot, ring);
      document.body.classList.add('cursor-ui');

      let rx = window.innerWidth / 2, ry = window.innerHeight / 2;
      let tx = rx, ty = ry;
      const label = ring.querySelector('span');

      const setState = (el) => {
        const interactive = el && el.closest && el.closest('a, button, [role="button"], input, textarea, .chip, [data-cursor]');
        document.body.classList.toggle('is-cursor-hover', !!interactive);
        const holder = el && el.closest && el.closest('[data-cursor-label]');
        document.body.classList.toggle('is-cursor-label', !!holder);
        if (holder) label.textContent = holder.dataset.cursorLabel;
      };

      U.on(window, 'pointermove', (e) => {
        tx = e.clientX; ty = e.clientY;
        dot.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0)';
        setState(e.target);
      }, { passive: true });

      U.on(window, 'pointerdown', () => { ring.style.scale = '0.86'; });
      U.on(window, 'pointerup', () => { ring.style.scale = '1'; });

      this.update = (t, dt) => {
        rx = U.damp(rx, tx, 14, dt);
        ry = U.damp(ry, ty, 14, dt);
        ring.style.transform = 'translate3d(' + rx.toFixed(2) + 'px,' + ry.toFixed(2) + 'px,0)';
      };
    }
  });
})();
