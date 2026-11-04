import * as THREE from 'three';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';
import { mesh, group, std, rng, glowTex, starTex, sprite } from './util.js';
import { mapTexture, flagTexture } from './text.js';

// ---------------------------------------------------------------- sky
export function makeSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color('#6fb6ff') }, mid: { value: new THREE.Color('#cfe8ff') }, bot: { value: new THREE.Color('#fff2d6') },
      sunDir: { value: new THREE.Vector3(0.3, 0.4, -1).normalize() }, sunCol: { value: new THREE.Color('#fff1c4') }, sunAmt: { value: 0.6 },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 top, mid, bot, sunCol, sunDir; uniform float sunAmt; varying vec3 vDir;
      void main(){ float h = vDir.y; vec3 c = h>0.0 ? mix(mid, top, smoothstep(0.0,0.55,h)) : mix(mid, bot, smoothstep(0.0,-0.35,h));
        float s = max(dot(normalize(vDir), normalize(sunDir)),0.0);
        c += sunCol * (pow(s, 600.0)*1.4 + pow(s, 12.0)*0.35) * sunAmt;
        gl_FragColor = vec4(c,1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(450, 48, 24), mat);
  m.frustumCulled = false; m.renderOrder = -10;
  return m;
}

// ---------------------------------------------------------------- clouds
const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.1 });
export function makeCloud(seed = 1, size = 1, tint) {
  const r = rng(seed); const g = new THREE.Group();
  const mat = tint ? new THREE.MeshStandardMaterial({ color: tint, roughness: 1, emissive: new THREE.Color(tint), emissiveIntensity: 0.1 }) : cloudMat;
  const n = 5 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const rad = (0.38 + r() * 0.32) * size;
    const m = new THREE.Mesh(new THREE.SphereGeometry(rad, 20, 14), mat);
    m.position.set((i - n / 2) * 0.42 * size + r() * 0.2 * size, (r() * 0.22 + (i % 2) * 0.12) * size, (r() - 0.5) * 0.45 * size);
    m.scale.y = 0.78;
    g.add(m);
  }
  return g;
}

export function cloudField(parent, seed, count, spread, yRange, size = [2, 5], tint) {
  const r = rng(seed); const g = group(parent);
  for (let i = 0; i < count; i++) {
    const c = makeCloud(seed * 31 + i, size[0] + r() * (size[1] - size[0]), tint);
    const a = r() * Math.PI * 2, d = spread[0] + r() * (spread[1] - spread[0]);
    c.position.set(Math.cos(a) * d, yRange[0] + r() * (yRange[1] - yRange[0]), Math.sin(a) * d);
    c.rotation.y = r() * 6; c.userData.drift = 0.05 + r() * 0.1; c.userData.base = c.position.clone();
    g.add(c);
  }
  g.userData.update = t => g.children.forEach((c, i) => { c.position.x = c.userData.base.x + Math.sin(t * c.userData.drift + i) * 1.5; });
  return g;
}

