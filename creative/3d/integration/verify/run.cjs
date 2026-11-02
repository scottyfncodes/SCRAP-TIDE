const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1500, height: 700 } });
  const logs = []; p.on('console', (m) => logs.push(m.text())); p.on('pageerror', (e) => logs.push(String(e)));
  await p.route('http://game.local/**', (r) => {
    const f = path.join(__dirname, 'dist', new URL(r.request().url()).pathname);
    if (!fs.existsSync(f)) return r.fulfill({ status: 404 });
    r.fulfill({ body: fs.readFileSync(f), contentType: f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream' });
  });
  await p.goto('http://game.local/harness.html');
  await p.waitForFunction(() => window.__out, null, { timeout: 90000 });
  const out = await p.evaluate(() => window.__out);
  await b.close();
  if (out.error) { console.log('ERROR', out.error, logs); process.exit(1); }
  const dir = process.env.OUT_DIR || __dirname;
  for (const k of ['closed', 'open']) fs.writeFileSync(`${dir}/dropin_${k}.png`, Buffer.from(out[k].split(',')[1], 'base64'));
  console.log(JSON.stringify({ loaded: out.loaded, hinges: out.hinges, console: logs.filter((l) => /warn|error/i.test(l)) }, null, 1));
})();
