// The simulation: animals on a strip of Cambrian sea floor.
//
// Every animal carries twelve traits (body size, how it moves, segments,
// legs, swimming flaps, eyes, a mineral skeleton, spines, jaws, burrowing,
// and how much it eats animals or filters the water) and a number of Hox
// genes. Each step of 100,000 years it moves, hunts or is hunted, feeds on
// microbial mats, buried food or plankton, pays for its body, and dies or
// breeds. Offspring inherit the traits with small mutations. Nothing in the
// model says which bodies should appear or when: oxygen and calcium in the
// sea change along set curves, and the rest follows from who eats whom.

import { Rng } from './rng.js';
import { dexp } from './dmath.js';
import { K, NT, T, FEATURES, MUT, makeParams, maAt, stepAt, oxygen, mineralCost } from './params.js';
import { GROUPS, G, classify, genusName } from './groups.js';

const LN10 = 2.302585092994046;
const pow10 = (x) => dexp(x * LN10);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

const CAP = K.N + 64;
const BIN = 8; // units per bin of the spatial index
const NB = Math.ceil(K.W / BIN);

// Food
const FM = 45; // from a patch of full mat, per step
const FD = 28; // from buried food, per unit
const P0 = 1400; // plankton over the whole strip, per step
const KILL = 3; // a kill is worth this many steps of the prey's own needs

// Hunting
const SLOTS = 60; // animals in a bin that make it crowded
const INTERFERE = 0.25; // how much hunters get in each other's way
const SMALLHIDE = 0.3; // how often a hunter notices prey much smaller than itself
const ARMOUR = 6; // how much a mineral skeleton protects

// Running costs, per step, as a share of the food an animal needs
const ARMCOST = 0.15; // a full skeleton, after the calcium rise
const SQ = 0.05; // a bigger body is dearer to build and hold up (× size²)

// Oxygen: what the sea can deliver, and what bodies ask for
const CAPO0 = 0.15;
const BURO2 = 1.4; // digging
const EYEO2 = 0.25; // eyes and the brain behind them
const GILL = 0.3; // swimming flaps double as gills

const MU = 0.1; // chance of dying of other causes each step, for the smallest

// A species is founded when an animal's traits are this far from its
// species' founder.
const SPLIT = 0.3;

// templates of the Ediacaran animals at the start
const START = [
  { share: 0.42, t: { size: 1.6, move: 0, filter: 0.9 } }, // fronds
  { share: 0.34, t: { size: 0.9, move: 0.4, seg: 0.1 } }, // soft crawlers
  { share: 0.22, t: { size: 0.4, move: 0.5, burrow: 0.15, filter: 0.05 } }, // small worms
  { share: 0.02, t: { size: 0.8, move: 0, carn: 0.7, jaws: 0.2 } }, // polyps with stinging tentacles
];

export class Engine {
  constructor({ seed = 'opabinia', scenario = 'real', params = {} } = {}) {
    this.seed = String(seed);
    this.scenario = scenario;
    this.params = makeParams(scenario, params);
    this.rng = new Rng(this.seed);
    this.step = 0;
    this.done = false;
    this.nextId = 0;

    this.tr = new Float64Array(CAP * NT);
    this.hox = new Uint8Array(CAP);
    this.x = new Float64Array(CAP);
    this.y = new Float64Array(CAP);
    this.z = new Float64Array(CAP); // depth into the picture, and where in the water or mud it lives
    this.e = new Float64Array(CAP); // energy store, in steps of its own needs
    this.sp = new Int32Array(CAP);
    this.id = new Int32Array(CAP);
    this.n = 0;

    // per-step scratch
    this.L = new Float64Array(CAP); // body length, mm
    this.b = new Float64Array(CAP); // food needed per step
    this.v = new Float64Array(CAP); // speed
    this.R = new Float64Array(CAP); // how far it can sense, cm
    this.food = new Float64Array(CAP);
    this.cost = new Float64Array(CAP);
    this.dead = new Uint8Array(CAP);
    this.col = new Int32Array(CAP);
    this.binStart = new Int32Array(NB + 1);
    this.binItems = new Int32Array(CAP);

    this.mat = new Float64Array(K.cols).fill(0.85);
    this.det = new Float64Array(K.cols).fill(0.4);
    this.turb = new Float64Array(K.cols);

    this.species = [];
    this.history = [];
    this.log = [];
    this.flags = {};
    this.snapshots = {};
    this.kills = []; // the last step's kills: [predator id, prey id, x, y]
    this.totalKills = 0;
    this.eyeTimes = { first: null, lens: null };

    this.seedAnimals();
    this.record();
  }