// ---------------------------------------------------------------- floating island
export function makeIsland(o = {}) {
  const P = { r: 4, grass: '#7fd36b', dirt: '#b07a4a', rock: '#9b8d80', h: 4, seed: 1, flowers: true, ...o };
  const g = new THREE.Group(); const r = rng(P.seed);
  // grass top with a soft bevel
  const top = new THREE.CylinderGeometry(P.r, P.r * 0.985, 0.3, 64, 1);
  mesh(top, std(P.grass, { roughness: 0.9 }), g, [0, -0.15, 0]);
  const lip = new THREE.TorusGeometry(P.r * 0.99, 0.12, 10, 64);
  mesh(lip, std(P.grass, { roughness: 0.9 }), g, [0, -0.04, 0], [Math.PI / 2, 0, 0]);
  mesh(new THREE.CylinderGeometry(P.r * 0.985, P.r * 0.9, 0.45, 64), std(P.dirt, { roughness: 1 }), g, [0, -0.52, 0]);
  // rocky underside
  const cone = new THREE.ConeGeometry(P.r * 0.9, P.h, 40, 10);
  cone.rotateX(Math.PI);
  const pos = cone.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (y > P.h / 2 - 0.01) continue;
    const a = Math.atan2(z, x);
    const n = 1 + 0.12 * Math.sin(a * 5 + P.seed) + 0.08 * Math.sin(a * 11 + y * 2) + 0.06 * Math.sin(y * 3 + a * 3);
    pos.setXYZ(i, x * n, y, z * n);
  }
  cone.computeVertexNormals();
  mesh(cone, std(P.rock, { roughness: 0.95, flatShading: true }), g, [0, -0.75 - P.h / 2, 0]);
  // hanging rocks
  for (let i = 0; i < 5; i++) {
    const a = r() * Math.PI * 2, d = P.r * (0.5 + r() * 0.35);
    mesh(new THREE.DodecahedronGeometry(0.25 + r() * 0.35, 0), std(P.rock, { flatShading: true }), g, [Math.cos(a) * d, -0.9 - r() * 1.2, Math.sin(a) * d], [r(), r(), r()]);
  }
  // grass tufts & flowers
  if (P.flowers) {
    const fcols = ['#ffffff', '#ffd23f', '#ff8fc0', '#a77bff', '#ff7a59'];
    const tuftMat = std(new THREE.Color(P.grass).multiplyScalar(0.8), { roughness: 0.9 });
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, d = P.r * (0.25 + r() * 0.7);
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (r() < 0.55) mesh(new THREE.ConeGeometry(0.07, 0.25, 5), tuftMat, g, [x, 0.12, z], [0, 0, (r() - 0.5) * 0.5]);
      else {
        const f = group(g, [x, 0, z]);
        mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 5), tuftMat, f, [0, 0.11, 0]);
        mesh(new THREE.SphereGeometry(0.06, 10, 8), std(fcols[i % 5], { roughness: 0.6 }), f, [0, 0.23, 0], null, [1, 0.6, 1]);
        mesh(new THREE.SphereGeometry(0.025, 8, 6), std('#ffcf3f'), f, [0, 0.255, 0]);
      }
    }
  }
  return g;
}

// ---------------------------------------------------------------- beach & sea
export function makeBeach(parent) {
  const g = group(parent);
  const sand = new THREE.PlaneGeometry(160, 60, 160, 60); sand.rotateX(-Math.PI / 2);
  const p = sand.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    // slope toward the sea (sea is at +x side... we use -z for sea)
    let y = 0.04 * Math.sin(x * 0.35) * Math.cos(z * 0.5) + 0.06 * Math.sin(x * 0.11 + z * 0.2);
    y += Math.max(0, z) * 0.045; // rises inland (+z)
    y -= Math.max(0, -z - 3) * 0.06; // dips into the sea
    p.setY(i, y);
  }
  sand.computeVertexNormals();
  const sandMat = std('#e9c78f', { roughness: 0.95 });
  mesh(sand, sandMat, g, [0, 0, 18]).castShadow = false;
  // sea
  const seaGeo = new THREE.PlaneGeometry(220, 120, 140, 70); seaGeo.rotateX(-Math.PI / 2);
  const base = seaGeo.attributes.position.array.slice();
  const sea = mesh(seaGeo, new THREE.MeshPhysicalMaterial({ color: '#2fb3d6', roughness: 0.12, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true, opacity: 0.93 }), g, [0, -0.05, -48]);
  sea.castShadow = false;
  // foam strip
  const foamGeo = new THREE.PlaneGeometry(160, 2.2, 160, 4); foamGeo.rotateX(-Math.PI / 2);
  const foamMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, transparent: true, opacity: 0.5, depthWrite: false });
  foamGeo.scale(1, 1, 0.45);
  const foam = mesh(foamGeo, foamMat, g, [0, 0.03, 14.2]); foam.castShadow = false;
  // shallow water overlay to blend shore
  const shallow = mesh(new THREE.PlaneGeometry(160, 5).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#5fd0dc', transparent: true, opacity: 0.35, roughness: 0.2, depthWrite: false }), g, [0, 0.02, 13.0]);
  shallow.castShadow = false;
  g.userData.update = t => {
    const a = seaGeo.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      a.setY(i, 0.12 * Math.sin(x * 0.18 + t * 1.3) + 0.09 * Math.sin(z * 0.35 - t * 1.7) + 0.04 * Math.sin((x + z) * 0.6 + t * 2.3));
    }
    a.needsUpdate = true; seaGeo.computeVertexNormals();
    const w = Math.sin(t * 0.9);
    foam.position.z = 14.2 + w * 0.6; foamMat.opacity = 0.35 + 0.25 * Math.max(0, w);
    shallow.position.z = 13.0 + w * 0.5;
  };
  return g;
}

