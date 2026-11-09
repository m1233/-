// Coffee kiosk walkthrough — deterministic 3D scene. Every frame is render(t).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const PORTRAIT = new URLSearchParams(location.search).has('portrait');
const W = PORTRAIT ? 1080 : 1920, H = PORTRAIT ? 1920 : 1080;
export const DURATION = 60;

// ---------------------------------------------------------------- helpers
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const smoother = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const ramp = (t, a, b) => clamp((t - a) / (b - a));
const fade = (t, a, b, c, d) => Math.min(smooth(ramp(t, a, b)), 1 - smooth(ramp(t, c, d)));

function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function texFrom(c, { repeat = [1, 1], srgb = true, wrap = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.repeat.set(...repeat); t.anisotropy = 8; return t;
}
function canvasTex(w, h, draw, opts) { const c = makeCanvas(w, h); draw(c.getContext('2d'), w, h); return texFrom(c, opts); }

// Box with UVs scaled to world size so textures keep a constant density.
function boxGeo(w, h, d, s = 1) {
  const g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / s, uv.getY(k) * dims[f][1] / s); }
  return g;
}
function mesh(parent, geo, mat, x = 0, y = 0, z = 0, cast = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m;
}
// box by min/max extents (much easier for architecture)
function blk(parent, x0, x1, y0, y1, z0, z1, mat, s = 1) {
  return mesh(parent, boxGeo(x1 - x0, y1 - y0, z1 - z0, s), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
}
function box(parent, w, h, d, mat, x, y, z, r = 0) {
  const g = r ? new RoundedBoxGeometry(w, h, d, 3, r) : boxGeo(w, h, d);
  return mesh(parent, g, mat, x, y, z);
}
function cyl(parent, rt, rb, h, mat, x, y, z, seg = 28, open = false) {
  return mesh(parent, new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), mat, x, y, z);
}
function plane(parent, w, h, mat, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; parent.add(m); return m;
}

// ---------------------------------------------------------------- textures
const FONT = 'Cairo';
function stuccoTex() {
  return canvasTex(512, 512, (g, w, h) => {
    const r = rng(7); g.fillStyle = '#cfcbc4'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26000; i++) { const v = 150 + r() * 90 | 0; g.fillStyle = `rgba(${v},${v - 3},${v - 8},${0.25 + r() * .35})`; const s = r() * 2.6 + .6; g.fillRect(r() * w, r() * h, s, s); }
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(70,66,60,${.25 + r() * .4})`; g.beginPath(); g.arc(r() * w, r() * h, r() * 1.6 + .5, 0, 7); g.fill(); }
  }, { repeat: [1.6, 1.6] });
}
function paverTex() {
  return canvasTex(1024, 1024, (g, w, h) => {
    const r = rng(3); g.fillStyle = '#4c4c4c'; g.fillRect(0, 0, w, h);
    const bw = 64, bh = 32; // 1024px = 4 m  -> 0.25 x 0.125 m blocks, herringbone-ish dog-bone
    for (let y = 0; y < h / bh; y++) for (let x = -1; x < w / bw + 1; x++) {
      const off = (y % 2) * bw / 2; const tone = r() < .45 ? 120 + r() * 18 : 165 + r() * 22;
      g.fillStyle = `rgb(${tone | 0},${tone | 0},${tone + 3 | 0})`;
      const px = x * bw + off + 2, py = y * bh + 2, pw = bw - 4, ph = bh - 4;
      g.beginPath(); g.roundRect(px, py, pw, ph, 5); g.fill();
      g.fillStyle = 'rgba(0,0,0,.13)'; g.fillRect(px + pw * .45, py, pw * .1, 3); g.fillRect(px + pw * .45, py + ph - 3, pw * .1, 3);
      for (let k = 0; k < 18; k++) { g.fillStyle = `rgba(${r() < .5 ? 0 : 255},${0},${0},0)`; }
      for (let k = 0; k < 30; k++) { const v = r() < .5 ? 0 : 255; g.fillStyle = `rgba(${v},${v},${v},.06)`; g.fillRect(px + r() * pw, py + r() * ph, 2, 2); }
    }
  }, { repeat: [25, 25] });
}
function tileTex() {
  return canvasTex(512, 512, (g, w, h) => {
    const r = rng(11); g.fillStyle = '#1d1c1b'; g.fillRect(0, 0, w, h);
    for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) {
      const base = 150 + r() * 10; g.fillStyle = `rgb(${base + 6 | 0},${base + 2 | 0},${base - 4 | 0})`; g.fillRect(tx * 256 + 2, ty * 256 + 2, 252, 252);
      for (let i = 0; i < 1600; i++) { const v = base + (r() - .5) * 40; g.fillStyle = `rgba(${v | 0},${v | 0},${v - 6 | 0},.5)`; g.fillRect(tx * 256 + 2 + r() * 250, ty * 256 + 2 + r() * 250, 3, 3); }
    }
  }, { repeat: [1 / 1.2, 1 / 1.2] });
}
function woodTex() {
  return canvasTex(512, 512, (g, w, h) => {
    const r = rng(5); g.fillStyle = '#b48a5e'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { const y = r() * h; g.strokeStyle = `rgba(${90 + r() * 40 | 0},${58 + r() * 25 | 0},${30},${.15 + r() * .3})`; g.lineWidth = .6 + r() * 2.5; g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * .01 + i) * 4 + (r() - .5) * 2); g.stroke(); }
  }, { repeat: [1.5, 1.5] });
}
function subwayTex() {
  return canvasTex(512, 512, (g, w, h) => {
    const r = rng(9); g.fillStyle = '#8b8780'; g.fillRect(0, 0, w, h);
    const bw = 128, bh = 42.67;
    for (let y = 0; y < 12; y++) for (let x = -1; x < 5; x++) {
      const v = 30 + r() * 10; g.fillStyle = `rgb(${v},${v},${v + 2})`; const px = x * bw + (y % 2) * bw / 2 + 2, py = y * bh + 2;
      g.beginPath(); g.roundRect(px, py, bw - 4, bh - 4, 3); g.fill();
      const gr = g.createLinearGradient(0, py, 0, py + bh); gr.addColorStop(0, 'rgba(255,255,255,.10)'); gr.addColorStop(.5, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(px, py, bw - 4, bh - 4);
    }
  }, { repeat: [2, 2] });
}
function stripeTex(c1, c2, n = 4, vertical = false) {
  return canvasTex(256, 256, (g, w, h) => {
    for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? c2 : c1; vertical ? g.fillRect(0, i * h / n, w, h / n) : g.fillRect(i * w / n, 0, w / n, h); }
  }, { repeat: [1, 1] });
}
function grassTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rng(21); g.fillStyle = '#4f7a35'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${40 + r() * 60 | 0},${90 + r() * 70 | 0},${25 + r() * 30 | 0},.7)`; g.fillRect(r() * w, r() * h, 1.5, 3 + r() * 3); }
  }, { repeat: [8, 8] });
}
function skyTex() {
  const c = makeCanvas(2048, 1024), g = c.getContext('2d'), r = rng(42);
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#2a64b8'); gr.addColorStop(.55, '#6f9fd8'); gr.addColorStop(.9, '#a9c6e6'); gr.addColorStop(1, '#cfdeec');
  g.fillStyle = gr; g.fillRect(0, 0, 2048, 512); g.fillStyle = '#dfe2e0'; g.fillRect(0, 512, 2048, 512);
  for (let k = 0; k < 34; k++) {
    const cx = r() * 2048, cy = 170 + r() * 300, sc = .5 + r() * 1.3;
    for (let i = 0; i < 26; i++) {
      const x = cx + (r() - .5) * 260 * sc, y = cy + (r() - .5) * 46 * sc * (cy / 400), rad = (22 + r() * 46) * sc * (cy / 420);
      const cg = g.createRadialGradient(x, y, 0, x, y, rad); cg.addColorStop(0, 'rgba(255,255,255,.55)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = cg; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
    }
  }
  const t = texFrom(c, { wrap: false }); t.mapping = THREE.EquirectangularReflectionMapping; return t;
}

// Logo: map pin with a coffee bean inside (drawn, generic)
function drawLogo(g, cx, cy, s, color = '#fff', lw = 0.07) {
  g.save(); g.translate(cx, cy); g.scale(s, s); g.strokeStyle = color; g.fillStyle = color; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.arc(0, -0.12, 0.36, Math.PI * 0.82, Math.PI * 2.18); g.quadraticCurveTo(0.17, 0.25, 0, 0.5); g.quadraticCurveTo(-0.17, 0.25, -0.33, 0.13); g.stroke();
  g.save(); g.translate(0, -0.12); g.rotate(-0.55); g.beginPath(); g.ellipse(0, 0, 0.13, 0.2, 0, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(0, -0.18); g.bezierCurveTo(0.08, -0.06, -0.08, 0.06, 0, 0.18); g.stroke(); g.restore();
  g.restore();
}
function logoDataURL(bg) {
  const c = makeCanvas(256, 256), g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill(); }
  drawLogo(g, 128, 132, 210, '#fff', 0.06); return c.toDataURL();
}
function arabicWordmark(color, w = 1024, h = 640, bg = null, stroke = null) {
  const c = makeCanvas(w, h), g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  g.fillStyle = color; g.textAlign = 'center'; g.direction = 'rtl'; g.textBaseline = 'middle';
  const fs = Math.min(h * .42, w * .3); g.font = `900 ${fs}px ${FONT}`; g.fillText('عنوان', w / 2, h * .3);
  g.font = `900 ${fs * 1.05}px ${FONT}`; g.fillText('القهوة', w / 2, h * .72);
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = 3; }
  return c;
}

