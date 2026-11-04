// node src/debug.js 36  -> prints camera + checks for NaN
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : p.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
  await new Promise(r => srv.on('listening', r));
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage(); pg.on('console', m => console.log('[page]', m.text())); pg.on('pageerror', e => console.log('[err]', e.message));
  await pg.goto(`http://127.0.0.1:${srv.address().port}/src/web/index.html?w=640&h=360`);
  await pg.waitForFunction('window.ready===true', null, { timeout: 120000 });
  for (const t of process.argv.slice(2).map(Number)) { await pg.evaluate(t => window.renderFrame(t), t); console.log(t, JSON.stringify(await pg.evaluate('window.dbg()'))); }
  await b.close(); srv.close();
})();
