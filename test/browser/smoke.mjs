// Opens the built page in Chromium at a desktop and a phone width, as it
// will be played: inside a sandboxed frame with scripts only. Checks that
// it starts, runs, never scrolls sideways, and logs no errors.
//
//   node test/browser/smoke.mjs [--shots <dir>]

import { chromium } from 'playwright';
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const shotsAt = process.argv.indexOf('--shots');
const shots = shotsAt > 0 ? process.argv[shotsAt + 1] : null;
if (shots) await mkdir(shots, { recursive: true });

const fragment = await readFile(join(root, 'dist/index.html'), 'utf8');
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>${fragment}</body></html>`;
const framed = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>html,body{margin:0;height:100%}iframe{display:block;border:0;width:100%;height:100%}</style></head>
<body><iframe sandbox="allow-scripts" src="/page"></iframe></body></html>`;

const server = http.createServer((req, res) => {
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(req.url === '/framed' ? framed : page);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const failures = [];
const fail = (msg) => {
  failures.push(msg);
  console.error(`FAIL ${msg}`);
};
const ok = (msg) => console.log(`ok   ${msg}`);

// how far the run has gone, in steps of 100,000 years, from the date in the bar
const STEP = () => Math.round((560 - Number(document.getElementById('ma').textContent)) * 10);

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
  for (const vp of [
    { name: 'desktop', width: 1280, height: 860 },
    { name: 'phone', width: 390, height: 844, mobile: true },
  ]) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.mobile ? 2 : 1,
      isMobile: !!vp.mobile,
      hasTouch: !!vp.mobile,
    });
    // no network in tests: the web fonts load as empty stylesheets
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    const tab = await ctx.newPage();
    const errors = [];
    tab.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    tab.on('console', (m) => {
      if (m.type() === 'error') errors.push(`console: ${m.text()}`);
    });
    await tab.goto(`${base}/framed`);
    const frame = tab.frameLocator('iframe');
    const app = tab.frames().find((f) => f !== tab.mainFrame()) ?? (await (await tab.waitForSelector('iframe')).contentFrame());
    await frame.locator('#play').waitFor();
    await app.waitForFunction(() => window.__cam && window.__cam.state.ready, null, { timeout: 15000 });
    const mode = await app.evaluate(() => window.__cam.host.mode);
    ok(`${vp.name}: page ready, simulation running in the ${mode}`);

    await frame.locator('#play').click();
    await app.waitForFunction(`(${STEP})() >= 4`, null, { timeout: 20000 }).then(
      () => ok(`${vp.name}: time goes by when played`),
      () => fail(`${vp.name}: the date did not advance after Play`),
    );
    await frame.locator('#play').click(); // pause

    const overflow = await app.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) fail(`${vp.name}: page scrolls sideways by ${overflow}px`);
    else ok(`${vp.name}: no sideways scrolling`);
    if (shots) await tab.screenshot({ path: join(shots, `${vp.name}-start.png`), fullPage: false });

    // a number explains itself
    await frame.locator('.readout[data-explain="species"]').click();
    await frame.locator('#sheet:not([hidden])').waitFor({ timeout: 3000 }).then(
      () => ok(`${vp.name}: tapping a number opens its explanation`),
      () => fail(`${vp.name}: the explanation sheet did not open`),
    );
    if (shots) await tab.screenshot({ path: join(shots, `${vp.name}-sheet.png`) });
    await frame.locator('#sheet-close').click();

    // Learn: predict first, then Show me
    await frame.locator('[data-tab="learn"]').click();
    await frame.locator('[data-option="0"]').click();
    await frame.locator('.predict-a:not([hidden])').waitFor({ timeout: 3000 }).then(
      () => ok(`${vp.name}: a prediction reveals the answer`),
      () => fail(`${vp.name}: the prediction did not reveal its answer`),
    );
    await frame.locator('[data-show]').click();
    await app.waitForFunction(`(${STEP})() === 14 && !window.__cam.state.running`, null, { timeout: 30000 }).then(
      () => ok(`${vp.name}: Show me runs to its moment and stops`),
      () => fail(`${vp.name}: Show me did not stop at 558.6 million years ago`),
    );
    if (shots) {
      await app.evaluate(() => window.scrollTo(0, 0));
      await tab.screenshot({ path: join(shots, `${vp.name}-learn.png`), fullPage: false });
    }

    for (const t of ['watch', 'lab', 'check']) {
      const btn = frame.locator(`[data-tab="${t}"]`);
      if (!(await btn.isVisible())) continue;
      await btn.click();
      await tab.waitForTimeout(250);
      const over = await app.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (over > 0) fail(`${vp.name}: the ${t} tab scrolls sideways by ${over}px`);
      if (shots) {
        await app.evaluate(() => document.querySelector('#side').scrollIntoView());
        await tab.screenshot({ path: join(shots, `${vp.name}-${t}.png`) });
      }
    }
    const score = await frame.locator('.score').textContent();
    if (/11 of 11/.test(score)) ok(`${vp.name}: Validation shows ${score.trim()}`);
    else fail(`${vp.name}: unexpected validation score "${score}"`);

    // run fast to Burgess Shale time and look at all three pictures
    await app.evaluate(() => document.querySelector('[data-tab="learn"]').click());
    await app.evaluate(() => window.__cam.host.send({ type: 'runTo', step: 520, speed: 3 }));
    await app.waitForFunction(`(${STEP})() === 520 && !window.__cam.state.running`, null, { timeout: 90000 }).then(
      () => ok(`${vp.name}: ran fast to 508 million years ago`),
      () => fail(`${vp.name}: could not run to 508 million years ago`),
    );
    const species = await frame.locator('[data-value="species"]').textContent();
    const armour = await frame.locator('[data-value="armour"]').textContent();
    ok(`${vp.name}: at Burgess Shale time there are ${species} species, and ${armour} of animals have a skeleton`);
    for (const v of ['sea', 'plans', 'fossils']) {
      await frame.locator(`#views [data-view="${v}"]`).click();
      await tab.waitForTimeout(500);
      const over = await app.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (over > 0) fail(`${vp.name}: the ${v} picture scrolls sideways by ${over}px`);
      if (shots) {
        await app.evaluate(() => document.querySelector('#stage').scrollIntoView());
        await tab.screenshot({ path: join(shots, `${vp.name}-${v}.png`) });
      }
      if (v === 'fossils' || v === 'plans') {
        const box = await frame.locator('#scene').boundingBox();
        const at = v === 'fossils' ? [box.width / (vp.mobile ? 6 : 12), box.height * 0.15] : [40, 20];
        await tab.mouse.click(box.x + at[0], box.y + at[1]);
        await frame.locator('#sheet:not([hidden])').waitFor({ timeout: 3000 }).then(
          () => ok(`${vp.name}: tapping the ${v} picture opens a sheet`),
          () => fail(`${vp.name}: tapping the ${v} picture opened nothing`),
        );
        if (shots) await tab.screenshot({ path: join(shots, `${vp.name}-${v}-sheet.png`) });
        await frame.locator('#sheet-close').click();
      }
    }
    await frame.locator('#views [data-view="sea"]').click();
    // drag along the sea floor
    {
      const box = await frame.locator('#scene').boundingBox();
      const before = await app.evaluate(() => window.__cam.scene.cx);
      await tab.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.3);
      await tab.mouse.down();
      await tab.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3, { steps: 6 });
      await tab.mouse.up();
      const after = await app.evaluate(() => window.__cam.scene.cx);
      if (after !== before) ok(`${vp.name}: dragging moves along the sea floor`);
      else fail(`${vp.name}: dragging did not move the picture`);
    }

    // to the end: the Validation tab can then score this run
    await app.evaluate(() => window.__cam.host.send({ type: 'runTo', step: 600, speed: 3 }));
    await app.waitForFunction(() => window.__cam.state.done && !window.__cam.state.running, null, { timeout: 120000 }).then(
      () => ok(`${vp.name}: ran to the end`),
      () => fail(`${vp.name}: could not run to the end`),
    );
    if (shots) {
      await app.evaluate(() => window.scrollTo(0, 0));
      await tab.waitForTimeout(500);
      await tab.screenshot({ path: join(shots, `${vp.name}-end.png`) });
    }
    await app.evaluate(() => document.querySelector('[data-tab="check"]').click());
    await frame.locator('[data-checkview="run"]').click();
    const mine = await frame.locator('.score').textContent();
    ok(`${vp.name}: this run scores ${mine.trim()}`);

    if (errors.length) for (const e of errors) fail(`${vp.name}: ${e}`);
    else ok(`${vp.name}: no errors in the console`);
    await ctx.close();
  }

  // A new version published while the page is open hands it the old
  // page's snapshot; the run picks up at the same step.
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await ctx.addInitScript(() => {
      window.claude = { hot: { data: { seed: 'opabinia', scenario: 'real', params: {}, step: 250 } } };
    });
    const tab = await ctx.newPage();
    await tab.goto(`${base}/framed`);
    const app = await (await tab.waitForSelector('iframe')).contentFrame();
    await app.waitForFunction(`document.getElementById('ma') && (${STEP})() === 250 && !window.__cam.state.running`, null, { timeout: 60000 }).then(
      () => ok('an update picks up the run at the same step'),
      () => fail('an update did not pick up the run where it was'),
    );
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.error(`\n${failures.length} problem(s)`);
  process.exit(1);
}
console.log('\nall browser checks passed');