export function makePalm(parent, pos, seed = 1, h = 5) {
  const g = group(parent, pos); const r = rng(seed);
  const trunkMat = std('#9a6b3f', { roughness: 0.9 });
  let p = new THREE.Vector3(0, 0, 0); const lean = 0.08 + r() * 0.08;
  for (let i = 0; i < 9; i++) {
    const seg = mesh(new THREE.CylinderGeometry(0.16 - i * 0.008, 0.19 - i * 0.008, h / 9 + 0.05, 10), trunkMat, g, [p.x, p.y + h / 18, p.z]);
    seg.rotation.z = -lean * i * 0.4;
    p = new THREE.Vector3(p.x + Math.sin(lean * i * 0.4) * h / 9, p.y + h / 9, p.z);
  }
  const crown = group(g, [p.x, p.y, p.z]);
  const leafMat = std('#3fae5a', { roughness: 0.7, side: THREE.DoubleSide });
  for (let i = 0; i < 8; i++) {
    const leaf = group(crown, null, [0, (i / 8) * Math.PI * 2, 0]);
    const l = mesh(new THREE.SphereGeometry(1, 16, 8), leafMat, leaf, [1.3, -0.35, 0], [0, 0, -0.45], [1.5, 0.08, 0.36]);
    l.castShadow = true;
  }
  for (let i = 0; i < 3; i++) mesh(new THREE.SphereGeometry(0.14, 10, 8), std('#6b4a2a'), crown, [Math.cos(i * 2) * 0.2, -0.2, Math.sin(i * 2) * 0.2]);
  g.userData.crown = crown;
  return g;
}

// ---------------------------------------------------------------- props
export function makeGift(parent) {
  const g = group(parent);
  const boxMat = new THREE.MeshPhysicalMaterial({ color: '#3d7bff', roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15 });
  const ribMat = new THREE.MeshPhysicalMaterial({ color: '#ffd04a', roughness: 0.25, metalness: 0.4, clearcoat: 1 });
  mesh(new THREE.BoxGeometry(2, 1.7, 2), boxMat, g, [0, 0.85, 0]);
  mesh(new THREE.BoxGeometry(0.32, 1.72, 2.02), ribMat, g, [0, 0.85, 0]);
  mesh(new THREE.BoxGeometry(2.02, 1.72, 0.32), ribMat, g, [0, 0.85, 0]);
  const lid = group(g, [0, 1.7, -1.05]); // hinge at back
  const lidIn = group(lid, [0, 0, 1.05]);
  mesh(new THREE.BoxGeometry(2.2, 0.38, 2.2), boxMat, lidIn, [0, 0.19, 0]);
  mesh(new THREE.BoxGeometry(0.34, 0.4, 2.22), ribMat, lidIn, [0, 0.19, 0]);
  mesh(new THREE.BoxGeometry(2.22, 0.4, 0.34), ribMat, lidIn, [0, 0.19, 0]);
  for (const s of [1, -1]) mesh(new THREE.TorusGeometry(0.36, 0.12, 12, 30), ribMat, lidIn, [s * 0.34, 0.6, 0], [0, s * 0.5, s * 0.6], [1, 0.75, 0.6]);
  mesh(new THREE.SphereGeometry(0.17, 16, 12), ribMat, lidIn, [0, 0.45, 0]);
  const inner = sprite(glowTex(), '#ffe9a8', 3.2, g, [0, 1.7, 0], 0);
  g.userData = { lid, inner };
  return g;
}