// ---------------------------------------------------------------- renderer / scene
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = true;
document.getElementById('stage').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, W / H, 0.05, 600);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

await document.fonts.load(`900 80px ${FONT}`); await document.fonts.load(`700 80px ${FONT}`); await document.fonts.load(`600 80px ${FONT}`);
document.getElementById('brandLogo').src = logoDataURL('#c9975e');
document.getElementById('endLogo').src = logoDataURL('#1a1a1a');

const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), new THREE.MeshBasicMaterial({ map: skyTex(), side: THREE.BackSide, toneMapped: false, fog: false }));
sky.material.map.mapping = THREE.UVMapping; sky.rotation.y = 1.2; scene.add(sky);

const sun = new THREE.DirectionalLight(0xfff3e2, 3.2); sun.position.set(-9, 16, 12); sun.target.position.set(0, 0, 1);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 50 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.025; sun.shadow.radius = 3;
scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight(0xd6e6ff, 0xb3a58f, 0.7));

// ---------------------------------------------------------------- materials
const M = {
  stucco: new THREE.MeshStandardMaterial({ map: stuccoTex(), roughness: .95 }),
  wallIn: new THREE.MeshStandardMaterial({ color: 0xf1ede6, roughness: .9 }),
  black: new THREE.MeshStandardMaterial({ color: 0x121212, roughness: .5, metalness: .35 }),
  matteBlack: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: .8 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xd2d4d6, metalness: 1, roughness: .26 }),
  brushed: new THREE.MeshStandardMaterial({ color: 0xb9bcbf, metalness: .9, roughness: .42 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: .08 }),
  quartz: new THREE.MeshStandardMaterial({ color: 0x1c1c1d, roughness: .22, metalness: .1 }),
  oak: new THREE.MeshStandardMaterial({ map: woodTex(), roughness: .62 }),
  tile: new THREE.MeshStandardMaterial({ map: tileTex(), roughness: .35 }),
  subway: new THREE.MeshStandardMaterial({ map: subwayTex(), roughness: .25 }),
  paver: new THREE.MeshStandardMaterial({ map: paverTex(), roughness: .9 }),
  grass: new THREE.MeshStandardMaterial({ map: grassTex(), roughness: 1 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x9fb6bb, transparent: true, opacity: .16, roughness: .03, metalness: .2, depthWrite: false }),
  darkGlass: new THREE.MeshStandardMaterial({ color: 0x0b0e10, transparent: true, opacity: .62, roughness: .04, metalness: .5 }),
  clear: new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: .22, roughness: .05, depthWrite: false }),
  white: new THREE.MeshStandardMaterial({ color: 0xf6f6f4, roughness: .45 }),
  ceramic: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .18 }),
  paperCup: new THREE.MeshStandardMaterial({ color: 0xf3efe7, roughness: .7 }),
  kraft: new THREE.MeshStandardMaterial({ color: 0x9c7650, roughness: .85 }),
  beans: new THREE.MeshStandardMaterial({ color: 0x3a2214, roughness: .6 }),
  coffee: new THREE.MeshStandardMaterial({ color: 0x5a3520, roughness: .3 }),
  red: new THREE.MeshStandardMaterial({ color: 0xc0181c, roughness: .35, metalness: .2 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: .9 }),
  carWhite: new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: .25, metalness: .35 }),
  lightPanel: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e0, emissiveIntensity: 2.2 }),
  warmLed: new THREE.MeshStandardMaterial({ color: 0xffe0b0, emissive: 0xffc985, emissiveIntensity: 2.5 }),
  copper: new THREE.MeshStandardMaterial({ color: 0xc98a5e, metalness: 1, roughness: .3 }),
  curb: new THREE.MeshStandardMaterial({ map: stripeTex('#111', '#eee', 2), roughness: .7 }),
  bump: new THREE.MeshStandardMaterial({ map: stripeTex('#141414', '#e8b500', 8, true), roughness: .7 }),
};
M.curb.map.wrapS = THREE.RepeatWrapping;

function textMat(canvas, opts = {}) {
  const t = texFrom(canvas, { wrap: false });
  return new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: .4, roughness: opts.rough ?? .5, metalness: opts.metal ?? .2, ...(opts.emissive ? { emissive: 0xffffff, emissiveMap: t, emissiveIntensity: opts.emissive } : {}) });
}

// ================================================================ ARCHITECTURE
// outer footprint x[-2.5,2.5] (5 m) × z[-1.5,1.5] (3 m), wall 0.12 m, roof top 3.2 m, ceiling 2.9 m
const X0 = -2.5, X1 = 2.5, Z0 = -1.5, Z1 = 1.5, T = 0.12, HT = 3.2, CEIL = 2.9;
const xi0 = X0 + T, xi1 = X1 - T, zi0 = Z0 + T, zi1 = Z1 - T;
const kiosk = new THREE.Group(); scene.add(kiosk);
const S = M.stucco, Wi = M.wallIn;
// material arrays: [+x,-x,+y,-y,+z,-z]
const mFront = [S, S, S, S, S, Wi], mBack = [S, S, S, S, Wi, S], mLeft = [Wi, S, S, S, S, S], mRight = [S, Wi, S, S, S, S];
function wall(x0, x1, y0, y1, z0, z1, mats) { const m = blk(kiosk, x0, x1, y0, y1, z0, z1, M.stucco); m.material = mats; return m; }
// window opening on the front wall
const WX0 = 0.2, WX1 = 2.2, WY0 = 1.0, WY1 = 2.2;
wall(X0, WX0, 0, HT, Z1 - T, Z1, mFront); wall(WX1, X1, 0, HT, Z1 - T, Z1, mFront);
wall(WX0, WX1, 0, WY0, Z1 - T, Z1, mFront); wall(WX0, WX1, WY1, HT, Z1 - T, Z1, mFront);
wall(X0, X1, 0, HT, Z0, Z0 + T, mBack);
// side wall with door opening z[-0.45,0.45]
const DZ0 = -0.45, DZ1 = 0.45, DH = 2.2;
wall(X0, X0 + T, 0, HT, zi0, DZ0, mLeft); wall(X0, X0 + T, 0, HT, DZ1, zi1, mLeft); wall(X0, X0 + T, DH, HT, DZ0, DZ1, mLeft);
wall(X1 - T, X1, 0, HT, zi0, zi1, mRight);
// roof slab, ceiling, cap trim, plinth
const roof = blk(kiosk, xi0, xi1, CEIL, HT, zi0, zi1, M.stucco); roof.material = [S, S, S, Wi, S, S];
blk(kiosk, X0 - .04, X1 + .04, HT, HT + .14, Z0 - .04, Z1 + .04, M.black);
blk(kiosk, X0 - .02, X1 + .02, 0, .12, Z0 - .02, Z1 + .02, M.matteBlack);
blk(kiosk, xi0, xi1, 0, .015, zi0, zi1, M.tile, 1);
// front black cladding around the service window + dark glazing band (like the reference)
const zc = Z1 + .02;
blk(kiosk, 0.0, X1 + .03, 2.2, 2.45, Z1, zc + .02, M.black);
blk(kiosk, 0.0, WX0, .12, 2.45, Z1, zc + .02, M.black);
blk(kiosk, WX1, X1 + .03, .12, 2.45, Z1, zc + .02, M.black);
blk(kiosk, X1, X1 + .03, .12, 2.45, Z1 - 1.0, Z1, M.black);
blk(kiosk, WX0, WX1, .12, WY0 - .05, Z1, zc + .01, M.darkGlass);
blk(kiosk, WX0, WX1, WY0 - .05, WY0, Z1, Z1 + .3, M.brushed); // outside sill / hand-off ledge
// window frame + glass (fixed right pane, sliding left pane)
blk(kiosk, WX0, WX1, WY0, WY0 + .03, Z1 - T, Z1, M.black);
blk(kiosk, WX0, WX1, WY1 - .04, WY1, Z1 - T, Z1, M.black);
blk(kiosk, WX0, WX0 + .04, WY0, WY1, Z1 - T, Z1, M.black);
blk(kiosk, WX1 - .04, WX1, WY0, WY1, Z1 - T, Z1, M.black);
const fixedPane = new THREE.Group(); kiosk.add(fixedPane);
blk(fixedPane, 1.2, WX1 - .04, WY0 + .03, WY1 - .04, Z1 - .045, Z1 - .035, M.glass);
blk(fixedPane, 1.18, 1.22, WY0 + .03, WY1 - .04, Z1 - .06, Z1 - .02, M.black);
const slidePane = new THREE.Group(); kiosk.add(slidePane);
blk(slidePane, WX0 + .04, 1.22, WY0 + .03, WY1 - .04, Z1 - .085, Z1 - .075, M.glass);
blk(slidePane, WX0 + .04, WX0 + .08, WY0 + .03, WY1 - .04, Z1 - .1, Z1 - .06, M.black);
blk(slidePane, 1.18, 1.22, WY0 + .03, WY1 - .04, Z1 - .1, Z1 - .06, M.black);
blk(slidePane, WX0 + .1, WX0 + .13, 1.45, 1.75, Z1 - .13, Z1 - .1, M.steel); // handle
// door (hinge on outer face at z = DZ0, opens outward)
const door = new THREE.Group(); door.position.set(X0 - .01, 0, DZ0); kiosk.add(door);
{ const d = blk(door, -0.05, 0, 0.0, DH - .01, 0.01, 0.89, M.black);
  blk(door, -0.06, -0.05, .12, DH - .14, .14, .76, M.brushed).material = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: .35, metalness: .6 });
  blk(door, -0.11, -0.05, 1.0, 1.04, .74, .8, M.steel); blk(door, -0.11, -0.08, .65, 1.4, .76, .79, M.steel);   // outer pull bar
  blk(door, 0, 0.06, 1.02, 1.05, .2, .8, M.steel);                                                           // inner push bar
  blk(door, -0.055, -0.05, 1.55, 1.95, .3, .6, M.white); }
