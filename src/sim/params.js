// The constants of the model, the Lab's settings and the scenarios.
//
// Time runs from 560 to 500 million years ago in steps of 100,000 years.
// The world is a strip of sea floor 12 m long, with water above it and mud
// below. Lengths inside the engine are in units of 5 cm (one "unit"); body
// lengths are reported in mm.

export const TRAITS = ['size', 'move', 'seg', 'legs', 'swim', 'eye', 'armour', 'spines', 'jaws', 'burrow', 'carn', 'filter'];
export const NT = TRAITS.length;
export const T = Object.fromEntries(TRAITS.map((k, i) => [k, i]));

// The features that need a body region of their own, and so a Hox gene.
export const FEATURES = [T.seg, T.legs, T.swim, T.eye, T.armour, T.spines, T.jaws, T.burrow];

export const K = {
  t0: 560, // million years ago at the start
  t1: 500, // and at the end
  dt: 0.1, // million years per step
  steps: 600,
  W: 240, // units of sea floor
  H: 70, // units of water drawn above it
  D: 6, // units of sediment below
  colW: 5, // units per patch of microbial mat
  unit: 50, // mm per unit of length
  lenScale: 5, // body length in mm = lenScale × 10^size
  cols: 48,
  N: 3000, // animals at most
  hoxMax: 10,
  maxSize: 2.4, // size trait at most: 5 × 10^2.4 mm, 1.3 m
  // dates the page and the checks use, million years ago
  cambrian: 538.8, // first Treptichnus pedum burrows, the base of the Cambrian
  cloudina: 550, // first skeletons and the first bore holes
  chengjiang: 518,
  emu: 513, // Emu Bay Shale: Anomalocaris eyes with 16,000 lenses
  burgess: 508,
};

export const stepAt = (ma) => Math.round((K.t0 - ma) / K.dt);
export const maAt = (step) => K.t0 - step * K.dt;

// Mutation sizes per offspring: the chance a trait changes, and by how much.
export const MUT = { p: 0.22, sd: 0.05, sdSize: 0.06, big: 0.015, hoxGain: 0.01, hoxLoss: 0.004 };

export const DEFAULTS = {
  oxygen: 1, // how far oxygen rises: 0 keeps the Ediacaran level, 1 the default rise
  minerals: 1, // how cheap a mineral skeleton becomes after the calcium rise
  eyeCost: 1, // what eyes and the brain behind them cost
  mutation: 1,
  mats: 1, // how fast microbial mats grow
  plankton: 1, // food in the water
  predators: true, // can animals eat animals?
  eyes: true, // can animals evolve eyes?
  burrowing: true,
  armour: true, // can animals make mineral skeletons?
  eyesEarly: false, // start with eye spots: Parker's light switch first
};

export const RANGES = {
  oxygen: { min: 0, max: 1.6, step: 0.1, label: 'Oxygen rise', unit: 'pct' },
  minerals: { min: 0.3, max: 2, step: 0.1, label: 'Ease of making skeletons', unit: 'x' },
  eyeCost: { min: 0.2, max: 3, step: 0.1, label: 'Cost of eyes and brain', unit: 'x' },
  mutation: { min: 0.3, max: 3, step: 0.1, label: 'Mutation rate', unit: 'x' },
  mats: { min: 0.3, max: 2, step: 0.1, label: 'Mat growth', unit: 'x' },
  plankton: { min: 0.3, max: 2, step: 0.1, label: 'Plankton', unit: 'x' },
};

export const TOGGLES = ['predators', 'eyes', 'burrowing', 'armour'];

export const SCENARIOS = {
  real: { label: 'The Cambrian', blurb: 'Oxygen and calcium rise as they did; anything can evolve.', params: {} },
  noPredators: { label: 'No predators', blurb: 'Nobody may eat another animal: a world without an arms race.', params: { predators: false } },
  lowOxygen: { label: 'Low oxygen', blurb: 'Oxygen stays at the Ediacaran level, about an eighth of today’s.', params: { oxygen: 0 } },
  lightSwitch: {
    label: 'Eyes first',
    blurb: 'Parker’s light switch: animals start with eye spots and eyes are cheap.',
    params: { eyesEarly: true, eyeCost: 0.3 },
  },
  blind: { label: 'A blind world', blurb: 'No animal can evolve eyes.', params: { eyes: false } },
  noBurrows: { label: 'No burrowing', blurb: 'Nothing can dig, so the mats are never broken up.', params: { burrowing: false } },
};

// piecewise-linear curve through [Ma, value] points (Ma decreasing)
function curve(points, ma) {
  if (ma >= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [a, va] = points[i - 1];
    const [b, vb] = points[i];
    if (ma >= b) return va + ((a - ma) / (a - b)) * (vb - va);
  }
  return points[points.length - 1][1];
}

// Oxygen in the shallow sea, as a share of today's level. Estimates are
// rough: low in the Ediacaran, rising through the early Cambrian.
const O2_RISE = [
  [560, 0],
  [549, 0.05],
  [540, 0.17],
  [530, 0.3],
  [518, 0.38],
  [500, 0.4],
];
export const oxygen = (ma, p) => 0.12 + p.oxygen * curve(O2_RISE, ma);

// What a mineral skeleton costs, relative to after the calcium rise.
const MIN_COST = [
  [560, 2],
  [552, 1.3],
  [542, 1],
];
export const mineralCost = (ma, p) => curve(MIN_COST, ma) / p.minerals;

export function makeParams(scenario = 'real', patch = {}) {
  const sc = SCENARIOS[scenario] ?? SCENARIOS.real;
  return { ...DEFAULTS, ...sc.params, ...patch };
}
