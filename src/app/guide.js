// Everything the page says to the reader: the Learn chapters, the glossary,
// what each number means, the narrator line and the picture's legends.
//
// In chapter text, [word] links to the glossary entry `word` and
// [shown text|key] to entry `key`.

import * as fmt from './format.js';
import { GROUPS } from '../sim/groups.js';

// Show me: run the default history (or a scenario or seed) to a step at a
// speed (0 to 3), then show a view and flash a number.
export const CHAPTERS = [
  {
    id: 'garden',
    title: 'The Ediacaran garden',
    body: [
      'We start 560 million years ago, in the [Ediacaran]. Animals have been around for tens of millions of years, but they look nothing like the ones we know. Tall [fronds|frond] stand on the sea floor, soaking up food from the water. Soft, flat animals like Kimberella creep over a skin of microbes, the [microbial mat|mat], and graze it. A few small worms wriggle just under its surface.',
      'None of them has a shell, a leg, a jaw or an eye. Each animal in the model carries twelve numbers, its [traits|trait]: size, how it moves, segments, legs, swimming flaps, eyes, skeleton, spines, jaws, digging, hunting and filter feeding. Every body you see is drawn from those numbers.',
    ],
    predict: {
      q: 'Look at this sea floor. What is missing that you would find in almost any sea today?',
      options: [
        { text: 'Animals that eat other animals', right: true },
        { text: 'Animals that eat microbes' },
        { text: 'Animals that live fixed to the floor' },
      ],
      explain:
        'There are no [predators|predator] yet. Ediacaran animals fed on the mats, on dissolved food or on [plankton] in the water, and very few Ediacaran fossils show any sign of being bitten. In the model, any animal can evolve a taste for others: watch for the red flashes that mark a kill.',
    },
    show: { steps: [{ step: 14, speed: 1 }], view: 'sea', highlight: 'species' },
    look: 'Green-grey fronds stand on the floor, soft crawlers graze the olive mat and worms lie in the cut through the mud below. Drag the picture sideways to look along the 12 m of sea floor, and tap any animal to meet its species.',
  },
  {
    id: 'hunters',
    title: 'The first hunters',
    body: [
      'Some time before 550 million years ago, animals began to eat each other. The oldest evidence is small round holes drilled through the tubes of [Cloudina], one of the first animals with a hard skeleton.',
      'In the model a hunter catches what it can find and swallow. It finds prey within its range of senses, which eyes make much longer. It can swallow only prey that fits its mouth: jaws make the mouth bigger, spines make the prey harder to swallow. And a skeleton makes a catch fail more often.',
    ],
    predict: {
      q: 'Hunters appear in a world of soft animals. What is the cheapest way for small prey to stay alive?',
      options: [
        { text: 'Grow a shell' },
        { text: 'Dig into the mud, or stay too small to be worth finding', right: true },
        { text: 'Swim away fast' },
      ],
      explain:
        'Before about 542 million years ago, a mineral [skeleton] costs the model’s animals twice what it costs later, because sea water held less calcium. Swimming needs oxygen there is not yet enough of. Digging is the way out, and so is being tiny: a hunter often misses prey much smaller than itself. In the rocks, [burrows|burrow] grow more common and go deeper just at this time.',
    },
    show: { steps: [{ step: 60, speed: 1 }], view: 'sea', highlight: 'hunters' },
    look: 'Each red ring is an animal being eaten. The narrator and the list under the charts tell you when the first hunters appeared and how big the biggest one is.',
  },
  {
    id: 'mats',
    title: 'Digging up the mats',
    body: [
      'Burrowers do more than hide. As they dig for buried food, they churn the mud and break up the microbial mats that held the Ediacaran sea floor together. Geologists call this the [agronomic revolution], or the Cambrian substrate revolution: the first ploughing of the sea floor.',
      'The start of the Cambrian, 538.8 million years ago, is defined by a burrow: the first appearance of [Treptichnus] pedum, a branching tunnel dug by a worm-like animal.',
    ],
    predict: {
      q: 'Diggers spread through the mud. What happens to the microbial mats?',
      options: [
        { text: 'They grow thicker on the churned mud' },
        { text: 'They break up and cover less of the floor', right: true },
        { text: 'Nothing: the mats are on top, the diggers below' },
      ],
      explain:
        'A mat grows only on a quiet surface. Diggers stir it into the mud, and the grazers that lived on it and the fronds that stood in it lose their world. In the model the mats fall from covering about 90 % of the floor to about half, and the old Ediacaran fronds disappear soon after.',
    },
    show: { steps: [{ step: 250, speed: 2 }], view: 'sea', highlight: 'mat' },
    look: 'The olive skin on the floor is the mat. In the cut below, smooth layers of mud are broken up where diggers work. Compare a stretch with many worms in the mud to one with few.',
  },
  {
    id: 'armour',
    title: 'Armour',
    body: [
      'Shells, plates and spines appear at the start of the Cambrian as the [small shelly fossils|ssf]: tubes, cones and scales a few millimetres long, from 538 million years ago on. Within 20 million years most of the big groups of animals with skeletons had appeared.',
      'A skeleton is costly to build and heavy to carry. It makes slow animals slower. It only pays when there are enough hunters around, and it gets cheaper when sea water holds more calcium, as it did in the early Cambrian.',
    ],
    predict: {
      q: 'In this run, hunters were common for 25 million years before skeletons spread. Why the wait?',
      options: [
        { text: 'Skeletons cost too much until sea water changed and hunters grew common enough', right: true },
        { text: 'Skeletons need eyes first' },
        { text: 'The hunters were too small to matter' },
      ],
      explain:
        'Both parts matter in the model. The cost of a mineral skeleton halves between 560 and 542 million years ago, and armour only pays when the chance of meeting a hunter is high. In this run skeletons spread around 532 million years ago. Real ones show up first in Cloudina at 550 million years ago and spread with the small shelly fossils from 538.',
    },
    show: { steps: [{ step: 320, speed: 2 }], view: 'sea', highlight: 'armour' },
    look: 'Golden domes are shelled crawlers, like the first molluscs; spiky orange ones are like Wiwaxia and Halkieria. The share of animals with a skeleton is under the picture.',
  },
  {
    id: 'eyes',
    title: 'Eyes',
    body: [
      'An eye cup, a patch of light-sensitive cells in a pit, tells an animal where light and shadow come from. Add a [lens], and it sees shapes: a hunter can now spot prey from a distance, and prey can see a hunter coming. The oldest known [compound eyes|compound eye], on early trilobites, are about 530 to 520 million years old.',
      'Andrew Parker’s [light switch] idea says the first good eyes started the whole arms race: once animals could see, soft and slow became dangerous, and armour, speed and spines followed.',
    ],
    predict: {
      q: 'If eyes really came first and caused the rest, what should the fossils show?',
      options: [
        { text: 'Eyes first, then skeletons', right: true },
        { text: 'Skeletons first, then eyes' },
        { text: 'Both at exactly the same time' },
      ],
      explain:
        'Eyes first. But the record shows skeletons first: Cloudina at 550 million years ago, the small shelly fossils from 538, and the first eyes some ten million years later. In this run too, skeletons spread around 532 million years ago and lenses about ten million years later. The Lab’s Eyes first setting starts the animals with eye spots and cheap eyes: then the order flips, as Parker’s idea predicts.',
    },
    show: { steps: [{ step: 400, speed: 2 }], view: 'sea', highlight: 'eyes' },
    look: 'Animals with good eyes have a big dark eye on a stalk. Watch the eyes readout climb while the skeleton readout is already high.',
  },
  {
    id: 'arms',
    title: 'The arms race and the arthropods',
    body: [
      'Now every advance on one side pays the other side to answer it. Jaws beat thin shells; thicker shells beat jaws; eyes find prey that hides; digging hides from eyes. Biologists call this [escalation], or an evolutionary [arms race].',
      'One body plan did especially well: the [arthropods|arthropod], with a jointed skeleton over a body of repeated segments, legs on the segments and, soon, compound eyes. Armour that still lets you walk.',
      'Each new body part needs a region of the body to grow in, and regions are set up by [Hox genes|hox]. In the model, an animal with more kinds of parts than Hox genes pays for it, and new Hox genes come rarely. This is the model’s nod to [evo-devo|evodevo].',
    ],
    predict: {
      q: 'Which kind of animal do you expect to have the most species by the time of the Burgess Shale?',
      options: [
        { text: 'Soft crawlers' },
        { text: 'Arthropods', right: true },
        { text: 'Fronds' },
      ],
      explain:
        'Arthropods. They are the biggest group in both the Chengjiang and the Burgess Shale faunas, about a third of the species, and they still are today. In this run they become the richest group too. Body plans in the model are not chosen in advance: a species counts as an arthropod when its average animal has legs and segments.',
    },
    show: { steps: [{ step: 450, speed: 2 }], view: 'plans', highlight: 'disparity' },
    look: 'Each spindle shows how many species of one body plan are alive, through time. The Ediacaran groups at the top thin out, and the Cambrian ones below swell after 538 million years ago.',
  },
  {
    id: 'burgess',
    title: 'Chengjiang and the Burgess Shale',
    body: [
      'Most of what we know about Cambrian animals comes from a few places where soft bodies were preserved: [Chengjiang] in China, 518 million years old, and the [Burgess Shale] in Canada, 508 million years old. There we find Anomalocaris, a [radiodont] up to about 40 cm long, five-eyed Opabinia, spiky Hallucigenia, and dozens of arthropods like Marrella.',
      'Many of them looked so strange that their discoverers could not place them in any living group.',
    ],
    predict: {
      q: 'Most Burgess Shale animals had no hard parts. Why do we have their fossils at all?',
      options: [
        { text: 'They were buried fast in fine mud with little oxygen, so they did not rot', right: true },
        { text: 'They were frozen in ice' },
        { text: 'They had skeletons we cannot see' },
      ],
      explain:
        'Underwater mudslides buried them alive, in mud so fine and so short of oxygen that they did not rot or get dug up. Their bodies were pressed into thin films that keep even legs, guts and gills. Without such places, the Cambrian would look like a world of shells.',
    },
    show: { steps: [{ step: 520, speed: 2 }], view: 'fossils', highlight: 'bigPred' },
    look: 'The slab shows the commonest species alive now, flattened into fossils. Tap one to see the animal it was.',
  },
  {
    id: 'oxygen',
    title: 'Was it the oxygen?',
    body: [
      'Oxygen in the sea rose through the late Ediacaran and early Cambrian, though how much and when is still debated. Active bodies need it: swimming, digging, hunting and running big eyes and brains all burn oxygen fast.',
      'In the model, oxygen rises from about an eighth of today’s level to about half. An animal whose body needs more oxygen than the water can give pays heavily for it.',
    ],
    predict: {
      q: 'Keep oxygen at Ediacaran levels and run history again. What happens?',
      options: [
        { text: 'The explosion happens on time anyway' },
        { text: 'It is held back: less varied bodies, and the mats survive', right: true },
        { text: 'Every animal dies' },
      ],
      explain:
        'Without more oxygen, diggers and hunters stay few and small, so the mats survive and the arms race never gets going properly. Oxygen does not make the explosion happen by itself, but too little of it holds it back. Sperling and colleagues have argued just this: that low oxygen kept early animals from becoming active predators.',
    },
    show: { scenario: 'lowOxygen', steps: [{ step: 350, speed: 2 }], view: 'plans', highlight: 'mat' },
    look: 'This is the low-oxygen world at 525 million years ago. Compare it with the default run: hunters and diggers are rare, the mats still cover most of the floor, and the old fronds are still standing. Look at the Hunters, Diggers and Mats numbers.',
  },
  {
    id: 'tape',
    title: 'Replaying the tape',
    body: [
      'In Wonderful Life (1989), Stephen Jay Gould asked what would happen if we could rewind the tape of life to the Cambrian and play it again. He thought the result would be completely different: which groups survived was largely luck, or [contingency].',
      'Simon Conway Morris answered that the same solutions keep evolving anyway: eyes, armour, jaws and legs have each evolved many times ([convergence]). The model lets you try. Every run starts from the same world; only the roll of the dice, the [seed], changes.',
    ],
    predict: {
      q: 'Run the same world again with a different seed. What do you expect?',
      options: [
        { text: 'Exactly the same animals, at the same times' },
        { text: 'The same kinds of answer, but with different winners and dates', right: true },
        { text: 'No explosion at all' },
      ],
      explain:
        'Both Gould and Conway Morris are partly right in the model. Hunters, diggers, skeletons and eyes come back in every run, and hunters always come before skeletons. But the dates shift by millions of years, sharp eyes beat skeletons in about half the runs, and the winning body plan changes: across 20 other seeds, arthropods are the richest group at Burgess Shale time in 10. The Validation tab gives the numbers.',
    },
    show: { seed: 'hallucigenia', steps: [{ step: 520, speed: 3 }], view: 'plans', highlight: 'species' },
    look: 'This is the seed called hallucigenia, at Burgess Shale time. Hunters, diggers, skeletons and eyes all came back, but this time the lobopods, Hallucigenia’s group, out-number the arthropods. In the Lab you can try any seed you like.',
  },
  {
    id: 'sure',
    title: 'How sure are we?',
    body: [
      'The order of events in the model matches the fossil record well: hunters, then digging, then skeletons, then eyes, then the arthropods and big predators. Why it happened is still argued over. Oxygen, sea-water chemistry, the arms race, new genes and the end of the mats each have their champions, and most researchers think several acted together.',
      'The model is a toy. Three thousand animals on a 12 m strip stand for whole oceans; twelve traits stand for whole bodies; and many of its numbers were tuned so the run looks like the record. [Molecular clocks|clock] also suggest that animal groups split from each other long before they show up as fossils, which a model that starts at 560 million years ago cannot show. The Validation tab sets the results beside the fossils and says which numbers were tuned.',
    ],
    show: { tab: 'check' },
  },
];