blk(kiosk, X0 - .03, X0, 0, DH + .03, DZ0 - .04, DZ0, M.black); blk(kiosk, X0 - .03, X0, 0, DH + .03, DZ1, DZ1 + .04, M.black); blk(kiosk, X0 - .03, X0, DH, DH + .04, DZ0 - .04, DZ1 + .04, M.black);
blk(kiosk, X0 - .9, X0, 0, .14, -.6, .6, M.matteBlack); // step

// exterior signage
function wordPlane(parent, w, h, x, y, z, ry, color = '#121212', opts = {}) {
  const p = plane(parent, w, h, textMat(arabicWordmark(color), opts), x, y, z, ry); p.material.polygonOffset = true; p.material.polygonOffsetFactor = -2; return p;
}
function logoPlane(parent, s, x, y, z, ry, color = '#121212') {
  const c = makeCanvas(512, 512); drawLogo(c.getContext('2d'), 256, 270, 440, color, .075);
  const p = plane(parent, s, s, textMat(c), x, y, z, ry); p.material.polygonOffset = true; p.material.polygonOffsetFactor = -2; return p;
}
wordPlane(kiosk, 1.55, .97, -1.35, 2.15, Z1 + .012, 0);
logoPlane(kiosk, .8, -.25, 2.3, Z1 + .012, 0);
wordPlane(kiosk, 1.3, .81, X0 - .012, 2.72, 0, -Math.PI / 2);
wordPlane(kiosk, 1.4, .87, X1 + .035, 2.1, .1, Math.PI / 2);
logoPlane(kiosk, .7, X1 + .035, 2.2, -.95, Math.PI / 2);
wordPlane(kiosk, 1.6, 1.0, 0, 2.15, Z0 - .012, Math.PI);
// rooftop pylon sign
{ const g = new THREE.Group(); g.position.set(-1.3, HT + .14, -0.2); kiosk.add(g);
  box(g, .14, 1.0, .14, M.black, 0, .5, 0);
  const dr = makeCanvas(512, 128), dg = dr.getContext('2d'); dg.fillStyle = '#121212'; dg.fillRect(0, 0, 512, 128); dg.fillStyle = '#fff'; dg.font = `700 54px ${FONT}`; dg.textBaseline = 'middle'; dg.fillText('DRIVE THRU  »', 40, 66);
  const dm = new THREE.MeshStandardMaterial({ map: texFrom(dr, { wrap: false }), roughness: .4, emissive: 0xffffff, emissiveMap: texFrom(dr, { wrap: false }), emissiveIntensity: .35 });
  box(g, 1.0, .26, .12, [M.black, M.black, M.black, M.black, dm, dm], 0, .42, 0);
  const pw = arabicWordmark('#ffffff', 512, 640, '#121212');
  const pm = new THREE.MeshStandardMaterial({ map: texFrom(pw, { wrap: false }), roughness: .4, emissive: 0xffffff, emissiveMap: texFrom(pw, { wrap: false }), emissiveIntensity: .3 });
  box(g, .8, 1.0, .16, [M.black, M.black, M.black, M.black, pm, pm], 0, 1.1, 0);
  box(g, .1, .25, .1, M.black, 0, 1.72, 0);
  const lc = makeCanvas(512, 512), lg = lc.getContext('2d'); lg.fillStyle = '#121212'; lg.fillRect(0, 0, 512, 512); lg.strokeStyle = '#555'; lg.lineWidth = 14; lg.beginPath(); lg.arc(256, 256, 240, 0, 7); lg.stroke(); drawLogo(lg, 256, 268, 360, '#fff', .07);
  const lm = new THREE.MeshStandardMaterial({ map: texFrom(lc, { wrap: false }), roughness: .35, metalness: .2, emissive: 0xffffff, emissiveMap: texFrom(lc, { wrap: false }), emissiveIntensity: .3 });
  const disc = mesh(g, new THREE.CylinderGeometry(.58, .58, .2, 64), [M.black, lm, lm], 0, 2.4, 0); disc.rotation.x = Math.PI / 2; disc.rotation.y = 0;
  // cylinder caps face ±y; rotate so caps face ±z
}

// ================================================================ SITE
const site = new THREE.Group(); scene.add(site);
{ const gnd = mesh(site, new THREE.PlaneGeometry(200, 200), M.paver, 0, 0, 0, false); gnd.rotation.x = -Math.PI / 2;
  // grass island & curbs (curbs alternate black / white every 0.5 m)
  const curbMat = (len) => { const m = M.curb.clone(); m.map = M.curb.map.clone(); m.map.needsUpdate = true; m.map.repeat.set(1, 1); return m; };
  function curb(x0, x1, z0, z1) { const len = Math.max(x1 - x0, z1 - z0); const m = blk(site, x0, x1, 0, .16, z0, z1, M.white); const cm = curbMat(len);
    if (x1 - x0 > z1 - z0) m.material = [M.matteBlack, M.matteBlack, cm, cm, cm, cm]; else { const c2 = cm.clone(); c2.map = cm.map.clone(); c2.map.needsUpdate = true; c2.map.rotation = 0; m.material = [cm, cm, cm, cm, M.matteBlack, M.matteBlack]; }
    return m; }
  curb(-12, 9, 1.86, 2.0);       // inner lane curb (building side)
  curb(-12, 9, 4.9, 5.04);       // outer lane curb
  blk(site, -12, X0 - .9, 0, .14, -4, 1.86, M.grass, 1);
  blk(site, X1, 9, 0, .14, -4, 1.86, M.grass, 1);
  blk(site, X0, X1, 0, .02, Z1, 1.86, M.paver, 4);
  curb(-12, 9, -4.14, -4);
  blk(site, -12, 9, 0, .14, 5.04, 7.5, M.grass, 1);
  // speed bump across lane
  const b = blk(site, -3.4, -3.05, 0, .06, 2.0, 4.9, M.bump); b.material.map.repeat.set(1, 4);
  // small palms / shrubs on the island
  const leaf = new THREE.MeshStandardMaterial({ color: 0x3f6b2a, roughness: .8 });
  for (const [x, z, s] of [[-9, 0, 1.1], [-6.5, -2.5, .8], [6.5, -1.5, 1.0], [8, 1, .7], [-10.5, 6.3, .9], [3, 6.3, .8]]) {
    cyl(site, .12 * s, .16 * s, 2.6 * s, M.kraft, x, 1.3 * s, z);
    for (let i = 0; i < 7; i++) { const l = mesh(site, new THREE.SphereGeometry(.9 * s, 10, 6), leaf, x + Math.cos(i) * .55 * s, 2.7 * s + (i % 2) * .15, z + Math.sin(i) * .55 * s); l.scale.set(1, .32, .5); l.rotation.y = i; }
  }
  // distant buildings & street lights
  const bm = M.stucco.clone(); bm.color = new THREE.Color(0xf4eee4);
  for (const [x, z, w, h, d] of [[-30, -25, 18, 9, 10], [-6, -30, 14, 7, 9], [14, -28, 20, 12, 10], [36, -10, 10, 8, 18], [-38, 8, 10, 10, 16], [10, 30, 26, 8, 8], [-20, 32, 16, 11, 8]]) blk(site, x - w / 2, x + w / 2, 0, h, z - d / 2, z + d / 2, bm, 3);
  for (const x of [-10, 2, 14]) { cyl(site, .07, .1, 7, M.brushed, x, 3.5, 7.2); box(site, 1.4, .08, .25, M.brushed, x - .6, 7, 7.2); }
}
// "ORDER HERE" menu board
{ const g = new THREE.Group(); g.position.set(-5.4, 0, 1.25); g.rotation.y = -0.5; site.add(g);
  box(g, .12, .9, .12, M.black, -.8, .45, 0); box(g, .12, .9, .12, M.black, .8, .45, 0);
  box(g, 2.3, 1.55, .22, M.black, 0, 1.62, 0, .02);
  const hc = makeCanvas(1024, 128), hg = hc.getContext('2d'); hg.fillStyle = '#121212'; hg.fillRect(0, 0, 1024, 128);
  hg.fillStyle = '#fff'; hg.font = `700 64px ${FONT}`; hg.textBaseline = 'middle'; hg.fillText('Order Here', 40, 66);
  hg.textAlign = 'right'; hg.direction = 'rtl'; hg.fillText('اطلب هنا', 984, 62); drawLogo(hg, 600, 66, 110, '#fff', .08);
  plane(g, 2.2, .275, new THREE.MeshStandardMaterial({ map: texFrom(hc, { wrap: false }), roughness: .4 }), 0, 2.22, .112);
  const items = [['سبانش لاتيه', '18'], ['كراميل ماكياتو', '19'], ['فلات وايت', '16'], ['كورتادو', '14'], ['أمريكانو', '12'], ['قهوة اليوم', '10']];
  const items2 = [['لاتيه مثلج', '17'], ['كولد برو', '18'], ['موكا مثلجة', '19'], ['ماتشا لاتيه', '20'], ['كرواسون', '9'], ['كوكيز', '7']];
  [[items, 'ساخن · HOT', -.53], [items2, 'بارد · ICED', .53]].forEach(([list, head, x]) => {
    const c = makeCanvas(512, 512), q = c.getContext('2d'); const gr = q.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#fbf6ee'); gr.addColorStop(1, '#efe5d6'); q.fillStyle = gr; q.fillRect(0, 0, 512, 512);
    q.direction = 'rtl'; q.textAlign = 'center'; q.fillStyle = '#1a1a1a'; q.font = `800 46px ${FONT}`; q.fillText(head, 256, 64);
    q.fillStyle = '#c9975e'; q.fillRect(176, 84, 160, 5);
    list.forEach(([n, p], i) => { const y = 150 + i * 60; q.fillStyle = '#1a1a1a'; q.textAlign = 'right'; q.font = `700 36px ${FONT}`; q.fillText(n, 470, y); q.textAlign = 'left'; q.font = `800 36px ${FONT}`; q.fillStyle = '#8a5a2b'; q.fillText(p + ' ر.س', 40, y); });
    const t = texFrom(c, { wrap: false });
    plane(g, 1.0, 1.0, new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .9, roughness: .3 }), x, 1.48, .112);
  });
}

