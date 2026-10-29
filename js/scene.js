/* ==========================================================================
   TIDALIA — THE JOURNEY  (Three.js)
   The tutorial's single continuous 15s "story video" is rebuilt here as a
   real-time hyperlapse: 26 image planes flying past the camera, dissolving
   into a gallery hall of realms. 100% driven by scroll position (scrub
   forward AND backward), so it is frame-accurate and weighs ~1 MB.
   ========================================================================== */
(function () {
  'use strict';
  const T = (window.TIDALIA = window.TIDALIA || {});
  const U = T.util;

  const SRC = {
    night: 'assets/hero_night.jpg',
    day: 'assets/hero_day.jpg',
    reef: 'assets/realms/reef.jpg',
    chrome: 'assets/realms/chrome.jpg',
    lantern: 'assets/realms/lantern.jpg',
    ice: 'assets/realms/ice.jpg',
    jungle: 'assets/realms/jungle.jpg',
    lagoon: 'assets/realms/lagoon.jpg'
  };

  /* the "edit": which frame appears where along the 26-plane hyperlapse */
  const SEQUENCE = ['night', 'night', 'night',
    'reef', 'ice', 'chrome', 'lantern',
    'jungle', 'lagoon', 'reef', 'chrome',
    'lantern', 'ice', 'jungle', 'lagoon',
    'chrome', 'reef', 'ice', 'lantern',
    'jungle', 'lagoon', 'night',
    'reef', 'chrome', 'ice', 'day'];

  const GAP = 5.4, START_Z = -8;

  T.register({
    name: 'journey',
    init() {
      const canvas = document.getElementById('journey-canvas');
      const section = document.getElementById('hero');
      const frameEl = document.getElementById('journey-frame');
      if (!canvas || !section || !window.THREE) return;
      if (T.assets) { T.assets.expect('journey'); T.assets.requireTextures('journey'); }

      const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !T.touch, alpha: false, powerPreference: 'high-performance' });
      const maxDpr = T.touch ? 1.5 : 2;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.setClearColor(0x01030a, 1);

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x02050d, 0.028);

      const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 400);
      camera.position.set(0, 0, 2);

      const maxAniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
      const loader = new THREE.TextureLoader();

      /* ---------------------------------------------------- small textures */
      function dotTexture(inner, outer) {
        const c = document.createElement('canvas'); c.width = c.height = 64;
        const g = c.getContext('2d');
        const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        grd.addColorStop(0, inner); grd.addColorStop(0.35, outer); grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
        const t = new THREE.CanvasTexture(c);
        return t;
      }
      function gridTexture() {
        const c = document.createElement('canvas'); c.width = c.height = 256;
        const g = c.getContext('2d');
        g.fillStyle = '#04080f'; g.fillRect(0, 0, 256, 256);
        g.strokeStyle = 'rgba(90,170,235,.30)'; g.lineWidth = 1;
        g.strokeRect(0.5, 0.5, 256, 256);
        g.strokeStyle = 'rgba(120,200,255,.10)';
        g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 256); g.moveTo(0, 128); g.lineTo(256, 128); g.stroke();
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(14, 20);
        return t;
      }
      function labelTexture(title, sub, accent) {
        const c = document.createElement('canvas'); c.width = 640; c.height = 160;
        const g = c.getContext('2d');
        g.clearRect(0, 0, 640, 160);
        g.fillStyle = 'rgba(6,12,22,.72)'; g.fillRect(0, 0, 640, 160);
        g.strokeStyle = 'rgba(150,200,255,.28)'; g.lineWidth = 2; g.strokeRect(1, 1, 638, 158);
        g.fillStyle = accent; g.fillRect(0, 0, 8, 160);
        g.fillStyle = '#eaf6ff'; g.font = '600 54px Inter, Helvetica, Arial, sans-serif';
        g.fillText(title, 34, 76);
        g.fillStyle = 'rgba(160,195,230,.85)'; g.font = '400 30px Inter, Helvetica, Arial, sans-serif';
        g.fillText(sub, 34, 122);
        const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
        return t;
      }

      /* ---------------------------------------------------- textures */
      const textures = {};
      const total = Object.keys(SRC).length;
      let loaded = 0;
      const loadedKeys = {};
      Object.keys(SRC).forEach((k) => {
        const tex = loader.load(SRC[k], () => {
          loaded++;
          loadedKeys[k] = true;
          if (T.assets) {
            T.assets.progress(loaded / total);
            // the opening frames are what the visitor meets first: reveal the site
            // once those are decoded, and let the rest stream in behind the intro
            if (loaded >= total || (loadedKeys.night && loadedKeys.day)) T.assets.texturesDone('journey');
          }
        });
        tex.encoding = THREE.sRGBEncoding;
        tex.minFilter = THREE.LinearFilter;      // NPOT safe (no mipmaps needed)
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        tex.anisotropy = Math.min(4, maxAniso);
        tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
        textures[k] = tex;
      });

      /* ---------------------------------------------------- hyperlapse tunnel */
      const tunnel = new THREE.Group(); scene.add(tunnel);
      const planes = [];
      const geo = new THREE.PlaneGeometry(21.3, 12);
      SEQUENCE.forEach((key, i) => {
        const mat = new THREE.MeshBasicMaterial({
          map: textures[key], transparent: true, opacity: 0,
          depthWrite: false, fog: true, side: THREE.FrontSide
        });
        const m = new THREE.Mesh(geo, mat);
        const jx = (U.rand(i * 1.7) - 0.5) * 0.9;
        const jy = (U.rand(i * 2.9) - 0.5) * 0.7;
        m.position.set(jx, jy, START_Z - i * GAP - U.rand(i * 3.3) * 0.6);
        m.rotation.z = (U.rand(i * 4.1) - 0.5) * 0.05;
        m.userData.base = { x: jx, y: jy, rz: m.rotation.z };
        tunnel.add(m);
        planes.push(m);
      });

      /* ---------------------------------------------------- gallery hall */
      const gallery = new THREE.Group(); scene.add(gallery);
      const GALLERY_Z0 = -158, EX_GAP = 11.6;

      scene.add(new THREE.AmbientLight(0x1d2c47, 1.05));
      const key = new THREE.DirectionalLight(0x9fd8ff, 0.55); key.position.set(6, 9, -160); scene.add(key);
      const lights = [
        [0x46e0ff, 1.5, -6, 0.2, GALLERY_Z0 - 4],
        [0xff5fa2, 1.3, 7, 0.2, GALLERY_Z0 - 16],
        [0x9b6bff, 1.2, -7, 0.4, GALLERY_Z0 - 28],
        [0xffb37a, 1.1, 4, 0.6, -196]
      ].map((l) => { const p = new THREE.PointLight(l[0], l[1], 34, 1.6); p.position.set(l[2], l[3], l[4]); gallery.add(p); return p; });

      const floorTex = gridTexture();
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(70, 96),
        new THREE.MeshStandardMaterial({ map: floorTex, color: 0x9fb6d8, emissive: 0x0a1526, emissiveIntensity: 0.9, metalness: 0.72, roughness: 0.34 })
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, -4.2, GALLERY_Z0 - 24);
      gallery.add(floor);

      const glowTex = dotTexture('rgba(255,255,255,.85)', 'rgba(120,205,255,.25)');
      const exhibits = [];
      const realms = (T.config && T.config.realms) || [];
      for (let i = 0; i < 8; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const z = GALLERY_Z0 - Math.floor(i / 2) * EX_GAP;
        const realm = realms[i % Math.max(1, realms.length)];
        const accent = realm ? realm.accent : '#46e0ff';
        const texKey = ['reef', 'ice', 'chrome', 'lantern', 'jungle', 'lagoon', 'night', 'day'][i];

        const g = new THREE.Group();
        g.position.set(side * 8.7, 0.7, z);
        g.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;

        const back = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 4.5),
          new THREE.MeshStandardMaterial({ color: 0x050b16, metalness: 0.85, roughness: 0.35, emissive: 0x0a1a30, emissiveIntensity: 0.55 }));
        back.position.z = -0.02; g.add(back);

        const art = new THREE.Mesh(new THREE.PlaneGeometry(7.1, 4.0),
          new THREE.MeshBasicMaterial({ map: textures[texKey], toneMapped: false }));
        art.position.z = 0.03; g.add(art);

        const frameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(accent), transparent: true, opacity: 0.9, fog: false });
        [[7.7, 0.06, 0, 2.28], [7.7, 0.06, 0, -2.28], [0.06, 4.6, -3.82, 0], [0.06, 4.6, 3.82, 0]].forEach((b) => {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(b[0], b[1], 0.08), frameMat);
          bar.position.set(b[2], b[3], 0.05); g.add(bar);
        });

        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(accent), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
        glow.scale.set(11, 7, 1); glow.position.z = -0.6; g.add(glow);

        if (realm) {
          const cap = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 1.12),
            new THREE.MeshBasicMaterial({ map: labelTexture(realm.name, 'REALM 0' + (i + 1) + ' — ' + realm.key, accent), transparent: true, fog: false }));
          cap.position.set(0, -2.78, 0.06); g.add(cap);
        }
        gallery.add(g);
        exhibits.push({ group: g, glow: glow, art: art, accent: new THREE.Color(accent) });
      }

      /* final screen: the surface (moonlit -> daylight frame) */
      const endScreen = new THREE.Group();
      endScreen.position.set(0, 0.4, -208);
      const endBack = new THREE.Mesh(new THREE.PlaneGeometry(25.4, 14.4),
        new THREE.MeshStandardMaterial({ color: 0x050b16, metalness: 0.8, roughness: 0.4, emissive: 0x0c1c34, emissiveIntensity: 0.6 }));
      endScreen.add(endBack);
      const endArt = new THREE.Mesh(new THREE.PlaneGeometry(24.6, 13.8),
        new THREE.MeshBasicMaterial({ map: textures.day, toneMapped: false }));
      endArt.position.z = 0.04; endScreen.add(endArt);
      const endGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x9fe8ff, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false }));
      endGlow.scale.set(44, 26, 1); endGlow.position.z = -1.2; endScreen.add(endGlow);
      gallery.add(endScreen);

      /* ---------------------------------------------------- particles */
      const pCount = T.touch ? 320 : 700;
      const pPos = new Float32Array(pCount * 3);
      for (let i = 0; i < pCount; i++) {
        pPos[i * 3] = (Math.random() - 0.5) * 34;
        pPos[i * 3 + 1] = (Math.random() - 0.5) * 20;
        pPos[i * 3 + 2] = -Math.random() * 220 + 8;
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
      const points = new THREE.Points(pGeo, new THREE.PointsMaterial({
        size: 0.16, map: dotTexture('rgba(255,255,255,1)', 'rgba(150,220,255,.5)'),
        color: 0xa8e6ff, transparent: true, opacity: 0.7, depthWrite: false,
        blending: THREE.AdditiveBlending, sizeAttenuation: true
      }));
      scene.add(points);

      /* ---------------------------------------------------- DOM overlays */
      const el = {
        brand: section.querySelector('.hero-brand'),
        actions: section.querySelector('.hero-actions'),
        meta: section.querySelector('.hero-meta'),
        cue: section.querySelector('.scroll-cue'),
        card: section.querySelector('.journey-card'),
        chapters: U.$$('.chapter', section),
        ticks: U.$$('.journey-progress i', section)
      };
      const cfg = T.config || {};
      el.chapters.forEach((c, i) => {
        const data = (cfg.chapters || [])[i];
        if (!data) return;
        c.dataset.at = data.at.join(',');
      });

      /* ---------------------------------------------------- resize */
      function resize() {
        const w = canvas.clientWidth || canvas.parentElement.clientWidth || window.innerWidth;
        const h = canvas.clientHeight || canvas.parentElement.clientHeight || window.innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / Math.max(1, h);
        camera.updateProjectionMatrix();
      }
      resize();
      T.Scroll.onResize(resize);
      T.Scroll.invalidate();

      /* ---------------------------------------------------- state */
      let p = 0, camZ = 2, lastP = -1;
      const target = new THREE.Vector3();
      const tmp = new THREE.Vector3();

      this.isReady = () => true;
      this.update = (t, dt, S, P) => {
        const prog = S.progress(section);
        /* two clocks on purpose:
           `prog`  — exact scroll progress; drives every DOM overlay so captions are
                     frame-accurate and never lag behind the finger/wheel
           `p`     — the same value, damped; drives the camera and the frame dissolve,
                     which is what makes the scrub feel like film rather than a jump cut */
        p = U.damp(p, prog, 16, dt);
        if (Math.abs(p - prog) < 0.0004) p = prog;

        const r = section.getBoundingClientRect();
        const visible = r.bottom > -20 && r.top < window.innerHeight + 20;
        if (!visible) return;

        /* ---- camera choreography ------------------------------------- */
        const pA = U.clamp(p / 0.58);
        const pB = U.clamp((p - 0.58) / 0.42);
        const px = P.sx, py = P.sy;                    // pointer parallax

        if (pA < 1 || p < 0.585) {
          /* SEGMENT A — descending through the hyperlapse */
          const ease = 0.34 * pA + 0.66 * U.easeInOut(pA);
          camZ = 2 - 154 * ease;
          const x = Math.sin(pA * 3.3 * Math.PI) * 1.5;
          const y = Math.sin(pA * 2.2 * Math.PI + 1.2) * 0.7;
          camera.position.set(x + px * 0.7, y + py * 0.42, camZ);
          tmp.set(x * 0.3 + Math.sin(pA * 1.7 * Math.PI) * 1.1 + px * 1.5,
            y * 0.3 + Math.sin(pA * 2.9 * Math.PI) * 0.5 + py * 0.9,
            camZ - 15);
          target.copy(tmp);
          camera.lookAt(target);
          camera.rotateZ(Math.sin(pA * 2.6 * Math.PI) * 0.035 + px * 0.012);
        } else {
          /* SEGMENT B — walking the gallery of realms */
          const ease = U.easeInOut(pB);
          camZ = -152 - 42 * ease;
          const x = Math.sin(pB * 2.6 * Math.PI) * 1.7;
          const y = 0.55 + Math.sin(pB * 2.0 * Math.PI) * 0.4;
          camera.position.set(x + px * 0.55, y + py * 0.3, camZ);
          tmp.set(x * 0.4 + Math.sin(pB * 3.1 * Math.PI) * 5.2 + px * 1.2,
            0.5 + Math.sin(pB * 2.2 * Math.PI) * 0.7 + py * 0.7,
            camZ - 13);
          camera.lookAt(tmp);
          camera.rotateZ(Math.sin(pB * 1.9 * Math.PI) * 0.02);
        }

        /* ---- plane dissolves ---------------------------------------- */
        for (let i = 0; i < planes.length; i++) {
          const m = planes[i];
          const ahead = camZ - m.position.z;
          let o = 0;
          if (ahead > 0.4) o = U.smooth(U.clamp((ahead - 0.4) / 5.5));
          if (ahead > 34) o *= U.clamp(1 - (ahead - 34) / 22);
          m.material.opacity = o;
          m.visible = o > 0.004;
          if (m.visible) {
            m.position.x = m.userData.base.x + Math.sin(t * 0.25 + i) * 0.06;
            m.position.y = m.userData.base.y + Math.cos(t * 0.21 + i * 1.3) * 0.05;
          }
        }

        /* ---- exhibit glow pulse ------------------------------------- */
        for (let i = 0; i < exhibits.length; i++) {
          const e = exhibits[i];
          const near = U.clamp(1 - Math.abs(camZ - e.group.position.z) / 26);
          e.glow.material.opacity = 0.16 + 0.34 * near * (0.7 + 0.3 * Math.sin(t * 0.9 + i));
          e.glow.scale.set(9 + near * 3, 5.8 + near * 2, 1);
        }
        endGlow.material.opacity = 0.3 + 0.16 * Math.sin(t * 0.7) + 0.5 * U.range(pB, 0.75, 1);
        lightBreathe(t);

        /* ---- particles drift ---------------------------------------- */
        points.rotation.y = Math.sin(t * 0.05) * 0.03;
        points.position.y = Math.sin(t * 0.16) * 0.5;

        /* ---- DOM overlays ------------------------------------------- */
        const brandOut = U.range(prog, 0.008, 0.075);
        if (el.brand) {
          el.brand.style.opacity = String(1 - brandOut);
          el.brand.style.transform = 'translateY(' + (-brandOut * 46).toFixed(1) + 'px)';
          el.brand.style.visibility = brandOut > 0.99 ? 'hidden' : 'visible';
        }
        if (el.actions) {
          el.actions.style.opacity = String(1 - U.range(prog, 0.006, 0.06));
          el.actions.style.pointerEvents = prog > 0.05 ? 'none' : 'auto';
        }
        if (el.meta) el.meta.style.opacity = String(1 - U.range(prog, 0.01, 0.06));
        if (el.cue) el.cue.style.opacity = String(1 - U.range(prog, 0.004, 0.03));

        for (let i = 0; i < el.chapters.length; i++) {
          const c = el.chapters[i];
          const at = c.dataset.at.split(',').map(Number);
          const o = U.window(prog, at[0], at[1], at[2], at[3]);
          const rise = U.lerp(28, -34, U.clamp((prog - at[0]) / (at[3] - at[0])));
          c.style.opacity = String(o);
          c.style.transform = 'translateY(' + rise.toFixed(1) + 'px)';
          c.style.visibility = o < 0.01 ? 'hidden' : 'visible';
        }

        const cardIn = U.range(prog, 0.9, 0.975);
        if (el.card) {
          el.card.style.opacity = String(cardIn);
          el.card.style.transform = 'translate(-50%,' + (26 - cardIn * 26).toFixed(1) + 'px)';
        }

        const framed = U.range(prog, 0.87, 0.99);
        if (frameEl) {
          frameEl.style.setProperty('--frame-scale', String(1 - framed * 0.15));
          frameEl.style.setProperty('--frame-radius', (framed * 30).toFixed(1) + 'px');
          frameEl.classList.toggle('is-framed', framed > 0.55);
        }
        for (let i = 0; i < el.ticks.length; i++) {
          const bounds = [0.2, 0.42, 0.62, 0.86, 1];
          el.ticks[i].classList.toggle('is-on', prog >= (i === 0 ? 0.04 : bounds[i - 1]) && prog <= bounds[i] + 0.2);
        }

        lastP = prog;
        renderer.render(scene, camera);
      };

      const lightBase = lights.map((l) => l.intensity);
      function lightBreathe(t) {
        for (let i = 0; i < lights.length; i++) {
          lights[i].intensity = lightBase[i] * (0.85 + 0.25 * Math.sin(t * 0.6 + i));
        }
      }

      renderer.render(scene, camera);
      T.journeyReady = true;
      T.scenes = T.scenes || {};
      T.scenes.journey = T.journey = { renderer: renderer, scene: scene, camera: camera, planes: planes, textures: textures, exhibits: exhibits,
        state: function () { return { p: p, camZ: camZ }; } };
      if (T.assets) T.assets.done('journey');
    }
  });
})();
