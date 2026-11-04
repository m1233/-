import * as THREE from 'three';

/**
 * Glossy "3D" Arabic title rendered on a canvas (extruded look via stacked
 * offsets) and mapped onto a plane. Returns a Mesh whose width = `width` units.
 */
export function titleMesh(text, o = {}) {
  const P = {
    font: '"Reem Kufi"', weight: 700, px: 200, face: ['#fff8d6', '#ffd24a', '#ff9f1c'],
    side: '#b35a00', stroke: '#ffffff', glow: 'rgba(255,214,90,.9)', depth: 16, width: 6, pad: 80, ...o,
  };
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const fontStr = `${P.weight} ${P.px}px ${P.font}`;
  g.font = fontStr;
  const m = g.measureText(text);
  const w = Math.ceil(m.width + P.pad * 2), h = Math.ceil(P.px * 1.9 + P.pad);
  c.width = w; c.height = h;
  g.font = fontStr; g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const x = w / 2, y = h / 2 - P.depth / 2;
  g.lineJoin = 'round';
  // glow
  g.shadowColor = P.glow; g.shadowBlur = P.px * 0.35;
  g.fillStyle = P.side; g.fillText(text, x, y + P.depth);
  g.shadowBlur = 0;
  // extrusion
  for (let i = P.depth; i > 0; i--) {
    g.fillStyle = P.side; g.strokeStyle = P.side; g.lineWidth = P.px * 0.09;
    g.strokeText(text, x, y + i); g.fillText(text, x, y + i);
  }
  // outline
  g.strokeStyle = P.stroke; g.lineWidth = P.px * 0.09; g.strokeText(text, x, y);
  // face gradient
  const gr = g.createLinearGradient(0, y - P.px * 0.6, 0, y + P.px * 0.6);
  P.face.forEach((col, i) => gr.addColorStop(i / (P.face.length - 1), col));
  g.fillStyle = gr; g.fillText(text, x, y);
  // top highlight
  g.save(); g.globalCompositeOperation = 'source-atop';
  const hl = g.createLinearGradient(0, y - P.px * 0.6, 0, y);
  hl.addColorStop(0, 'rgba(255,255,255,.75)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = hl; g.fillRect(0, y - P.px * 0.7, w, P.px * 0.55);
  g.restore();
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const geo = new THREE.PlaneGeometry(P.width, P.width * h / w);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const me = new THREE.Mesh(geo, mat);
  me.renderOrder = 10;
  return me;
}

/** Simple rounded label (badge) texture plane. */
export function badgeMesh(text, o = {}) {
  const P = { px: 90, bg: 'rgba(255,255,255,.92)', color: '#2a3d66', border: '#4a8fe7', width: 3, font: 'Cairo', weight: 800, ...o };
  const c = document.createElement('canvas'); const g = c.getContext('2d');
  g.font = `${P.weight} ${P.px}px ${P.font}`;
  const tw = g.measureText(text).width;
  const w = Math.ceil(tw + P.px * 1.6), h = Math.ceil(P.px * 1.9);
  c.width = w + 20; c.height = h + 20;
  g.font = `${P.weight} ${P.px}px ${P.font}`; g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 14; g.shadowOffsetY = 4;
  g.fillStyle = P.bg; roundRect(g, 10, 10, w, h, h / 2); g.fill();
  g.shadowColor = 'transparent';
  g.lineWidth = P.px * 0.1; g.strokeStyle = P.border; roundRect(g, 10 + P.px * 0.05, 10 + P.px * 0.05, w - P.px * 0.1, h - P.px * 0.1, h / 2); g.stroke();
  g.fillStyle = P.color; g.fillText(text, c.width / 2, c.height / 2 + P.px * 0.05);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const me = new THREE.Mesh(new THREE.PlaneGeometry(P.width, P.width * c.height / c.width),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  me.renderOrder = 11;
  return me;
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

/** Canvas texture for a glyph / symbol (letters, numbers, emoji-free icons). */
export function glyphTex(ch, color = '#ffffff', font = 'Cairo', px = 200, glow = '#ffe27a') {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.font = `900 ${px}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
  g.shadowColor = glow; g.shadowBlur = 30;
  g.lineWidth = 16; g.strokeStyle = 'rgba(255,255,255,.95)'; g.strokeText(ch, 128, 140);
  g.fillStyle = color; g.fillText(ch, 128, 140);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Parchment treasure-map texture with the 5 islands and the title. */
export function mapTexture(title = 'حقوق الطفل') {
  const c = document.createElement('canvas'); c.width = 1400; c.height = 1000;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(700, 500, 100, 700, 500, 820);
  gr.addColorStop(0, '#fbecc8'); gr.addColorStop(0.7, '#efd39a'); gr.addColorStop(1, '#c79a5a');
  g.fillStyle = gr; g.fillRect(0, 0, 1400, 1000);
  // paper fibres
  let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(120,80,30,${r() * 0.06})`; g.fillRect(r() * 1400, r() * 1000, r() * 5 + 1, r() * 2 + 0.5); }
  // border
  g.strokeStyle = '#8a5a2b'; g.lineWidth = 10; g.setLineDash([]); g.strokeRect(40, 40, 1320, 920);
  g.lineWidth = 3; g.strokeRect(60, 60, 1280, 880);
  // dotted path between islands
  const isl = [[1120, 720, '#5aa9ff'], [900, 430, '#ffd23f'], [640, 700, '#5ed67a'], [400, 420, '#ff8fc0'], [210, 690, '#a77bff']];
  g.setLineDash([18, 16]); g.lineWidth = 7; g.strokeStyle = '#a0522d';
  g.beginPath(); isl.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.setLineDash([]);
  for (const [x, y, col] of isl) {
    g.fillStyle = 'rgba(90,60,20,.25)'; g.beginPath(); g.ellipse(x + 6, y + 10, 92, 46, 0, 0, 7); g.fill();
    g.fillStyle = col; g.beginPath(); g.ellipse(x, y, 90, 44, 0, 0, 7); g.fill();
    g.strokeStyle = '#7a4a1e'; g.lineWidth = 5; g.stroke();
    // star marker
    g.fillStyle = '#fff6c9'; star(g, x, y - 6, 26, 11); g.fill(); g.strokeStyle = '#b8860b'; g.lineWidth = 3; g.stroke();
  }
  // compass
  g.save(); g.translate(1200, 200); g.strokeStyle = '#8a5a2b'; g.lineWidth = 4;
  g.beginPath(); g.arc(0, 0, 70, 0, 7); g.stroke();
  g.fillStyle = '#b5482a'; g.beginPath(); g.moveTo(0, -80); g.lineTo(14, 0); g.lineTo(0, 80); g.lineTo(-14, 0); g.closePath(); g.fill();
  g.restore();
  // title
  g.font = '700 150px "Reem Kufi"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
  g.shadowColor = 'rgba(255,200,60,.9)'; g.shadowBlur = 40;
  g.fillStyle = '#7a3b0c'; g.fillText(title, 640, 190);
  g.shadowBlur = 0; g.fillStyle = '#c0641a'; g.fillText(title, 636, 184);
  g.font = '700 54px Cairo'; g.fillStyle = '#7a4a1e'; g.fillText('خريطة الكنوز', 640, 300);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

export function star(g, x, y, R, r, n = 5) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n, rr = i % 2 ? r : R;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
}

/** Flag texture: white embroidered cloth with text. */
export function flagTexture(text) {
  const c = document.createElement('canvas'); c.width = 1200; c.height = 800;
  const g = c.getContext('2d');
  g.fillStyle = '#fbf8ff'; g.fillRect(0, 0, 1200, 800);
  g.strokeStyle = '#8a5cd6'; g.lineWidth = 14; g.strokeRect(36, 36, 1128, 728);
  // embroidery pattern
  for (let i = 0; i < 26; i++) {
    for (const y of [70, 730]) { g.fillStyle = i % 2 ? '#c9a7ff' : '#f2c14e'; g.save(); g.translate(80 + i * 41.5, y); g.rotate(Math.PI / 4); g.fillRect(-10, -10, 20, 20); g.restore(); }
  }
  for (let i = 0; i < 16; i++) {
    for (const x of [70, 1130]) { g.fillStyle = i % 2 ? '#c9a7ff' : '#f2c14e'; g.save(); g.translate(x, 110 + i * 38); g.rotate(Math.PI / 4); g.fillRect(-9, -9, 18, 18); g.restore(); }
  }
  g.font = '700 150px "Reem Kufi"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
  g.fillStyle = '#6b3fc0'; g.fillText(text, 600, 360);
  g.font = '800 70px Cairo'; g.fillStyle = '#b58a1c'; g.fillText('★ ★ ★', 600, 560);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/** Round emotion face texture (happy / sad / calm). */
export function faceTex(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const col = { happy: '#ffd84d', sad: '#8ec5ff', calm: '#b6f0c2' }[kind];
  const gr = g.createRadialGradient(100, 90, 20, 128, 128, 128);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, col); gr.addColorStop(1, col);
  g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill();
  g.fillStyle = '#4a2e1a';
  g.beginPath(); g.ellipse(88, 110, 13, 18, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(168, 110, 13, 18, 0, 0, 7); g.fill();
  g.strokeStyle = '#4a2e1a'; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath();
  if (kind === 'happy') g.arc(128, 150, 48, 0.15 * Math.PI, 0.85 * Math.PI);
  else if (kind === 'sad') g.arc(128, 205, 44, 1.2 * Math.PI, 1.8 * Math.PI);
  else { g.moveTo(92, 170); g.quadraticCurveTo(128, 186, 164, 170); }
  g.stroke();
  g.fillStyle = 'rgba(255,120,140,.45)'; g.beginPath(); g.arc(64, 160, 18, 0, 7); g.arc(192, 160, 18, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