export function makeScroll(parent) {
  const g = group(parent);
  const paper = std('#f3dfb1', { roughness: 0.85 });
  const closed = group(g);
  mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 18), paper, closed, null, [0, 0, Math.PI / 2]);
  mesh(new THREE.TorusGeometry(0.075, 0.012, 6, 18), std('#c0392b'), closed, [0, 0, 0], [0, Math.PI / 2, 0]);
  // open map
  const open = group(g);
  const tex = mapTexture();
  const sheet = mesh(new THREE.PlaneGeometry(1.4, 1.0), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, side: THREE.DoubleSide, emissive: new THREE.Color('#fff2c0'), emissiveMap: tex, emissiveIntensity: 0.25 }), open);
  const rollL = mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.04, 18), paper, open, [-0.7, 0, 0.02]);
  const rollR = mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.04, 18), paper, open, [0.7, 0, 0.02]);
  const aura = sprite(glowTex(), '#ffe7a0', 2.6, open, [0, 0, -0.1], 0);
  g.userData = { closed, open, sheet, rollL, rollR, aura, tex };
  g.userData.setOpen = k => {
    closed.visible = k < 0.02; open.visible = k >= 0.02;
    sheet.scale.x = Math.max(0.02, k); tex.offset.x = 0;
    rollL.position.x = -0.7 * k; rollR.position.x = 0.7 * k;
  };
  return g;
}

/** Scallop shell (two halves, hinge at origin, opening toward +z). */
export function makeShell(parent, size = 1) {
  const g = group(parent);
  const mat = new THREE.MeshPhysicalMaterial({
    color: '#f6e9ff', roughness: 0.22, metalness: 0.05, iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [200, 700],
    clearcoat: 1, clearcoatRoughness: 0.1, sheen: 0.5, sheenColor: new THREE.Color('#9fd8ff'), side: THREE.DoubleSide,
  });
  const f = (sign) => (u, v, target) => {
    const a = (u - 0.5) * Math.PI * 0.95; const R = 1.6 * size;
    const rib = 0.05 * Math.pow(Math.abs(Math.cos(a * 13)), 0.6) * v;
    const rr = v * R;
    const y = sign * (0.42 * R * Math.sin(Math.PI * Math.min(1, v * 0.95)) * (0.7 + 0.3 * Math.cos(a)) * 0.6 + rib * R);
    target.set(Math.sin(a) * rr, y, Math.cos(a) * rr);
  };
  const bottom = mesh(new ParametricGeometry(f(-1), 64, 24), mat, g);
  const hinge = group(g);
  const top = mesh(new ParametricGeometry(f(1), 64, 24), mat, hinge);
  const pearl = mesh(new THREE.SphereGeometry(0.28 * size, 28, 20), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.1, iridescence: 1, clearcoat: 1, emissive: new THREE.Color('#cfe8ff'), emissiveIntensity: 0.25 }), g, [0, 0.15 * size, 0.9 * size]);
  const glow = sprite(glowTex(), '#bfe3ff', 3 * size, g, [0, 0.3 * size, 0.9 * size], 0.6);
  g.userData = { hinge, pearl, glow, setOpen: k => { hinge.rotation.x = -k * 1.05; } };
  return g;
}

