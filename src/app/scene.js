// The picture, in three views. Sea floor: a stretch of the sea floor seen
// from the side, with the water above and a cut through the mud below, and
// every animal in it drawn from its traits. Body plans: how many species
// each kind of body has had through time, as spindles. Fossils: the species
// alive now, flattened on a slab of mudstone like the Chengjiang fossils.

import { drawAnimal } from './creature.js';
import { GROUPS, G, genusName } from '../sim/groups.js';

const NT = 12;
const T_OFF = 6; // where the traits start in a frame's record of an animal
const LN = 5; // body length in mm is LN × 10^size
const WATER = 45; // units of water drawn above the floor

// A typical animal of each group, for the spindles when the group has none alive.
const TEMPLATES = {
  frond: [1.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.9],
  tube: [1, 0, 0.2, 0, 0, 0, 0.8, 0, 0, 0, 0, 0.9],
  polyp: [0.8, 0, 0, 0, 0, 0, 0, 0, 0.3, 0, 0.8, 0],
  soft: [0.9, 0.5, 0.1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  burrower: [0.8, 0.5, 0.5, 0, 0, 0.1, 0, 0.2, 0.5, 0.8, 0.6, 0],
  shelled: [0.8, 0.4, 0.1, 0, 0, 0.2, 0.8, 0.1, 0, 0, 0, 0],
  spiny: [0.8, 0.4, 0.3, 0, 0, 0.2, 0.5, 0.8, 0, 0, 0, 0],
  lobopod: [0.9, 0.6, 0.3, 0.8, 0, 0.2, 0, 0.6, 0, 0, 0, 0.3],
  arthropod: [0.8, 0.7, 0.8, 0.9, 0.1, 0.8, 0.7, 0.1, 0.2, 0, 0.2, 0],
  swimmer: [0.8, 0.8, 0.6, 0, 0.9, 0.5, 0, 0, 0, 0, 0, 0.2],
  radiodont: [1.6, 0.9, 0.7, 0, 0.9, 0.9, 0.2, 0, 0.9, 0, 0.95, 0],
};
export const templateOf = (g) => TEMPLATES[GROUPS[g].key];

// a small deterministic hash in [0, 1)
export function hash(a, b = 0) {
  let h = (Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35)) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}

// a #rrggbb colour made lighter (k > 0) or darker (k < 0), as #rrggbb
export function tint(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k)));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// each species a slightly different shade of its group's colour
const spColors = new Map();
export function speciesColor(sp, group) {
  const key = sp * 16 + group;
  let c = spColors.get(key);
  if (!c) {
    c = tint(GROUPS[group].color, (hash(sp, 11) - 0.5) * 0.36);
    if (spColors.size > 4000) spColors.clear();
    spColors.set(key, c);
  }
  return c;
}

// Body length on screen. Real lengths run from 5 mm to over a metre, so
// they are squeezed: ten times longer is drawn about 2.8 times longer.
export const lenPx = (mm, k) => k * Math.pow(Math.max(mm, 1) / LN, 0.45);
export const lengthOf = (size) => LN * Math.pow(10, size);

