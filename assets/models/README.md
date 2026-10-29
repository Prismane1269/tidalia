# assets/models

The conductor in the finale section is generated procedurally in `js/character.js`
(no `.glb` required, nothing to download).

## Swapping in your own character

1. Export your model as **GLB** (glTF binary) — most tools have this option
   (Tripo, Blender, Spline, Meshy, …). Keep it under ~5 MB and use 1K–2K textures.
2. Save it here as `assets/models/octopus.glb`.
3. Load it in `js/character.js` where the procedural model is assembled:

```js
// add near the top of the module's init()
if (T.assets) T.assets.expect('character');

const loader = new THREE.GLTFLoader();          // see note below
loader.load('assets/models/octopus.glb', (gltf) => {
  const model = gltf.scene;
  model.scale.setScalar(1);                      // match the procedural scale (~1.3 m head)
  model.position.set(0, 0, 0);
  octo.add(model);                               // `octo` is the group the camera follows
  if (T.assets) T.assets.done('character');
});
```

Note: this project vendors only the core Three.js build, so `GLTFLoader` is not included.
Grab the UMD-ish version matching your Three build and drop it in
`vendor/GLTFLoader.js`, then add `<script src="vendor/GLTFLoader.js"></script>` before
`js/character.js` in `index.html`.

4. Keep the parts of `this.update()` that make him feel alive — the blink loop, the
   audio-reactive glow (`T.audio.level`), and the cursor-following look-at all work on any
   model as long as you point them at your meshes. If your model has no eyes/tentacles,
   simply delete those blocks; the camera rig, bobbing motion and glow will still apply.

## If your model needs to be smaller

Long press / scroll on mobile will not be an issue, but do keep total GLB size low —
the whole site is ~1 MB and it is nice to keep it that way.
