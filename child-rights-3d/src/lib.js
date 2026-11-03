"use strict";
/* Shared engine helpers, gradients, semi-realistic icon library and character builder (from the approved v2 design). */
const TL = window.TL, P = window.PLAN;
const W = 1080, H = 1920, NS = "http://www.w3.org/2000/svg";
const $ = s => document.querySelector(s);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const win = (t, a, b, fi = .4, fo = .4) => prog(t, a, a + fi) * (1 - prog(t, b - fo, b));
const E = {
  io: k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2,
  out: k => 1 - Math.pow(1 - k, 3),
  back: k => { const c = 1.4; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
  el: k => k === 0 ? 0 : k === 1 ? 1 : Math.pow(2, -10 * k) * Math.sin((k * 10 - .75) * 2.094) + 1,
};
const hash = (i, s = 1) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
const anims = []; const on = f => anims.push(f);
function el(tag, attrs = {}, parent, html) {
  const e = document.createElement(tag);
  for (const k in attrs) k === "style" ? e.style.cssText = attrs[k] : e.setAttribute(k, attrs[k]);
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}
function svgEl(parent, w, h, inner, style = "") {
  const d = el("div", { class: "abs", style }, parent);
  d.innerHTML = `<svg xmlns="${NS}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`;
  return d;
}
const tf = (e, s) => { e.style.transform = s; };
const op = (e, v) => { e.style.opacity = v; e.style.visibility = v <= 0.001 ? "hidden" : "visible"; };
const popScale = (t, t0, d = .6) => E.back(prog(t, t0, t0 + d));

/* =========================== SHARED GRADIENTS =========================== */
(function defs() {
  const stops = st => st.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join("");
  const lin = (id, st, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops(st)}</linearGradient>`;
  const rad = (id, st, cx = .5, cy = .5, r = .5) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}" fx="${cx}" fy="${cy}">${stops(st)}</radialGradient>`;
  const H3 = (id, a, b, c) => lin(id, [[0, a], [.5, b], [1, c]], 1, 0);
  $("#defs").innerHTML = `<defs>
  ${lin("gold", [[0, "#FFF6C8"], [.45, "#FFD54A"], [.75, "#E0A21B"], [1, "#9C6510"]])}
  ${lin("silver", [[0, "#FFFFFF"], [.5, "#D9DEE8"], [1, "#8C95A6"]])}
  ${lin("metal", [[0, "#646B80"], [.6, "#2C3140"], [1, "#171A23"]])}
  ${rad("sphere", [[0, "#fff", .6], [.35, "#fff", 0], [.7, "#000", 0], [1, "#000", .38]], .35, .3, .75)}
  ${rad("glassOrb", [[0, "#ffffff", .55], [.4, "#C7D2FF", .14], [.82, "#9C8CFF", .22], [1, "#ffffff", .6]], .38, .32, .7)}
  ${rad("orbDeep", [[0, "#7E6BFF"], [.7, "#3A2A9E"], [1, "#1C1258"]], .4, .35, .75)}
  ${rad("cloud", [[0, "#FFFFFF"], [.55, "#F5F3FF"], [1, "#C9C4E8"]], .42, .32, .72)}
  ${rad("skin", [[0, "#FCE0CB"], [.65, "#EFBA9C"], [1, "#D39577"]], .42, .36, .7)}
  ${lin("skinD", [[0, "#EBB394"], [1, "#C88466"]])}
  ${lin("hairDark", [[0, "#5A3D2B"], [1, "#1F130C"]])}
  ${lin("hairBrown", [[0, "#9A6644"], [1, "#4A2C1C"]])}
  ${lin("hairBlack", [[0, "#3E3E4E"], [1, "#0F0F16"]])}
  ${rad("iris", [[0, "#A06A35"], [.7, "#4A2A12"], [1, "#24130A"]])}
  ${rad("apple", [[0, "#FF9A9A"], [.35, "#E8323C"], [.8, "#A3121E"], [1, "#6E0A14"]], .38, .32, .72)}
  ${rad("orange", [[0, "#FFD69A"], [.4, "#FF9A1F"], [.85, "#E06A00"], [1, "#A84800"]], .38, .32, .72)}
  ${rad("straw", [[0, "#FF8A95"], [.5, "#E0202F"], [1, "#8E0C18"]], .4, .32, .75)}
  ${rad("grape", [[0, "#D7BDFF"], [.5, "#7B3FD1"], [1, "#35106E"]], .35, .3, .7)}
  ${H3("carrot", "#FFB04A", "#F07A12", "#B84E00")}
  ${lin("banana", [[0, "#FFF6B0"], [.5, "#F7D23A"], [1, "#BE900E"]])}
  ${lin("leaf", [[0, "#9BE88A"], [1, "#2A7E3A"]])}
  ${lin("leafD", [[0, "#6FCB72"], [1, "#1A5C2C"]])}
  ${H3("wood", "#D49660", "#A5652F", "#6E3E1C")}
  ${rad("heart", [[0, "#FFD0E4"], [.42, "#FF5C9A"], [.8, "#D61F6A"], [1, "#8E0F45"]], .36, .3, .78)}
  ${lin("wall", [[0, "#E6F3FF"], [1, "#A5CDF2"]])}
  ${lin("wallSide", [[0, "#93BCE2"], [1, "#5F8DBA"]])}
  ${lin("roof", [[0, "#FFE594"], [.6, "#F0AE3A"], [1, "#B97710"]])}
  ${lin("roofSide", [[0, "#D99A2E"], [1, "#8E5A0C"]])}
  ${rad("window", [[0, "#FFF8D0"], [.5, "#FFD45E"], [1, "#E08D1F"]])}
  ${lin("door", [[0, "#F0A0C4"], [1, "#A9466F"]])}
  ${lin("rock", [[0, "#9585C4"], [.45, "#5D4F93"], [1, "#241C48"]])}
  ${lin("grass", [[0, "#B5F5A8"], [1, "#3FA860"]])}
  ${lin("sand", [[0, "#F8E7B8"], [1, "#CFAA6A"]])}
  ${lin("water", [[0, "#B5E6FF"], [.55, "#4C9FE0"], [1, "#1D568F"]])}
  ${lin("page", [[0, "#FFFDF6"], [1, "#E7DCBE"]])}
  ${H3("bookR", "#FF8695", "#E03A55", "#9A1E36")}
  ${H3("bookB", "#8BC8FF", "#3C8CE0", "#1D529A")}
  ${H3("bookY", "#FFE79A", "#F2B93B", "#AE780E")}
  ${H3("bookG", "#9AF2C6", "#3CC48A", "#1A7450")}
  ${H3("bookP", "#DBC2FF", "#9A6BEB", "#55309C")}
  ${H3("bookK", "#FFCEE6", "#F27DB4", "#A54278")}
  ${H3("coat", "#FFFFFF", "#EEF2F8", "#BFC9DC")}
  ${H3("pants", "#4A5A80", "#2C3756", "#181F33")}
  ${H3("shirtBlue", "#9CD0FF", "#4A90E0", "#2A5BA0")}
  ${H3("shirtPink", "#FFC8E0", "#F07AB0", "#A84278")}
  ${H3("shirtYellow", "#FFF2A8", "#F6CB3B", "#B88812")}
  ${H3("shirtMint", "#C2FFE6", "#4FD6A0", "#258A64")}
  ${H3("shirtPurple", "#DCC8FF", "#9A72F0", "#5A38A8")}
  ${rad("shadow", [[0, "#000", .45], [1, "#000", 0]])}
  ${rad("glowY", [[0, "#FFE7A0", .95], [1, "#FFC850", 0]])}
  ${rad("glowP", [[0, "#FFB4D8", .9], [1, "#FF8CC4", 0]])}
  ${rad("glowB", [[0, "#A8D4FF", .85], [1, "#6AA8FF", 0]])}
  ${rad("glowW", [[0, "#FFFFFF", .9], [1, "#FFFFFF", 0]])}
  ${lin("screen", [[0, "#8FDBFF"], [1, "#2A5FD0"]])}
  ${lin("battery", [[0, "#C8FFB8"], [1, "#2DB04E"]])}
  ${H3("fabric", "#86B8F6", "#3E74C8", "#22478A")}
  ${H3("gift", "#FFB3D6", "#E8679C", "#A83A68")}
  ${rad("balloonB", [[0, "#E6F4FF"], [.32, "#79BEFF"], [.85, "#2C78D0"], [1, "#183F80"]], .36, .3, .78)}
  ${rad("balloonP", [[0, "#FFEEF6"], [.32, "#FFA6CF"], [.85, "#DD5593"], [1, "#932A5C"]], .36, .3, .78)}
  ${rad("planet", [[0, "#B8DDFF"], [.5, "#5E78F0"], [1, "#24247E"]], .38, .32, .72)}
  ${rad("brain", [[0, "#FFE0EC"], [.6, "#F59AC0"], [1, "#B5527F"]], .4, .35, .75)}
  ${lin("ringG", [[0, "#FFE7A0"], [.5, "#FFB8DE"], [1, "#B49CFF"]], 1, 0)}
  </defs>`;
})();

/* =========================== SEMI-REALISTIC ICONS (viewBox 200) =========================== */
const sh = (cx = 100, cy = 186, rx = 64, ry = 10) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#shadow)"/>`;
const hl = (cx, cy, rx, ry, rot = -25, o = .5) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" opacity="${o}" transform="rotate(${rot} ${cx} ${cy})"/>`;
function book3d(x, y, w, h, d, g) {
  return `<path d="M${x} ${y} l${d} ${-d * .55} h${w} l${-d} ${d * .55}z" fill="url(#page)"/>
    <path d="M${x + w} ${y} l${d} ${-d * .55} v${h} l${-d} ${d * .55}z" fill="url(#page)" opacity=".85"/>
    ${Array.from({ length: 4 }, (_, i) => `<line x1="${x + w + 2}" y1="${y + h * (i + 1) / 5}" x2="${x + w + d - 2}" y2="${y + h * (i + 1) / 5 - d * .55}" stroke="#CDBF98" stroke-width="1.5"/>`).join("")}
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="url(#${g})"/>
    <rect x="${x + 8}" y="${y + h * .3}" width="${w - 16}" height="${h * .12}" fill="#FFE7A0" opacity=".85"/><rect x="${x + 8}" y="${y + h * .62}" width="${w * .5}" height="${h * .08}" fill="#FFE7A0" opacity=".6"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h * .18}" fill="#fff" opacity=".18"/>`;
}
const ICONS = {
  apple: () => `${sh()}<path d="M100 62 C70 40,28 58,30 104 C32 150,66 182,100 170 C134 182,168 150,170 104 C172 58,130 40,100 62Z" fill="url(#apple)"/>${hl(70, 92, 13, 24)}
    <path d="M100 64 Q98 40 110 24" fill="none" stroke="#6E3E1C" stroke-width="7" stroke-linecap="round"/><path d="M108 44 C122 20,152 22,162 34 C146 54,122 56,108 44Z" fill="url(#leaf)"/>`,
  orange: () => `${sh()}<circle cx="100" cy="108" r="66" fill="url(#orange)"/>${Array.from({ length: 22 }, (_, i) => `<circle cx="${100 + Math.cos(i * 2.4) * (12 + (i * 7) % 50)}" cy="${108 + Math.sin(i * 2.4) * (12 + (i * 7) % 50)}" r="1.8" fill="#8A3A00" opacity=".25"/>`).join("")}
    ${hl(74, 84, 14, 22)}<path d="M100 44 C112 26,140 26,150 36 C136 50,114 52,100 44Z" fill="url(#leaf)"/>`,
  strawberry: () => `${sh(100, 186, 50)}<path d="M100 180 C58 160,32 110,44 80 C54 56,80 62,100 66 C120 62,146 56,156 80 C168 110,142 160,100 180Z" fill="url(#straw)"/>
    ${Array.from({ length: 16 }, (_, i) => `<ellipse cx="${62 + (i % 4) * 25 + (Math.floor(i / 4) % 2) * 12}" cy="${88 + Math.floor(i / 4) * 22}" rx="2.6" ry="4" fill="#FFE38A" opacity=".9"/>`).join("")}${hl(70, 92, 9, 18, -20, .45)}
    <path d="M100 70 L80 50 L96 60 L100 38 L104 60 L120 50Z M70 66 Q100 56 130 66 Q100 80 70 66Z" fill="url(#leafD)"/>`,
  grapes: () => `${sh(100, 188, 46)}<path d="M100 40 Q104 22 120 14" fill="none" stroke="#6E3E1C" stroke-width="6" stroke-linecap="round"/><path d="M104 34 C122 18,150 24,156 36 C138 46,118 44,104 34Z" fill="url(#leaf)"/>
    ${[[78, 62], [122, 62], [100, 64], [66, 96], [100, 96], [134, 96], [80, 128], [120, 128], [100, 158]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="23" fill="url(#grape)"/><circle cx="${x}" cy="${y}" r="23" fill="url(#sphere)"/>`).join("")}`,
  carrot: () => `${sh(100, 188, 34, 7)}<path d="M64 70 C80 62,120 62,136 70 L106 184 Q100 194 94 184Z" fill="url(#carrot)"/>
    ${[90, 110, 130, 150].map(y => `<path d="M${76 + (y - 70) * .25} ${y} q12 -4 22 0" stroke="#9A4100" stroke-width="3" fill="none" opacity=".45"/>`).join("")}
    <path d="M100 68 C90 40,74 26,64 22 C84 32,96 46,100 66 C104 40,114 22,126 12 C116 34,108 50,104 68 C118 48,136 40,150 40 C134 48,118 58,106 70Z" fill="url(#leaf)"/>`,
  banana: () => `${sh(100, 182, 60, 8)}<path d="M36 70 C46 140,120 176,170 136 C176 130,172 124,164 128 C120 150,74 130,56 66 C54 58,38 58,36 70Z" fill="url(#banana)"/><path d="M36 70 l-6 -12 l10 -4 l6 12z" fill="#5A3A14"/>${hl(80, 120, 8, 30, -50, .35)}`,
  books: () => `${sh(100, 186, 78)}${book3d(30, 140, 120, 32, 22, "bookB")}${book3d(40, 106, 112, 30, 22, "bookR")}${book3d(26, 74, 118, 30, 22, "bookY")}`,
  openbook: () => `<circle cx="100" cy="100" r="90" fill="url(#glowY)" opacity=".6"/>${sh(100, 176, 80)}
    <path d="M100 58 C76 44,40 44,18 52 L18 160 C40 152,76 152,100 166Z" fill="url(#page)"/><path d="M100 58 C124 44,160 44,182 52 L182 160 C160 152,124 152,100 166Z" fill="url(#page)"/>
    <path d="M100 58 V166" stroke="#C9B88E" stroke-width="3"/>${[76, 92, 108, 124, 140].map(y => `<path d="M32 ${y} q30 -6 56 2 M112 ${y + 2} q26 -8 56 -2" stroke="#B9AE95" stroke-width="3" fill="none" opacity=".7"/>`).join("")}
    <path d="M18 160 C40 152,76 152,100 166 C124 152,160 152,182 160 L182 168 C160 160,124 160,100 174 C76 160,40 160,18 168Z" fill="#A5652F"/>`,
  rocket: () => `<path d="M80 150 Q100 200 120 150 Q110 168 100 190 Q90 168 80 150Z" fill="url(#glowY)"/><path d="M88 150 Q100 182 112 150Z" fill="#FFB24A"/>
    <path d="M100 14 C130 40,138 90,128 150 L72 150 C62 90,70 40,100 14Z" fill="url(#silver)"/><path d="M100 14 C114 26,122 40,126 56 L74 56 C78 40,86 26,100 14Z" fill="url(#heart)"/>
    <path d="M72 120 L46 156 L74 150Z M128 120 L154 156 L126 150Z" fill="url(#heart)"/><circle cx="100" cy="92" r="20" fill="url(#metal)"/><circle cx="100" cy="92" r="14" fill="url(#screen)"/>${hl(94, 86, 5, 8, -30, .7)}
    <rect x="72" y="146" width="56" height="8" rx="3" fill="url(#metal)"/>${hl(84, 80, 5, 36, 0, .35)}`,
  balloon: () => `<path d="M100 166 C94 178,108 186,100 198" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/><ellipse cx="100" cy="88" rx="62" ry="76" fill="url(#balloonP)"/>${hl(78, 56, 12, 22, -25, .6)}<path d="M94 162 h12 l-6 8z" fill="#932A5C"/>`,
  house: () => `${sh(100, 182, 84)}<path d="M150 100 L176 86 L176 166 L150 178Z" fill="url(#wallSide)"/><rect x="34" y="100" width="116" height="78" fill="url(#wall)"/>
    <path d="M24 106 L92 44 L160 106Z" fill="url(#roof)"/><path d="M92 44 L124 30 L186 90 L160 106Z" fill="url(#roofSide)"/>
    <rect x="48" y="118" width="30" height="28" rx="3" fill="url(#window)"/><rect x="106" y="118" width="30" height="28" rx="3" fill="url(#window)"/><path d="M80 178 V150 Q92 138 104 150 V178Z" fill="url(#door)"/><circle cx="92" cy="125" r="40" fill="url(#glowY)" opacity=".25"/>`,
  planet: () => `<ellipse cx="100" cy="104" rx="92" ry="24" fill="none" stroke="url(#ringG)" stroke-width="10" opacity=".7" transform="rotate(-18 100 104)"/>
    <circle cx="100" cy="100" r="58" fill="url(#planet)"/><path d="M46 88 Q100 74 154 96 M44 112 Q100 100 156 120" stroke="#fff" stroke-width="6" opacity=".2" fill="none"/><circle cx="100" cy="100" r="58" fill="url(#sphere)"/>
    <path d="M8 106 A92 24 -18 0 0 192 102" fill="none" stroke="url(#ringG)" stroke-width="10" transform="rotate(-18 100 104)"/>`,
  laptop: () => `${sh(100, 176, 86)}<path d="M18 160 L182 160 L170 142 L30 142Z" fill="url(#silver)"/><path d="M84 152 h32" stroke="#8C95A6" stroke-width="4" stroke-linecap="round"/>
    <rect x="34" y="36" width="132" height="106" rx="8" fill="url(#metal)"/><rect x="42" y="44" width="116" height="90" rx="4" fill="url(#screen)"/>
    ${[56, 70, 84, 98, 112].map((y, i) => `<rect x="${54 + (i % 2) * 14}" y="${y}" width="${40 + (i * 23) % 50}" height="6" rx="3" fill="#fff" opacity=".7"/>`).join("")}<path d="M42 44 L100 44 L60 134 L42 134Z" fill="#fff" opacity=".1"/>`,
  microscope: () => `${sh(100, 182, 70)}<ellipse cx="100" cy="172" rx="62" ry="12" fill="url(#metal)"/><path d="M120 168 C150 150,150 96,118 74" fill="none" stroke="url(#metal)" stroke-width="18" stroke-linecap="round"/>
    <rect x="60" y="128" width="72" height="10" rx="4" fill="url(#metal)"/><g transform="rotate(-28 92 80)"><rect x="80" y="22" width="26" height="96" rx="6" fill="url(#silver)"/><rect x="76" y="14" width="34" height="16" rx="4" fill="url(#metal)"/><rect x="84" y="116" width="18" height="16" rx="3" fill="url(#gold)"/></g>`,
  stethoscope: () => `<path d="M60 26 C50 80,70 118,100 118 C130 118,150 80,140 26" fill="none" stroke="#2B2F3A" stroke-width="10" stroke-linecap="round"/><circle cx="60" cy="24" r="7" fill="url(#silver)"/><circle cx="140" cy="24" r="7" fill="url(#silver)"/>
    <path d="M100 118 C100 160,130 168,148 150" fill="none" stroke="#2B2F3A" stroke-width="10" stroke-linecap="round"/><circle cx="152" cy="146" r="22" fill="url(#silver)"/><circle cx="152" cy="146" r="14" fill="url(#metal)"/>${hl(146, 138, 4, 7, -30, .7)}`,
  pill: () => `${sh(100, 170, 60, 8)}<g transform="rotate(-35 100 100)"><path d="M52 76 h48 v48 h-48 a24 24 0 0 1 0 -48z" fill="url(#heart)"/><path d="M100 76 h48 a24 24 0 0 1 0 48 h-48z" fill="url(#silver)"/>
    <rect x="44" y="82" width="104" height="10" rx="5" fill="#fff" opacity=".45"/></g>`,
  ball: () => `${sh(100, 184, 60, 9)}<circle cx="100" cy="100" r="74" fill="#fff"/>${["#FF5C7A", "#FFC83D", "#4FA8FF", "#4FD08A", "#B07CFF", "#FF9A3C"].map((c, i) => `<path d="M100 100 L${100 + 74 * Math.cos(i * 1.047)} ${100 + 74 * Math.sin(i * 1.047)} A74 74 0 0 1 ${100 + 74 * Math.cos((i + .5) * 1.047)} ${100 + 74 * Math.sin((i + .5) * 1.047)}Z" fill="${c}"/>`).join("")}
    <circle cx="100" cy="100" r="74" fill="url(#sphere)"/><circle cx="100" cy="100" r="12" fill="#fff"/>`,
  palette: () => `${sh(100, 180, 80)}<path d="M100 26 C150 26,186 58,182 100 C180 124,156 120,150 136 C144 156,160 176,124 178 C66 182,18 148,20 102 C22 58,58 26,100 26Z" fill="url(#wood)"/><circle cx="128" cy="138" r="13" fill="#4A2A12"/>
    ${[[62, 74, "#FF4D6D"], [100, 56, "#FFC83D"], [140, 70, "#4FA8FF"], [52, 116, "#4FD08A"], [84, 146, "#B07CFF"]].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="15" fill="${c}"/><circle cx="${x}" cy="${y}" r="15" fill="url(#sphere)"/>`).join("")}`,
  mic: () => `<g transform="rotate(-25 100 100)"><rect x="88" y="96" width="24" height="90" rx="10" fill="url(#metal)"/><rect x="84" y="94" width="32" height="12" rx="4" fill="url(#gold)"/>
    <circle cx="100" cy="62" r="40" fill="url(#silver)"/>${Array.from({ length: 7 }, (_, i) => `<line x1="${68 + i * 10}" y1="30" x2="${68 + i * 10}" y2="94" stroke="#7D8698" stroke-width="2" opacity=".6"/>`).join("")}<circle cx="100" cy="62" r="40" fill="url(#sphere)"/></g>`,
  speech: () => `<path d="M30 40 h140 a20 20 0 0 1 20 20 v62 a20 20 0 0 1 -20 20 h-80 l-36 30 l6 -30 h-30 a20 20 0 0 1 -20 -20 v-62 a20 20 0 0 1 20 -20z" fill="url(#shirtBlue)"/>
    <circle cx="66" cy="92" r="11" fill="#fff"/><circle cx="100" cy="92" r="11" fill="#fff"/><circle cx="134" cy="92" r="11" fill="#fff"/><path d="M30 44 h130 a20 20 0 0 1 14 6 Q100 40 30 70z" fill="#fff" opacity=".25"/>`,
  bulb: () => `<circle cx="100" cy="80" r="90" fill="url(#glowY)" opacity=".7"/><circle cx="100" cy="80" r="52" fill="#FFF3B0" opacity=".9"/><circle cx="100" cy="80" r="52" fill="url(#glassOrb)"/>
    <path d="M86 96 q7 -22 14 0 q7 -22 14 0" fill="none" stroke="#E08D1F" stroke-width="4"/><rect x="78" y="128" width="44" height="34" rx="6" fill="url(#silver)"/><path d="M78 138 h44 M78 148 h44" stroke="#8C95A6" stroke-width="3"/><path d="M88 162 h24 l-6 12 h-12z" fill="url(#metal)"/>`,
  gamepad: () => `${sh(100, 166, 80, 8)}<path d="M50 60 h100 c30 0,46 30,46 64 c0 30,-24 40,-40 20 l-18 -22 h-76 l-18 22 c-16 20,-40 10,-40 -20 c0 -34,16 -64,46 -64z" fill="url(#metal)"/>
    <path d="M52 92 h30 M67 77 v30" stroke="#9AA3B8" stroke-width="10" stroke-linecap="round"/>${[[134, 80, "#FF5C7A"], [152, 96, "#4FA8FF"], [116, 96, "#FFC83D"], [134, 112, "#4FD08A"]].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="9" fill="${c}"/><circle cx="${x}" cy="${y}" r="9" fill="url(#sphere)"/>`).join("")}<path d="M50 62 h100 c14 0,26 6,34 18 Q100 56 50 74z" fill="#fff" opacity=".18"/>`,
  heart: () => `<path d="M100 178 C40 140,14 100,22 66 C30 32,72 22,100 56 C128 22,170 32,178 66 C186 100,160 140,100 178Z" fill="url(#heart)"/>${hl(60, 64, 14, 24, -35, .55)}`,
  dove: () => `<path d="M30 112 C60 92,96 88,124 98 C140 70,166 60,186 66 C170 74,160 86,156 100 C176 110,182 128,174 140 C150 132,128 134,112 146 C90 162,56 158,40 140 L14 150 L30 124Z" fill="#F4F7FF"/>
    <path d="M70 104 C90 60,120 36,150 30 C140 56,120 84,96 108Z" fill="#DCE3F2"/><circle cx="162" cy="76" r="4" fill="#24130A"/><path d="M182 68 l14 4 l-14 4z" fill="#F0A33A"/><path d="M186 74 q-14 20 -36 26" stroke="#2A7E3A" stroke-width="4" fill="none"/><ellipse cx="160" cy="98" rx="9" ry="5" fill="url(#leaf)"/>`,
  shield: () => `${sh(100, 186, 60)}<path d="M100 14 L170 40 C172 110,148 158,100 184 C52 158,28 110,30 40Z" fill="url(#gold)"/><path d="M100 30 L156 50 C156 108,136 146,100 166 C64 146,44 108,44 50Z" fill="url(#orbDeep)"/>
    <path d="M100 136 C70 116,58 96,62 82 C66 66,88 62,100 78 C112 62,134 66,138 82 C142 96,130 116,100 136Z" fill="url(#heart)"/>${hl(70, 60, 8, 22, -20, .35)}`,
  battery: () => `${sh(100, 186, 50, 8)}<rect x="84" y="12" width="32" height="14" rx="4" fill="url(#metal)"/><rect x="54" y="24" width="92" height="156" rx="16" fill="url(#metal)"/><rect x="62" y="32" width="76" height="140" rx="10" fill="#0E1E14"/>
    <rect x="62" y="80" width="76" height="92" rx="10" fill="url(#battery)"/><path d="M106 56 L82 112 H100 L92 150 L122 92 H104Z" fill="url(#gold)"/><rect x="62" y="32" width="18" height="140" rx="8" fill="#fff" opacity=".18"/>`,
  backpack: () => `${sh(100, 186, 64)}<path d="M64 46 Q64 18 100 18 Q136 18 136 46" fill="none" stroke="#22478A" stroke-width="10"/><path d="M42 70 Q42 40 100 40 Q158 40 158 70 V164 Q158 180 140 180 H60 Q42 180 42 164Z" fill="url(#fabric)"/>
    <path d="M60 116 H140 V160 Q140 170 130 170 H70 Q60 170 60 160Z" fill="#2F5FA8"/><path d="M60 128 H140" stroke="#E0A21B" stroke-width="4"/><rect x="92" y="122" width="16" height="12" rx="3" fill="url(#gold)"/><path d="M48 74 Q60 52 100 50" stroke="#fff" stroke-width="5" opacity=".25" fill="none"/>`,
  gift: () => `${sh(100, 186, 72)}<rect x="36" y="88" width="128" height="94" rx="6" fill="url(#gift)"/><rect x="28" y="66" width="144" height="30" rx="6" fill="url(#gift)"/><rect x="88" y="66" width="24" height="116" fill="url(#gold)"/>
    <path d="M100 66 C70 30,44 46,62 64Z M100 66 C130 30,156 46,138 64Z" fill="url(#gold)"/><rect x="28" y="66" width="144" height="8" fill="#fff" opacity=".25"/>`,
  lock: () => `<path d="M64 92 V64 Q64 28 100 28 Q136 28 136 64 V92" fill="none" stroke="#C9CFDA" stroke-width="16"/><rect x="44" y="88" width="112" height="92" rx="16" fill="url(#gold)"/><circle cx="100" cy="126" r="12" fill="#3A2408"/><rect x="95" y="130" width="10" height="26" rx="4" fill="#3A2408"/>${hl(64, 108, 6, 16, 0, .4)}`,
  unlock: () => `<path d="M64 78 V64 Q64 28 100 28 Q136 28 136 64 V70" fill="none" stroke="#C9CFDA" stroke-width="16" transform="rotate(-25 64 92)"/><rect x="44" y="88" width="112" height="92" rx="16" fill="url(#gold)"/><circle cx="100" cy="126" r="12" fill="#3A2408"/><rect x="95" y="130" width="10" height="26" rx="4" fill="#3A2408"/>`,
  star: () => { const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 36 : 88; return [100 + Math.cos(a) * r, 104 + Math.sin(a) * r]; });
    return `<circle cx="100" cy="104" r="96" fill="url(#glowY)" opacity=".3"/>` + pts.map((p, i) => { const q = pts[(i + 1) % 10]; return `<path d="M100 104 L${p[0]} ${p[1]} L${q[0]} ${q[1]}Z" fill="${i % 2 ? "url(#roofSide)" : "url(#gold)"}"/>`; }).join(""); },
  trophy: () => `${sh(100, 190, 70)}<path d="M56 40 C20 40,22 96,64 100 M144 40 C180 40,178 96,136 100" fill="none" stroke="#E0A21B" stroke-width="12"/><path d="M50 26 H150 C150 96,128 122,100 126 C72 122,50 96,50 26Z" fill="url(#gold)"/>
    <rect x="90" y="124" width="20" height="30" fill="url(#gold)"/><path d="M62 172 h76 l-8 -20 h-60z" fill="url(#gold)"/><rect x="52" y="170" width="96" height="18" rx="4" fill="url(#wood)"/>${hl(72, 60, 8, 26, -10, .45)}
    <path d="M100 44 l8 16 l18 2 l-13 12 l4 18 l-17 -9 l-17 9 l4 -18 l-13 -12 l18 -2z" fill="#FFF4C4"/>`,
  brain: () => `<path d="M100 40 C70 26,34 40,32 74 C16 86,18 122,40 134 C44 160,76 172,100 158 C124 172,156 160,160 134 C182 122,184 86,168 74 C166 40,130 26,100 40Z" fill="url(#brain)"/>
    <path d="M100 42 V156 M58 70 q16 10 10 26 q-14 8 -6 24 M142 70 q-16 10 -10 26 q14 8 6 24 M76 50 q10 12 0 22 M124 50 q-10 12 0 22 M60 130 q14 -4 20 8 M140 130 q-14 -4 -20 8" fill="none" stroke="#B5527F" stroke-width="5" stroke-linecap="round" opacity=".55"/>${hl(64, 64, 10, 18, -30, .4)}`,
  sparkle: () => `<path d="M100 10 C106 80,120 94,190 100 C120 106,106 120,100 190 C94 120,80 106,10 100 C80 94,94 80,100 10Z" fill="url(#gold)"/><path d="M160 22 C162 44,166 48,186 50 C166 52,162 56,160 78 C158 56,154 52,134 50 C154 48,158 44,160 22Z" fill="#FFF4C4"/>`,
  dumbbell: () => `${sh(100, 176, 80, 8)}<rect x="40" y="94" width="120" height="14" rx="6" fill="url(#silver)"/>${[22, 46, 140, 164].map((x, i) => `<rect x="${x - 8}" y="${i % 3 === 0 ? 60 : 50}" width="16" height="${i % 3 === 0 ? 82 : 102}" rx="6" fill="url(#metal)"/>`).join("")}`,
  map: () => `<path d="M20 50 L70 30 L130 50 L180 30 V150 L130 170 L70 150 L20 170Z" fill="url(#page)"/><path d="M70 30 V150 M130 50 V170" stroke="#C9B88E" stroke-width="3"/><path d="M40 130 Q70 90 100 110 T160 70" fill="none" stroke="#E03A55" stroke-width="5" stroke-dasharray="8 8"/><circle cx="160" cy="70" r="8" fill="#E03A55"/>`,
  school: () => `${sh(100, 186, 84)}<rect x="30" y="92" width="140" height="88" fill="url(#bookR)"/><path d="M20 96 L100 46 L180 96Z" fill="url(#roof)"/><rect x="88" y="16" width="4" height="34" fill="url(#metal)"/><path d="M92 16 h28 l-6 8 l6 8 h-28z" fill="url(#shirtBlue)"/>
    ${[44, 76, 112, 144].map(x => `<rect x="${x}" y="110" width="20" height="22" rx="2" fill="url(#window)"/>`).join("")}<path d="M86 180 V148 h28 V180Z" fill="url(#wood)"/><circle cx="100" cy="74" r="10" fill="#fff"/>`,
};
function icon(name, size, style = "") { return `<span class="ico" style="width:${size}px;height:${size}px;${style}"><svg viewBox="0 0 200 200">${ICONS[name]()}</svg></span>`; }
function iconG(name, x, y, s) { return `<g transform="translate(${x - 100 * s},${y - 100 * s}) scale(${s})">${ICONS[name]()}</g>`; }
const EMO = { "🚀": "rocket", "🧠": "brain", "✨": "sparkle", "🍏": "apple", "💪": "dumbbell", "🎤": "mic", "🎮": "gamepad", "🏠": "house", "❤️": "heart", "🌟": "star" };
function iconize(text, size) { let s = text; for (const k in EMO) s = s.split(k).join(icon(EMO[k], size, "margin:0 4px")); return s; }

