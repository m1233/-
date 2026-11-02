/*
 * Semi-realistic 3D world (Three.js, PBR materials, image-based lighting, soft shadows).
 * Five floating islands + procedurally modelled human characters with realistic
 * proportions (eyes with iris textures, eyelids, lips with lip-sync, hair, clothing).
 * Everything is a pure function of time t -> frame-deterministic rendering.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const io = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const out = k => 1 - Math.pow(1 - k, 3);
const back = k => { const c = 1.3; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const hash = (i, s = 1) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* ---------------- materials ---------------- */
const MC = {};
function std(color, rough = .7, metal = 0, extra = {}) {
  const k = [color, rough, metal, JSON.stringify(extra)].join("|");
  if (!MC[k]) MC[k] = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
  return MC[k];
}
function phys(color, o = {}) { return new THREE.MeshPhysicalMaterial({ color, roughness: .5, ...o }); }
const SKIN = () => phys(0xe8b293, { roughness: .52, sheen: .2, sheenColor: new THREE.Color(0xff8a70), sheenRoughness: .7 });
function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function eyeTex(iris = "#6b3f1d") {
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = "#f6f1ee"; g.fillRect(0, 0, w, h);
    const cx = 64, cy = 64;
    let r = g.createRadialGradient(cx, cy, 0, cx, cy, 70); r.addColorStop(.6, "rgba(0,0,0,0)"); r.addColorStop(1, "rgba(190,110,110,.35)");
    g.fillStyle = r; g.fillRect(0, 0, w, h);
    r = g.createRadialGradient(cx, cy, 2, cx, cy, 21); r.addColorStop(0, "#c8955a"); r.addColorStop(.45, iris); r.addColorStop(.92, "#24130a"); r.addColorStop(1, "#140904");
    g.fillStyle = r; g.beginPath(); g.arc(cx, cy, 21, 0, 6.283); g.fill();
    g.strokeStyle = "rgba(255,220,170,.25)"; g.lineWidth = 1;
    for (let i = 0; i < 36; i++) { const a = i / 36 * 6.283; g.beginPath(); g.moveTo(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9); g.lineTo(cx + Math.cos(a) * 19, cy + Math.sin(a) * 19); g.stroke(); }
    g.fillStyle = "#050302"; g.beginPath(); g.arc(cx, cy, 8.5, 0, 6.283); g.fill();
    g.fillStyle = "rgba(255,255,255,.95)"; g.beginPath(); g.arc(cx - 6, cy - 7, 4, 0, 6.283); g.fill();
    g.fillStyle = "rgba(255,255,255,.5)"; g.beginPath(); g.arc(cx + 7, cy + 6, 2, 0, 6.283); g.fill();
  });
}
const EYE = {};
const eyeMat = iris => (EYE[iris] ||= new THREE.MeshPhysicalMaterial({ map: eyeTex(iris), roughness: .08, clearcoat: 1, clearcoatRoughness: .05 }));

/* ---------------- geometry helpers ---------------- */
function headGeo() {
  const g = new THREE.SphereGeometry(1, 48, 40), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y < 0) { const k = -y; x *= 1 - .3 * k * k; z *= 1 - .14 * k; y *= 1.1; }
    if (z < 0) z *= .97;
    if (z > .3 && y > -.2 && y < .25) z += .03 * Math.cos((y - .02) * 6);          // cheek volume
    p.setXYZ(i, x * .84, y, z * .92);
  }
  g.computeVertexNormals(); return g;
}
const HEAD = headGeo();
function lathe(pts, seg = 40) { return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg); }
function mesh(geo, mat, pos, parent, shadow = true) {
  const m = new THREE.Mesh(geo, mat); if (pos) m.position.copy(pos); m.castShadow = shadow; m.receiveShadow = true; if (parent) parent.add(m); return m;
}
function capsule(r, len, mat, parent, y = -len / 2) { return mesh(new THREE.CapsuleGeometry(r, len, 8, 16), mat, V(0, y, 0), parent); }

