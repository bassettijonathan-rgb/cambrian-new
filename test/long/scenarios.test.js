// Each Lab scenario runs to the end and does what its card promises, and
// the Learn chapters stop after the moments they are about.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Engine } from '../../src/sim/engine.js';
import { stepAt } from '../../src/sim/params.js';
import { G } from '../../src/sim/groups.js';

function run(scenario, seed = 'opabinia') {
  const e = new Engine({ seed, scenario });
  while (!e.done) e.run(1);
  return { e, at: (ma) => e.history[stepAt(ma)], first: (k) => e.log.find((l) => l.key === k)?.ma };
}

const real = run('real');

test('the default run: hunters, digging, skeletons, eyes, arthropods', () => {
  const f = real.first;
  assert.ok(f('pred') > f('burrow') && f('burrow') > f('skel') && f('skel') > f('eye2'));
  const h = real.at(508);
  assert.ok(h.groups[G.arthropod] === Math.max(...h.groups));
  assert.equal(h.groups[G.frond], 0, 'the fronds are gone');
});

test('the lessons stop after what they point at', () => {
  // chapter steps: hunters 60, mats 250, armour 320, eyes 400, arms race 450
  const step = (ma) => Math.round((560 - ma) / 0.1);
  assert.ok(step(real.first('pred')) <= 60);
  assert.ok(real.e.history[250].mat < real.e.history[0].mat - 0.15);
  assert.ok(step(real.first('skel')) <= 320);
  assert.ok(step(real.first('eye2')) <= 400);
  assert.ok(step(real.first('g-arthropod')) <= 450);
  const tape = run('real', 'hallucigenia').at(508);
  assert.equal(Math.max(...tape.groups), tape.groups[G.lobopod], 'the hallucigenia seed is won by lobopods');
});

test('no burrowing: the mats survive', () => {
  const { at } = run('noBurrows');
  assert.equal(at(508).burrow, 0);
  assert.ok(at(508).mat > real.at(508).mat + 0.2);
});

test('a blind world stays less varied', () => {
  const { at } = run('blind');
  assert.equal(at(508).eyes, 0);
  assert.ok(at(508).disparity < real.at(508).disparity);
});
