// The Validation tab: run the default history to the end, plus three
// what-ifs (no predators, low oxygen, eyes first), and set the results beside
// the fossil record. The same checks run in the headless long-run test.
//
// Each check says how the model gets there. "Emerges": nothing in the model
// aims at this number. "Tuned": constants were chosen so it lands near the
// real value. "Built in": a rule of the model makes it happen, and the check
// shows the rule plays out as meant.

import { Engine } from '../sim/engine.js';
import { K, stepAt } from '../sim/params.js';
import { G, GROUPS } from '../sim/groups.js';

export const breathe = () => new Promise((resolve) => setTimeout(resolve, 0));

export const DEFAULT_SEED = 'opabinia';
const RUNS = ['real', 'noPredators', 'lowOxygen', 'lightSwitch'];

// What a run leaves behind for the checks: its history, its firsts and the
// species alive at Burgess Shale time.
export function summarize(e) {
  const first = {};
  for (const l of e.log) if (l.key && first[l.key] === undefined) first[l.key] = l.ma;
  return { history: e.history, first, burgess: e.snapshots.burgess ?? null };
}

export async function runValidation(onProgress, { seed = DEFAULT_SEED } = {}) {
  const total = RUNS.length * K.steps;
  const out = {};
  let t = Date.now();
  for (let r = 0; r < RUNS.length; r++) {
    const e = new Engine({ seed, scenario: RUNS[r] });
    while (!e.done) {
      e.run(1);
      if (Date.now() - t > 40) {
        if (onProgress) onProgress({ step: r * K.steps + e.step, total });
        await breathe();
        t = Date.now();
      }
    }
    out[RUNS[r]] = summarize(e);
  }
  // keep what the checks need, not every step
  return evaluate(out.real, { noPredators: out.noPredators, lowOxygen: out.lowOxygen, lightSwitch: out.lightSwitch });
}

const ma = (x) => (x === undefined || x < 0 ? 'never' : `${x.toFixed(0)} Ma`);
const cm = (mm) => (mm >= 100 ? `${Math.round(mm / 10)} cm` : `${(mm / 10).toFixed(1)} cm`);
const pc = (x) => `${Math.round(x * 100)} %`;
const at = (run, m) => run.history[Math.min(run.history.length - 1, stepAt(m))];

