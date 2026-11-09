#!/usr/bin/env node
// Portrait (1080x1920) render of a time window of the 3D scene, UI overlays hidden.
//   node src/render_portrait.js <t0> <t1> <outSeconds> <out.mp4>   (scene time t0..t1 squeezed into outSeconds)
const { chromium } = require('playwright'); const { spawn } = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'); const FPS = 30;
const [t0, t1, secs, out] = [+process.argv[2], +process.argv[3], +process.argv[4], process.argv[5]];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf', '.json': 'application/json' };
(async () => {
  const srv = await new Promise(res => { const s = http.createServer((req, rsp) => {
    const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
    rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rsp);
  }).listen(0, '127.0.0.1', () => res(s)); });
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  pg.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exit(1); });
  await pg.goto(`http://127.0.0.1:${srv.address().port}/src/scene.html?portrait=1`);
  await pg.waitForFunction(() => window.ready === true, null, { timeout: 120000 });
  await pg.addStyleTag({ content: 'html,body{width:1080px!important;height:1920px!important} #ui{display:none!important}' });
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round(secs * FPS);
  await pg.evaluate(t => window.render(t), t0);
  for (let i = 0; i < n; i++) {
    const t = t0 + (t1 - t0) * i / (n - 1);
    await pg.evaluate(t => window.render(t), t);
    const buf = await pg.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(i, '/', n);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close(); srv.close(); console.log('done', out);
})();
