import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { clamp, lerp, seg, ease, easeOut, easeBack, smooth, pulse, rng, camAt, mesh, group, std, glowTex, starTex, sprite } from './util.js';
import { makeKid, KIDS } from './chars.js';
import * as W from './world.js';
import { titleMesh, badgeMesh, glyphTex, faceTex, roundRect } from './text.js';

const Q = new URLSearchParams(location.search);
const WIDTH = +(Q.get('w') || 1920), HEIGHT = +(Q.get('h') || 1080);
const FPS = 25;
const RS = +(Q.get('rs') || 0.6667); // 3D render scale (2D overlay stays full-res)
const RW = Math.round(WIDTH * RS), RH = Math.round(HEIGHT * RS);

// ------------------------------------------------------------------ data
const TL = await (await fetch('/build/timeline.json')).json();
let MOUTH = [];
try { MOUTH = await (await fetch('/build/mouth.json')).json(); } catch (e) { /* optional */ }
await Promise.all([document.fonts.load('700 100px "Reem Kufi"'), document.fonts.load('800 100px Cairo'), document.fonts.load('900 100px Cairo')]);

const norm = s => s.replace(/[ً-ْٰـ]/g, '').replace(/[،,.!؟?:"«»]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي');
const B = id => TL.beats.find(b => b.id === id);
const WF = (id, str, n = 0) => {
  const b = B(id); const k = norm(str);
  const hits = b.words.filter(w => norm(w.w).includes(k));
  if (!hits.length) console.warn('word not found', id, str);
  return (hits[n] || hits[0] || { t: b.voice }).t;
};
const WEND = id => { const b = B(id); return b.voice_end; };
const talkAt = t => { const v = MOUTH[Math.floor(t * FPS)] || 0; return v; };

// ------------------------------------------------------------------ renderer
const canvas = document.createElement('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(RW, RH, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.3;
const camera = new THREE.PerspectiveCamera(40, WIDTH / HEIGHT, 0.05, 900);
scene.add(camera);

const sky = W.makeSky(); scene.add(sky);
scene.fog = new THREE.Fog('#dfefff', 30, 160);
const hemi = new THREE.HemisphereLight('#dff1ff', '#d8c6a8', 1.2); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff3dc', 2.6);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
const sc = sun.shadow.camera; sc.left = -12; sc.right = 12; sc.top = 12; sc.bottom = -12; sc.near = 1; sc.far = 80;
scene.add(sun); scene.add(sun.target);
const fill = new THREE.DirectionalLight('#ffe6f0', 0.5); fill.position.set(-8, 4, 10); scene.add(fill);

// post
const composer = new EffectComposer(renderer);
composer.setPixelRatio(1); composer.setSize(RW, RH);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(RW / 2, RH / 2), 0.14, 0.35, 1.0);
if (!Q.has('nobloom')) composer.addPass(bloom);
composer.addPass(new OutputPass());

// ------------------------------------------------------------------ the girl (main character)
const girl = makeKid({ shawl: '#ff9e7a', seed: 2, dress: '#fff7ec', legs: '#f3e2d6', shoes: '#e4677f', hair: '#3a2215' });
scene.add(girl.root);
const SHAWL = { beach: '#ff9e7a', islands: '#ff9e7a', protection: '#3d8bfd', education: '#ffc23d', play: '#35b85a', health: '#ff6fa8', respect: '#5b2d91', finale: '#5b2d91' };

// shawl colour-change sparkle swirl
const swirl = group(scene);
const swirlSprites = [];
for (let i = 0; i < 14; i++) swirlSprites.push(sprite(starTex(), '#ffffff', 0.22, swirl, [0, 0, 0], 0));

const billboards = [];
function bb(m) { billboards.push(m); return m; }

// ------------------------------------------------------------------ helpers
function envSet(e, k = 1) {
  sky.material.uniforms.top.value.set(e.top); sky.material.uniforms.mid.value.set(e.mid); sky.material.uniforms.bot.value.set(e.bot);
  sky.material.uniforms.sunDir.value.set(...(e.sun || [0.3, 0.5, -1])).normalize();
  sky.material.uniforms.sunAmt.value = e.sunAmt ?? 0.6;
  const dim = e.dim || 0;
  for (const key of ['top', 'mid', 'bot']) sky.material.uniforms[key].value.lerp(new THREE.Color('#3b3f6b'), dim * 0.55);
  scene.fog.color.set(e.mid).lerp(new THREE.Color('#3b3f6b'), dim * 0.55);
  scene.fog.near = (e.fog?.[0] ?? 30) * 2; scene.fog.far = (e.fog?.[1] ?? 160) * 1.6;
  hemi.color.set(e.hemiSky || e.mid); hemi.groundColor.set(e.hemiGround || '#cdbb9b');
  hemi.intensity = (e.hemiI ?? 1.15) * 0.62 * (1 - dim * 0.55);
  sun.color.set(e.sunCol || '#fff3dc'); sun.intensity = (e.sunI ?? 2.6) * 1.05 * (1 - dim * 0.7);
  sun.position.set(...(e.sunPos || [8, 14, 6])); sun.target.position.set(...(e.sunTarget || [0, 0, 0]));
  fill.intensity = (e.fillI ?? 0.5) * (1 - dim * 0.5);
  renderer.toneMappingExposure = (e.exposure ?? 1.05) * 0.9;
}

function popIn(obj, t, t0, dur = 0.6, t1 = Infinity, out = 0.5, base = 1) {
  const kIn = easeBack(seg(t, t0, t0 + dur)), kOut = isFinite(t1) ? 1 - ease(seg(t, t1, t1 + out)) : 1;
  const k = t < t0 ? 0 : Math.min(kIn, kOut);
  obj.visible = k > 0.001; obj.scale.setScalar(Math.max(0.0001, k * base));
  return k;
}

function walkTo(t, t0, t1, from, to) {
  const k = seg(t, t0, t1); const ek = smooth(k);
  const x = lerp(from[0], to[0], ek), z = lerp(from[1], to[1], ek);
  const dist = Math.hypot(to[0] - from[0], to[1] - from[1]) * ek;
  const moving = k > 0 && k < 1 ? clamp(Math.min(k / 0.12, (1 - k) / 0.12)) : 0;
  return { x, z, phase: dist * 5.2, walk: moving, yaw: Math.atan2(to[0] - from[0], to[1] - from[1]) };
}

function lookYaw(fromX, fromZ, toX, toZ) { return Math.atan2(toX - fromX, toZ - fromZ); }

function shawlSwirl(t, t0, pos, color) {
  const k = seg(t, t0, t0 + 1.4);
  swirl.visible = k > 0 && k < 1;
  if (!swirl.visible) return;
  swirl.position.set(pos[0], pos[1], pos[2]);
  swirlSprites.forEach((s, i) => {
    const a = i / swirlSprites.length * Math.PI * 2 + k * 9;
    const y = 0.2 + k * 1.1 + Math.sin(i * 1.7) * 0.15;
    s.position.set(Math.cos(a) * 0.45, y, Math.sin(a) * 0.45);
    s.material.opacity = Math.sin(k * Math.PI) * 0.95; s.material.color.set(color);
    s.scale.setScalar(0.18 + 0.12 * Math.sin(k * 20 + i));
  });
}

function setShawl(t, t0, from, to) {
  girl.shawlMat.color.set(from).lerp(new THREE.Color(to), smooth(seg(t, t0 + 0.2, t0 + 1.0)));
}

// ------------------------------------------------------------------ scenes
const SCENES = [];
function defScene(def) {
  def.beats = TL.beats.filter(b => b.scene === def.id);
  def.start = def.beats[0].start; def.end = def.beats[def.beats.length - 1].end;
  def.group = group(scene); def.group.visible = false;
  def.build(def.group);
  SCENES.push(def);
  return def;
}

// ================================================================== TITLE
defScene({
  id: 'title',
  env: { top: '#3f7fe0', mid: '#a9cdfa', bot: '#ffd98a', sun: [0, 0.35, -1], sunCol: '#ffe2a0', sunAmt: 1, hemiSky: '#cfe3ff', hemiGround: '#ffd98a', sunI: 2.2, sunPos: [4, 10, 8], fog: [40, 200], exposure: 1.05 },
  build(g) {
    this.gift = W.makeGift(g);
    this.base = W.makeCloud(77, 1.6, '#fff4dc'); this.base.position.set(0, -0.4, 0); this.base.scale.set(1.4, 0.7, 1.2); g.add(this.base);
    this.clouds = W.cloudField(g, 5, 18, [12, 40], [-8, -2], [3, 7], '#fff6e6');
    this.title = titleMesh('يومُ الطفلِ العالمي', { width: 7.6, px: 210 }); g.add(this.title);
    this.date = badgeMesh('٢٠ نوفمبر', { width: 1.9, px: 70, color: '#2b4c8c', border: '#ffc94a' }); g.add(this.date);
    this.dust = W.makeDust(g, 260, [[-8, -2, -5], [8, 9, 4]], '#fff1b8', 0.22, 4);
    this.burst = [];
    const r = rng(12);
    for (let i = 0; i < 40; i++) this.burst.push({ s: sprite(starTex(), i % 3 ? '#ffe9a0' : '#bfe0ff', 0.4, g, [0, 1.7, 0], 0), v: [r() * 2 - 1, r() * 1.4 + 0.6, r() * 2 - 1], sp: 1.5 + r() * 2.5 });
    this.rays = sprite(glowTex(), '#fff0b0', 0.1, g, [0, 2, 0], 0);
  },
  update(t) {
    const t0 = this.start, L = t - t0;
    const drop = easeBack(seg(L, 0.0, 0.7));
    this.gift.position.y = lerp(4, 0, drop);
    this.gift.rotation.y = -0.35 + Math.sin(L * 0.5) * 0.08;
    const wig = L > 0.6 && L < 1.1 ? Math.sin(L * 50) * 0.04 * (1 - seg(L, 0.6, 1.1)) : 0;
    this.gift.rotation.z = wig;
    const open = easeOut(seg(L, 0.95, 1.7));
    this.gift.userData.lid.rotation.x = -open * 2.3;
    this.gift.userData.lid.position.y = 1.7 + open * 0.5;
    this.gift.userData.inner.material.opacity = open * (0.8 + 0.2 * Math.sin(L * 3));
    this.gift.userData.inner.scale.setScalar(2 + open * 2.5);
    this.rays.material.opacity = open * 0.5; this.rays.scale.setScalar(open * 9);
    // title floats up out of the box
    const tk = seg(L, 1.4, 2.7);
    this.title.visible = tk > 0;
    this.title.position.set(0, lerp(1.4, 3.35, easeOut(tk)) + Math.sin(L * 1.3) * 0.06, lerp(0, 0.6, tk));
    this.title.scale.setScalar(Math.max(0.001, easeBack(tk)));
    this.title.rotation.set(0, Math.sin(L * 0.7) * 0.05, Math.sin(L * 0.9) * 0.015);
    popIn(this.date, L, 2.8, 0.5);
    this.date.position.set(0, 2.45 + Math.sin(L * 1.1 + 1) * 0.05, 1.3);
    this.dust.userData.update(t, 1.2);
    for (const b of this.burst) {
      const k = seg(L, 1.0, 1.0 + b.sp);
      b.s.material.opacity = k > 0 && k < 1 ? (1 - k) : 0;
      b.s.position.set(b.v[0] * k * 3.5, 1.8 + b.v[1] * k * 3 - k * k * 1.2, b.v[2] * k * 2.5 + 0.5);
    }
    this.clouds.userData.update(t);
    girl.root.visible = false;
  },
  cam(t) {
    const L = t - this.start, D = this.end - this.start;
    return camAt(L, [{ t: 0, p: [0, 2.0, 10.5], l: [0, 1.4, 0], f: 40 }, { t: 2.6, p: [0, 2.5, 8.6], l: [0, 2.3, 0], f: 40 }, { t: D, p: [0.6, 2.9, 7.6], l: [0, 2.6, 0], f: 38 }]);
  },
  focus: 8,
});

// ================================================================== BEACH
defScene({
  id: 'beach',
  env: { top: '#3d9cff', mid: '#bfe4ff', bot: '#fff1d2', sun: [0.4, 0.35, -1], sunCol: '#fff4d0', sunAmt: 1, hemiSky: '#cfe6ff', hemiGround: '#e3c896', hemiI: 1.0, sunI: 2.2, sunPos: [10, 14, -4], sunTarget: [0, 0, 16], fog: [45, 220], exposure: 0.95 },
  build(g) {
    this.beach = W.makeBeach(g);
    for (const [x, z, s, h] of [[-9, 24, 3, 5.5], [7, 26, 5, 6], [12, 21, 8, 4.8], [-15, 21, 11, 5], [2, 30, 13, 6.5]]) W.makePalm(g, [x, 0.1, z], s, h);
    for (const [x, z, c] of [[-3, 16.4, '#ff8a80'], [3.5, 17.8, '#ffd180'], [-6, 18, '#ffffff'], [5.5, 16.5, '#f8bbd0']]) {
      mesh(new THREE.ConeGeometry(0.12, 0.08, 10), std(c, { roughness: 0.4 }), g, [x, 0.04, z], [0, 0, 0], [1, 1, 0.8]);
    }
    for (const [x, z, s] of [[-12, 15, 0.9], [9, 15.5, 0.6], [14, 16, 1.2]]) mesh(new THREE.DodecahedronGeometry(s, 0), std('#a59a8f', { flatShading: true }), g, [x, 0.1, z]);
    W.cloudField(g, 21, 14, [60, 120], [12, 30], [5, 10]).position.set(0, 0, -30);
    this.sparkle = sprite(starTex(), '#fff6c0', 0.1, g, [0, 0.08, 0], 0);
    this.sparkGlow = sprite(glowTex(), '#ffe9a0', 0.1, g, [0, 0.08, 0], 0);
    this.light = new THREE.PointLight('#ffe6a0', 0, 3); g.add(this.light);
    this.scroll = W.makeScroll(g);
    this.title = titleMesh('كنوزُ حقوقِ الطفل', { width: 2.4, px: 170 }); g.add(this.title);
    this.mapDust = W.makeDust(g, 60, [[-1, 0, 16], [1, 2.2, 18]], '#ffe7a0', 0.08, 8);
  },
  update(t) {
    const L = t - this.start;
    this.beach.userData.update(t);
    girl.root.visible = true;
    const b1 = B('B1'), b2 = B('B2'), b3 = B('B3');
    // walk along the shore (+x)
    const wk = walkTo(t, b1.start + 0.2, b2.start + 0.6, [-6.5, 17], [0, 17]);
    girl.root.position.set(wk.x, 0.02, wk.z);
    const kneelT = WF('B2', 'لاحظت') + 0.2;
    const kneel = smooth(seg(t, kneelT, kneelT + 0.9)) * (1 - smooth(seg(t, b3.start + 0.2, b3.start + 1.0)));
    const turn = smooth(seg(t, b3.start + 0.4, b3.start + 1.6));
    girl.root.rotation.y = lerp(Math.PI / 2, 0.15, turn);
    const sparkleT = b2.start + 0.3;
    const surprise = pulse(t, WF('B2', 'يلمع'), WF('B2', 'خريطة') + 1.2, 0.3) * 0.8 + pulse(t, WF('B3', 'انتبهوا') - 0.1, WF('B3', 'الذهب'), 0.25) * 0.6;
    const reach = smooth(seg(t, WF('B2', 'خريطة') - 0.6, WF('B2', 'خريطة')));
    const hold = smooth(seg(t, b3.start + 0.2, b3.start + 1.0));
    const armFw = Math.max(reach * 1.1, hold * 0.95);
    girl.update({
      t, walk: wk.walk, walkPhase: wk.phase, kneel, pitch: lerp(0.28, 0.0, hold) + kneel * 0.15, yaw: wk.walk ? Math.sin(t * 1.2) * 0.15 : 0,
      armL: armFw > 0.01 ? [armFw, 0.15] : null, armR: armFw > 0.01 ? [armFw, 0.15] : null,
      elbowL: 0.15 + hold * 0.6, elbowR: 0.15 + hold * 0.6, talk: talkAt(t), surprise, smile: 1,
    });
    // sparkle in the sand
    const sp = seg(t, sparkleT, sparkleT + 0.8);
    const spOut = 1 - seg(t, WF('B2', 'خريطة'), WF('B2', 'خريطة') + 0.6);
    const sx = 0.85, sz = 17.05;
    this.sparkle.position.set(sx, 0.1, sz); this.sparkGlow.position.set(sx, 0.08, sz);
    const tw = 0.75 + 0.25 * Math.sin(t * 9);
    this.sparkle.material.opacity = sp * spOut; this.sparkle.scale.setScalar((0.25 + 0.35 * sp) * tw); this.sparkle.material.rotation = t * 0.8;
    this.sparkGlow.material.opacity = sp * spOut * 0.8; this.sparkGlow.scale.setScalar(0.9 * sp);
    this.light.position.set(sx, 0.3, sz); this.light.intensity = sp * spOut * 3;
    // scroll: rises from the sand, then floats and opens in front of her
    const up = smooth(seg(t, WF('B2', 'خريطة') - 0.4, WF('B2', 'خريطة') + 0.5));
    const fly = smooth(seg(t, b3.start + 0.1, b3.start + 1.4));
    const open = easeOut(seg(t, b3.start + 1.0, b3.start + 2.4));
    const gx = girl.root.position.x;
    const p0 = new THREE.Vector3(sx, lerp(0.03, 0.35, up), sz), p1 = new THREE.Vector3(gx + 0.08, 0.74, 17.66);
    const sp3 = p0.clone().lerp(p1, fly);
    sp3.y += Math.sin(t * 1.6) * 0.03 * fly;
    this.scroll.position.copy(sp3);
    this.scroll.rotation.set(lerp(0, -0.45, fly), lerp(0, 0.15, fly), 0);
    this.scroll.userData.setOpen(open);
    this.scroll.userData.aura.material.opacity = open * (0.55 + 0.2 * Math.sin(t * 4));
    this.scroll.scale.setScalar(lerp(0.75, 0.5, fly));
    this.scroll.userData.closed.rotation.set(0, Math.PI / 2, 0);
    this.mapDust.position.set(gx - 0.0, 0, 0.1); this.mapDust.userData.update(t, -1);
    this.mapDust.visible = open > 0.1;
    // title
    const tt = WF('B3', 'كنوز');
    popIn(this.title, t, tt - 0.2, 0.7, this.end - 0.6, 0.5);
    this.title.position.set(gx + 0.05, 1.72 + Math.sin(t * 1.4) * 0.03, 17.3);
  },
  cam(t) {
    const b1 = B('B1'), b2 = B('B2'), b3 = B('B3');
    const gx = girl.root.position.x;
    if (t < b2.start + 0.4) {
      const k = seg(t, b1.start, b2.start);
      return { p: [gx + 2.4 - k * 0.6, 0.62 + k * 0.1, 19.9 - k * 0.3], l: [gx + 0.3, 0.85 - k * 0.15, 16.9], f: 38 };
    }
    if (t < b3.start + 0.6) {
      const k = ease(seg(t, b2.start + 0.4, WF('B2', 'خريطة')));
      return { p: [lerp(1.6, 1.7, k), lerp(0.72, 0.5, k), lerp(19.6, 18.5, k)], l: [lerp(0.3, 0.7, k), lerp(0.7, 0.32, k), 17.0], f: 38 };
    }
    const k = ease(seg(t, b3.start + 0.6, b3.start + 2.6));
    const k2 = ease(seg(t, b3.start + 2.6, this.end));
    return { p: [lerp(1.7, gx + 0.3, k), lerp(0.5, 1.45, k) + k2 * 0.1, lerp(18.5, 20.0, k) + k2 * 0.3], l: [lerp(0.7, gx + 0.05, k), lerp(0.32, 1.02, k), lerp(17.0, 17.5, k)], f: 38 };
  },
  focusObj: () => girl.root.position.clone().add(new THREE.Vector3(0, 1, 0.6)),
});

// ================================================================== ISLANDS (overview)
const ISL = [
  { name: 'الحماية', color: '#5aa9ff', grass: '#9fd9ff' },
  { name: 'التعليم', color: '#ffd23f', grass: '#ffe58a' },
  { name: 'اللعب', color: '#5ed67a', grass: '#8fe39c' },
  { name: 'الصحة', color: '#ff8fc0', grass: '#ffc3dc' },
  { name: 'الاحترام', color: '#a77bff', grass: '#cdb4ff' },
];
function islandIcon(i) {
  if (i === 0) return W.makeShieldIcon('#4a8fe7');
  if (i === 1) { const b = W.makeBook(null, '#ff9f1c', 1.2); return b; }
  if (i === 2) return W.makeStarIcon('#ffd23f', 0.6);
  if (i === 3) { const h = W.makeHeart(null, 0.45, '#ff5c93'); return h; }
  return W.makeHouseIcon('#ffffff');
}
function buildSkyIslands(g, scale = 1) {
  const arr = [];
  const pos = [[10, 1.2, -9], [5, -0.6, -12], [0, 1.4, -10], [-5, -0.4, -12], [-10, 1.0, -9]];
  ISL.forEach((d, i) => {
    const holder = group(g, pos[i].map(v => v * scale)); holder.scale.setScalar(1.25);
    const isl = W.makeIsland({ r: 2.2, h: 2.6, grass: d.grass, seed: i + 3, flowers: true }); holder.add(isl);
    const ring = mesh(new THREE.TorusGeometry(2.5, 0.06, 8, 64), new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: 0.9, toneMapped: false }), holder, [0, 0.05, 0], [Math.PI / 2, 0, 0]);
    const glow = sprite(glowTex(), d.color, 9, holder, [0, 0.5, 0], 0.55);
    const icon = islandIcon(i); holder.add(icon); icon.position.set(0, 1.4, 0); icon.scale.multiplyScalar(1.1);
    if (i === 1) icon.rotation.x = 0.9;
    const label = bb(badgeMesh(d.name, { width: 3.4, px: 80, border: d.color, color: '#33415c' })); holder.add(label); label.position.set(0, 3.3, 0);
    arr.push({ holder, ring, glow, icon, label, base: holder.position.clone() });
  });
  return arr;
}