// ================================================================ INTERIOR
const inside = new THREE.Group(); scene.add(inside);
const CT = 0.9; // counter height
// back counter z[zi0, -0.76], x[xi0, 1.66]
const BZ0 = zi0, BZ1 = -0.76, BX1 = 1.66;
blk(inside, xi0, BX1, .0, .1, BZ0, BZ1 - .05, M.matteBlack);
blk(inside, xi0, BX1, .1, CT - .04, BZ0, BZ1 - .02, M.oak, 1);
blk(inside, xi0, BX1, CT - .04, CT, BZ0, BZ1 + .02, M.quartz);
blk(inside, xi0, BX1, CT, 1.55, zi0, zi0 + .015, M.subway, 1);
// front counter z[0.76, zi1], x[-1.95, xi1]
const FZ0 = 0.76, FX0 = -1.95;
blk(inside, FX0, xi1, 0, .1, FZ0 + .05, zi1, M.matteBlack);
blk(inside, FX0, xi1, .1, CT - .04, FZ0 + .02, zi1, M.oak, 1);
blk(inside, FX0, xi1, CT - .04, CT, FZ0 - .02, zi1, M.quartz);
// cabinet door seams + handles
function fronts(x0, x1, zFace, dir, n, steel = false) {
  const w = (x1 - x0) / n;
  for (let i = 0; i < n; i++) { const a = x0 + i * w + .006, b = a + w - .012;
    if (steel) blk(inside, a, b, .12, CT - .06, zFace + dir * .0, zFace + dir * .012, M.brushed);
    else blk(inside, a + w / 2 - .003, a + w / 2 + .003, .12, CT - .06, zFace, zFace + dir * .004, M.matteBlack);
    blk(inside, a + .06, b - .06, CT - .13, CT - .11, zFace + dir * .01, zFace + dir * .035, M.steel); }
}
fronts(-1.7, .55, BZ1 - .02, 1, 3, true);   // under-counter fridges
fronts(.55, BX1, BZ1 - .02, 1, 2);
fronts(-.3, 1.0, FZ0 + .02, -1, 2);
// ice machine (under counter, left)
{ blk(inside, xi0 + .02, -1.72, .1, CT - .06, BZ1 - .02, BZ1 + .005, M.brushed);
  for (let i = 0; i < 6; i++) blk(inside, xi0 + .08, -1.78, .16 + i * .03, .175 + i * .03, BZ1, BZ1 + .015, M.matteBlack);
  blk(inside, xi0 + .1, -1.8, CT - .16, CT - .12, BZ1, BZ1 + .04, M.steel); }

// --- equipment builders (origin = counter top, front facing +z)
function espressoMachine() {
  const g = new THREE.Group();
  box(g, .86, .44, .56, M.steel, 0, .28, 0, .03);
  box(g, .02, .46, .58, M.black, -.44, .28, 0); box(g, .02, .46, .58, M.black, .44, .28, 0);
  box(g, .8, .14, .02, M.black, 0, .42, .285);
  box(g, .2, .06, .01, new THREE.MeshStandardMaterial({ color: 0x0b1620, emissive: 0x5ab0ff, emissiveIntensity: .8 }), 0, .43, .297);
  box(g, .8, .02, .5, M.brushed, 0, .51, 0);
  for (let i = 0; i < 8; i++) { cyl(g, .035, .027, .055, M.ceramic, -.33 + (i % 4) * .1, .55, -.12 + (i >> 2) * .13); }
  for (const gx of [-.2, .2]) {
    cyl(g, .055, .055, .06, M.chrome, gx, .24, .3);
    cyl(g, .047, .04, .035, M.chrome, gx, .195, .31);
    const h = box(g, .032, .032, .17, M.black, gx, .19, .43, .012); h.rotation.x = -.2;
    for (const dx of [-.04, .04]) cyl(g, .028, .022, .05, M.ceramic, gx + dx, .1, .32);
  }
  box(g, .8, .025, .2, M.chrome, 0, .07, .33);
  for (const sx of [-.39, .39]) { const w = cyl(g, .008, .008, .26, M.chrome, sx, .2, .33, 10); w.rotation.z = sx > 0 ? -.22 : .22; cyl(g, .018, .018, .05, M.black, sx * .98, .34, .32, 12); }
  return g;
}
function grinder() {
  const g = new THREE.Group();
  box(g, .2, .1, .3, M.black, 0, .05, 0, .015);
  box(g, .18, .32, .2, M.matteBlack, 0, .26, -.04, .03);
  box(g, .06, .05, .06, M.black, 0, .25, .08, .01);
  cyl(g, .045, .045, .015, M.black, 0, .11, .07);
  cyl(g, .1, .055, .22, M.clear, 0, .53, -.04, 28, true);
  cyl(g, .085, .056, .12, M.beans, 0, .48, -.04);
  cyl(g, .104, .104, .02, M.black, 0, .65, -.04);
  return g;
}
function blender() {
  const g = new THREE.Group(); box(g, .17, .18, .19, M.black, 0, .09, 0, .02);
  box(g, .06, .03, .01, new THREE.MeshStandardMaterial({ color: 0x111, emissive: 0x44ff99, emissiveIntensity: .6 }), 0, .1, .1);
  cyl(g, .08, .06, .26, M.clear, 0, .32, 0); cyl(g, .082, .082, .03, M.black, 0, .465, 0); return g;
}
function cupStack(r, h, n, mat = M.paperCup) { const g = new THREE.Group(); cyl(g, r, r * .72, h + n * .012, mat, 0, (h + n * .012) / 2, 0); cyl(g, r + .003, r + .003, .008, mat, 0, h + n * .012, 0); return g; }
function bottle(color, h = .3) { const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color, roughness: .15, transparent: true, opacity: .85 });
  cyl(g, .035, .035, h * .7, m, 0, h * .35, 0); cyl(g, .015, .035, h * .15, m, 0, h * .77, 0); cyl(g, .012, .012, h * .14, M.black, 0, h * .9, 0); box(g, .05, .012, .012, M.black, .02, h * .97, 0); return g; }
function coffeeBag(color = 0x9c7650) { const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color, roughness: .8 });
  box(g, .16, .24, .09, m, 0, .12, 0, .015); box(g, .1, .08, .002, M.white, 0, .13, .046); return g; }
function put(obj, x, y, z, ry = 0) { obj.position.set(x, y, z); obj.rotation.y = ry; obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); inside.add(obj); return obj; }

