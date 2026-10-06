// 3D viewer for Porch_i1: each visit's reconstruction and, as separate layers, its changed primitives.
// Nothing is fetched until the viewer scrolls into view: not this library, not the scene. Data: static/splats/{T1,T2}.splat (a reconstruction),
// {T1,T2}_change.splat (the pipeline's change layer for that visit) and {T1,T2}_changed.json (which records of the reconstruction the layer replaces).
// A .splat record is 32 bytes; its colour (RGBA) sits at byte 24.
const LIB = 'https://cdn.jsdelivr.net/npm/@mkkellogg/gaussian-splats-3d@0.4.6/build/gaussian-splats-3d.module.js';

const root = document.getElementById('splat-view');
const state = { scene: 'T1', masks: { T1: true, T2: true } };
const REC = 32, COLOR = 24;
const data = {}, urls = {};
let GS = null, viewer = null, started = false, queue = Promise.resolve();

async function load(visit) {
  if (!data[visit]) {
    const [buf, idx] = await Promise.all([
      fetch(`./static/splats/${visit}.splat`).then(r => r.arrayBuffer()),
      fetch(`./static/splats/${visit}_changed.json`).then(r => r.json()),
    ]);
    data[visit] = { bytes: new Uint8Array(buf), idx };
  }
  return data[visit];
}
const blob = bytes => URL.createObjectURL(new Blob([bytes]));

// A layer is a .splat added to the viewer once and then shown or hidden: 'T1' / 'T2' a reconstruction, 'T1h' / 'T2h' the same with its
// changed primitives taken out (so its mask replaces them), 'T1m' / 'T2m' the mask. T2's mask is repainted blue so both can show together.
async function layerUrl(key) {
  const visit = key.slice(0, 2), kind = key.slice(2);
  if (urls[key]) return urls[key];
  // The reconstruction is fetched here and handed over as an in-memory blob: GitHub Pages serves the file gzipped with the compressed
  // Content-Length, which the library takes for the file's size and then fails to load it.
  if (!kind) return (urls[key] = blob((await load(visit)).bytes));
  if (kind === 'h') {
    const { bytes, idx } = await load(visit), out = bytes.slice();
    idx.forEach(i => { out[i * REC + COLOR + 3] = 0; });
    return (urls[key] = blob(out));
  }
  const bytes = new Uint8Array(await (await fetch(`./static/splats/${visit}_change.splat`)).arrayBuffer());
  if (visit === 'T2') for (let o = COLOR; o < bytes.length; o += REC) { bytes[o] = 38; bytes[o + 1] = 140; bytes[o + 2] = 242; }
  return (urls[key] = blob(bytes));
}
// All missing layers join the viewer in ONE addSplatScenes call: this library renders nothing after a second call that adds a single scene.
// A visit is loaded with its sibling (reconstruction and holed reconstruction), so turning its mask on or off never loads anything.
const added = {};   // key -> scene index
function wantedKeys() {
  const keys = [];
  if (state.scene !== 'none') keys.push(state.scene, state.scene + 'h');
  for (const v of ['T1', 'T2']) if (state.masks[v]) keys.push(v + 'm');
  return keys;
}
const shown = () => {
  const keys = [];
  if (state.scene !== 'none') keys.push(state.scene + (state.masks[state.scene] ? 'h' : ''));
  for (const v of ['T1', 'T2']) if (state.masks[v]) keys.push(v + 'm');
  return keys;
};
// Loads whatever is missing while the current picture stays on screen, then flips visibility in one step.
let version = 0;
async function apply() {
  const mine = ++version, need = wantedKeys().filter(k => !(k in added));
  root.classList.toggle('is-busy', need.length > 0);
  if (need.length) {
    const paths = []; for (const k of need) paths.push(await layerUrl(k));
    queue = queue.then(async () => {
      const todo = need.filter(k => !(k in added)); if (!todo.length) return;
      const base = viewer.splatMesh ? viewer.splatMesh.scenes.length : 0;
      await viewer.addSplatScenes(todo.map(k => ({ path: paths[need.indexOf(k)], format: GS.SceneFormat.Splat, showLoadingUI: false, splatAlphaRemovalThreshold: 5 })), false);
      todo.forEach((k, i) => { added[k] = base + i; });
    });
    await queue;
  }
  if (mine !== version) return;
  const on = shown();
  for (const [key, i] of Object.entries(added)) viewer.splatMesh.scenes[i].visible = on.includes(key);
  viewer.splatMesh.updateTransforms();
  if (!started) { started = true; viewer.start(); }   // self-driven mode renders only after start()
  root.classList.remove('is-loading', 'is-busy');
}