/* ======================= HUMAN CHARACTER ======================= */
export function makeHuman(o) {
  const H = o.h, kid = !!o.kid, root = new THREE.Group();
  const skin = SKIN(), top = std(o.top, .85, 0, { }), sleeve = std(o.sleeve || o.top, .85), pants = std(o.bottom || 0x2c3756, .8), shoe = std(0x2a2230, .45);
  const hairM = phys(o.hair || 0x3a2416, { roughness: .45, sheen: .6, sheenColor: new THREE.Color(0x8a5a3a) });
  const hipY = (kid ? .47 : .52) * H, shY = (kid ? .78 : .82) * H, T = shY - hipY;
  const wHip = o.female ? 1.08 : 1, wCh = o.female ? .92 : 1.05, kf = kid ? 1.12 : 1;
  // legs
  const legs = [-1, 1].map(s => {
    const hip = new THREE.Group(); hip.position.set(s * .052 * H * kf, hipY, 0); root.add(hip);
    capsule(.042 * H * kf, .2 * H, pants, hip, -.12 * H);
    const knee = new THREE.Group(); knee.position.y = -.25 * H; hip.add(knee);
    capsule(.034 * H * kf, .19 * H, pants, knee, -.11 * H);
    const sh = mesh(new THREE.CapsuleGeometry(.03 * H * kf, .05 * H, 6, 12), shoe, V(0, -.235 * H, .025 * H), knee); sh.rotation.x = Math.PI / 2; sh.scale.set(1.15, 1, .75);
    return { hip, knee };
  });
  // torso (lathe, flattened front-back)
  const tor = mesh(lathe([[0, hipY - .03 * H], [.095 * H * wHip * kf, hipY], [.083 * H * kf, hipY + .3 * T], [.1 * H * wCh * kf, hipY + .66 * T], [.108 * H * kf, shY - .03 * H], [.06 * H, shY + .012 * H], [.03 * H, shY + .02 * H]]), top, null, root);
  tor.scale.z = .62;
  if (o.coat) { const c = mesh(lathe([[.12 * H, .3 * H], [.11 * H, hipY], [.095 * H, hipY + .3 * T], [.104 * H, hipY + .66 * T], [.112 * H, shY - .03 * H], [.065 * H, shY + .012 * H]]), std(0xf4f6fb, .7), null, root); c.scale.z = .66;
    const st = new THREE.CatmullRomCurve3([V(-.05 * H, shY + .01 * H, .02 * H), V(-.06 * H, shY - .07 * H, .075 * H), V(0, shY - .14 * H, .085 * H), V(.06 * H, shY - .07 * H, .075 * H), V(.05 * H, shY + .01 * H, .02 * H)]);
    mesh(new THREE.TubeGeometry(st, 30, .006 * H, 8), std(0x22252e, .4), null, root);
    mesh(new THREE.CylinderGeometry(.014 * H, .014 * H, .008 * H, 20), std(0xd8dde8, .2, 1), V(0, shY - .145 * H, .088 * H), root).rotation.x = Math.PI / 2; }
  // shoulders + arms
  const arms = [-1, 1].map(s => {
    const shp = new THREE.Group(); shp.position.set(s * .108 * H * kf, shY - .025 * H, 0); root.add(shp);
    mesh(new THREE.SphereGeometry(.031 * H * kf, 16, 12), o.coat ? std(0xf4f6fb, .7) : sleeve, null, shp);
    capsule(.031 * H * kf, .13 * H, o.coat ? std(0xf4f6fb, .7) : sleeve, shp, -.08 * H);
    const el = new THREE.Group(); el.position.y = -.17 * H; shp.add(el);
    capsule(.026 * H * kf, .1 * H, o.coat ? std(0xf4f6fb, .7) : (o.shortSleeve ? skin : sleeve), el, -.06 * H);
    const hand = mesh(new THREE.SphereGeometry(.027 * H * kf, 16, 12), skin, V(0, -.15 * H, 0), el); hand.scale.set(.85, 1.25, .55);
    mesh(new THREE.CapsuleGeometry(.009 * H, .025 * H, 4, 8), skin, V(-s * -.018 * H, -.135 * H, .012 * H), el).rotation.z = s * .6;
    return { shp, el };
  });
  // neck
  mesh(new THREE.CylinderGeometry(.026 * H * kf, .03 * H * kf, .06 * H, 16), skin, V(0, shY + .03 * H, 0), root);
  // head
  const headH = kid ? H / 5.4 : H / 7.4, head = new THREE.Group();
  head.position.set(0, shY + .055 * H + headH * .5, .005 * H); head.scale.setScalar(headH / 2.1); root.add(head);
  const face = buildFace(head, skin, hairM, o);
  return { root, legs, arms, head, face, H };
}
function buildFace(head, skin, hairM, o) {
  mesh(HEAD, skin, null, head);
  [-1, 1].forEach(s => { const e = mesh(new THREE.SphereGeometry(1, 16, 12), skin, V(s * .82, .02, -.04), head); e.scale.set(.12, .22, .09); });
  const eyes = [], lids = [];
  [-1, 1].forEach(s => {
    const eg = new THREE.Group(); eg.position.set(s * .32, .09, .8); head.add(eg);
    const eb = mesh(new THREE.SphereGeometry(.165, 32, 24), eyeMat(o.iris || "#6b3f1d"), null, eg, false); eyes.push(eb);
    const lid = new THREE.Group(); eg.add(lid);
    mesh(new THREE.SphereGeometry(.176, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), skin, null, lid, false);
    const lash = new THREE.Group(); lid.add(lash);
    const lt = mesh(new THREE.TorusGeometry(.177, .018, 8, 32, Math.PI), std(0x1b100a, .6), null, lash, false); lt.rotation.x = Math.PI / 2;
    lids.push(lid);
    const brow = new THREE.QuadraticBezierCurve3(V(s * .15, .34, .9), V(s * .33, .41, .9), V(s * .52, .32, .76));
    mesh(new THREE.TubeGeometry(brow, 16, .032, 8), std(o.brow || 0x3a2416, .8), null, head, false);
  });
  const nose = mesh(new THREE.SphereGeometry(.085, 20, 16), skin, V(0, -.14, .9), head, false); nose.scale.set(1.05, 1.1, 1);
  // mouth with lip-sync
  const mouth = new THREE.Group(); mouth.position.set(0, -.44, .82); head.add(mouth);
  const inner = mesh(new THREE.SphereGeometry(1, 20, 12), std(0x4a1420, .7), V(0, 0, -.02), mouth, false); inner.scale.set(.1, .02, .05);
  const lipM = phys(o.lips || 0xc0646c, { roughness: .35, clearcoat: .4 });
  const arc = Math.PI * .62;
  const up = mesh(new THREE.TorusGeometry(.12, .026, 10, 24, arc), lipM, V(0, -.05, 0), mouth, false); up.rotation.z = Math.PI / 2 - arc / 2; up.scale.set(1, .38, .6);
  const lo = mesh(new THREE.TorusGeometry(.105, .032, 10, 24, arc), lipM, V(0, .07, 0), mouth, false); lo.rotation.z = -Math.PI / 2 - arc / 2; lo.scale.set(1, .38, .6);
  // hair
  const style = o.hairStyle || "short";
  const capH = mesh(new THREE.SphereGeometry(1.09, 40, 24, 0, Math.PI * 2, 0, Math.PI * (style === "short" ? .4 : .44)), hairM, V(0, .06, -.04), head);
  capH.scale.set(.86, 1, .94);
  const backH = mesh(new THREE.SphereGeometry(1.07, 40, 24, Math.PI, Math.PI, 0, Math.PI * (style === "short" ? .62 : .8)), hairM, V(0, .02, -.05), head); backH.scale.set(.87, 1, .95);
  if (style !== "short") {
    const fr = mesh(new THREE.SphereGeometry(1, 32, 16), hairM, V(-.12, .68, .5), head); fr.scale.set(.62, .26, .42); fr.rotation.set(-.5, 0, .25);
    const fr2 = mesh(new THREE.SphereGeometry(1, 32, 16), hairM, V(.38, .62, .48), head); fr2.scale.set(.42, .24, .4); fr2.rotation.set(-.5, 0, -.35);
  }
  if (style === "long") {
    const lh = mesh(lathe([[.0, -2.2], [.6, -2.05], [.86, -1.2], [.92, -.2], [.9, .3], [.0, .4]], 32), hairM, V(0, 0, -.28), head); lh.scale.set(1, 1, .55);
    [-1, 1].forEach(s => { const sd = mesh(new THREE.CapsuleGeometry(.2, 1.2, 8, 12), hairM, V(s * .8, -.75, .05), head); sd.rotation.z = s * .12; });
  }
  if (style === "pony") [-1, 1].forEach(s => { const p = mesh(new THREE.CapsuleGeometry(.22, .8, 8, 12), hairM, V(s * 1.0, -.25, -.2), head); p.rotation.z = s * .5;
    mesh(new THREE.TorusGeometry(.2, .06, 8, 20), std(0xff8fc0, .4), V(s * .9, .12, -.2), head).rotation.y = Math.PI / 2; });
  return { mouth, inner, lo, lids, eyes };
}
export function faceAnim(face, t, open, blinkPhase = 0) {
  const b = ((t + blinkPhase) % 3.7) < .13 ? 1 : 0;
  face.lids.forEach(l => { l.rotation.x = lerp(-.72, .25, b); });
  face.inner.scale.y = .02 + open * .1; face.inner.position.y = -open * .045;
  face.lo.position.y = .07 - open * .1;
  face.eyes.forEach((e, i) => { e.rotation.x = Math.sin(t * .7) * .05; e.rotation.y = Math.sin(t * .5 + 1) * .08; });
}