export const GLOSSARY = {
  ediacaran: ['Ediacaran', 'The last period before the Cambrian, from 635 to 538.8 million years ago. Its seas held the first large animals, mostly soft and many unlike anything alive today.'],
  cambrian: ['Cambrian', 'The period from 538.8 to about 485 million years ago, when most of the big groups of animals first appear as fossils.'],
  frond: ['Frond', 'A leaf-shaped Ediacaran animal, like Charnia or Rangea, built from branches that branch again in the same pattern. It stood on the floor on a disc and took in food from the water.'],
  mat: ['Microbial mat', 'A thin, tough skin of microbes covering the sea floor. Before burrowers, mats covered most shallow sea floors and held the mud together.'],
  trait: ['Trait', 'Here: one of the twelve numbers each animal in the model carries, from 0 to 1 except size. Offspring inherit them, with small random changes.'],
  predator: ['Predator', 'An animal that hunts and eats other animals. The model calls them hunters.'],
  plankton: ['Plankton', 'Tiny living things drifting in the water. Filter feeders like fronds and tube builders strain them out.'],
  cloudina: ['Cloudina', 'A small animal of about 550 million years ago that built a tube of stacked mineral funnels, one of the first skeletons. Some tubes have bore holes drilled by a predator.'],
  skeleton: ['Skeleton', 'Here: any hard mineral part, like a shell, plates or scales, made of calcium carbonate or calcium phosphate.'],
  burrow: ['Burrow', 'A tunnel dug into the sediment. Burrows can fossilize as trace fossils even when the animal that dug them does not.'],
  'agronomic revolution': ['Agronomic revolution', 'Seilacher’s name for the change around the start of the Cambrian when burrowing animals began to churn up the sea floor, breaking the microbial mats.'],
  treptichnus: ['Treptichnus pedum', 'A branching burrow trace fossil. Its first appearance, 538.8 million years ago, marks the start of the Cambrian.'],
  ssf: ['Small shelly fossils', 'Tiny tubes, cones, plates and spines, mostly a few mm long, found in rocks from the start of the Cambrian. Many are pieces of the armour of larger animals.'],
  lens: ['Lens', 'A clear part of an eye that focuses light, so that the eye sees an image and not just light and shade.'],
  'compound eye': ['Compound eye', 'An eye made of many small units, each with its own lens, as in insects and crabs. Trilobites had them, and Anomalocaris had more than 16,000 lenses in each eye.'],
  'light switch': ['Light switch hypothesis', 'Andrew Parker’s idea (2003) that the first eyes able to form images set off the Cambrian explosion.'],
  escalation: ['Escalation', 'Geerat Vermeij’s name for the long trend of predators getting better at attacking and prey better at defence.'],
  'arms race': ['Arms race', 'A back-and-forth in which each side evolves in answer to the other: better weapons, better armour, and so on.'],
  arthropod: ['Arthropod', 'An animal with a jointed outer skeleton over a segmented body with jointed legs: trilobites, crabs, insects, spiders and their kin.'],
  trilobite: ['Trilobite', 'An arthropod with a three-lobed shield, compound eyes and many legs. Trilobites appear about 521 million years ago and lasted almost 300 million years.'],
  lobopod: ['Lobopod', 'A soft, worm-like animal with pairs of stubby legs, like Hallucigenia or Aysheaia. Lobopods are close to the ancestors of arthropods.'],
  radiodont: ['Radiodont', 'A swimming arthropod relative with two grasping arms in front of the mouth, like Anomalocaris. The biggest predators of the Cambrian.'],
  hox: ['Hox genes', 'Genes that tell each part of an animal’s body, along its length, what it is. More regions can carry more kinds of parts. Most animal groups had Hox genes before the Cambrian.'],
  evodevo: ['Evo-devo', 'Evolutionary developmental biology: the study of how changes in the way bodies grow, and in the genes that steer growth, produce new kinds of body.'],
  chengjiang: ['Chengjiang', 'A fossil site in Yunnan, China, 518 million years old, with thousands of soft-bodied fossils, including some of the first fish-like animals.'],
  'burgess shale': ['Burgess Shale', 'A fossil site in the Rocky Mountains of Canada, 508 million years old, found by Charles Walcott in 1909. Its soft-bodied fossils made the Cambrian explosion famous.'],
  disparity: ['Disparity', 'How different the body plans in a group are from each other, as against diversity, which counts species. In the model, the spread of the species’ average traits.'],
  'body plan': ['Body plan', 'The basic layout of an animal’s body: its symmetry, segments, limbs, skeleton and so on. The model sorts species into eleven body plans by their traits.'],
  contingency: ['Contingency', 'The idea that history depends on chance events, so that a replay could turn out differently.'],
  convergence: ['Convergence', 'The same solution evolving more than once, separately: eyes, for example, have evolved dozens of times.'],
  seed: ['Seed', 'The word that sets all the model’s dice rolls. The same seed and settings always give the same run.'],
  clock: ['Molecular clock', 'Dating when two groups split by how much their DNA differs. Clocks suggest animal groups diverged tens of millions of years before they appear as fossils.'],
  species: ['Species', 'Here: a lineage of animals. A new species begins when an animal has drifted far enough in its traits from the first member of its species.'],
  ma: ['Ma', 'Million years ago (mega-annum).'],
};

