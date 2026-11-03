#!/usr/bin/env node
/*
 * Frame renderer for the 7-minute Child Rights video.
 *   node src/render.js --stills 3,70,200        -> build/stills/*.png
 *   node src/render.js --range 0 3150 seg0       -> build/seg0.mp4  (frames [0,3150))
 *   node src/render.js --concat                  -> output/child-rights-day-7min-9x16.mp4
 */
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, ".."), BUILD = path.join(ROOT, "build"), OUT = path.join(ROOT, "output");
const FPS = 30, W = 1080, H = 1920;
const TL = JSON.parse(fs.readFileSync(path.join(BUILD, "timeline.json"), "utf8"));
const PLAN = {};
const DUR = TL.duration, FRAMES_ALL = Math.round(DUR * FPS);

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on("pageerror", e => { console.error("PAGE ERROR:", e.message); process.exit(1); });
  await page.addInitScript(([tl, plan]) => { window.TL = tl; window.PLAN = plan; }, [TL, PLAN]);
  await page.goto("file://" + path.join(__dirname, "scene.html"));
  await page.evaluate(() => window.ready);
  return page;
}
function run(args) {
  return new Promise((res, rej) => spawn("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit" })
    .on("close", c => c ? rej(new Error("ffmpeg " + c)) : res()));
}
async function stills(times) {
  const browser = await chromium.launch(); const page = await openPage(browser);
  const dir = path.join(BUILD, "stills"); fs.mkdirSync(dir, { recursive: true });
  for (const t of times) { await page.evaluate(t => window.render(t), t); const f = path.join(dir, `t${t.toFixed(1).padStart(6, "0")}.png`); await page.screenshot({ path: f }); console.log(f); }
  await browser.close();
}
async function range(f0, f1, name) {
  const browser = await chromium.launch(); const page = await openPage(browser);
  const file = path.join(BUILD, `${name}.mp4`);
  // warm up deterministic state for this range start
  const ff = spawn("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
    "-r", String(FPS), file], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    await page.evaluate(t => window.render(t), f / FPS);
    const buf = await page.screenshot({ type: "jpeg", quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
    if ((f - f0) % 300 === 0) console.log(`${name}: ${f - f0}/${f1 - f0}  ${((f - f0) / ((Date.now() - t0) / 1000 + 1e-3)).toFixed(2)} fps`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on("close", c => c ? rej(new Error("ffmpeg " + c)) : res()));
  await browser.close();
  console.log(`${name}: DONE`);
}
async function concat() {
  const segs = fs.readdirSync(BUILD).filter(f => /^seg\d+\.mp4$/.test(f)).sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0]);
  const list = path.join(BUILD, "segs.txt");
  fs.writeFileSync(list, segs.map(s => `file '${path.join(BUILD, s)}'`).join("\n"));
  await run(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", path.join(BUILD, "video_silent.mp4")]);
  await run(["-i", path.join(BUILD, "video_silent.mp4"), "-i", path.join(BUILD, "mix.wav"), "-map", "0:v", "-map", "1:a",
    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-t", String(DUR), "-movflags", "+faststart",
    path.join(OUT, "child-rights-day-3d-7min-9x16.mp4")]);
  console.log("final written");
}
const a = process.argv;
if (a.includes("--frames")) { console.log(FRAMES_ALL); process.exit(0); }
const i = a.indexOf("--stills"), r = a.indexOf("--range");
(i > 0 ? stills(a[i + 1].split(",").map(Number)) : r > 0 ? range(+a[r + 1], +a[r + 2], a[r + 3]) : concat())
  .catch(e => { console.error(e); process.exit(1); });
