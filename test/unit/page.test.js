import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS, GLOSSARY, READOUTS, VIEWS, PICTURE_HELP, termKeys, markup, explain, narrate } from '../../src/app/guide.js';
import { createSimServer, SPEEDS } from '../../src/app/server.js';
import { evaluate, summarize } from '../../src/app/validation.js';
import { Engine } from '../../src/sim/engine.js';
import { K, SCENARIOS } from '../../src/sim/params.js';
import * as fmt from '../../src/app/format.js';

const links = (html) => [...html.matchAll(/data-term="([^"]+)"/g)].map((m) => m[1]);

test('every glossary link in the lessons has an entry', () => {
  for (const ch of CHAPTERS) {
    const texts = [...ch.body, ch.look ?? '', ch.predict?.explain ?? ''];
    for (const t of texts) for (const k of termKeys(t)) assert.ok(GLOSSARY[k], `chapter "${ch.id}" links to missing term "${k}"`);
  }
});

test('every prediction has exactly one right answer, and every chapter can show itself', () => {
  for (const ch of CHAPTERS) {
    if (ch.predict) assert.equal(ch.predict.options.filter((o) => o.right).length, 1, ch.id);
    assert.ok(ch.show && (ch.show.tab || ch.show.steps?.length), ch.id);
    let last = 0;
    for (const s of ch.show.steps ?? []) {
      assert.ok(s.step > last && s.step <= K.steps, `${ch.id}: steps must go forward within the run`);
      assert.ok(s.speed >= 0 && s.speed < SPEEDS.length);
      last = s.step;
    }
    if (ch.show.view) assert.ok(VIEWS.some((v) => v.key === ch.show.view), `${ch.id}: unknown view`);
    if (ch.show.highlight) assert.ok(READOUTS.some((r) => r.key === ch.show.highlight), `${ch.id}: unknown readout`);
    if (ch.show.scenario) assert.ok(SCENARIOS[ch.show.scenario], `${ch.id}: unknown scenario`);
  }
  // the lessons on the default run go forward through one run
  const steps = CHAPTERS.filter((ch) => !ch.show.scenario && !ch.show.seed)
    .flatMap((ch) => ch.show.steps ?? [])
    .map((s) => s.step);
  assert.deepEqual(steps, [...steps].sort((a, b) => a - b));
});

test('every picture has help', () => {
  for (const v of VIEWS) assert.ok(PICTURE_HELP[v.key]?.length, v.key);
});

test('markup escapes text and turns links into buttons', () => {
  const html = markup('a <b> [mats|mat] and ([Cloudina]).');
  assert.match(html, /a &lt;b&gt; /);
  assert.match(html, /data-term="mat">mats</);
  assert.match(html, /<span class="nw">\(<button type="button" class="term" data-term="cloudina">Cloudina<\/button>\)\.<\/span>/);
  assert.deepEqual(termKeys('[mats|mat] and [Cloudina]'), ['mat', 'cloudina']);
});

test('numbers are written for people', () => {
  assert.equal(fmt.num(140000), '140,000');
  assert.equal(fmt.num(0.0123), '0.012');
  assert.equal(fmt.num(-3.21), '−3.2');
  assert.equal(fmt.int(16504.4), '16,504');
  assert.equal(fmt.pct(0.0567), '6 %');
  assert.equal(fmt.pct(0.001), 'under 1 %');
  assert.equal(fmt.len(5.2), '5.2 mm');
  assert.equal(fmt.len(114.6), '11 cm');
  assert.equal(fmt.len(38), '3.8 cm');
  assert.equal(fmt.len(1300), '1.3 m');
  assert.equal(fmt.esc('<a href="x">&'), '&lt;a href=&quot;x&quot;&gt;&amp;');
});

test('every readout explains itself at every stage of a run', () => {
  const e = new Engine();
  const samples = [e.history[0]];
  for (const s of [30, 150, 300, 420, 560]) {
    e.run(s - e.step);
    samples.push(e.history.at(-1));
  }
  samples.push({ ...samples[0], bigPred: 0, carn: 0 });
  for (const h of samples) {
    const said = narrate(h);
    assert.ok(said.length > 20, `narrator at step ${h.step}`);
    for (const k of links(said)) assert.ok(GLOSSARY[k], `narrator links to missing term ${k}`);
    for (const r of READOUTS) {
      assert.ok(r.value(h), r.key);
      const ex = explain(r.key, h);
      assert.ok(ex && ex.title && ex.value && ex.html.length, `${r.key} at step ${h.step}`);
      for (const p of ex.html.filter(Boolean)) for (const k of links(p)) assert.ok(GLOSSARY[k], `${r.key} links to missing term ${k}`);
    }
  }
});

test('the simulation server answers init, step, inject and set', () => {
  const got = [];
  const handle = createSimServer((m) => got.push(m));
  handle({ type: 'init', seed: 'opabinia', scenario: 'real' });
  assert.equal(got[0].type, 'ready');
  assert.equal(got[0].steps, K.steps);
  assert.equal(got[1].type, 'tick');
  assert.equal(got[1].points.length, 1);
  handle({ type: 'step', n: 3 });
  const tick = got.filter((m) => m.type === 'tick').at(-1);
  assert.equal(tick.points.length, 3, 'only the new points are sent');
  assert.equal(tick.frame.agents.length, tick.frame.n * tick.frame.F);
  assert.equal(got.at(-1).type, 'paused');
  for (const kind of ['predator', 'extinction', 'blind']) {
    handle({ type: 'inject', kind });
    assert.ok(got.at(-1).notes.some((n) => n.kind === 'lab'), kind);
  }
  handle({ type: 'set', patch: { oxygen: 1.2 } });
  assert.equal(got.at(-1).params.oxygen, 1.2);
  handle({ type: 'step', n: 2 });
  handle({ type: 'nonsense' });
  assert.ok(!got.some((m) => m.type === 'error'), got.find((m) => m.type === 'error')?.message);
});

test('runTo stops at its step', async () => {
  const got = [];
  const handle = createSimServer((m) => got.push(m));
  handle({ type: 'init', seed: 'opabinia', scenario: 'real' });
  handle({ type: 'runTo', step: 25, speed: 3 });
  await new Promise((resolve) => {
    const wait = () => (got.some((m) => m.type === 'paused') ? resolve() : setTimeout(wait, 20));
    wait();
  });
  const paused = got.find((m) => m.type === 'paused');
  assert.equal(paused.step, 25);
  assert.equal(got.filter((m) => m.type === 'tick').at(-1).frame.step, 25);
});

test('the checks score a run', () => {
  const e = new Engine();
  e.run(560);
  const r = evaluate(summarize(e));
  assert.equal(r.total, r.checks.length);
  assert.ok(r.total >= 8);
  assert.ok(r.checks.every((c) => typeof c.pass === 'boolean' && c.title && c.model && c.real && c.source && ['emerges', 'tuned', 'built in'].includes(c.how)));
});
