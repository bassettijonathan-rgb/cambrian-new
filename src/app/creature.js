// Draws one animal from its traits. Every body in the run is drawn by this
// function, so the shapes on screen are the traits in the simulation: the
// segments, legs, flaps, eyes, plates, spines, grasping arms and burrows.
//
// t: the twelve traits (as in TRAITS), x/y: where the animal's middle is,
// len: its length on screen in px, dir: 1 facing right, −1 left, phase: a
// clock for the legs and flaps, col: its colour, style: 'live' or 'fossil'.

const TAU = Math.PI * 2;

export function drawAnimal(ctx, t, x, y, len, dir, phase, col, style = 'live') {
  const [, move, seg, legs, swim, eye, armour, spines, jaws, burrow, carn, filter] = t;
  ctx.save();
  ctx.translate(x, y);
  if (dir < 0) ctx.scale(-1, 1);
  const fossil = style === 'fossil';
  const ink = fossil ? 'rgba(20,18,16,0.55)' : shade(col, -0.45);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (move < 0.2) {
    if (carn > 0.5) polyp(ctx, len, col, ink, phase, jaws, fossil);
    else if (armour > 0.4) tube(ctx, len, col, ink, phase, filter, fossil);
    else frond(ctx, len, col, ink, phase, fossil);
    ctx.restore();
    return;
  }
  const worm = legs < 0.3 && swim < 0.3 && armour < 0.35 && spines < 0.4 && (burrow > 0.4 || (seg > 0.3 && carn > 0.3));
  if (worm) wormBody(ctx, len, col, ink, phase, seg, eye, jaws, spines, fossil);
  else body(ctx, len, t, col, ink, phase, fossil);
  ctx.restore();
}

// a lighter or darker version of a #rrggbb colour (k from −1 to 1)
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const f = (c) => Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k);
  r = f(r);
  g = f(g);
  b = f(b);
  return `rgb(${r},${g},${b})`;
}

function frond(ctx, len, col, ink, phase, fossil) {
  // a rangeomorph: a holdfast, a stalk and a leaf of branching fronds
  const h = len * 1.2;
  const sway = Math.sin(phase * 0.6) * len * 0.06;
  ctx.fillStyle = fossil ? 'rgba(20,18,16,0.25)' : shade(col, -0.25);
  ctx.beginPath();
  ctx.ellipse(0, 0, len * 0.16, len * 0.06, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1, len * 0.04);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(sway * 0.5, -h * 0.2, sway, -h * 0.3);
  ctx.stroke();
  ctx.fillStyle = fossil ? 'rgba(20,18,16,0.18)' : col;
  ctx.beginPath();
  ctx.moveTo(sway, -h * 0.3);
  ctx.bezierCurveTo(sway - len * 0.32, -h * 0.5, sway - len * 0.2, -h * 0.9, sway, -h);
  ctx.bezierCurveTo(sway + len * 0.2, -h * 0.9, sway + len * 0.32, -h * 0.5, sway, -h * 0.3);
  ctx.fill();
  ctx.strokeStyle = fossil ? ink : shade(col, -0.3);
  ctx.lineWidth = Math.max(0.6, len * 0.015);
  ctx.beginPath();
  ctx.moveTo(sway, -h * 0.3);
  ctx.lineTo(sway, -h);
  for (let k = 1; k < 8; k++) {
    const yy = -h * (0.3 + (0.7 * k) / 8);
    const w = len * 0.22 * Math.sin((Math.PI * k) / 8);
    ctx.moveTo(sway, yy);
    ctx.lineTo(sway - w, yy - len * 0.05);
    ctx.moveTo(sway, yy);
    ctx.lineTo(sway + w, yy - len * 0.05);
  }
  ctx.stroke();
}