/* ======================= PROPS ======================= */
function floatingIsland(r, grass = 0x5fbf6e, rock = 0x5d4f93) {
  const g = new THREE.Group();
  const prof = []; for (let i = 0; i <= 12; i++) { const k = i / 12; prof.push([r * (1 - k * k * .92) * (1 + .05 * Math.sin(i * 2.3)), -k * r * .9]); }
  const geo = lathe(prof.reverse().map(([a, b]) => [a, b]), 48), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = 1 + .09 * Math.sin(x * 2.1 + y * 1.3) * Math.cos(z * 1.7 - y); p.setXYZ(i, x * n, y, z * n); }
  geo.computeVertexNormals();
  mesh(geo, std(rock, .95), null, g);
  const top = mesh(new THREE.CylinderGeometry(r * 1.02, r * .98, .25, 64), std(grass, .9), V(0, .05, 0), g); top.receiveShadow = true;
  return g;
}
function cloudCluster(n, w, seed = 1, mat = std(0xffffff, 1, 0, { emissive: 0x2a2850, emissiveIntensity: .25 })) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) { const r = .5 + hash(i, seed) * .7; mesh(new THREE.SphereGeometry(r, 20, 14), mat, V((hash(i, seed + 1) - .5) * w, hash(i, seed + 2) * .5, (hash(i, seed + 3) - .5) * w * .4), g, false); }
  return g;
}
function book(w, h, d, color) {
  const g = new THREE.Group();
  mesh(new RoundedBoxGeometry(w, h, d, 2, .03), std(color, .55), null, g);
  mesh(new THREE.BoxGeometry(w * .96, h * .82, d * .9), std(0xf6efd9, .9), V(.04 * w, 0, 0), g, false);
  mesh(new THREE.BoxGeometry(w * .02, h * .5, d * .6), std(0xf2c14e, .3, .8), V(-w * .5, 0, 0), g, false);
  return g;
}
function heartShape(s = 1) {
  const sh = new THREE.Shape(); sh.moveTo(0, -1 * s);
  sh.bezierCurveTo(-1.6 * s, .1 * s, -1.0 * s, 1.3 * s, 0, .55 * s); sh.bezierCurveTo(1.0 * s, 1.3 * s, 1.6 * s, .1 * s, 0, -1 * s);
  return sh;
}
function heartMesh(s, mat) { const g = new THREE.ExtrudeGeometry(heartShape(s), { depth: .3 * s, bevelEnabled: true, bevelThickness: .25 * s, bevelSize: .2 * s, bevelSegments: 6, curveSegments: 24 }); g.center(); return mesh(g, mat); }
function apple(s) { const g = new THREE.Group(); const prof = []; for (let i = 0; i <= 20; i++) { const a = i / 20 * Math.PI; prof.push([Math.sin(a) * (1 + .12 * Math.sin(a * 2)) * s, (-Math.cos(a) * .9 - .1 * Math.sin(a * 3)) * s]); }
  mesh(lathe(prof, 32), phys(0xc8202c, { roughness: .3, clearcoat: .6 }), null, g); mesh(new THREE.CylinderGeometry(.05 * s, .05 * s, .4 * s), std(0x5a3a1c, .8), V(0, .95 * s, 0), g).rotation.z = .3;
  const lf = mesh(new THREE.SphereGeometry(.3 * s, 12, 8), std(0x3d9a4a, .6), V(.2 * s, 1.05 * s, 0), g); lf.scale.set(1, .25, .55); return g; }
function orange(s) { const g = new THREE.Group(); mesh(new THREE.SphereGeometry(s, 32, 24), std(0xf28a12, .55), null, g); mesh(new THREE.SphereGeometry(.12 * s, 8, 6), std(0x3d6a2a, .7), V(0, .98 * s, 0), g); return g; }
function strawberry(s) { const g = new THREE.Group(); const prof = []; for (let i = 0; i <= 16; i++) { const k = i / 16; prof.push([Math.sin(k * Math.PI * .95) * (.3 + .7 * k) * s, (k * 1.7 - 1.0) * s]); }
  mesh(lathe(prof, 28), phys(0xd0182c, { roughness: .35, clearcoat: .5 }), null, g);
  for (let i = 0; i < 6; i++) { const l = mesh(new THREE.SphereGeometry(.28 * s, 10, 6), std(0x3c9a44, .6), V(Math.cos(i) * .3 * s, .72 * s, Math.sin(i) * .3 * s), g); l.scale.set(1, .2, .45); l.rotation.y = -i; } return g; }
function banana(s) { const c = new THREE.QuadraticBezierCurve3(V(-1 * s, .3 * s, 0), V(0, -.7 * s, 0), V(1 * s, .3 * s, 0)); const g = new THREE.Group();
  const m = mesh(new THREE.TubeGeometry(c, 24, .22 * s, 12), std(0xf2d03a, .5), null, g); return g; }
function grapes(s) { const g = new THREE.Group(); const mt = phys(0x5a2a9a, { roughness: .25, clearcoat: .8 });
  [[0, 0], [-.4, -.1], [.4, -.1], [-.2, -.5], [.2, -.5], [0, -.9], [-.55, -.45], [.55, -.45]].forEach(([x, y], i) => mesh(new THREE.SphereGeometry(.3 * s, 16, 12), mt, V(x * s, y * s, (i % 2) * .15 * s), g)); return g; }
function carrot(s) { const g = new THREE.Group(); const c = mesh(new THREE.ConeGeometry(.3 * s, 1.6 * s, 20), std(0xef7a12, .6), null, g); c.rotation.z = Math.PI;
  for (let i = 0; i < 3; i++) { const l = mesh(new THREE.ConeGeometry(.08 * s, .6 * s, 8), std(0x3c9a44, .6), V((i - 1) * .1 * s, 1.05 * s, 0), g); l.rotation.z = (i - 1) * .3; } return g; }
function stripeTex(cols) { return canvasTex(512, 256, (g, w, h) => { cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * w / cols.length, 0, w / cols.length + 1, h); }); g.fillStyle = "#fff"; g.fillRect(0, 0, w, 18); g.fillRect(0, h - 18, w, 18); }); }