export class Scene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.view = 'sea';
    this.geometry = null;
    this.frame = null;
    this.h = null;
    this.points = [];
    this.animals = new Map(); // id → where it is drawn
    this.flashes = [];
    this.hits = []; // what was drawn where, for taps
    this.W = 1;
    this.H = 1;
    this.cx = 120; // the middle of the sea-floor window, in units
    this.zoom = 1.6;
    this.lastFrameAt = 0;
    this.frameGap = 300;
    this.reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.sprites = new Map();
    this.snow = Array.from({ length: 60 }, (_, i) => [hash(i, 1), hash(i, 2), 0.4 + hash(i, 3)]);
  }

  setGeometry(g) {
    this.geometry = g;
    this.sprites.clear();
    this.animals.clear();
    this.flashes = [];
    this.frame = null;
    this.points = [];
  }

  setView(v) {
    this.view = v;
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = Math.max(1, r.width);
    this.H = Math.max(1, r.height);
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.sprites.clear();
  }

  // ------------------------------------------------------------ new data

  setFrame(frame, h, points) {
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    const fresh = !this.frame || frame.step !== this.frame.step;
    if (fresh && this.lastFrameAt) this.frameGap = Math.min(600, Math.max(60, now - this.lastFrameAt));
    if (fresh) this.lastFrameAt = now;
    this.frame = frame;
    this.h = h;
    this.points = points;
    if (!fresh) return;
    const W = this.geometry?.W ?? 240;
    const { agents, F, n } = frame;
    const seen = new Set();
    for (let i = 0; i < n; i++) {
      const k = i * F;
      const id = agents[k];
      seen.add(id);
      const x = agents[k + 1];
      const y = agents[k + 2];
      let a = this.animals.get(id);
      if (!a) {
        a = { id, x0: x, y0: y, x1: x, y1: y, t0: now, dir: hash(id, 4) < 0.5 ? -1 : 1, seen: 0 };
        this.animals.set(id, a);
      } else {
        const p = this.posOf(a, now);
        let dx = x - p[0];
        if (dx > W / 2) dx -= W;
        if (dx < -W / 2) dx += W;
        a.x0 = x - dx;
        a.y0 = p[1];
        a.x1 = x;
        a.y1 = y;
        a.t0 = now;
        if (Math.abs(dx) > 0.05) a.dir = dx > 0 ? 1 : -1;
      }
      a.i = i;
    }
    for (const [id, a] of this.animals) if (!seen.has(id)) this.animals.delete(id);
    for (const kl of frame.kills) this.flashes.push({ x: kl[2], y: kl[3], t: now, id: kl[1] });
    if (this.flashes.length > 120) this.flashes.splice(0, this.flashes.length - 120);
  }

  posOf(a, now) {
    const t = this.reduced ? 1 : Math.min(1, (now - a.t0) / (this.frameGap * 0.9));
    const e = t * t * (3 - 2 * t);
    return [a.x0 + (a.x1 - a.x0) * e, a.y0 + (a.y1 - a.y0) * e];
  }

  // ------------------------------------------------------------ the window

  get ppu() {
    return (this.W < 600 ? 7 : 8) * this.zoom;
  }

  get span() {
    return Math.min(this.geometry?.W ?? 240, this.W / this.ppu);
  }

  pan(dxPx) {
    const W = this.geometry?.W ?? 240;
    this.cx = (((this.cx - dxPx / this.ppu) % W) + W) % W;
  }

  zoomBy(f) {
    this.zoom = Math.min(4, Math.max(1, this.zoom * f));
    return this.zoom;
  }

  // ------------------------------------------------------------ drawing

  draw(now) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);
    this.hits = [];
    if (this.view === 'plans') this.drawPlans();
    else if (this.view === 'fossils') this.drawSlab(now);
    else this.drawSea(now);
  }

  layout() {
    const H = this.H;
    const floor = Math.round(H * 0.8); // the front edge of the sea floor
    const band = Math.round(H * 0.26); // how deep the floor looks
    return { floor, back: floor - band, band, mudTop: floor, mudBottom: H };
  }

  drawSea(now) {
    const ctx = this.ctx;
    const { W, H } = this;
    const L = this.layout();
    const geo = this.geometry ?? { W: 240, cols: 48, colW: 5, D: 6 };
    const span = this.span;
    const x0 = this.cx - span / 2;
    const sx = (x) => {
      let d = x - x0;
      d = ((d % geo.W) + geo.W) % geo.W;
      return d * this.ppu;
    };
    const t = this.reduced ? 0 : now / 1000;
    const o2 = this.h ? this.h.o2 : 0.12;

    // water: clearer and bluer as oxygen rises
    const g = ctx.createLinearGradient(0, 0, 0, L.back);
    const clear = Math.min(1, (o2 - 0.12) / 0.4);
    g.addColorStop(0, mixHex('#2f6b6a', '#2b7f9e', clear));
    g.addColorStop(1, mixHex('#123634', '#0f3a4d', clear));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, L.back + 1);
    // shafts of light from above
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 4; k++) {
      const u = (hash(k, 21) * W + t * 6 * (k % 2 ? 1 : -1)) % (W + 120);
      const gr = ctx.createLinearGradient(0, 0, 0, L.back);
      gr.addColorStop(0, 'rgba(190,240,230,0.10)');
      gr.addColorStop(1, 'rgba(190,240,230,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(u - 40, 0);
      ctx.lineTo(u + 10, 0);
      ctx.lineTo(u + 70, L.back);
      ctx.lineTo(u - 10, L.back);
      ctx.fill();
    }
    ctx.restore();
    // plankton and marine snow
    ctx.fillStyle = 'rgba(220,240,230,0.35)';
    for (const [a, b, s] of this.snow) {
      const xx = (a * W + t * 4 * s) % W;
      const yy = (b * L.back + t * 3 * s) % L.back;
      ctx.fillRect(xx, yy, s * 1.6, s * 1.6);
    }

    // the floor, seen from above at a slant, with its microbial mats
    const mat = this.frame?.mat;
    const turb = this.frame?.turb;
    const fg = ctx.createLinearGradient(0, L.back, 0, L.floor);
    fg.addColorStop(0, '#6d6550');
    fg.addColorStop(1, '#8a7c5c');
    ctx.fillStyle = fg;
    ctx.fillRect(0, L.back, W, L.floor - L.back);
    const colW = geo.colW * this.ppu;
    for (let c = 0; c < geo.cols; c++) {
      const m = mat ? mat[c] : 0.85;
      let X = sx(c * geo.colW);
      if (X > W) continue;
      // a mat: a smooth green-olive skin, wrinkled where it is thick
      ctx.fillStyle = `rgba(92,128,64,${(0.15 + 0.75 * m).toFixed(3)})`;
      ctx.fillRect(X, L.back, colW + 0.5, L.floor - L.back);
      if (m > 0.4) {
        ctx.strokeStyle = `rgba(48,74,36,${(0.5 * m).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let k = 0; k < 4; k++) {
          const yy = L.back + ((k + 0.5) / 4) * (L.floor - L.back);
          ctx.moveTo(X, yy);
          for (let q = 1; q <= 6; q++) ctx.lineTo(X + (q / 6) * colW, yy + Math.sin(c * 3 + q * 2.1 + k) * 1.4);
        }
        ctx.stroke();
      }
      // churned mud where burrowers work
      const tb = turb ? Math.min(1, turb[c] * 1.2) : 0;
      if (tb > 0.05) {
        ctx.fillStyle = 'rgba(60,46,32,0.55)';
        const nb = Math.round(tb * 9);
        for (let k = 0; k < nb; k++) {
          const u = hash(c * 31 + k, 5);
          const v = hash(c * 31 + k, 6);
          ctx.beginPath();
          ctx.ellipse(X + u * colW, L.back + 2 + v * (L.floor - L.back - 4), 1.6, 1, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // the cut through the mud: layers, smooth under mats, churned under burrowers
    const mg = ctx.createLinearGradient(0, L.mudTop, 0, L.mudBottom);
    mg.addColorStop(0, '#5a4936');
    mg.addColorStop(1, '#2f251b');
    ctx.fillStyle = mg;
    ctx.fillRect(0, L.mudTop, W, L.mudBottom - L.mudTop);
    const layers = 6;
    ctx.lineWidth = 1;
    for (let k = 0; k < layers; k++) {
      const base = L.mudTop + 5 + (k / layers) * (L.mudBottom - L.mudTop - 6);
      ctx.strokeStyle = k % 2 ? 'rgba(160,140,108,0.22)' : 'rgba(20,14,8,0.25)';
      ctx.beginPath();
      for (let X = 0; X <= W; X += 4) {
        const wx = x0 + X / this.ppu;
        const c = Math.min(geo.cols - 1, Math.floor((((wx % geo.W) + geo.W) % geo.W) / geo.colW));
        const tb = turb ? Math.min(1, turb[c] * 1.5) : 0;
        const y = base + tb * 5 * Math.sin(X * 0.21 + k * 1.7 + hash(c, k) * 6);
        if (X === 0) ctx.moveTo(X, y);
        else ctx.lineTo(X, y);
      }
      ctx.stroke();
    }
    // burrows: tubes and U-shapes, as many as the digging there
    ctx.strokeStyle = 'rgba(190,168,128,0.22)';
    ctx.lineWidth = 1.2;
    for (let c = 0; c < geo.cols; c++) {
      const tb = turb ? Math.min(1, turb[c] * 1.2) : 0;
      const nb = Math.round(tb * 2.4);
      if (!nb) continue;
      const X = sx(c * geo.colW);
      if (X > W) continue;
      for (let k = 0; k < nb; k++) {
        const u = X + hash(c, 40 + k) * colW;
        const d = (0.25 + 0.5 * hash(c, 50 + k)) * (L.mudBottom - L.mudTop - 6);
        const w = 5 + hash(c, 60 + k) * 10;
        ctx.beginPath();
        ctx.moveTo(u, L.mudTop);
        ctx.quadraticCurveTo(u - 2, L.mudTop + d, u + w / 2, L.mudTop + d);
        ctx.quadraticCurveTo(u + w + 2, L.mudTop + d, u + w, L.mudTop);
        ctx.stroke();
      }
    }
    // the mat's edge, seen in the cut
    if (mat) {
      for (let c = 0; c < geo.cols; c++) {
        const X = sx(c * geo.colW);
        if (X > W) continue;
        ctx.fillStyle = `rgba(110,150,74,${(0.2 + 0.8 * mat[c]).toFixed(3)})`;
        ctx.fillRect(X, L.mudTop - 1, colW + 0.5, 1 + 3 * mat[c]);
      }
    }

    if (!this.frame) return;
    this.drawAnimals(now, L, sx, span);

    // kills: a brief flash where an animal was eaten
    const keep = [];
    for (const f of this.flashes) {
      const age = (now - f.t) / 700;
      if (age >= 1) continue;
      keep.push(f);
      const X = sx(f.x);
      if (X > W + 10) continue;
      const Y = f.y < -0.2 ? L.mudTop + 8 : f.y > 0.5 ? this.waterY(f.y, L) : L.floor - 0.5 * L.band;
      ctx.strokeStyle = `rgba(255,96,72,${(0.85 * (1 - age)).toFixed(3)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(X, Y, 3 + age * 9, 0, Math.PI * 2);
      ctx.stroke();
    }
    this.flashes = keep;
  }

  waterY(y, L) {
    return L.back - 6 - Math.min(1, Math.max(0, (y - 1) / WATER)) * (L.back - 14);
  }

  drawAnimals(now, L, sx, span) {
    const ctx = this.ctx;
    const { W } = this;
    const { agents, F } = this.frame;
    const k = (this.W < 600 ? 6.5 : 7.5) * Math.sqrt(this.zoom);
    const t = this.reduced ? 0 : now / 1000;
    const list = [];
    for (const a of this.animals.values()) {
      const p = this.posOf(a, now);
      const X = sx(p[0]);
      if (X < -40 || X > W + 40) continue;
      list.push([a, X, p[1]]);
    }
    // too many to draw well: a fixed sample, the same animals each frame
    const cap = this.W < 600 ? 380 : 480;
    const keep = list.length > cap ? cap / list.length : 1;
    const draw = [];
    for (const e of list) {
      const a = e[0];
      if (keep < 1 && hash(a.id, 9) > keep) continue;
      const o = a.i * F;
      const z = hash(a.id, 2);
      draw.push([z, a, e[1], e[2], o]);
    }
    draw.sort((p, q) => q[0] - p[0]);
    this.shown = { drawn: draw.length, near: list.length };
    const tr = new Array(NT);
    for (const [z, a, X, y, o] of draw) {
      for (let q = 0; q < NT; q++) tr[q] = agents[o + T_OFF + q];
      const group = agents[o + 4];
      const sp = agents[o + 5];
      const f = 1 - 0.35 * z;
      const len = Math.max(2.5, lenPx(lengthOf(tr[0]), k) * f);
      const move = tr[1];
      let Y;
      if (y < -0.2) Y = L.mudTop + 4 + Math.min(1, -y / 6) * (L.mudBottom - L.mudTop - 10);
      else if (y > 0.8) Y = this.waterY(y, L) - z * 6;
      else Y = L.floor - z * L.band - (move < 0.2 ? 0 : len * 0.22);
      const col = speciesColor(sp, group);
      const phase = t * (1.2 + 2 * move) + hash(a.id, 3) * 10;
      const bob = y > 0.8 && !this.reduced ? Math.sin(phase * 0.7) * 1.5 : 0;
      ctx.globalAlpha = 1 - 0.35 * z;
      if (len < 6 && move >= 0.2) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(X, Y + bob, len / 2, Math.max(0.9, len * 0.18), 0, 0, Math.PI * 2);
        ctx.fill();
      } else this.sprite(tr, sp, len, phase, col, X, Y + bob, a.dir);
      this.hits.push([X, Y + bob - (move < 0.2 ? len * 0.5 : 0), Math.max(8, len * 0.6), a.i]);
    }
    ctx.globalAlpha = 1;
  }

  // Drawing every animal path by path is slow, so each species is drawn
  // once per size and moment of its stride into a small picture that is
  // then stamped wherever an animal of that species is.
  sprite(tr, sp, len, phase, col, X, Y, dir) {
    const ctx = this.ctx;
    const L = Math.round(len);
    const sessile = tr[1] < 0.2;
    const PH = 8;
    const turn = Math.PI * 2;
    const b = Math.floor((((phase % turn) + turn) % turn) / (turn / PH));
    const key = `${sp}|${L}|${b}`;
    let s = this.sprites.get(key);
    if (!s) {
      if (this.sprites.size > 2500) this.sprites.clear();
      const S = Math.ceil(L * 1.7 + 10);
      const c = makeCanvas(Math.ceil(S * this.dpr), Math.ceil(S * this.dpr));
      const g = c.getContext('2d');
      g.scale(this.dpr, this.dpr);
      const ay = sessile ? S - 5 : S / 2;
      drawAnimal(g, tr, S / 2, ay, L, 1, b * (turn / PH), col, 'live');
      s = { c, S, ay };
      this.sprites.set(key, s);
    }
    if (dir < 0) {
      ctx.save();
      ctx.translate(X, Y);
      ctx.scale(-1, 1);
      ctx.drawImage(s.c, -s.S / 2, -s.ay, s.S, s.S);
      ctx.restore();
    } else ctx.drawImage(s.c, X - s.S / 2, Y - s.ay, s.S, s.S);
  }

  // The spindles: species of each body plan through time.
  drawPlans() {
    const ctx = this.ctx;
    const { W, H } = this;
    const P = this.points;
    const geo = this.geometry ?? { t0: 560, t1: 500, steps: 600 };
    const left = W < 500 ? 126 : 160;
    const right = 10;
    const top = 8;
    const axis = 22;
    const rowH = (H - top - axis) / GROUPS.length;
    const X = (ma) => left + ((geo.t0 - ma) / (geo.t0 - geo.t1)) * (W - left - right);
    ctx.fillStyle = '#10262b';
    ctx.fillRect(0, 0, W, H);
    // eras and dates
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    ctx.fillRect(left, top, X(538.8) - left, H - top - axis);
    const font = (s, w = 400) => `${w} ${s}px "Figtree", system-ui, sans-serif`;
    let max = 1;
    for (const q of P) for (const c of q.groups) if (c > max) max = c;
    const fauna = this.frame?.fauna ?? [];
    for (let gi = 0; gi < GROUPS.length; gi++) {
      const gr = GROUPS[gi];
      const cy = top + (gi + 0.5) * rowH;
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left, Math.round(cy) + 0.5);
      ctx.lineTo(W - right, Math.round(cy) + 0.5);
      ctx.stroke();
      // the spindle
      if (P.length) {
        const up = [];
        let px = -9;
        for (let i = 0; i < P.length; i++) {
          const x = X(P[i].ma);
          if (x - px < 1.5 && i < P.length - 1) continue;
          px = x;
          const c = P[i].groups[gi];
          up.push([x, c > 0 ? Math.max(0.8, rowH * 0.48 * Math.sqrt(c / max)) : 0]);
        }
        ctx.fillStyle = gr.color;
        ctx.beginPath();
        ctx.moveTo(up[0][0], cy);
        for (const [x, w] of up) ctx.lineTo(x, cy - w);
        for (let i = up.length - 1; i >= 0; i--) ctx.lineTo(up[i][0], cy + up[i][1]);
        ctx.closePath();
        ctx.fill();
      }
      // the name, and a drawing of its commonest species (or a typical one)
      const sp = fauna.find((s) => s.group === gi);
      const tr = sp ? sp.mean : templateOf(gi);
      const icon = Math.min(rowH * 1.1, W < 500 ? 22 : 30);
      const ix = 4 + icon * 0.55;
      const sessile = tr[1] < 0.2;
      ctx.globalAlpha = sp ? 1 : 0.4;
      drawAnimal(ctx, tr, ix, sessile ? cy + icon * 0.45 : cy, icon * (sessile ? 0.75 : 1), 1, 0.5, gr.color, 'live');
      ctx.globalAlpha = 1;
      ctx.fillStyle = sp ? '#e6efe9' : 'rgba(230,239,233,0.5)';
      ctx.font = font(W < 500 ? 10.5 : 12.5, 600);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(gr.name, ix + icon * 0.6 + 2, cy);
      this.hits.push([left / 2, cy, rowH / 2, -1 - gi, left / 2, rowH / 2]);
    }
    // the time axis, in millions of years ago
    const ay = H - axis + 4;
    ctx.fillStyle = 'rgba(230,239,233,0.7)';
    ctx.strokeStyle = 'rgba(230,239,233,0.4)';
    ctx.font = `${W < 500 ? 9.5 : 10.5}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let ma = 560; ma >= 500; ma -= 10) {
      const x = Math.round(X(ma)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, ay - 4);
      ctx.lineTo(x, ay);
      ctx.stroke();
      ctx.fillText(String(ma), Math.min(W - 10, x), ay + 1);
    }
    ctx.textAlign = 'right';
    ctx.fillText('Ma', left - 16, ay + 1);
    // dates: the Cambrian, Chengjiang, the Burgess Shale
    ctx.setLineDash([3, 3]);
    for (const [ma, label] of [
      [538.8, 'Cambrian'],
      [518, 'Chengjiang'],
      [508, 'Burgess'],
    ]) {
      const x = Math.round(X(ma)) + 0.5;
      ctx.strokeStyle = 'rgba(230,239,233,0.35)';
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, H - axis);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    if (P.length) {
      const x = Math.round(X(P[P.length - 1].ma)) + 0.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, H - axis);
      ctx.stroke();
    }
  }

  // The slab: the commonest species now, flattened into fossils.
  drawSlab(now) {
    const ctx = this.ctx;
    const { W, H } = this;
    const sg = ctx.createLinearGradient(0, 0, W, H);
    sg.addColorStop(0, '#ddd0b2');
    sg.addColorStop(1, '#c9b791');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, W, H);
    // bedding and stains
    for (let k = 0; k < 26; k++) {
      ctx.strokeStyle = k % 3 ? 'rgba(120,96,60,0.10)' : 'rgba(255,250,235,0.18)';
      ctx.lineWidth = 1 + hash(k, 1) * 2;
      const y0 = hash(k, 2) * H;
      ctx.beginPath();
      ctx.moveTo(0, y0);
      ctx.bezierCurveTo(W * 0.3, y0 + (hash(k, 3) - 0.5) * 30, W * 0.7, y0 + (hash(k, 4) - 0.5) * 30, W, y0 + (hash(k, 5) - 0.5) * 20);
      ctx.stroke();
    }
    for (let k = 0; k < 7; k++) {
      const r = (0.08 + 0.15 * hash(k, 7)) * Math.max(W, H);
      const gr = ctx.createRadialGradient(hash(k, 8) * W, hash(k, 9) * H, 0, hash(k, 8) * W, hash(k, 9) * H, r);
      gr.addColorStop(0, 'rgba(176,112,60,0.18)');
      gr.addColorStop(1, 'rgba(176,112,60,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, W, H);
    }
    const fauna = this.frame?.fauna ?? [];
    const cols = W < 420 ? 3 : W < 700 ? 4 : 6;
    const rows = Math.max(2, Math.min(5, Math.floor((H - 10) / (W < 420 ? 92 : 104))));
    const list = fauna.slice(0, cols * rows);
    const cw = W / cols;
    const ch = (H - 6) / rows;
    const big = Math.max(1, ...list.map((s) => Math.log10(lengthOf(s.mean[0]) / LN)));
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      const c = i % cols;
      const r = Math.floor(i / cols);
      const cx = (c + 0.5) * cw;
      const cy = r * ch + ch * 0.44 + 3;
      const sessile = s.mean[1] < 0.2;
      const scale = 0.55 + 0.45 * (Math.log10(lengthOf(s.mean[0]) / LN) / big);
      const len = Math.min(cw * 0.85, ch * (sessile ? 0.6 : 1.1)) * scale;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((hash(s.id, 1) - 0.5) * (sessile ? 0.4 : 1.2));
      drawAnimal(ctx, s.mean, 0, sessile ? len * 0.55 : 0, len, hash(s.id, 2) < 0.5 ? 1 : -1, 1.3, '#806040', 'fossil');
      ctx.restore();
      ctx.fillStyle = 'rgba(52,38,22,0.85)';
      ctx.font = `italic 600 ${W < 420 ? 10.5 : 11.5}px "Figtree", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(s.name, cx, r * ch + ch - 2, cw - 6);
      this.hits.push([cx, cy, Math.min(cw, ch) * 0.5, -100 - s.id]);
    }
    if (!list.length) {
      ctx.fillStyle = 'rgba(52,38,22,0.8)';
      ctx.font = '600 13px "Figtree", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No animals yet', W / 2, H / 2);
    }
  }

  // What is under a tap: an animal, a species on the slab or a group's row.
  hitAt(x, y) {
    let best = null;
    let bd = Infinity;
    for (const [hx, hy, r, what, hw, hh] of this.hits) {
      if (hw !== undefined) {
        if (Math.abs(hx - x) <= hw && Math.abs(hy - y) <= hh) return { kind: 'group', group: -1 - what };
        continue;
      }
      const d = Math.hypot(hx - x, hy - y);
      if (d < Math.max(r, 12) && d < bd) {
        bd = d;
        best = what;
      }
    }
    if (best === null) return null;
    if (best <= -100) {
      const id = -100 - best;
      const s = (this.frame?.fauna ?? []).find((q) => q.id === id);
      return s ? { kind: 'species', species: s } : null;
    }
    if (best < 0) return { kind: 'group', group: -1 - best };
    const { agents, F } = this.frame;
    const o = best * F;
    const tr = Array.from(agents.subarray(o + T_OFF, o + T_OFF + NT));
    const sp = agents[o + 5];
    const known = (this.frame.fauna ?? []).find((q) => q.id === sp);
    return {
      kind: 'animal',
      species: known ?? { id: sp, name: genusName(sp), group: agents[o + 4], count: null, mean: tr },
      traits: tr,
    };
  }
}

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const c = (s) => Math.round(((pa >> s) & 255) + (((pb >> s) & 255) - ((pa >> s) & 255)) * t);
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}

export { G };