// `main`: a finished default run (summarize()). `what`: the what-if runs,
// when they were run; without them only the checks on the run itself are made.
export function evaluate(main, what = null) {
  const f = main.first;
  const h508 = at(main, K.burgess);
  const h550 = at(main, 550);
  const h545 = at(main, 545);
  const checks = [];
  const add = (c) => checks.push(c);
  const before = (a, b) => a !== undefined && (b === undefined || a > b);

  add({
    id: 'huntersFirst',
    title: 'Hunters come before armour',
    model: `mobile predators by ${ma(f.pred)}; skeletons spread at ${ma(f.skel)}`,
    real: 'bore holes in Cloudina tubes about 550 Ma, before the small shelly fossils from 538 Ma',
    how: 'emerges',
    pass: before(f.pred, f.skel),
    source: 'Bengtson & Zhao 1992; Hua et al. 2003',
  });
  add({
    id: 'armourFirst',
    title: 'Skeletons come before sharp eyes',
    model: `skeletons spread at ${ma(f.skel)}; eyes with lenses at ${ma(f.eye2)}`,
    real: 'skeletons from 550 Ma (Cloudina) and 538 Ma (small shelly fossils); the oldest eyes about 530 to 521 Ma',
    how: 'emerges',
    pass: before(f.skel, f.eye2),
    source: 'Kouchinsky et al. 2012; Schoenemann et al. 2017',
  });
  add({
    id: 'skelTime',
    title: 'When skeletons spread',
    model: ma(f.skel),
    real: 'small shelly fossils diversify from 538 to about 525 Ma (accept 545 to 525)',
    how: 'tuned',
    pass: f.skel !== undefined && f.skel <= 545 && f.skel >= 525,
    source: 'Kouchinsky et al. 2012; Maloof et al. 2010',
  });
  add({
    id: 'eyeTime',
    title: 'When eyes with lenses appear',
    model: ma(f.eye2),
    real: 'compound eyes of trilobites and radiodonts, about 530 to 515 Ma (accept 535 to 512)',
    how: 'emerges',
    pass: f.eye2 !== undefined && f.eye2 <= 535 && f.eye2 >= 512,
    source: 'Schoenemann et al. 2017; Paterson et al. 2011',
  });
  const arth = h508 ? h508.groups[G.arthropod] / Math.max(1, h508.species) : 0;
  const top = h508 ? h508.groups.indexOf(Math.max(...h508.groups)) : -1;
  add({
    id: 'arthropods',
    title: 'At Burgess Shale time, arthropods are the richest group',
    model: `${pc(arth)} of species are arthropods; the richest group is ${top >= 0 ? GROUPS[top].name.toLowerCase() : '–'}`,
    real: 'arthropods are the largest group in the Burgess Shale, about 37 % of its species',
    how: 'tuned',
    pass: top === G.arthropod,
    source: 'Conway Morris 1986; Caron & Jackson 2008',
  });
  const dispRatio = h508.disparity / Math.max(1e-9, h550.disparity);
  add({
    id: 'disparity',
    title: 'Body plans spread out fast',
    model: `disparity at 508 Ma is ${dispRatio.toFixed(1)} times that at 550 Ma`,
    real: 'by the Burgess Shale, Cambrian arthropods alone were as varied in form as living ones (accept 2 times or more)',
    how: 'emerges',
    pass: dispRatio >= 2,
    source: 'Briggs, Fortey & Wills 1992; Erwin et al. 2011',
  });
  add({
    id: 'mats',
    title: 'Microbial mats give way to churned mud',
    model: `mats cover ${pc(h550.mat)} of the floor at 550 Ma and ${pc(h508.mat)} at 508 Ma`,
    real: 'mats cover Ediacaran sea floors; burrowers break them up through the Cambrian (accept at least 70 % before, at most 60 % after)',
    how: 'emerges',
    pass: h550.mat >= 0.7 && h508.mat <= 0.6,
    source: 'Seilacher 1999; Bottjer, Hagadorn & Dornbos 2000',
  });
  add({
    id: 'topPredator',
    title: 'The biggest hunter at Burgess Shale time',
    model: cm(h508.bigPred),
    real: 'Anomalocaris canadensis grew to about 30 to 40 cm; most Cambrian hunters were far smaller (accept 8 to 100 cm)',
    how: 'tuned',
    pass: h508.bigPred >= 80 && h508.bigPred <= 1000,
    source: 'Daley & Edgecombe 2014; Lerosey-Aubril & Pates 2021',
  });
  if (what) {
    const np = at(what.noPredators, K.burgess);
    add({
      id: 'noPredators',
      title: 'Without predators, no explosion',
      model: `disparity ${np.disparity.toFixed(2)} against ${h508.disparity.toFixed(2)}; skeletons on ${pc(np.armour)} of animals, eyes on ${pc(np.eyes)}`,
      real: 'the arms-race view: predation drove armour, eyes and the spread of body plans (accept disparity below 60 % of the default, armour and eyes under 10 %)',
      how: 'emerges',
      pass: np.disparity < 0.6 * h508.disparity && np.armour < 0.1 && np.eyes < 0.1,
      source: 'Stanley 1973; Vermeij 1989; Bengtson 2002',
    });
    const lo = at(what.lowOxygen, 525);
    const hi = at(main, 525);
    add({
      id: 'lowOxygen',
      title: 'Low oxygen holds the explosion back',
      model: `at 525 Ma: disparity ${lo.disparity.toFixed(2)} against ${hi.disparity.toFixed(2)}, mats ${pc(lo.mat)} against ${pc(hi.mat)}`,
      real: 'active hunting and deep burrowing need more oxygen than Ediacaran seas held (accept disparity lower and mats higher than the default)',
      how: 'built in',
      pass: lo.disparity < hi.disparity && lo.mat > hi.mat,
      source: 'Sperling et al. 2013; Knoll & Carroll 1999',
    });
    const ls = what.lightSwitch.first;
    add({
      id: 'eyesFirst',
      title: 'If eyes had come first, the fossil order would be reversed',
      model: `with cheap early eyes: eyes with lenses at ${ma(ls.eye2)}, skeletons at ${ma(ls.skel)}`,
      real: 'the record shows skeletons before eyes, so eyes alone did not start the arms race (Parker’s light switch, as first dated)',
      how: 'emerges',
      pass: before(ls.eye2, ls.skel),
      source: 'Parker 2003; Schoenemann et al. 2017',
    });
  }
  const passed = checks.filter((c) => c.pass).length;
  return { checks, passed, total: checks.length, burgess: main.burgess ? main.burgess.slice(0, 12) : null };
}

// A short view of a run's history, small enough to embed in the page.
export const HOW = {
  emerges: 'Nothing in the model aims at this number.',
  tuned: 'Constants were chosen so the model lands near it.',
  'built in': 'A rule of the model makes it happen; the check shows the rule plays out as meant.',
};