  get ma() {
    return maAt(this.step);
  }

  newSpecies(i, parent) {
    const s = {
      id: this.species.length,
      parent,
      born: this.step,
      died: -1,
      founder: this.tr.slice(i * NT, i * NT + NT),
      mean: new Float64Array(NT),
      count: 0,
      group: classify(this.tr, i * NT),
      maxL: 0,
      hox: this.hox[i],
    };
    s.name = genusName(s.id);
    this.species.push(s);
    return s.id;
  }

  seedAnimals() {
    const rng = this.rng;
    const eyes = this.params.eyesEarly ? 0.25 : 0;
    for (let k = 0; k < START.length; k++) {
      const count = Math.round(0.6 * K.N * START[k].share);
      let spId = -1;
      for (let c = 0; c < count; c++) {
        const i = this.n++;
        const o = i * NT;
        for (let t = 0; t < NT; t++) this.tr[o + t] = 0;
        for (const [key, val] of Object.entries(START[k].t)) this.tr[o + T[key]] = val;
        this.tr[o + T.eye] = eyes;
        for (let t = 0; t < NT; t++) {
          const sd = t === T.size ? 0.1 : 0.03;
          const v = this.tr[o + t] + sd * rng.normal();
          this.tr[o + t] = t === T.size ? Math.max(0, v) : clamp01(v);
        }
        if (k === 0) this.tr[o + T.move] = 0;
        const p = this.params;
        if (!p.predators) this.tr[o + T.carn] = 0;
        if (!p.eyes) this.tr[o + T.eye] = 0;
        if (!p.burrowing) this.tr[o + T.burrow] = 0;
        if (!p.armour) this.tr[o + T.armour] = 0;
        this.hox[i] = 4;
        this.id[i] = this.nextId++;
        this.x[i] = rng.float() * K.W;
        this.z[i] = rng.float();
        this.e[i] = 0.5 + rng.float();
        if (spId < 0) spId = this.newSpecies(i, -1);
        this.sp[i] = spId;
      }
    }
    for (let i = 0; i < this.n; i++) this.placeY(i);
  }

  placeY(i) {
    const o = i * NT;
    const tr = this.tr;
    const move = tr[o + T.move];
    const bur = tr[o + T.burrow];
    const swim = tr[o + T.swim];
    if (move < 0.2) this.y[i] = 0;
    else if (bur > 0.5 && bur >= swim) this.y[i] = -(0.15 + 0.85 * bur) * K.D * (0.35 + 0.6 * this.z[i]);
    else if (swim > 0.5) this.y[i] = 3 + (K.H - 14) * (0.1 + 0.9 * this.z[i]) * swim;
    else this.y[i] = 0;
  }

