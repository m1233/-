import * as THREE from 'three';
import { mesh, group, std, clamp, lerp } from './util.js';

const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 6, 14);
const sph = (r, w = 28, h = 20) => new THREE.SphereGeometry(r, w, h);

/**
 * Stylised semi-realistic 3D child (or adult with scale/adult:true).
 * Face looks toward +z. Feet at y=0. Character's left = +x.
 */
export function makeKid(o = {}) {
  const P = {
    skin: '#f0c29e', hair: '#3a2416', dress: '#fff4e6', legs: '#e9d9cf', shoes: '#d9677e', eyes: '#3b2314',
    style: 'girl', scale: 1, shawl: null, hijab: null, coat: false, seed: 1, adult: false, ...o,
  };
  const root = new THREE.Group();
  root.scale.setScalar(P.scale);
  const M = {
    skin: std(P.skin, { roughness: 0.55, emissive: new THREE.Color(P.skin).multiplyScalar(0.08) }),
    hair: std(P.hair, { roughness: 0.42 }),
    dress: new THREE.MeshPhysicalMaterial({ color: P.dress, roughness: 0.75, sheen: 0.6, sheenColor: new THREE.Color('#ffffff') }),
    legs: std(P.legs, { roughness: 0.7 }),
    shoes: std(P.shoes, { roughness: 0.4 }),
    white: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.15 }),
    iris: std(P.eyes, { roughness: 0.1 }),
    pupil: std('#0d0705', { roughness: 0.1 }),
    shine: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
    lip: std('#b8545c', { roughness: 0.4 }),
    mouth: std('#6e1f2a', { roughness: 0.6 }),
    cheek: new THREE.MeshBasicMaterial({ color: '#ff8a9a', transparent: true, opacity: 0.38, depthWrite: false }),
    brow: std(P.style === 'boy' || !P.hair ? P.hair : P.hair, { roughness: 0.6 }),
  };
  const adult = P.adult;
  const hips = group(root, [0, 0.5, 0]);
  const J = { root, hips, M, P };

  // ----- legs
  for (const s of [1, -1]) {
    const thigh = group(hips, [s * 0.075, -0.02, 0]);
    mesh(cap(0.064, 0.2), P.style === 'boy' ? M.dress2 || std(P.pants || '#4a6fa5') : M.legs, thigh, [0, -0.1, 0]);
    const knee = group(thigh, [0, -0.2, 0]);
    mesh(cap(0.056, 0.2), P.style === 'boy' ? std(P.pants || '#4a6fa5') : M.legs, knee, [0, -0.1, 0]);
    const foot = group(knee, [0, -0.225, 0]);
    mesh(sph(0.07), M.shoes, foot, [0, 0, 0.035], null, [1, 0.62, 1.45]);
    J[s > 0 ? 'thighL' : 'thighR'] = thigh; J[s > 0 ? 'kneeL' : 'kneeR'] = knee;
  }

  // ----- lower body
  if (P.style === 'boy') {
    mesh(sph(0.15), std(P.pants || '#4a6fa5'), hips, [0, -0.02, 0], null, [1.05, 0.7, 0.85]);
  } else {
    const hem = adult ? -0.48 : -0.24;
    const skirt = new THREE.LatheGeometry([
      new THREE.Vector2(0.0, hem + 0.01), new THREE.Vector2(adult ? 0.3 : 0.27, hem), new THREE.Vector2(adult ? 0.3 : 0.275, hem + 0.03),
      new THREE.Vector2(0.21, -0.02), new THREE.Vector2(0.16, 0.05), new THREE.Vector2(0.0, 0.06)], 40);
    J.skirt = mesh(skirt, P.coat ? std('#ffffff', { roughness: 0.5 }) : M.dress, hips);
  }

  // ----- spine (bodice, arms, head)
  const spine = group(hips, [0, 0.02, 0]); J.spine = spine;
  const bodice = new THREE.LatheGeometry([
    new THREE.Vector2(0, -0.04), new THREE.Vector2(0.165, -0.04), new THREE.Vector2(0.16, 0.12),
    new THREE.Vector2(0.15, 0.28), new THREE.Vector2(0.125, 0.36), new THREE.Vector2(0.05, 0.42), new THREE.Vector2(0, 0.425)], 36);
  mesh(bodice, P.coat ? std('#ffffff', { roughness: 0.5 }) : M.dress, spine, null, null, [1, 1, 0.82]);
  if (P.coat) { // doctor: stethoscope
    mesh(new THREE.TorusGeometry(0.1, 0.012, 8, 30, Math.PI * 1.3), std('#3d5a80'), spine, [0, 0.3, 0.1], [0.4, 0, Math.PI * 0.85]);
    mesh(sph(0.025), std('#c0c8d0', { metalness: 0.8, roughness: 0.2 }), spine, [0.02, 0.17, 0.14]);
  }
  mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.1, 16), M.skin, spine, [0, 0.45, 0]);

  // arms
  for (const s of [1, -1]) {
    const sh = group(spine, [s * 0.165, 0.355, 0]);
    mesh(sph(0.058), P.coat ? std('#ffffff') : M.dress, sh, [0, 0, 0]);
    mesh(cap(0.047, 0.15), P.coat ? std('#ffffff') : M.dress, sh, [0, -0.08, 0]);
    const el = group(sh, [0, -0.17, 0]);
    mesh(cap(0.041, 0.13), P.short ? M.skin : (P.coat ? std('#ffffff') : M.dress), el, [0, -0.07, 0]);
    const hand = group(el, [0, -0.17, 0]);
    mesh(sph(0.05), M.skin, hand, [0, 0, 0], null, [0.9, 1.05, 0.7]);
    mesh(cap(0.017, 0.035), M.skin, hand, [s * -0.035, 0.012, 0.022], [0, 0, s * 0.7]); // thumb
    J[s > 0 ? 'shL' : 'shR'] = sh; J[s > 0 ? 'elL' : 'elR'] = el; J[s > 0 ? 'handL' : 'handR'] = hand;
  }

  // shawl
  if (P.shawl !== false && P.style === 'girl' && !adult) {
    J.shawlMat = new THREE.MeshPhysicalMaterial({ color: P.shawl || '#4a8fe7', roughness: 0.62, sheen: 1, sheenRoughness: 0.4, sheenColor: new THREE.Color('#ffffff'), side: THREE.DoubleSide });
    const sw = group(spine, [0, 0.36, 0]);
    mesh(new THREE.TorusGeometry(0.15, 0.043, 16, 44), J.shawlMat, sw, [0, 0.02, 0.005], [Math.PI / 2 + 0.14, 0, 0], [1.06, 0.92, 1]);
    // draped over the shoulders and back, open at the front
    mesh(new THREE.CylinderGeometry(0.165, 0.29, 0.3, 48, 3, true, 0.75, Math.PI * 2 - 1.5), J.shawlMat, sw, [0, -0.11, -0.01], null, [1, 1, 0.86]);
    // two soft tails hanging at the front
    for (const s of [1, -1]) mesh(new THREE.CapsuleGeometry(0.035, 0.17, 6, 12), J.shawlMat, sw, [s * 0.075, -0.16, 0.16], [0.14, 0, s * -0.12], [2.0, 1, 0.3]);
    for (let i = 0; i < 6; i++) mesh(sph(0.011, 8, 6), J.shawlMat, sw, [(i < 3 ? -0.11 : 0.05) + (i % 3) * 0.03, -0.315, 0.165]);
    J.shawl = sw;
  }

  // ----- head
  const neckTop = group(spine, [0, 0.5, 0]); J.neck = neckTop;
  const head = group(neckTop, [0, 0.13, 0]); J.head = head;
  const hs = adult ? 0.92 : 1;
  head.scale.setScalar(hs);
  mesh(sph(0.22, 40, 30), M.skin, head, [0, 0, 0], null, [1, 1.03, 0.98]);
  for (const s of [1, -1]) mesh(sph(0.042), M.skin, head, [s * 0.212, -0.01, 0], null, [0.6, 1, 0.8]);
  // eyes
  J.eyes = [];
  for (const s of [1, -1]) {
    const eg = group(head, [s * 0.078, -0.005, 0.178]);
    const ey = group(eg); ey.scale.set(1, 1.18, 1);
    mesh(sph(0.054), M.white, ey, [0, 0, 0], null, [1, 1, 0.72]);
    mesh(sph(0.041), M.iris, ey, [0, -0.004, 0.022], null, [1, 1, 0.62]);
    mesh(sph(0.022), M.pupil, ey, [0, -0.004, 0.036], null, [1, 1, 0.5]);
    const sh1 = mesh(sph(0.012, 10, 8), M.shine, ey, [s * 0.014 + 0.004, 0.017, 0.046]); sh1.castShadow = false;
    const sh2 = mesh(sph(0.006, 8, 6), M.shine, ey, [-0.012, -0.018, 0.045]); sh2.castShadow = false;
    // upper lid line / lashes
    mesh(new THREE.TorusGeometry(0.05, 0.007, 6, 20, Math.PI), M.pupil, ey, [0, 0.003, 0.012], [0, 0, 0], [1.05, 1, 1]);
    J.eyes.push(ey);
    const brow = mesh(cap(0.009, 0.05), M.brow, head, [s * 0.08, 0.095, 0.192], [0, 0, Math.PI / 2 + s * 0.12]);
    J[s > 0 ? 'browL' : 'browR'] = brow;
    const ck = mesh(sph(0.036, 16, 10), M.cheek, head, [s * 0.128, -0.06, 0.168], [0, s * 0.62, 0], [1, 0.72, 0.28]);
    ck.castShadow = false;
  }
  mesh(sph(0.02), M.skin, head, [0, -0.045, 0.215], null, [1, 0.8, 1]);
  const mouth = group(head, [0, -0.1, 0.196], [-0.18, 0, 0]); J.mouth = mouth;
  J.smile = mesh(new THREE.TorusGeometry(0.034, 0.008, 8, 20, Math.PI), M.lip, mouth, [0, 0.012, 0], [0, 0, Math.PI]);
  J.open = mesh(sph(0.03, 18, 12), M.mouth, mouth, [0, -0.004, -0.004], null, [1, 0.2, 0.5]);
  mesh(sph(0.018, 12, 8), std('#ff8a95'), J.open, [0, -0.35, 0.3], null, [1, 0.6, 0.6]);

  // hair / hijab
  if (P.hijab) {
    const hm = new THREE.MeshPhysicalMaterial({ color: P.hijab, roughness: 0.7, sheen: 0.8, sheenColor: new THREE.Color('#ffffff') });
    mesh(sph(0.252, 40, 30), hm, head, [0, 0.015, -0.045], null, [1.02, 1.05, 1]);
    mesh(new THREE.CylinderGeometry(0.14, 0.26, 0.3, 32), hm, head, [0, -0.25, -0.04]);
    // face frame
    mesh(new THREE.TorusGeometry(0.19, 0.03, 10, 40), hm, head, [0, 0.0, 0.11], [0, 0, 0], [0.93, 1.1, 1]);
  } else if (P.style === 'girl') {
    const cp = mesh(new THREE.SphereGeometry(0.236, 48, 28, 0, Math.PI * 2, 0, Math.PI * 0.6), M.hair, head, [0, 0.008, -0.006], [-0.78, 0, 0]);
    cp.scale.set(1.04, 1.05, 1.03);
    // medium-length hair falling behind to the shoulders
    mesh(cap(0.19, 0.16), M.hair, head, [0, -0.17, -0.1], [0.12, 0, 0], [1.12, 1, 0.55]);
    for (const s of [1, -1]) {
      mesh(cap(0.05, 0.2), M.hair, head, [s * 0.2, -0.15, -0.035], [0.05, 0, s * 0.16], [1, 1, 0.85]);
      mesh(sph(0.06), M.hair, head, [s * 0.225, -0.29, -0.04], null, [1, 0.75, 0.9]);
    }
    // swept fringe
    mesh(sph(0.11, 24, 16), M.hair, head, [0.045, 0.135, 0.15], [0.55, 0.15, -0.42], [1.25, 0.36, 0.5]);
    mesh(sph(0.075, 20, 14), M.hair, head, [-0.11, 0.12, 0.15], [0.5, -0.3, 0.55], [1.1, 0.4, 0.5]);
    // soft chin/jaw
    mesh(sph(0.15, 28, 20), M.skin, head, [0, -0.085, 0.06], null, [1, 0.85, 0.95]);
    // hair clip in shawl colour
    if (J.shawlMat) J.clip = mesh(sph(0.035, 16, 10), J.shawlMat, head, [0.15, 0.15, 0.1], null, [1, 0.6, 0.5]);
  } else { // boy
    const cp = mesh(new THREE.SphereGeometry(0.236, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.5), M.hair, head, [0, 0.015, -0.01], [-0.45, 0, 0]);
    cp.scale.set(1.03, 1.05, 1.03);
    mesh(sph(0.09, 16, 10), M.hair, head, [0.04, 0.17, 0.13], [0.5, 0, -0.3], [1.1, 0.5, 0.6]);
    mesh(sph(0.08, 16, 10), M.hair, head, [-0.07, 0.165, 0.12], [0.5, 0, 0.3], [1.1, 0.5, 0.6]);
  }

  root.traverse(o => { if (o.isMesh && o.material === M.cheek) o.castShadow = false; });
  J.update = (st) => poseKid(J, st);
  return J;
}