function tube(ctx, len, col, ink, phase, filter, fossil) {
  // Cloudina: a stack of mineral funnels, with a fan of tentacles on top
  const h = len * 0.9;
  const n = 5;
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(0.8, len * 0.03);
  ctx.fillStyle = fossil ? 'rgba(20,18,16,0.2)' : col;
  for (let k = 0; k < n; k++) {
    const y0 = -(h * k) / n;
    const y1 = -(h * (k + 1)) / n;
    const w0 = len * (0.07 + 0.03 * k);
    const w1 = len * (0.1 + 0.03 * k);
    ctx.beginPath();
    ctx.moveTo(-w0, y0);
    ctx.lineTo(-w1, y1);
    ctx.lineTo(w1, y1);
    ctx.lineTo(w0, y0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  if (filter > 0.3) {
    ctx.strokeStyle = fossil ? ink : shade(col, 0.4);
    ctx.lineWidth = Math.max(0.6, len * 0.015);
    ctx.beginPath();
    for (let k = -3; k <= 3; k++) {
      const a = (k / 3) * 0.7 + Math.sin(phase + k) * 0.08;
      ctx.moveTo(0, -h);
      ctx.lineTo(Math.sin(a) * len * 0.35, -h - Math.cos(a) * len * 0.35);
    }
    ctx.stroke();
  }
}

function polyp(ctx, len, col, ink, phase, jaws, fossil) {
  // a sea-anemone-like polyp: a column and a crown of stinging tentacles
  const h = len * 0.8;
  ctx.fillStyle = fossil ? 'rgba(20,18,16,0.22)' : col;
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(0.8, len * 0.03);
  ctx.beginPath();
  ctx.moveTo(-len * 0.12, 0);
  ctx.quadraticCurveTo(-len * 0.16, -h * 0.5, -len * 0.18, -h);
  ctx.lineTo(len * 0.18, -h);
  ctx.quadraticCurveTo(len * 0.16, -h * 0.5, len * 0.12, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = fossil ? ink : shade(col, 0.25);
  ctx.lineWidth = Math.max(0.7, len * 0.035);
  ctx.beginPath();
  const n = 7 + Math.round(jaws * 4);
  for (let k = 0; k < n; k++) {
    const a = -1.1 + (2.2 * k) / (n - 1);
    const w = Math.sin(phase * 1.3 + k) * 0.15;
    const r = len * 0.42;
    ctx.moveTo(Math.sin(a) * len * 0.15, -h);
    ctx.quadraticCurveTo(Math.sin(a) * r * 0.8, -h - r * 0.5, Math.sin(a + w) * r, -h - Math.cos(a + w) * r * 0.9);
  }
  ctx.stroke();
}

function wormBody(ctx, len, col, ink, phase, seg, eye, jaws, spines, fossil) {
  // a worm: a sinuous tube, ringed if segmented, with a spiny proboscis if it hunts
  const n = 14;
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const u = k / n;
    pts.push([len * (0.5 - u), Math.sin(phase * 2 + u * 7) * len * 0.07]);
  }
  ctx.strokeStyle = fossil ? 'rgba(20,18,16,0.45)' : col;
  ctx.lineWidth = Math.max(1.5, len * 0.13);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts) ctx.lineTo(p[0], p[1]);
  ctx.stroke();
  if (seg > 0.2) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(0.5, len * 0.012);
    ctx.beginPath();
    const rings = 3 + Math.round(seg * 10);
    for (let k = 1; k < rings; k++) {
      const p = pts[Math.round((k / rings) * n)];
      ctx.moveTo(p[0], p[1] - len * 0.065);
      ctx.lineTo(p[0], p[1] + len * 0.065);
    }
    ctx.stroke();
  }
  const head = pts[0];
  if (jaws > 0.3) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(0.6, len * 0.02);
    ctx.beginPath();
    for (let k = -2; k <= 2; k++) {
      ctx.moveTo(head[0], head[1]);
      ctx.lineTo(head[0] + len * 0.1, head[1] + k * len * 0.025);
    }
    ctx.stroke();
  }
  if (spines > 0.2) spikes(ctx, pts, len, spines, ink, -1);
  if (eye > 0.2) eyes(ctx, head[0] - len * 0.02, head[1] - len * 0.03, len, eye, fossil);
}

function spikes(ctx, pts, len, spines, ink, side) {
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(0.6, len * 0.018);
  ctx.beginPath();
  const n = 3 + Math.round(spines * 5);
  for (let k = 1; k <= n; k++) {
    const p = pts[Math.round((k / (n + 1)) * (pts.length - 1))];
    ctx.moveTo(p[0], p[1] + side * len * 0.06);
    ctx.lineTo(p[0] - len * 0.04, p[1] + side * len * (0.06 + 0.22 * spines));
  }
  ctx.stroke();
}

function eyes(ctx, x, y, len, eye, fossil) {
  if (eye > 0.65) {
    // stalked compound eye
    ctx.strokeStyle = fossil ? 'rgba(20,18,16,0.5)' : '#2a2620';
    ctx.lineWidth = Math.max(0.6, len * 0.02);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len * 0.04, y - len * 0.1);
    ctx.stroke();
    const r = Math.max(1.4, len * (0.035 + 0.04 * eye));
    ctx.fillStyle = fossil ? 'rgba(20,18,16,0.6)' : '#141210';
    ctx.beginPath();
    ctx.arc(x + len * 0.045, y - len * 0.11, r, 0, TAU);
    ctx.fill();
    if (!fossil) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.arc(x + len * 0.045 + r * 0.35, y - len * 0.11 - r * 0.35, r * 0.3, 0, TAU);
      ctx.fill();
    }
  } else {
    const r = Math.max(0.9, len * 0.025 * (0.5 + eye));
    ctx.fillStyle = fossil ? 'rgba(20,18,16,0.6)' : '#141210';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
}

