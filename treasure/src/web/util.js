import * as THREE from 'three';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = t => 1 - Math.pow(1 - t, 3);
export const easeIn = t => t * t * t;
export const easeBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
export const smooth = t => t * t * (3 - 2 * t);
export const pulse = (t, a, b, fade = 0.4) => clamp(Math.min((t - a) / fade, (b - t) / fade));

export function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Keyframed camera: keys = [{t, p:[x,y,z], l:[x,y,z], f:fov}] with eased segments. */
export function camAt(t, keys) {
  if (t <= keys[0].t) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b.t) {
      const k = (b.e || ease)(seg(t, a.t, b.t));
      return {
        p: a.p.map((v, j) => lerp(v, b.p[j], k)),
        l: a.l.map((v, j) => lerp(v, b.l[j], k)),
        f: lerp(a.f ?? 40, b.f ?? 40, k),
      };
    }
  }
  return keys[keys.length - 1];
}

export function std(color, o = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0, ...o });
}

export function mesh(geo, mat, parent, pos, rot, scl) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true; m.receiveShadow = true;
  if (pos) m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  if (scl) (typeof scl === 'number' ? m.scale.setScalar(scl) : m.scale.set(...scl));
  if (parent) parent.add(m);
  return m;
}

export function group(parent, pos, rot) {
  const g = new THREE.Group();
  if (pos) g.position.set(...pos);
  if (rot) g.rotation.set(...rot);
  if (parent) parent.add(g);
  return g;
}

/** Soft radial glow sprite texture (cached). */
let _glowTex;
export function glowTex() {
  if (_glowTex) return _glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.55)');
  gr.addColorStop(0.6, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  _glowTex = new THREE.CanvasTexture(c); _glowTex.colorSpace = THREE.SRGBColorSpace;
  return _glowTex;
}

let _starTex;
export function starTex() {
  if (_starTex) return _starTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.15, 'rgba(255,250,220,.8)'); gr.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.globalCompositeOperation = 'lighter';
  for (const [w, h] of [[2.5, 60], [60, 2.5]]) {
    const lg = g.createRadialGradient(64, 64, 0, 64, 64, 60);
    lg.addColorStop(0, 'rgba(255,255,255,1)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = lg; g.fillRect(64 - w, 64 - h, w * 2, h * 2);
  }
  _starTex = new THREE.CanvasTexture(c); _starTex.colorSpace = THREE.SRGBColorSpace;
  return _starTex;
}

export function sprite(tex, color, size, parent, pos, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(size);
  if (pos) s.position.set(...pos);
  if (parent) parent.add(s);
  return s;
}