/* ======================= WORLD ======================= */
export function createWorld(canvas, PLAN, TL) {
  const R = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  R.setSize(canvas.width, canvas.height, false); R.setClearColor(0x000000, 0);
  R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05; R.outputColorSpace = THREE.SRGBColorSpace;
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(R); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .55;
  const cam = new THREE.PerspectiveCamera(34, canvas.width / canvas.height, .1, 400);
  scene.add(new THREE.HemisphereLight(0xc8d0ff, 0x3a2a60, .55));
  const key = new THREE.DirectionalLight(0xfff0dc, 2.6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: .5, far: 60 }); key.shadow.bias = -.0005; key.shadow.normalBias = .02;
  scene.add(key, key.target);
  const rimP = new THREE.DirectionalLight(0xff9ccf, 1.4), rimB = new THREE.DirectionalLight(0x8ec8ff, 1.1); scene.add(rimP, rimB, rimP.target, rimB.target);

  const LV = PLAN.levels, ST = PLAN.start;
  const P = [V(0, 26, 0), V(0, 0, 0), V(28, 0, 0), V(28, 26, 0), V(56, 26, 0)];
  const islands = P.map(p => { const g = new THREE.Group(); g.position.copy(p); scene.add(g); return g; });
  const ups = [];               // per-frame updaters
  const popL = (grp, t0) => ups.push(t => { const k = prog(t, t0, t0 + 1.1), e = back(k); grp.rotation.x = -(1 - e) * 1.35; grp.scale.setScalar(lerp(.55, 1, out(k))); grp.visible = k > 0; });

  /* ---- Island 0: portal + balloons ---- */
  {
    const g = islands[0];
    const ringM = std(0xffd36a, .25, .9, { emissive: 0xffb84a, emissiveIntensity: .6 }), ringP = std(0xff9ccf, .3, .8, { emissive: 0xff6fb0, emissiveIntensity: .5 });
    const r1 = mesh(new THREE.TorusGeometry(3.2, .12, 16, 120), ringM, null, g, false), r2 = mesh(new THREE.TorusGeometry(3.55, .05, 12, 120), ringP, null, g, false);
    const r3 = mesh(new THREE.TorusGeometry(2.9, .03, 8, 120), std(0xbfe0ff, .2, .6, { emissive: 0x8ec8ff, emissiveIntensity: .8 }), null, g, false);
    const swirl = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { t: { value: 0 }, o: { value: 0 } },
      vertexShader: `varying vec2 v; void main(){ v=uv*2.-1.; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `varying vec2 v; uniform float t,o; void main(){ float r=length(v), a=atan(v.y,v.x);
        float s=sin(a*5.+r*9.-t*2.5)*.5+.5; float core=exp(-r*r*3.); vec3 c=mix(vec3(.45,.3,1.),vec3(1.,.72,.9),s)*(s*.6+.4)*smoothstep(1.,.2,r)+vec3(1.,.9,.96)*core*.45;
        gl_FragColor=vec4(c*o*.7,1.); }` });
    const disc = mesh(new THREE.CircleGeometry(3.0, 64), swirl, null, g, false);
    const sp = []; for (let i = 0; i < 26; i++) sp.push(mesh(new THREE.SphereGeometry(.06 + hash(i) * .06, 8, 6), std(0xffffff, .3, 0, { emissive: 0xffffff, emissiveIntensity: 2 }), null, g, false));
    ups.push(t => {
      const o = out(prog(t, ST.portal, ST.portal + 2.6));
      swirl.uniforms.t.value = t; swirl.uniforms.o.value = o; disc.scale.setScalar(Math.max(.001, o));
      r1.scale.setScalar(Math.max(.001, back(prog(t, ST.portal, ST.portal + 1.4)))); r1.rotation.z = t * .4;
      r2.scale.setScalar(Math.max(.001, back(prog(t, ST.portal + .3, ST.portal + 1.7)))); r2.rotation.set(Math.sin(t * .5) * .2, Math.cos(t * .4) * .2, -t * .3);
      r3.scale.setScalar(Math.max(.001, back(prog(t, ST.portal + .6, ST.portal + 2))));
      sp.forEach((m, i) => { const a = t * .6 + i * .24, rr = 3.4 + Math.sin(t * 2 + i) * .4; m.position.set(Math.cos(a) * rr, Math.sin(a) * rr, Math.sin(t + i) * .5); m.visible = o > .05; });
    });
    // 3D balloons (glossy latex)
    const bl = [];
    for (let i = 0; i < 18; i++) {
      const b = new THREE.Group(), pink = i % 2;
      const prof = []; for (let k = 0; k <= 24; k++) { const a = k / 24 * Math.PI; prof.push([Math.sin(a) * (1 - .25 * (1 - Math.cos(a)) * .5) * .55, -Math.cos(a) * .7]); }
      mesh(lathe(prof, 32), phys(pink ? 0xff8fc4 : 0x5aa8ff, { roughness: .18, clearcoat: 1, clearcoatRoughness: .1, sheen: .3 }), null, b);
      mesh(new THREE.ConeGeometry(.07, .1, 12), std(pink ? 0xd05a90 : 0x2f6fc0, .4), V(0, -.74, 0), b).rotation.z = Math.PI;
      const str = new THREE.CatmullRomCurve3([V(0, -.78, 0), V(.08, -1.3, 0), V(-.06, -1.8, .03), V(.04, -2.4, 0)]);
      mesh(new THREE.TubeGeometry(str, 20, .006, 4), std(0xffffff, .6), null, b, false);
      scene.add(b); bl.push({ b, x: (hash(i, 3) - .5) * 9, z: (hash(i, 5) - .5) * 8 + 2, sp: .9 + hash(i, 7) * .8, off: hash(i, 9) * 14, ph: hash(i, 11) * 6 });
    }
    ups.push(t => { const v = t > ST.balloons && t < ST.mapIn + 2;
      bl.forEach(o => { o.b.visible = v; if (!v) return; const y = -9 + ((t - ST.balloons) * o.sp + o.off) % 22;
        o.b.position.set(P[0].x + o.x + Math.sin(t * .8 + o.ph) * .4, P[0].y + y, P[0].z + o.z); o.b.rotation.z = Math.sin(t * 1.1 + o.ph) * .12; }); });
  }

  /* ---- Island 1: castle of books ---- */
  {
    const l = LV[0], g = islands[1];
    const base = floatingIsland(5.2); g.add(base); popL(base, l.popup);
    const cast = new THREE.Group(); g.add(cast); popL(cast, l.popup + .3);
    const cols = [0xd8344f, 0x2f7fd6, 0xf2b93b, 0x2fae7a, 0x8a5ad8, 0xe86aa6, 0xf08a2a];
    const tower = (x, z, n, w, seed) => { let y = .18; for (let i = 0; i < n; i++) { const h = .28 + hash(i, seed) * .12; const b = book(w - hash(i, seed + 1) * .35, h, w * .72, cols[(i + seed) % 7]);
      b.position.set(x + (hash(i, seed + 2) - .5) * .12, y + h / 2, z); b.rotation.y = (hash(i, seed + 3) - .5) * .35; cast.add(b); y += h; } return y; };
    const h1 = tower(-1.7, -.2, 10, 1.25, 3), h2 = tower(0, -.8, 13, 1.6, 7), h3 = tower(1.7, -.2, 10, 1.25, 11);
    const roof = (x, y, z, r, c) => { mesh(new THREE.ConeGeometry(r, r * 1.5, 32), std(c, .55), V(x, y + r * .75, z), cast);
      mesh(new THREE.CylinderGeometry(.025, .025, .9), std(0x9aa3b8, .3, .9), V(x, y + r * 1.5 + .4, z), cast); return V(x, y + r * 1.5 + .75, z); };
    const fl = [roof(-1.7, h1, -.2, .85, 0xe86aa6), roof(0, h2, -.8, 1.1, 0x3c7fd6), roof(1.7, h3, -.2, .85, 0xe86aa6)];
    const flags = fl.map((p, i) => { const geo = new THREE.PlaneGeometry(.7, .4, 12, 2); const m = mesh(geo, std(i === 1 ? 0xffd36a : 0x6fe0b0, .6, 0, { side: THREE.DoubleSide }), V(p.x + .35, p.y, p.z), cast, false); m.userData.base = geo.attributes.position.array.slice(); return m; });
    // gate: giant open book
    const gate = new THREE.Group(); gate.position.set(0, .2, 1.2); cast.add(gate);
    [-1, 1].forEach(s => { const pg = mesh(new RoundedBoxGeometry(.8, 1.3, .06, 2, .02), std(0xfaf3df, .85), V(s * .42, .65, 0), gate); pg.rotation.y = s * -.35; });
    mesh(new THREE.BoxGeometry(.08, 1.3, .1), std(0x8a4a2a, .6), V(0, .65, -.08), gate);
    const glowL = new THREE.PointLight(0xffd59a, 6, 6, 2); glowL.position.set(0, 1, 1.8); cast.add(glowL);
    // flying telescopes & pencils
    const fly = [];
    for (let i = 0; i < 6; i++) {
      const it = new THREE.Group();
      if (i % 3 === 0) { mesh(new THREE.CylinderGeometry(.09, .12, .9, 20), std(0xc9a44a, .25, 1), null, it).rotation.z = Math.PI / 2; mesh(new THREE.CylinderGeometry(.13, .13, .2, 20), std(0x2a2e3a, .3, .8), V(.5, 0, 0), it).rotation.z = Math.PI / 2; }
      else { const c = [0xffd36a, 0x6fe0b0, 0xff8fc4, 0x5aa8ff][i % 4]; mesh(new THREE.CylinderGeometry(.06, .06, .8, 6), std(c, .5), null, it).rotation.z = Math.PI / 2;
        mesh(new THREE.ConeGeometry(.06, .18, 6), std(0xe9c9a0, .7), V(.49, 0, 0), it).rotation.z = -Math.PI / 2; mesh(new THREE.CylinderGeometry(.062, .062, .12, 12), std(0xd8dde8, .2, 1), V(-.44, 0, 0), it).rotation.z = Math.PI / 2; }
      cast.add(it); fly.push(it);
    }
    const spark = []; for (let i = 0; i < 24; i++) spark.push(mesh(new THREE.SphereGeometry(.04, 6, 4), std(0xffe7a0, .2, 0, { emissive: 0xffd36a, emissiveIntensity: 3 }), null, cast, false));
    const cl = [cloudCluster(9, 2.6, 2), cloudCluster(8, 2.2, 5)]; cl[0].position.set(-4.4, -.6, 1); cl[1].position.set(4.3, -.4, .6); cl.forEach(c => { c.scale.setScalar(.8); g.add(c); popL(c, l.popup + .5); });
    ups.push(t => {
      if (!g.visible) return;
      cast.position.y = Math.sin(t * 1.1) * .08;
      flags.forEach((f, i) => { const a = f.geometry.attributes.position, b = f.userData.base; for (let k = 0; k < a.count; k++) { const x = b[k * 3] + .35; a.setZ(k, Math.sin(x * 6 - t * 6 + i) * .06 * x); } a.needsUpdate = true; });
      fly.forEach((it, i) => { const a = t * (.3 + i * .04) + i * 1.05; it.position.set(Math.cos(a) * 3.6, 3 + Math.sin(a * 1.3) * 1.4, Math.sin(a) * 2.2 + .5); it.rotation.set(Math.sin(t + i) * .3, -a + Math.PI / 2, Math.sin(t * 1.3 + i) * .3); });
      spark.forEach((s, i) => { const ph = (t * .3 + i / 24) % 1, a = i * 2.4; s.position.set(Math.cos(a) * (1 + ph * 2.6), 1 + ph * 5, Math.sin(a) * 1.5 + 1); s.scale.setScalar(Math.sin(ph * Math.PI) * 1.4 + .01); });
    });
  }

  /* ---- Island 2: energy oasis ---- */
  const doctor = makeHuman({ h: 1.78, coat: true, top: 0x9fc4e8, sleeve: 0xf4f6fb, bottom: 0x2c3756, hair: 0x1c1c22, hairStyle: "short", iris: "#4a2c16" });
  {
    const l = LV[1], g = islands[2];
    const base = floatingIsland(5.4, 0x63c46a); g.add(base); popL(base, l.popup);
    const pond = mesh(new THREE.CircleGeometry(1.5, 48), phys(0x3f8fd6, { roughness: .04, metalness: .1, clearcoat: 1 }), V(.6, .19, .8), base, false); pond.rotation.x = -Math.PI / 2; pond.scale.set(1.3, 1, .8);
    mesh(new THREE.TorusGeometry(1.52, .12, 8, 48), std(0xe9d29a, .9), V(.6, .17, .8), base).rotation.x = Math.PI / 2;
    const rip = mesh(new THREE.TorusGeometry(1, .015, 6, 48), std(0xffffff, .2, 0, { transparent: true, opacity: .5 }), V(.6, .2, .8), base, false); rip.rotation.x = Math.PI / 2;
    const mid = new THREE.Group(); g.add(mid); popL(mid, l.popup + .3);
    const palm = (x, z, s, seed) => { const pg = new THREE.Group(); pg.position.set(x, .15, z); pg.scale.setScalar(s); mid.add(pg);
      for (let i = 0; i < 12; i++) { const k = i / 11; mesh(new THREE.CylinderGeometry(.13 - k * .04, .16 - k * .04, .3, 14), std(0x8a5a32, .9), V(Math.sin(k * 1.2) * .5, .15 + k * 3.3, 0), pg).rotation.z = -Math.cos(k * 1.2) * .15; }
      const crown = new THREE.Group(); crown.position.set(Math.sin(1.2) * .5, 3.55, 0); pg.add(crown);
      for (let i = 0; i < 8; i++) { const geo = new THREE.PlaneGeometry(1.9, .42, 14, 2), p = geo.attributes.position;
        for (let k = 0; k < p.count; k++) { const xx = p.getX(k) + .95; p.setXYZ(k, xx, p.getY(k) * (1 - xx / 2.2) - .22 * xx * xx, p.getY(k) * .3 * Math.sin(xx)); } geo.computeVertexNormals();
        const lf = mesh(geo, std(i % 2 ? 0x3e9a48 : 0x2f7e3a, .6, 0, { side: THREE.DoubleSide }), null, crown); lf.rotation.y = i / 8 * Math.PI * 2; lf.rotation.z = .25; }
      [[.12, -.15, .1], [-.1, -.18, -.08], [0, -.2, .14]].forEach(([a, b, c]) => mesh(new THREE.SphereGeometry(.14, 14, 10), std(0x6e4424, .7), V(a, b, c), crown));
      return crown; };
    const crowns = [palm(-3.2, -.6, 1, 1), palm(-1.8, -1.5, .8, 2)];
    doctor.root.position.set(2.6, .15, 1.6); doctor.root.rotation.y = -.35; mid.add(doctor.root);
    const top = new THREE.Group(); g.add(top); popL(top, l.popup + .6);
    const heartM = phys(0xff5c9a, { roughness: .18, clearcoat: 1, clearcoatRoughness: .08, sheen: .4, sheenColor: new THREE.Color(0xffc0dc) });
    const heart = heartMesh(.9, heartM); heart.rotation.z = Math.PI; heart.position.set(0, 5.2, -.4); top.add(heart);
    const cross = new THREE.Group(); cross.position.set(0, 5.25, .1); top.add(cross);
    mesh(new RoundedBoxGeometry(.25, .8, .12, 2, .04), std(0xffffff, .3), null, cross); mesh(new RoundedBoxGeometry(.8, .25, .12, 2, .04), std(0xffffff, .3), null, cross);
    const hL = new THREE.PointLight(0xff8fc4, 8, 7, 2); hL.position.set(0, 5.2, 1.4); top.add(hL);
    const fruits = [apple(.3), banana(.35), carrot(.3), strawberry(.3), grapes(.28), orange(.3), apple(.28), strawberry(.28)];
    fruits.forEach(f => top.add(f));
    ups.push(t => {
      if (!g.visible) return;
      const beat = (t * 1.2) % 1, pulse = 1 + .09 * Math.exp(-beat * 9) + .05 * Math.exp(-Math.max(0, beat - .22) * 9) * (beat > .22);
      heart.scale.setScalar(pulse); cross.scale.setScalar(pulse); heart.rotation.y = Math.sin(t * .8) * .3; cross.rotation.y = heart.rotation.y; hL.intensity = 6 + 4 * Math.exp(-beat * 6);
      fruits.forEach((f, i) => { const a = t * .35 + i * .785; f.position.set(Math.cos(a) * 3.4, 4.6 + Math.sin(a * 2 + i) * .5, Math.sin(a) * 2); f.rotation.set(t * .5 + i, t * .7 + i, 0); });
      crowns.forEach((c, i) => { c.rotation.z = Math.sin(t * 1.2 + i) * .06; c.rotation.x = Math.cos(t + i) * .04; });
      const r = (t * .6) % 1; rip.scale.setScalar(.2 + r * 1.2); rip.material.opacity = .5 * (1 - r);
      doctor.arms[1].shp.rotation.z = 2.5 + Math.sin(t * 2) * .05; doctor.arms[1].el.rotation.z = .2 + Math.sin(t * 6) * .45;
      doctor.arms[0].shp.rotation.z = -.12;
      doctor.head.rotation.y = .25 + Math.sin(t * .8) * .1; faceAnim(doctor.face, t, .15 + .1 * Math.sin(t * 3), .7);
    });
  }

  /* ---- Island 3: cloud fun land ---- */
  const kid = makeHuman({ h: 1.2, kid: true, top: 0xf6c33b, sleeve: 0xf6c33b, bottom: 0x3f7fd0, hair: 0x6a3e22, hairStyle: "pony", iris: "#5a3418", shortSleeve: true });
  {
    const l = LV[2], g = islands[3];
    const base = new THREE.Group(); g.add(base); popL(base, l.popup);
    const cmat = std(0xffffff, 1, 0, { emissive: 0x3a3870, emissiveIntensity: .22 });
    const c1 = cloudCluster(26, 9, 3, cmat); c1.position.y = -.4; base.add(c1);
    const rb = [0xff5c7a, 0xff9f45, 0xffe14d, 0x6ee7a8, 0x5ab4ff, 0xb28dff];
    rb.forEach((c, i) => mesh(new THREE.TorusGeometry(4.6 - i * .22, .11, 8, 80, Math.PI), std(c, .4, 0, { emissive: c, emissiveIntensity: .35, transparent: true, opacity: .85 }), V(0, .3, -2.4), base, false));
    const mid = new THREE.Group(); g.add(mid); popL(mid, l.popup + .3);
    const topCloud = cloudCluster(10, 3.2, 8, cmat); topCloud.position.set(0, 6.6, -.4); mid.add(topCloud);
    const pivot = new THREE.Group(); pivot.position.set(0, 6.4, -.2); mid.add(pivot);
    [-1, 1].forEach(s => mesh(new THREE.CylinderGeometry(.02, .02, 4.6, 6), std(0xc9b49a, .9), V(s * .55, -2.3, 0), pivot));
    mesh(new RoundedBoxGeometry(1.4, .1, .5, 2, .04), std(0x9a6a3a, .7), V(0, -4.6, 0), pivot);
    kid.root.position.set(0, -4.55 - kid.H * .47, 0); pivot.add(kid.root);
    kid.legs.forEach(L => { L.hip.rotation.x = -1.45; L.knee.rotation.x = 1.5; });
    kid.root.position.y = -4.55 - kid.H * .47 + kid.H * .02; kid.root.position.z = -.05;
    kid.arms.forEach((A, i) => { const s = i ? 1 : -1; A.shp.rotation.z = s * 2.85; A.el.rotation.z = 0; });
    const top = new THREE.Group(); g.add(top); popL(top, l.popup + .6);
    const ballT = stripeTex(["#ff5c7a", "#ffffff", "#ffc83d", "#ffffff", "#4fa8ff", "#ffffff", "#4fd08a", "#ffffff"]);
    const balls = Array.from({ length: 5 }, () => { const m = mesh(new THREE.SphereGeometry(.35, 32, 20), new THREE.MeshPhysicalMaterial({ map: ballT, roughness: .3, clearcoat: .8 }), null, top); return m; });
    const bubM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, metalness: 0, transparent: true, opacity: .22, iridescence: 1, iridescenceIOR: 1.3, clearcoat: 1, depthWrite: false });
    const bubs = [];
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Group(); mesh(new THREE.SphereGeometry(.6, 32, 24), bubM, null, b, false);
      const k = i % 3;
      if (k === 0) { mesh(new THREE.SphereGeometry(.16, 20, 16), std(0xd8dde8, .3, 1), V(0, .12, 0), b, false); mesh(new THREE.CylinderGeometry(.05, .05, .35, 12), std(0x2a2e3a, .4, .6), V(0, -.15, 0), b, false); }
      else if (k === 1) { mesh(new THREE.SphereGeometry(.2, 20, 16), std(0xfff3b0, .2, 0, { emissive: 0xffd36a, emissiveIntensity: 1.6 }), V(0, .08, 0), b, false); mesh(new THREE.CylinderGeometry(.08, .08, .14, 12), std(0xd8dde8, .3, 1), V(0, -.16, 0), b, false); }
      else { mesh(new RoundedBoxGeometry(.5, .32, .1, 3, .08), std(0x5aa8ff, .4), null, b, false); [-1, 0, 1].forEach(j => mesh(new THREE.SphereGeometry(.04, 8, 6), std(0xffffff, .3), V(j * .12, 0, .06), b, false)); }
      top.add(b); bubs.push(b);
    }
    ups.push(t => {
      if (!g.visible) return;
      pivot.rotation.x = Math.sin(t * 1.7) * .42;
      faceAnim(kid.face, t, .35 + .1 * Math.sin(t * 2), 1.3); kid.head.rotation.x = -Math.sin(t * 1.7) * .15;
      balls.forEach((b, i) => { const ph = (t * (.45 + i * .07) + i * .23) % 1; b.position.set(-3.6 + ((t * (.4 + i * .15) + i * 1.6) % 7.2), .45 + Math.abs(Math.sin(ph * Math.PI)) * (1.5 + i * .3), 1.6 - i * .5); b.rotation.set(t * 2 + i, t * 1.4, 0); });
      bubs.forEach((b, i) => { const ph = (t * .09 + i / 6) % 1; b.position.set(-3.4 + i * 1.35 + Math.sin(t + i) * .3, .5 + ph * 7, 1.4 - (i % 2) * 1.2); b.scale.setScalar(Math.sin(ph * Math.PI) * .9 + .05); b.rotation.y = t * .6 + i; });
    });
  }

  /* ---- Island 4: home + safety shield + family ---- */
  const dad = makeHuman({ h: 1.82, top: 0x4a8fe0, bottom: 0x2c3756, hair: 0x15151a, hairStyle: "short", iris: "#3a2412" });
  const mom = makeHuman({ h: 1.68, female: true, top: 0x9a72f0, bottom: 0x3a3060, hair: 0x2a1810, hairStyle: "long", iris: "#5a3418" });
  const girl = makeHuman({ h: 1.22, kid: true, female: true, top: 0xf07ab0, bottom: 0x6a50c0, hair: 0x6a3e22, hairStyle: "pony", iris: "#6b3f1d" });
  const boy = makeHuman({ h: 1.12, kid: true, top: 0x4fd6a0, bottom: 0x2c3756, hair: 0x1c1410, hairStyle: "short", iris: "#4a2c16" });
  {
    const l = LV[3], g = islands[4], built = l.S + 3.2;
    const cmat = std(0xffffff, 1, 0, { emissive: 0x3a3870, emissiveIntensity: .22 });
    // gathering stars/clouds
    const gp = []; for (let i = 0; i < 40; i++) { const m = i % 3 ? mesh(new THREE.SphereGeometry(.08, 8, 6), std(0xffffff, .2, 0, { emissive: i % 2 ? 0xffd36a : 0xffffff, emissiveIntensity: 3 }), null, g, false) : cloudCluster(4, .8, i, cmat); if (!(i % 3)) g.add(m); gp.push(m); }
    const outline = []; [[-2, 0, -2, 2.2], [-2, 2.2, 0, 3.8], [0, 3.8, 2, 2.2], [2, 2.2, 2, 0], [2, 0, -2, 0]].forEach(([a, b, c, d]) => { for (let i = 0; i < 8; i++) outline.push(V(lerp(a, c, i / 8), lerp(b, d, i / 8) + .2, -.6)); });
    const base = new THREE.Group(); g.add(base); popL(base, built - .4);
    const c1 = cloudCluster(22, 9, 6, cmat); c1.position.y = -.45; base.add(c1);
    const house = new THREE.Group(); house.position.set(0, .1, -.9); g.add(house); popL(house, built - .1);
    mesh(new RoundedBoxGeometry(3.6, 2.3, 2.6, 3, .06), std(0xbfe0fb, .7), V(0, 1.15, 0), house);
    const rs = new THREE.Shape(); rs.moveTo(-2.05, 0); rs.lineTo(0, 1.6); rs.lineTo(2.05, 0); rs.lineTo(-2.05, 0);
    const roofG = new THREE.ExtrudeGeometry(rs, { depth: 3.0, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 2 }); roofG.translate(0, 0, -1.5);
    mesh(roofG, std(0xf0ae3a, .55), V(0, 2.3, 0), house);
    mesh(new THREE.BoxGeometry(.4, 1.1, .4), std(0xd8344f, .6), V(1.1, 3.3, -.3), house);
    const winM = std(0xffe6a0, .3, 0, { emissive: 0xffc860, emissiveIntensity: 1.8 });
    [-1, 1].forEach(s => { mesh(new THREE.BoxGeometry(.75, .65, .05), winM, V(s * 1.05, 1.35, 1.31), house, false); mesh(new THREE.BoxGeometry(.85, .06, .1), std(0xffffff, .5), V(s * 1.05, 1.0, 1.33), house); mesh(new THREE.BoxGeometry(.05, .65, .07), std(0xffffff, .5), V(s * 1.05, 1.35, 1.34), house, false); });
    mesh(new RoundedBoxGeometry(.7, 1.3, .12, 2, .05), std(0xe88ab4, .5), V(0, .65, 1.32), house);
    mesh(new THREE.SphereGeometry(.05, 10, 8), std(0xffd36a, .2, 1), V(.22, .65, 1.4), house, false);
    const hl = new THREE.PointLight(0xffb860, 10, 6, 2); hl.position.set(0, 1.4, 2.2); house.add(hl);
    const dome = mesh(new THREE.SphereGeometry(4.6, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0xffb8de, transparent: true, opacity: .1, roughness: .1, side: THREE.DoubleSide, depthWrite: false, iridescence: .6 }), V(0, .1, -.3), g, false);
    const heartM = phys(0xff5c9a, { roughness: .2, clearcoat: 1, clearcoatRoughness: .1 });
    const hearts = Array.from({ length: 12 }, () => { const h = heartMesh(.22, heartM); h.rotation.z = Math.PI; g.add(h); return h; });
    const fam = new THREE.Group(); fam.position.set(0, .15, 1.6); g.add(fam); popL(fam, built + .2);
    [[dad, -1.35, .15], [mom, 1.35, -.15], [girl, -.45, .05], [boy, .45, -.05]].forEach(([p, x, ry]) => { p.root.position.set(x, 0, 0); p.root.rotation.y = ry; fam.add(p.root); });
    // holding hands chain: dad-R -> girl-L, girl-R -> boy-L, boy-R -> mom-L
    dad.arms[1].shp.rotation.z = .55; dad.arms[0].shp.rotation.z = -.1;
    girl.arms[0].shp.rotation.z = -.5; girl.arms[1].shp.rotation.z = .55;
    boy.arms[0].shp.rotation.z = -.55; boy.arms[1].shp.rotation.z = .5;
    mom.arms[0].shp.rotation.z = -.55; mom.arms[1].shp.rotation.z = .1;
    ups.push(t => {
      if (!g.visible) return;
      const gk = io(prog(t, l.S + .2, built));
      gp.forEach((m, i) => { const st = V((hash(i, 9) - .5) * 14, (hash(i, 8) - .2) * 10, (hash(i, 7) - .5) * 6), tg = outline[i % outline.length];
        m.position.lerpVectors(st, tg, gk); m.visible = t > l.S && t < built + .8; m.scale.setScalar(1 - prog(t, built, built + .8) + .001); });
      dome.visible = t > built; dome.scale.setScalar(Math.max(.001, out(prog(t, built + .2, built + 1.4)))); dome.material.opacity = .08 + .04 * Math.sin(t * 1.5);
      hearts.forEach((h, i) => { const a = t * .45 + i / 12 * 6.283; h.position.set(Math.cos(a) * 4.2, 1.8 + Math.sin(a * 2 + t) * .4, Math.sin(a) * 2.6 - .3); h.rotation.y = -a; h.visible = t > built + .4 + i * .08; });
      [dad, mom, girl, boy].forEach((p, i) => { faceAnim(p.face, t, .12 + .08 * Math.sin(t * 2 + i), i * .9); p.head.rotation.y = Math.sin(t * .7 + i) * .12; p.root.position.y = Math.sin(t * 2 + i) * .01; });
      hl.intensity = 9 + Math.sin(t * 1.5) * 1.5;
    });
  }

  /* ---------------- camera ---------------- */
  const view = (p, az, dist, h, ty) => ({ pos: V(p.x + Math.sin(az) * dist, p.y + h, p.z + Math.cos(az) * dist), tgt: V(p.x, p.y + ty, p.z) });
  const K = [];
  K.push([0, view(P[0], 0, 24, .5, .3)], [ST.mapIn, view(P[0], 0, 17, .2, .1)], [ST.mapIn + 3, view(P[0], 0, 15, 0, 0)]);
  K.push([ST.dive + 1.6, { pos: V(P[1].x, P[1].y + 26, P[1].z + 9), tgt: V(P[1].x, P[1].y + 2, P[1].z) }]);
  LV.forEach((l, k) => {
    const p = P[k + 1], S = l.S;
    const cu = [null, view(V(p.x + 2.6, p.y, p.z + 1.6), -.35, 5.5, 1.6, 1.45), view(V(p.x, p.y + 6.6 - 4.55 - .3, p.z), .2, 5.5, .4, .1), view(V(p.x, p.y, p.z + 1.6), .1, 10.5, 1.0, -.2)][k];
    K.push([S, view(p, -.3, 30, 14, 3.6)], [S + 5, view(p, -.2, 27, 10, 3.2)], [l.narrStart + 3, view(p, -.05, 24, 6.5, 2.8)]);
    if (cu) { const mid = (l.narrStart + l.narrEnd) / 2; K.push([mid - 1, cu], [mid + 4, { pos: cu.pos.clone().add(V(-.3, .1, -.4)), tgt: cu.tgt.clone() }]); }
    K.push([l.narrEnd + .5, view(p, .15, 23, 4.6, 2.4)], [l.mission + 1.2, view(p, .22, 26, 4.2, .4)], [l.complete, view(p, .1, 25, 5, 1.8)], [l.leave, view(p, 0, 25, 5.5, 2.2)]);
  });
  K.push([PLAN.win, view(P[4], 0, 30, 14, 2)]);
  K.sort((a, b) => a[0] - b[0]);
  const tmpP = V(0, 0, 0), tmpT = V(0, 0, 0);
  function camAt(t) {
    let i = 0; while (i < K.length - 2 && t >= K[i + 1][0]) i++;
    const a = K[i], b = K[i + 1], k = io(prog(t, a[0], b[0]));
    tmpP.lerpVectors(a[1].pos, b[1].pos, k); tmpT.lerpVectors(a[1].tgt, b[1].tgt, k);
    if (b[1].tgt.distanceTo(a[1].tgt) > 15) tmpP.y += Math.sin(k * Math.PI) * 4;     // arc between islands
    tmpP.x += Math.sin(t * .5) * .12; tmpP.y += Math.cos(t * .4) * .1;
    cam.position.copy(tmpP); cam.lookAt(tmpT);
    return tmpT;
  }

  /* ---------------- public ---------------- */
  return {
    renderer: R,
    visibility(t) {   // 3D layer opacity (map & win phases are 2D)
      return (1 - prog(t, ST.mapIn + .5, ST.mapIn + 2.5)) + prog(t, ST.dive + 1.6, ST.dive + 2.6) * (1 - prog(t, PLAN.win - 3, PLAN.win - 1.2));
    },
    render(t, speak) {
      const tgt = camAt(t);
      islands.forEach((g, i) => { const d = g.position.distanceTo(cam.position); g.visible = d < 45; });
      ups.forEach(f => f(t));
      key.target.position.copy(tgt); key.position.copy(tgt).add(V(5, 11, 8));
      rimP.target.position.copy(tgt); rimP.position.copy(tgt).add(V(-8, 5, -7)); rimB.target.position.copy(tgt); rimB.position.copy(tgt).add(V(8, 4, -6));
      R.render(scene, cam);
    },
  };
}

/* ======================= GUIDE BUST (portrait, lip-synced) ======================= */
export function createGuide(canvas) {
  const R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  R.setSize(canvas.width, canvas.height, false); R.setClearColor(0, 0); R.toneMapping = THREE.ACESFilmicToneMapping; R.outputColorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Scene(); const pm = new THREE.PMREMGenerator(R); s.environment = pm.fromScene(new RoomEnvironment(), .04).texture; s.environmentIntensity = .5;
  const cam = new THREE.PerspectiveCamera(22, 1, .05, 50);
  const k = new THREE.DirectionalLight(0xfff0e0, 2.4); k.position.set(1.5, 2, 3); s.add(k);
  const r1 = new THREE.DirectionalLight(0xff9ccf, 2.2); r1.position.set(-2.5, 1, -2); s.add(r1);
  const r2 = new THREE.DirectionalLight(0x8ec8ff, 1.8); r2.position.set(2.5, .5, -2); s.add(r2);
  s.add(new THREE.HemisphereLight(0xd8d0ff, 0x402a60, .5));
  const girl = makeHuman({ h: 1.3, kid: true, female: true, top: 0xf07ab0, hair: 0x3a2214, hairStyle: "long", iris: "#6b3f1d", lips: 0xd0707a });
  s.add(girl.root);
  // gamer headset
  const hp = new THREE.Group(); girl.head.add(hp);
  mesh(new THREE.TorusGeometry(1.0, .07, 10, 40, Math.PI), std(0x2a2e3a, .35, .7), V(0, .1, -.05), hp, false);
  [-1, 1].forEach(sd => { const c = mesh(new THREE.CylinderGeometry(.3, .3, .2, 24), std(0x2a2e3a, .35, .6), V(sd * .95, .02, -.04), hp, false); c.rotation.z = Math.PI / 2;
    mesh(new THREE.TorusGeometry(.3, .03, 8, 24), std(0x7fd3ff, .2, 0, { emissive: 0x4fb8ff, emissiveIntensity: 2 }), V(sd * 1.06, .02, -.04), hp, false).rotation.y = Math.PI / 2; });
  const boom = new THREE.QuadraticBezierCurve3(V(-.98, -.1, .05), V(-.9, -.65, .55), V(-.35, -.62, .8));
  mesh(new THREE.TubeGeometry(boom, 20, .035, 8), std(0x2a2e3a, .4, .6), null, hp, false); mesh(new THREE.SphereGeometry(.08, 12, 10), std(0x2a2e3a, .4, .6), V(-.33, -.62, .82), hp, false);
  const hc = new THREE.Vector3(); girl.head.getWorldPosition(hc);
  cam.position.set(hc.x + .05, hc.y - .02, hc.z + 1.15); cam.lookAt(hc.x, hc.y - .1, hc.z);
  return {
    render(t, open, visible) {
      if (!visible) return;
      faceAnim(girl.face, t, open, .3);
      girl.head.rotation.set(Math.sin(t * .9) * .04 + (open > 0 ? Math.sin(t * 7) * .015 : 0), Math.sin(t * .6) * .12, Math.sin(t * 1.1) * .04);
      R.render(s, cam);
    },
  };
}