// fly: W A S D or arrows move the camera and its orbit target together; Q and E go down and up
const keys = new Set(), FLY = { w: [0, 1], arrowup: [0, 1], s: [0, -1], arrowdown: [0, -1], d: [1, 0], arrowright: [1, 0], a: [-1, 0], arrowleft: [-1, 0] };
let active = false, last = 0;
function fly(now) {
  requestAnimationFrame(fly);
  const dt = Math.min((now - last) / 1000, 0.1); last = now;
  if (!viewer || !active || !keys.size) return;
  const cam = viewer.camera, tgt = viewer.controls.target, up = cam.up.clone().normalize();
  const fwd = tgt.clone().sub(cam.position), dist = fwd.length(); fwd.normalize();
  const right = fwd.clone().cross(up).normalize(), step = Math.max(dist, 0.5) * 0.9 * dt, move = fwd.clone().multiplyScalar(0);
  keys.forEach(k => { const f = FLY[k]; if (f) { move.addScaledVector(fwd, f[1]); move.addScaledVector(right, f[0]); } });
  if (keys.has('e')) move.addScaledVector(up, 1);    // `up` is the camera's up (-y in COLMAP's frame)
  if (keys.has('q')) move.addScaledVector(up, -1);
  move.multiplyScalar(step); cam.position.add(move); tgt.add(move); viewer.controls.update();
}
const setActive = on => { active = on; if (!on) keys.clear(); };
root.addEventListener('mouseenter', () => setActive(true));
root.addEventListener('mouseleave', () => { if (document.activeElement !== root) setActive(false); });
root.addEventListener('focus', () => setActive(true));
root.addEventListener('blur', () => setActive(false));
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (!active || e.metaKey || e.ctrlKey || e.altKey || !(k in FLY || k === 'q' || k === 'e')) return;
  keys.add(k); e.preventDefault();
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

async function start() {
  [GS] = await Promise.all([import(LIB)]);
  const view = await (await fetch('./static/splats/view.json')).json();
  viewer = new GS.Viewer({
    rootElement: root, cameraUp: view.up, initialCameraPosition: view.position, initialCameraLookAt: view.lookAt,
    sharedMemoryForWorkers: false, gpuAcceleratedSort: false, antialiased: false, dynamicScene: true, enableOptionalEffects: true, sceneRevealMode: GS.SceneRevealMode.Instant, selfDrivenMode: true, useBuiltInControls: true,
  });
  if (view.fov) { viewer.camera.fov = view.fov; viewer.camera.updateProjectionMatrix(); }   // a photograph's field of view
  window.gspoolViewer = viewer;
  requestAnimationFrame(fly);
  await apply();
}

document.querySelectorAll('.viewer-ui [data-scene]').forEach(btn => btn.addEventListener('click', () => {
  state.scene = btn.dataset.scene;
  document.querySelectorAll('.viewer-ui [data-scene]').forEach(b => b.classList.toggle('is-active', b === btn));
  if (viewer) apply();
}));
document.querySelectorAll('.viewer-ui [data-mask]').forEach(btn => btn.addEventListener('click', () => {
  const v = btn.dataset.mask; state.masks[v] = !state.masks[v]; btn.setAttribute('aria-pressed', state.masks[v]);
  if (viewer) apply();
}));

if (root) {
  const io = new IntersectionObserver(es => {
    if (!es.some(e => e.isIntersecting)) return;
    io.disconnect();
    start().catch(err => { console.error('viewer failed', err); root.querySelector('.viewer-hint').textContent = 'The 3D viewer could not start in this browser'; });
  }, { rootMargin: '0px' });
  io.observe(root);
}