// back counter equipment (front of back counter faces +z)
put(blender(), -2.12, CT, -1.08); put(blender(), -1.9, CT, -1.08);
put(grinder(), -1.45, CT, -1.07); put(grinder(), -1.15, CT, -1.07);
put(espressoMachine(), -.35, CT, -1.07);
{ box(inside, .22, .1, .2, M.black, .3, CT + .05, -1.0, .01); // knock box
  for (const [x, z] of [[.48, -.92], [.56, -1.0]]) { cyl(inside, .045, .05, .12, M.steel, x, CT + .06, z); }
  box(inside, .3, .01, .2, M.rubber, .32, CT + .005, -1.22); cyl(inside, .03, .03, .08, M.steel, .3, CT + .05, -1.2); cyl(inside, .045, .045, .01, M.steel, .3, CT + .09, -1.2); }
// pour-over + batch brewer
{ const bb = new THREE.Group(); box(bb, .24, .5, .34, M.black, 0, .25, 0, .02); box(bb, .2, .06, .26, M.brushed, 0, .44, .03);
  cyl(bb, .07, .07, .2, M.clear, 0, .13, .1); cyl(bb, .072, .072, .03, M.black, 0, .245, .1); cyl(bb, .06, .065, .1, M.coffee, 0, .08, .1); put(bb, .78, CT, -1.13);
  box(inside, .16, .03, .16, M.black, 1.06, CT + .015, -1.0, .01);
  cyl(inside, .06, .045, .04, M.ceramic, 1.06, CT + .11, -1.0); cyl(inside, .075, .03, .08, M.ceramic, 1.06, CT + .17, -1.0);
  cyl(inside, .05, .06, .1, M.clear, 1.06, CT + .08, -1.0);
  const k = cyl(inside, .055, .065, .15, M.black, 1.18, CT + .075, -1.22); const sp = cyl(inside, .006, .008, .22, M.black, 1.24, CT + .17, -1.17, 8); sp.rotation.z = -.8; sp.rotation.x = .4; }
// sink
{ blk(inside, 1.15, 1.6, CT - .002, CT + .002, -1.32, -.84, M.brushed); blk(inside, 1.19, 1.56, CT - .001, CT + .004, -1.28, -.88, new THREE.MeshStandardMaterial({ color: 0x555, metalness: 1, roughness: .35 }));
  cyl(inside, .015, .015, .32, M.chrome, 1.38, CT + .16, -1.3, 12);
  const sp = mesh(inside, new THREE.TorusGeometry(.1, .013, 10, 24, Math.PI), M.chrome, 1.38, CT + .32, -1.2); sp.rotation.y = Math.PI / 2;
  box(inside, .05, .02, .02, M.chrome, 1.38, CT + .3, -1.32); }
// shelves + backsplash items above back counter
{ for (const y of [1.68, 2.05]) { blk(inside, xi0 + .05, .3, y, y + .035, zi0, zi0 + .28, M.oak, 1); }
  const syr = [0xb35a1f, 0x6b2b14, 0xd9a441, 0xe8e0c9, 0x3c1d10, 0xa31f34, 0xc98a5e];
  syr.forEach((c, i) => put(bottle(c, .3), -2.2 + i * .12, 1.715, -1.24));
  for (let i = 0; i < 6; i++) { const m = cyl(inside, .045, .04, .095, M.ceramic, -1.25 + i * .12, 1.715 + .048, -1.24); const hd = mesh(inside, new THREE.TorusGeometry(.028, .007, 6, 12), M.ceramic, -1.25 + i * .12 + .05, 1.765, -1.24); }
  for (let i = 0; i < 4; i++) { const s = cyl(inside, .055, .05, .05, M.ceramic, -.55 + i * .13, 1.74, -1.24); }
  for (let i = 0; i < 6; i++) put(coffeeBag([0x9c7650, 0x2e2e2e, 0x9c7650, 0xc9975e, 0x2e2e2e, 0x9c7650][i]), -2.15 + i * .2, 2.085, -1.22);
  for (let i = 0; i < 5; i++) put(cupStack(.045, .1, 10, M.ceramic), -.85 + i * .22, 2.085, -1.22);
  // backlit wordmark sign above machine
  blk(inside, -.95, .25, 2.28, 2.72, zi0, zi0 + .04, M.black);
  const sm = textMat(arabicWordmark('#f3dfc0', 1024, 400), { emissive: 1.6 }); plane(inside, 1.0, .39, sm, -.38, 2.5, zi0 + .045);
  logoPlane(inside, .34, .07, 2.5, zi0 + .045, 0, '#f3dfc0').material.emissive = new THREE.Color(0xf3dfc0);
}
// KDS / order display screen on back wall
const kds = { c: makeCanvas(768, 432) }; kds.t = texFrom(kds.c, { wrap: false });
{ blk(inside, .62, 1.42, 1.6, 2.06, zi0, zi0 + .04, M.black);
  plane(inside, .76, .42, new THREE.MeshBasicMaterial({ map: kds.t, toneMapped: false }), 1.02, 1.83, zi0 + .042); }
// display fridge (back-right corner)
{ const fx0 = 1.68, fx1 = xi1, fz0 = zi0, fz1 = -.7;
  blk(inside, fx0, fx1, 0, 2.05, fz0, fz0 + .04, M.brushed); blk(inside, fx0, fx0 + .04, 0, 2.05, fz0, fz1 - .04, M.brushed); blk(inside, fx1 - .04, fx1, 0, 2.05, fz0, fz1 - .04, M.brushed);
  blk(inside, fx0, fx1, 2.0, 2.05, fz0, fz1 - .04, M.brushed); blk(inside, fx0, fx1, 0, .12, fz0, fz1 - .04, M.brushed);
  const inner = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xe6f2ff, emissiveIntensity: .7, roughness: .5 });
  blk(inside, fx0 + .04, fx1 - .04, .12, 1.95, fz0 + .04, fz0 + .05, inner);
  for (let i = 0; i < 4; i++) { const y = .3 + i * .42; blk(inside, fx0 + .04, fx1 - .04, y, y + .015, fz0 + .05, fz1 - .06, M.clear);
    for (let k = 0; k < 4; k++) { const x = fx0 + .12 + k * .15;
      if (i % 2) cyl(inside, .032, .032, .2, new THREE.MeshStandardMaterial({ color: 0x9fd3ff, transparent: true, opacity: .75, roughness: .1 }), x, y + .115, fz1 - .2);
      else { box(inside, .1, .24, .08, M.white, x, y + .135, fz1 - .2); box(inside, .1, .06, .081, new THREE.MeshStandardMaterial({ color: [0x2e6bd9, 0xd94a2e, 0x2e6bd9, 0x2ea86b][k] }), x, y + .1, fz1 - .2); } } }
  blk(inside, fx0, fx1, 0, 2.05, fz1 - .04, fz1 - .02, M.glass);
  blk(inside, fx0, fx0 + .04, 0, 2.05, fz1 - .04, fz1, M.black); blk(inside, fx1 - .04, fx1, 0, 2.05, fz1 - .04, fz1, M.black);
  blk(inside, fx0, fx1, 1.9, 2.05, fz1 - .04, fz1, M.black); blk(inside, fx0, fx1, 0, .12, fz1 - .04, fz1, M.black);
  blk(inside, fx0 + .07, fx0 + .1, .6, 1.5, fz1, fz1 + .03, M.steel);
  const fl = new THREE.PointLight(0xe6f2ff, .5, 1.5, 2); fl.position.set(2.0, 1.1, -1.0); inside.add(fl); }
// end-wall storage shelving with beans & stock
{ const sx0 = xi1 - .36, sx1 = xi1;
  for (const z of [0, .72]) blk(inside, sx0, sx1, 0, 2.2, z - .02, z + .02, M.black);
  [.12, .55, 1.0, 1.45, 1.9].forEach((y, i) => { blk(inside, sx0, sx1, y, y + .025, 0, .72, M.oak, 1);
    for (let k = 0; k < 3; k++) { const z = .14 + k * .22;
      if (i === 0) box(inside, .3, .28, .18, M.kraft, sx0 + .17, y + .165, z);
      else if (i === 4) put(cupStack(.05, .12, 20), sx0 + .17, y + .025, z);
      else { const b = put(coffeeBag([0x9c7650, 0x2e2e2e, 0xc9975e][(k + i) % 3]), sx0 + .17, y + .025, z, -Math.PI / 2); } } }); }