// Glossary links: [label] or [label|key]. An opening bracket before a link
// and punctuation after it stay on its line.
export function markup(text) {
  return fmt.esc(text).replace(/(\(?)\[([^\]|]+)(?:\|([^\]]+))?\]([)’.,;:!?]*)/g, (m, before, label, key, after) => {
    const k = key ?? label.toLowerCase();
    const link = `<button type="button" class="term" data-term="${k}">${label}</button>`;
    return before || after ? `<span class="nw">${before}${link}${after}</span>` : link;
  });
}

export function termKeys(text) {
  const keys = [];
  text.replace(/\[([^\]|]+)(?:\|([^\]]+))?\]/g, (m, label, key) => keys.push(key ?? label.toLowerCase()));
  return keys;
}

// ---- The readouts under the picture, and what each one means.

export const READOUTS = [
  { key: 'species', label: 'Species', unit: (h) => `${h.nGroups} body plans`, value: (h) => fmt.int(h.species) },
  { key: 'disparity', label: 'Disparity', unit: 'how different', value: (h) => fmt.num(h.disparity, 2) },
  { key: 'hunters', label: 'Hunters', unit: 'of animals', value: (h) => fmt.pct(h.carn) },
  { key: 'diggers', label: 'Diggers', unit: 'live in the mud', value: (h) => fmt.pct(h.burrow) },
  { key: 'armour', label: 'Skeletons', unit: 'of animals', value: (h) => fmt.pct(h.armour) },
  { key: 'eyes', label: 'Eyes', unit: (h) => `with lenses: ${fmt.pct(h.lens)}`, value: (h) => fmt.pct(h.eyes) },
  { key: 'bigPred', label: 'Biggest hunter', short: 'Top hunter', unit: 'Anomalocaris: 40 cm', value: (h) => (h.bigPred > 0 ? fmt.len(h.bigPred) : 'none') },
  { key: 'mat', label: 'Mats', unit: (h) => `oxygen: ${fmt.pct(h.o2)} of today`, value: (h) => fmt.pct(h.mat) },
];