// Everything that walks, swims or crawls with a body of some shape.
function body(ctx, len, t, col, ink, phase, fossil) {
  const [, , seg, legs, swim, eye, armour, spines, jaws, burrow] = t;
  const L = len;
  const H = L * (0.2 + 0.12 * armour + 0.06 * (1 - swim));
  const rings = 2 + Math.round(seg * 12);
  const arthro = armour > 0.35 && seg > 0.35;
  const bodyFill = fossil ? 'rgba(20,18,16,0.22)' : armour > 0.4 ? shade(col, -0.08) : col;

  // swimming flaps along the sides, waving
  if (swim > 0.3) {
    ctx.fillStyle = fossil ? 'rgba(20,18,16,0.14)' : shade(col, 0.35);
    const n = Math.max(3, rings - 1);
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) / n;
      const xx = L * (0.38 - 0.8 * u);
      const w = Math.sin(phase * 3 - k * 0.8) * 0.35;
      const fl = L * (0.06 + 0.12 * swim) * (1 - 0.5 * Math.abs(u - 0.4));
      ctx.beginPath();
      ctx.ellipse(xx - fl * 0.2, H * 0.55, fl * 0.5, fl, 0.5 + w, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(xx - fl * 0.2, -H * 0.45, fl * 0.4, fl * 0.75, -0.5 - w, 0, TAU);
      ctx.fill();
    }
  }

  // walking legs, swinging in turn
  if (legs > 0.25) {
    ctx.strokeStyle = fossil ? 'rgba(20,18,16,0.5)' : shade(col, -0.35);
    ctx.lineWidth = Math.max(0.7, L * (arthro ? 0.016 : 0.05));
    ctx.beginPath();
    const n = Math.max(3, Math.min(14, rings + 1));
    const ll = H * (arthro ? 0.45 + 0.4 * legs : 0.5 + 0.5 * legs);
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) / n;
      const xx = L * (0.34 - 0.72 * u);
      const sw = Math.sin(phase * 4 + k * 1.3) * L * 0.035;
      ctx.moveTo(xx, H * 0.35);
      if (arthro) {
        ctx.lineTo(xx + sw - L * 0.02, H * 0.35 + ll * 0.55);
        ctx.lineTo(xx + sw * 1.4 - L * 0.01, H * 0.35 + ll);
      } else ctx.lineTo(xx + sw, H * 0.35 + ll);
    }
    ctx.stroke();
  }

  // great appendages at the front: curled, spiny grasping arms
  if (jaws > 0.35) {
    ctx.strokeStyle = fossil ? 'rgba(20,18,16,0.55)' : shade(col, -0.25);
    ctx.lineWidth = Math.max(1, L * 0.045);
    const reach = L * (0.12 + 0.3 * jaws);
    const curl = 0.8 + Math.sin(phase * 1.5) * 0.25;
    ctx.beginPath();
    ctx.moveTo(L * 0.42, H * 0.1);
    ctx.quadraticCurveTo(L * 0.42 + reach, H * 0.1 - reach * 0.2, L * 0.42 + reach * 0.85, H * 0.1 + reach * curl * 0.7);
    ctx.stroke();
    ctx.lineWidth = Math.max(0.5, L * 0.012);
    ctx.beginPath();
    for (let k = 1; k <= 4; k++) {
      const u = k / 5;
      const xx = L * 0.42 + reach * u;
      const yy = H * 0.1 - reach * 0.15 * Math.sin(Math.PI * u);
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx + L * 0.01, yy + L * 0.05);
    }
    ctx.stroke();
  }

  // the body itself
  ctx.fillStyle = bodyFill;
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(0.8, L * (0.015 + 0.02 * armour));
  ctx.beginPath();
  const shell = armour > 0.4 && seg < 0.35 && legs < 0.3 && swim < 0.4;
  if (shell) {
    // a cap-shaped shell over a muscular foot, like the first molluscs
    ctx.save();
    ctx.fillStyle = fossil ? 'rgba(20,18,16,0.3)' : shade(col, -0.3);
    ctx.beginPath();
    ctx.ellipse(0, H * 0.55, L * 0.46, H * 0.32, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(-L * 0.45, H * 0.45);
    ctx.bezierCurveTo(-L * 0.4, -H * 1.3, L * 0.15, -H * 1.6, L * 0.3, -H * 0.9);
    ctx.quadraticCurveTo(L * 0.42, -H * 0.2, L * 0.45, H * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = fossil ? 'rgba(20,18,16,0.4)' : shade(col, -0.35);
    ctx.lineWidth = Math.max(0.5, L * 0.01);
    ctx.beginPath();
    for (let k = 1; k <= 4; k++) {
      const f = k / 5;
      ctx.moveTo(-L * 0.45 * f, H * 0.45);
      ctx.bezierCurveTo(-L * 0.4 * f, -H * 1.3 * f, L * 0.15 * f, -H * 1.6 * f, L * 0.3 * f + L * 0.05, -H * 0.9 * f);
    }
    ctx.stroke();
  } else if (arthro && legs > 0.3 && swim < 0.5) {
    // a trilobite-like outline: head shield, segmented thorax, tail shield
    ctx.moveTo(L * 0.5, 0);
    ctx.quadraticCurveTo(L * 0.48, -H * 0.95, L * 0.22, -H);
    ctx.lineTo(-L * 0.32, -H * 0.8);
    ctx.quadraticCurveTo(-L * 0.52, -H * 0.5, -L * 0.5, 0);
    ctx.quadraticCurveTo(-L * 0.48, H * 0.5, -L * 0.3, H * 0.55);
    ctx.lineTo(L * 0.25, H * 0.6);
    ctx.quadraticCurveTo(L * 0.5, H * 0.5, L * 0.5, 0);
  } else {
    ctx.ellipse(0, 0, L * 0.5, H, 0, 0, TAU);
  }
  if (!shell) {
    ctx.fill();
    ctx.stroke();
  }
  // a soft crawler's frilly edge, like Kimberella's
  if (!shell && armour < 0.3 && legs < 0.25 && swim < 0.3 && seg < 0.3) {
    ctx.strokeStyle = fossil ? 'rgba(20,18,16,0.35)' : shade(col, 0.3);
    ctx.lineWidth = Math.max(0.5, L * 0.012);
    ctx.beginPath();
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * TAU;
      ctx.moveTo(Math.cos(a) * L * 0.46, Math.sin(a) * H * 0.85);
      ctx.lineTo(Math.cos(a) * L * 0.5, Math.sin(a) * H);
    }
    ctx.stroke();
  }

  // segments
  if (seg > 0.2 && !shell) {
    ctx.strokeStyle = fossil ? 'rgba(20,18,16,0.45)' : shade(col, -0.3 - 0.2 * armour);
    ctx.lineWidth = Math.max(0.5, L * (0.008 + 0.012 * armour));
    ctx.beginPath();
    const x0 = arthro ? L * 0.18 : L * 0.4;
    const x1 = arthro ? -L * 0.3 : -L * 0.42;
    for (let k = 1; k < rings; k++) {
      const xx = x0 + (x1 - x0) * (k / rings);
      const hh = H * Math.sqrt(Math.max(0, 1 - (xx / (L * 0.5)) ** 2));
      ctx.moveTo(xx, -hh * 0.95);
      ctx.lineTo(xx + L * 0.01, hh * 0.9);
    }
    ctx.stroke();
  }

  // a mineral skeleton: plates with a gleam along the back
  if (armour > 0.4 && !fossil && !shell) {
    ctx.strokeStyle = `rgba(255,255,255,${0.15 + 0.3 * armour})`;
    ctx.lineWidth = Math.max(0.6, L * 0.02);
    ctx.beginPath();
    ctx.ellipse(-L * 0.02, -H * 0.15, L * 0.36, H * 0.55, 0, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }

  // spines on the back
  if (spines > 0.25) {
    ctx.strokeStyle = fossil ? 'rgba(20,18,16,0.55)' : shade(col, -0.4);
    ctx.lineWidth = Math.max(0.6, L * 0.018);
    ctx.beginPath();
    const n = 3 + Math.round(spines * 6);
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) / n;
      const xx = L * (0.36 - 0.72 * u);
      const hh = H * Math.sqrt(Math.max(0, 1 - (xx / (L * 0.5)) ** 2));
      ctx.moveTo(xx, -hh * 0.9);
      ctx.lineTo(xx - L * 0.03, -hh - L * (0.05 + 0.2 * spines));
    }
    ctx.stroke();
  }

  // a digger's shovel snout
  if (burrow > 0.5) {
    ctx.fillStyle = fossil ? 'rgba(20,18,16,0.3)' : shade(col, -0.2);
    ctx.beginPath();
    ctx.moveTo(L * 0.5, -H * 0.3);
    ctx.lineTo(L * 0.62, 0);
    ctx.lineTo(L * 0.5, H * 0.3);
    ctx.closePath();
    ctx.fill();
  }

  if (eye > 0.15) eyes(ctx, L * 0.36, -H * 0.45, L, eye, fossil);
}
