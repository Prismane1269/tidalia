/* ==========================================================================
   TIDALIA — pages: nav, sound, realm modal, composer flow, archive,
   tilt/magnetic hover effects, page transitions, toasts
   ========================================================================== */
(function () {
  'use strict';
  const T = (window.TIDALIA = window.TIDALIA || {});
  const U = T.util;
  const LS_KEY = 'tidalia:archive';

  /* -------------------------------------------------------------- toast */
  function toast(msg, sub) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      el.setAttribute('role', 'status');
      el.innerHTML = '<b></b><span></span>';
      document.body.appendChild(el);
    }
    el.querySelector('b').textContent = msg;
    el.querySelector('span').textContent = sub || '';
    el.classList.add('is-on');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('is-on'), 3600);
  }

  /* -------------------------------------------------------------- store */
  const Store = {
    read() {
      try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch (e) { return []; }
    },
    add(track) {
      const all = this.read();
      all.unshift(track);
      try { localStorage.setItem(LS_KEY, JSON.stringify(all.slice(0, 40))); } catch (e) {}
      return all;
    },
    count() { return this.read().length; }
  };

  /* -------------------------------------------------------------- waveform */
  const waves = [];
  function drawWave(entry, t) {
    const c = entry.canvas, ctx = c.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = c.clientWidth || 600, h = c.clientHeight || 56;
    if (c.width !== Math.floor(w * dpr) || c.height !== Math.floor(h * dpr)) {
      c.width = Math.floor(w * dpr); c.height = Math.floor(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const N = 96, gap = 2, bw = Math.max(1, (w - N * gap) / N);
    const level = T.audio ? T.audio.level : 0;
    const prog = entry.playing ? T.audio.trackProgress() : -1;
    for (let i = 0; i < N; i++) {
      const v = 0.16 + U.rand(entry.seed + i * 3.1) * 0.84;
      const v2 = 0.3 + Math.abs(Math.sin(i * 0.35 + U.rand(entry.seed + i) * 6)) * 0.7;
      let amp = Math.min(1, v * v2 * (0.6 + 0.7 * entry.reveal));
      if (entry.playing) {
        const d = Math.abs(i / N - prog);
        amp *= 0.65 + 0.75 * Math.exp(-d * 9) + level * 1.2;
      }
      const y = h / 2, bh = Math.max(2, amp * (h * 0.86));
      const played = entry.playing && i / N <= prog;
      const grd = ctx.createLinearGradient(0, y - bh / 2, 0, y + bh / 2);
      const accent = entry.accent || '#46e0ff';
      const a = entry.playing ? 1 : 0.62 + 0.2 * entry.reveal;
      grd.addColorStop(0, 'rgba(255,255,255,' + (a * 0.25) + ')');
      grd.addColorStop(0.5, played ? accent : accent);
      grd.addColorStop(1, 'rgba(255,255,255,' + (a * 0.18) + ')');
      ctx.globalAlpha = entry.reveal * (played || !entry.playing ? 1 : 0.45);
      ctx.fillStyle = grd;
      const x = i * (bw + gap);
      ctx.fillRect(x, y - bh / 2, bw, bh);
    }
    ctx.globalAlpha = 1;
    if (entry.playing && prog > 0) {
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.fillRect(prog * w, 4, 1.5, h - 8);
    }
  }

  /* -------------------------------------------------------------- title gen */
  const ADJ = ['Aphelion', 'Hollow', 'Saltbound', 'Moonlit', 'Paper', 'Slow', 'Velvet', 'Deepwater', 'Amber', 'Feral', 'Quiet', 'Blue'];
  const NOUN = ['Tide', 'Static', 'Harbour', 'Helium', 'Requiem', 'Halo', 'Verdict', 'Undertow', 'Lullaby', 'Signal', 'Garden', 'Departure'];
  const STOP = ['a', 'an', 'the', 'of', 'and', 'with', 'but', 'for', 'into', 'like', 'that', 'this', 'from', 'through', 'at', 'in', 'on', 'to', 'it', 'is', 'are'];
  const REALM_HINTS = [
    { id: 'reef', re: /(ocean|sea|reef|wave|tide|whale|water|drown|coral|deep|abyss)/ },
    { id: 'ice', re: /(ice|frozen|glacier|snow|winter|cold|cathedral|vault|frozen)/ },
    { id: 'chrome', re: /(neon|city|chrome|metal|car|drive|highway|rain|synth|street|mirror|desert)/ },
    { id: 'lantern', re: /(lantern|lamp|warm|folk|village|dusk|home|fire|paper)/ },
    { id: 'jungle', re: /(jungle|forest|tree|moss|mushroom|spore|vines|night|insect|drum)/ },
    { id: 'lagoon', re: /(cassette|tape|lofi|memory|nostalgia|summer|old|radio|vinyl|childhood)/ }
  ];
  function inferRealm(promptText) {
    const p = promptText.toLowerCase();
    for (let i = 0; i < REALM_HINTS.length; i++) if (REALM_HINTS[i].re.test(p)) return REALM_HINTS[i].id;
    return 'lagoon';
  }
  function generateTrack(promptText) {
    const clean = String(promptText || '').trim();
    const h = U.hash(clean.toLowerCase());
    const words = clean.split(/[^a-zA-Z']+/).filter((w) => w.length > 2 && STOP.indexOf(w.toLowerCase()) === -1);
    const realmId = inferRealm(clean);
    const realm = (T.config.realms.filter((r) => r.id === realmId)[0]) || T.config.realms[0];
    const seedN = h % 100000;
    const a = ADJ[Math.floor(U.rand(seedN + 1) * ADJ.length) % ADJ.length];
    const n = words.length ? words[Math.floor(U.rand(seedN + 7) * words.length) % words.length] : NOUN[Math.floor(U.rand(seedN + 3) * NOUN.length) % NOUN.length];
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    const title = a + ' ' + cap(n);
    const bpm = realm.bpm + Math.floor(U.rand(seedN + 11) * 9) - 4;
    const dur = 120 + Math.floor(U.rand(seedN + 17) * 180);
    return {
      id: 't' + seedN, title: title, prompt: clean, realm: realm.id, realmName: realm.name,
      bpm: bpm, key: realm.key, dur: dur, seed: seedN, accent: realm.accent,
      tags: realm.tags.slice(0, 2).concat([n.toLowerCase()]),
      created: Date.now()
    };
  }

  /* ================================================================ module */
  T.register({
    name: 'pages',
    init() {
      const body = document.body;

      /* ------------------------------------------------------- nav */
      const nav = document.querySelector('.nav');
      const burger = document.querySelector('.nav__burger');
      const sheet = document.querySelector('.sheet');
      if (burger && sheet) {
        burger.addEventListener('click', () => {
          const open = sheet.classList.toggle('is-open');
          burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        U.$$('a', sheet).forEach((a) => a.addEventListener('click', () => {
          sheet.classList.remove('is-open');
          burger.setAttribute('aria-expanded', 'false');
        }));
      }

      /* ------------------------------------------------------- sound button */
      const sound = document.getElementById('sound-toggle');
      const inlineSoundBtns = U.$$('[data-sound-toggle]');
      function paintSound() {
        if (sound) {
          sound.classList.toggle('is-on', !!T.audio.on);
          sound.setAttribute('aria-pressed', T.audio.on ? 'true' : 'false');
          const lbl = sound.querySelector('.sound__label');
          if (lbl) lbl.textContent = T.audio.on ? 'Sound on' : 'Sound off';
        }
        inlineSoundBtns.forEach((b) => {
          if (b.dataset.keepLabel) return;
          b.textContent = T.audio.on ? 'Tide is rolling' : 'Tune the tide in';
        });
      }
      if (sound) sound.addEventListener('click', () => { T.audio.toggle(); paintSound(); });
      inlineSoundBtns.forEach((b) => b.addEventListener('click', () => { T.audio.toggle(); paintSound(); }));
      document.addEventListener('tidalia:sound', paintSound);
      if (sound || inlineSoundBtns.length) paintSound();
      // first interaction anywhere nudges the ambient bed on (respects autoplay rules)
      if (sound && !T.touch) {
        const hint = () => {
          sound.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-6px)' }, { transform: 'translateY(0)' }], { duration: 900, iterations: 2 });
          window.removeEventListener('pointerdown', hint);
        };
        setTimeout(() => window.addEventListener('pointerdown', hint, { once: true }), 2600);
      }

      /* ------------------------------------------------------- realm modal */
      const modal = document.getElementById('realm-modal');
      let lastFocus = null;
      function openRealm(i) {
        const r = T.config.realms[i];
        if (!r || !modal) return;
        lastFocus = document.activeElement;
        modal.querySelector('[data-modal-img]').src = r.img;
        modal.querySelector('[data-modal-img]').alt = r.name + ' — realm artwork';
        modal.querySelector('[data-modal-name]').textContent = r.name;
        modal.querySelector('[data-modal-desc]').textContent = r.desc;
        modal.querySelector('[data-modal-index]').textContent = 'Realm 0' + (i + 1) + ' / 06';
        modal.querySelector('[data-modal-tags]').innerHTML = r.tags.map((t) => '<span class="tag">' + t + '</span>').join('');
        modal.querySelector('[data-modal-stats]').innerHTML =
          '<div class="stat"><b>' + r.bpm + '</b><span>Tempo (BPM)</span></div>' +
          '<div class="stat"><b>' + r.key + '</b><span>Default key</span></div>' +
          '<div class="stat"><b>' + r.tags[0] + '</b><span>Texture</span></div>';
        const link = modal.querySelector('[data-modal-compose]');
        if (link) link.href = 'composer.html?realm=' + r.id;
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        body.classList.add('is-locked');
        const close = modal.querySelector('.modal__close');
        if (close) close.focus();
      }
      function closeRealm() {
        if (!modal) return;
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        body.classList.remove('is-locked');
        if (lastFocus) lastFocus.focus();
      }
      if (modal) {
        modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('[data-modal-close]')) closeRealm(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeRealm(); });
      }
      T.ui = T.ui || {};
      T.ui.openRealm = openRealm;
      T.ui.closeRealm = closeRealm;
      T.ui.toast = toast;
      T.ui.Store = Store;
      T.ui.generateTrack = generateTrack;
      T.ui.waves = waves;
      T.ui.goToRealm = function (i) {
        const section = document.getElementById('realms');
        if (!section) return;
        const top = section.getBoundingClientRect().top + window.pageYOffset;
        const span = section.offsetHeight - window.innerHeight;
        const local = 0.05 + (U.clamp(i / 5) * 0.9);
        window.scrollTo({ top: top + span * local, behavior: T.reduced ? 'auto' : 'smooth' });
      };
      U.$$('[data-realm-dot]').forEach((d, i) => d.addEventListener('click', () => T.ui.goToRealm(i)));
      const prev = document.querySelector('[data-realm-prev]');
      const next = document.querySelector('[data-realm-next]');
      const cur = () => {
        const on = document.querySelector('[data-realm-dot].is-on');
        return on ? U.$$('[data-realm-dot]').indexOf(on) : 0;
      };
      U.$$('[data-open-realm]').forEach((b) => b.addEventListener('click', () => openRealm(cur())));
      if (prev) prev.addEventListener('click', () => T.ui.goToRealm((cur() + 5) % 6));
      if (next) next.addEventListener('click', () => T.ui.goToRealm((cur() + 1) % 6));
      document.addEventListener('keydown', (e) => {
        const section = document.getElementById('realms');
        if (!section || !U.$$('[data-realm-dot]').length) return;
        const r = section.getBoundingClientRect();
        if (r.top > window.innerHeight * 0.3 || r.bottom < window.innerHeight * 0.7) return;
        if (e.key === 'ArrowRight') T.ui.goToRealm((cur() + 1) % 6);
        if (e.key === 'ArrowLeft') T.ui.goToRealm((cur() + 5) % 6);
      });

      /* ------------------------------------------------------- tilt + magnetic */
      if (!T.touch && !T.reduced) {
        U.$$('[data-tilt]').forEach((card) => {
          const glow = card.querySelector('.card__glow');
          card.addEventListener('pointermove', (e) => {
            const r = card.getBoundingClientRect();
            const nx = (e.clientX - r.left) / r.width - 0.5;
            const ny = (e.clientY - r.top) / r.height - 0.5;
            card.style.transform = 'perspective(900px) rotateY(' + (nx * 9).toFixed(2) + 'deg) rotateX(' + (-ny * 9).toFixed(2) + 'deg) translateY(-4px)';
            if (glow) {
              glow.style.setProperty('--gx', (nx * 40).toFixed(1) + 'px');
              glow.style.setProperty('--gy', (ny * 40).toFixed(1) + 'px');
            }
          });
          card.addEventListener('pointerleave', () => { card.style.transform = ''; });
        });
        U.$$('[data-magnetic]').forEach((el) => {
          el.addEventListener('pointermove', (e) => {
            const r = el.getBoundingClientRect();
            const nx = (e.clientX - r.left) / r.width - 0.5;
            const ny = (e.clientY - r.top) / r.height - 0.5;
            el.style.transform = 'translate(' + (nx * 12).toFixed(1) + 'px,' + (ny * 8).toFixed(1) + 'px)';
          });
          el.addEventListener('pointerleave', () => { el.style.transform = ''; });
        });
      }

      /* ------------------------------------------------------- hover reveal panel */
      U.$$('.reveal-panel').forEach((p) => {
        p.addEventListener('pointermove', (e) => {
          const r = p.getBoundingClientRect();
          p.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 100).toFixed(2) + '%');
          p.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 100).toFixed(2) + '%');
        });
        p.addEventListener('pointerleave', () => { p.style.setProperty('--mx', '50%'); p.style.setProperty('--my', '50%'); });
      });

      /* ------------------------------------------------------- smooth anchors */
      U.$$('a[href^="#"]').forEach((a) => {
        a.addEventListener('click', (e) => {
          const id = a.getAttribute('href');
          if (id === '#' || id.length < 2) return;
          const target = document.querySelector(id);
          if (!target) return;
          e.preventDefault();
          const top = target.getBoundingClientRect().top + window.pageYOffset - (nav ? nav.offsetHeight : 0);
          window.scrollTo({ top: top, behavior: T.reduced ? 'auto' : 'smooth' });
        });
      });

      /* ------------------------------------------------------- page transitions */
      const wipe = document.createElement('div');
      wipe.className = 'wipe';
      document.body.appendChild(wipe);
      requestAnimationFrame(() => {
        wipe.classList.add('is-out');
        setTimeout(() => wipe.classList.add('is-in'), 900);
        setTimeout(() => { wipe.classList.remove('is-out', 'is-in'); }, 1700);
      });
      U.$$('a[data-nav]').forEach((a) => {
        a.addEventListener('click', (e) => {
          const href = a.getAttribute('href');
          if (!href || href.charAt(0) === '#') return;
          if (e.metaKey || e.ctrlKey || e.shiftKey) return;
          e.preventDefault();
          wipe.classList.remove('is-in');
          wipe.classList.add('is-out');
          setTimeout(() => { window.location.href = href; }, T.reduced ? 0 : 520);
        });
      });

      /* ------------------------------------------------------- nav solid */
      const onScrollNav = () => {
        if (!nav) return;
        nav.classList.toggle('is-solid', (window.pageYOffset || 0) > 40 || !document.getElementById('hero'));
      };
      onScrollNav();

      /* ------------------------------------------------------- composer teaser (home) */
      const teaser = document.getElementById('teaser-form');
      if (teaser) {
        teaser.addEventListener('submit', (e) => {
          e.preventDefault();
          const v = teaser.querySelector('textarea').value.trim();
          window.location.href = 'composer.html' + (v ? '?prompt=' + encodeURIComponent(v) : '');
        });
      }

      /* ------------------------------------------------------- composer page */
      const cform = document.getElementById('composer-form');
      if (cform) {
        const ta = cform.querySelector('textarea');
        const count = cform.querySelector('.count');
        const err = cform.querySelector('.err');
        const hint = cform.querySelector('.prompt-hint');
        const chips = U.$$('[data-suggest]');
        const resultWrap = document.getElementById('result-wrap');
        const busy = document.getElementById('compose-busy');
        const busyBar = busy ? busy.querySelector('.busy__bar i') : null;
        const busySteps = busy ? U.$$('.busy__steps span', busy) : [];
        let current = null;

        const params = new URLSearchParams(window.location.search);
        const prePrompt = params.get('prompt');
        const preRealm = params.get('realm');
        if (prePrompt && ta) ta.value = prePrompt;
        if (preRealm) {
          const r = T.config.realms.filter((x) => x.id === preRealm)[0];
          if (r && hint) hint.textContent = 'Starting from ' + r.name + ' — ' + r.key + ' · ' + r.bpm + ' BPM. Describe the feeling and Tidalia will take it from here.';
        }
        const suggestBox = document.getElementById('suggest-rows');
        if (suggestBox) {
          T.config.suggestions.forEach((s) => {
            const b = document.createElement('button');
            b.type = 'button'; b.className = 'chip'; b.textContent = s;
            b.addEventListener('click', () => { if (ta) { ta.value = s; ta.focus(); ta.dispatchEvent(new Event('input')); } });
            suggestBox.appendChild(b);
          });
        }
        if (ta) {
          const sync = () => { if (count) count.textContent = ta.value.length + ' / 240'; };
          ta.addEventListener('input', () => { sync(); if (err) err.textContent = ''; });
          sync();
          ta.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); cform.dispatchEvent(new Event('submit', { cancelable: true })); }
          });
        }
        chips.forEach((c) => c.addEventListener('click', () => {
          const v = (ta.value + ' ' + c.dataset.suggest).trim();
          ta.value = v.slice(0, 240); ta.focus(); ta.dispatchEvent(new Event('input'));
        }));

        let busyTimer = null;
        function runBusy(cb) {
          if (!busy) return cb();
          busy.hidden = false;
          resultWrap.hidden = true;
          let step = 0;
          const total = busySteps.length || 1;
          const start = Date.now(), dur = T.reduced ? 500 : 2700;
          busySteps.forEach((s, i) => s.classList.toggle('is-on', i === 0));
          clearInterval(busyTimer);
          busyTimer = setInterval(() => {
            const p = U.clamp((Date.now() - start) / dur);
            if (busyBar) busyBar.style.width = (p * 100).toFixed(1) + '%';
            const want = Math.min(total - 1, Math.floor(p * total));
            if (want > step) { step = want; busySteps.forEach((s, i) => s.classList.toggle('is-on', i <= step)); }
            if (p >= 1) { clearInterval(busyTimer); busy.hidden = true; cb(); }
          }, 60);
        }

        function render(track) {
          current = track;
          T.audio.stopTrack();
          resultWrap.hidden = false;
          resultWrap.querySelector('[data-res-title]').textContent = track.title;
          resultWrap.querySelector('[data-res-prompt]').textContent = '“' + track.prompt + '”';
          resultWrap.querySelector('[data-res-meta]').innerHTML =
            '<span>Realm <b>' + track.realmName + '</b></span>' +
            '<span><b>' + track.bpm + '</b> BPM</span>' +
            '<span>Key <b>' + track.key + '</b></span>' +
            '<span><b>' + U.fmtTime(track.dur) + '</b> runtime</span>' +
            '<span>Seed <b>#' + track.seed + '</b></span>';
          resultWrap.querySelector('[data-res-tags]').innerHTML = track.tags.map((t) => '<span class="tag">' + t + '</span>').join('');
          const w = waves.filter((x) => x.canvas === resultWrap.querySelector('canvas'))[0];
          if (w) { w.seed = track.seed; w.reveal = 0; w.playing = false; }
          resultWrap.classList.add('is-in');
          resultWrap.scrollIntoView({ behavior: T.reduced ? 'auto' : 'smooth', block: 'center' });
        }

        /* waveform canvas on the result card */
        const rcanvas = resultWrap ? resultWrap.querySelector('canvas') : null;
        if (rcanvas) waves.push({ canvas: rcanvas, seed: 7, reveal: 0, playing: false, accent: '#46e0ff', kind: 'result' });

        cform.addEventListener('submit', (e) => {
          e.preventDefault();
          const v = (ta.value || '').trim();
          if (v.length < 3) {
            if (err) err.textContent = 'Describe at least a few words — a feeling, a memory, or an imaginary world.';
            if (ta) { ta.focus(); ta.classList.add('is-error'); setTimeout(() => ta.classList.remove('is-error'), 1200); }
            return;
          }
          if (err) err.textContent = '';
          const track = generateTrack(v);
          const w = waves.filter((x) => x.canvas === rcanvas)[0];
          if (w) w.accent = track.accent;
          runBusy(() => { render(track); toast('Soundtrack ready', track.title + ' · ' + track.bpm + ' BPM'); });
        });

        if (resultWrap) {
          const playBtn = resultWrap.querySelector('[data-res-play]');
          const addBtn = resultWrap.querySelector('[data-res-add]');
          const againBtn = resultWrap.querySelector('[data-res-again]');
          const timeEl = resultWrap.querySelector('[data-res-time]');

          function stopAll() {
            const w = waves.filter((x) => x.canvas === rcanvas)[0];
            if (w) w.playing = false;
            T.audio.stopTrack();
            if (playBtn) { playBtn.innerHTML = playBtn.dataset.playHtml; }
          }
          if (playBtn) {
            playBtn.dataset.playHtml = playBtn.innerHTML;
            playBtn.addEventListener('click', () => {
              const w = waves.filter((x) => x.canvas === rcanvas)[0];
              const active = T.audio.activeTrack();
              if (active && active.seed === current.seed) {
                stopAll();
                playBtn.innerHTML = '<span class="dot"></span>Play preview';
                return;
              }
              if (!T.audio.on) { T.audio.play(); paintSound(); }
              T.audio.playTrack(String(current.seed), { bpm: current.bpm, key: current.key, dur: current.dur, tags: current.tags });
              if (w) { w.playing = true; w.seed = current.seed; }
              playBtn.innerHTML = '<span class="dot" style="background:#ff7ad0;box-shadow:0 0 12px #ff7ad0"></span>Stop';
              toast('Now playing', current.title + ' — generated live in your browser');
            });
          }
          if (addBtn) addBtn.addEventListener('click', () => {
            Store.add(current);
            toast('Saved to archive', current.title + ' · ' + Store.count() + ' track(s) in this browser');
            addBtn.textContent = 'Saved ✓';
            setTimeout(() => { addBtn.textContent = 'Add to archive'; }, 2200);
          });
          if (againBtn) againBtn.addEventListener('click', () => {
            const v = (ta.value || '').trim() + ' ' + (Math.random() > 0.5 ? 'late' : 'again') + Math.random().toString(36).slice(2, 5);
            const track = generateTrack(v);
            const w = waves.filter((x) => x.canvas === rcanvas)[0];
            if (w) w.accent = track.accent;
            runBusy(() => render(track));
          });
          this._composerTime = timeEl;
        }
      }

      /* ------------------------------------------------------- archive page */
      const grid = document.getElementById('archive-grid');
      if (grid) {
        const filters = U.$$('[data-filter]');
        const countEl = document.getElementById('archive-count');
        const empty = document.getElementById('archive-empty');
        let filter = 'all';
        const tracks = T.config.archive.map((t) => {
          const r = T.config.realms.filter((x) => x.id === t.realm)[0] || {};
          return Object.assign({}, t, { seed: U.hash(t.title + '|' + t.prompt), accent: r.accent, realmName: r.name });
        }).concat(Store.read().map((t) => {
          const r = T.config.realms.filter((x) => x.id === t.realm)[0] || {};
          return Object.assign({}, t, { accent: r.accent, realmName: (t.realmName || r.name) });
        }));

        function renderGrid() {
          grid.innerHTML = '';
          const list = tracks.filter((t) => filter === 'all' || t.realm === filter);
          if (countEl) countEl.textContent = list.length + (filter === 'all' ? ' tracks' : ' in ' + (T.config.realms.filter((r) => r.id === filter)[0] || {}).name);
          if (empty) empty.hidden = list.length > 0;
          list.forEach((t) => {
            const card = document.createElement('article');
            card.className = 'track';
            card.setAttribute('data-tilt', '');
            card.innerHTML =
              '<div class="track__top">' +
                '<button class="track__play" aria-label="Play ' + t.title + '">' +
                  '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>' +
                '</button>' +
                '<div><h3 class="track__title">' + t.title + '</h3>' +
                '<p class="track__sub"><span>' + (t.realmName || t.realm) + '</span><span>·</span><span>' + t.bpm + ' BPM</span><span>·</span><span>' + t.key + '</span></p></div>' +
              '</div>' +
              '<canvas class="track__wave" aria-hidden="true"></canvas>' +
              '<p class="small" style="margin:0">“' + (t.prompt || '') + '”</p>' +
              '<div class="track__foot"><span data-time>0:00</span><span>/</span><span>' + U.fmtTime(t.dur) + '</span><span class="tag">' + t.realm + '</span></div>';
            grid.appendChild(card);
            const canvas = card.querySelector('canvas');
            const entry = { canvas: canvas, seed: t.seed, reveal: 0, playing: false, accent: t.accent, track: t, card: card };
            waves.push(entry);
            const btn = card.querySelector('.track__play');
            const timeEl = card.querySelector('[data-time]');
            btn.addEventListener('click', () => {
              const active = T.audio.activeTrack();
              const isThis = active && active.seed === t.seed;
              waves.forEach((w) => { w.playing = false; });
              U.$$('.track', grid).forEach((c) => {
                c.classList.remove('is-live');
                const b = c.querySelector('.track__play');
                if (b) b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
              });
              if (isThis) { T.audio.stopTrack(); timeEl.textContent = '0:00'; return; }
              if (!T.audio.on) { T.audio.play(); paintSound(); }
              T.audio.playTrack(String(t.seed), { bpm: t.bpm, key: t.key, dur: t.dur, tags: t.tags });
              entry.playing = true; entry.reveal = 1;
              card.classList.add('is-live');
              btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';
              toast('Now playing', t.title + ' · ' + (t.realmName || t.realm));
            });
            entry.timeEl = timeEl;
          });
          // tilt for the freshly created cards (non-touch only)
          if (!T.touch && !T.reduced) {
            U.$$('[data-tilt]', grid).forEach((card) => {
              card.addEventListener('pointermove', (e) => {
                const r = card.getBoundingClientRect();
                const nx = (e.clientX - r.left) / r.width - 0.5;
                const ny = (e.clientY - r.top) / r.height - 0.5;
                card.style.transform = 'perspective(900px) rotateY(' + (nx * 8).toFixed(2) + 'deg) rotateX(' + (-ny * 8).toFixed(2) + 'deg) translateY(-4px)';
              });
              card.addEventListener('pointerleave', () => { card.style.transform = ''; });
            });
          }
        }
        filters.forEach((f) => f.addEventListener('click', () => {
          filter = f.dataset.filter;
          filters.forEach((x) => x.classList.toggle('is-active', x === f));
          renderGrid();
        }));
        renderGrid();

        const loadMore = document.getElementById('archive-more');
        if (loadMore) loadMore.addEventListener('click', () => {
          T.audio.playTrack('random-' + Date.now().toString(36), { bpm: 70 + Math.floor(Math.random() * 50), key: T.config.realms[Math.floor(Math.random() * 6)].key, dur: 180, tags: ['ambient'] });
          if (!T.audio.on) { T.audio.play(); paintSound(); }
          toast('Improvising', 'A one-off take, generated from a fresh seed');
        });
      }

      /* ------------------------------------------------------- footer year */
      U.$$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
      U.$$('[data-store-count]').forEach((el) => { el.textContent = Store.count(); });

      /* ------------------------------------------------------- per-frame */
      let t0 = performance.now();
      this.update = (t, dt) => {
        onScrollNav();
        // waveforms
        for (let i = 0; i < waves.length; i++) {
          const w = waves[i];
          w.reveal = Math.min(1, w.reveal + dt * (T.reduced ? 6 : 1.15));
          const r = w.canvas.getBoundingClientRect();
          if (r.bottom < -60 || r.top > window.innerHeight + 60) continue;
          drawWave(w, t);
          if (w.playing && w.timeEl) w.timeEl.textContent = U.fmtTime(T.audio.trackProgress() * (w.track ? w.track.dur : 180));
        }
        // sound button bars
        if (sound) {
          const bars = U.$$('.sound__bars i', sound);
          const lvl = T.audio.level;
          bars.forEach((b, i) => {
            const h = T.audio.on ? 3 + lvl * 60 * (0.5 + U.rand(t * 0.6 + i * 3.3) * 0.9) : 3;
            b.style.height = Math.min(16, h).toFixed(1) + 'px';
          });
        }
        // composer time readout
        if (this._composerTime) {
          const act = T.audio.activeTrack();
          this._composerTime.textContent = act ? U.fmtTime(T.audio.trackProgress() * act.opts.dur) : '0:00';
        }
      };
    }
  });
})();