/* =========================== CHARACTERS (semi-realistic proportions) =========================== */
let FIG = 0;
function figure(o) {
  const id = "f" + (FIG++), h = o.h, kid = !!o.kid;
  const headH = kid ? h / 5.2 : h / 7, headW = headH * .8, hy = -h + headH / 2;
  const sy = -h + headH * 1.12, sw = kid ? headW * 1.6 : headW * (o.female ? 1.85 : 2.15), hipY = -h * (kid ? .44 : .47), hw = sw * (o.female ? .92 : .82);
  const legW = sw * .3, armW = sw * .2, L1 = h * .17, L2 = h * .16;
  const skinTone = "#EFBA9C", top = o.top || "shirtBlue", sleeve = o.sleeve || "#4A90E0";
  const legY2 = lerp(hipY, -h * .03, o.legScale || 1), coat = o.coat, hairG = o.hairG || "hairDark";
  const arm = (side, A, B, cls) => `<g transform="translate(${side * (sw / 2 - armW * .4)},${sy + armW * .5})"><g class="${cls}u" transform="rotate(${A})">
      <line x1="0" y1="0" x2="0" y2="${L1}" stroke="${sleeve}" stroke-width="${armW}" stroke-linecap="round"/>
      <g transform="translate(0,${L1})"><g class="${cls}f" transform="rotate(${B})"><line x1="0" y1="0" x2="0" y2="${L2 * .72}" stroke="${sleeve}" stroke-width="${armW * .9}" stroke-linecap="round"/>
      <line x1="0" y1="${L2 * .6}" x2="0" y2="${L2 * .8}" stroke="${skinTone}" stroke-width="${armW * .8}" stroke-linecap="round"/><circle cy="${L2 * .92}" r="${armW * .55}" fill="url(#skinD)"/></g></g></g></g>`;
  const longHair = o.hair === "long" ? `<path d="M${-headW * .62} ${hy - headH * .1} Q${-headW * .82} ${hy + headH * 1.3} ${-headW * .3} ${hy + headH * 1.5} L${headW * .3} ${hy + headH * 1.5} Q${headW * .82} ${hy + headH * 1.3} ${headW * .62} ${hy - headH * .1}Z" fill="url(#${hairG})"/>` : "";
  const pony = o.hair === "pony" ? [-1, 1].map(s => `<ellipse cx="${s * headW * .62}" cy="${hy + headH * .1}" rx="${headW * .2}" ry="${headH * .38}" fill="url(#${hairG})" transform="rotate(${-s * 20} ${s * headW * .62} ${hy})"/>`).join("") : "";
  const svg = `<g class="${id}">
    <ellipse cx="0" cy="0" rx="${sw * .8}" ry="${h * .03}" fill="url(#shadow)"/>${longHair}${pony}
    <rect x="${-hw / 2 + 2}" y="${hipY - 10}" width="${legW}" height="${legY2 - hipY}" rx="${legW / 2}" fill="url(#${o.bottom || "pants"})"/>
    <rect x="${hw / 2 - legW - 2}" y="${hipY - 10}" width="${legW}" height="${legY2 - hipY}" rx="${legW / 2}" fill="url(#${o.bottom || "pants"})"/>
    <ellipse cx="${-hw / 2 + legW / 2}" cy="${legY2}" rx="${legW * .7}" ry="${legW * .35}" fill="#2A2230"/><ellipse cx="${hw / 2 - legW / 2}" cy="${legY2}" rx="${legW * .7}" ry="${legW * .35}" fill="#2A2230"/>
    ${arm(-1, o.aL ?? 12, o.bL ?? -6, id + "L")}
    <path d="M${-sw / 2} ${sy + sw * .18} Q${-sw / 2} ${sy} ${-sw / 2 + sw * .2} ${sy} L${sw / 2 - sw * .2} ${sy} Q${sw / 2} ${sy} ${sw / 2} ${sy + sw * .18} L${hw / 2 + (coat ? sw * .08 : 0)} ${coat ? -h * .26 : hipY + 6} L${-hw / 2 - (coat ? sw * .08 : 0)} ${coat ? -h * .26 : hipY + 6}Z" fill="url(#${top})"/>
    ${coat ? `<path d="M0 ${sy + 4} L${-sw * .16} ${sy + sw * .5} M0 ${sy + 4} L${sw * .16} ${sy + sw * .5} M0 ${sy + sw * .5} V${-h * .26}" stroke="#AEB8CC" stroke-width="3" fill="none"/>
      <rect x="${sw * .12}" y="${sy + sw * .62}" width="${sw * .2}" height="${sw * .16}" rx="3" fill="#E4E9F2"/><path d="M${-sw * .18} ${sy + 6} C${-sw * .26} ${sy + sw * .5},${sw * .26} ${sy + sw * .5},${sw * .18} ${sy + 6}" fill="none" stroke="#2B2F3A" stroke-width="5"/><circle cx="${sw * .02}" cy="${sy + sw * .44}" r="${sw * .06}" fill="url(#silver)"/>` : ""}
    ${arm(1, o.aR ?? -12, o.bR ?? 6, id + "R")}
    <rect x="${-headW * .18}" y="${hy + headH * .38}" width="${headW * .36}" height="${headH * .3}" fill="url(#skinD)"/>
    <ellipse cx="${-headW * .5}" cy="${hy + headH * .04}" rx="${headW * .08}" ry="${headH * .11}" fill="url(#skinD)"/><ellipse cx="${headW * .5}" cy="${hy + headH * .04}" rx="${headW * .08}" ry="${headH * .11}" fill="url(#skinD)"/>
    <path d="M0 ${hy - headH * .5} C${headW * .62} ${hy - headH * .5},${headW * .56} ${hy + headH * .32},0 ${hy + headH * .52} C${-headW * .56} ${hy + headH * .32},${-headW * .62} ${hy - headH * .5},0 ${hy - headH * .5}Z" fill="url(#skin)"/>
    <ellipse cx="${-headW * .26}" cy="${hy + headH * .16}" rx="${headW * .12}" ry="${headH * .06}" fill="#F29A9A" opacity=".35"/><ellipse cx="${headW * .26}" cy="${hy + headH * .16}" rx="${headW * .12}" ry="${headH * .06}" fill="#F29A9A" opacity=".35"/>
    <g class="${id}eyes">${[-1, 1].map(s => `<ellipse cx="${s * headW * .2}" cy="${hy + headH * .02}" rx="${headW * .11}" ry="${headH * .074}" fill="#fff"/><circle cx="${s * headW * .2}" cy="${hy + headH * .025}" r="${headH * .06}" fill="url(#iris)"/><circle cx="${s * headW * .2}" cy="${hy + headH * .025}" r="${headH * .026}" fill="#140904"/><circle cx="${s * headW * .2 + headH * .02}" cy="${hy + headH * .0}" r="${headH * .02}" fill="#fff"/>
      <path d="M${s * headW * .2 - headW * .125} ${hy - headH * .02} Q${s * headW * .2} ${hy - headH * .085} ${s * headW * .2 + headW * .125} ${hy - headH * .02}" stroke="#3A2416" stroke-width="${headH * .018}" fill="none" stroke-linecap="round"/>
      <path d="M${s * headW * .2 - headW * .12} ${hy - headH * .15} Q${s * headW * .2} ${hy - headH * .2} ${s * headW * .2 + headW * .12} ${hy - headH * .15}" stroke="#4A3020" stroke-width="${headH * .022}" fill="none" stroke-linecap="round"/>`).join("")}</g>
    <path d="M${-headW * .03} ${hy + headH * .1} Q0 ${hy + headH * .17} ${headW * .05} ${hy + headH * .14}" stroke="#C88466" stroke-width="${headH * .02}" fill="none" stroke-linecap="round"/>
    <path d="M${-headW * .17} ${hy + headH * .24} Q0 ${hy + headH * .38} ${headW * .17} ${hy + headH * .24} Q0 ${hy + headH * .29} ${-headW * .17} ${hy + headH * .24}Z" fill="#B84A5A" stroke="#B04A55" stroke-width="${headH * .012}"/>
    <path d="M${-headW * .58} ${hy + headH * .02} C${-headW * .7} ${hy - headH * .62},${headW * .7} ${hy - headH * .62},${headW * .58} ${hy + headH * .02} C${headW * .5} ${hy - headH * .22},${headW * .1} ${hy - headH * .3},${-headW * .1} ${hy - headH * .24} C${-headW * .3} ${hy - headH * .2},${-headW * .5} ${hy - headH * .16},${-headW * .58} ${hy + headH * .02}Z" fill="url(#${hairG})"/>
    <path d="M${-headW * .3} ${hy - headH * .38} Q0 ${hy - headH * .48} ${headW * .3} ${hy - headH * .36}" stroke="#fff" stroke-width="${headH * .03}" opacity=".18" fill="none"/>
  </g>`;
  return { svg, id };
}