export function makeLighthouse(parent, pos) {
  const g = group(parent, pos);
  const cols = ['#ffffff', '#e8505b'];
  for (let i = 0; i < 5; i++) mesh(new THREE.CylinderGeometry(0.55 - i * 0.06 - 0.06, 0.55 - i * 0.06, 0.8, 24), std(cols[i % 2], { roughness: 0.5 }), g, [0, 0.4 + i * 0.8, 0]);
  mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 24), std('#2f3e5c'), g, [0, 4.05, 0]);
  const lamp = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 16), new THREE.MeshStandardMaterial({ color: '#fff5c0', emissive: new THREE.Color('#ffe27a'), emissiveIntensity: 2 }), g, [0, 4.35, 0]);
  mesh(new THREE.ConeGeometry(0.45, 0.5, 24), std('#e8505b'), g, [0, 4.85, 0]);
  const beam = group(g, [0, 4.35, 0]);
  const bm = new THREE.Mesh(new THREE.ConeGeometry(0.9, 7, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#fff3b0', transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  bm.rotation.z = Math.PI / 2; bm.position.x = 3.5; beam.add(bm);
  sprite(glowTex(), '#ffe9a0', 2.2, g, [0, 4.35, 0], 0.9);
  g.userData = { beam, lamp };
  return g;
}

export function makeBook(parent, color = '#e8505b', size = 1) {
  const g = group(parent); g.scale.setScalar(size);
  const cover = std(color, { roughness: 0.5 });
  mesh(new THREE.BoxGeometry(0.08, 0.06, 0.9), std('#7a2e2e'), g, [0, 0, 0]); // spine
  const L = group(g), R = group(g);
  mesh(new THREE.BoxGeometry(0.62, 0.03, 0.9), cover, L, [-0.31, 0, 0]);
  mesh(new THREE.BoxGeometry(0.58, 0.05, 0.86), std('#fffaf0'), L, [-0.3, 0.035, 0]);
  mesh(new THREE.BoxGeometry(0.62, 0.03, 0.9), cover, R, [0.31, 0, 0]);
  mesh(new THREE.BoxGeometry(0.58, 0.05, 0.86), std('#fffaf0'), R, [0.3, 0.035, 0]);
  g.userData = { setOpen: k => { L.rotation.z = (1 - k) * -1.45 + 0.08; R.rotation.z = (1 - k) * 1.45 - 0.08; } };
  g.userData.setOpen(1);
  return g;
}

export function makeTree(parent, pos, scale = 1) {
  const g = group(parent, pos); g.scale.setScalar(scale);
  const bark = std('#8a5a36', { roughness: 0.95 });
  mesh(new THREE.CylinderGeometry(0.35, 0.6, 3, 14), bark, g, [0, 1.5, 0]);
  for (const [x, y, z, rz, rx] of [[0.6, 2.6, 0, -0.8, 0], [-0.6, 2.8, 0.2, 0.9, 0.2], [0.1, 2.9, -0.6, 0.1, -0.8]]) mesh(new THREE.CylinderGeometry(0.12, 0.2, 1.6, 8), bark, g, [x, y, z], [rx, 0, rz]);
  const leafMats = ['#9bd04a', '#c6e05a', '#7cc04a'].map(c => std(c, { roughness: 0.8, emissive: new THREE.Color('#fff2a0'), emissiveIntensity: 0.08 }));
  const r = rng(42);
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2, d = r() * 1.8;
    mesh(new THREE.IcosahedronGeometry(0.9 + r() * 0.7, 2), leafMats[i % 3], g, [Math.cos(a) * d, 3.8 + r() * 1.6, Math.sin(a) * d * 0.8]);
  }
  const glows = [];
  for (let i = 0; i < 14; i++) {
    const a = r() * Math.PI * 2, d = 1 + r() * 1.6;
    glows.push(sprite(starTex(), '#fff3a0', 0.6, g, [Math.cos(a) * d, 3.5 + r() * 2.2, Math.sin(a) * d * 0.8 + 0.5], 0.9));
  }
  g.userData = { glows };
  return g;
}

export function makeStarChar(parent) {
  const g = group(parent);
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 0.42 : 0.95;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr; i ? sh.lineTo(x, y) : sh.moveTo(x, y);
  }
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.25, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.12, bevelSegments: 6, curveSegments: 4 });
  geo.center();
  const body = mesh(geo, new THREE.MeshPhysicalMaterial({ color: '#ffd23f', roughness: 0.25, clearcoat: 1, emissive: new THREE.Color('#ffb300'), emissiveIntensity: 0.25 }), g);
  for (const s of [1, -1]) {
    mesh(new THREE.SphereGeometry(0.1, 16, 12), std('#2b1a0e', { roughness: 0.1 }), g, [s * 0.18, 0.12, 0.27], null, [1, 1.3, 0.6]);
    mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff' }), g, [s * 0.18 + 0.03, 0.17, 0.33]);
    mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: '#ff8a7a', transparent: true, opacity: 0.6 }), g, [s * 0.33, -0.04, 0.27], null, [1, 0.6, 0.3]);
  }
  mesh(new THREE.TorusGeometry(0.11, 0.025, 8, 16, Math.PI), std('#8a2b1a'), g, [0, -0.06, 0.29], [0, 0, Math.PI]);
  sprite(glowTex(), '#ffe27a', 3, g, [0, 0, -0.2], 0.55);
  return g;
}

