/* ==========================================================================
   TIDALIA — scroll reveals ("advanced text reveals")
   • [data-split] headings are split into masked words that rise into place
   • [data-reveal] elements fade/translate in, with optional stagger groups
   ========================================================================== */
(function () {
  'use strict';
  const T = (window.TIDALIA = window.TIDALIA || {});
  const U = T.util;

  function split(el) {
    if (el.dataset.splitDone) return;
    el.dataset.splitDone = '1';
    const walk = (node, target) => {
      Array.prototype.slice.call(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const words = child.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          words.forEach((w) => {
            if (!w.trim()) { frag.appendChild(document.createTextNode(w)); return; }
            const mask = document.createElement('span');
            mask.className = 'w-mask';
            const inner = document.createElement('span');
            inner.className = 'w';
            inner.textContent = w;
            mask.appendChild(inner);
            frag.appendChild(mask);
          });
          target.appendChild(frag);
        } else if (child.nodeType === 1) {
          const clone = child.cloneNode(false);
          target.appendChild(clone);
          walk(child, clone);
        }
      });
    };
    const out = document.createElement('span');
    out.className = 'split';
    walk(el, out);
    el.innerHTML = '';
    el.appendChild(out);
    // per word stagger
    U.$$('.w', el).forEach((w, i) => { w.style.transitionDelay = (i * 0.055).toFixed(3) + 's'; });
  }

  function arm(el) {
    if (el.dataset.revealDone) return;
    el.dataset.revealDone = '1';
    el.classList.add('is-in');
  }

  function afterReady(fn, fallback) {
    if (document.documentElement.classList.contains('is-ready')) return fn();
    const t = setTimeout(fn, fallback || 4000);
    document.addEventListener('tidalia:ready', () => { clearTimeout(t); fn(); }, { once: true });
  }

  T.register({
    name: 'reveals',
    init() {
      const splitEls = U.$$('[data-split]');
      const revealEls = U.$$('[data-reveal]');
      splitEls.forEach(split);

      if (!('IntersectionObserver' in window)) {
        splitEls.concat(revealEls).forEach(arm);
        return;
      }
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target;
          const delay = parseFloat(el.dataset.revealDelay || '0');
          const fire = () => { if (delay) setTimeout(() => arm(el), delay * 1000); else arm(el); };
          // the headline behind the intro curtain should perform after the curtain lifts
          if (el.hasAttribute('data-reveal-after-load')) afterReady(fire, 5200);
          else fire();
          io.unobserve(el);
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
      splitEls.concat(revealEls).forEach((el) => io.observe(el));

      // elements revealed by a parent group, staggered
      U.$$('[data-reveal-group]').forEach((group) => {
        const kids = U.$$('[data-reveal-item]', group);
        const gio = new IntersectionObserver((entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            kids.forEach((k, i) => setTimeout(() => k.classList.add('is-in'), i * 90));
            gio.unobserve(e.target);
          });
        }, { threshold: 0.2 });
        gio.observe(group);
      });
    }
  });
})();