defScene({
  id: 'islands',
  env: { top: '#4f86ee', mid: '#ffcfe3', bot: '#ffe6c8', sun: [-0.2, 0.25, -1], sunCol: '#ffe3b5', sunAmt: 1, hemiSky: '#dfe8ff', hemiGround: '#ffd6e6', hemiI: 1.1, sunI: 2.3, sunPos: [6, 12, 10], fog: [60, 260], exposure: 0.93 },
  build(g) {
    this.isl = buildSkyIslands(g);
    this.clouds = W.cloudField(g, 33, 24, [4, 40], [-6, -2.5], [3, 7]); this.clouds.position.set(0, -4, -14);
    this.cloudsHi = W.cloudField(g, 34, 10, [30, 70], [6, 14], [4, 8]);
    this.perch = W.makeCloud(91, 1.1); this.perch.position.set(3.4, -1.75, 7.2); this.perch.scale.set(1.2, 0.6, 1); g.add(this.perch);
    this.map = W.makeScroll(g); this.map.userData.setOpen(1);
    this.dust = W.makeDust(g, 120, [[-14, -6, -16], [14, 8, 6]], '#fff3c4', 0.2, 6);
  },
  update(t) {
    const b = B('B4'); const L = t - this.start;
    girl.root.visible = true;
    girl.root.position.set(3.4, -1.36, 7.3);
    girl.root.rotation.y = Math.PI * 0.93;
    const cues = [WF('B4', 'امنه'), WF('B4', 'تتعلمين'), WF('B4', 'تلعبين'), WF('B4', 'بصحتك'), WF('B4', 'باحترام')];
    let look = 0;
    this.isl.forEach((d, i) => {
      const k = pulse(t, cues[i] - 0.35, cues[i] + 1.4, 0.35);
      const on = seg(t, cues[i] - 0.35, cues[i] + 0.2);
      d.holder.position.y = d.base.y + Math.sin(t * 0.6 + i) * 0.25;
      d.holder.scale.setScalar(1 + k * 0.18);
      d.glow.material.opacity = 0.35 + k * 0.6;
      d.ring.material.opacity = 0.5 + k * 0.5;
      d.icon.rotation.y = t * 0.6 + i;
      d.label.visible = on > 0; d.label.scale.setScalar(Math.max(0.001, easeBack(on)));
      if (k > 0.3) look = (i - 2) * -0.16;
    });
    girl.update({ t, yaw: lerp(0, look, 0.8), pitch: -0.08, talk: talkAt(t), armR: [0.5 + 0.2 * Math.sin(t), 0.35], elbowR: 0.4 });
    // the map floats beside the girl, shimmering
    const sh = 0.6 + 0.4 * Math.sin(t * 5);
    this.map.position.set(2.45, -0.15 + Math.sin(t * 1.3) * 0.08, 7.9);
    this.map.rotation.set(-0.05, 0.35 + Math.sin(t * 0.7) * 0.05, Math.sin(t * 0.9) * 0.03);
    this.map.scale.setScalar(0.85);
    this.map.userData.aura.material.opacity = 0.45 + sh * 0.35;
    this.clouds.userData.update(t); this.cloudsHi.userData.update(t);
    this.dust.userData.update(t, 0.5);
  },
  cam(t) {
    const L = t - this.start, D = this.end - this.start;
    const go = WF('B4', 'نبدا');
    return camAt(t, [
      { t: this.start, p: [3.0, -0.2, 11.4], l: [2.6, -0.3, 7.6], f: 40 },
      { t: this.start + 3.0, p: [1.5, 1.6, 17.5], l: [0.5, 0.2, -6], f: 44 },
      { t: go - 0.5, p: [-0.5, 2.0, 16.5], l: [0, 0.2, -8], f: 44 },
      { t: this.end, p: [8.5, 2.6, -1], l: [10, 1.5, -9], f: 44 },
    ]);
  },
  focus: 14,
});