  // Body length, food needs, speed, senses and running costs of every animal.
  derive(O2, mc) {
    const { tr, hox, L, b, v, R, cost, n } = this;
    const p = this.params;
    const capO = CAPO0 + 3 * O2;
    for (let i = 0; i < n; i++) {
      const o = i * NT;
      const s = tr[o + T.size];
      const move = tr[o + T.move];
      const seg = tr[o + T.seg];
      const legs = tr[o + T.legs];
      const swim = tr[o + T.swim];
      const eye = tr[o + T.eye];
      const arm = tr[o + T.armour];
      const spines = tr[o + T.spines];
      const jaws = tr[o + T.jaws];
      const bur = tr[o + T.burrow];
      const carn = tr[o + T.carn];
      const filt = tr[o + T.filter];
      const len = pow10(s);
      L[i] = len;
      b[i] = pow10(0.5 * s);
      const cm = len / 10;
      const mob = move < 0.2 ? 0 : move;
      v[i] = mob * (0.25 + 0.9 * legs * (0.4 + 0.6 * seg) + 1.3 * swim) * Math.sqrt(0.3 + cm) * (1 - 0.5 * arm * (1 - 0.6 * seg));
      R[i] = Math.min(60, 1 + cm * (3 + 15 * eye * eye));
      // features that need a body region of their own need Hox genes
      let nf = 0;
      for (let f = 0; f < FEATURES.length; f++) if (tr[o + FEATURES[f]] > 0.4) nf++;
      const hoxPen = nf > hox[i] ? 0.22 * (nf - hox[i]) : 0;
      // oxygen: an active body, and a bigger one, needs more delivered
      const act = 0.35 + 0.25 * mob + 0.35 * legs + 1.0 * swim + 0.6 * carn * (0.5 + jaws) + BURO2 * bur + EYEO2 * eye;
      // swimming flaps double as gills, as the blades on radiodont flaps seem to have
      const need = act * (0.4 + 0.15 * s) * (1 - GILL * swim);
      const o2Pen = need > capO ? 4 * (need - capO) : 0;
      cost[i] =
        0.55 +
        0.05 * mob +
        0.1 * legs +
        0.28 * swim +
        0.14 * eye * p.eyeCost +
        ARMCOST * arm * mc +
        0.08 * spines +
        0.1 * jaws +
        0.1 * bur * (1 + 0.5 * s) +
        0.03 * seg +
        SQ * s * s +
        0.04 * filt +
        hoxPen +
        o2Pen;
    }
  }

  move() {
    const { tr, x, n, v, mat, det, rng, col } = this;
    for (let i = 0; i < n; i++) {
      const o = i * NT;
      if (tr[o + T.move] >= 0.2) {
        let dx = rng.normal() * v[i] * 2.5;
        // forage toward the richer patch next door
        const c = Math.floor(x[i] / K.colW);
        const bur = tr[o + T.burrow];
        if (tr[o + T.carn] < 0.5 && tr[o + T.swim] < 0.5 && rng.chance(0.3 + 0.5 * tr[o + T.eye])) {
          const l = (c + K.cols - 1) % K.cols;
          const r = (c + 1) % K.cols;
          const val = (k) => (1 - bur) * mat[k] + bur * det[k];
          const here = val(c);
          if (val(l) > here && val(l) >= val(r)) dx -= K.colW * (0.5 + 0.5 * rng.float());
          else if (val(r) > here) dx += K.colW * (0.5 + 0.5 * rng.float());
        }
        x[i] = (((x[i] + dx) % K.W) + K.W) % K.W;
      }
      this.placeY(i);
      col[i] = Math.min(K.cols - 1, Math.floor(x[i] / K.colW));
    }
  }

  buildBins() {
    const { x, n, binStart, binItems } = this;
    binStart.fill(0);
    for (let i = 0; i < n; i++) binStart[Math.min(NB - 1, Math.floor(x[i] / BIN)) + 1]++;
    for (let k = 0; k < NB; k++) binStart[k + 1] += binStart[k];
    const fill = binStart.slice(0, NB);
    for (let i = 0; i < n; i++) binItems[fill[Math.min(NB - 1, Math.floor(x[i] / BIN))]++] = i;
  }

  // The chance that predator i, having picked prey j, finds, catches and
  // subdues it.
  killChance(i, j) {
    const { tr, L, v, R, y } = this;
    const oi = i * NT;
    const oj = j * NT;
    // small prey is harder to notice
    let find = Math.min(1, SMALLHIDE + ((1 - SMALLHIDE) * 3 * L[j]) / L[i]);
    // prey in the mud is found only some of the time, unless the hunter digs
    if (y[j] < 0) find *= 1 - 0.85 * tr[oj + T.burrow] * (1 - tr[oi + T.burrow]);
    // prey in open water mostly escapes the notice of hunters on the floor
    else if (y[j] > 1 && tr[oi + T.swim] < 0.5) find *= 0.25;
    const jaws = tr[oi + T.jaws];
    // spines make prey too big to swallow; jaws open the gape
    const eff = L[j] * (1 + 1.5 * tr[oj + T.spines]);
    if (eff > L[i] * (0.5 + 0.7 * jaws)) return 0;
    const alert = R[j] / (R[j] + R[i]);
    const esc = tr[oj + T.move] < 0.2 ? 0 : Math.min(1, (1.3 * v[j]) / (v[j] + v[i] + 0.02));
    const ratio = L[i] / L[j] - 1;
    const pow = 0.25 + 1.75 * jaws + 0.4 * (ratio < 0 ? 0 : ratio > 2 ? 2 : ratio);
    const def = 0.25 + ARMOUR * tr[oj + T.armour] * (1 - 0.5 * jaws);
    return find * (1 - alert * esc) * (pow / (pow + def));
  }