// front counter equipment (front of front counter faces -z, toward the aisle)
{ // cup station
  [[.05, .14], [.045, .12], [.04, .1]].forEach(([r, h], i) => put(cupStack(r, h, 30), -1.78 + i * .13, CT, 1.05));
  for (let i = 0; i < 3; i++) put(cupStack(.05, .02, 40, M.black), -1.78 + i * .13, CT, 1.25);
  cyl(inside, .05, .05, .2, M.steel, -1.36, CT + .1, 1.2); for (let i = 0; i < 9; i++) { const s = cyl(inside, .003, .003, .22, M.black, -1.38 + (i % 3) * .02, CT + .22, 1.18 + (i / 3 | 0) * .02, 6); }
  // syrup pump station
  ['#b35a1f', '#6b2b14', '#d9a441', '#e8e0c9'].forEach((c, i) => put(bottle(c, .34), -1.15 + i * .1, CT, 1.12));
  // pastry display case
  const pc = new THREE.Group(); box(pc, .72, .06, .44, M.black, 0, .03, 0); box(pc, .72, .02, .44, M.black, 0, .44, 0);
  box(pc, .72, .36, .005, M.clear, 0, .24, -.22); box(pc, .005, .36, .44, M.clear, -.36, .24, 0); box(pc, .005, .36, .44, M.clear, .36, .24, 0);
  box(pc, .7, .01, .4, M.clear, 0, .22, 0);
  const crois = new THREE.MeshStandardMaterial({ color: 0xc9802f, roughness: .55 }), cookie = new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: .8 });
  for (let i = 0; i < 4; i++) { const c = mesh(pc, new THREE.TorusGeometry(.04, .025, 8, 14, Math.PI * 1.2), crois, -.25 + i * .16, .085, -.05); c.rotation.x = -Math.PI / 2; }
  for (let i = 0; i < 5; i++) cyl(pc, .04, .04, .015, cookie, -.26 + i * .13, .24, .02, 16);
  for (let i = 0; i < 3; i++) box(pc, .1, .06, .08, new THREE.MeshStandardMaterial({ color: [0x6b3a1f, 0xe9dcc4, 0x3c1d10][i], roughness: .6 }), -.18 + i * .18, .26, .12);
  const pl = new THREE.PointLight(0xffd9a0, .25, .7, 2); pl.position.set(0, .38, 0); pc.add(pl);
  put(pc, -.42, CT, 1.08);
  // POS tablet (faces the barista, -z) + receipt printer, card terminal on the sill
  box(inside, .1, .02, .1, M.black, .55, CT + .01, 1.12); cyl(inside, .015, .015, .2, M.black, .55, CT + .11, 1.12, 10);
  const posG = new THREE.Group(); posG.position.set(.55, CT + .27, 1.1); posG.rotation.set(-.35, Math.PI, 0); inside.add(posG);
  box(posG, .32, .22, .02, M.black, 0, 0, 0, .008);
  box(inside, .16, .12, .2, M.matteBlack, .9, CT + .06, 1.15, .015);
  const ct = box(inside, .08, .02, .16, M.black, 1.75, CT + .11, 1.22, .01); ct.rotation.x = .3;
  window.__posG = posG;
  // window hand-off tray with 2 drinks (animated)
}
const pos = { c: makeCanvas(640, 440) }; pos.t = texFrom(pos.c, { wrap: false });
{ const p = new THREE.Mesh(new THREE.PlaneGeometry(.3, .2), new THREE.MeshBasicMaterial({ map: pos.t, toneMapped: false })); p.position.set(0, 0, .0115); window.__posG.add(p); }
const tray = new THREE.Group(); inside.add(tray);
{ box(tray, .34, .02, .22, M.black, 0, .01, 0, .006);
  for (const [x, ice] of [[-.08, false], [.08, true]]) {
    const cupM = ice ? new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: .45, roughness: .05 }) : M.paperCup;
    cyl(tray, .045, .033, .15, cupM, x, .095, 0);
    if (ice) { cyl(tray, .04, .031, .1, new THREE.MeshStandardMaterial({ color: 0x6b3a1f, roughness: .3 }), x, .07, 0); cyl(tray, .046, .046, .012, M.clear, x, .175, 0); const s = cyl(tray, .004, .004, .14, M.black, x + .01, .23, 0, 6); s.rotation.z = .15; }
    else { cyl(tray, .047, .047, .02, M.white, x, .18, 0); cyl(tray, .046, .045, .05, M.kraft, x, .11, 0); }
    const lab = cyl(tray, .0455, .0405, .03, M.black, x, .12, 0);
  }
}
// ceiling LED panels + point lights
for (const x of [-1.25, 1.15]) { blk(inside, x - .6, x + .6, CEIL - .02, CEIL, -.3, .3, M.lightPanel); const l = new THREE.PointLight(0xfff1dc, 3.4, 7, 1.6); l.position.set(x, CEIL - .15, 0); inside.add(l); }
blk(inside, xi0 + .1, BX1, CEIL - .02, CEIL, -1.0, -.97, M.warmLed);
const winLight = new THREE.PointLight(0xfff1dc, 1.2, 3, 2); winLight.position.set(1.2, 2.5, .95); inside.add(winLight);
// split AC, fire extinguisher, first-aid, bin, clock
{ box(inside, .95, .3, .22, M.white, -1.0, 2.55, zi1 - .11, .04); blk(inside, -1.45, -.55, 2.42, 2.44, zi1 - .22, zi1 - .2, M.white);
  box(inside, .08, .02, .01, new THREE.MeshStandardMaterial({ color: 0x111, emissive: 0x40c4ff, emissiveIntensity: 1 }), -.7, 2.5, zi1 - .222);
  const fe = new THREE.Group(); cyl(fe, .075, .075, .45, M.red, 0, .25, 0); cyl(fe, .03, .03, .05, M.black, 0, .5, 0); box(fe, .1, .02, .03, M.black, .03, .53, 0);
  const hose = cyl(fe, .01, .01, .3, M.black, .07, .35, 0, 6); hose.rotation.z = .15; put(fe, xi0 + .1, .5, .95);
  box(inside, .02, .26, .18, M.white, xi0 + .01, 1.35, .95);
  const fc = makeCanvas(128, 128), fg = fc.getContext('2d'); fg.fillStyle = '#c0181c'; fg.fillRect(0, 0, 128, 128); fg.fillStyle = '#fff'; fg.font = `800 22px ${FONT}`; fg.textAlign = 'center'; fg.fillText('طفاية', 64, 60); fg.fillText('حريق', 64, 92);
  plane(inside, .18, .18, new THREE.MeshStandardMaterial({ map: texFrom(fc, { wrap: false }) }), xi0 + .022, 1.35, .95, Math.PI / 2);
  const fa = makeCanvas(128, 128), fag = fa.getContext('2d'); fag.fillStyle = '#fff'; fag.fillRect(0, 0, 128, 128); fag.fillStyle = '#1a9b4a'; fag.fillRect(50, 24, 28, 80); fag.fillRect(24, 50, 80, 28);
  box(inside, .08, .3, .3, M.white, xi0 + .04, 1.55, -1.0); plane(inside, .28, .28, new THREE.MeshStandardMaterial({ map: texFrom(fa, { wrap: false }) }), xi0 + .081, 1.55, -1.0, Math.PI / 2);
  cyl(inside, .16, .15, .55, M.brushed, -2.17, .275, 1.12); cyl(inside, .165, .165, .02, M.black, -2.17, .555, 1.12);
  // wall clock on right wall above shelves
  const cc = makeCanvas(256, 256), cg = cc.getContext('2d'); cg.fillStyle = '#121212'; cg.beginPath(); cg.arc(128, 128, 126, 0, 7); cg.fill(); cg.strokeStyle = '#fff'; cg.lineWidth = 6;
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; cg.beginPath(); cg.moveTo(128 + Math.cos(a) * 100, 128 + Math.sin(a) * 100); cg.lineTo(128 + Math.cos(a) * 115, 128 + Math.sin(a) * 115); cg.stroke(); }
  cg.lineWidth = 8; cg.beginPath(); cg.moveTo(128, 128); cg.lineTo(128, 60); cg.stroke(); cg.beginPath(); cg.moveTo(128, 128); cg.lineTo(175, 150); cg.stroke();
  plane(inside, .32, .32, new THREE.MeshStandardMaterial({ map: texFrom(cc, { wrap: false }), transparent: true, alphaTest: .5 }), xi1 - .01, 2.5, .05, -Math.PI / 2);
  // floor mat in the aisle
  blk(inside, -1.6, 1.4, .015, .025, -.5, .5, M.rubber); }

