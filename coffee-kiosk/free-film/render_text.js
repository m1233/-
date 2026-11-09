// Renders Arabic captions (transparent PNG overlays) and the end card at 1080x1920 with the Cairo font.
// usage: node render_text.js <outdir> <logo.png>
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const out = process.argv[2]; const logo = process.argv[3];
const font = 'data:font/ttf;base64,' + fs.readFileSync(path.join(__dirname, '..', 'assets', 'Cairo-Variable.ttf')).toString('base64');
const logoUri = 'data:image/png;base64,' + fs.readFileSync(logo).toString('base64');
const base = `@font-face{font-family:Cairo;src:url(${font})}
*{margin:0;padding:0;box-sizing:border-box}html,body{width:1080px;height:1920px;font-family:Cairo;direction:rtl}`;
const captions = {
  cap1: 'البداية… هيكل من حديد',
  cap2: 'خطوة بخطوة',
  cap3: 'حتى اكتمل الحلم',
  cap4: 'اطلب من سيارتك',
  cap5: 'من الداخل',
};
const capHtml = t => `<style>${base}body{background:transparent;display:flex;align-items:flex-end;justify-content:center}
.c{margin-bottom:300px;padding:18px 54px;border-radius:999px;background:rgba(15,15,15,.55);color:#fff;font-size:72px;font-weight:700;
letter-spacing:0;text-shadow:0 2px 12px rgba(0,0,0,.5)}</style><div class="c">${t}</div>`;
const endHtml = `<style>${base}body{background:radial-gradient(circle at 50% 40%,#2a2a2a,#0d0d0d 70%);color:#fff;display:flex;flex-direction:column;
align-items:center;justify-content:center;gap:40px}
img{width:460px;height:460px;border-radius:50%;box-shadow:0 0 0 10px #f2f2f2,0 30px 80px rgba(0,0,0,.6)}
h1{font-size:150px;font-weight:800;line-height:1.1;margin-top:40px}
p{font-size:64px;font-weight:500;color:#d9d9d9}.line{width:220px;height:4px;background:#bdbdbd;border-radius:2px}</style>
<img src="${logoUri}"><h1>عنوان القهوة</h1>`;
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const [k, t] of Object.entries(captions)) {
    await pg.setContent(capHtml(t)); await pg.evaluate(() => document.fonts.ready);
    await pg.screenshot({ path: path.join(out, k + '.png'), omitBackground: true });
  }
  await pg.setContent(endHtml); await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: path.join(out, 'endcard.png') });
  await b.close();
})();