  hunt() {
    const { tr, n, rng, x, y, b, R, food, dead, binStart, binItems } = this;
    this.kills = [];
    if (!this.params.predators) return;
    // hunters get in each other's way: the more of them in a patch, the
    // less each one catches
    const crowd = new Float64Array(NB);
    for (let i = 0; i < n; i++) crowd[Math.min(NB - 1, Math.floor(x[i] / BIN))] += tr[i * NT + T.carn];
    const order = [];
    for (let i = 0; i < n; i++) if (tr[i * NT + T.carn] > 0.05) order.push(i);
    shuffle(order, rng);
    for (const i of order) {
      if (dead[i]) continue;
      const carn = tr[i * NT + T.carn];
      const want = 2.2 * b[i];
      let got = 0;
      const tries = Math.floor(6 * carn) + (rng.chance(6 * carn - Math.floor(6 * carn)) ? 1 : 0);
      // time to catch and eat: a small catch takes less of it than a big one
      let handling = 1;
      const r = R[i];
      const reach = Math.max(1, Math.ceil(r / BIN));
      for (let a = 0; a < tries && got < want && handling > 0; a++) {
        let best = -1;
        let bestVal = 0;
        let bestP = 0;
        for (let c = 0; c < 12; c++) {
          const bin = (((Math.floor(x[i] / BIN) + rng.int(2 * reach + 1) - reach) % NB) + NB) % NB;
          // a look in some direction finds an animal as often as animals
          // are there: hunting gets harder as prey gets scarce
          const lo = binStart[bin];
          const slot = rng.int(SLOTS);
          if (slot >= binStart[bin + 1] - lo) continue;
          const j = binItems[lo + slot];
          if (j === i || dead[j]) continue;
          let dx = Math.abs(x[j] - x[i]);
          if (dx > K.W / 2) dx = K.W - dx;
          if (dx > r) continue;
          const pk = this.killChance(i, j);
          if (pk <= 0) continue;
          const val = pk * Math.min(KILL * b[j], want - got);
          if (val > bestVal) {
            bestVal = val;
            best = j;
            bestP = pk;
          }
        }
        if (best < 0) continue;
        const others = crowd[Math.min(NB - 1, Math.floor(x[i] / BIN))] - carn;
        if (rng.chance(bestP / (1 + INTERFERE * Math.max(0, others)))) {
          dead[best] = 2;
          const gain = KILL * b[best];
          const eat = Math.min(gain, want - got);
          got += eat;
          this.det[this.col[best]] += (0.3 * (gain - eat)) / FD;
          this.kills.push([this.id[i], this.id[best], x[best], y[best]]);
          x[i] = x[best];
          handling -= 0.1 + b[best] / b[i];
        }
      }
      food[i] += got;
    }
    this.totalKills += this.kills.length;
  }

