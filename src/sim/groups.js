// Body plans. A species is put in a group by what its average animal has:
// the rules below play the part of a palaeontologist sorting fossils.
// Each group names real animals that had that kind of body.

import { T } from './params.js';

export const GROUPS = [
  { key: 'frond', name: 'Fronds', one: 'frond', like: 'Charnia and Rangea', color: '#7fae6e' },
  { key: 'tube', name: 'Tube builders', one: 'tube builder', like: 'Cloudina', color: '#c9b48a' },
  { key: 'polyp', name: 'Polyps', one: 'polyp', like: 'Haootia and sea anemones', color: '#e88fb0' },
  { key: 'soft', name: 'Soft crawlers', one: 'soft crawler', like: 'Kimberella and Ikaria', color: '#d99a7a' },
  { key: 'burrower', name: 'Burrowing worms', one: 'burrowing worm', like: 'Ottoia, a priapulid', color: '#c77b9b' },
  { key: 'shelled', name: 'Shelled crawlers', one: 'shelled crawler', like: 'the first molluscs', color: '#e3c25a' },
  { key: 'spiny', name: 'Spiny slugs', one: 'spiny slug', like: 'Wiwaxia and Halkieria', color: '#e08a3c' },
  { key: 'lobopod', name: 'Lobopods', one: 'lobopod', like: 'Hallucigenia and Aysheaia', color: '#9a86d6' },
  { key: 'arthropod', name: 'Arthropods', one: 'arthropod', like: 'trilobites and Marrella', color: '#4fa3c7' },
  { key: 'swimmer', name: 'Swimmers', one: 'swimmer', like: 'Pikaia and Haikouichthys', color: '#5cc0a8' },
  { key: 'radiodont', name: 'Radiodonts', one: 'radiodont', like: 'Anomalocaris', color: '#e2574c' },
];
export const G = Object.fromEntries(GROUPS.map((g, i) => [g.key, i]));

// t: a trait vector (or anything indexable by T)
export function classify(t, o = 0) {
  const v = (k) => t[o + T[k]];
  if (v('move') < 0.2) return v('carn') > 0.5 ? G.polyp : v('armour') > 0.4 ? G.tube : G.frond;
  if (v('swim') > 0.5) return v('jaws') > 0.45 && v('carn') > 0.5 ? G.radiodont : G.swimmer;
  if (v('legs') > 0.4) return v('seg') > 0.4 ? G.arthropod : G.lobopod;
  if (v('burrow') > 0.5) return G.burrower;
  if (v('armour') > 0.4 || v('spines') > 0.4) return v('spines') >= v('armour') ? G.spiny : G.shelled;
  return G.soft;
}

// A made-up genus name for each species, in the style of the Burgess Shale.
const HEAD = ['Ano', 'Hallu', 'Opa', 'Wiwa', 'Mar', 'Ayshe', 'Odar', 'Lean', 'Sid', 'Yoho', 'Ama', 'Hai', 'Kerry', 'Fuxi', 'Chengji', 'Naro', 'Burge', 'Waptia', 'Sanc', 'Ottoi', 'Selki', 'Lagga', 'Helme', 'Nekto', 'Kunmi', 'Myllo', 'Tamis', 'Stan', 'Spriggi', 'Parva', 'Kimbe', 'Ika', 'Cloudi', 'Namala', 'Rangi', 'Charni', 'Dickin', 'Tribra', 'Olen', 'Redli'];
const MID = ['', '', 'ca', 'lo', 'ra', 'ge', 'ni', 'pha', 'to', 'mi', 'si', 'ru'];
const TAIL = ['caris', 'genia', 'bina', 'xia', 'rella', 'ia', 'aspis', 'choia', 'nella', 'ella', 'oides', 'lus', 'chia', 'pod', 'cystis', 'nema', 'ops', 'ura'];

export function genusName(id, seed = 0) {
  let h = (Math.imul(id + 1, 2654435761) ^ seed) >>> 0;
  const pick = (arr) => {
    h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
    h = (h ^ (h >>> 13)) >>> 0;
    return arr[h % arr.length];
  };
  let name = pick(HEAD) + pick(MID) + pick(TAIL);
  name = name.replace(/([aeiou])\1+/g, '$1').replace(/([aeiou])([aeiou])([aeiou])/g, '$1$3');
  return name[0].toUpperCase() + name.slice(1).toLowerCase();
}
