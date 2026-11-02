#!/usr/bin/env node
/*
 * Frame renderer: drives src/scene.html in headless Chromium, captures every
 * frame deterministically (render(t) per frame) and pipes them to ffmpeg.
 *
 *   node src/render.js                     -> full render (parallel workers)
 *   node src/render.js --stills 2,12.5,35  -> PNG stills into build/stills/
 */
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs"), path = require("path");

const ROOT = path.resolve(__dirname, "..");
const BUILD = path.join(ROOT, "build"), OUT = path.join(ROOT, "output");
const FPS = 30, DUR = 60, FRAMES = FPS * DUR, W = 1080, H = 1920;
const WORKERS = +(process.env.WORKERS || 4);
const TL = JSON.parse(fs.readFileSync(path.join(BUILD, "timeline.json"), "utf8"));

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on("pageerror", e => { console.error("PAGE ERROR:", e.message); process.exit(1); });
  await page.addInitScript(tl => { window.TL = tl; }, TL);
  await page.goto("file://" + path.join(__dirname, "scene.html"));
  await page.evaluate(() => window.ready);
  return page;
}

async function stills(times) {
  const browser = await chromium.launch();
  const page = await openPage(browser);
  const dir = path.join(BUILD, "stills"); fs.mkdirSync(dir, { recursive: true });
  for (const t of times) {
    await page.evaluate(t => window.render(t), t);
    const f = path.join(dir, `t${String(t).padStart(5, "0")}.png`);
    await page.screenshot({ path: f });
    console.log(f);
  }
  await browser.close();
}

async function segment(browser, idx, f0, f1) {
  const page = await openPage(browser);
  const file = path.join(BUILD, `seg${idx}.mp4`);
  const ff = spawn("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS),
    "-c:v", "png", "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p",
    "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-r", String(FPS), file], { stdio: ["pipe", "inherit", "inherit"] });
  for (let f = f0; f < f1; f++) {
    await page.evaluate(t => window.render(t), f / FPS);
    const buf = await page.screenshot({ type: "png" });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
    if ((f - f0) % 90 === 0) console.log(`worker ${idx}: frame ${f}/${f1}`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on("close", c => c ? rej(new Error("ffmpeg " + c)) : res()));
  await page.close();
  return file;
}

async function full() {
  const browser = await chromium.launch();
  const per = Math.ceil(FRAMES / WORKERS);
  const t0 = Date.now();
  const segs = await Promise.all(Array.from({ length: WORKERS }, (_, i) =>
    segment(browser, i, i * per, Math.min(FRAMES, (i + 1) * per))));
  await browser.close();
  const list = path.join(BUILD, "segs.txt");
  fs.writeFileSync(list, segs.map(s => `file '${s}'`).join("\n"));
  const silent = path.join(BUILD, "video_silent.mp4");
  await run(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", silent]);
  // Final TikTok master: H.264 High 1080x1920 30fps + AAC narration, exactly 60 s.
  await run(["-i", silent, "-i", path.join(BUILD, "narration.wav"), "-map", "0:v", "-map", "1:a",
    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-t", String(DUR), "-movflags", "+faststart",
    path.join(OUT, "industrial-chemistry-60s-9x16.mp4")]);
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
function run(args) {
  return new Promise((res, rej) => spawn("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit" })
    .on("close", c => c ? rej(new Error("ffmpeg " + c)) : res()));
}

const i = process.argv.indexOf("--stills");
(i > 0 ? stills(process.argv[i + 1].split(",").map(Number)) : full()).catch(e => { console.error(e); process.exit(1); });