export function makeHeart(parent, size = 1, color = '#ff6f9f') {
  const g = group(parent);
  const s = new THREE.Shape();
  s.moveTo(0, -0.9);
  s.bezierCurveTo(-0.2, -0.65, -1.1, -0.2, -1.05, 0.35);
  s.bezierCurveTo(-1.0, 0.95, -0.25, 1.05, 0, 0.55);
  s.bezierCurveTo(0.25, 1.05, 1.0, 0.95, 1.05, 0.35);
  s.bezierCurveTo(1.1, -0.2, 0.2, -0.65, 0, -0.9);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.28, bevelSegments: 10, curveSegments: 24 });
  geo.center();
  mesh(geo, new THREE.MeshPhysicalMaterial({ color, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.5, sheenColor: new THREE.Color('#ffd0e0'), emissive: new THREE.Color(color), emissiveIntensity: 0.18 }), g, null, null, size);
  return g;
}

export function makeFlag(parent, text) {
  const g = group(parent);
  mesh(new THREE.CylinderGeometry(0.05, 0.06, 4.2, 12), std('#d9c27a', { metalness: 0.6, roughness: 0.3 }), g, [0, 2.1, 0]);
  mesh(new THREE.SphereGeometry(0.12, 16, 12), std('#f2c14e', { metalness: 0.7, roughness: 0.25 }), g, [0, 4.25, 0]);
  const geo = new THREE.PlaneGeometry(2.4, 1.6, 36, 18);
  geo.translate(1.2, 0, 0);
  const base = geo.attributes.position.array.slice();
  const flag = mesh(geo, new THREE.MeshStandardMaterial({ map: flagTexture(text), roughness: 0.75, side: THREE.DoubleSide }), g, [0.05, 3.3, 0]);
  g.userData.update = t => {
    const a = geo.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1];
      const k = x / 2.4;
      a.setZ(i, Math.sin(x * 2.2 - t * 3.2 + y * 0.6) * 0.17 * k);
      a.setY(i, y - k * k * 0.08);
    }
    a.needsUpdate = true; geo.computeVertexNormals();
  };
  return g;
}

export function makeSlate(parent) {
  const g = group(parent);
  mesh(new THREE.BoxGeometry(1.0, 0.72, 0.06), std('#b0784a'), g);
  const c = document.createElement('canvas'); c.width = 512; c.height = 360;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  mesh(new THREE.PlaneGeometry(0.88, 0.6), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, emissive: new THREE.Color('#ffffff'), emissiveMap: tex, emissiveIntensity: 0.15 }), g, [0, 0, 0.032]);
  g.userData.draw = (wrong, erase, right) => {
    const x = c.getContext('2d');
    x.fillStyle = '#25443a'; x.fillRect(0, 0, 512, 360);
    x.lineCap = 'round'; x.lineWidth = 18;
    x.font = '900 120px Cairo'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = 'rtl';
    if (wrong > 0 && erase < 1) {
      x.globalAlpha = 1 - erase; x.fillStyle = '#ffffff';
      x.save(); x.beginPath(); x.rect(0, 0, 512 * wrong, 360); x.clip();
      x.fillText('٣ + ٢ = ٤', 256, 180); x.restore();
      x.globalAlpha = 1;
    }
    if (erase > 0 && erase < 1) { x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(512 * (erase - 0.15), 0, 80, 360); }
    if (right > 0) {
      x.fillStyle = '#ffffff'; x.save(); x.beginPath(); x.rect(0, 0, 512 * right, 360); x.clip();
      x.fillText('٣ + ٢ = ٥', 256, 170); x.restore();
      if (right > 0.9) { x.strokeStyle = '#7dff9b'; x.beginPath(); x.moveTo(380, 300); x.lineTo(410, 330); x.lineTo(470, 250); x.stroke(); }
    }
    tex.needsUpdate = true;
  };
  g.userData.draw(0, 0, 0);
  return g;
}

export function makeBulb(parent) {
  const g = group(parent);
  mesh(new THREE.SphereGeometry(0.2, 24, 18), new THREE.MeshStandardMaterial({ color: '#fff7c2', emissive: new THREE.Color('#ffd84a'), emissiveIntensity: 2.2, roughness: 0.1 }), g, [0, 0.05, 0]);
  mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 16), std('#b8b8c0', { metalness: 0.8, roughness: 0.3 }), g, [0, -0.17, 0]);
  sprite(glowTex(), '#ffe680', 1.6, g, [0, 0.05, 0.05], 1);
  return g;
}

