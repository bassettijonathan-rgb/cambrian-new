// The run so far as stacked charts on one shared axis of time, in millions
// of years ago, with the dates of the great fossil beds drawn through all of
// them and real reference values behind.

function logLabel(ctx, v, x, y) {
  ctx.fillText(v >= 1 ? String(Math.round(v)) : String(v), x, y);
}

export const PANELS = [
  {
    id: 'species',
    title: 'Species alive',
    min: 0,
    max: 400,
    ticks: [0, 200, 400],
    series: [{ key: 'species', color: 'species', width: 2 }],
  },
  {
    id: 'disparity',
    title: 'Disparity: how different the bodies are',
    min: 0,
    max: 1.2,
    ticks: [0, 0.5, 1],
    series: [{ key: 'disparity', color: 'ink', width: 2 }],
  },
  {
    id: 'shares',
    title: 'Share of animals',
    min: 0,
    max: 1,
    pct: true,
    ticks: [0, 0.5, 1],
    series: [
      { key: 'armour', color: 'armour', width: 1.8, label: 'skeleton' },
      { key: 'eyes', color: 'eye', width: 1.8, label: 'eyes' },
      { key: 'carn', color: 'hunter', width: 1.8, label: 'hunters' },
      { key: 'burrow', color: 'burrow', width: 1.8, label: 'diggers' },
    ],
  },
  {
    id: 'size',
    title: 'Length, cm',
    log: true,
    min: 0.3,
    max: 200,
    ticks: [1, 10, 100],
    series: [
      { key: 'bigPred', color: 'hunter', width: 2, scale: 0.1, label: 'biggest hunter', when: (q) => q.bigPred > 0 },
      { key: 'meanL', color: 'ink3', width: 1.5, scale: 0.1, label: 'typical animal' },
    ],
    bands: [{ from: 30, to: 40, label: 'Anomalocaris' }],
  },
  {
    id: 'world',
    title: 'Sea and sea floor',
    min: 0,
    max: 1,
    pct: true,
    ticks: [0, 0.5, 1],
    series: [
      { key: 'mat', color: 'mat', width: 2, label: 'floor under mats' },
      { key: 'o2', color: 'oxygen', width: 2, label: 'oxygen, of today’s' },
    ],
  },
];

export const DATES = [
  { ma: 538.8, label: 'Cambrian' },
  { ma: 518, label: 'Chengjiang' },
  { ma: 508, label: 'Burgess' },
];

const PAD = { left: 40, right: 10, title: 18, gap: 10, axis: 34 };