// ================================================================== island scene base
function islandScene(g, o) {
  const isl = W.makeIsland({ r: 8, h: 6, grass: o.grass, dirt: o.dirt || '#b38052', rock: o.rock || '#a49486', seed: o.seed || 1 });
  g.add(isl);
  const far = [];
  for (let i = 0; i < 3; i++) {
    const s = W.makeIsland({ r: 2, h: 2.4, grass: o.grass, seed: 50 + i + (o.seed || 0), flowers: false });
    s.position.set([-26, 24, 6][i], [3, -2, 6][i], [-34, -30, -48][i]); g.add(s); far.push(s);
  }
  const clouds = W.cloudField(g, o.seed * 7 + 3, 22, [11, 45], [-7, -1.5], [2.5, 6], o.cloud);
  const cloudsHi = W.cloudField(g, o.seed * 7 + 4, 10, [25, 60], [5, 14], [3, 7], o.cloud);
  return { isl, far, update: t => { clouds.userData.update(t); cloudsHi.userData.update(t); far.forEach((f, i) => f.position.y += Math.sin(t * 0.5 + i) * 0.003); } };
}

function islandTitle(g, text, color) {
  const m = titleMesh(text, { width: 6.2, px: 150, face: ['#ffffff', color, color], side: new THREE.Color(color).multiplyScalar(0.55).getStyle(), glow: color });
  g.add(m); return bb(m);
}

// ================================================================== PROTECTION
defScene({
  id: 'protection',
  env: { top: '#7fbfff', mid: '#d6ebff', bot: '#f4f9ff', sun: [0.5, 0.4, -1], sunCol: '#eef6ff', hemiSky: '#dcecff', hemiGround: '#bfe3d0', hemiI: 1.25, sunI: 2.6, sunPos: [9, 14, 8], fog: [30, 170], exposure: 1.04 },
  build(g) {
    this.base = islandScene(g, { grass: '#93d9b5', seed: 2, cloud: '#f4f9ff' });
    this.lh = W.makeLighthouse(g, [-4.6, 0, -4.2]);
    this.shell = W.makeShell(g, 0.75); this.shell.position.set(1.7, 0.05, 0.2); this.shell.rotation.y = -0.45;
    this.kids = [0, 1, 2].map(i => { const k = makeKid({ ...KIDS[i], scale: 0.82 }); g.add(k.root); return k; });
    this.mom = makeKid({ adult: true, scale: 1.32, hijab: '#2f4f8f', dress: '#24365f', legs: '#24365f', shoes: '#3a2a20', skin: '#e8b48f', seed: 21, style: 'girl', shawl: false });
    g.add(this.mom.root);
    this.icons = [W.makeShieldIcon('#3d8bfd'), W.makeHouseIcon('#ffffff'), W.makeHeart(null, 0.32, '#ff7aa8'), W.makeHandIcon()];
    this.icons.forEach(m => g.add(m));
    this.title = islandTitle(g, 'الجزيرة الأولى: كنزُ الحماية', '#3d8bfd');
    this.no = titleMesh('لا!', { width: 1.6, px: 260, face: ['#ffffff', '#ff5a5a', '#d62828'], side: '#7a1010', glow: 'rgba(255,90,90,.9)' }); g.add(this.no); bb(this.no);
    this.ring = mesh(new THREE.RingGeometry(0.6, 0.7, 64), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false }), g); bb(this.ring);
    this.badges = ['الوالدان', 'المعلّمة', 'شخصٌ مسؤول'].map(s => { const m = bb(badgeMesh(s, { width: 1.25, px: 80, border: '#3d8bfd' })); g.add(m); return m; });
    this.brave = titleMesh('طلبُ المساعدةِ شجاعة', { width: 4.2, px: 150 }); g.add(this.brave); bb(this.brave);
  },
  update(t) {
    const p1 = B('P1'), p2 = B('P2'), p3 = B('P3');
    this.base.update(t);
    girl.root.visible = true;
    // girl
    const gx = -0.4, gz = 1.6;
    girl.root.position.set(gx, 0, gz);
    const dimT0 = p3.voice, noT = WF('P3', 'لا', 0) ;
    const noWord = B('P3').words.find(w => norm(w.w) === 'لا'); const noTime = noWord ? noWord.t : noT;
    const helpT = WF('P3', 'اخبري');
    const dim = smooth(seg(t, dimT0, dimT0 + 1.5)) * (1 - smooth(seg(t, helpT - 0.4, helpT + 1.0)));
    this.dim = dim;
    const stop = smooth(seg(t, WF('P3', 'توقفي') - 0.3, WF('P3', 'توقفي') + 0.3)) * (1 - smooth(seg(t, helpT, helpT + 0.8)));
    const faceMom = smooth(seg(t, helpT + 0.4, helpT + 1.4));
    const yawBase = lookYaw(gx, gz, 1.7, 0.6);
    girl.root.rotation.y = lerp(lerp(yawBase * 0.5, 0.0, smooth(seg(t, p2.start, p2.start + 1))), lookYaw(gx, gz, -1.75, 0.55), faceMom);
    setShawl(t, this.start + 0.3, SHAWL.islands, SHAWL.protection);
    shawlSwirl(t, this.start + 0.3, [gx, 0, gz], '#9fd0ff');
    girl.update({
      t, talk: talkAt(t), sad: dim * 0.25, pitch: faceMom * -0.1,
      armR: stop > 0.01 ? [lerp(0.12, 1.5, stop), 0.12] : null, elbowR: lerp(0.15, 0.05, stop), handRotR: -1.3 * stop,
      surprise: pulse(t, noTime - 0.1, noTime + 0.7, 0.15) * 0.2,
    });
    // shell: opens a bit, closes like a shield, then opens with icons
    const sm = WF('P1', 'ابتسمت'), sh = WF('P1', 'الحمايه', 1);
    let open = 0.15 + 0.45 * smooth(seg(t, sm - 0.3, sm + 0.5));
    open = lerp(open, 0.02, smooth(seg(t, sh - 0.2, sh + 0.35)));
    open = lerp(open, 0.9, smooth(seg(t, p2.start, p2.start + 0.9)));
    this.shell.userData.setOpen(open);
    this.shell.userData.glow.material.opacity = 0.4 + 0.3 * Math.sin(t * 2) + pulse(t, sh - 0.2, sh + 1.2) * 0.4;
    this.shell.position.y = 0.05 + Math.sin(t * 1.2) * 0.02;
    // icons
    const it = p2.start + 0.5;
    const cueWords = [WF('P2', 'يضربك'), WF('P2', 'يجرك'), WF('P2', 'يزعجك'), WF('P2', 'يلمسك')];
    this.icons.forEach((m, i) => {
      const k = easeBack(seg(t, it + i * 0.25, it + i * 0.25 + 0.7));
      const out = 1 - smooth(seg(t, p3.start + 0.5, p3.start + 1.4));
      const a = t * 0.5 + i * Math.PI / 2;
      m.visible = k * out > 0.01;
      const pk = pulse(t, cueWords[i] - 0.1, cueWords[i] + 0.9, 0.2);
      m.scale.setScalar(Math.max(0.001, k * out * (0.62 + pk * 0.25)));
      m.position.set(1.7 + Math.cos(a) * 1.25, 1.3 + k * 0.3 + Math.sin(t * 1.5 + i) * 0.08 + pk * 0.2, 0.6 + Math.sin(a) * 0.9);
      m.rotation.y = Math.sin(t + i) * 0.4;
    });
    // kids playing near the lighthouse (circle walk + hop)
    this.kids.forEach((k, i) => {
      const a = t * 0.45 + i * 2.1;
      const cx = -3.6, cz = -2.2, R = 1.5;
      k.root.position.set(cx + Math.cos(a) * R, Math.max(0, Math.sin(t * 6 + i)) * 0.06 * (i === 1 ? 2 : 1), cz + Math.sin(a) * R);
      k.root.rotation.y = -a;  // tangent
      k.update({ t, walk: 1, walkPhase: t * 7 + i, smile: 1 });
    });
    // lighthouse beam
    this.lh.userData.beam.rotation.y = t * 0.8;
    // the "no!" word
    popIn(this.no, t, noTime - 0.05, 0.35, noTime + 1.6, 0.4);
    this.no.position.set(gx + 0.15, 1.95, gz + 0.5);
    const rk = seg(t, noTime, noTime + 0.7);
    this.ring.position.set(gx + 0.15, 1.95, gz + 0.45);
    this.ring.material.opacity = rk > 0 && rk < 1 ? (1 - rk) * 0.8 : 0; this.ring.scale.setScalar(0.5 + rk * 2.2);
    // the trusted adult walks in
    const mw = walkTo(t, helpT - 0.6, helpT + 1.8, [-6.5, -1.5], [-1.75, 0.55]);
    this.mom.root.visible = t > helpT - 0.7;
    this.mom.root.position.set(mw.x, 0, mw.z);
    this.mom.root.rotation.y = mw.walk > 0.05 ? mw.yaw : lerp(mw.yaw, lookYaw(-1.75, 0.55, gx + 1.2, gz + 2.5), smooth(seg(t, helpT + 1.6, helpT + 2.4)));
    this.mom.update({ t, walk: mw.walk, walkPhase: mw.phase, smile: 1.1, pitch: 0.12, armL: mw.walk < 0.1 && t > helpT + 1.8 ? [0.6, 0.25] : null, elbowL: 0.6 });
    const bt = [WF('P3', 'والديك'), WF('P3', 'معلمتك'), WF('P3', 'مسوول')];
    this.badges.forEach((m, i) => { popIn(m, t, bt[i] - 0.15, 0.5, WF('P3', 'شجاعه') - 0.5, 0.4); m.position.set(gx + 0.9 + (i - 1) * 1.35, 2.75 + (i % 2) * 0.12, gz + 0.3); });
    popIn(this.brave, t, WF('P3', 'طلب') - 0.1, 0.7, this.end - 0.3, 0.4);
    this.brave.position.set(0.6, 3.05 + Math.sin(t * 1.3) * 0.04, 1.6);
    popIn(this.title, t, p1.voice - 0.2, 0.7, WF('P1', 'هنا') - 0.2, 0.5);
    this.title.position.set(0.3, 3.4, -0.5);
  },
  envMod(e) { return { ...e, dim: this.dim || 0 }; },
  cam(t) {
    const p1 = B('P1'), p2 = B('P2'), p3 = B('P3');
    const helpT = WF('P3', 'اخبري');
    return camAt(t, [
      { t: this.start, p: [7, 7, 16], l: [0, 1, 0], f: 42 },
      { t: p1.voice + 0.3, p: [2.2, 2.3, 9.2], l: [0.4, 1.5, 0], f: 40 },
      { t: WF('P1', 'هنا'), p: [1.8, 1.9, 8.0], l: [0.6, 1.1, 0.4], f: 40 },
      { t: p1.end, p: [3.6, 1.5, 5.6], l: [1.3, 0.8, 0.6], f: 40 },
      { t: p2.end, p: [3.9, 2.0, 6.4], l: [1.0, 1.25, 0.6], f: 40 },
      { t: p3.voice + 1.2, p: [0.3, 1.25, 5.0], l: [-0.3, 1.05, 1.6], f: 40 },
      { t: helpT - 0.3, p: [0.0, 1.2, 4.2], l: [-0.35, 1.1, 1.6], f: 38 },
      { t: helpT + 2.4, p: [1.0, 1.8, 7.0], l: [-0.9, 1.3, 1.2], f: 40 },
      { t: this.end, p: [1.4, 2.4, 9.6], l: [0.5, 1.9, 1.8], f: 40 },
    ]);
  },
  focusObj: () => girl.root.position.clone().add(new THREE.Vector3(0, 1.0, 0)),
});

