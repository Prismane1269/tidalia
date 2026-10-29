/* ==========================================================================
   TIDALIA — audio engine
   • Ambient soundtrack is generated live with WebAudio (no audio files needed)
   • Every generated/archived track is also synthesised procedurally from a seed
   ========================================================================== */
(function () {
  'use strict';
  const T = (window.TIDALIA = window.TIDALIA || {});
  const U = T.util;

  const A = (T.audio = {
    name: 'audio',
    ctx: null, on: false, ready: false, level: 0, _smoothLevel: 0,
    _nodes: null, _active: null, _chordTimer: null, _shimmerTimer: null,
    volume: 0.7,

    /* ------------------------------------------------------------ scaffolding */
    _ensure() {
      if (this.ctx) return this.ctx;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      const ctx = (this.ctx = new Ctx());

      const master = ctx.createGain();
      master.gain.value = 0;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.knee.value = 24; comp.ratio.value = 4;
      comp.attack.value = 0.01; comp.release.value = 0.4;
      master.connect(comp); comp.connect(ctx.destination);

      // reverb from a generated noise impulse — pure code, no files
      const conv = ctx.createConvolver();
      const len = Math.floor(ctx.sampleRate * 3.4);
      const imp = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = imp.getChannelData(c);
        for (let i = 0; i < len; i++) {
          const t = i / len;
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.6) * (1 - t * 0.2);
        }
      }
      conv.buffer = imp;
      const wet = ctx.createGain(); wet.gain.value = 0.55;
      wet.connect(conv); conv.connect(master);

      const dry = ctx.createGain(); dry.gain.value = 0.55; dry.connect(master);

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.82;
      master.connect(analyser);

      this._nodes = { master, wet, dry, analyser, comp };
      return ctx;
    },

    /* ------------------------------------------------------------ ambient bed */
    _buildAmbient() {
      const ctx = this.ctx, N = this._nodes;
      const bed = ctx.createGain(); bed.gain.value = 1;
      bed.connect(N.dry); bed.connect(N.wet);

      /* --- ocean: filtered noise with two slow LFOs --- */
      const nLen = Math.floor(ctx.sampleRate * 4);
      const nBuf = ctx.createBuffer(2, nLen, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = nBuf.getChannelData(c);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < nLen; i++) {
          const w = Math.random() * 2 - 1;
          b0 = 0.99 * b0 + w * 0.05; b1 = 0.96 * b1 + b0 * 0.12; b2 = 0.9 * b2 + b1 * 0.3;
          d[i] = b2 * 3.2;
        }
      }
      const noise = ctx.createBufferSource(); noise.buffer = nBuf; noise.loop = true;
      const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 340; nf.Q.value = 0.7;
      const ng = ctx.createGain(); ng.gain.value = 0.075;
      const lfo1 = ctx.createOscillator(); lfo1.frequency.value = 0.047;
      const lfo1g = ctx.createGain(); lfo1g.gain.value = 190;
      lfo1.connect(lfo1g); lfo1g.connect(nf.frequency);
      const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.073;
      const lfo2g = ctx.createGain(); lfo2g.gain.value = 0.045;
      lfo2.connect(lfo2g); lfo2g.connect(ng.gain);
      noise.connect(nf); nf.connect(ng); ng.connect(bed);
      noise.start(); lfo1.start(); lfo2.start();

      /* --- pad: four detuned voices per chord, crossfaded --- */
      const PAD = [0, 4, 7, 11];                       // maj7 shape
      const PROG = [0, -3, -7, -5];                    // Am7 -> F#m7 -> Dmaj7 -> E
      const root = 146.83;                             // D3
      const voices = PAD.map((semi, i) => {
        const g = ctx.createGain(); g.gain.value = 0;
        const a = ctx.createOscillator(); a.type = i % 2 ? 'sine' : 'triangle';
        const b = ctx.createOscillator(); b.type = 'sine';
        b.detune.value = 6 + i * 2;
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1500; f.Q.value = 0.4;
        const vg = ctx.createGain(); vg.gain.value = 0.085;
        a.connect(f); b.connect(f); f.connect(g); g.connect(vg);
        vg.connect(bed); vg.connect(N.wet);
        a.start(); b.start();
        return { a, b, g, i };
      });

      const bassG = ctx.createGain(); bassG.gain.value = 0;
      const bass = ctx.createOscillator(); bass.type = 'sine';
      const bassF = ctx.createBiquadFilter(); bassF.type = 'lowpass'; bassF.frequency.value = 220;
      bass.connect(bassF); bassF.connect(bassG); bassG.connect(N.dry); bassG.connect(N.wet);
      bass.start();

      let step = -1;
      const setChord = (idx) => {
        const semi = PROG[idx % PROG.length];
        voices.forEach((v, k) => {
          const freq = root * Math.pow(2, (semi + PAD[k]) / 12) / (k === 0 ? 2 : 1);
          v.a.frequency.setTargetAtTime(freq, ctx.currentTime, 0.6);
          v.b.frequency.setTargetAtTime(freq, ctx.currentTime, 0.6);
          v.g.gain.setTargetAtTime(0.9, ctx.currentTime, 1.4);
          v.g.gain.setTargetAtTime(0.62, ctx.currentTime + 6, 1.5);
        });
        bassG.gain.setTargetAtTime(0.11, ctx.currentTime, 1.6);
        bass.frequency.setTargetAtTime(root * Math.pow(2, (semi - 12) / 12), ctx.currentTime, 0.7);
        bassG.gain.setTargetAtTime(0.055, ctx.currentTime + 8, 2);
      };
      const nextChord = () => { step++; setChord(step); };
      nextChord();

      /* --- shimmer: sparse high notes, scheduled with the audio clock --- */
      const scale = [0, 2, 4, 7, 9, 11, 12, 14, 16];
      const scheduleShimmer = () => {
        if (!this.ctx || !this.on) return;
        if (Math.random() > 0.42) {
          const semi = scale[Math.floor(Math.random() * scale.length)];
          const f = root * 4 * Math.pow(2, semi / 12) * (Math.random() < 0.4 ? 2 : 1);
          const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
          const g = this.ctx.createGain(); g.gain.value = 0;
          const t0 = this.ctx.currentTime + 0.05;
          g.gain.setValueAtTime(0, t0);
          g.gain.linearRampToValueAtTime(0.035, t0 + 1.6);
          g.gain.exponentialRampToValueAtTime(0.0008, t0 + 6.5);
          o.connect(g); g.connect(N.wet); g.connect(N.dry);
          o.start(t0); o.stop(t0 + 7);
        }
        this._shimmerTimer = setTimeout(scheduleShimmer, 2600 + Math.random() * 4200);
      };

      this._ambient = { bed, voices, setChord, nextChord, noise, ng };
      this._chordTimer = setInterval(() => this._ambient.nextChord(), 14000);
      scheduleShimmer();
    },

    /* ------------------------------------------------------------ transport */
    play() {
      const ctx = this._ensure();
      if (!ctx) return false;
      if (ctx.state === 'suspended') ctx.resume();
      if (!this._ambient) { try { this._buildAmbient(); } catch (e) { console.warn('audio bed failed', e); } }
      this.on = true;
      const N = this._nodes;
      N.master.gain.cancelScheduledValues(ctx.currentTime);
      N.master.gain.setTargetAtTime(this.volume, ctx.currentTime, 0.8);
      document.dispatchEvent(new CustomEvent('tidalia:sound', { detail: { on: true } }));
      return true;
    },

    stop() {
      if (!this.ctx) return;
      this.on = false;
      const N = this._nodes;
      N.master.gain.cancelScheduledValues(this.ctx.currentTime);
      N.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
      document.dispatchEvent(new CustomEvent('tidalia:sound', { detail: { on: false } }));
    },

    toggle() { return this.on ? (this.stop(), false) : this.play(); },

    /* ------------------------------------------------------------ procedural tracks */
    KEY_RE: /^([A-G][#♯b♭]?)\s*(Major|Minor|m)$/,
    _rootHz(key) {
      const map = { C: 0, 'C♯': 1, 'D♭': 1, D: 2, 'D♯': 3, 'E♭': 3, E: 4, F: 5, 'F♯': 6, 'G♭': 6, G: 7, 'G♯': 8, 'A♭': 8, A: 9, 'A♯': 10, 'B♭': 10, B: 11 };
      const m = String(key || 'D Major').replace('#', '♯').replace('b', '♭').match(this.KEY_RE);
      if (!m) return { root: 293.66, minor: false };
      const semi = map[m[1]] !== undefined ? map[m[1]] : 2;
      return { root: 261.63 * Math.pow(2, semi / 12), minor: /Minor/i.test(m[2]) };
    },

    /** Plays a full procedural track from a seed. Returns a handle. */
    playTrack(seed, opts) {
      opts = opts || {};
      const ctx = this._ensure();
      if (!ctx) return null;
      if (ctx.state === 'suspended') ctx.resume();
      this.stopTrack();

      const key = this._rootHz(opts.key);
      const bpm = opts.bpm || 84;
      const beat = 60 / bpm;
      const stepDur = beat / 2;                    // 8th notes
      const tag = (opts.tags || []).join(' ').toLowerCase();
      const minor = key.minor;
      const scale = minor ? [0, 2, 3, 5, 7, 8, 10, 12, 14, 15] : [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];
      const chords = minor ? [[0, 3, 7, 10], [-4, 0, 3, 7], [-5, -1, 2, 5], [-2, 2, 5, 9]]
                           : [[0, 4, 7, 11], [-3, 0, 4, 7], [-5, -1, 2, 5], [-7, -3, 0, 4]];
      const seedN = U.hash(String(seed || 'tidalia')) % 100000;
      const rnd = (i) => U.rand(seedN + i);
      const isPerc = /percussive|organic|hypnotic/.test(tag);
      const isLofi = /lofi|tape|nostalgic/.test(tag);
      const isWide = /synthwave|minimal|cinematic|vast/.test(tag);

      const out = ctx.createGain(); out.gain.value = 0.0001;
      out.connect(this._nodes.dry); out.connect(this._nodes.wet);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
      lp.frequency.value = isLofi ? 2400 : isWide ? 6000 : 4200; lp.Q.value = 0.3;
      lp.connect(out);
      if (isLofi) {                                   // cassette wobble
        const wob = ctx.createOscillator(); wob.frequency.value = 0.7;
        const wobG = ctx.createGain(); wobG.gain.value = 120;
        wob.connect(wobG); wobG.connect(lp.frequency); wob.start();
      }

      let step = 0, stopped = false, next = ctx.currentTime + 0.08;
      const swing = isPerc ? 0.14 : isLofi ? 0.1 : 0.04;

      const voice = (freq, t, dur, type, gain, filt) => {
        const o = ctx.createOscillator(); o.type = type || 'sine'; o.frequency.value = freq;
        const g = ctx.createGain();
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filt || 3000;
        const a = Math.min(dur * 0.25, 0.5);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(gain, t + a);
        g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
        o.connect(f); f.connect(g); g.connect(lp);
        o.start(t); o.stop(t + dur + 0.05);
      };

      const schedule = () => {
        if (stopped || !this.ctx) return;
        const ahead = 0.6;
        while (next < ctx.currentTime + ahead) {
          const s = step % 16;
          const cIdx = Math.floor(step / 16) % chords.length;
          const chord = chords[cIdx];
          const sw = (s % 2 === 1) ? swing * stepDur : 0;
          const t = next + sw;
          const beatPos = s / 2;

          // bass — on the chord root, half notes
          if (s % 8 === 0) {
            const semi = chord[0] - 12;
            voice(key.root * Math.pow(2, semi / 12), t, stepDur * 7.5, 'sine', 0.3, 320);
          }
          // pad — sustained chord tones every bar
          if (s === 0) {
            chord.forEach((semi, k) => {
              voice(key.root * Math.pow(2, (semi + (k === 3 ? 12 : 0)) / 12), t, stepDur * 15, k % 2 ? 'triangle' : 'sine', 0.045, 1800);
            });
          }
          // arpeggio melody from the scale
          if (rnd(step * 3 + cIdx) > (isWide ? 0.62 : 0.52)) {
            const deg = scale[Math.floor(rnd(step * 7 + 1) * scale.length) % scale.length];
            const oct = rnd(step * 11) > 0.72 ? 2 : 1;
            const semi = chord[0] + deg + (oct - 1) * 12 + (rnd(step * 13) > 0.5 ? 0 : 12);
            voice(key.root * 2 * Math.pow(2, semi / 12), t, stepDur * (2 + rnd(step * 5) * 3), 'triangle', 0.075, 5200);
          }
          // percussion — soft kicks + dust
          if (isPerc) {
            if (s % 4 === 0) {
              const o = ctx.createOscillator(); o.type = 'sine';
              const g = ctx.createGain();
              o.frequency.setValueAtTime(120, t);
              o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
              g.gain.setValueAtTime(0.34, t);
              g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
              o.connect(g); g.connect(lp); o.start(t); o.stop(t + 0.3);
            }
            if (s % 8 === 4 || rnd(step * 17) > 0.86) {
              const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 2400 + rnd(step * 19) * 2600;
              const g = ctx.createGain();
              g.gain.setValueAtTime(0.02, t); g.gain.exponentialRampToValueAtTime(0.0004, t + 0.09);
              const hf = ctx.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 1800;
              o.connect(hf); hf.connect(g); g.connect(lp); o.start(t); o.stop(t + 0.1);
            }
          }
          next += stepDur;
          step++;
        }
        if (!stopped) timer = setTimeout(schedule, 220);
      };
      let timer = setTimeout(schedule, 0);

      out.gain.setTargetAtTime(0.55, ctx.currentTime, 1.2);
      // duck the ambient bed so the generated track sits on top of it
      if (this.on) this._nodes.master.gain.setTargetAtTime(this.volume * 0.42, ctx.currentTime, 1.2);
      const handle = {
        seed: seed, opts: opts, started: Date.now(), levelFn: null,
        stop: () => {
          stopped = true; clearTimeout(timer);
          out.gain.setTargetAtTime(0, ctx.currentTime, 0.35);
          setTimeout(() => { try { out.disconnect(); } catch (e) {} }, 1600);
        }
      };
      this._active = handle;
      return handle;
    },

    stopTrack() {
      if (this._active) {
        this._active.stop();
        this._active = null;
        if (this.on && this.ctx) this._nodes.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 1.0);
      }
    },
    activeTrack() { return this._active; },
    /** length-aware progress of the currently playing track (0..1) */
    trackProgress() {
      if (!this._active) return 0;
      const dur = (this._active.opts.dur || 180) * 1000;
      return U.clamp((Date.now() - this._active.started) / dur);
    },

    /* ------------------------------------------------------------ metering */
    update(t, dt, Scroll, Pointer) {
      if (!this.ctx) { this.level = 0; return; }
      const N = this._nodes;
      let v = 0;
      if (this.on && N && N.analyser) {
        const arr = this._bins || (this._bins = new Uint8Array(N.analyser.frequencyBinCount));
        N.analyser.getByteFrequencyData(arr);
        let sum = 0;
        const n = Math.min(64, arr.length);
        for (let i = 0; i < n; i++) sum += arr[i];
        v = sum / (n * 255);
      }
      this._smoothLevel = U.damp(this._smoothLevel, v, 6, dt);
      this.level = this._smoothLevel;
    }
  });

  T.register(A);
})();
