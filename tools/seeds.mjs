// Summaries of several seeds, for tuning.  node tools/seeds.mjs [scenario] [n]
import { Engine } from '../src/sim/engine.js';
import { GROUPS } from '../src/sim/groups.js';
import { stepAt } from '../src/sim/params.js';
const sc = process.argv[2] || 'real';
const ns = +(process.argv[3] || 6);
const at = (e, ma) => e.history[stepAt(ma)];
for (let k = 0; k < ns; k++) {
  const seed = k === 0 ? 'burgess' : `s${k}`;
  const e = new Engine({ seed, scenario: sc });
  e.run(600);
  const minN = Math.min(...e.history.map((h) => h.n));
  const f = (ma, key, d = 2) => at(e, ma)[key].toFixed(d);
  const first = (key) => e.log.find((l) => l.text.startsWith(key))?.ma.toFixed(0) ?? '-';
  const g = at(e, 508).groups;
  const top = GROUPS.map((x, i) => [x.key.slice(0, 5), g[i]]).filter((x) => x[1]).sort((a, b) => b[1] - a[1]).map((x) => x.join(':')).join(' ');
  const ev = (k) => (e.log.find((l) => l.key === k)?.ma.toFixed(0) ?? '-');
  console.log(`   events: pred ${ev('pred')} burrow ${ev('burrow')} skel ${ev('skel')} eye ${ev('eye1')} lens ${ev('eye2')} tube ${ev('g-tube')} shell ${ev('g-shelled')} spiny ${ev('g-spiny')} lobo ${ev('g-lobopod')} arth ${ev('g-arthropod')} radio ${ev('g-radiodont')} swim ${ev('g-swimmer')} p1cm ${ev('pred1')} p10cm ${ev('pred10')} mats ${ev('mats')} fronds ${ev('frondsGone')}`);
  console.log(`${seed.padEnd(8)} minN ${String(minN).padStart(4)} N508 ${at(e,508).n} sp508 ${at(e,508).species} carn 540/525/508 ${f(540,'carn')}/${f(525,'carn')}/${f(508,'carn')} eye ${f(530,'eyes')}/${f(508,'eyes')} lens508 ${f(508,'lens')} arm ${f(540,'armour')}/${f(520,'armour')}/${f(508,'armour')} bur ${f(545,'burrow')}/${f(530,'burrow')} mat ${f(550,'mat')}/${f(530,'mat')}/${f(508,'mat')} bigP508 ${f(508,'bigPred',0)} disp ${f(545,'disparity')}/${f(530,'disparity')}/${f(508,'disparity')} | ${top}`);
}