// ================================================================== EDUCATION
defScene({
  id: 'education',
  env: { top: '#ffcf5a', mid: '#fff0c2', bot: '#fffaf0', sun: [0.2, 0.4, -1], sunCol: '#fff0b0', sunAmt: 1, hemiSky: '#fff3cf', hemiGround: '#d9e7a0', hemiI: 1.25, sunI: 2.6, sunPos: [7, 14, 9], fog: [30, 170], exposure: 1.0 },
  build(g) {
    this.base = islandScene(g, { grass: '#bfe07a', seed: 3, cloud: '#fff8e6' });
    this.tree = W.makeTree(g, [-1.2, 0, -4.2], 1.25);
    this.readers = [2, 4, 5].map((i, j) => { const k = makeKid({ ...KIDS[i], scale: 0.82 }); g.add(k.root); k.root.position.set(-3.6 + j * 1.5, 0, -2.2 + (j % 2) * 0.3); return k; });
    this.rBooks = this.readers.map((k, j) => { const b = W.makeBook(g, ['#3d8bfd', '#5ed67a', '#ff8fc0'][j], 0.42); return b; });
    this.child = makeKid({ ...KIDS[1], scale: 0.86 }); g.add(this.child.root);
    this.slate = W.makeSlate(g);
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 8), std('#8a5a36'), g, [-1.95, 0.55, 2.75], [0.2, 0, 0.25]);
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 8), std('#8a5a36'), g, [-1.25, 0.55, 2.75], [0.2, 0, -0.25]);
    this.book = W.makeBook(g, '#ff9f1c', 0.8);
    this.bookGlow = sprite(glowTex(), '#ffe27a', 2.4, this.book, [0, 0.2, 0], 0.7);
    for (const s of [1, -1]) mesh(new THREE.SphereGeometry(0.06, 12, 10), std('#2b1a0e', { roughness: 0.1 }), this.book, [s * 0.18, 0.12, 0.47]);
    this.glyphs = [];
    const chars = ['أ', 'ب', 'ت', '١', '٢', '٣', 'ج', '؟', 'د', '٤'];
    const r = rng(4);
    for (let i = 0; i < 18; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glyphTex(chars[i % chars.length], ['#ff8c42', '#3d8bfd', '#5ed67a', '#e94f8a', '#8e5cf7'][i % 5]), transparent: true, depthWrite: false }));
      s.scale.setScalar(0.4); g.add(s); this.glyphs.push({ s, ph: r(), off: r() * 2 - 1 });
    }
    this.bulb = W.makeBulb(g);
    this.title = islandTitle(g, 'الجزيرة الثانية: كنزُ التعليم', '#f5a700');
    this.dust = W.makeDust(g, 90, [[-6, 0, -6], [4, 6, 3]], '#fff3a0', 0.14, 13);
  },
  update(t) {
    const e1 = B('E1'), e2 = B('E2'), e3 = B('E3');
    this.base.update(t);
    girl.root.visible = true;
    const gx = 0.9, gz = 1.8;
    const walkIn = walkTo(t, this.start + 0.2, e1.voice + 1.0, [2.6, 3.2], [gx, gz]);
    girl.root.position.set(walkIn.x, 0, walkIn.z);
    const toChild = smooth(seg(t, e2.start + 0.2, e2.start + 1.2));
    const faceCam = walkIn.walk > 0.05 ? walkIn.yaw : lerp(0.2, lookYaw(gx, gz, -1.0, 2.2), toChild);
    girl.root.rotation.y = faceCam;
    setShawl(t, this.start + 0.4, SHAWL.protection, SHAWL.education);
    shawlSwirl(t, this.start + 0.4, [walkIn.x, 0, walkIn.z], '#fff1a0');
    const explain = pulse(t, e3.voice, e3.end, 0.5);
    girl.update({ t, walk: walkIn.walk, walkPhase: walkIn.phase, talk: talkAt(t), armL: explain > 0.01 ? [0.4 + 0.35 * Math.sin(t * 2.2) * explain, 0.3] : null, elbowL: 0.6 * explain + 0.15, pitch: 0.02 });
    // magic book appears and opens, then flies around dropping glyphs
    const bk = WF('E1', 'كتابا');
    const appear = easeBack(seg(t, bk - 0.3, bk + 0.5));
    const fly = smooth(seg(t, e2.start, e2.start + 1));
    const a = (t - e2.start) * 0.9;
    const orbit = new THREE.Vector3(gx + Math.cos(a) * 1.3, 1.9 + Math.sin(t * 2) * 0.15, gz + Math.sin(a) * 1.1);
    const hover = new THREE.Vector3(gx + 0.65, 1.75 + Math.sin(t * 2) * 0.06, gz + 0.6);
    this.book.position.copy(hover.clone().lerp(orbit, fly));
    this.book.visible = appear > 0.01; this.book.scale.setScalar(Math.max(0.001, appear * 0.8));
    this.book.rotation.set(-0.6 + Math.sin(t * 2) * 0.1, fly * (-a - Math.PI / 2), 0);
    this.book.userData.setOpen(0.55 + 0.45 * Math.abs(Math.sin(t * (fly > 0.5 ? 6 : 1.5))) * appear);
    this.bookGlow.material.opacity = 0.5 + 0.3 * Math.sin(t * 3);
    this.glyphs.forEach((gl, i) => {
      const life = 2.4; const tt = (t - e2.start) - gl.ph * life - i * 0.37;
      const cyc = ((tt % life) + life) % life; const k = cyc / life;
      const on = fly > 0.5 && t < e3.end - 1;
      const src = orbit.clone();
      const ba = (t - cyc) - e2.start; // position of the book when this glyph was dropped
      src.set(gx + Math.cos(ba * 0.9) * 1.3, 1.9, gz + Math.sin(ba * 0.9) * 1.1);
      gl.s.position.set(src.x + gl.off * 0.3, src.y - k * 1.4, src.z);
      gl.s.material.opacity = on ? Math.sin(k * Math.PI) : 0;
      gl.s.scale.setScalar(0.25 + 0.15 * Math.sin(k * Math.PI));
    });
    // readers under the tree
    this.readers.forEach((k, j) => {
      k.root.rotation.y = 0.3 - j * 0.25;
      const pointUp = pulse(t, this.start + 2 + j * 3, this.start + 4 + j * 3, 0.4);
      k.update({ t, sit: 1, pitch: 0.35 - pointUp * 0.8, armL: [0.9, 0.2], armR: pointUp > 0.01 ? [lerp(0.9, 2.6, pointUp), 0.2] : [0.9, 0.2], elbowL: 0.9, elbowR: lerp(0.9, 0.2, pointUp) });
      const b = this.rBooks[j];
      b.position.set(k.root.position.x + Math.sin(k.root.rotation.y) * 0.42, 0.62 + Math.sin(t * 2 + j) * 0.05, k.root.position.z + Math.cos(k.root.rotation.y) * 0.42);
      b.rotation.set(-1.0, k.root.rotation.y, 0); b.userData.setOpen(0.85 + 0.15 * Math.sin(t * 3 + j));
    });
    // the child at the slate
    const cx = -1.0, cz = 2.2;
    this.child.root.position.set(cx, 0, cz);
    this.slate.position.set(-1.6, 1.05, 2.9); this.slate.rotation.set(-0.15, -0.6, 0);
    const wT = WF('E2', 'الخطا'), eT = WF('E2', 'اخطات'), rT = WF('E2', 'نحاول');
    const wrong = seg(t, wT - 1.4, wT - 0.2), erase = seg(t, eT, eT + 1.1), right = seg(t, rT - 0.4, rT + 1.0);
    this.slate.userData.draw(wrong, erase, right);
    const laugh = pulse(t, wT + 0.1, eT, 0.3);
    const writing = Math.max(seg(t, wT - 1.4, wT - 0.2) * (1 - seg(t, wT - 0.2, wT)), pulse(t, eT, eT + 1.1, 0.15), pulse(t, rT - 0.4, rT + 1.0, 0.15));
    const toGirl = smooth(seg(t, e3.start - 0.3, e3.start + 0.6));
    this.child.root.rotation.y = lerp(lookYaw(cx, cz, -1.6, 2.9), lookYaw(cx, cz, gx, gz), Math.max(toGirl, laugh * 0.6));
    this.child.update({
      t, armR: writing > 0.01 ? [1.3 + Math.sin(t * 14) * 0.08 * writing, 0.35 + Math.sin(t * 9) * 0.1] : null, elbowR: 0.5,
      jump: laugh * Math.max(0, Math.sin(t * 9)) * 0.05, roll: laugh * Math.sin(t * 6) * 0.1, smile: 1 + laugh * 0.4, talk: laugh * (0.5 + 0.5 * Math.sin(t * 18)),
      pitch: -toGirl * 0.1 + Math.sin(t * 1.8) * 0.05 * toGirl, surprise: pulse(t, WF('E3', 'فضولك') - 0.2, WF('E3', 'فضولك') + 1.5, 0.3) * 0.7,
    });
    // light bulb of understanding
    const bt1 = WF('E3', 'فضولك'), bt2 = WF('E3', 'تشرحين', 1);
    const bk1 = Math.max(popIn(this.bulb, t, bt1 - 0.1, 0.5, bt1 + 2.0, 0.5, 0.7), 0);
    if (t > bt2 - 0.2) popIn(this.bulb, t, bt2 - 0.2, 0.5, e3.end - 0.2, 0.5, 0.8);
    this.bulb.position.set(cx, 1.75 + Math.sin(t * 3) * 0.04, cz);
    this.bulb.rotation.z = Math.sin(t * 4) * 0.12;
    this.tree.userData.glows.forEach((s, i) => { s.material.opacity = 0.4 + 0.5 * Math.abs(Math.sin(t * 1.3 + i)); });
    this.dust.userData.update(t, -0.4);
    popIn(this.title, t, e1.voice - 0.2, 0.7, WF('E1', 'هذه') - 0.1, 0.5);
    this.title.position.set(0.0, 3.6, 0.0);
  },
  cam(t) {
    const e1 = B('E1'), e2 = B('E2'), e3 = B('E3');
    return camAt(t, [
      { t: this.start, p: [-6, 6.5, 14], l: [-1, 2, -2], f: 42 },
      { t: e1.voice + 0.5, p: [1.5, 2.6, 9.6], l: [0, 2.2, 0], f: 40 },
      { t: WF('E1', 'كتابا'), p: [2.3, 1.7, 5.6], l: [0.9, 1.4, 2.2], f: 40 },
      { t: e2.start + 0.5, p: [2.6, 1.8, 6.0], l: [0.6, 1.4, 2.0], f: 40 },
      { t: WF('E2', 'الخطا') - 1.6, p: [0.6, 1.6, 6.4], l: [-0.9, 1.0, 2.5], f: 40 },
      { t: e2.end, p: [0.3, 1.5, 6.1], l: [-0.8, 1.0, 2.5], f: 38 },
      { t: e3.voice + 2, p: [-0.2, 1.4, 5.6], l: [-0.1, 1.1, 2.1], f: 38 },
      { t: this.end, p: [0.8, 2.5, 8.8], l: [-0.6, 1.6, 0.5], f: 42 },
    ]);
  },
  focusObj: () => girl.root.position.clone().add(new THREE.Vector3(-0.6, 1.0, 0.2)),
});

