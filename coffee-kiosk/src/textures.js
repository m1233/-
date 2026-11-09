#!/usr/bin/env node
// Renders Arabic signage, menu boards and screen states to PNG (Blender cannot shape Arabic text).
//   node src/textures.js   -> build/tex/*.png
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'build', 'tex');
fs.mkdirSync(OUT, { recursive: true });
const font = fs.readFileSync(path.join(ROOT, 'assets', 'Cairo-Variable.ttf')).toString('base64');

const pageJS = () => {
  const FONT = 'Cairo';
  const C = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function drawLogo(g, cx, cy, s, color = '#fff', lw = 0.07) {
    g.save(); g.translate(cx, cy); g.scale(s, s); g.strokeStyle = color; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.arc(0, -0.12, 0.36, Math.PI * 0.82, Math.PI * 2.18); g.quadraticCurveTo(0.17, 0.25, 0, 0.5); g.quadraticCurveTo(-0.17, 0.25, -0.33, 0.13); g.stroke();
    g.save(); g.translate(0, -0.12); g.rotate(-0.55); g.beginPath(); g.ellipse(0, 0, 0.13, 0.2, 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(0, -0.18); g.bezierCurveTo(0.08, -0.06, -0.08, 0.06, 0, 0.18); g.stroke(); g.restore(); g.restore();
  }
  function wordmark(color, w, h, bg) {
    const c = C(w, h), g = c.getContext('2d'); if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    g.fillStyle = color; g.textAlign = 'center'; g.direction = 'rtl'; g.textBaseline = 'middle';
    const fs = Math.min(h * .42, w * .3); g.font = `900 ${fs}px ${FONT}`; g.fillText('عنوان', w / 2, h * .3);
    g.font = `900 ${fs * 1.05}px ${FONT}`; g.fillText('القهوة', w / 2, h * .72); return c;
  }
  const out = {};
  out.word_black = wordmark('#0e0e0e', 2048, 1280);
  out.word_warm = wordmark('#ffe2b8', 2048, 800);
  out.word_panel = wordmark('#ffffff', 1024, 1280, '#111111');
  { const c = C(1024, 1024), g = c.getContext('2d'); drawLogo(g, 512, 540, 880, '#0e0e0e', .075); out.logo_black = c; }
  { const c = C(1024, 1024), g = c.getContext('2d'); drawLogo(g, 512, 540, 880, '#ffe2b8', .075); out.logo_warm = c; }
  { const c = C(1024, 1024), g = c.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, 1024, 1024); g.strokeStyle = '#5a5a5a'; g.lineWidth = 26; g.beginPath(); g.arc(512, 512, 486, 0, 7); g.stroke(); drawLogo(g, 512, 536, 720, '#fff', .07); out.logo_disc = c; }
  { const c = C(1024, 256), g = c.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, 1024, 256); g.fillStyle = '#fff'; g.font = `700 110px ${FONT}`; g.textBaseline = 'middle'; g.fillText('DRIVE THRU  »', 70, 134); out.drive = c; }
  { const c = C(2048, 256), g = c.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, 2048, 256);
    g.fillStyle = '#fff'; g.font = `700 128px ${FONT}`; g.textBaseline = 'middle'; g.fillText('Order Here', 80, 134);
    g.textAlign = 'right'; g.direction = 'rtl'; g.fillText('اطلب هنا', 1968, 126); drawLogo(g, 1200, 134, 220, '#fff', .08); out.order_head = c; }
  const menus = { menu_hot: ['ساخن · HOT', [['سبانش لاتيه', '18'], ['كراميل ماكياتو', '19'], ['فلات وايت', '16'], ['كورتادو', '14'], ['أمريكانو', '12'], ['قهوة اليوم', '10']]],
                  menu_iced: ['بارد · ICED', [['لاتيه مثلج', '17'], ['كولد برو', '18'], ['موكا مثلجة', '19'], ['ماتشا لاتيه', '20'], ['كرواسون', '9'], ['كوكيز', '7']]] };
  for (const [k, [head, list]] of Object.entries(menus)) {
    const c = C(1024, 1024), q = c.getContext('2d'); const gr = q.createLinearGradient(0, 0, 0, 1024); gr.addColorStop(0, '#fbf6ee'); gr.addColorStop(1, '#efe5d6'); q.fillStyle = gr; q.fillRect(0, 0, 1024, 1024);
    q.direction = 'rtl'; q.textAlign = 'center'; q.fillStyle = '#1a1a1a'; q.font = `800 92px ${FONT}`; q.fillText(head, 512, 130); q.fillStyle = '#c9975e'; q.fillRect(352, 170, 320, 10);
    list.forEach(([n, p], i) => { const y = 300 + i * 120; q.fillStyle = '#1a1a1a'; q.textAlign = 'right'; q.font = `700 72px ${FONT}`; q.fillText(n, 940, y); q.textAlign = 'left'; q.font = `800 72px ${FONT}`; q.fillStyle = '#8a5a2b'; q.fillText(p + ' ر.س', 80, y); });
    out[k] = c;
  }
  { const c = C(256, 256), g = c.getContext('2d'); g.fillStyle = '#c0181c'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#fff'; g.font = `800 52px ${FONT}`; g.textAlign = 'center'; g.direction = 'rtl'; g.fillText('طفاية', 128, 118); g.fillText('حريق', 128, 186); out.fire_sign = c; }
  // POS + KDS screens, states: 0 idle, 1 new order (highlight), 2 new order (flash), 3 ready
  function pos(st) {
    const c = C(1280, 880), g = c.getContext('2d'); g.scale(2, 2); const W2 = 640, H2 = 440;
    g.fillStyle = '#f6f2ec'; g.fillRect(0, 0, W2, H2); g.fillStyle = '#121212'; g.fillRect(0, 0, W2, 64);
    g.direction = 'rtl'; g.textAlign = 'right'; g.fillStyle = '#fff'; g.font = `800 30px ${FONT}`; g.fillText('عنوان القهوة · نقطة البيع', 616, 44);
    g.textAlign = 'left'; g.direction = 'ltr'; g.font = `600 22px ${FONT}`; g.fillStyle = '#c9975e'; g.fillText('DRIVE-THRU', 24, 42);
    const tiles = ['سبانش لاتيه', 'فلات وايت', 'كورتادو', 'أمريكانو', 'لاتيه مثلج', 'كولد برو', 'موكا', 'كرواسون', 'كوكيز'];
    g.direction = 'rtl'; g.textAlign = 'center';
    tiles.forEach((n, i) => { const cx = 520 - (i % 3) * 200, cy = 110 + (i / 3 | 0) * 110; g.fillStyle = (i === 0 || i === 4) && st ? '#c9975e' : '#e8dccb'; g.beginPath(); g.roundRect(cx - 88, cy - 34, 176, 92, 14); g.fill(); g.fillStyle = '#1a1a1a'; g.font = `700 26px ${FONT}`; g.fillText(n, cx, cy + 20); });
    if (st >= 1) {
      g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, 64, W2, H2);
      g.fillStyle = st === 2 ? '#e7b47a' : '#ffffff'; g.beginPath(); g.roundRect(70, 100, 500, 300, 22); g.fill();
      g.fillStyle = st === 3 ? '#1a9b4a' : '#121212'; g.font = `900 42px ${FONT}`; g.textAlign = 'center';
      g.fillText(st === 3 ? '✓ الطلب جاهز' : 'طلب جديد', 320, 160);
      g.font = `700 26px ${FONT}`; g.fillStyle = '#333'; g.fillText('رقم الطلب #1027 · سيارة بيضاء', 320, 205);
      g.textAlign = 'right'; g.font = `700 28px ${FONT}`; g.fillStyle = '#121212';
      g.fillText('١ × سبانش لاتيه (وسط)', 530, 255); g.fillText('١ × لاتيه مثلج (كبير)', 530, 300);
      g.textAlign = 'left'; g.direction = 'ltr'; g.fillText('18', 110, 255); g.fillText('17', 110, 300);
      g.fillStyle = '#8a5a2b'; g.font = `900 30px ${FONT}`; g.fillText('35 SAR', 110, 360); g.direction = 'rtl'; g.textAlign = 'right'; g.fillText('الإجمالي', 530, 360);
    }
    return c;
  }
  function kds(st) {
    const c = C(1536, 864), g = c.getContext('2d'); g.scale(2, 2); g.fillStyle = '#0f1113'; g.fillRect(0, 0, 768, 432);
    g.direction = 'rtl'; g.textAlign = 'right'; g.fillStyle = '#fff'; g.font = `800 30px ${FONT}`; g.fillText('شاشة الطلبات', 740, 46);
    g.direction = 'ltr'; g.textAlign = 'left'; g.fillStyle = '#c9975e'; g.font = `600 22px ${FONT}`; g.fillText('KITCHEN DISPLAY', 28, 44);
    const cards = [['#1025', 'كورتادو', 'جاهز', '#1a9b4a'], ['#1026', 'أمريكانو ×٢', 'جاهز', '#1a9b4a']];
    if (st >= 1) cards.push(['#1027', 'سبانش لاتيه · لاتيه مثلج', st === 3 ? 'جاهز' : 'جديد', st === 3 ? '#1a9b4a' : st === 2 ? '#c9975e' : '#e0a040']);
    cards.forEach(([n, d, s, col], i) => { const x = 520 - i * 248; g.fillStyle = '#1d2125'; g.beginPath(); g.roundRect(x, 80, 228, 320, 16); g.fill(); g.fillStyle = col; g.beginPath(); g.roundRect(x, 80, 228, 56, [16, 16, 0, 0]); g.fill();
      g.fillStyle = '#fff'; g.direction = 'ltr'; g.textAlign = 'center'; g.font = `800 28px ${FONT}`; g.fillText(n + '  ·  ' + s, x + 114, 118);
      g.direction = 'rtl'; g.font = `700 25px ${FONT}`; d.split(' · ').forEach((w, k) => g.fillText(w, x + 114, 190 + k * 44)); });
    return c;
  }
  for (const s of [0, 1, 2, 3]) { out['pos_' + s] = pos(s); out['kds_' + s] = kds(s); }
  const res = {}; for (const [k, c] of Object.entries(out)) res[k] = c.toDataURL('image/png'); return res;
};

(async () => {
  const browser = await chromium.launch(); const page = await browser.newPage();
  await page.setContent(`<style>@font-face{font-family:Cairo;src:url(data:font/ttf;base64,${font});font-weight:200 1000}</style><div style="font-family:Cairo">.</div>`);
  await page.evaluate(async () => { for (const w of [600, 700, 800, 900]) await document.fonts.load(`${w} 40px Cairo`); });
  const res = await page.evaluate(pageJS);
  for (const [k, v] of Object.entries(res)) fs.writeFileSync(path.join(OUT, k + '.png'), Buffer.from(v.split(',')[1], 'base64'));
  console.log(Object.keys(res).length, 'textures ->', OUT);
  await browser.close();
})();
