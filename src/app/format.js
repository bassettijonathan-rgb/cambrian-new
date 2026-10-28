// Numbers for people: thousands separators, a real minus sign, lengths in
// mm, cm or m, shares in per cent and dates in millions of years ago.

const minus = (s) => s.replace(/^-/, '−');

// Two significant figures by default.
export function num(x, sig = 2) {
  if (!Number.isFinite(x)) return '–';
  if (x === 0) return '0';
  const a = Math.abs(x);
  const p = Math.floor(Math.log10(a));
  const r = Number(x.toPrecision(sig));
  return minus(r.toLocaleString('en-US', { maximumFractionDigits: Math.max(0, sig - 1 - p) }));
}

// A whole number with thousands separators.
export const int = (x) => (Number.isFinite(x) ? minus(Math.round(x).toLocaleString('en-US')) : '–');

// A share: 0.123 → "12 %", with "under 1 %" for tiny ones.
export function pct(x) {
  if (!Number.isFinite(x)) return '–';
  if (x > 0 && x < 0.005) return 'under 1 %';
  return `${Math.round(x * 100)} %`;
}

// A body length given in mm.
export function len(mm) {
  if (!Number.isFinite(mm) || mm <= 0) return '–';
  if (mm < 10) return `${num(mm, 2)} mm`;
  if (mm < 1000) return `${num(mm / 10, mm < 100 ? 2 : 2)} cm`;
  return `${num(mm / 1000, 2)} m`;
}

// A date in millions of years ago.
export const ma = (x) => `${x.toFixed(1)} million years ago`;
export const maShort = (x) => `${Math.round(x)} Ma`;

export function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