// ================================================================== PLAY
defScene({
  id: 'play',
  env: { top: '#86d9b0', mid: '#e3f8ea', bot: '#fbfff3', sun: [0.3, 0.45, -1], sunCol: '#f6fff0', sunAmt: 0.8, hemiSky: '#e7fbe9', hemiGround: '#a8dc8a', hemiI: 1.25, sunI: 2.7, sunPos: [8, 15, 7], fog: [30, 170], exposure: 1.02 },
  build(g) {
    this.base = islandScene(g, { grass: '#6fd36a', seed: 4 });
    this.star = W.makeStarChar(g);
    this.trail = [];
    for (let i = 0; i < 26; i++) this.trail.push(sprite(starTex(), '#8dff9d', 0.25, g, [0, 0, 0], 0));
    this.runners = [0, 3].map(i => { const k = makeKid({ ...KIDS[i], scale: 0.82 }); g.add(k.root); return k; });
    this.a = makeKid({ ...KIDS[2], scale: 0.84 }); g.add(this.a.root);
    this.b = makeKid({ ...KIDS[5], scale: 0.84 }); g.add(this.b.root);
    this.ball = mesh(new THREE.SphereGeometry(0.17, 28, 20), new THREE.MeshPhysicalMaterial({ color: '#ff5d5d', roughness: 0.3, clearcoat: 1 }), g);
    mesh(new THREE.TorusGeometry(0.172, 0.02, 8, 40), std('#ffffff'), this.ball, null, [Math.PI / 2, 0, 0]);
    mesh(new THREE.TorusGeometry(0.172, 0.02, 8, 40), std('#ffd23f'), this.ball);
    this.circle = [0, 1, 2, 3, 4].map(i => { const k = makeKid({ ...KIDS[[0, 1, 2, 3, 5][i]], scale: 0.84 }); g.add(k.root); return k; });
    this.title = islandTitle(g, 'الجزيرة الثالثة: كنزُ اللعبِ والنشاط', '#2fae4e');
    this.badges = ['نلعبُ بأمان', 'لا نؤذي أحداً', 'لا نكسرُ الأشياء'].map(s => { const m = bb(badgeMesh(s, { width: 1.7, px: 80, border: '#35b85a' })); g.add(m); return m; });
    this.dust = W.makeDust(g, 120, [[-6, 0, -5], [6, 5, 5]], '#b8ffbf', 0.13, 21);
  },
  update(t) {
    const g1 = B('G1'), g2 = B('G2'), g3 = B('G3');
    this.base.update(t);
    girl.root.visible = true;
    setShawl(t, this.start + 0.5, SHAWL.education, SHAWL.play);
    const circleT = g3.start + 0.2;
    const inCircle = t > circleT;
    // star character dancing
    const st = WF('G1', 'نجمه');
    const sa = (t - st) * 1.1;
    const big = pulse(t, WF('G1', 'اللعب', 1) - 0.2, WF('G1', 'اللعب', 1) + 1.0, 0.25);
    const sp = new THREE.Vector3(Math.cos(sa) * 2.0 + 0.6, 0.9 + Math.abs(Math.sin(t * 3.2)) * 0.6 + big * 0.9, Math.sin(sa) * 1.4 + 0.3);
    if (inCircle) sp.set(0.2, 3.0 + Math.sin(t * 2) * 0.2, 0.0);
    popIn(this.star, t, st - 0.2, 0.6, Infinity, 0.5, 0.85);
    this.star.position.copy(sp);
    this.star.rotation.set(0, Math.sin(t * 2) * 0.5 + big * Math.PI * 2 * seg(t, WF('G1', 'اللعب', 1) - 0.2, WF('G1', 'اللعب', 1) + 0.8), Math.sin(t * 3.2) * 0.2);
    this.trail.forEach((s, i) => {
      const dt = (i + 1) * 0.06; const ta = (t - dt - st) * 1.1;
      const p = inCircle ? new THREE.Vector3(0.2 + Math.cos(t * 2 - i * 0.3) * 0.6, 3 - i * 0.05, Math.sin(t * 2 - i * 0.3) * 0.6) : new THREE.Vector3(Math.cos(ta) * 2.0 + 0.6, 0.9 + Math.abs(Math.sin((t - dt) * 3.2)) * 0.6, Math.sin(ta) * 1.4 + 0.3);
      s.position.copy(p); s.material.opacity = t > st ? (1 - i / this.trail.length) * 0.85 : 0; s.scale.setScalar(0.28 * (1 - i / 30));
    });
    // girl
    const gx = 1.7, gz = 2.3;
    const jumpy = pulse(t, g2.voice, WF('G2', 'اقوي') + 0.6, 0.3);
    if (!inCircle) {
      girl.root.position.set(gx, 0, gz);
      girl.root.rotation.y = lerp(-0.25, -0.6, smooth(seg(t, WF('G2', 'اختلفت') - 0.5, WF('G2', 'اختلفت') + 0.5)));
      girl.update({ t, talk: talkAt(t), jump: jumpy * Math.max(0, Math.sin(t * 7)) * 0.22, armL: jumpy > 0.1 ? [2.4 * jumpy, 0.4] : null, armR: jumpy > 0.1 ? [2.4 * jumpy, 0.4] : null, elbowL: 0.1, elbowR: 0.1, yaw: Math.sin(sa) * 0.25 });
    }
    shawlSwirl(t, this.start + 0.5, [gx, 0, gz], '#b8ffbf');
    // runners in the background
    this.runners.forEach((k, i) => {
      k.root.visible = !inCircle;
      const a = t * 0.7 + i * Math.PI;
      k.root.position.set(-2.5 + Math.cos(a) * 2.2, Math.max(0, Math.sin(t * 9 + i)) * 0.05, -2.8 + Math.sin(a) * 1.3);
      k.root.rotation.y = -a; k.update({ t, walk: 1.3, walkPhase: t * 10 + i, smile: 1.2 });
    });
    // the two friends: tug of war over the ball, then sit and share
    const dT = WF('G2', 'اختلفت'), calmT = WF('G2', 'نتكلم'), shareT = WF('G2', 'هكذا');
    const tug = pulse(t, dT - 0.3, calmT - 0.1, 0.4);
    const sit = smooth(seg(t, calmT, calmT + 1.0));
    const ax = -1.5, bx = -0.2, z = 1.2;
    this.a.root.visible = this.b.root.visible = this.ball.visible = !inCircle;
    this.a.root.position.set(ax - tug * 0.1 + sit * 0.05, 0, z); this.a.root.rotation.y = Math.PI / 2;
    this.b.root.position.set(bx + tug * 0.1 - sit * 0.05, 0, z); this.b.root.rotation.y = -Math.PI / 2;
    const playBall = 1 - Math.max(tug, sit);
    const pass = Math.sin(t * 2.4);
    this.ball.position.set(lerp(ax, bx, 0.5) + pass * 0.45 * playBall, 0.17 + Math.abs(Math.cos(t * 2.4)) * 0.6 * playBall + tug * 0.6 + sit * 0.0, z);
    this.ball.rotation.z = -t * 3 * playBall;
    const share = smooth(seg(t, shareT - 1.2, shareT));
    for (const [k, s] of [[this.a, 1], [this.b, -1]]) {
      k.update({
        t, sit, bow: -tug * 0.15, sad: tug * 0.9 * (1 - sit), smile: 1 - tug * 0.8 + share * 0.3,
        armL: tug > 0.01 ? [1.45 * tug, 0.0] : (sit > 0.01 ? [lerp(0.12, 0.9, share), 0.1] : null),
        armR: tug > 0.01 ? [1.45 * tug, 0.0] : (sit > 0.01 ? [lerp(0.12, 0.9, share), 0.1] : null),
        elbowL: 0.1 + sit * 0.5, elbowR: 0.1 + sit * 0.5,
        talk: (t > calmT && t < shareT ? (s > 0 ? Math.max(0, Math.sin(t * 2)) : Math.max(0, -Math.sin(t * 2))) * (0.4 + 0.4 * Math.sin(t * 15)) : 0),
        pitch: sit * 0.12, jump: playBall * Math.max(0, Math.sin(t * 4.8 + s)) * 0.03,
      });
    }
    if (sit > 0.5) this.ball.position.set(lerp(ax, bx, 0.5), 0.3 + share * 0.05, z);
    // holding hands in a circle (G3)
    this.circle.forEach((k, i) => { k.root.visible = inCircle; });
    if (inCircle) {
      const all = [girl, ...this.circle];
      const spin = (t - circleT) * 0.5 * smooth(seg(t, circleT, circleT + 1.5));
      all.forEach((k, i) => {
        const a = spin + (i / all.length) * Math.PI * 2;
        const R = 1.25;
        k.root.position.set(0.2 + Math.cos(a) * R, Math.max(0, Math.sin(t * 6.3 + i)) * 0.04, Math.sin(a) * R);
        k.root.rotation.y = -a - Math.PI / 2;      // face the centre
        k.update({ t, armL: [0.5, 1.15], armR: [0.5, 1.15], elbowL: 0.05, elbowR: 0.05, walk: 0.6, walkPhase: t * 6 + i, smile: 1.3, talk: k === girl ? talkAt(t) : 0, pitch: -0.1 });
      });
    }
    const bt = [WF('G2', 'بامان'), WF('G2', 'نوذي'), WF('G2', 'نكسر')];
    this.badges.forEach((m, i) => { popIn(m, t, bt[i] - 0.15, 0.5, dT - 0.6, 0.4); m.position.set(-1.6 + i * 1.9, 2.6 + (i % 2) * 0.15, 0.6); });
    popIn(this.title, t, g1.voice - 0.2, 0.7, WF('G1', 'هذه') - 0.1, 0.5);
    this.title.position.set(0.2, 3.6, 0);
    this.dust.userData.update(t, -0.3);
  },
  cam(t) {
    const g1 = B('G1'), g2 = B('G2'), g3 = B('G3');
    const dT = WF('G2', 'اختلفت');
    const spinIn = seg(t, this.start, this.start + 2.2);
    const a = lerp(-Math.PI * 1.1, 0, easeOut(spinIn));
    const intro = { p: [Math.sin(a) * lerp(16, 9, spinIn) + 0.4, lerp(7, 2.6, easeOut(spinIn)), Math.cos(a) * lerp(16, 9, spinIn)], l: [0.3, 1.5, 0], f: 42 };
    if (t < this.start + 2.2) return intro;
    return camAt(t, [
      { t: this.start + 2.2, p: intro.p, l: intro.l, f: 42 },
      { t: WF('G1', 'نجمه'), p: [2.8, 1.9, 7.6], l: [0.8, 1.2, 0.8], f: 40 },
      { t: g2.voice, p: [3.4, 1.7, 7.0], l: [1.2, 1.1, 1.4], f: 40 },
      { t: dT - 0.5, p: [1.0, 2.2, 7.8], l: [-0.2, 1.2, 0.8], f: 40 },
      { t: dT + 0.3, p: [-0.85, 1.25, 4.3], l: [-0.85, 0.75, 1.2], f: 40 },
      { t: g2.end, p: [-0.4, 1.1, 3.9], l: [-0.85, 0.55, 1.2], f: 38 },
      { t: g3.start + 0.6, p: [3.8, 4.0, 6.8], l: [0.2, 0.9, 0], f: 42 },
      { t: this.end, p: [-3.6, 4.4, 6.2], l: [0.2, 0.9, 0], f: 42 },
    ]);
  },
  focusObj: () => girl.root.position.clone().add(new THREE.Vector3(-1.2, 0.8, -0.6)),
});