// ================================================================ CAR
const car = new THREE.Group(); scene.add(car);
{ box(car, 4.5, .62, 1.84, M.carWhite, 0, .62, 0, .14);
  box(car, 2.6, .58, 1.7, new THREE.MeshStandardMaterial({ color: 0x1a2328, transparent: true, opacity: .38, roughness: .05, metalness: .4, depthWrite: false }), -.2, 1.18, 0, .12);
  box(car, 2.4, .08, 1.62, M.carWhite, -.25, 1.48, 0, .04);
  for (const x of [-1.42, 1.0]) box(car, .1, .55, 1.72, M.carWhite, x, 1.18, 0, .03);
  box(car, .1, .55, 1.72, M.carWhite, -.2, 1.18, 0, .03);
  for (const [x, z] of [[1.45, .7], [1.45, -.7], [-1.45, .7], [-1.45, -.7]]) {
    const w = cyl(car, .36, .36, .26, M.rubber, x, .36, z * 1.0 + Math.sign(z) * .2, 24); w.rotation.x = Math.PI / 2;
    const h = cyl(car, .22, .22, .265, M.brushed, x, .36, z + Math.sign(z) * .2, 16); h.rotation.x = Math.PI / 2; }
  for (const z of [-.62, .62]) { box(car, .04, .1, .32, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2 }), 2.25, .78, z); box(car, .04, .1, .3, new THREE.MeshStandardMaterial({ color: 0x600, emissive: 0xff2020, emissiveIntensity: 1.5 }), -2.25, .8, z); }
  box(car, 4.56, .16, 1.86, M.matteBlack, 0, .38, 0, .06);
  // driver silhouette (driver side faces the kiosk, -z)
  const skin = new THREE.MeshStandardMaterial({ color: 0x8a5a3c, roughness: .7 }), cloth = new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: .8 }), shm = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: .9 });
  mesh(car, new THREE.SphereGeometry(.11, 16, 12), skin, .25, 1.33, -.42); box(car, .34, .38, .36, cloth, .2, 1.07, -.42, .1);
  const sh = mesh(car, new THREE.SphereGeometry(.125, 16, 12), shm, .25, 1.37, -.42); sh.scale.set(1, .75, 1);
  const arm = new THREE.Group(); arm.position.set(.3, 1.2, -.52); car.add(arm); box(arm, .09, .09, .5, cloth, 0, 0, -.25, .04); mesh(arm, new THREE.SphereGeometry(.05, 12, 8), skin, 0, 0, -.52);
  window.__arm = arm;
}
const arm = window.__arm;
car.position.set(-30, 0, 3.0);

// ================================================================ SCREENS (POS + KDS)
let lastScreenKey = '';
function drawScreens(t) {
  const st = t < 47.6 ? 0 : t < 51 ? 1 : 2; const blink = st === 1 ? (Math.floor((t - 47.6) * 2.5) % 2) : 0; const key = st + '_' + blink;
  if (key === lastScreenKey) return; lastScreenKey = key;
  // POS
  let g = pos.c.getContext('2d'); const W2 = 640, H2 = 440;
  g.fillStyle = '#f6f2ec'; g.fillRect(0, 0, W2, H2); g.fillStyle = '#121212'; g.fillRect(0, 0, W2, 64);
  g.direction = 'rtl'; g.textAlign = 'right'; g.fillStyle = '#fff'; g.font = `800 30px ${FONT}`; g.fillText('عنوان القهوة · نقطة البيع', 616, 44);
  g.textAlign = 'left'; g.direction = 'ltr'; g.font = `600 22px ${FONT}`; g.fillStyle = '#c9975e'; g.fillText('DRIVE-THRU', 24, 42);
  const tiles = ['سبانش لاتيه', 'فلات وايت', 'كورتادو', 'أمريكانو', 'لاتيه مثلج', 'كولد برو', 'موكا', 'كرواسون', 'كوكيز'];
  g.direction = 'rtl'; g.textAlign = 'center';
  tiles.forEach((n, i) => { const cx = 520 - (i % 3) * 200, cy = 110 + (i / 3 | 0) * 110; g.fillStyle = i === 0 || i === 4 ? (st ? '#c9975e' : '#e8dccb') : '#e8dccb'; g.beginPath(); g.roundRect(cx - 88, cy - 34, 176, 92, 14); g.fill(); g.fillStyle = '#1a1a1a'; g.font = `700 26px ${FONT}`; g.fillText(n, cx, cy + 20); });
  if (st >= 1) {
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, 64, W2, H2);
    g.fillStyle = blink ? '#c9975e' : '#ffffff'; g.beginPath(); g.roundRect(70, 100, 500, 300, 22); g.fill();
    g.fillStyle = st === 2 ? '#1a9b4a' : '#121212'; g.font = `900 42px ${FONT}`; g.textAlign = 'center';
    g.fillText(st === 2 ? '✓ الطلب جاهز' : 'طلب جديد', 320, 160);
    g.font = `700 26px ${FONT}`; g.fillStyle = '#333'; g.fillText('رقم الطلب #1027 · سيارة بيضاء', 320, 205);
    g.textAlign = 'right'; g.font = `700 28px ${FONT}`; g.fillStyle = '#121212';
    g.fillText('١ × سبانش لاتيه (وسط)', 530, 255); g.fillText('١ × لاتيه مثلج (كبير)', 530, 300);
    g.textAlign = 'left'; g.direction = 'ltr'; g.fillText('18', 110, 255); g.fillText('17', 110, 300);
    g.fillStyle = '#8a5a2b'; g.font = `900 30px ${FONT}`; g.fillText('35 SAR', 110, 360); g.direction = 'rtl'; g.textAlign = 'right'; g.fillText('الإجمالي', 530, 360);
  }
  pos.t.needsUpdate = true;
  // KDS
  g = kds.c.getContext('2d'); const W3 = 768, H3 = 432; g.fillStyle = '#0f1113'; g.fillRect(0, 0, W3, H3);
  g.direction = 'rtl'; g.textAlign = 'right'; g.fillStyle = '#fff'; g.font = `800 30px ${FONT}`; g.fillText('شاشة الطلبات', 740, 46);
  g.direction = 'ltr'; g.textAlign = 'left'; g.fillStyle = '#c9975e'; g.font = `600 22px ${FONT}`; g.fillText('KITCHEN DISPLAY', 28, 44);
  const cards = [['#1025', 'كورتادو', 'جاهز', '#1a9b4a'], ['#1026', 'أمريكانو ×٢', 'جاهز', '#1a9b4a']];
  if (st >= 1) cards.push(['#1027', 'سبانش لاتيه · لاتيه مثلج', st === 2 ? 'جاهز' : 'جديد', st === 2 ? '#1a9b4a' : (blink ? '#c9975e' : '#e0a040')]);
  cards.forEach(([n, d, s, col], i) => { const x = 520 - i * 248; g.fillStyle = '#1d2125'; g.beginPath(); g.roundRect(x, 80, 228, 320, 16); g.fill(); g.fillStyle = col; g.beginPath(); g.roundRect(x, 80, 228, 56, [16, 16, 0, 0]); g.fill();
    g.fillStyle = '#fff'; g.direction = 'ltr'; g.textAlign = 'center'; g.font = `800 28px ${FONT}`; g.fillText(n + '  ·  ' + s, x + 114, 118);
    g.direction = 'rtl'; g.font = `700 25px ${FONT}`; const words = d.split(' · '); words.forEach((w, k) => g.fillText(w, x + 114, 190 + k * 44)); });
  kds.t.needsUpdate = true;
}

// ================================================================ CAMERA PATH
// keys: [time, position, look-at]
const K = [
  [0.0, [9.5, 7.8, 13.5], [0, 1.8, 0]],
  [4.0, [3.5, 3.6, 10.0], [-.3, 2.2, .5]],
  [7.5, [-5.5, 2.4, 7.5], [-1.2, 2.0, 0]],
  [10.0, [-6.2, 1.66, 0.0], [-2.5, 1.45, 0]],
  [12.2, [-4.1, 1.66, 0.0], [-2.5, 1.5, 0]],
  [14.5, [-1.95, 1.65, 0.0], [2.4, 1.45, -.05]],
  [17.3, [-1.75, 1.64, .1], [-2.05, 1.15, -1.38]],
  [19.6, [-1.6, 1.64, .12], [-1.3, 1.25, -1.38]],
  [22.3, [-.75, 1.6, .05], [-.35, 1.2, -1.38]],
  [25.0, [-.55, 1.5, -.15], [-.35, 1.13, -1.2]],
  [27.8, [.25, 1.6, .1], [1.1, 1.25, -1.38]],
  [30.6, [.55, 1.64, .1], [2.38, 1.15, -.95]],
  [33.0, [.75, 1.64, .05], [2.38, 1.25, .2]],
  [35.6, [.5, 1.64, -.25], [-.35, 1.12, 1.38]],
  [38.3, [.1, 1.64, -.35], [-1.65, 1.15, 1.25]],
  [41.0, [-.4, 1.64, -.4], [-2.38, 1.35, .85]],
  [43.8, [.55, 1.62, -.05], [.7, 1.45, 1.5]],
  [46.5, [.72, 1.6, .25], [.7, 1.38, 3.0]],
  [49.2, [.66, 1.52, .55], [.56, 1.12, 1.12]],
  [52.0, [.75, 1.6, .2], [.68, 1.25, 2.2]],
  [55.5, [.7, 1.62, .1], [.6, 1.45, 3.2]],
  [60.0, [.6, 1.64, -.1], [.5, 1.5, 3.4]],
];
const V = a => new THREE.Vector3(...a);
const posCurve = new THREE.CatmullRomCurve3(K.map(k => V(k[1])), false, 'centripetal', .5);
const lookCurve = new THREE.CatmullRomCurve3(K.map(k => V(k[2])), false, 'centripetal', .5);
function camAt(t) {
  let i = 0; while (i < K.length - 2 && t >= K[i + 1][0]) i++;
  const a = K[i][0], b = K[i + 1][0]; let u = clamp((t - a) / (b - a));
  u = .35 * u + .65 * smoother(u);                      // gentle settle at each key ("look, pause, move on")
  const p = (i + u) / (K.length - 1);
  return [posCurve.getPoint(p), lookCurve.getPoint(p)];
}