  feed() {
    const { tr, n, b, food, dead, col, mat, det } = this;
    const p = this.params;
    const cm = new Float64Array(K.cols);
    const cd = new Float64Array(K.cols);
    let cp = 0;
    const g = new Float64Array(n);
    const d = new Float64Array(n);
    const f = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      if (dead[i]) continue;
      const o = i * NT;
      const capF = 2.2 * b[i] * (1 - tr[o + T.carn]);
      const filt = tr[o + T.filter];
      const bur = tr[o + T.burrow];
      const mob = tr[o + T.move] >= 0.2;
      // jointed legs also rake up and pass food to the mouth
      const rake = 1 + 0.3 * tr[o + T.legs] * (0.5 + 0.5 * tr[o + T.seg]);
      g[i] = capF * (1 - filt) * (1 - bur) * (mob ? rake : 0.15) * (this.y[i] > 1 ? 0.15 : 1);
      d[i] = capF * (1 - filt) * bur * rake;
      f[i] = capF * filt;
      cm[col[i]] += g[i];
      cd[col[i]] += d[i];
      cp += f[i];
    }
    const sp = P0 * p.plankton;
    const fp = cp > sp ? sp / cp : 1;
    const eatM = new Float64Array(K.cols);
    const eatD = new Float64Array(K.cols);
    for (let i = 0; i < n; i++) {
      if (dead[i]) continue;
      const o = i * NT;
      const c = col[i];
      const sm = mat[c] * FM;
      const sd = det[c] * FD;
      const gm = g[i] * (cm[c] > sm ? sm / cm[c] : 1);
      const gd = d[i] * (cd[c] > sd ? sd / cd[c] : 1);
      const mob = tr[o + T.move] >= 0.2 ? 1 : 0;
      let effF = 0.5 + 0.5 * (1 - mob) - 0.35 * tr[o + T.swim];
      // a soft animal fixed to the floor needs firm, mat-bound ground to hold on to
      if (!mob) effF *= 1 - (1 - tr[o + T.armour]) * (1 - mat[c]);
      food[i] += gm + gd + f[i] * fp * effF;
      eatM[c] += gm;
      eatD[c] += gd;
    }
    // the mats and the buried food
    const turbIn = new Float64Array(K.cols);
    for (let i = 0; i < n; i++) {
      if (dead[i]) continue;
      const bur = tr[i * NT + T.burrow];
      if (bur > 0.35) turbIn[col[i]] += (bur - 0.35) * Math.sqrt(this.L[i] / 10);
    }
    for (let c = 0; c < K.cols; c++) {
      this.turb[c] = 0.8 * this.turb[c] + 0.2 * (turbIn[c] / 3);
      const kc = Math.max(0.04, 1 - 0.95 * Math.min(1, this.turb[c]));
      let m = mat[c] - (0.12 * eatM[c]) / FM;
      m += 1.3 * p.mats * m * (kc - m) + 0.003;
      mat[c] = Math.max(0, Math.min(1, m));
      let dd = det[c] - eatD[c] / FD + 0.12 * mat[c] + 0.04;
      det[c] = Math.max(0, Math.min(3, dd * 0.92));
    }
  }

  // Pay for the body; die of hunger, by chance or in a predator; breed when
  // there is energy to spare. Food sets how many animals the sea floor holds.
  turnover() {
    const { tr, n, rng, food, b, cost, dead, e } = this;
    const p = this.params;
    for (let i = 0; i < n; i++) {
      if (dead[i]) continue;
      const B = breedAt(tr[i * NT + T.size]);
      e[i] = Math.min(2 * B, e[i] + food[i] / b[i] - cost[i]);
      if (e[i] < -1 || rng.chance(MU * pow10(-0.25 * tr[i * NT + T.size]))) {
        dead[i] = 1;
        this.det[this.col[i]] += (0.5 * b[i]) / FD;
      }
    }
    // compact the survivors
    let m = 0;
    for (let i = 0; i < n; i++) {
      if (dead[i]) continue;
      if (m !== i) this.copy(i, m);
      m++;
    }
    this.n = m;
    const order = [];
    for (let i = 0; i < m; i++) order.push(i);
    shuffle(order, rng);
    for (const i of order) {
      const B = breedAt(tr[i * NT + T.size]);
      let births = 0;
      while (e[i] >= B && births < 2 && this.n < K.N) {
        e[i] -= B;
        this.birth(i, p);
        births++;
      }
    }
    this.clearScratch();
  }

  clearScratch() {
    this.dead.fill(0, 0, this.n);
    this.food.fill(0, 0, this.n);
  }

  copy(from, to) {
    this.tr.copyWithin(to * NT, from * NT, from * NT + NT);
    this.hox[to] = this.hox[from];
    this.x[to] = this.x[from];
    this.y[to] = this.y[from];
    this.z[to] = this.z[from];
    this.e[to] = this.e[from];
    this.sp[to] = this.sp[from];
    this.id[to] = this.id[from];
    this.col[to] = this.col[from];
    this.L[to] = this.L[from];
    this.b[to] = this.b[from];
  }

  birth(par, p) {
    const rng = this.rng;
    const c = this.n++;
    const oc = c * NT;
    const op = par * NT;
    const tr = this.tr;
    const mu = p.mutation;
    for (let t = 0; t < NT; t++) {
      let val = tr[op + t];
      if (rng.chance(MUT.p * mu)) {
        const sd = (t === T.size ? MUT.sdSize : MUT.sd) * (rng.chance(MUT.big) ? 5 : 1);
        val += sd * rng.normal();
      }
      tr[oc + t] = t === T.size ? Math.min(K.maxSize, Math.max(0, val)) : clamp01(val);
    }
    if (!p.predators) tr[oc + T.carn] = 0;
    if (!p.eyes) tr[oc + T.eye] = 0;
    if (!p.burrowing) tr[oc + T.burrow] = 0;
    if (!p.armour) tr[oc + T.armour] = 0;
    let h = this.hox[par];
    if (rng.chance(MUT.hoxGain * mu) && h < K.hoxMax) h++;
    else if (rng.chance(MUT.hoxLoss * mu) && h > 1) h--;
    this.hox[c] = h;
    this.x[c] = (((this.x[par] + rng.normal() * 3) % K.W) + K.W) % K.W;
    this.z[c] = clamp01(this.z[par] + 0.15 * rng.normal());
    this.e[c] = 0.3;
    this.id[c] = this.nextId++;
    this.dead[c] = 0;
    this.food[c] = 0;
    this.col[c] = Math.min(K.cols - 1, Math.floor(this.x[c] / K.colW));
    this.L[c] = pow10(tr[oc + T.size]);
    this.b[c] = pow10(0.5 * tr[oc + T.size]);
    // a new species once it has drifted far enough from its founder
    const sp = this.species[this.sp[par]];
    let d2 = 0;
    for (let t = 0; t < NT; t++) {
      const w = t === T.size ? 1 / 3 : 1;
      const dd = (tr[oc + t] - sp.founder[t]) * w;
      d2 += dd * dd;
    }
    this.sp[c] = d2 > SPLIT * SPLIT ? this.newSpecies(c, sp.id) : sp.id;
    this.placeY(c);
  }

  run(steps = 1) {
    for (let k = 0; k < steps && !this.done; k++) this.tick();
  }

  tick() {
    const ma = this.ma;
    const O2 = oxygen(ma, this.params);
    const mc = mineralCost(ma, this.params);
    this.derive(O2, mc);
    this.move();
    this.buildBins();
    this.hunt();
    this.feed();
    this.turnover();
    this.step++;
    if (this.step >= K.steps) this.done = true;
    this.record();
  }

  // What the run looks like now, for the charts, the narrator and the checks.
  record() {
    const { tr, n, sp, species } = this;
    const ma = this.ma;
    for (const s of species) {
      if (s.died >= 0) continue;
      s.count = 0;
      s.mean.fill(0);
      s.maxL = 0;
    }
    let eyes = 0;
    let lens = 0;
    let armour = 0;
    let carn = 0;
    let burrow = 0;
    let bigPred = 0;
    let maxL = 0;
    let sumS = 0;
    const indiv = new Array(GROUPS.length).fill(0);
    for (let i = 0; i < n; i++) {
      const o = i * NT;
      const s = species[sp[i]];
      s.count++;
      for (let t = 0; t < NT; t++) s.mean[t] += tr[o + t];
      const len = K.lenScale * pow10(tr[o + T.size]);
      if (len > s.maxL) s.maxL = len;
      if (len > maxL) maxL = len;
      sumS += tr[o + T.size];
      if (tr[o + T.eye] > 0.3) eyes++;
      if (tr[o + T.eye] > 0.7) lens++;
      if (tr[o + T.armour] > 0.5) armour++;
      if (tr[o + T.burrow] > 0.5) burrow++;
      if (tr[o + T.carn] > 0.5 && tr[o + T.move] >= 0.2) {
        carn++;
        if (len > bigPred) bigPred = len;
      }
    }
    const alive = [];
    const groups = new Array(GROUPS.length).fill(0);
    for (const s of species) {
      if (s.died >= 0) continue;
      if (s.count === 0) {
        s.died = this.step;
        continue;
      }
      for (let t = 0; t < NT; t++) s.mean[t] /= s.count;
      s.group = classify(s.mean);
      alive.push(s);
      groups[s.group]++;
      indiv[s.group] += s.count;
    }
    // disparity: the summed variance of the species' average bodies
    let disp = 0;
    if (alive.length > 1) {
      for (let t = 0; t < NT; t++) {
        const w = t === T.size ? 1 / 3 : 1;
        let m = 0;
        for (const s of alive) m += s.mean[t] * w;
        m /= alive.length;
        let v = 0;
        for (const s of alive) v += (s.mean[t] * w - m) ** 2;
        disp += v / (alive.length - 1);
      }
    }
    let matSum = 0;
    for (let c = 0; c < K.cols; c++) matSum += this.mat[c];
    let hox = 0;
    for (let i = 0; i < n; i++) hox += this.hox[i];
    const nGroups = groups.filter((g) => g > 0).length;
    const h = {
      step: this.step,
      ma,
      n,
      species: alive.length,
      groups,
      indiv,
      nGroups,
      disparity: disp,
      eyes: n ? eyes / n : 0,
      lens: n ? lens / n : 0,
      armour: n ? armour / n : 0,
      carn: n ? carn / n : 0,
      burrow: n ? burrow / n : 0,
      maxL,
      bigPred,
      meanL: n ? K.lenScale * pow10(sumS / n) : 0,
      mat: matSum / K.cols,
      o2: oxygen(ma, this.params),
      kills: this.kills.length,
      hox: n ? hox / n : 0,
      originations: species.filter((s) => s.born === this.step && this.step > 0).length,
    };
    this.history.push(h);
    this.notice(h, alive);
  }

  note(kind, text, extra = {}) {
    this.log.push({ step: this.step, ma: this.ma, kind, text, ...extra });
  }

  // Firsts and turning points, for the narrator and the list of events.
  notice(h, alive) {
    const f = this.flags;
    const once = (key, cond, kind, text, extra) => {
      if (!f[key] && cond) {
        f[key] = true;
        this.note(kind, text, { key, ...extra });
      }
    };
    const mm = (l) => (l >= 100 ? `${Math.round(l / 10)} cm` : l >= 10 ? `${(l / 10).toFixed(1)} cm` : `${l.toFixed(1)} mm`);
    once('pred', h.carn >= 0.02, 'predator', `Animals start eating animals. The biggest hunter is ${mm(h.bigPred)} long.`);
    once('burrow', h.burrow >= 0.03, 'burrow', 'Animals dig into the sediment, out of reach and onto buried food.');
    once('skel', h.armour >= 0.03, 'armour', 'Mineral skeletons: shells and plates spread among the animals.');
    once('eye1', h.eyes >= 0.03, 'eye', 'Eyes: cups of light-sensitive cells let animals tell where light and shadow come from.');
    once('eye2', h.lens >= 0.03, 'eye', 'Eyes with lenses: animals now see shapes, at a distance.');
    once('pred1', h.carn >= 0.02 && h.bigPred >= 10, 'predator', 'A predator reaches 1 cm.');
    once('pred10', h.carn >= 0.02 && h.bigPred >= 100, 'predator', 'A predator reaches 10 cm, a giant among the small animals around it.');
    once('mats', h.mat < 0.5 && this.step > 10, 'world', 'The microbial mats cover less than half of the sea floor: burrowers are churning them up.');
    once('cambrian', h.ma <= K.cambrian, 'date', 'The Cambrian begins (538.8 million years ago), marked in the rocks by the first Treptichnus burrows.');
    for (let g = 0; g < GROUPS.length; g++) {
      if (g === G.frond || g === G.soft || g === G.polyp) continue;
      const gr = GROUPS[g];
      const s = alive.find((x) => x.group === g && x.count >= 8);
      once(`g-${gr.key}`, !!s, 'group', `First ${gr.name.toLowerCase()} (like ${gr.like}): ${s ? s.name : ''}.`, { group: g, species: s ? s.id : -1 });
    }
    if (h.indiv[G.frond] > 0.2 * h.n) f.frondsMany = true;
    once('frondsGone', f.frondsMany && h.indiv[G.frond] < 0.01 * h.n, 'group', 'The Ediacaran fronds are gone: eaten, out-competed and smothered.');
    if (this.eyeTimes.first === null && h.eyes >= 0.03) this.eyeTimes.first = h.ma;
    if (this.eyeTimes.lens === null && h.lens >= 0.03) this.eyeTimes.lens = h.ma;
    for (const [key, ma] of [
      ['chengjiang', K.chengjiang],
      ['burgess', K.burgess],
    ]) {
      if (!this.snapshots[key] && h.ma <= ma + 1e-9) this.snapshots[key] = this.fauna(alive);
    }
  }

  // The species alive now, with their average bodies, biggest first by numbers.
  fauna(alive = this.species.filter((s) => s.died < 0 && s.count > 0)) {
    return alive
      .filter((s) => s.count >= 3)
      .sort((a, b) => b.count - a.count)
      .map((s) => ({
        id: s.id,
        name: s.name,
        group: s.group,
        count: s.count,
        born: s.born,
        parent: s.parent,
        maxL: s.maxL,
        mean: Array.from(s.mean, (v) => Math.round(v * 1000) / 1000),
      }));
  }

  // Everything the page needs to draw the present.
  frame() {
    const { n, tr } = this;
    const F = 18;
    const a = new Float32Array(n * F);
    for (let i = 0; i < n; i++) {
      const o = i * NT;
      const k = i * F;
      a[k] = this.id[i];
      a[k + 1] = this.x[i];
      a[k + 2] = this.y[i];
      a[k + 3] = this.z[i];
      a[k + 4] = this.species[this.sp[i]].group;
      a[k + 5] = this.sp[i];
      for (let t = 0; t < NT; t++) a[k + 6 + t] = tr[o + t];
    }
    return {
      step: this.step,
      ma: this.ma,
      n,
      F,
      agents: a,
      mat: Float32Array.from(this.mat),
      turb: Float32Array.from(this.turb),
      kills: this.kills.slice(0, 60),
      o2: oxygen(this.ma, this.params),
      fauna: this.fauna().slice(0, 40),
    };
  }

  geometry() {
    return { W: K.W, H: K.H, D: K.D, cols: K.cols, colW: K.colW, steps: K.steps, t0: K.t0, t1: K.t1, dt: K.dt };
  }

  setParams(patch) {
    this.params = { ...this.params, ...patch };
  }

  // The Lab's buttons.
  inject(kind) {
    const rng = this.rng;
    if (kind === 'predator') {
      let spId = -1;
      for (let k = 0; k < 8 && this.n < CAP; k++) {
        const i = this.n++;
        const o = i * NT;
        const t = { size: 2, move: 0.9, seg: 0.6, swim: 0.9, eye: 0.85, jaws: 0.9, carn: 0.95, legs: 0.1, armour: 0.1 };
        for (let q = 0; q < NT; q++) this.tr[o + q] = 0;
        for (const [key, val] of Object.entries(t)) this.tr[o + T[key]] = val;
        this.hox[i] = 6;
        this.x[i] = rng.float() * K.W;
        this.z[i] = rng.float();
        this.e[i] = 2;
        this.id[i] = this.nextId++;
        if (spId < 0) spId = this.newSpecies(i, -1);
        this.sp[i] = spId;
        this.L[i] = pow10(2);
        this.b[i] = pow10(1);
        this.placeY(i);
      }
      this.note('lab', 'You released eight big, sharp-eyed swimming predators.');
    } else if (kind === 'extinction') {
      let m = 0;
      for (let i = 0; i < this.n; i++) {
        if (rng.chance(0.7)) continue;
        if (m !== i) this.copy(i, m);
        m++;
      }
      this.n = m;
      this.note('lab', 'You struck: seven in ten animals died at random, a mass extinction.');
    } else if (kind === 'blind') {
      for (let i = 0; i < this.n; i++) this.tr[i * NT + T.eye] = 0;
      this.note('lab', 'You took every animal’s eyes away.');
    }
    this.history.pop();
    this.record();
  }
}

// Energy needed to raise one offspring, in steps of the parent's needs.
// Bigger animals breed more slowly, roughly as length to the power 0.75.
const breedAt = (s) => 0.6 * pow10(0.25 * s);

function shuffle(a, rng) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

export { stepAt };