// ================================================================== HEALTH
defScene({
  id: 'health',
  env: { top: '#ffa9c9', mid: '#ffe1ec', bot: '#fff7fa', sun: [0.3, 0.4, -1], sunCol: '#fff0f4', sunAmt: 0.8, hemiSky: '#ffe6ef', hemiGround: '#c8e6b0', hemiI: 1.25, sunI: 2.5, sunPos: [8, 14, 8], fog: [30, 170], exposure: 1.02 },
  build(g) {
    this.base = islandScene(g, { grass: '#b5e3a7', seed: 5, cloud: '#fff2f7' });
    this.heart = W.makeHeart(g, 1.25, '#ff6f9f'); this.heart.position.set(0.6, 2.2, -4.2);
    this.heartGlow = sprite(glowTex(), '#ff9ec0', 7, g, [0.6, 2.2, -4.5], 0.5);
    this.canopy = W.makeCanopy(g, [-2.8, 0, -0.6]);
    mesh(new THREE.BoxGeometry(1.4, 0.06, 0.7), std('#ffffff'), g, [-2.4, 0.62, -0.9]);
    for (const [x, z] of [[-3.0, -1.15], [-1.8, -1.15], [-3.0, -0.65], [-1.8, -0.65]]) mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.62, 8), std('#e0e0e0'), g, [x, 0.31, z]);
    [['apple', -2.9, -0.95], ['orange', -2.65, -0.8], ['grapes', -2.35, -0.95], ['banana', -2.05, -0.85], ['water', -1.85, -1.05], ['apple', -2.5, -1.1]].forEach(([k, x, z]) => W.makeFruit(g, k, [x, 0.72, z]));
    // wash basin
    this.basin = group(g, [-4.3, 0, 0.2]);
    mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.65, 16), std('#ffffff'), this.basin, [0, 0.33, 0]);
    mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.16, 28), std('#ffffff', { roughness: 0.2 }), this.basin, [0, 0.72, 0]);
    mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.02, 28), new THREE.MeshPhysicalMaterial({ color: '#8fdcff', roughness: 0.05, transparent: true, opacity: 0.8 }), this.basin, [0, 0.78, 0]);
    mesh(new THREE.TorusGeometry(0.12, 0.025, 8, 16, Math.PI), std('#c0c8d0', { metalness: 0.9, roughness: 0.2 }), this.basin, [0, 0.9, -0.2], [0, Math.PI / 2, 0]);
    this.stream = mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.14, 8), new THREE.MeshPhysicalMaterial({ color: '#bfefff', transparent: true, opacity: 0.7, roughness: 0 }), this.basin, [0, 0.84, -0.08]);
    this.bubbles = [];
    const bm = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.05, transparent: true, opacity: 0.35, iridescence: 1, iridescenceIOR: 1.4, clearcoat: 1, depthWrite: false });
    for (let i = 0; i < 16; i++) { const b = mesh(new THREE.SphereGeometry(0.06 + (i % 4) * 0.025, 16, 12), bm, g); b.castShadow = false; this.bubbles.push(b); }
    this.washer = makeKid({ ...KIDS[4], scale: 0.82 }); g.add(this.washer.root);
    this.drinker = makeKid({ ...KIDS[3], scale: 0.82 }); g.add(this.drinker.root);
    this.glass = W.makeFruit(g, 'water', [0, 0, 0]);
    this.eater = makeKid({ ...KIDS[0], scale: 0.82 }); g.add(this.eater.root);
    this.apple = W.makeFruit(g, 'apple', [0, 0, 0]);
    this.bench = W.makeBench(g, [2.6, 0, 1.0]); this.bench.rotation.y = -0.35;
    this.sad = makeKid({ ...KIDS[1], scale: 0.82 }); g.add(this.sad.root);
    this.doc = makeKid({ adult: true, scale: 1.32, coat: true, style: 'girl', hijab: '#ffffff', dress: '#7fb8d6', legs: '#4c6b85', shoes: '#ffffff', skin: '#d9a07a', seed: 31, shawl: false });
    g.add(this.doc.root);
    this.title = islandTitle(g, 'الجزيرة الرابعة: كنزُ الصحّةِ والعنايةِ بالنفس', '#ff4f8f');
    this.badges = ['طعامٌ مفيد', 'ماء', 'نظافة', 'نوم'].map(s => { const m = bb(badgeMesh(s, { width: 1.1, px: 80, border: '#ff6fa8' })); g.add(m); return m; });
    this.faces = ['happy', 'sad', 'calm', 'happy', 'calm'].map(k => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: faceTex(k), transparent: true, depthWrite: false })); g.add(s); return s; });
    this.fstars = this.faces.map(() => sprite(starTex(), '#fff2a8', 0.1, g, [0, 0, 0], 0));
    this.moon = W.makeStarIcon('#ffe28a', 0.25); g.add(this.moon);
  },
  update(t) {
    const h1 = B('H1'), h2 = B('H2'), h3 = B('H3');
    this.base.update(t);
    girl.root.visible = true;
    setShawl(t, this.start + 0.4, SHAWL.play, SHAWL.health);
    // heart dome pulse (heartbeat)
    const hb = WF('H1', 'قبه');
    const app = easeBack(seg(t, hb - 0.4, hb + 0.6));
    const beat = (x => Math.exp(-((x % 1) * 9)) + 0.6 * Math.exp(-(((x + 0.72) % 1) * 9)))(t * 1.1);
    this.heart.visible = app > 0.01; this.heart.scale.setScalar(Math.max(0.001, app * (1 + beat * 0.05)));
    this.heart.rotation.y = Math.sin(t * 0.6) * 0.25; this.heart.position.y = 2.3 + Math.sin(t * 1.1) * 0.08;
    this.heartGlow.material.opacity = app * (0.35 + beat * 0.3);
    // canopy activities
    this.washer.root.position.set(-4.3, 0, 0.75); this.washer.root.rotation.y = Math.PI;
    const rub = Math.sin(t * 9) * 0.12;
    this.washer.update({ t, armL: [1.0, -0.15 + rub], armR: [1.0, -0.15 - rub], elbowL: 0.9, elbowR: 0.9, pitch: 0.35, smile: 1.1 });
    this.stream.scale.y = 1 + Math.sin(t * 20) * 0.1;
    this.bubbles.forEach((b, i) => {
      const life = 2.6, k = (((t * 0.9 + i * 0.37) % life) + life) % life / life;
      b.position.set(-4.3 + Math.sin(i * 7 + t) * 0.35, 0.85 + k * 2.0, 0.45 + Math.cos(i * 3) * 0.3);
      b.scale.setScalar(Math.sin(k * Math.PI) * (k < 0.95 ? 1 : 0)); b.visible = b.scale.x > 0.01;
    });
    this.drinker.root.position.set(-1.2, 0, 0.0); this.drinker.root.rotation.y = 0.7;
    const sip = pulse(t, WF('H1', 'نشرب') - 0.6, WF('H1', 'نشرب') + 1.6, 0.4);
    this.drinker.update({ t, armR: [lerp(0.6, 2.0, sip), 0.25], elbowR: lerp(1.2, 1.7, sip), pitch: -0.25 * sip, smile: 1 });
    this.drinker.handR.getWorldPosition(this.glass.position); this.glass.position.y -= 0.04; this.glass.position.z += 0.03;
    this.glass.rotation.x = -sip * 0.9;
    this.eater.root.position.set(-2.5, 0, 0.45); this.eater.root.rotation.y = 0.15;
    const bite = Math.max(0, Math.sin(t * 1.7));
    this.eater.update({ t, armL: [lerp(0.8, 2.1, bite), 0.2], elbowL: lerp(1.0, 1.6, bite), talk: bite > 0.8 ? 0.3 : 0, smile: 1.1 });
    this.eater.handL.getWorldPosition(this.apple.position);
    // girl + bench + doctor (H2)
    const sitT = h2.start + 0.4, docT = WF('H2', 'طبيب', 0);
    const gw = walkTo(t, sitT, sitT + 1.6, [0.6, 2.4], [2.55, 1.6]);
    const sitK = smooth(seg(t, sitT + 1.5, sitT + 2.3));
    const startPos = [0.4, 2.0];
    const pre = t < sitT;
    girl.root.position.set(pre ? startPos[0] : gw.x, 0, pre ? startPos[1] : gw.z);
    girl.root.rotation.y = pre ? lerp(0.0, -0.4, Math.sin(t * 0.4) * 0.5 + 0.5) : (gw.walk > 0.05 ? gw.yaw : lerp(gw.yaw, -0.35, smooth(seg(t, sitT + 1.4, sitT + 2.0))));
    const holdHand = smooth(seg(t, sitT + 2.2, sitT + 3.0));
    const lookFriend = smooth(seg(t, sitT + 2.0, sitT + 2.6)) * (1 - smooth(seg(t, docT - 0.8, docT)));
    girl.update({ t, walk: gw.walk, walkPhase: gw.phase, sit: sitK, talk: talkAt(t), armR: holdHand > 0.01 ? [lerp(0.12, 0.7, holdHand), lerp(0.12, 0.55, holdHand)] : null, elbowR: 0.3, yaw: -0.9 * lookFriend + 0.4 * smooth(seg(t, docT - 0.8, docT)), smile: 1 - 0.3 * lookFriend });
    shawlSwirl(t, this.start + 0.4, [startPos[0], 0, startPos[1]], '#ffb8d4');
    this.sad.root.position.set(3.15 - 0.08, 0, 0.8); this.sad.root.rotation.y = -0.35;
    const cheer = smooth(seg(t, docT, docT + 1.5));
    this.sad.update({ t, sit: 1, sad: 1 - cheer, pitch: lerp(0.4, -0.05, cheer), smile: lerp(0.2, 1.1, cheer), armL: [lerp(0.5, 0.45, cheer), 0.1], elbowL: 0.9, armR: [0.5, 0.1], elbowR: 0.9, yaw: lerp(0, 0.6, cheer) });
    const dw = walkTo(t, docT - 1.6, docT + 0.4, [7, 4], [3.6, 2.3]);
    this.doc.root.visible = t > docT - 1.7;
    this.doc.root.position.set(dw.x, 0, dw.z);
    this.doc.root.rotation.y = dw.walk > 0.05 ? dw.yaw : lerp(dw.yaw, lookYaw(3.6, 2.3, 3.0, 0.9), smooth(seg(t, docT + 0.3, docT + 1.0)));
    const kneelD = smooth(seg(t, docT + 0.8, docT + 1.8)) * (1 - smooth(seg(t, h3.start + 1.5, h3.start + 2.5)));
    this.doc.update({ t, walk: dw.walk, walkPhase: dw.phase, kneel: kneelD, smile: 1.2, armR: kneelD > 0.3 ? [0.9, 0.2] : null, elbowR: 0.4, pitch: 0.2 });
    // badges for H1 healthy habits
    const bw = [WF('H1', 'طعاما'), WF('H1', 'الماء'), WF('H1', 'نغسل'), WF('H1', 'النوم')];
    const bpos = [[-2.5, 1.95, -0.2], [-1.2, 2.05, 0.2], [-4.3, 2.0, 0.6], [0.9, 2.2, 1.6]];
    this.badges.forEach((m, i) => { popIn(m, t, bw[i] - 0.2, 0.5, h1.end - 0.3, 0.4); m.position.set(...bpos[i]); });
    popIn(this.moon, t, bw[3] - 0.2, 0.5, h1.end - 0.3, 0.4, 1); this.moon.position.set(0.9, 2.75, 1.6); this.moon.rotation.y = t;
    // feelings float up and become stars (H3)
    const fT = h3.voice + 0.4;
    this.faces.forEach((s, i) => {
      const k = seg(t, fT + i * 0.45, fT + i * 0.45 + 3.6);
      const src = [[3.0, 1.3, 0.9], [2.4, 1.3, 1.6], [-1.2, 1.3, 0.0], [-2.5, 1.3, 0.45], [-4.3, 1.3, 0.75]][i];
      const y = src[1] + easeOut(k) * 3.2;
      const toStar = seg(k, 0.62, 0.85);
      s.position.set(src[0] + Math.sin(k * 6 + i) * 0.25, y, src[2]);
      s.material.opacity = k > 0 ? (1 - toStar) : 0; s.scale.setScalar(0.55 * easeBack(seg(k, 0, 0.15)) * (1 - toStar * 0.5));
      const st = this.fstars[i]; st.position.copy(s.position);
      st.material.opacity = k > 0 ? toStar * (0.7 + 0.3 * Math.sin(t * 6 + i)) : 0; st.scale.setScalar(0.2 + toStar * 0.9);
    });
    popIn(this.title, t, h1.voice - 0.2, 0.7, WF('H1', 'هنا') - 0.1, 0.5);
    this.title.position.set(0.3, 3.6, 0);
  },
  cam(t) {
    const h1 = B('H1'), h2 = B('H2'), h3 = B('H3');
    return camAt(t, [
      { t: this.start, p: [2, 9, 15], l: [0, 2, -2], f: 42 },
      { t: h1.voice + 0.5, p: [0.8, 2.8, 10.5], l: [0.2, 2.2, -1], f: 40 },
      { t: WF('H1', 'طعاما') - 0.6, p: [-1.0, 2.0, 6.8], l: [-1.6, 1.1, -0.4], f: 40 },
      { t: WF('H1', 'النوم') + 0.5, p: [-3.4, 1.9, 5.6], l: [-3.2, 1.1, 0.0], f: 40 },
      { t: h2.start + 0.6, p: [0.3, 2.0, 7.5], l: [1.6, 1.0, 1.4], f: 40 },
      { t: h2.voice + 2.4, p: [3.3, 1.35, 4.9], l: [2.8, 0.85, 1.0], f: 38 },
      { t: h2.end, p: [5.0, 1.8, 5.8], l: [3.0, 1.0, 1.2], f: 40 },
      { t: h3.voice + 0.6, p: [1.8, 1.8, 8.6], l: [0.4, 1.6, 0.4], f: 42 },
      { t: this.end, p: [1.0, 2.6, 10.0], l: [0.0, 3.4, 0.0], f: 44 },
    ]);
  },
  focusObj: () => girl.root.position.clone().add(new THREE.Vector3(0, 0.9, 0)),
});