/** Apply a pose. All fields optional. t = absolute time (for blink/breath). */
export function poseKid(J, st = {}) {
  const t = st.t || 0;
  const s = {
    walk: 0, walkPhase: 0, kneel: 0, sit: 0, bow: 0, jump: 0,
    armL: null, armR: null, elbowL: 0.15, elbowR: 0.15,
    yaw: 0, pitch: 0, roll: 0, talk: 0, smile: 1, sad: 0, surprise: 0, ...st,
  };
  const breath = Math.sin(t * 2.2 + J.P.seed) * 0.012;
  const w = s.walk, ph = s.walkPhase;
  // legs
  const swing = Math.sin(ph) * 0.55 * w;
  let hipY = 0.5 + Math.abs(Math.cos(ph)) * 0.025 * w - 0.012 * w;
  let tL = -swing, tR = swing, kL = Math.max(0, Math.sin(ph + 1.4)) * 0.75 * w, kR = Math.max(0, Math.sin(ph + 1.4 + Math.PI)) * 0.75 * w;
  // kneel (right knee down, left foot forward)
  if (s.kneel > 0) {
    const k = s.kneel;
    hipY = lerp(hipY, 0.27, k);
    tL = lerp(tL, -1.35, k); kL = lerp(kL, 1.45, k);
    tR = lerp(tR, 0.25, k); kR = lerp(kR, 1.75, k);
  }
  if (s.sit > 0) {
    const k = s.sit;
    hipY = lerp(hipY, 0.36, k);
    tL = lerp(tL, -1.5, k); tR = lerp(tR, -1.5, k); kL = lerp(kL, 1.5, k); kR = lerp(kR, 1.5, k);
  }
  hipY += s.jump;
  J.hips.position.y = hipY;
  J.thighL.rotation.set(tL, 0, 0.02); J.thighR.rotation.set(tR, 0, -0.02);
  J.kneeL.rotation.x = kL; J.kneeR.rotation.x = kR;
  if (s.jump > 0.01) { J.kneeL.rotation.x += 0.5; J.kneeR.rotation.x += 0.5; J.thighL.rotation.x -= 0.4; J.thighR.rotation.x -= 0.4; }
  // spine
  J.spine.rotation.set(s.bow * 0.75 + s.kneel * 0.18 + w * 0.05 + breath * 0.3, 0, Math.sin(ph) * 0.03 * w);
  J.spine.scale.y = 1 + breath * 0.25;
  // arms: [forward(+)/back, out(+)]
  const armSw = Math.sin(ph) * 0.5 * w;
  const aL = s.armL || [armSw, 0.12], aR = s.armR || [-armSw, 0.12];
  J.shL.rotation.set(-aL[0], 0, aL[1]); J.shR.rotation.set(-aR[0], 0, -aR[1]);
  J.elL.rotation.x = -s.elbowL; J.elR.rotation.x = -s.elbowR;
  if (s.handRotR !== undefined) J.handR.rotation.x = s.handRotR;
  if (s.handRotL !== undefined) J.handL.rotation.x = s.handRotL;
  // head
  J.neck.rotation.set(s.pitch - s.bow * 0.2, s.yaw, s.roll + Math.sin(t * 0.9 + J.P.seed) * 0.02);
  // blink
  const bp = (t * 0.27 + J.P.seed * 0.137) % 1;
  const blink = bp < 0.035 ? Math.sin((bp / 0.035) * Math.PI) : 0;
  const eyeOpen = (1 - blink * 0.92) * (1 + s.surprise * 0.18) * (1 - s.sad * 0.15);
  for (const e of J.eyes) e.scale.set(1 + s.surprise * 0.08, 1.18 * eyeOpen, 1);
  // brows
  J.browL.position.y = 0.095 + s.surprise * 0.018; J.browR.position.y = 0.095 + s.surprise * 0.018;
  J.browL.rotation.z = Math.PI / 2 + 0.12 - s.sad * 0.35; J.browR.rotation.z = Math.PI / 2 - 0.12 + s.sad * 0.35;
  // mouth
  const talk = clamp(s.talk);
  J.open.scale.set(0.9 + talk * 0.25 + s.surprise * 0.2, 0.15 + talk * 0.85 + s.surprise * 0.6, 0.5);
  J.open.visible = talk > 0.04 || s.surprise > 0.1;
  J.smile.visible = true;
  J.smile.scale.set(1 - s.sad * 0.2, (s.smile - s.sad) * (1 - talk * 0.5) || 0.02, 1);
  J.smile.position.y = 0.012 + talk * 0.01;
}

/** Palette presets for the supporting children (diverse looks). */
export const KIDS = [
  { skin: '#8d5a3b', hair: '#1c120d', dress: '#ffd36e', legs: '#c88e3e', shoes: '#3b7dd8', style: 'girl', seed: 3 },
  { skin: '#f3d0b5', hair: '#a8642f', dress: '#8fd3ff', pants: '#2f4b7c', shoes: '#ffffff', style: 'boy', seed: 5 },
  { skin: '#c68b62', hair: '#2b1a12', dress: '#ff9fbf', legs: '#e6a6bd', shoes: '#7a4fd0', style: 'girl', seed: 7 },
  { skin: '#5e3a26', hair: '#120b08', dress: '#9be38a', pants: '#3b5f3a', shoes: '#f5a623', style: 'boy', seed: 9 },
  { skin: '#e9b98f', hair: '#e2b45d', dress: '#c9a7ff', legs: '#9c7fd6', shoes: '#ff7a7a', style: 'girl', seed: 11 },
  { skin: '#a8714c', hair: '#2a1b10', dress: '#ff8c5a', pants: '#5b4a3a', shoes: '#2fb39a', style: 'boy', seed: 13 },
];