const term = (key, text) => `<button type="button" class="term" data-term="${key}">${text}</button>`;

export function richest(h) {
  let g = 0;
  for (let i = 1; i < h.groups.length; i++) if (h.groups[i] > h.groups[g]) g = i;
  return GROUPS[g];
}

export function explain(key, h) {
  switch (key) {
    case 'species': {
      const top = richest(h);
      return {
        title: 'Species and body plans',
        value: `${fmt.int(h.species)} species in ${h.nGroups} body plans`,
        html: [
          `${fmt.int(h.n)} animals are alive in the model, in ${fmt.int(h.species)} ${term('species', 'species')}. The richest ${term('body plan', 'body plan')} is ${top.name.toLowerCase()} (like ${top.like}), with ${fmt.int(h.groups[GROUPS.indexOf(top)])} species.`,
          'A new species starts when an animal has drifted far enough in its traits from the first member of its own species. Each species is then sorted into a body plan by what its average animal has, the way a palaeontologist sorts fossils by their parts.',
          'The number of species stays within a few hundred: the 12 m of sea floor can feed only so many animals. What changes most is not how many species there are but how different they are: see disparity.',
        ],
        chart: 'species',
      };
    }
    case 'disparity':
      return {
        title: 'Disparity',
        value: fmt.num(h.disparity, 2),
        html: [
          `${term('disparity', 'Disparity')} measures how different the species’ bodies are, not how many species there are. Here it is the spread of the species’ average traits, added up over all twelve.`,
          'Palaeontologists measure it from fossil shapes. Briggs, Fortey and Wills found in 1992 that Cambrian arthropods were already about as varied in form as living ones: the explosion was above all an explosion of disparity.',
          'In the model disparity starts fairly high, because fronds and worms differ a lot, drops as the soft crawlers take over, and then climbs to more than four times its Ediacaran level as body plans multiply.',
        ],
        chart: 'disparity',
      };
    case 'hunters':
      return {
        title: 'Hunters',
        value: fmt.pct(h.carn),
        html: [
          `${fmt.pct(h.carn)} of animals are hunters: they move, and they get most of their food by eating other animals.`,
          'A hunter can catch prey it can sense and swallow. Eyes stretch its range, jaws widen its mouth and help break shells, and a bigger body helps on both counts. Every catch is a gamble: a skeleton, spines, digging and plain small size each make it fail more often.',
          'Hunters cannot become too common. When there are many, prey runs short and they get in each other’s way, so their numbers rise and fall with their prey.',
        ],
        chart: 'shares',
      };
    case 'diggers':
      return {
        title: 'Diggers',
        value: fmt.pct(h.burrow),
        html: [
          `${fmt.pct(h.burrow)} of animals live mostly in the mud. Digging hides an animal from hunters and reaches food buried in the sediment.`,
          `It costs a lot of energy and oxygen, and it churns up the ${term('mat', 'microbial mats')}. Real burrows got deeper and more complex across the start of the Cambrian: the ${term('agronomic revolution', 'agronomic revolution')}.`,
        ],
        chart: 'shares',
      };
    case 'armour':
      return {
        title: 'Skeletons',
        value: fmt.pct(h.armour),
        html: [
          `${fmt.pct(h.armour)} of animals have a mineral ${term('skeleton', 'skeleton')}: a shell, plates or a tube.`,
          'A skeleton makes many attacks fail, but it costs energy to build and carry, and it slows down an animal unless its body is segmented and jointed. In the model it costs twice as much before 552 million years ago as after 542, standing for the rise of calcium in sea water.',
          `Real skeletons first appear in ${term('cloudina', 'Cloudina')}, about 550 million years ago, and spread with the ${term('ssf', 'small shelly fossils')} from 538.`,
        ],
        chart: 'shares',
      };
    case 'eyes':
      return {
        title: 'Eyes',
        value: `${fmt.pct(h.eyes)}, with lenses ${fmt.pct(h.lens)}`,
        html: [
          `${fmt.pct(h.eyes)} of animals have eyes of some kind, and ${fmt.pct(h.lens)} have eyes good enough to see shapes, with a ${term('lens', 'lens')}.`,
          'In the model an eye stretches how far an animal can sense: a hunter finds more prey, and prey gets warning of hunters. It costs energy and some oxygen, for the eye and the brain behind it.',
          `The oldest known ${term('compound eye', 'compound eyes')} belong to trilobites about 530 to 520 million years old. By 513 million years ago Anomalocaris had eyes with more than 16,000 lenses each.`,
        ],
        chart: 'shares',
      };
    case 'bigPred':
      return {
        title: 'The biggest hunter',
        value: h.bigPred > 0 ? fmt.len(h.bigPred) : 'none yet',
        html: [
          h.bigPred > 0 ? `The longest hunter alive now is ${fmt.len(h.bigPred)} long. A typical animal is about ${fmt.len(h.meanL)}.` : 'No animal hunts yet.',
          `Most Cambrian animals were small, from a few millimetres to a few centimetres. The giants were ${term('radiodont', 'radiodonts')}: Anomalocaris canadensis of the Burgess Shale grew to about 40 cm.`,
          'In the model a bigger body sees further and swallows more, but needs more food, more oxygen and longer to grow up and breed.',
        ],
        chart: 'size',
      };
    case 'mat':
      return {
        title: 'Mats and oxygen',
        value: `mats ${fmt.pct(h.mat)}, oxygen ${fmt.pct(h.o2)} of today`,
        html: [
          `${term('mat', 'Microbial mats')} cover ${fmt.pct(h.mat)} of the sea floor. They regrow quickly where they are left alone, and are grazed and churned up by animals.`,
          `Oxygen in the water is ${fmt.pct(h.o2)} of today’s level. It rises through the run, from about an eighth to about half of today’s, following rough estimates for the shallow sea. Swimming, digging, hunting and eyes all need it.`,
        ],
        chart: 'world',
      };
    default:
      return null;
  }
}