function cloudPuffs(cx, cy, w, opc = 1) {
  const n = 8; let s = `<ellipse cx="${cx}" cy="${cy + w * .08}" rx="${w * .5}" ry="${w * .07}" fill="#8C86C0" opacity="${.35 * opc}"/>`;
  for (let i = 0; i < n; i++) { const x = cx - w / 2 + (i + .5) * w / n, r = w / n * (.95 + hash(i, cx + cy) * .7); s += `<circle cx="${x}" cy="${cy - Math.sin(i / (n - 1) * Math.PI) * w * .09}" r="${r}" fill="url(#cloud)" opacity="${opc}"/>`; }
  return s + `<rect x="${cx - w / 2}" y="${cy - w * .02}" width="${w}" height="${w * .1}" rx="${w * .05}" fill="url(#cloud)" opacity="${opc}"/>`;
}
function floatingRock(cx, top, w, grassG = "grass") {
  return `<ellipse cx="${cx}" cy="${top + w * .62}" rx="${w * .42}" ry="${w * .05}" fill="url(#shadow)" opacity=".5"/>
    <path d="M${cx - w / 2} ${top} C${cx - w * .44} ${top + w * .22},${cx - w * .2} ${top + w * .5},${cx} ${top + w * .56} C${cx + w * .22} ${top + w * .48},${cx + w * .44} ${top + w * .22},${cx + w / 2} ${top}Z" fill="url(#rock)"/>
    <path d="M${cx - w * .3} ${top + w * .1} L${cx - w * .1} ${top + w * .3} L${cx + w * .05} ${top + w * .16} L${cx + w * .25} ${top + w * .32}" stroke="#2A2050" stroke-width="5" fill="none" opacity=".5"/>
    <path d="M${cx - w / 2} ${top} Q${cx} ${top - w * .06} ${cx + w / 2} ${top} Q${cx + w * .48} ${top + w * .05} ${cx + w * .44} ${top + w * .06} Q${cx} ${top + w * .1} ${cx - w * .44} ${top + w * .06} Q${cx - w * .48} ${top + w * .05} ${cx - w / 2} ${top}Z" fill="url(#${grassG})"/>`;
}

