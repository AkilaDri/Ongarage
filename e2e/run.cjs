// Runs the browser specs:  npm run e2e            (all)
//                          npm run e2e -- garage  (specs whose file name includes "garage")
// Start the apps first (each on its fixed port): npm run user / garage / parts / tech.
const fs = require('fs');
const net = require('net');
const path = require('path');
const { PORTS } = require('./lib.cjs');

// Is something listening? (A plain TCP connect: an HTTP request would make Metro render the page.)
const up = (port) =>
  new Promise((resolve) => {
    const socket = net.connect({ host: 'localhost', port, timeout: 5000 }, () => {
      socket.end();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });

(async () => {
  const filter = process.argv[2];
  const specs = fs
    .readdirSync(path.join(__dirname, 'specs'))
    .filter((f) => f.endsWith('.cjs') && (!filter || f.includes(filter)))
    .sort();

  const down = [];
  for (const [app, port] of Object.entries(PORTS)) if (!(await up(port))) down.push(`${app} (${port})`);
  if (down.length) {
    console.error(`Not running: ${down.join(', ')} — start them with npm run <app> first.`);
    process.exit(1);
  }

  let failed = 0;
  let passed = 0;
  for (const file of specs) {
    const spec = require(path.join(__dirname, 'specs', file));
    console.log(`\n▶ ${spec.name}`);
    let results;
    try {
      results = await spec.run();
    } catch (e) {
      results = [{ name: 'spec finished', ok: false, detail: e.message }];
    }
    for (const r of results) {
      r.ok ? passed++ : failed++;
      console.log(`  ${r.ok ? '✓' : '✗'} ${r.name}${r.ok || r.detail === undefined ? '' : `  → ${JSON.stringify(r.detail)}`}`);
    }
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