export function makeBench(parent, pos) {
  const g = group(parent, pos);
  const wood = std('#c98a55', { roughness: 0.8 });
  mesh(new THREE.BoxGeometry(1.8, 0.08, 0.5), wood, g, [0, 0.34, 0]);
  mesh(new THREE.BoxGeometry(1.8, 0.35, 0.06), wood, g, [0, 0.6, -0.24]);
  for (const x of [-0.75, 0.75]) for (const z of [-0.18, 0.18]) mesh(new THREE.BoxGeometry(0.07, 0.34, 0.07), std('#8a5a36'), g, [x, 0.17, z]);
  return g;
}

export function makeCanopy(parent, pos, color = '#ff9fc4') {
  const g = group(parent, pos);
  for (const [x, z] of [[-1.6, -1.2], [1.6, -1.2], [-1.6, 1.2], [1.6, 1.2]]) mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 10), std('#ffffff'), g, [x, 1.2, z]);
  const roof = mesh(new THREE.ConeGeometry(2.5, 0.9, 4, 1), new THREE.MeshPhysicalMaterial({ color, roughness: 0.6, sheen: 1, sheenColor: new THREE.Color('#ffffff') }), g, [0, 2.8, 0], [0, Math.PI / 4, 0], [1.05, 1, 0.8]);
  return g;
}

export function makeFruit(parent, kind, pos) {
  const g = group(parent, pos);
  if (kind === 'apple') {
    mesh(new THREE.SphereGeometry(0.11, 18, 14), new THREE.MeshPhysicalMaterial({ color: '#e5383b', roughness: 0.25, clearcoat: 1 }), g, null, null, [1, 0.92, 1]);
    mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06), std('#5a3a1a'), g, [0, 0.11, 0]);
    mesh(new THREE.SphereGeometry(0.03, 8, 6), std('#4caf50'), g, [0.03, 0.12, 0], null, [1.4, 0.3, 0.7]);
  } else if (kind === 'orange') {
    mesh(new THREE.SphereGeometry(0.11, 18, 14), new THREE.MeshPhysicalMaterial({ color: '#ff9a1f', roughness: 0.45, clearcoat: 0.6 }), g);
  } else if (kind === 'grapes') {
    for (let i = 0; i < 9; i++) mesh(new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshPhysicalMaterial({ color: '#8e44ad', roughness: 0.2, clearcoat: 1 }), g, [((i % 3) - 1) * 0.06, -Math.floor(i / 3) * 0.06, (i % 2) * 0.03]);
  } else if (kind === 'banana') {
    mesh(new THREE.TorusGeometry(0.16, 0.04, 10, 20, Math.PI * 0.7), new THREE.MeshPhysicalMaterial({ color: '#ffd84a', roughness: 0.4 }), g, null, [0, 0, Math.PI * 1.15]);
  } else if (kind === 'water') {
    mesh(new THREE.CylinderGeometry(0.08, 0.065, 0.22, 20, 1, true), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.05, transparent: true, opacity: 0.35, side: THREE.DoubleSide }), g, [0, 0.11, 0]);
    mesh(new THREE.CylinderGeometry(0.072, 0.063, 0.16, 20), new THREE.MeshPhysicalMaterial({ color: '#6fd0ff', roughness: 0.05, transparent: true, opacity: 0.7 }), g, [0, 0.085, 0]);
  }
  return g;
}

