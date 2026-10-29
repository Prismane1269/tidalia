# qa/ — how this build was verified

`e2e-test.js` is the headless-Chrome sweep used instead of a paid AI testing service.
It drives the real site over HTTP and asserts behaviour, not just absence of errors:

1. the cinematic loader lifts (and lifts on pages with no streaming 3D scene)
2. all eight modules register and four Three.js scenes build
3. the hero headline splits into words and the gradient-clipped words stay visible
4. frame rate + draw-call budget on a software renderer (swiftshader)
5. a full-page scroll sweep with zero console/page errors
6. every story caption takes over in its own scroll window (exactly one on screen)
7. the realm carousel reports a realm with metadata; modal opens and closes on Escape
8. the ambient soundtrack starts on a user gesture with a live analyser level
9. composer: empty prompt rejected, prompt → realm routing, track renders, plays, saves
10. archive: seeds + saved tracks listed, realm filter narrows the list
11. mobile: no horizontal overflow, no runtime errors

Run it:

```bash
npm i puppeteer
node qa/e2e-test.js        # expects the site on http://127.0.0.1:8080
```
Result on the final build: **24/24 checks passed.**

The four PNGs are reference captures from that run (desktop hero, realm carousel,
composer with a generated track, mobile finale).
