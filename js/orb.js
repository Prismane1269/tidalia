/* ==========================================================================
   TIDALIA — composer visual (Three.js)
   A spinning vinyl record with a reactive spectrum ring. Everything reacts
   to the live analyser when audio is playing, and to a synthetic field when
   it is composing.
   ========================================================================== */
(function () {
  'use strict';
  const T = (window.TIDALIA = window.TIDALIA || {});
  const U = T.util;

  T.register({
    name: 'orb',
    init() {
      const canvas = document.getElementById('orb-canvas');
      if (!canvas || !window.THREE) return;
      if (T.assets) T.assets.expect('orb');

      const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !T.touch, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, T.touch ? 1.5 : 2));
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x030711, 0.05);
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
      camera.position.set(0, 1.25, 6.2);
      camera.lookAt(0, -0.1, 0);

      /* vinyl texture: grooves + label, drawn in 2D then wrapped */
      function vinylTexture() {
        const S = 1024, c = document.createElement('canvas');
        c.width = c.height = S;
        const g = c.getContext('2d');
        g.fillStyle = '#05070d'; g.fillRect(0, 0, S, S);
        const cx = S / 2, cy = S / 2;
        for (let r = S * 0.47; r > S * 0.16; r -= 2.1) {
          g.beginPath(); g.arc(cx, cy, r, 0, 6.283);
          g.strokeStyle = 'rgba(' + (110 + Math.random() * 90) + ',' + (150 + Math.random() * 80) + ',255,' + (0.03 + Math.random() * 0.1) + ')';
          g.lineWidth = 1 + Math.random();
          g.stroke();
        }
        // iridescent sweeps
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const grd = g.createLinearGradient(cx + Math.cos(a) * 200, cy + Math.sin(a) * 200, cx + Math.cos(a + 3) * 200, cy + Math.sin(a + 3) * 200);
          grd.addColorStop(0, 'rgba(70,224,255,.0)');
          grd.addColorStop(0.5, 'hsla(' + (180 + i * 22) + ',95%,70%,.16)');
          grd.addColorStop(1, 'rgba(155,107,255,0)');
          g.fillStyle = grd;
          g.beginPath(); g.arc(cx, cy, S * 0.47, a, a + 2.2); g.arc(cx, cy, S * 0.16, a + 2.2, a, true); g.fill();
        }
        // label
        const lg = g.createRadialGradient(cx, cy - 40, 10, cx, cy, S * 0.15);
        lg.addColorStop(0, '#7fe6ff'); lg.addColorStop(0.5, '#2a5fd0'); lg.addColorStop(1, '#0d1b3a');
        g.fillStyle = lg;
        g.beginPath(); g.arc(cx, cy, S * 0.145, 0, 6.283); g.fill();
        g.strokeStyle = 'rgba(230,245,255,.5)'; g.lineWidth = 3;
        g.beginPath(); g.arc(cx, cy, S * 0.145, 0, 6.283); g.stroke();
        g.fillStyle = 'rgba(240,250,255,.92)'; g.font = '600 54px Inter, Helvetica, Arial, sans-serif';
        g.textAlign = 'center'; g.fillText('TIDALIA', cx, cy - 8);
        g.font = '400 30px Inter, Helvetica, Arial, sans-serif';
        g.fillStyle = 'rgba(220,240,255,.75)';
        g.fillText('SIDE A · 33⅓', cx, cy + 42);
        g.fillStyle = '#04060c';
        g.beginPath(); g.arc(cx, cy, S * 0.012, 0, 6.283); g.fill();
        const t = new THREE.CanvasTexture(c);
        t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
        return t;
      }
      function glowTex(hex) {
        const c = document.createElement('canvas'); c.width = c.height = 128;
        const g = c.getContext('2d');
        const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        grd.addColorStop(0, hex + 'dd'); grd.addColorStop(0.4, hex + '3a'); grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
        return new THREE.CanvasTexture(c);
      }
      const GLOW = glowTex('#7ff0ff');

      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(2.5, 2.5, 0.08, 96, 1),
        [new THREE.MeshStandardMaterial({ color: 0x05070d, roughness: 0.4, metalness: 0.7 }),
         new THREE.MeshBasicMaterial({ map: vinylTexture() }),
         new THREE.MeshBasicMaterial({ map: vinylTexture() })]
      );
      disc.rotation.x = Math.PI / 2;
      scene.add(disc);

      const rim = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.035, 8, 96),
        new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.55 }));
      scene.add(rim);

      const shadow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }));
      shadow.scale.set(9, 6.4, 1); shadow.position.set(0, -0.6, -1.6);
      scene.add(shadow);

      /* spectrum ring of 72 bars */
      const BARS = 72;
      const barMat = new THREE.MeshBasicMaterial({ color: 0x8fe9ff, transparent: true, opacity: 0.85, fog: false });
      const bars = [];
      for (let i = 0; i < BARS; i++) {
        const a = (i / BARS) * Math.PI * 2;
        const h = 0.18;
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.045, h, 0.045), barMat.clone());
        m.position.set(Math.cos(a) * 2.95, 0, Math.sin(a) * 2.95);
        m.rotation.y = -a;
        m.userData = { a: a, base: h, i: i };
        scene.add(m);
        bars.push(m);
      }

      scene.add(new THREE.AmbientLight(0x2a3a58, 1));
      const dl = new THREE.DirectionalLight(0xbfe0ff, 0.9); dl.position.set(2, 5, 4); scene.add(dl);
      const p1 = new THREE.PointLight(0x46e0ff, 1.5, 14, 1.6); p1.position.set(-2.4, 1.4, 3); scene.add(p1);
      const p2 = new THREE.PointLight(0xff5fa2, 1.2, 14, 1.6); p2.position.set(2.6, -0.6, -2.4); scene.add(p2);

      /* dust */
      const dn = T.touch ? 120 : 260;
      const dp = new Float32Array(dn * 3);
      for (let i = 0; i < dn; i++) {
        dp[i * 3] = (Math.random() - 0.5) * 16;
        dp[i * 3 + 1] = (Math.random() - 0.5) * 9;
        dp[i * 3 + 2] = (Math.random() - 0.5) * 10;
      }
      const dg = new THREE.BufferGeometry();
      dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
      const dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.06, map: GLOW, color: 0xbfe9ff, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
      scene.add(dust);

      function resize() {
        const parent = canvas.parentElement;
        const w = parent.clientWidth || 600;
        const h = parent.clientHeight || 420;
        renderer.setSize(w, h, false);
        camera.aspect = w / Math.max(1, h);
        camera.updateProjectionMatrix();
      }
      resize();
      T.Scroll.onResize(resize);

      let spin = 0;
      this.update = (t, dt) => {
        const r = canvas.getBoundingClientRect();
        if (r.bottom < -60 || r.top > window.innerHeight + 60) return;
        const level = T.audio ? T.audio.level : 0;
        const busy = document.getElementById('compose-busy');
        const composing = busy && !busy.hidden;
        spin += dt * (0.28 + level * 1.6 + (composing ? 0.55 : 0));
        disc.rotation.z = spin;                 // disc is rotated on X, so Z spins the surface
        disc.rotation.x = Math.PI / 2 + Math.sin(t * 0.4) * 0.02;
        camera.position.x = U.damp(camera.position.x, T.pointer.sx * 0.5, 3, dt);
        camera.position.y = U.damp(camera.position.y, 1.25 + T.pointer.sy * 0.35 + Math.sin(t * 0.3) * 0.05, 3, dt);
        camera.lookAt(0, -0.05, 0);
        rim.material.opacity = 0.4 + level * 0.5;
        for (let i = 0; i < bars.length; i++) {
          const b = bars[i];
          const synth = 0.22 + 0.5 * Math.abs(Math.sin(t * 2.1 + i * 0.7)) * (composing ? 1 : 0.35);
          const h = 0.12 + (level * 3.4 + synth * 0.5) * (0.55 + 0.7 * U.rand(i * 3.1));
          b.scale.y = U.damp(b.scale.y, Math.max(0.2, h / b.userData.base), 8, dt);
          b.position.y = b.scale.y * b.userData.base * 0.5;
          const hue = 0.52 - (b.scale.y * 0.06);
          b.material.color.setHSL(hue, 0.9, 0.62);
          b.material.opacity = 0.35 + Math.min(0.6, b.scale.y * 0.25);
        }
        shadow.material.opacity = 0.18 + level * 0.5;
        p1.intensity = 1.3 + level * 1.6;
        p2.intensity = 1.0 + level * 1.2;
        dust.rotation.y = t * 0.02;
        renderer.render(scene, camera);
      };

      T.scenes = T.scenes || {};
      T.scenes.orb = { scene: scene, camera: camera, renderer: renderer };
      if (T.assets) T.assets.done('orb');
      renderer.render(scene, camera);
    }
  });
})();
