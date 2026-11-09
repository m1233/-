#!/usr/bin/env node
/*
 * Final assembly:
 *   1. Cycles frames (12 fps, build/frames)  -> motion-interpolated 24 fps, upscaled to 1080p
 *   2. UI overlay pass (labels/chapters/titles) rendered in Chromium with alpha
 *   3. overlay + soundtrack -> output/coffee-kiosk-walkthrough-1080p.mp4
 *   node src/finalize.js [--ui-only] [--preview t1,t2]
 */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), BUILD = path.join(ROOT, 'build'), OUT = path.join(ROOT, 'output');
const FPS = 24, DUR = 60, NF = FPS * DUR;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rsp);
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}
function ff(args) {
  return new Promise((res, rej) => spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' })
    .on('close', c => c ? rej(new Error('ffmpeg exit ' + c)) : res()));
}
async function uiPass(times) {
  const srv = await serve(); const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exit(1); });
  await page.goto(`http://127.0.0.1:${srv.address().port}/src/overlay.html`);
  await page.evaluate(() => window.ready);
  await page.evaluate(d => window.setLabels(d), JSON.parse(fs.readFileSync(path.join(BUILD, 'labels_24.json'), 'utf8')));
  const dir = path.join(BUILD, 'ui'); fs.mkdirSync(dir, { recursive: true });
  const list = times || [...Array(NF).keys()].map(f => f / FPS);
  for (let i = 0; i < list.length; i++) {
    await page.evaluate(t => window.ui(t), list[i]);
    await page.screenshot({ path: path.join(dir, times ? `p_${list[i]}.png` : `u_${String(i).padStart(4, '0')}.png`), omitBackground: true });
    if (i % 240 === 0) console.log('ui', i, '/', list.length);
  }
  await browser.close(); srv.close();
}
(async () => {
  const a = process.argv;
  fs.mkdirSync(OUT, { recursive: true });
  const pi = a.indexOf('--preview');
  if (pi > 0) {   // quick check: composite single renders with the UI
    const ts = a[pi + 1].split(',').map(Number); await uiPass(ts);
    for (const t of ts) {
      const fr = path.join(BUILD, 'frames', `f_${String(Math.round(t * 12)).padStart(4, '0')}.png`);
      await ff(['-i', fr, '-i', path.join(BUILD, 'ui', `p_${t}.png`), '-filter_complex', '[0]scale=1920:1080:flags=lanczos[b];[b][1]overlay', path.join(BUILD, `preview_${t}.jpg`)]);
      console.log(path.join(BUILD, `preview_${t}.jpg`));
    }
    return;
  }
  await uiPass();
  if (a.includes('--ui-only')) return;
  const base = path.join(BUILD, 'base_24fps.mp4');
  console.log('interpolating 12 -> 24 fps and upscaling ...');
  await ff(['-framerate', '12', '-i', path.join(BUILD, 'frames', 'f_%04d.png'),
    '-vf', 'minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,scale=1920:1080:flags=lanczos,unsharp=5:5:0.35',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', base]);
  const out = path.join(OUT, 'coffee-kiosk-walkthrough-1080p.mp4');
  await ff(['-i', base, '-framerate', String(FPS), '-i', path.join(BUILD, 'ui', 'u_%04d.png'), '-i', path.join(BUILD, 'audio.wav'),
    '-filter_complex', '[0:v]tpad=stop_mode=clone:stop_duration=1[b];[b][1:v]overlay=format=auto,format=yuv420p[v]',
    '-map', '[v]', '-map', '2:a', '-r', String(FPS), '-t', String(DUR),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-profile:v', 'high', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out]);
  const light = path.join(OUT, 'coffee-kiosk-walkthrough-720p-whatsapp.mp4');
  await ff(['-i', out, '-vf', 'scale=1280:720:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-b:v', '2500k', '-maxrate', '3500k', '-bufsize', '7000k',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', light]);
  console.log('DONE', out, light);
})().catch(e => { console.error(e); process.exit(1); });
