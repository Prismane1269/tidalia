/* ==========================================================================
   TIDALIA — REALMS  (Three.js scroll-controlled 3D carousel)
   Six floating glass cards on a ring. Page scroll is the single source of
   truth: the pinned section's progress rotates the ring, drag/arrows/dots
   simply scroll the page. Active card stays sharp & centred, neighbours fall
   into fog, dim, and parallax behind it.
   ========================================================================== */
(function () {
  'use strict';
  const T = (window.TIDALIA = window.TIDALIA || {});
  const U = T.util;

  T.register({
    name: 'realms',
    init() {
      const section = document.getElementById('realms');
      const canvas = document.getElementById('realms-canvas');
      const panel = document.getElementById('realm-panel');
      if (!section || !canvas || !window.THREE) return;

      if (T.assets) { T.assets.expect('realms'); T.assets.requireTextures('realms'); }
      const realms = (T.config && T.config.realms) || [];
      if (!realms.length) return;
      const N = realms.length, STEP = (Math.PI * 2) / N, RADIUS = 6.6;
      let texLoaded = 0;

      const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !T.touch, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, T.touch ? 1.5 : 2));
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x030711, 0.052);
      const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 100);
      camera.position.set(0, 0.18, 0.45);

      const loader = new THREE.TextureLoader();
      const maxAniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;

      function glowTex() {
        const c = document.createElement('canvas'); c.width = c.height = 128;
        const g = c.getContext('2d');
        const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        grd.addColorStop(0, 'rgba(255,255,255,.9)');
        grd.addColorStop(0.4, 'rgba(140,215,255,.32)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
        return new THREE.CanvasTexture(c);
      }
      const GLOW = glowTex();

      /* ---------------- ring + cards ---------------- */
      const ring = new THREE.Group();
      ring.position.set(-1.9, 0, 0);                            // leave room for the copy panel
      scene.add(ring);

      const cards = [];
      realms.forEach((realm, i) => {
        const ang = i * STEP;
        const card = new THREE.Group();
        card.position.set(Math.sin(ang) * RADIUS, 0, Math.cos(ang) * RADIUS);
        card.rotation.y = ang;

        const glass = new THREE.Mesh(
          new THREE.PlaneGeometry(3.5, 2.32),
          new THREE.MeshStandardMaterial({ color: 0x0a1424, metalness: 0.9, roughness: 0.28, transparent: true, opacity: 0.9, emissive: new THREE.Color(realm.accent), emissiveIntensity: 0.12 })
        );
        glass.position.z = -0.02;
        card.add(glass);

        const tex = loader.load(realm.img, () => {
          texLoaded++;
          if (T.assets && (texLoaded >= realms.length || texLoaded >= 3)) T.assets.texturesDone('realms');
        });
        tex.encoding = THREE.sRGBEncoding;
        tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
        tex.anisotropy = Math.min(4, maxAniso);
        tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
        const art = new THREE.Mesh(new THREE.PlaneGeometry(3.24, 2.06),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.96 }));
        art.position.z = 0.012;
        card.add(art);

        const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: new THREE.Color(realm.accent), transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
        g.scale.set(4.0, 2.8, 1); g.position.z = -1.25;
        card.add(g);

        const frameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(realm.accent), transparent: true, opacity: 0.75, fog: false });
        [[3.56, 0.035, 0, 1.19], [3.56, 0.035, 0, -1.19], [0.035, 2.4, -1.76, 0], [0.035, 2.4, 1.76, 0]].forEach((b) => {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(b[0], b[1], 0.03), frameMat);
          bar.position.set(b[2], b[3], 0.03); card.add(bar);
        });

        card.userData = { index: i, base: card.position.clone(), realm: realm, glow: g, art: art, glass: glass, frame: frameMat, hover: 0 };
        art.userData.card = card;
        ring.add(card);
        cards.push(card);
      });

      /* ---------------- floor + lights ---------------- */
      const gc = document.createElement('canvas'); gc.width = gc.height = 256;
      const gg = gc.getContext('2d');
      gg.fillStyle = '#03060d'; gg.fillRect(0, 0, 256, 256);
      gg.strokeStyle = 'rgba(90,170,235,.28)'; gg.strokeRect(0.5, 0.5, 256, 256);
      gg.strokeStyle = 'rgba(120,200,255,.09)';
      gg.beginPath(); gg.moveTo(128, 0); gg.lineTo(128, 256); gg.moveTo(0, 128); gg.lineTo(256, 128); gg.stroke();
      const gridTex = new THREE.CanvasTexture(gc);
      gridTex.wrapS = gridTex.wrapT = THREE.RepeatWrapping; gridTex.repeat.set(26, 26);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(64, 64),
        new THREE.MeshStandardMaterial({ map: gridTex, color: 0x53688a, emissive: 0x060f1c, emissiveIntensity: 0.75, metalness: 0.5, roughness: 0.62 }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = -1.75;
      scene.add(floor);

      scene.add(new THREE.AmbientLight(0x22314d, 0.95));
      const dl = new THREE.DirectionalLight(0xa9d8ff, 0.6); dl.position.set(4, 7, 6); scene.add(dl);
      const pl1 = new THREE.PointLight(0x46e0ff, 1.05, 26, 1.8); pl1.position.set(-3.4, 2.6, 4.6); scene.add(pl1);
      const pl2 = new THREE.PointLight(0xff5fa2, 0.85, 26, 1.8); pl2.position.set(4.2, 1.4, -3.6); scene.add(pl2);
      const pl3 = new THREE.PointLight(0x9b6bff, 0.8, 28, 1.8); pl3.position.set(0, 3.2, -6.2); scene.add(pl3);

      /* ---------------- dust ---------------- */
      const dustN = T.touch ? 160 : 340;
      const dp = new Float32Array(dustN * 3);
      for (let i = 0; i < dustN; i++) {
        dp[i * 3] = (Math.random() - 0.5) * 22;
        dp[i * 3 + 1] = (Math.random() - 0.5) * 8;
        dp[i * 3 + 2] = (Math.random() - 0.5) * 22;
      }
      const dg = new THREE.BufferGeometry();
      dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
      const dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.075, color: 0xbfe9ff, transparent: true, opacity: 0.62, depthWrite: false, blending: THREE.AdditiveBlending, map: GLOW }));
      scene.add(dust);

      /* ---------------- interaction ---------------- */
      const ray = new THREE.Raycaster();
      const ndc = new THREE.Vector2(-2, -2);
      let hoverIdx = -1, hoverPx = 0;
      canvas.addEventListener('pointermove', (e) => {
        const r = canvas.getBoundingClientRect();
        ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
        hoverPx = e.clientX;
      });
      canvas.addEventListener('pointerleave', () => { ndc.set(-2, -2); });
      canvas.addEventListener('click', (e) => {
        if (hoverIdx >= 0 && T.ui && T.ui.openRealm) {
          T.ui.openRealm(hoverIdx);
        } else if (T.ui && T.ui.goToRealm) {
          T.ui.goToRealm(Math.round(posTarget));
        }
      });

      /* drag → page scroll (keeps "scroll is truth" intact) */
      let dragging = false, lastX = 0, lastY = 0, active = false;
      canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
      canvas.addEventListener('pointerup', (e) => { dragging = false; try { canvas.releasePointerCapture(e.pointerId); } catch (err) {} });
      canvas.addEventListener('pointercancel', () => { dragging = false; });

      /* ---------------- UI refs ---------------- */
      const ui = {
        name: panel && panel.querySelector('[data-realm-name]'),
        idx: panel && panel.querySelector('[data-realm-index]'),
        desc: panel && panel.querySelector('[data-realm-desc]'),
        tags: panel && panel.querySelector('[data-realm-tags]'),
        meta: panel && panel.querySelector('[data-realm-meta]'),
        dots: U.$$('[data-realm-dot]', section),
        bars: U.$$('[data-realms-bg]', section),
        prog: section.querySelector('.realm__prog')
      };
      let shownIdx = -1;
      function showText(i) {
        if (i === shownIdx) return;
        shownIdx = i;
        const r = realms[i];
        if (!r) return;
        if (ui.name) { ui.name.style.opacity = 0; setTimeout(() => { ui.name.textContent = r.name; ui.name.style.opacity = 1; }, 180); }
        if (ui.idx) ui.idx.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(N).padStart(2, '0');
        if (ui.desc) { ui.desc.style.opacity = 0; setTimeout(() => { ui.desc.textContent = r.desc; ui.desc.style.opacity = 1; }, 220); }
        if (ui.tags) {
          ui.tags.innerHTML = '';
          r.tags.forEach((t) => { const s = document.createElement('span'); s.className = 'tag'; s.textContent = t; ui.tags.appendChild(s); });
        }
        if (ui.meta) ui.meta.innerHTML = '<b>' + r.bpm + '</b> BPM &nbsp;·&nbsp; <b>' + r.key + '</b>';
        ui.dots.forEach((d, k) => d.classList.toggle('is-on', k === i));
        ui.bars.forEach((b, k) => b.classList.toggle('is-on', k === i));
      }

      /* ---------------- resize ---------------- */
      /* camera rig: the active card is framed left-of-centre on desktop so the
         copy panel has room; on portrait the ring drops lower and pulls back. */
      const rig = { narrow: false, dist: 10.4, look: new THREE.Vector3(), lookBase: new THREE.Vector3() };
      function resize() {
        const w = canvas.clientWidth || window.innerWidth;
        const h = canvas.clientHeight || window.innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / Math.max(1, h);
        rig.narrow = camera.aspect < 1.05;
        floor.visible = !rig.narrow;                    // no floor hotspots on phones
        const s = rig.narrow ? 0.82 : 1;
        ring.scale.setScalar(s);
        ring.position.x = rig.narrow ? 0 : -1.5;
        rig.dist = rig.narrow ? 6.6 : 8.8;
        camera.fov = rig.narrow ? 62 : 40;
        camera.updateProjectionMatrix();
      }
      resize();
      T.Scroll.onResize(resize);

      /* ---------------- loop ---------------- */
      let pos = 0, posTarget = 0, shown = false;
      this.update = (t, dt, S, P) => {
        const r = section.getBoundingClientRect();
        const visible = r.bottom > 0 && r.top < window.innerHeight;
        if (visible && !shown) { shown = true; }
        if (!visible && shown) { shown = false; }
        if (!shown) return;

        const prog = S.progress(section);
        const local = U.range(prog, 0.05, 0.95);        // 0..1 across the pin
        posTarget = local * (N - 1);
        pos = U.damp(pos, posTarget, 6.5, dt);

        ring.rotation.y = -pos * STEP;

        /* drag → scroll */
        if (dragging) {
          const dx = (lastX - P.x), dy = (lastY - P.y);
          if (Math.abs(dx) + Math.abs(dy) > 1) {
            window.scrollBy(0, (dx * 1.15 + dy * 0.6));
            lastX = P.x; lastY = P.y;
          }
        }

        /* hover pick */
        ray.setFromCamera(ndc, camera);
        const hits = ray.intersectObjects(cards.map((c) => c.children[1]), false);
        const prevHover = hoverIdx;
        hoverIdx = hits.length ? hits[0].object.userData.card.userData.index : -1;
        if (hoverIdx !== prevHover) {
          document.body.classList.toggle('is-cursor-label', hoverIdx >= 0);
          const lbl = document.querySelector('.cursor-ring span');
          if (lbl && hoverIdx >= 0) lbl.textContent = 'open';
          canvas.style.cursor = hoverIdx >= 0 ? 'none' : 'grab';
        }

        /* per-card focus (sharp centre, blurred/dim neighbours) */
        const active = Math.round(pos);
        for (let i = 0; i < cards.length; i++) {
          const c = cards[i];
          const d = Math.min(Math.abs(i - pos), N - Math.abs(i - pos));   // ring distance in cards
          const near = Math.pow(U.clamp(1 - d / 1.45), 1.35);
          // only the immediate neighbours are drawn: cards on the far side of the
          // ring would otherwise read as empty floating frames
          c.visible = d < 1.7;
          const hov = (i === hoverIdx ? 1 : 0);
          c.userData.hover = U.damp(c.userData.hover, hov, 8, dt);
          const lift = c.userData.hover * 0.34;
          c.position.y = c.userData.base.y + Math.sin(t * 0.6 + i * 1.2) * 0.075 + lift;
          c.position.x = c.userData.base.x;
          c.position.z = c.userData.base.z + near * 0.28;
          c.rotation.z = Math.sin(t * 0.42 + i) * 0.028;
          c.rotation.x = -0.05 + c.userData.hover * 0.08;
          c.scale.setScalar(0.9 + near * 0.14 + c.userData.hover * 0.055);
          const dim = 0.22 + near * 0.78;
          const sat = 0.55 + near * 0.45;
          c.userData.art.material.color.setRGB(dim * (0.6 + 0.4 * sat), dim, dim);
          c.userData.art.material.opacity = 0.25 + near * 0.75;
          c.userData.glow.material.opacity = near * (0.14 + c.userData.hover * 0.18);
          c.userData.glow.scale.set(3.6 + near * 0.9, 2.5 + near * 0.6, 1);
          c.userData.glow.visible = near > 0.35;
          c.userData.glass.material.emissiveIntensity = 0.06 + near * 0.2 + c.userData.hover * 0.3;
          c.userData.frame.opacity = 0.25 + near * 0.6 + c.userData.hover * 0.3;
        }
        showText(U.clamp(active, 0, N - 1));

        /* scene feel — the camera transform is a pure function of scroll + the
           already-damped pointer, so framing is identical on every device speed.
           The active card is placed by screen position, not by guesswork: we aim
           the camera so the front card lands where the layout wants it. */
        const rs = ring.scale.x;
        const ringY = rig.narrow ? 2.0 : 0;
        ring.position.y = U.damp(ring.position.y, ringY + Math.sin(t * 0.3) * 0.07, 3, dt);

        const camY = (rig.narrow ? 0.75 : 0.45) + P.sy * 0.2 + Math.sin(t * 0.35) * 0.05;
        const camZ = RADIUS * rs + rig.dist;
        camera.position.set(0, camY, camZ);

        // where the front card sits right now (ring origin + radius on the z axis)
        const frontX = ring.position.x, frontY = ring.position.y, frontZ = RADIUS * rs - 0.6;
        const depth = Math.max(4, camZ - frontZ);
        const halfW = Math.tan(camera.fov * Math.PI / 360) * camera.aspect;
        const wantX = rig.narrow ? 0 : -0.47;             // ndc x the active card should sit at
        const wantY = rig.narrow ? 0.5 : -0.04;           // ndc y the active card should sit at
        // the card is `depth` away: what look-at point lands it at (wantX, wantY)?
        rig.look.set(
          frontX - wantX * halfW * depth + P.sx * 0.5,
          frontY - wantY * Math.tan(camera.fov * Math.PI / 360) * depth + P.sy * 0.22,
          frontZ - 3.4
        );
        camera.lookAt(rig.look);
        dust.rotation.y = t * 0.014;
        pl1.intensity = 1.0 + Math.sin(t * 0.8) * 0.24;
        pl2.intensity = 0.8 + Math.cos(t * 0.7) * 0.2;
        if (ui.prog) ui.prog.style.width = (prog * 100).toFixed(1) + '%';

        renderer.render(scene, camera);
      };

      T.scenes = T.scenes || {};
      T.scenes.realms = { scene: scene, camera: camera, ring: ring, cards: cards, rig: rig, renderer: renderer, radius: RADIUS, step: STEP };

      /* first paint */
      showText(0);
      renderer.render(scene, camera);
      if (T.assets) T.assets.done('realms');
    }
  });
})();