export class Charts {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.points = [];
    this.t0 = 560;
    this.t1 = 500;
    this.steps = 600;
    this.cursor = null; // a step
    this.W = 0;
    this.H = 0;
  }

  setRange(geo) {
    this.t0 = geo.t0;
    this.t1 = geo.t1;
    this.steps = geo.steps;
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = Math.max(1, r.width);
    this.H = Math.max(1, r.height);
    this.canvas.width = Math.round(this.W * dpr);
    this.canvas.height = Math.round(this.H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = PANELS.length;
    const row = (this.H - PAD.axis) / n;
    const ph = row - PAD.title - PAD.gap;
    this.boxes = PANELS.map((p, i) => ({ panel: p, y: i * row + PAD.title, h: ph }));
  }

  x(step) {
    return PAD.left + (step / this.steps) * (this.W - PAD.left - PAD.right);
  }

  xMa(ma) {
    return this.x((this.t0 - ma) / ((this.t0 - this.t1) / this.steps));
  }

  stepAt(x) {
    const t = (x - PAD.left) / (this.W - PAD.left - PAD.right);
    return Math.round(Math.min(1, Math.max(0, t)) * this.steps);
  }

  pointAt(step) {
    const P = this.points;
    if (!P.length) return null;
    let i = Math.min(P.length - 1, Math.max(0, step - P[0].step));
    while (i > 0 && P[i].step > step) i--;
    while (i < P.length - 1 && P[i + 1].step <= step) i++;
    return P[i];
  }

  draw(colors) {
    const ctx = this.ctx;
    const { W, H } = this;
    if (!this.boxes) return;
    ctx.clearRect(0, 0, W, H);
    const P = this.points;
    const x0 = PAD.left;
    const x1 = W - PAD.right;
    const font = (s, w = 400) => `${w} ${s}px "Figtree", system-ui, sans-serif`;
    const mono = (s) => `${s}px "JetBrains Mono", ui-monospace, monospace`;
    const top = this.boxes[0].y;
    const bottom = this.boxes[this.boxes.length - 1].y + this.boxes[this.boxes.length - 1].h;

    for (const box of this.boxes) {
      const p = box.panel;
      const yOf = (v) => {
        const t = p.log ? (Math.log10(Math.max(v, p.min)) - Math.log10(p.min)) / (Math.log10(p.max) - Math.log10(p.min)) : (v - p.min) / (p.max - p.min);
        return box.y + box.h - Math.min(1, Math.max(0, t)) * box.h;
      };
      ctx.fillStyle = colors.plot;
      ctx.fillRect(x0, box.y, x1 - x0, box.h);
      for (const b of p.bands ?? []) {
        const t = yOf(Math.min(b.to, p.max));
        const bt = yOf(Math.max(b.from, p.min));
        ctx.fillStyle = colors.ref;
        ctx.fillRect(x0, t - 1, x1 - x0, bt - t + 2);
        ctx.fillStyle = colors.ink3;
        ctx.font = font(9.5);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(b.label, x0 + 4, t - 1);
      }
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 1;
      ctx.font = mono(9.5);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (const t of p.ticks) {
        const y = Math.round(yOf(t)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
        ctx.stroke();
        ctx.fillStyle = colors.ink3;
        if (p.log) logLabel(ctx, t, x0 - 5, y);
        else ctx.fillText(p.pct ? `${Math.round(t * 100)}%` : String(t), x0 - 5, y);
      }
      // the run
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, box.y - 2, x1 - x0, box.h + 4);
      ctx.clip();
      for (const s of p.series) {
        if (!P.length) continue;
        ctx.beginPath();
        let px = -9;
        let pen = false;
        for (let i = 0; i < P.length; i++) {
          const q = P[i];
          const v = q[s.key] * (s.scale ?? 1);
          if ((s.when && !s.when(q)) || !Number.isFinite(v)) {
            pen = false;
            continue;
          }
          const X = this.x(q.step);
          if (pen && X - px < 1 && i < P.length - 1) continue;
          px = X;
          const Y = yOf(v);
          if (!pen) ctx.moveTo(X, Y);
          else ctx.lineTo(X, Y);
          pen = true;
        }
        ctx.strokeStyle = colors[s.color];
        ctx.lineWidth = s.width ?? 1.6;
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
      ctx.restore();
      // the title, and a key for panels with several lines
      ctx.font = font(11.5, 700);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = colors.ink2;
      ctx.fillText(p.title, x0, box.y - 6);
      if (p.series.length > 1) {
        let kx = x0 + ctx.measureText(p.title).width + 10;
        ctx.font = font(10.5, 600);
        for (const s of p.series) {
          const w = ctx.measureText(s.label).width;
          if (kx + w + 12 > x1) break;
          ctx.fillStyle = colors[s.color];
          ctx.fillRect(kx, box.y - 11, 8, 3);
          ctx.fillText(s.label, kx + 11, box.y - 6);
          kx += w + 22;
        }
      }
    }

    // the great fossil beds, through every panel
    ctx.font = font(9.5, 600);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const d of DATES) {
      const X = Math.round(this.xMa(d.ma)) + 0.5;
      ctx.strokeStyle = colors.ink3;
      ctx.setLineDash([2, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(X, top);
      ctx.lineTo(X, bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = colors.ink2;
      ctx.fillText(d.label, X, bottom + 18);
    }

    // the axis: millions of years ago
    const ay = bottom + 4;
    ctx.strokeStyle = colors.ink3;
    ctx.fillStyle = colors.ink3;
    ctx.font = mono(10);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const every = W < 420 ? 20 : 10;
    for (let ma = this.t0; ma >= this.t1; ma -= 5) {
      const X = Math.round(this.xMa(ma)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(X, ay - 4);
      ctx.lineTo(X, ay - 1);
      ctx.stroke();
      if ((this.t0 - ma) % every === 0) ctx.fillText(String(ma), Math.min(X, W - 12), ay);
    }
    ctx.textAlign = 'left';
    ctx.font = font(9.5);
    ctx.fillText('Ma', 2, ay);

    // now, and the cursor
    if (P.length) {
      const X = Math.round(this.x(P[P.length - 1].step)) + 0.5;
      ctx.strokeStyle = colors.ink2;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(X, top);
      ctx.lineTo(X, bottom);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (this.cursor !== null && P.length) {
      const X = Math.round(this.x(this.cursor)) + 0.5;
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(X, top);
      ctx.lineTo(X, bottom);
      ctx.stroke();
    }
  }
}