export function makeShieldIcon(color = '#4a8fe7') {
  const s = new THREE.Shape();
  s.moveTo(0, 0.6); s.quadraticCurveTo(0.3, 0.45, 0.5, 0.5); s.quadraticCurveTo(0.55, -0.2, 0, -0.6); s.quadraticCurveTo(-0.55, -0.2, -0.5, 0.5); s.quadraticCurveTo(-0.3, 0.45, 0, 0.6);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 4 }); geo.center();
  return new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color, roughness: 0.2, clearcoat: 1, metalness: 0.2, emissive: new THREE.Color(color), emissiveIntensity: 0.25 }));
}
export function makeHouseIcon(color = '#ffffff') {
  const s = new THREE.Shape();
  s.moveTo(-0.45, -0.45); s.lineTo(0.45, -0.45); s.lineTo(0.45, 0.1); s.lineTo(0.6, 0.1); s.lineTo(0, 0.6); s.lineTo(-0.6, 0.1); s.lineTo(-0.45, 0.1); s.closePath();
  const hole = new THREE.Path(); hole.moveTo(-0.12, -0.45); hole.lineTo(0.12, -0.45); hole.lineTo(0.12, -0.1); hole.lineTo(-0.12, -0.1); hole.closePath(); s.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 3 }); geo.center();
  return new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: 1, emissive: new THREE.Color(color), emissiveIntensity: 0.2 }));
}
export function makeStarIcon(color = '#ffd23f', R = 0.55) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? R * 0.45 : R; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; i ? s.lineTo(x, y) : s.moveTo(x, y); }
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3 }); geo.center();
  return new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color, roughness: 0.2, clearcoat: 1, emissive: new THREE.Color(color), emissiveIntensity: 0.35 }));
}
export function makeHandIcon(color = '#ffe0c2') {
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 0.6, emissive: new THREE.Color(color), emissiveIntensity: 0.15 });
  mesh(new THREE.BoxGeometry(0.62, 0.55, 0.16, 2, 2, 2), mat, g, [0, -0.12, 0]);
  for (let i = 0; i < 4; i++) mesh(new THREE.CapsuleGeometry(0.07, 0.3, 4, 10), mat, g, [-0.22 + i * 0.147, 0.33, 0]);
  mesh(new THREE.CapsuleGeometry(0.075, 0.24, 4, 10), mat, g, [0.4, -0.05, 0], [0, 0, -0.9]);
  return g;
}

/** Points-based falling sparkles inside a box. */
export function makeDust(parent, n, box, color = '#fff2b0', size = 0.15, seed = 3) {
  const r = rng(seed);
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), base = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { base[i * 4] = r(); base[i * 4 + 1] = r(); base[i * 4 + 2] = r(); base[i * 4 + 3] = 0.3 + r(); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ map: starTex(), color, size, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; parent.add(pts);
  pts.userData.update = (t, fall = 1) => {
    for (let i = 0; i < n; i++) {
      const [bx, by, bz, sp] = [base[i * 4], base[i * 4 + 1], base[i * 4 + 2], base[i * 4 + 3]];
      const y = ((by - t * 0.06 * sp * fall) % 1 + 1) % 1;
      pos[i * 3] = box[0][0] + bx * (box[1][0] - box[0][0]) + Math.sin(t * sp + i) * 0.2;
      pos[i * 3 + 1] = box[0][1] + y * (box[1][1] - box[0][1]);
      pos[i * 3 + 2] = box[0][2] + bz * (box[1][2] - box[0][2]);
    }
    geo.attributes.position.needsUpdate = true;
  };
  return pts;
}

/** Confetti (instanced). */
export function makeConfetti(parent, n = 220, seed = 9) {
  const r = rng(seed);
  const geo = new THREE.PlaneGeometry(0.12, 0.07);
  const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.5, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.15 });
  const im = new THREE.InstancedMesh(geo, mat, n); im.frustumCulled = false;
  const cols = ['#5aa9ff', '#ffd23f', '#5ed67a', '#ff8fc0', '#a77bff', '#ff7a59'].map(c => new THREE.Color(c));
  const P = [];
  for (let i = 0; i < n; i++) { P.push([r() * 14 - 7, r() * 8, r() * 6 - 3, r() * 6, 0.4 + r() * 0.8]); im.setColorAt(i, cols[i % cols.length]); }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  im.userData.update = (t) => {
    for (let i = 0; i < n; i++) {
      const [x, y0, z, ph, sp] = P[i];
      const y = 9 - ((y0 + t * sp * 1.2) % 11);
      v.set(x + Math.sin(t * 1.5 + ph) * 0.4, y, z);
      e.set(t * 3 * sp + ph, t * 2 + ph, ph); q.setFromEuler(e);
      m4.compose(v, q, s); im.setMatrixAt(i, m4);
    }
    im.instanceMatrix.needsUpdate = true;
  };
  parent.add(im);
  return im;
}