// ================================================================ LABELS / UI
const LBL = [
  [10.4, 13.6, [-2.5, 2.25, .0], 'باب الدخول الجانبي', 'Staff entrance'],
  [16.0, 19.4, [-2.0, 1.25, -1.08], 'خلاطات المشروبات الباردة', 'Blenders'],
  [16.4, 19.6, [-2.1, .55, -.76], 'صانعة الثلج', 'Ice maker'],
  [18.6, 22.0, [-1.3, 1.6, -1.1], 'مطاحن الإسبريسو', 'Espresso grinders'],
  [21.6, 27.2, [-.35, 1.45, -1.07], 'ماكينة إسبريسو مزدوجة', '2-group espresso machine'],
  [22.6, 26.6, [-.6, .55, -.76], 'ثلاجات تحت الكاونتر', 'Under-counter fridges'],
  [26.4, 30.0, [.78, 1.45, -1.13], 'محطة التقطير والقهوة المفلترة', 'Batch brew & pour-over'],
  [27.0, 30.4, [1.38, 1.0, -1.05], 'حوض غسيل', 'Sink'],
  [27.4, 31.0, [1.02, 2.08, -1.36], 'شاشة الطلبات', 'Kitchen display'],
  [29.8, 33.0, [2.03, 1.45, -.72], 'ثلاجة عرض الحليب والمياه', 'Display fridge'],
  [32.0, 35.2, [2.2, 1.55, .36], 'مخزن البن والأكواب', 'Beans & cup storage'],
  [34.8, 38.0, [-.42, 1.4, 1.08], 'عرض المخبوزات', 'Pastry display'],
  [35.2, 38.4, [.55, 1.3, 1.1], 'نقطة البيع', 'POS terminal'],
  [37.6, 41.0, [-1.65, 1.2, 1.1], 'محطة الأكواب والأغطية', 'Cup & lid station'],
  [38.0, 41.4, [-1.0, 2.4, 1.25], 'مكيف سبليت', 'Split A/C'],
  [40.2, 43.4, [-2.28, 1.05, .95], 'طفاية حريق', 'Fire extinguisher'],
];
const labelsEl = document.getElementById('labels');
const labelEls = LBL.map(([, , , ar, en]) => { const d = document.createElement('div'); d.className = 'label'; d.innerHTML = `<div class="stem"></div><div class="dot"></div><div class="pill"><div class="ar">${ar}</div><div class="en">${en}</div></div>`; labelsEl.appendChild(d); return d; });
const CH = [
  [0, 9.6, 'جولة خارجية', 'Exterior · drive-thru lane'],
  [9.6, 15.2, 'الدخول إلى الكشك', 'Entering the kiosk'],
  [15.2, 27.4, 'منطقة التحضير الرئيسية', 'Main espresso bar'],
  [27.4, 35.0, 'التقطير والتبريد والتخزين', 'Brew · cold storage · stock'],
  [35.0, 43.4, 'كاونتر الخدمة', 'Service counter'],
  [43.4, 55.4, 'نافذة الدرايف ثرو · استقبال الطلبات', 'Drive-thru window · taking orders'],
];
const ui = { chapter: document.getElementById('chapter'), title: document.getElementById('title'), end: document.getElementById('end'), brand: document.getElementById('brand'), flash: document.getElementById('flash') };
const chAr = ui.chapter.querySelector('.ar'), chEn = ui.chapter.querySelector('.en'); let lastCh = -1;
const v3 = new THREE.Vector3();

function updateUI(t) {
  // title
  const ta = fade(t, .3, 1.2, 4.2, 5.2); ui.title.style.opacity = ta;
  ui.title.querySelector('.h').style.transform = `translateY(${(1 - smooth(ramp(t, .3, 1.6))) * 30}px)`;
  ui.title.querySelector('.line').style.width = `${smooth(ramp(t, .8, 2.0)) * 260}px`;
  // end card
  const ea = smooth(ramp(t, 56.0, 57.2)); ui.end.style.opacity = ea; ui.end.style.display = ea > 0 ? 'flex' : 'none';
  ui.end.querySelector('.line').style.width = `${smooth(ramp(t, 57.0, 58.2)) * 300}px`;
  ui.end.querySelector('img').style.transform = `scale(${.85 + .15 * smooth(ramp(t, 56.4, 57.8))})`;
  ui.brand.style.opacity = fade(t, 5.0, 6.0, 55.0, 56.0);
  // chapter
  const ci = CH.findIndex(c => t >= c[0] && t < c[1]);
  if (ci !== lastCh) { lastCh = ci; if (ci >= 0) { chAr.textContent = CH[ci][2]; chEn.textContent = CH[ci][3]; } }
  if (ci >= 0) { const c = CH[ci]; const a = ci === 0 ? fade(t, 5.4, 6.2, c[1] - .6, c[1]) : fade(t, c[0], c[0] + .6, c[1] - .6, c[1]); ui.chapter.style.opacity = a; ui.chapter.style.transform = `translateX(${(1 - smooth(ramp(t, c[0] + (ci === 0 ? 5.4 : 0), c[0] + (ci === 0 ? 6.4 : 1)))) * 40}px)`; }
  else ui.chapter.style.opacity = 0;
  // labels
  LBL.forEach(([a, b, p], i) => {
    const el = labelEls[i]; const al = fade(t, a, a + .5, b - .5, b);
    if (al <= 0) { el.style.display = 'none'; return; }
    v3.set(...p).project(camera);
    if (v3.z > 1 || v3.z < -1) { el.style.display = 'none'; return; }
    const x = (v3.x * .5 + .5) * W, y = (-v3.y * .5 + .5) * H;
    const stem = 90 * smooth(ramp(t, a, a + .6));
    el.style.display = 'block'; el.style.opacity = al;
    el.style.transform = `translate(${x}px, ${y}px)`;
    el.querySelector('.stem').style.cssText = `top:${-stem}px;height:${stem}px`;
    const pill = el.querySelector('.pill'); pill.style.top = `${-stem}px`; pill.style.transform = `translate(-50%, -100%) scale(${.9 + .1 * smooth(ramp(t, a + .1, a + .6))})`;
  });
}

// ================================================================ FRAME
function render(t) {
  // door: opens 10.6–12.0, closes after entering 15.4–16.6
  const dOpen = smooth(ramp(t, 10.6, 12.0)) - smooth(ramp(t, 15.4, 16.8));
  door.rotation.y = -dOpen * 1.75;
  // window slides open 44.6–46.0
  slidePane.position.x = smoother(ramp(t, 44.6, 46.0)) * .96;
  // car rolls up 40.5–46.2 and stops with driver at the window
  const cu = ramp(t, 40.2, 46.4); const ce = 1 - Math.pow(1 - cu, 2.6);
  car.position.x = THREE.MathUtils.lerp(-22, .52, ce); car.visible = t > 38;
  // tray slides out through the window to the driver 51.2–53.8
  const tu = smoother(ramp(t, 51.2, 53.6)), take = smoother(ramp(t, 54.4, 55.8));
  tray.visible = t > 50.2; tray.position.set(.6 + take * .05, CT + tu * .1 + take * .28, THREE.MathUtils.lerp(1.05, 1.62, tu) + take * .62);
  const reach = smooth(ramp(t, 53.2, 54.4)) - smooth(ramp(t, 55.2, 56.2)) * .6;
  arm.rotation.x = THREE.MathUtils.lerp(-.9, -.15, reach); arm.scale.z = THREE.MathUtils.lerp(.7, 1.25, reach);
  tray.scale.setScalar(smooth(ramp(t, 50.2, 50.8)) * .999 + .001);
  drawScreens(t);
  // camera with a subtle hand-held drift and footstep bob while walking
  const [p, l] = camAt(t);
  const [p2] = camAt(t + .05); const speed = p.distanceTo(p2) / .05;
  const inDoors = t > 12;
  const bob = inDoors ? Math.sin(t * 9.5) * .012 * clamp(speed / .6) : 0;
  camera.position.set(p.x + Math.sin(t * .7) * .006, p.y + bob + Math.sin(t * 1.1) * .004, p.z + Math.cos(t * .8) * .006);
  camera.lookAt(l.x + Math.sin(t * .53) * .01, l.y + Math.sin(t * .71) * .008, l.z);
  camera.fov = (t < 10 ? 50 : THREE.MathUtils.lerp(50, 68, smooth(ramp(t, 10, 14.5)))) * (PORTRAIT ? 1.32 : 1);
  camera.updateProjectionMatrix();
  // interior exposure lift once inside
  renderer.toneMappingExposure = THREE.MathUtils.lerp(1.0, 1.12, smooth(ramp(t, 12, 15)));
  updateUI(t);
  renderer.render(scene, camera);
}
window.render = t => { render(t); return true; };
window.DURATION = DURATION;
window.ready = true;
