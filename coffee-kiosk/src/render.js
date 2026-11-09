#!/usr/bin/env node
/*
 * Frame renderer for the coffee-kiosk walkthrough.
 *   node src/render.js --stills 2,15,25,47        -> build/stills/*.png
 *   node src/render.js --range 0 450 seg0          -> build/seg0.mp4 (frames [0,450))
 *   node src/render.js --concat                    -> output/coffee-kiosk-walkthrough-1080p.mp4
 */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), BUILD = path.join(ROOT, 'build'), OUT = path.join(ROOT, 'output');
const FPS = 30, W = 1920, H = 1080, DUR = 60, FRAMES = DUR * FPS;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf', '.json': 'application/json' };
fs.mkdirSync(BUILD, { recursive: true }); fs.mkdirSync(OUT, { recursive: true });

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rsp);
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}
async function openPage() {
  const srv = await serve();
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', e => { console.error('PAGE ERROR:', e.message); process.exit(1); });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('console:', m.text()); });
  await page.goto(`http://127.0.0.1:${srv.address().port}/src/scene.html`);
  await page.waitForFunction(() => window.ready === true, null, { timeout: 120000 });
  return { browser, page, srv };
}
function run(args) {
  return new Promise((res, rej) => spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' })
    .on('close', c => c ? rej(new Error('ffmpeg ' + c)) : res()));
}
async function stills(times) {
  const { browser, page, srv } = await openPage();
  const dir = path.join(BUILD, 'stills'); fs.mkdirSync(dir, { recursive: true });
  for (const t of times) {
    const t0 = Date.now(); await page.evaluate(t => window.render(t), t);
    const f = path.join(dir, `t${t.toFixed(1).padStart(5, '0')}.jpg`); await page.screenshot({ path: f, type: 'jpeg', quality: 88 });
    console.log(f, Date.now() - t0, 'ms');
  }
  await browser.close(); srv.close();
}
async function range(f0, f1, name) {
  const { browser, page, srv } = await openPage();
  const file = path.join(BUILD, `${name}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    '-r', String(FPS), file], { stdio: ['pipe', 'inherit', 'inherit'] });
  // warm-up: one frame before the range so per-state caches (screens) are initialised identically
  await page.evaluate(t => window.render(t), Math.max(0, (f0 - 1) / FPS));
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    await page.evaluate(t => window.render(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 94 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - f0) % 60 === 0) console.log(`${name}: ${f - f0}/${f1 - f0}  ${((f - f0) / ((Date.now() - t0) / 1000 + 1e-3)).toFixed(2)} fps`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => c ? rej(new Error('ffmpeg ' + c)) : res()));
  await browser.close(); srv.close();
  console.log(`${name}: DONE`);
}
async function concat() {
  const segs = fs.readdirSync(BUILD).filter(f => /^seg\d+\.mp4$/.test(f)).sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0]);
  const list = path.join(BUILD, 'segs.txt');
  fs.writeFileSync(list, segs.map(s => `file '${path.join(BUILD, s)}'`).join('\n'));
  await run(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', path.join(BUILD, 'video_silent.mp4')]);
  const out = path.join(OUT, 'coffee-kiosk-walkthrough-1080p.mp4');
  await run(['-i', path.join(BUILD, 'video_silent.mp4'), '-i', path.join(BUILD, 'audio.wav'), '-map', '0:v', '-map', '1:a',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', String(DUR), '-movflags', '+faststart', out]);
  console.log('final written', out);
}
const a = process.argv;
if (a.includes('--frames')) { console.log(FRAMES); process.exit(0); }
const i = a.indexOf('--stills'), r = a.indexOf('--range');
(i > 0 ? stills(a[i + 1].split(',').map(Number)) : r > 0 ? range(+a[r + 1], +a[r + 2], a[r + 3]) : concat())
  .then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