// ---- The narrator: one or two sentences about what is happening now.

export function narrate(h) {
  const n = (key, text) => `<button type="button" class="num" data-explain="${key}">${text}</button>`;
  const top = richest(h);
  if (h.carn < 0.02)
    return `The ${h.ma > 538.8 ? 'Ediacaran' : 'Cambrian'} sea floor: fronds filter the water and soft animals graze the mats, which cover ${n('mat', fmt.pct(h.mat))} of the floor. Nobody eats anybody yet.`;
  if (h.armour < 0.03 && h.lens < 0.03)
    return `Hunters, ${n('hunters', fmt.pct(h.carn))} of the animals, roam a world without shells. Prey survive by being small or by digging: ${n('diggers', fmt.pct(h.burrow))} of animals live in the mud, and the mats are down to ${n('mat', fmt.pct(h.mat))}.`;
  if (h.lens < 0.03)
    return `Skeletons spread: ${n('armour', fmt.pct(h.armour))} of animals now carry shells or plates. Eyes are still rare (${n('eyes', fmt.pct(h.eyes))}), and the hunters mostly find prey by touch and smell.`;
  if (h.ma > 509)
    return `An arms race: ${n('armour', fmt.pct(h.armour))} of animals have skeletons and ${n('eyes', fmt.pct(h.eyes))} have eyes. ${n('species', fmt.int(h.species))} species in ${h.nGroups} body plans; the richest are ${top.name.toLowerCase()}.`;
  return `Burgess Shale time: ${n('species', fmt.int(h.species))} species in ${h.nGroups} body plans, ${top.name.toLowerCase()} the richest. The biggest hunter is ${n('bigPred', fmt.len(h.bigPred))} long.`;
}

