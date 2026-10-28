// The Validation checks on other seeds: how often each one matches.
//   node tools/spread.mjs 1 2 3 … 20
import { runValidation } from '../src/app/validation.js';
const seeds = process.argv.slice(2);
const tally = {};
for (const seed of seeds) {
  const r = await runValidation(null, { seed });
  const miss = r.checks.filter(c=>!c.pass).map(c=>c.id);
  for (const c of r.checks) tally[c.id] = (tally[c.id]||0) + (c.pass?1:0);
  const ar = r.checks.find(c=>c.id==='arthropods').model;
  console.log(seed.padEnd(14), r.passed+'/'+r.total, 'miss:', miss.join(','), '|', ar);
}
console.log(JSON.stringify(tally));
