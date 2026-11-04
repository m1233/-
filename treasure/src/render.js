// Frame-accurate renderer: headless Chromium (WebGL via SwiftShader) -> JPEG frames -> ffmpeg.
// Usage:
//   node src/render.js --stills 3,20,45        -> build/stills/*.jpg
//   node src/render.js --range A B name        -> build/seg_name.mp4 (frames A..B-1)
//   node src/render.js --frames                -> prints the total frame count
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const W = +(process.env.W || 1920), H = +(process.env.H || 1080);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.ttf': 'font/ttf' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(rsp);
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}

async function open() {
  const srv = await serve();
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) console.error('[page]', m.text()); });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${srv.address().port}/src/web/index.html?w=${W}&h=${H}${process.env.QS ? "&" + process.env.QS : ""}`);
  await page.waitForFunction('window.ready === true', null, { timeout: 180000 });
  return { srv, browser, page };
}

(async () => {
  const a = process.argv.slice(2);
  const { srv, browser, page } = await open();
  const FPS = await page.evaluate('window.FPS'), DUR = await page.evaluate('window.DURATION');
  const total = Math.round(DUR * FPS);
  if (a[0] === '--frames') { console.log(total); }
  else if (a[0] === '--scenes') { console.log(JSON.stringify(await page.evaluate('window.SCENE_TIMES'), null, 1)); }
  else if (a[0] === '--stills') {
    fs.mkdirSync(path.join(ROOT, 'build/stills'), { recursive: true });
    for (const s of a[1].split(',').map(Number)) {
      const t0 = Date.now();
      const url = await page.evaluate(t => window.renderFrame(t, 0.9), s);
      fs.writeFileSync(path.join(ROOT, `build/stills/t${String(s.toFixed(1)).padStart(6, '0')}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
      console.log(`still ${s}s  ${Date.now() - t0} ms`);
    }
  } else if (a[0] === '--chunks') {
    // resumable: worker w of J renders 100-frame chunks k where k % J == w, skipping finished ones
    const w = +a[1], J = +a[2], CH = +(a[3] || 100);
    const dir = path.join(ROOT, 'build/chunks'); fs.mkdirSync(dir, { recursive: true });
    const n = Math.ceil(total / CH);
    for (let k = w; k < n; k += J) {
      const fin = path.join(dir, `c_${String(k).padStart(4, '0')}.mp4`);
      if (fs.existsSync(fin)) continue;
      const tmp = fin.replace('.mp4', '.part.mp4');
      const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-f', 'mp4', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
      const t0 = Date.now();
      for (let f = k * CH; f < Math.min(total, (k + 1) * CH); f++) {
        const url = await page.evaluate(t => window.renderFrame(t, 0.94), f / FPS);
        if (!ff.stdin.write(Buffer.from(url.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
      }
      ff.stdin.end(); await new Promise(r => ff.on('close', r));
      fs.renameSync(tmp, fin);
      console.log(`[w${w}] chunk ${k + 1}/${n} done  ${((Date.now() - t0) / CH).toFixed(0)} ms/frame`);
    }
    console.log(`[w${w}] all done`);
  } else if (a[0] === '--range') {
    const A = +a[1], Bf = Math.min(+a[2], total), name = a[3] || 'seg';
    const outFile = path.join(ROOT, `build/seg_${name}.mp4`);
    const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), outFile], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let f = A; f < Bf; f++) {
      const url = await page.evaluate(t => window.renderFrame(t, 0.94), f / FPS);
      const buf = Buffer.from(url.split(',')[1], 'base64');
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if ((f - A) % 150 === 0) console.log(`[${name}] frame ${f}/${Bf}  ${((Date.now() - t0) / Math.max(1, f - A + 1)).toFixed(0)} ms/frame`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    console.log(`[${name}] done ${Bf - A} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
