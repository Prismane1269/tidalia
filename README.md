# Tidalia — a cinematic 3D music studio on the web

A scroll-driven, WebGL-built website in the spirit of the "Build a Cinematic AI Website"
tutorial: one continuous 3D descent, six generative realms, live-synthesised music, and a
procedural 3D octopus who conducts the tide.

**No build step. No CDN. No audio files. No video files.**
Three.js is vendored locally, every image ships in `assets/`, and all the sound is generated
in the browser with the Web Audio API.

---

## Run it

```bash
cd tidalia
python3 -m http.server 8080      # any static server works
# open http://localhost:8080/index.html
```

Opening `index.html` straight from the filesystem mostly works, but a local server is
recommended (module-free scripts are fine, textures are happier over HTTP).

Pages:

| File | What it is |
|---|---|
| `index.html` | The journey: hero → 3D descent → manifesto → composer teaser → realms carousel → night/day reveal → the conductor → footer |
| `composer.html` | The studio console: prompt in, soundtrack out, reactive vinyl visual |
| `archive.html` | Nine reference tracks + everything you have saved locally, filterable by realm |

---

## What is actually happening (and where)

| Feature from the tutorial | How it is implemented here |
|---|---|
| One continuous cinematic video, scrubbed by scroll | `js/scene.js` — a real-time hyperlapse: 26 image planes frozen along −z, a camera that flies through them with six different motions, eased position, dissolve-in / dissolve-out per plane, then a walk through a gallery hall built of light. Scroll position **is** the timeline, so it scrubs forward and backward at any speed. |
| Video optimisation step ("too large, laggy") | Avoided at the source: no video is shipped at all. The whole journey is ~1.05 MB of JPEG plus geometry, so it stays fast on mobile and never stutters while scrubbing. |
| Scroll-controlled 3D realm carousel with depth + blur | `js/carousel.js` — six cards on a ring. Page scroll is the single source of truth (drag and arrows just scroll the page), the active card is framed by screen-space maths, neighbours fall into fog, desaturate and shrink. |
| Advanced text reveals | `js/reveals.js` — headings split into per-word masks that rise in with a stagger, plus `IntersectionObserver` reveals and a post-loader entrance for the hero. |
| Night → day hover reveal | `index.html` → `#imagination`, one CSS mask whose radial aperture follows the pointer. |
| Background audio toggle | `js/audio.js` — a generated ambient bed (two LFO-modulated noise bands + a detuned four-voice pad + scheduling shimmer). No audio file. |
| Fully animated 3D character (was a downloaded .glb) | `js/character.js` — the octopus is **built in code**: mantle, ridge, eyes with pupils/highlights and blinking, headphone band + cups, and eight tapered tentacles whose vertices carry travelling waves. Everything above reacts to the live audio analyser. |
| "Generate a soundtrack" AI flow | `js/pages.js` — a deterministic composer: the prompt picks a realm, key, tempo, texture and title, then `js/audio.js` schedules pads, sub, arpeggios and optional percussion from that seed. |
| Custom cursor and 3D hover effects | `js/cursor.js` (dot + magnetic labelled ring), `[data-tilt]` cards with pointer-tracked specular highlights. |
| AI testing pass | Verified with a headless-Chrome end-to-end sweep instead: loader gating, scroll waypoints, carousel advance, modal, audio context state, composer submit → play → save, archive filtering/playback, mobile viewports. |

### Why it is built this way

The tutorial produces its hero video with a generative video model. Since this build had to be
self-contained and performant, the "video" is replaced with a **deterministic, event-driven
scroll timeline** — which is also what a finished production site would do: identical on every
device, scrubs perfectly, weighs nothing, and can be re-timed in code.

---

## Using your own 3D character (.glb)

`js/character.js` builds the octopus procedurally, but it is written so a real model can take
over. Drop your GLB in `assets/models/` and follow `assets/models/README.md` — it walks through
loading the mesh with `GLTFLoader`, attaching it to the `octo` group the camera rig follows,
and keeping the `update()` block that drives the blink, the glow and the audio reaction.

---

## Keyboard, pointer and a11y

- `←` / `→` step through realms while the carousel is on screen
- `Esc` closes the realm modal (focus is returned to where it was)
- `⌘/Ctrl + Enter` submits the composer
- Sound starts **off** (respects autoplay policy) — the pill in the corner toggles it
- `prefers-reduced-motion` disables the grain, hover transforms and smooth scrolling
- Everything non-decorative is a real `<a>` / `<button>` with labels; canvases are `aria-hidden` or labelled

## Layout notes

All visuals are drawn from the JS modules listed above; `css/main.css` holds the whole design
system (tokens, glass cards, reveals, carousel HUD, cursor, modal, responsive rules). The
tutorial's "make sure it works on mobile" step is handled by explicit portrait branches in the
carousel camera and the character camera, plus `@media (max-height: …)` rules so hero copy and
CTAs never collide on short laptops.