// ================================================================== RESPECT
defScene({
  id: 'respect',
  env: { top: '#9f86f0', mid: '#e8dcff', bot: '#fff3fb', sun: [-0.3, 0.3, -1], sunCol: '#ffeef8', sunAmt: 1, hemiSky: '#ece4ff', hemiGround: '#c9dba7', hemiI: 1.25, sunI: 2.5, sunPos: [-6, 13, 9], fog: [30, 180], exposure: 1.03 },
  build(g) {
    this.base = islandScene(g, { grass: '#a9d98f', seed: 6, cloud: '#f8f2ff' });
    const hill = new THREE.SphereGeometry(3.2, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    mesh(hill, std('#9fd48a', { roughness: 0.9 }), g, [0, -0.05, -4.2], null, [1.3, 0.42, 1]);
    this.flag = W.makeFlag(g, 'كنزُ الاحترام'); this.flag.position.set(-0.6, 1.25, -4.2);
    this.kids = KIDS.map((k, i) => { const m = makeKid({ ...k, scale: 0.84 }); g.add(m.root); return m; });
    this.symbols = [];
    const geos = [new THREE.SphereGeometry(0.22, 24, 16), new THREE.BoxGeometry(0.34, 0.34, 0.34), new THREE.ConeGeometry(0.22, 0.42, 24), new THREE.TorusGeometry(0.17, 0.07, 12, 28), new THREE.OctahedronGeometry(0.25), new THREE.DodecahedronGeometry(0.23)];
    const cols = ['#5aa9ff', '#ffd23f', '#5ed67a', '#ff8fc0', '#a77bff', '#ff7a59'];
    geos.forEach((geo, i) => { const m = mesh(geo, new THREE.MeshPhysicalMaterial({ color: cols[i], roughness: 0.2, clearcoat: 1, emissive: new THREE.Color(cols[i]), emissiveIntensity: 0.25 }), g); this.symbols.push(m); });
    this.symbols.push(W.makeStarIcon('#ffffff', 0.3)); g.add(this.symbols[6]);
    this.symbols.push(W.makeHeart(g, 0.2, '#ff5c93'));
    this.ringGlow = mesh(new THREE.TorusGeometry(1.3, 0.025, 8, 80), new THREE.MeshBasicMaterial({ color: '#fff3c0', transparent: true, opacity: 0, toneMapped: false }), g);
    this.title = islandTitle(g, 'الجزيرة الخامسة: كنزُ الاحترامِ والكرامة', '#7a4fd0');
    this.badges = ['لا نسخر', 'لا نجرحُ بالكلام', 'لا نرفعُ أصواتنا'].map(s => { const m = bb(badgeMesh(s, { width: 1.6, px: 80, border: '#7a4fd0' })); g.add(m); return m; });
    this.dust = W.makeDust(g, 140, [[-6, 0, -6], [6, 6, 4]], '#ffe9ff', 0.13, 31);
  },
  update(t) {
    const r1 = B('R1'), r2 = B('R2');
    this.base.update(t);
    girl.root.visible = true;
    setShawl(t, this.start + 0.6, SHAWL.health, SHAWL.respect);
    this.flag.userData.update(t);
    // semicircle of children (girl in the middle)
    const all = [this.kids[0], this.kids[1], this.kids[2], girl, this.kids[3], this.kids[4], this.kids[5]];
    const bowT = WF('R2', 'بلطف');
    const pairs = smooth(seg(t, r2.start, r2.start + 1));
    const bow = pulse(t, bowT - 0.4, bowT + 1.8, 0.5);
    all.forEach((k, i) => {
      const a = lerp(-1.05, 1.05, i / (all.length - 1));
      const R = 2.6;
      const x = Math.sin(a) * R, z = 0.4 + Math.cos(a) * R * 0.55 - 0.7;
      k.root.position.set(x, 0, z);
      const toCam = 0, toCenter = lookYaw(x, z, 0, -0.6);
      const pairYaw = i % 2 === 0 ? lookYaw(x, z, Math.sin(lerp(-1.05, 1.05, (i + 1) / 6)) * R, z) : lookYaw(x, z, Math.sin(lerp(-1.05, 1.05, (i - 1) / 6)) * R, z);
      const listen = r1.voice;
      let yaw = lerp(toCam, toCenter * 0.6, smooth(seg(t, listen, listen + 1)));
      if (k !== girl) yaw = lerp(yaw, pairYaw, pairs * (1 - smooth(seg(t, WF('R2', 'حتي') - 0.5, WF('R2', 'حتي') + 0.5))));
      k.root.rotation.y = yaw;
      const nod = Math.sin(t * 2 + i) * 0.06;
      k.update({ t, bow: bow * 0.65, smile: 1.2, talk: k === girl ? talkAt(t) : 0, pitch: nod, armL: bow > 0.1 ? [0.2 + bow * 0.3, 0.05] : null, armR: bow > 0.1 ? [0.2 + bow * 0.3, 0.05] : null });
    });
    // floating symbols: scattered orbit -> harmonious ring
    const ringT = WF('R2', 'مكان');
    const unite = smooth(seg(t, ringT - 0.6, ringT + 1.2));
    this.symbols.forEach((m, i) => {
      const n = this.symbols.length;
      const app = easeBack(seg(t, r2.start + 0.5 + i * 0.15, r2.start + 1.2 + i * 0.15));
      const a1 = t * (0.4 + i * 0.07) + i * 1.7;
      const scat = new THREE.Vector3(Math.cos(a1) * (1.6 + (i % 3) * 0.6), 2.4 + Math.sin(t * 0.9 + i) * 0.6, Math.sin(a1) * 1.2 - 0.6);
      const a2 = t * 0.5 + (i / n) * Math.PI * 2;
      const ring = new THREE.Vector3(Math.cos(a2) * 1.3, 2.75 + Math.sin(a2) * 0.0, Math.sin(a2) * 1.3 - 0.6);
      m.position.copy(scat.lerp(ring, unite));
      m.visible = app > 0.01; m.scale.setScalar(Math.max(0.001, app));
      m.rotation.set(t * 0.7 + i, t * 0.9 + i, 0);
    });
    this.ringGlow.position.set(0, 2.75, -0.6); this.ringGlow.rotation.x = Math.PI / 2;
    this.ringGlow.material.opacity = unite * (0.6 + 0.3 * Math.sin(t * 3));
    const bt = [WF('R2', 'نسخر'), WF('R2', 'نجرح'), WF('R2', 'نرفع')];
    this.badges.forEach((m, i) => { popIn(m, t, bt[i] - 0.15, 0.5, ringT - 1.0, 0.4); m.position.set(-1.8 + i * 1.8, 2.2 + (i % 2) * 0.2, 1.3); });
    popIn(this.title, t, r1.voice - 0.2, 0.7, WF('R1', 'اخر') - 0.1, 0.5);
    this.title.position.set(0, 4.3, -1);
    this.dust.userData.update(t, -0.3);
  },
  cam(t) {
    const r1 = B('R1'), r2 = B('R2');
    const flagT = WF('R1', 'علم');
    const sweep = seg(t, this.start, r1.voice + 1.2);
    const a = lerp(1.6, 0.15, easeOut(sweep));
    const intro = { p: [Math.sin(a) * lerp(22, 10, easeOut(sweep)), lerp(11, 3.4, easeOut(sweep)), Math.cos(a) * lerp(22, 10, easeOut(sweep))], l: [0, lerp(0, 2.2, sweep), -1.5], f: 42 };
    if (t < r1.voice + 1.2) return intro;
    return camAt(t, [
      { t: r1.voice + 1.2, p: intro.p, l: intro.l, f: 42 },
      { t: flagT - 0.4, p: [1.6, 2.6, 4.2], l: [0.2, 3.0, -4.0], f: 40 },
      { t: r1.end, p: [1.2, 3.4, 2.4], l: [-0.1, 3.6, -4.2], f: 40 },
      { t: r2.voice + 0.4, p: [0.0, 1.9, 6.6], l: [0, 1.25, -0.2], f: 42 },
      { t: WF('R2', 'مكان') - 0.2, p: [1.2, 1.7, 6.0], l: [0, 1.5, -0.4], f: 42 },
      { t: this.end, p: [0.0, 1.5, 7.0], l: [0, 2.2, -0.6], f: 44 },
    ]);
  },
  focusObj: () => new THREE.Vector3(0, 1.2, -0.5),
});

// ================================================================== FINALE
defScene({
  id: 'finale',
  env: { top: '#7a8cff', mid: '#ffd6e6', bot: '#ffe6b8', sun: [0, 0.18, -1], sunCol: '#ffd9a0', sunAmt: 1.3, hemiSky: '#ffe6f0', hemiGround: '#ffe0b0', hemiI: 1.35, sunI: 2.3, sunPos: [3, 10, 10], fog: [40, 220], exposure: 1.05 },
  build(g) {
    this.isl = buildSkyIslands(g, 1.25);
    this.isl.forEach(d => { d.label.visible = false; d.holder.position.z -= 6; d.base.z -= 6; });
    this.perch = W.makeIsland({ r: 2.2, h: 2.4, grass: '#b9e39c', seed: 77 }); g.add(this.perch);
    this.orbs = ISL.map((d, i) => {
      const o = group(g);
      mesh(new THREE.SphereGeometry(0.16, 28, 20), new THREE.MeshPhysicalMaterial({ color: d.color, roughness: 0.1, clearcoat: 1, emissive: new THREE.Color(d.color), emissiveIntensity: 0.6 }), o);
      sprite(glowTex(), d.color, 0.9, o, [0, 0, 0], 0.7);
      return o;
    });
    this.confetti = W.makeConfetti(g, 240, 3);
    this.t1 = titleMesh('كلُّ عامٍ وأنتم بخير', { width: 5.0, px: 200 }); g.add(this.t1);
    this.t2 = titleMesh('يومُ الطفلِ العالمي', { width: 3.0, px: 170, face: ['#ffffff', '#c9b6ff', '#8e6cf0'], side: '#4b2c8f', glow: 'rgba(170,140,255,.9)' }); g.add(this.t2);
    this.clouds = W.cloudField(g, 88, 22, [9, 50], [-8, -3], [3, 8], '#fff1f6');
  },
  update(t) {
    const L = t - this.start;
    girl.root.visible = true;
    girl.shawlMat.color.set(SHAWL.finale);
    girl.root.position.set(0, 0, 0); girl.root.rotation.y = 0;
    const wave = pulse(t, WF('F1', 'كل') - 0.3, this.end - 0.5, 0.4);
    girl.update({ t, talk: talkAt(t), smile: 1.3, armR: [lerp(0.12, 2.6, wave) , 0.4], elbowR: 0.3 + 0.25 * Math.sin(t * 8) * wave, jump: Math.max(0, Math.sin(L * 3)) * 0.04 });
    this.orbs.forEach((o, i) => {
      const a = L * 0.9 + (i / 5) * Math.PI * 2;
      const k = easeBack(seg(L, 0.3 + i * 0.25, 1.0 + i * 0.25));
      o.position.set(Math.cos(a) * 1.7, 0.35 + Math.sin(L * 2 + i) * 0.12 + k * 0.15, Math.sin(a) * 1.4);
      o.scale.setScalar(Math.max(0.001, k));
    });
    this.isl.forEach((d, i) => { d.holder.position.y = d.base.y + Math.sin(t * 0.6 + i) * 0.25; d.icon.rotation.y = t * 0.6 + i; d.glow.material.opacity = 0.7; });
    this.confetti.userData.update(L);
    this.confetti.visible = L > WF('F1', 'كل') - this.start - 0.2;
    popIn(this.t1, t, WF('F1', 'كل') - 0.2, 0.8);
    this.t1.position.set(0, 2.95 + Math.sin(t * 1.2) * 0.04, 0.3);
    popIn(this.t2, t, WF('F1', 'كل') + 0.6, 0.8);
    this.t2.position.set(0, 2.32, 0.6);
    this.clouds.userData.update(t);
  },
  cam(t) {
    return camAt(t, [
      { t: this.start, p: [0.6, 1.3, 3.2], l: [0, 1.0, 0], f: 40 },
      { t: WF('F1', 'كل') - 0.4, p: [0.2, 1.6, 5.0], l: [0, 1.5, 0], f: 40 },
      { t: this.end, p: [0, 2.2, 7.8], l: [0, 1.9, -2], f: 44 },
    ]);
  },
  focus: 5,
});

// sanitize degenerate normals (NaN pixels would spread through the bloom blur)
scene.traverse(o => {
  const n = o.geometry && o.geometry.attributes && o.geometry.attributes.normal;
  if (!n) return;
  for (let i = 0; i < n.array.length; i += 3) if (!isFinite(n.array[i]) || !isFinite(n.array[i + 1]) || !isFinite(n.array[i + 2]) || (n.array[i] === 0 && n.array[i + 1] === 0 && n.array[i + 2] === 0)) { n.array[i] = 0; n.array[i + 1] = 1; n.array[i + 2] = 0; }
  n.needsUpdate = true;
});

// ------------------------------------------------------------------ transitions & captions (2D)
const out = document.createElement('canvas'); out.width = WIDTH; out.height = HEIGHT;
const og = out.getContext('2d');
og.imageSmoothingEnabled = true; og.imageSmoothingQuality = 'high';
document.body.appendChild(out);

const boundaries = SCENES.slice(1).map(s => s.start);
function cloudWipe(t) {
  for (const b of boundaries) {
    const k = seg(t, b - 0.75, b + 0.75);
    if (k <= 0 || k >= 1) continue;
    const cover = Math.sin(k * Math.PI);
    const r = rng(Math.floor(b * 10));
    og.save();
    for (let i = 0; i < 46; i++) {
      const bx = r() * WIDTH * 1.4 - WIDTH * 0.2, by = r() * HEIGHT, rad = (160 + r() * 260) * (WIDTH / 1920);
      const dx = lerp(WIDTH * 1.1, -WIDTH * 0.3, k) * (0.6 + r() * 0.4);
      const x = bx + dx - WIDTH * 0.35;
      const gr = og.createRadialGradient(x, by, 0, x, by, rad * cover * 1.4);
      gr.addColorStop(0, `rgba(255,255,255,${0.95 * cover})`); gr.addColorStop(0.6, `rgba(255,252,246,${0.75 * cover})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      og.fillStyle = gr; og.beginPath(); og.arc(x, by, rad * cover * 1.4, 0, 7); og.fill();
    }
    og.fillStyle = `rgba(255,255,255,${Math.max(0, cover - 0.35) * 1.3})`; og.fillRect(0, 0, WIDTH, HEIGHT);
    og.restore();
  }
}

// caption chunks
const CHUNKS = [];
for (const b of TL.beats) {
  let cur = [];
  b.words.forEach((w, i) => {
    cur.push(w);
    const end = /[،.!؟:]$/.test(w.w) || w.w.endsWith('..');
    if ((end && cur.length >= 3) || cur.length >= 9 || i === b.words.length - 1) { CHUNKS.push({ words: cur, t0: cur[0].t, t1: cur[cur.length - 1].t + cur[cur.length - 1].d }); cur = []; }
    else if (end && cur.length < 3 && i < b.words.length - 1) { /* keep short pieces with the next */ }
  });
}
CHUNKS.forEach((c, i) => { c.show0 = c.t0 - 0.12; c.show1 = Math.min(i + 1 < CHUNKS.length ? CHUNKS[i + 1].t0 - 0.12 : c.t1 + 1, c.t1 + 1.2); });

function captions(t) {
  const c = CHUNKS.find(c => t >= c.show0 && t < c.show1);
  if (!c) return;
  const a = Math.min(seg(t, c.show0, c.show0 + 0.15), 1 - seg(t, c.show1 - 0.15, c.show1));
  const px = Math.round(HEIGHT * 0.046);
  og.save(); og.globalAlpha = a;
  og.font = `800 ${px}px Cairo`; og.direction = 'rtl'; og.textBaseline = 'middle';
  const sp = og.measureText(' ').width;
  const widths = c.words.map(w => og.measureText(w.w).width);
  const total = widths.reduce((s, v) => s + v, 0) + sp * (c.words.length - 1);
  const cy = HEIGHT * 0.9, padX = px * 0.8, h = px * 1.75;
  og.fillStyle = 'rgba(28,32,70,.5)';
  roundRect(og, WIDTH / 2 - total / 2 - padX, cy - h / 2, total + padX * 2, h, h / 2); og.fill();
  let x = WIDTH / 2 + total / 2;
  og.textAlign = 'right';
  c.words.forEach((w, i) => {
    const active = t >= w.t - 0.05 && (i === c.words.length - 1 ? t < w.t + w.d + 0.3 : t < c.words[i + 1].t - 0.05);
    const spoken = t >= w.t;
    og.lineWidth = px * 0.16; og.strokeStyle = 'rgba(20,20,50,.55)'; og.strokeText(w.w, x, cy + px * 0.06);
    og.fillStyle = active ? '#ffd84a' : (spoken ? '#ffffff' : 'rgba(255,255,255,.82)');
    og.fillText(w.w, x, cy + px * 0.06);
    x -= widths[i] + sp;
  });
  og.restore();
}

function vignette() {
  const gr = og.createRadialGradient(WIDTH / 2, HEIGHT / 2, HEIGHT * 0.45, WIDTH / 2, HEIGHT / 2, HEIGHT * 1.05);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(30,20,60,.28)');
  og.fillStyle = gr; og.fillRect(0, 0, WIDTH, HEIGHT);
}

// ------------------------------------------------------------------ frame
const DURATION = TL.duration;
function sceneAt(t) {
  let s = SCENES[0];
  for (const sc of SCENES) if (t >= sc.start - 1e-6) s = sc;
  return s;
}

const tmpV = new THREE.Vector3();
function renderAt(t) {
  const s = sceneAt(t);
  SCENES.forEach(x => (x.group.visible = x === s));
  swirl.visible = false;
  s.update(t);
  envSet(s.envMod ? s.envMod(s.env) : s.env);
  const c = s.cam(t);
  // subtle handheld float
  camera.position.set(c.p[0] + Math.sin(t * 0.7) * 0.03, c.p[1] + Math.sin(t * 0.9 + 1) * 0.025, c.p[2]);
  camera.lookAt(c.l[0], c.l[1], c.l[2]);
  camera.fov = c.f || 40; camera.updateProjectionMatrix();
  for (const m of billboards) m.quaternion.copy(camera.quaternion);
  // depth of field: focus on the subject
  const fp = s.focusObj ? s.focusObj() : null;
  const fd = fp ? camera.position.distanceTo(fp) : (s.focus || camera.position.distanceTo(tmpV.set(...c.l)));
  composer.render();
  og.drawImage(renderer.domElement, 0, 0, WIDTH, HEIGHT);
  vignette();
  cloudWipe(t);
  captions(t);
  // fade in / out
  const fin = 1 - seg(t, 0, 0.6), fout = seg(t, DURATION - 1.4, DURATION - 0.1);
  if (fin > 0) { og.fillStyle = `rgba(255,255,255,${fin})`; og.fillRect(0, 0, WIDTH, HEIGHT); }
  if (fout > 0) { og.fillStyle = `rgba(255,255,255,${fout})`; og.fillRect(0, 0, WIDTH, HEIGHT); }
}

window.DURATION = DURATION;
window.FPS = FPS;
window.renderFrame = (t, q = 0.92) => { renderAt(t); return out.toDataURL('image/jpeg', q); };
window.SCENE_TIMES = SCENES.map(s => ({ id: s.id, start: s.start, end: s.end }));
window.dbg = () => {
  const bad = [];
  scene.traverse(o => { if (!o.visible) return; const e = o.matrixWorld.elements; if (e.some(v => !isFinite(v))) bad.push((o.name || o.type) + ':' + (o.parent && o.parent.type)); const sc = o.scale; if (o.isMesh && (sc.x === 0 || sc.y === 0 || sc.z === 0)) bad.push('zeroScale:' + o.geometry.type); });
  return { cam: camera.position.toArray(), bad: bad.slice(0, 20) };
};
window.ready = true;