// ---- The picture: three views.

export const VIEWS = [
  { key: 'sea', label: 'Sea floor' },
  { key: 'plans', label: 'Body plans' },
  { key: 'fossils', label: 'Fossils' },
];

export const PICTURE_HELP = {
  sea: [
    'A slice of the model’s sea floor, seen from the side, with the water above and a cut through the mud below. The whole strip is 12 m long; drag sideways to move along it, and use + and − to zoom.',
    'Every animal is drawn from its own traits: segments, legs, swimming flaps, eyes, shells, spines, grasping arms. Its colour shows its body plan, with each species a slightly different shade. Tap one to meet its species.',
    'Sizes are squeezed so that both 5 mm worms and 1 m fronds fit: an animal ten times longer is drawn about three times longer. When the window holds very many animals, a fixed sample of them is drawn.',
    'The olive skin on the floor is the microbial mat; dark specks and broken layers in the mud show where diggers have churned it. A red ring is an animal being eaten. The water grows clearer and bluer as oxygen rises.',
  ],
  plans: [
    'Each row is one body plan, and its spindle shows how many species of it were alive, from 560 million years ago on the left to now. The wider the spindle, the more species (the width grows with the square root, so small groups stay visible).',
    'This is the kind of diagram Stephen Jay Gould drew for the Burgess Shale. The drawing next to each name is the commonest species of that body plan alive now, or a typical one, faded, when it has none.',
    'Dashed lines mark the start of the Cambrian (538.8 million years ago), the Chengjiang fossils (518) and the Burgess Shale (508). The shaded part is the Ediacaran.',
  ],
  fossils: [
    'The commonest species alive now, drawn as fossils pressed flat in fine mud, like the soft-bodied fossils of Chengjiang. Each is named, in the style of Burgess Shale names, and the largest are drawn biggest.',
    'Tap a fossil to see the animal it was: its body plan, its size and its traits.',
  ],
};

export const ABOUT_MODEL = [
  'The model follows up to 3,000 animals on a 12 m strip of shallow sea floor, from 560 to 500 million years ago, in steps of 100,000 years. Each animal has twelve traits and a number of Hox genes. It eats by grazing mats, digging up buried food, filtering plankton or hunting; it pays for each trait in energy, and for an active body in oxygen; it breeds when it has stored enough energy, and its offspring inherit its traits with small random changes.',
  'Hunting is where the arms race comes from. A hunter finds prey it can sense, eyes make that range longer, and it can swallow only prey that fits its mouth. Skeletons, spines, digging and small size make attacks fail. Oxygen and the cost of making a skeleton change through the run, following rough estimates for the real oceans.',
  'It is a toy model. Real oceans held billions of animals; the model holds thousands. Twelve traits stand for whole bodies, species and body plans are sorted by simple rules, and many constants were tuned so that the default run looks like the fossil record. It shows how hunters, prey, mud and oxygen push on each other, not exactly what happened.',
];
