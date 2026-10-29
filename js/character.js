/* ==========================================================================
   TIDALIA — THE CHARACTER  (Three.js)
   The finale: an octopus wearing headphones — built entirely in code
   (procedural mantle, headphone band + cups, 8 tapered tentacles with
   travelling vertex waves, blinking eyes, audio-reactive glow ring).
   Hand it a real .glb instead if you like: see assets/models/README.md
   ========================================================================== */
(function () {
  'use strict';
  const T = (window.TIDALIA = window.TIDALIA || {});
  const U = T.util;

  T.register({
    name: 'character',
    init() {
      const canvas = document.getElementById('finale-canvas');
      const section = document.getElementById('finale');
      if (!canvas || !section || !window.THREE) return;
      if (T.assets) T.assets.expect('character');

      const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !T.touch, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, T.touch ? 1.5 : 2));
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x030711, 0.055);
      const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 140);
      camera.position.set(0, 0.5, 11.8);

      /* ------------------------------------------------ textures (procedural) */
      function skinTexture() {
        const c = document.createElement('canvas'); c.width = c.height = 512;
        const g = c.getContext('2d');
        const grd = g.createRadialGradient(256, 250, 16, 256, 250, 400);
        grd.addColorStop(0, '#9fe4ff');
        grd.addColorStop(0.22, '#5cb6e6');
        grd.addColorStop(0.55, '#2a6ea8');
        grd.addColorStop(0.82, '#16406e');
        grd.addColorStop(1, '#0a2340');
        g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 900; i++) {
          const x = Math.random() * 512, y = Math.random() * 512, r = Math.random() * 2.6 + 0.5;
          const a = Math.random() * 0.16;
          g.fillStyle = Math.random() > 0.5 ? 'rgba(190,245,255,' + a + ')' : 'rgba(10,30,60,' + (a * 1.4) + ')';
          g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
        }
        // iridescent bands
        for (let i = 0; i < 26; i++) {
          g.strokeStyle = 'hsla(' + (170 + Math.random() * 110) + ',90%,72%,.07)';
          g.lineWidth = 3 + Math.random() * 10;
          g.beginPath();
          g.ellipse(256, 256, 40 + i * 9, 30 + i * 7, Math.random() * 3, 0, 6.283);
          g.stroke();
        }
        const t = new THREE.CanvasTexture(c);
        t.encoding = THREE.sRGBEncoding;
        return t;
      }
      function glowTexture(hex) {
        const c = document.createElement('canvas'); c.width = c.height = 128;
        const g = c.getContext('2d');
        const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        grd.addColorStop(0, hex + 'cc');
        grd.addColorStop(0.4, hex + '44');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
        return new THREE.CanvasTexture(c);
      }
      const TEX_SKIN = skinTexture();
      const TEX_GLOW_CYAN = glowTexture('#7ff0ff');
      const TEX_GLOW_PINK = glowTexture('#ff7ad0');
      const TEX_BUBBLE = (function () {
        const c = document.createElement('canvas'); c.width = c.height = 64;
        const g = c.getContext('2d');
        const grd = g.createRadialGradient(32, 32, 2, 32, 32, 32);
        grd.addColorStop(0, 'rgba(255,255,255,.95)');
        grd.addColorStop(0.35, 'rgba(180,235,255,.35)');
        grd.addColorStop(0.8, 'rgba(140,215,255,.08)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(c);
      })();

      /* ------------------------------------------------ model */
      const octo = new THREE.Group();
      octo.position.set(1.9, -0.1, 0);
      scene.add(octo);

      const skinMat = new THREE.MeshPhysicalMaterial({
        map: TEX_SKIN, color: 0xffffff, roughness: 0.3, metalness: 0.12,
        clearcoat: 0.75, clearcoatRoughness: 0.22, emissive: 0x0d3357, emissiveIntensity: 0.8,
        emissiveMap: TEX_SKIN
      });
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x151a26, roughness: 0.26, metalness: 0.92 });
      const foamMat = new THREE.MeshStandardMaterial({ color: 0x0a0f18, roughness: 0.85, metalness: 0.1 });
      const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf3fbff, roughness: 0.35, metalness: 0.05, emissive: 0x2b4c66, emissiveIntensity: 0.35 });
      const pupilMat = new THREE.MeshStandardMaterial({ color: 0x05080e, roughness: 0.15, metalness: 0.4 });

      const head = new THREE.Mesh(new THREE.SphereGeometry(1.28, 48, 34), skinMat);
      head.scale.set(1, 1.16, 1.04);
      head.position.y = 0.42;
      octo.add(head);

      // ridge / brow
      const brow = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.1, 8, 40, Math.PI), skinMat);
      brow.rotation.set(Math.PI / 2, 0, Math.PI);
      brow.position.set(0, 0.86, 0.66);
      brow.scale.set(1, 1, 0.6);
      octo.add(brow);

      // eyes
      const eyes = [];
      [-1, 1].forEach((s) => {
        const white = new THREE.Mesh(new THREE.SphereGeometry(0.33, 30, 22), eyeWhiteMat);
        white.position.set(s * 0.5, 0.6, 1.02);
        white.scale.set(1, 1.06, 0.66);
        octo.add(white);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.155, 24, 18), pupilMat);
        pupil.position.set(s * 0.5, 0.6, 1.24);
        pupil.scale.set(1, 1, 0.5);
        octo.add(pupil);
        const spark = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10),
          new THREE.MeshBasicMaterial({ color: 0xffffff }));
        spark.position.set(s * 0.5 - 0.06, 0.7, 1.35);
        octo.add(spark);
        const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_GLOW_CYAN, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }));
        gl.scale.set(1.5, 1.5, 1); gl.position.set(s * 0.5, 0.62, 0.9);
        octo.add(gl);
        eyes.push({ white: white, pupil: pupil, spark: spark, glow: gl, side: s, baseY: 0.6 });
      });

      // headphone band + cups
      const band = new THREE.Mesh(new THREE.TorusGeometry(1.44, 0.092, 12, 56, Math.PI), darkMat);
      band.position.set(0, 0.5, -0.04);
      octo.add(band);
      const bandGlow = new THREE.Mesh(new THREE.TorusGeometry(1.44, 0.02, 6, 56, Math.PI),
        new THREE.MeshBasicMaterial({ color: 0x64e8ff, transparent: true, opacity: 0.85 }));
      bandGlow.position.set(0, 0.5, -0.04);
      octo.add(bandGlow);

      const cups = [];
      [-1, 1].forEach((s) => {
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.3, 32, 1, false), darkMat);
        cup.rotation.z = Math.PI / 2;
        cup.position.set(s * 1.34, 0.42, 0);
        octo.add(cup);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.045, 10, 40),
          new THREE.MeshBasicMaterial({ color: 0x7ff0ff, transparent: true, opacity: 0.9 }));
        ring.rotation.y = Math.PI / 2;
        ring.position.set(s * 1.5, 0.42, 0);
        octo.add(ring);

        const cupGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_GLOW_CYAN, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
        cupGlow.scale.set(2.6, 2.6, 1);
        cupGlow.position.set(s * 1.62, 0.42, 0);
        octo.add(cupGlow);

        const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.09, 28), foamMat);
        inner.rotation.z = Math.PI / 2;
        inner.position.set(s * 1.17, 0.42, 0);
        octo.add(inner);
        cups.push({ ring: ring, glow: cupGlow, cup: cup });
      });

      // muzzle / beak suggestion
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 12), darkMat);
      beak.rotation.x = Math.PI * 0.5;
      beak.position.set(0, -0.22, 1.08);
      octo.add(beak);

      /* ------------------------------------------------ tentacles */
      const tentacles = [];
      const TENT_R = 0.27;
      const SEG = 46, RAD = 9;
      function buildTentacle(i) {
        const ang = (i / 8) * Math.PI * 2 + 0.16;
        const dir = new THREE.Vector2(Math.cos(ang), Math.sin(ang));
        const curl = (U.rand(i * 5.1) - 0.5) * 1.2;
        const spread = 1.05 + U.rand(i * 7.3) * 0.55;
        const drop = 2.6 + U.rand(i * 3.7) * 0.75;
        const pts = [
          new THREE.Vector3(dir.x * 0.42, -0.72, dir.y * 0.42),
          new THREE.Vector3(dir.x * 0.82, -1.28, dir.y * 0.82),
          new THREE.Vector3(dir.x * (spread + 0.25), -1.95, dir.y * (spread + 0.25)),
          new THREE.Vector3(dir.x * (spread + 0.9) + curl * 0.3, -2.62 - drop * 0.2, dir.y * (spread + 0.9) + curl * 0.24),
          new THREE.Vector3(dir.x * (spread + 1.25 - curl * 0.4), -2.95 - drop * 0.34, dir.y * (spread + 1.05) + curl * 0.5)
        ];
        const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
        const geo = new THREE.TubeGeometry(curve, SEG, TENT_R, RAD, false);

        // arc-length polyline so we can taper + animate robustly
        const SAMPLES = 120;
        const centers = [];
        for (let s = 0; s <= SAMPLES; s++) centers.push(curve.getPointAt(s / SAMPLES));

        const pos = geo.attributes.position;
        const count = pos.count;
        const base = new Float32Array(count * 3);
        const radial = new Float32Array(count * 3);
        const vArr = new Float32Array(count);
        for (let v = 0; v < count; v++) {
          const x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v);
          let best = 0, bestD = Infinity;
          for (let s = 0; s <= SAMPLES; s++) {
            const c = centers[s];
            const d = (x - c.x) * (x - c.x) + (y - c.y) * (y - c.y) + (z - c.z) * (z - c.z);
            if (d < bestD) { bestD = d; best = s; }
          }
          const vv = best / SAMPLES;
          const c = centers[best];
          let ox = x - c.x, oy = y - c.y, oz = z - c.z;
          const len = Math.sqrt(ox * ox + oy * oy + oz * oz) || 1;
          radial[v * 3] = ox / len; radial[v * 3 + 1] = oy / len; radial[v * 3 + 2] = oz / len;
          vArr[v] = vv;
          const taper = 1 - 0.66 * Math.pow(vv, 0.9);
          base[v * 3] = c.x + ox * taper;
          base[v * 3 + 1] = c.y + oy * taper;
          base[v * 3 + 2] = c.z + oz * taper;
        }
        pos.array.set(base);
        pos.needsUpdate = true;
        geo.computeVertexNormals();
        geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3).fill(1), 3));

        const mat = skinMat.clone();
        mat.emissiveIntensity = 0.55;
        const mesh = new THREE.Mesh(geo, mat);

        const pivot = new THREE.Group();
        pivot.position.set(0, 0, 0);
        pivot.add(mesh);
        octo.add(pivot);

        const tips = new THREE.Sprite(new THREE.SpriteMaterial({ map: i % 2 ? TEX_GLOW_PINK : TEX_GLOW_CYAN, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
        tips.scale.set(0.8, 0.8, 1);
        octo.add(tips);

        tentacles.push({ mesh: mesh, geo: geo, base: base, radial: radial, vArr: vArr, pivot: pivot, phase: i * 0.9, tip: tips, dir: dir, end: pts[4] });
      }
      for (let i = 0; i < 8; i++) buildTentacle(i);

      /* ------------------------------------------------ bubbles + lights */
      const bubbles = [];
      for (let i = 0; i < (T.touch ? 26 : 54); i++) {
        const b = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_BUBBLE, transparent: true, opacity: 0.25 + Math.random() * 0.4, blending: THREE.AdditiveBlending, depthWrite: false }));
        const s = 0.05 + Math.random() * 0.22;
        b.scale.set(s, s, 1);
        b.position.set((Math.random() - 0.5) * 9, -3.4 + Math.random() * 7, (Math.random() - 0.5) * 4 + 0.5);
        b.userData = { vy: 0.22 + Math.random() * 0.55, wob: Math.random() * 6.283, amp: 0.1 + Math.random() * 0.3 };
        scene.add(b);
        bubbles.push(b);
      }

      scene.add(new THREE.AmbientLight(0x22334f, 0.9));
      const dir = new THREE.DirectionalLight(0xcfe6ff, 0.95); dir.position.set(3.4, 6.4, 4.2); scene.add(dir);
      const rimA = new THREE.PointLight(0x39e6ff, 1.7, 16, 1.7); rimA.position.set(2.6, -1.1, 2.8); scene.add(rimA);
      const rimB = new THREE.PointLight(0xff4fd8, 1.25, 16, 1.7); rimB.position.set(-3.1, 0.6, -2.0); scene.add(rimB);
      const top = new THREE.PointLight(0xbfe9ff, 0.7, 18, 1.6); top.position.set(0, 4.6, 1.6); scene.add(top);

      const rigLook = new THREE.Vector3(0.5, -1.15, 0);
      /* ------------------------------------------------ blink + resize */
      let nextBlink = 3 + Math.random() * 4, blinkT = -1;
      const view = { narrow: false, dist: 11.8, lift: 0, camY: 0.5, aimY: -1.15 };
      function resize() {
        const w = canvas.clientWidth || window.innerWidth;
        const h = canvas.clientHeight || window.innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / Math.max(1, h);
        view.narrow = camera.aspect < 0.95 || camera.aspect > 2.4;
        const portrait = camera.aspect < 0.95;
        camera.fov = portrait ? 46 : 40;
        octo.position.x = view.narrow ? 0 : 1.9;
        octo.scale.setScalar(portrait ? 0.62 : 1);
        view.dist = portrait ? 13.0 : 11.8;
        view.lift = portrait ? -2.5 : 0;          // portrait: sit low, under the copy
        view.camY = portrait ? 1.9 : 0.5;
        view.aimY = portrait ? -2.6 : -1.15;
        camera.updateProjectionMatrix();
      }
      resize();
      T.Scroll.onResize(resize);

      /* ------------------------------------------------ loop */
      let frame = 0;
      this.update = (t, dt, S, P) => {
        const r = section.getBoundingClientRect();
        const visible = r.bottom > -80 && r.top < window.innerHeight + 80;
        if (!visible) return;

        const prog = U.clamp((window.innerHeight - r.top) / (window.innerHeight + r.height));
        const level = T.audio ? T.audio.level : 0;

        octo.rotation.y = U.damp(octo.rotation.y, U.lerp(-0.5, 0.65, prog) + P.sx * 0.3, 3, dt);
        octo.rotation.x = U.damp(octo.rotation.x, -0.04 + P.sy * 0.08 + Math.sin(t * 0.42) * 0.03, 3, dt);
        octo.position.y = -0.1 + view.lift + Math.sin(t * 0.72) * 0.1 + U.lerp(0.15, -0.35, prog) * (view.lift ? 0.3 : 1) + level * 0.05;
        camera.position.z = U.damp(camera.position.z, view.dist - prog * 0.9, 3, dt);
        camera.position.y = U.damp(camera.position.y, view.camY + P.sy * 0.18, 3, dt);
        rigLook.set(octo.position.x * 0.42, view.aimY + prog * 0.3, 0);
        camera.lookAt(rigLook);

        /* tentacle waves (vertex level) */
        frame++;
        for (let i = 0; i < tentacles.length; i++) {
          const Tn = tentacles[i];
          const arr = Tn.geo.attributes.position.array;
          const b = Tn.base, rad = Tn.radial, vv = Tn.vArr;
          const amp = 0.13 + level * 0.16;
          const ph = Tn.phase;
          for (let v = 0; v < vv.length; v++) {
            const p = vv[v];
            const w = Math.sin(p * 5.2 - t * 1.5 + ph) * amp * (0.25 + p) +
                      Math.cos(p * 2.1 - t * 0.85 + ph * 0.6) * (0.06 + level * 0.05);
            const k = 1 + w;
            const k3 = v * 3;
            arr[k3] = b[k3] * 1 + rad[k3] * w * 1.15;
            arr[k3 + 1] = b[k3 + 1] + rad[k3 + 1] * w * 1.15;
            arr[k3 + 2] = b[k3 + 2] + rad[k3 + 2] * w * 1.15;
            if (k < 0.4) { /* guard against inversion */ }
          }
          Tn.geo.attributes.position.needsUpdate = true;
          if (frame % 2 === 0) Tn.geo.computeVertexNormals();
          Tn.pivot.rotation.x = Math.sin(t * 0.6 + i * 0.8) * (0.05 + level * 0.09);
          Tn.pivot.rotation.z = Math.cos(t * 0.52 + i * 1.1) * (0.045 + level * 0.08);
          Tn.tip.position.set(Tn.end.x, Tn.end.y + 0.1 + Math.sin(t * 0.9 + i) * 0.06, Tn.end.z);
          Tn.tip.material.opacity = 0.22 + level * 0.75 + 0.12 * Math.sin(t * 1.2 + i);
          Tn.tip.scale.setScalar(0.55 + level * 0.7 + 0.06 * Math.sin(t + i));
        }

        /* eyes: look at the cursor, blink occasionally */
        const lookX = U.clamp(P.sx, -1, 1) * 0.07;
        const lookY = U.clamp(P.sy, -1, 1) * 0.05;
        eyes.forEach((e) => {
          e.pupil.position.x = e.side * 0.5 + lookX;
          e.pupil.position.y = e.baseY + lookY;
          if (e.spark) { e.spark.position.x = e.side * 0.5 - 0.06 + lookX; e.spark.position.y = e.baseY + 0.1 + lookY; }
          e.glow.material.opacity = 0.2 + level * 0.45;
        });
        nextBlink -= dt;
        if (nextBlink <= 0) { blinkT = 0; nextBlink = 3.4 + Math.random() * 4.6; }
        if (blinkT >= 0) {
          blinkT += dt;
          const k = blinkT < 0.09 ? 1 - blinkT / 0.09 : Math.max(0, 1 - (blinkT - 0.09) / 0.11);
          const sy = U.lerp(1, 0.08, k);
          eyes.forEach((e) => { e.white.scale.y = sy * 1.06; e.pupil.scale.y = Math.max(0.05, sy * 0.5); if (e.spark) e.spark.visible = sy > 0.6; });
          if (blinkT > 0.22) blinkT = -1;
        }

        cups.forEach((c, i) => {
          c.ring.material.opacity = 0.6 + level * 0.4;
          c.glow.material.opacity = 0.24 + level * 0.85;
          c.glow.scale.setScalar(2.2 + level * 1.6 + 0.08 * Math.sin(t * 2 + i));
          c.cup.scale.setScalar(1 + level * 0.04);
        });
        bandGlow.material.opacity = 0.55 + level * 0.45;
        rimA.intensity = 1.5 + level * 1.4 + Math.sin(t * 0.8) * 0.2;
        rimB.intensity = 1.1 + level * 1.1;
        head.scale.setScalar(1 + level * 0.02);
        head.scale.set(1 + level * 0.02, 1.16 + level * 0.02, 1.04 + level * 0.02);

        bubbles.forEach((b) => {
          b.position.y += b.userData.vy * dt;
          b.position.x += Math.sin(t * 1.1 + b.userData.wob) * b.userData.amp * dt;
          if (b.position.y > 4.4) { b.position.y = -3.6; b.position.x = (Math.random() - 0.5) * 9; }
        });

        renderer.render(scene, camera);
      };

      T.scenes = T.scenes || {};
      T.scenes.character = { scene: scene, camera: camera, octo: octo, renderer: renderer };

      renderer.render(scene, camera);
      if (T.assets) T.assets.done('character');
    }
  });
})();
