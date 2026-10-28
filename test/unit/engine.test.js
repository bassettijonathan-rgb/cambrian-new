import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Engine } from '../../src/sim/engine.js';
import { K, T, NT, SCENARIOS, oxygen, mineralCost, makeParams } from '../../src/sim/params.js';
import { classify, G, GROUPS, genusName } from '../../src/sim/groups.js';

test('the same seed gives the same run, and another seed another', () => {
  const a = new Engine({ seed: 'abc' });
  const b = new Engine({ seed: 'abc' });
  const c = new Engine({ seed: 'abd' });
  a.run(80);
  b.run(80);
  c.run(80);
  assert.deepEqual(a.history, b.history);
  assert.deepEqual(a.log, b.log);
  assert.notDeepEqual(a.history.at(-1), c.history.at(-1));
});

test('the run starts as an Ediacaran sea floor', () => {
  const e = new Engine();
  const h = e.history[0];
  assert.equal(h.ma, K.t0);
  assert.equal(h.carn, 0);
  assert.equal(h.armour, 0);
  assert.equal(h.eyes, 0);
  assert.ok(h.mat > 0.8);
  assert.ok(h.groups[G.frond] > 0 && h.groups[G.soft] > 0);
});

test('animals stay within the world and their traits within bounds', () => {
  const e = new Engine();
  e.run(150);
  assert.ok(e.n > 100 && e.n <= K.N);
  for (let i = 0; i < e.n; i++) {
    assert.ok(e.x[i] >= 0 && e.x[i] < K.W);
    for (let t = 0; t < NT; t++) {
      const v = e.tr[i * NT + t];
      assert.ok(Number.isFinite(v) && v >= 0 && v <= (t === T.size ? K.maxSize : 1));
    }
  }
  for (const h of e.history) assert.ok(Number.isFinite(h.disparity) && h.mat >= 0 && h.mat <= 1.0001);
});

test('switching a trait off keeps it at zero', () => {
  const e = new Engine({ scenario: 'noPredators' });
  e.run(100);
  for (let i = 0; i < e.n; i++) assert.equal(e.tr[i * NT + T.carn], 0);
  assert.equal(e.history.at(-1).carn, 0);
});

test('oxygen rises and skeletons get cheaper', () => {
  const p = makeParams();
  assert.ok(oxygen(500, p) > 3 * oxygen(560, p));
  assert.equal(oxygen(500, makeParams('lowOxygen')), oxygen(560, p));
  assert.ok(mineralCost(560, p) > mineralCost(540, p));
  for (const k of Object.keys(SCENARIOS)) assert.ok(SCENARIOS[k].label && SCENARIOS[k].blurb);
});

test('body plans are sorted by their parts', () => {
  const t = (o) => {
    const v = new Array(NT).fill(0);
    for (const [k, x] of Object.entries(o)) v[T[k]] = x;
    return v;
  };
  assert.equal(classify(t({ move: 0, filter: 1 })), G.frond);
  assert.equal(classify(t({ move: 0, armour: 0.8 })), G.tube);
  assert.equal(classify(t({ move: 0.8, legs: 0.9, seg: 0.8, armour: 0.7 })), G.arthropod);
  assert.equal(classify(t({ move: 0.8, legs: 0.9, seg: 0.1 })), G.lobopod);
  assert.equal(classify(t({ move: 0.9, swim: 0.9, jaws: 0.9, carn: 0.9 })), G.radiodont);
  assert.equal(classify(t({ move: 0.5, burrow: 0.9 })), G.burrower);
  assert.equal(classify(t({ move: 0.5 })), G.soft);
  assert.equal(GROUPS.length, 11);
});

test('genus names are words, the same for the same species', () => {
  for (let i = 0; i < 300; i++) {
    const n = genusName(i);
    assert.match(n, /^[A-Z][a-z]{3,}$/);
    assert.equal(n, genusName(i));
  }
});

test('the picture gets every animal', () => {
  const e = new Engine();
  e.run(20);
  const f = e.frame();
  assert.equal(f.agents.length, f.n * f.F);
  assert.equal(f.mat.length, K.cols);
  assert.ok(f.fauna.length > 0 && f.fauna.length <= 40);
});
