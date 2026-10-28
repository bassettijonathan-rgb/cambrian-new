// The page: wires the simulation to the picture, the charts, the readouts,
// the Learn chapters, the Lab and the Validation tab.

import { createHost } from './host.js';
import { Scene, lengthOf, speciesColor } from './scene.js';
import { Charts } from './charts.js';
import { drawAnimal } from './creature.js';
import { CHAPTERS, GLOSSARY, READOUTS, VIEWS, PICTURE_HELP, ABOUT_MODEL, explain, narrate, markup } from './guide.js';
import { evaluate, DEFAULT_SEED } from './validation.js';
import { GROUPS } from '../sim/groups.js';
import * as fmt from './format.js';

/* global __VALIDATION__ */
const BUILT = typeof __VALIDATION__ === 'object' ? __VALIDATION__ : null;

const $ = (id) => document.getElementById(id);
const esc = fmt.esc;
const SPEED_LABELS = ['0.2 Myr/s', '0.6 Myr/s', '2 Myr/s', 'Fastest'];
const DEFAULT_SPEED = 1;
const WIDE = window.matchMedia('(min-width: 1040px)');
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
const reveal = (el, block = 'start') => el?.scrollIntoView?.({ behavior: REDUCED_MOTION.matches ? 'auto' : 'smooth', block });

const store = {
  get(k, d) {
    try {
      const v = window.localStorage.getItem(`cam:${k}`);
      return v === null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      window.localStorage.setItem(`cam:${k}`, JSON.stringify(v));
    } catch {
      /* storage unavailable: nothing to remember */
    }
  },
};

const state = {
  ready: false,
  geometry: null,
  scenarios: {},
  defaults: {},
  ranges: {},
  toggles: [],
  steps: 600,
  points: [],
  notes: [],
  frame: null,
  params: {},
  running: false,
  done: false,
  speed: store.get('speed', DEFAULT_SPEED),
  seed: DEFAULT_SEED,
  scenario: 'real',
  labParams: {},
  custom: false, // the run was changed while it went (Lab buttons or sliders)
  view: store.get('view', 'sea'),
  tab: store.get('tab', 'learn'),
  chapter: Math.min(CHAPTERS.length - 1, store.get('chapter', 0)),
  answers: store.get('answers', {}),
  show: null, // the "Show me" steps still to run
  afterReady: null,
  note: null,
  narratorHtml: '',
  legendKey: '',
  dirty: true,
  chartsDirty: true,
  lastCharts: 0,
  cursor: null,
  validation: null,
  checkView: 'model',
};
if (!Number.isInteger(state.speed) || state.speed < 0 || state.speed > 3) state.speed = DEFAULT_SPEED;
if (!VIEWS.some((v) => v.key === state.view)) state.view = 'sea';

const scene = new Scene($('scene'));
const charts = new Charts($('charts'));
let host = null;

const last = () => state.points[state.points.length - 1];
const step = () => (last() ? last().step : 0);
const maOf = (s) => 560 - s * 0.1;

// ---------------------------------------------------------------- the sim

function onSim(msg) {
  switch (msg.type) {
    case 'ready': {
      state.ready = true;
      state.geometry = msg.geometry;
      state.scenarios = msg.scenarios;
      state.defaults = msg.defaults;
      state.ranges = msg.ranges;
      state.toggles = msg.toggles;
      state.steps = msg.steps;
      state.seed = msg.seed;
      state.scenario = msg.scenario;
      state.points = [];
      state.notes = [];
      state.note = null;
      state.done = false;
      state.running = false;
      scene.setGeometry(msg.geometry);
      scene.resize();
      charts.setRange(msg.geometry);
      charts.cursor = null;
      state.cursor = null;
      $('events').innerHTML = '';
      renderLab();
      const then = state.afterReady;
      state.afterReady = null;
      if (then) then();
      break;
    }
    case 'tick': {
      state.frame = msg.frame;
      for (const p of msg.points) state.points.push(p);
      for (const n of msg.notes) {
        state.notes.push(n);
        state.note = { ...n, at: performance.now() };
        addEvent(n);
      }
      state.params = msg.params;
      state.running = msg.running;
      state.done = msg.done;
      if (last()) scene.setFrame(msg.frame, last(), state.points);
      state.dirty = true;
      state.chartsDirty = true;
      break;
    }
    case 'paused':
      state.running = false;
      state.done = msg.done;
      state.dirty = true;
      if (state.show) nextShowStep();
      if (state.tab === 'check') renderCheck();
      break;
    case 'error':
      showError(msg.message);
      break;
    default:
      break;
  }
}

function startRun({ seed = state.seed, scenario = state.scenario, params = state.labParams, then = null } = {}) {
  state.afterReady = then;
  state.custom = false;
  state.labParams = { ...params };
  host.send({ type: 'init', seed, scenario, params: state.labParams });
}

function play() {
  if (state.done) {
    startRun({ then: () => play() });
    return;
  }
  state.show = null;
  state.running = true;
  host.send({ type: 'play', speed: state.speed });
  state.dirty = true;
}

function pause() {
  state.show = null;
  host.send({ type: 'pause' });
}

function runTo(s, speed = 3) {
  if (s <= step() || state.done) return;
  state.running = true;
  host.send({ type: 'runTo', step: s, speed });
  state.dirty = true;
}

// ---------------------------------------------------------------- Show me

function showMe(ch) {
  const s = ch.show;
  if (s.tab) {
    setTab(s.tab);
    reveal($('side'));
    return;
  }
  if (s.view) setView(s.view);
  const first = s.steps[0].step;
  const seed = s.seed ?? DEFAULT_SEED;
  const scenario = s.scenario ?? 'real';
  const fresh = state.scenario === scenario && state.seed === seed && !state.custom && !Object.keys(state.labParams).length;
  state.show = { steps: s.steps.slice(), chapter: ch };
  if (!fresh || step() > first) startRun({ seed, scenario, params: {}, then: () => nextShowStep() });
  else nextShowStep();
  reveal($('stage'));
  if (s.highlight) flashReadout(s.highlight);
}

function nextShowStep() {
  const show = state.show;
  if (!show) return;
  while (show.steps.length && show.steps[0].step <= step()) show.steps.shift();
  const next = show.steps.shift();
  if (!next) {
    state.show = null;
    const look = document.querySelector(`[data-look="${show.chapter.id}"]`);
    if (look) look.hidden = false;
    return;
  }
  state.running = true;
  host.send({ type: 'runTo', step: next.step, speed: next.speed });
}

function focusCharts() {
  if (!WIDE.matches) {
    state.fromLesson = true;
    setTab('watch');
  }
  requestAnimationFrame(() => reveal($('charts')));
}

function flashReadout(key) {
  const el = document.querySelector(`.readout[data-explain="${key}"]`);
  if (!el) return;
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
}

// ---------------------------------------------------------------- top bar

const ICONS = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/></svg>',
  again: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5a7 7 0 1 1-6.6 4.7l1.9.7A5 5 0 1 0 12 7v3L7.5 6 12 2z"/></svg>',
  step: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5.5v13l9-6.5zM16 5h2.6v14H16z"/></svg>',
};

function renderBar() {
  $('speed').innerHTML = SPEED_LABELS.map((l, i) => `<option value="${i}">${l}</option>`).join('');
  $('speed').value = String(state.speed);
  $('step').innerHTML = ICONS.step;
  $('restart').innerHTML = ICONS.again;
  $('play').addEventListener('click', () => (state.running ? pause() : play()));
  $('step').addEventListener('click', () => {
    state.show = null;
    host.send({ type: 'step', n: 1 });
  });
  $('restart').addEventListener('click', () => startRun());
  $('speed').addEventListener('change', (e) => {
    state.speed = Number(e.target.value);
    store.set('speed', state.speed);
    if (state.running && !state.show) host.send({ type: 'speed', speed: state.speed });
  });
  const tl = $('timeline');
  tl.addEventListener('click', (e) => {
    const r = tl.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const s = Math.round(t * state.steps);
    if (s > step()) {
      state.show = null;
      runTo(s, 3);
      toast(`Running to ${maOf(s).toFixed(1)} million years ago`);
    } else toast('You can only run forward. Restart to go back.');
  });
}

function updateBar() {
  const playing = state.running;
  const b = $('play');
  const mode = playing ? 'pause' : state.done ? 'again' : 'play';
  if (b.dataset.mode !== mode) {
    b.dataset.mode = mode;
    b.innerHTML = `${ICONS[mode]}<span>${mode === 'pause' ? 'Pause' : mode === 'again' ? 'Again' : 'Play'}</span>`;
    b.setAttribute('aria-label', mode === 'pause' ? 'Pause' : mode === 'again' ? 'Run again from the start' : 'Play');
  }
  const h = last();
  $('ma').textContent = (h ? h.ma : 560).toFixed(1);
  $('period').textContent = h && h.ma <= 538.8 ? 'million years ago · Cambrian' : 'million years ago · Ediacaran';
  const t = step() / state.steps;
  $('tl-fill').style.width = `${(t * 100).toFixed(2)}%`;
  $('timeline').setAttribute('aria-valuenow', String(step()));
  $('timeline').setAttribute('aria-valuetext', `${maOf(step()).toFixed(1)} million years ago`);
}

function toast(text) {
  const t = $('toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), 2600);
}

function showError(message) {
  const e = $('error');
  e.textContent = `The simulation stopped: ${message.split('\n')[0]}`;
  e.hidden = false;
  state.running = false;
  state.dirty = true;
}

// ---------------------------------------------------------------- picture

const SCENE_LABELS = {
  sea: 'The sea floor seen from the side, with the animals drawn from their traits',
  plans: 'Spindles showing how many species of each body plan were alive through time',
  fossils: 'The commonest species alive now, drawn as flattened fossils on a slab of mudstone',
};

function renderViews() {
  $('views').innerHTML = VIEWS.map((v) => `<button type="button" class="chip" data-view="${v.key}" aria-pressed="${v.key === state.view}">${esc(v.label)}</button>`).join('');
  $('views').addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]');
    if (b) setView(b.dataset.view);
  });
}

function setView(key) {
  state.view = key;
  store.set('view', key);
  scene.setView(key);
  $('scene-wrap').dataset.view = key;
  for (const b of document.querySelectorAll('#views [data-view]')) b.setAttribute('aria-pressed', String(b.dataset.view === key));
  $('scene').setAttribute('aria-label', SCENE_LABELS[key]);
  state.legendKey = '';
  updateLegend();
  requestAnimationFrame(sizeCanvases);
}

// The legend lists the body plans alive now, commonest first.
function updateLegend() {
  const h = last();
  if (state.view === 'fossils') {
    if (state.legendKey !== 'fossils') {
      state.legendKey = 'fossils';
      $('legend').innerHTML = '<span class="key faint">tap a fossil to see the animal it was</span>';
    }
    return;
  }
  const alive = h ? GROUPS.map((g, i) => [g, h.indiv[i], i]).filter((x) => x[1] > 0) : [];
  alive.sort((a, b) => b[1] - a[1]);
  const key = `${state.view}:${alive.map((x) => x[2]).join(',')}`;
  if (key === state.legendKey) return;
  state.legendKey = key;
  $('legend').innerHTML =
    alive.map(([g]) => `<span class="key"><i style="background:${g.color}"></i>${esc(g.name.toLowerCase())}</span>`).join('') +
    `<span class="key faint">${state.view === 'sea' ? 'drag to move along, tap an animal' : 'tap a name'}</span>`;
}

function wireScene() {
  const c = $('scene');
  let drag = null;
  c.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, moved: 0, id: e.pointerId };
  });
  c.addEventListener('pointermove', (e) => {
    if (!drag || drag.id !== e.pointerId || state.view !== 'sea') return;
    const dx = e.clientX - drag.x;
    drag.moved += Math.abs(dx) + Math.abs(e.clientY - drag.y);
    drag.x = e.clientX;
    drag.y = e.clientY;
    if (drag.moved > 6) {
      c.setPointerCapture?.(e.pointerId);
      scene.pan(dx);
    }
  });
  const end = (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const tap = drag.moved <= 6;
    drag = null;
    if (!tap || e.type === 'pointercancel') return;
    const r = c.getBoundingClientRect();
    const hit = scene.hitAt(e.clientX - r.left, e.clientY - r.top);
    if (!hit) return;
    if (hit.kind === 'group') groupSheet(hit.group);
    else speciesSheet(hit.species, hit.traits);
  };
  c.addEventListener('pointerup', end);
  c.addEventListener('pointercancel', end);
  $('zoom-in').addEventListener('click', () => scene.zoomBy(1.6));
  $('zoom-out').addEventListener('click', () => scene.zoomBy(1 / 1.6));
}

// ---------------------------------------------------------------- readouts and narrator

function renderReadouts() {
  $('readouts').innerHTML = READOUTS.map(
    (r) => `<button type="button" class="readout" data-explain="${r.key}">
      <span class="r-label">${esc(r.short ?? r.label)}</span>
      <span class="r-value" data-value="${r.key}">–</span>
      <span class="r-unit" data-unit="${r.key}">${typeof r.unit === 'string' ? esc(r.unit) : ''}</span></button>`,
  ).join('');
}

function updateReadouts() {
  const h = last();
  if (!h) return;
  for (const r of READOUTS) {
    const el = document.querySelector(`[data-value="${r.key}"]`);
    const v = r.value(h);
    if (el && el.textContent !== v) el.textContent = v;
    if (typeof r.unit === 'function') {
      const u = document.querySelector(`[data-unit="${r.key}"]`);
      const t = r.unit(h);
      if (u && u.textContent !== t) u.textContent = t;
    }
  }
}

const KIND_LABEL = { predator: 'Hunters', burrow: 'Digging', armour: 'Armour', eye: 'Eyes', group: 'Body plan', world: 'Sea floor', date: 'Date', lab: 'You' };

function updateNarrator(now) {
  const h = last();
  let html;
  if (!h) html = 'Filling the sea…';
  else if (state.note && now - state.note.at < 7000 && step() - state.note.step < 30) html = `<span class="tag tag-${state.note.kind}">${KIND_LABEL[state.note.kind] ?? ''}</span> ${esc(state.note.text)}`;
  else html = narrate(h);
  if (html !== state.narratorHtml) {
    state.narratorHtml = html;
    $('narrator').innerHTML = html;
  }
}

// ---------------------------------------------------------------- charts and events

function themeColors() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n) => cs.getPropertyValue(n).trim();
  return {
    ink: v('--ink'),
    ink2: v('--ink-2'),
    ink3: v('--ink-3'),
    line: v('--line'),
    plot: v('--plot'),
    ref: v('--ref'),
    species: v('--c-species'),
    armour: v('--c-armour'),
    eye: v('--c-eye'),
    hunter: v('--c-hunter'),
    burrow: v('--c-burrow'),
    mat: v('--c-mat'),
    oxygen: v('--c-oxygen'),
  };
}
let colors = null;

function drawCharts(now) {
  if (!colors) colors = themeColors();
  charts.points = state.points;
  charts.cursor = state.cursor;
  charts.draw(colors);
  state.chartsDirty = false;
  state.lastCharts = now;
  updateCaption();
}

function updateCaption() {
  const h = state.cursor !== null ? charts.pointAt(state.cursor) : last();
  if (!h) return;
  const n = (key, text) => `<button type="button" class="num" data-explain="${key}" data-step="${h.step}">${text}</button>`;
  $('chart-caption').innerHTML =
    `<b>${state.cursor !== null ? 'At' : 'Now, at'} ${h.ma.toFixed(1)} million years ago:</b> ` +
    `${n('species', `${fmt.int(h.species)} species`)} in ${h.nGroups} body plans · disparity ${n('disparity', fmt.num(h.disparity, 2))} · ` +
    `skeletons ${n('armour', fmt.pct(h.armour))} · eyes ${n('eyes', fmt.pct(h.eyes))} · hunters ${n('hunters', fmt.pct(h.carn))} · ` +
    `biggest hunter ${n('bigPred', h.bigPred > 0 ? fmt.len(h.bigPred) : 'none')} · mats ${n('mat', fmt.pct(h.mat))}`;
}

function wireCharts() {
  const c = $('charts');
  const move = (e) => {
    const r = c.getBoundingClientRect();
    const s = charts.stepAt(e.clientX - r.left);
    state.cursor = state.points.length ? Math.min(s, step()) : null;
    state.chartsDirty = true;
  };
  c.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') move(e);
  });
  c.addEventListener('pointerdown', move);
  c.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') {
      state.cursor = null;
      state.chartsDirty = true;
    }
  });
}

function addEvent(n) {
  const li = document.createElement('li');
  li.dataset.step = String(n.step);
  li.innerHTML = `<span class="ev-age">${n.ma.toFixed(1)}</span><span class="tag tag-${n.kind}">${KIND_LABEL[n.kind] ?? ''}</span><span class="ev-text">${esc(n.text)}</span>`;
  $('events').prepend(li);
}

// ---------------------------------------------------------------- tabs and layout

function setTab(tab) {
  if (tab === 'watch' && WIDE.matches) tab = 'learn';
  state.tab = tab;
  store.set('tab', tab);
  for (const b of document.querySelectorAll('[data-tab]')) {
    const on = b.dataset.tab === tab;
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
  }
  for (const p of document.querySelectorAll('.panel')) p.classList.toggle('active', p.dataset.panel === tab || (p.dataset.panel === 'watch' && WIDE.matches));
  $('back-to-lesson').hidden = !(state.fromLesson && tab === 'watch');
  if (tab === 'watch' || WIDE.matches) requestAnimationFrame(sizeCanvases);
  if (tab === 'check') renderCheck();
}

function placePanels() {
  const watch = $('panel-watch');
  if (WIDE.matches) $('main-col').appendChild(watch);
  else $('side').insertBefore(watch, $('panel-learn'));
  setTab(state.tab);
  sizeCanvases();
}

function sizeCanvases() {
  scene.resize();
  charts.resize();
  state.chartsDirty = true;
}

// ---------------------------------------------------------------- Learn

function renderLearn() {
  const ch = CHAPTERS[state.chapter];
  const i = state.chapter;
  const ans = state.answers[ch.id];
  const pr = ch.predict;
  const options = pr
    ? pr.options
        .map((o, k) => {
          const cls = ans === undefined ? '' : o.right ? ' right' : k === ans ? ' wrong' : ' dim';
          return `<button type="button" class="option${cls}" data-option="${k}" ${ans !== undefined ? 'aria-disabled="true"' : ''}>${esc(o.text)}</button>`;
        })
        .join('')
    : '';
  const verdict = ans === undefined || !pr ? '' : pr.options[ans]?.right ? 'Right.' : 'Not quite.';
  $('panel-learn').innerHTML = `
    <div class="chapter-nav">
      <span class="kicker">Chapter ${i + 1} of ${CHAPTERS.length}</span>
      <div class="dots">${CHAPTERS.map((c, k) => `<button type="button" class="dot${k === i ? ' on' : ''}${state.answers[c.id] !== undefined ? ' done' : ''}" data-chapter="${k}" aria-label="Chapter ${k + 1}: ${esc(c.title)}"></button>`).join('')}</div>
    </div>
    <article class="chapter">
      <h2>${esc(ch.title)}</h2>
      ${ch.body.map((p) => `<p>${markup(p)}</p>`).join('')}
      ${
        pr
          ? `<div class="predict">
        <p class="kicker">Predict first</p>
        <p class="predict-q">${esc(pr.q)}</p>
        <div class="options">${options}</div>
        <p class="predict-a" ${ans === undefined ? 'hidden' : ''}><b>${verdict}</b> ${markup(pr.explain)}</p>
      </div>`
          : ''
      }
      <div class="show">
        <button type="button" class="btn primary" data-show="${i}">${ch.show.tab === 'lab' ? 'Open the Lab' : ch.show.tab === 'check' ? 'Open Validation' : 'Show me'}</button>
        ${ch.look ? `<p class="look" data-look="${ch.id}" hidden><b>Look:</b> ${markup(ch.look)}</p>` : ''}
      </div>
    </article>
    <div class="pager">
      <button type="button" class="btn ghost" data-chapter="${i - 1}" ${i === 0 ? 'disabled' : ''}>← Previous</button>
      <button type="button" class="btn ghost" data-chapter="${i + 1}" ${i === CHAPTERS.length - 1 ? 'disabled' : ''}>Next →</button>
    </div>
    <details class="glossary">
      <summary>Glossary</summary>
      <dl>${Object.entries(GLOSSARY)
        .sort((a, b) => a[1][0].localeCompare(b[1][0]))
        .map(([k, [t, d]]) => `<dt id="term-${k.replace(/\s+/g, '-')}">${esc(t)}</dt><dd>${esc(d)}</dd>`)
        .join('')}</dl>
    </details>`;
}

function wireLearn() {
  $('panel-learn').addEventListener('click', (e) => {
    const nav = e.target.closest('[data-chapter]');
    if (nav && !nav.disabled) {
      const k = Number(nav.dataset.chapter);
      if (k >= 0 && k < CHAPTERS.length) {
        state.chapter = k;
        store.set('chapter', k);
        renderLearn();
        reveal($('panel-learn'));
      }
      return;
    }
    const opt = e.target.closest('[data-option]');
    if (opt) {
      const ch = CHAPTERS[state.chapter];
      if (state.answers[ch.id] !== undefined) return;
      state.answers[ch.id] = Number(opt.dataset.option);
      store.set('answers', state.answers);
      renderLearn();
      return;
    }
    const show = e.target.closest('[data-show]');
    if (show) showMe(CHAPTERS[Number(show.dataset.show)]);
  });
}

// ---------------------------------------------------------------- Lab

const TOGGLE_TEXT = {
  predators: ['Predators', 'animals can evolve to eat animals'],
  eyes: ['Eyes', 'animals can evolve eyes'],
  burrowing: ['Digging', 'animals can evolve to burrow into the mud'],
  armour: ['Skeletons', 'animals can evolve mineral skeletons'],
};
const INJECT = [
  { kind: 'predator', label: 'Release giant hunters', note: 'Eight sharp-eyed swimming predators, 50 cm long, join the run.' },
  { kind: 'extinction', label: 'Mass extinction', note: 'Seven in ten animals die at random.' },
  { kind: 'blind', label: 'Take away all eyes', note: 'Every animal goes blind; eyes can evolve again.' },
];
const sliderText = (r, v) => (r.unit === 'pct' ? `${Math.round(v * 100)} %` : `× ${v.toFixed(1)}`);

let labWired = false;
function renderLab() {
  const p = { ...state.defaults, ...(state.scenarios[state.scenario]?.params ?? {}), ...state.labParams };
  const own = state.seed !== DEFAULT_SEED;
  $('panel-lab').innerHTML = `
    <h2>Lab</h2>
    <p class="lede">Change the world, then run history again. The same settings and seed always give the same run.</p>
    <h3>Start from</h3>
    <div class="scenarios" role="radiogroup">
      ${Object.entries(state.scenarios)
        .map(
          ([k, s]) => `<button type="button" class="scenario" role="radio" aria-checked="${k === state.scenario}" data-scenario="${k}">
            <b>${esc(s.label)}</b><span>${esc(s.blurb)}</span></button>`,
        )
        .join('')}
    </div>
    <h3>Chance</h3>
    <p class="hint">Which mutations happen, who meets whom and who gets eaten all come from a seed. Try a few: this is replaying the tape.</p>
    <div class="seed-row">
      <button type="button" class="chip" data-seedmode="default" aria-pressed="${!own}">The default run</button>
      <button type="button" class="chip" data-seedmode="random" aria-pressed="${own}">Another seed</button>
      <label class="seed-field" ${own ? '' : 'hidden'}><span>Seed</span><input id="seed" type="text" value="${own ? esc(state.seed) : ''}" maxlength="16" autocomplete="off"></label>
      <button type="button" class="btn ghost small" data-newseed ${own ? '' : 'hidden'}>New seed</button>
    </div>
    <h3>Change the rules</h3>
    <p class="hint">Changes work from now on. Press Restart to run the whole history with them.</p>
    <div class="sliders">
      ${Object.entries(state.ranges)
        .map(
          ([key, r]) => `<label class="slider"><span class="s-label">${esc(r.label)}</span><output data-out="${key}">${esc(sliderText(r, p[key]))}</output>
          <input type="range" id="lab-${key}" data-param="${key}" min="${r.min}" max="${r.max}" step="${r.step}" value="${p[key]}"></label>`,
        )
        .join('')}
    </div>
    <div class="toggles">
      ${state.toggles
        .map((k) => `<label class="toggle"><input type="checkbox" id="lab-${k}" data-param="${k}" ${p[k] ? 'checked' : ''}><span><b>${esc(TOGGLE_TEXT[k][0])}</b> ${esc(TOGGLE_TEXT[k][1])}</span></label>`)
        .join('')}
    </div>
    <div class="lab-actions">
      <button type="button" class="btn primary" data-labrestart>Restart with these settings</button>
      <button type="button" class="btn ghost" data-labreset>Back to the defaults</button>
    </div>
    <h3>Do something now</h3>
    <div class="injects">
      ${INJECT.map((x) => `<button type="button" class="inject" data-inject="${x.kind}"><b>${esc(x.label)}</b><span>${esc(x.note)}</span></button>`).join('')}
    </div>`;
  if (!labWired) wireLab();
}

const SEEDS = ['marrella', 'wiwaxia', 'pikaia', 'ottoia', 'aysheaia', 'sidneyia', 'yohoia', 'waptia', 'canadaspis', 'leanchoilia', 'odaraia', 'helmetia'];
const randomSeed = () => (Math.random() < 0.5 ? SEEDS[Math.floor(Math.random() * SEEDS.length)] : String(Math.floor(1000 + Math.random() * 9000)));

function wireLab() {
  labWired = true;
  const panel = $('panel-lab');
  panel.addEventListener('click', (e) => {
    const sc = e.target.closest('[data-scenario]');
    if (sc) {
      state.show = null;
      startRun({ scenario: sc.dataset.scenario, params: {}, then: () => toast(`${state.scenarios[sc.dataset.scenario].label}: press Play`) });
      return;
    }
    const sm = e.target.closest('[data-seedmode]');
    if (sm) {
      startRun({ seed: sm.dataset.seedmode === 'default' ? DEFAULT_SEED : randomSeed() });
      return;
    }
    if (e.target.closest('[data-newseed]')) {
      startRun({ seed: randomSeed() });
      return;
    }
    if (e.target.closest('[data-labrestart]')) {
      startRun();
      return;
    }
    if (e.target.closest('[data-labreset]')) {
      startRun({ params: {} });
      return;
    }
    const inj = e.target.closest('[data-inject]');
    if (inj) {
      host.send({ type: 'inject', kind: inj.dataset.inject });
      state.custom = true;
      reveal($('stage'));
    }
  });
  panel.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.dataset.param || el.type !== 'range') return;
    const r = state.ranges[el.dataset.param];
    panel.querySelector(`[data-out="${el.dataset.param}"]`).textContent = sliderText(r, Number(el.value));
  });
  panel.addEventListener('change', (e) => {
    const el = e.target;
    if (el.id === 'seed') {
      const seed = el.value.trim();
      if (seed) startRun({ seed });
      return;
    }
    const key = el.dataset.param;
    if (!key) return;
    const v = el.type === 'checkbox' ? el.checked : Number(el.value);
    state.labParams[key] = v;
    host.send({ type: 'set', patch: { [key]: v } });
    state.custom = true;
  });
}

// ---------------------------------------------------------------- Validation

const HOW = {
  emerges: ['Emerges', 'Nothing in the model aims at this number.'],
  tuned: ['Tuned', 'Constants were chosen so this lands near the real value.'],
  'built in': ['Built in', 'A rule of the model makes this happen; the check shows it plays out.'],
};
const howClass = (h) => `how how-${h.split(' ')[0]}`;

// The checks on this page's own run, once it has finished.
function ownRun() {
  const first = {};
  for (const n of state.notes) if (n.key && first[n.key] === undefined) first[n.key] = n.ma;
  return { history: state.points, first, burgess: null };
}

function renderCheck() {
  const canScore = state.done && state.points.length > state.steps;
  const mine = state.checkView === 'run' && canScore;
  const res = mine ? evaluate(ownRun()) : (state.validation ?? BUILT);
  const fromBuild = !state.validation && !mine;
  const checks = res
    ? res.checks
        .map(
          (c) => `<li class="check ${c.pass ? 'pass' : 'miss'}">
          <div class="check-head"><span class="badge">${c.pass ? 'Match' : 'Miss'}</span><span class="check-what">${esc(c.title)}</span></div>
          <dl><dt>Model</dt><dd>${esc(c.model)}</dd><dt>Real</dt><dd>${esc(c.real)}</dd></dl>
          <p class="source"><span class="${howClass(c.how)}" title="${esc(HOW[c.how][1])}">${HOW[c.how][0]}</span> ${esc(c.source)}</p></li>`,
        )
        .join('')
    : '<li class="check">Press the button to run the check.</li>';
  $('panel-check').innerHTML = `
    <h2>Validation</h2>
    <p class="lede">The default run from 560 to 500 million years ago, plus three what-if runs, set beside the fossil record. Each pass mark is written down with its source, and a miss is shown, not hidden. Where a mark or the model was tuned, the check says so.</p>
    <div class="check-tabs" role="radiogroup">
      <button type="button" class="chip" data-checkview="model" aria-pressed="${!mine}">The default run</button>
      <button type="button" class="chip" data-checkview="run" aria-pressed="${mine}" ${canScore ? '' : 'disabled'}>Your run${canScore ? '' : ' (finish it first)'}</button>
    </div>
    ${res ? `<p class="score"><b>${res.passed}</b> of ${res.total} checks match the fossils</p>` : ''}
    <div class="check-run" ${mine ? 'hidden' : ''}>
      <span class="hint">${fromBuild ? 'Computed when this page was built.' : 'Computed just now, in your browser.'}</span>
      <button type="button" class="btn ghost small" data-validate>Run it again here</button>
      <span class="progress" id="check-progress" hidden><span></span></span>
    </div>
    ${mine ? '<p class="hint">Your run is scored on the checks that need only one run; the what-if checks need their own runs.</p>' : ''}
    <dl class="how-key">${Object.entries(HOW)
      .map(([k, [t, d]]) => `<dt><span class="${howClass(k)}">${t}</span></dt><dd>${esc(d)}</dd>`)
      .join('')}</dl>
    <ol class="checks">${checks}</ol>
    <h3>Other seeds</h3>
    <p>The default seed, opabinia, was picked from many because it matches all of these checks. Other seeds match fewer, 8 of 11 on average over 20 other seeds. In all 20, hunters come before skeletons, body plans spread out at least twice as far, and the world without predators stays plainer. But the dates move by millions of years, skeletons come before sharp eyes in only 11 of 20, arthropods are the richest group at Burgess Shale time in 10, and the biggest hunter then reaches 8 cm in only 5. The README in the code lists every seed.</p>
    <h3>About the model</h3>
    ${ABOUT_MODEL.map((p) => `<p>${esc(p)}</p>`).join('')}`;
}

function wireCheck() {
  $('panel-check').addEventListener('click', async (e) => {
    const v = e.target.closest('[data-checkview]');
    if (v && !v.disabled) {
      state.checkView = v.dataset.checkview;
      renderCheck();
      return;
    }
    const run = e.target.closest('[data-validate]');
    if (run && !run.disabled) {
      run.disabled = true;
      run.textContent = 'Running…';
      $('check-progress').hidden = false;
      try {
        state.validation = await host.validate((p) => {
          const b = $('check-progress');
          if (b) b.firstElementChild.style.width = `${Math.round((100 * p.step) / p.total)}%`;
        });
      } catch (err) {
        showError(String(err.message ?? err));
      }
      renderCheck();
    }
  });
}

// ---------------------------------------------------------------- the sheet

function openSheet(html) {
  $('sheet-body').innerHTML = html;
  $('sheet').hidden = false;
  $('sheet-backdrop').hidden = false;
  $('sheet-close').focus({ preventScroll: true });
}

function closeSheet() {
  $('sheet').hidden = true;
  $('sheet-backdrop').hidden = true;
}

function explainSheet(key, at) {
  const h = at !== undefined ? (state.points.find((p) => p.step === at) ?? last()) : last();
  if (!h) return;
  const ex = explain(key, h);
  if (!ex) return;
  openSheet(`
    <p class="kicker">${at !== undefined ? 'At' : 'Now, at'} ${h.ma.toFixed(1)} million years ago</p>
    <h2>${esc(ex.title)}</h2>
    <p class="sheet-value">${esc(ex.value)}</p>
    ${ex.html
      .filter(Boolean)
      .map((p) => `<p>${p}</p>`)
      .join('')}
    ${ex.chart ? `<button type="button" class="btn ghost small" data-gochart="${ex.chart}">See it on the charts</button>` : ''}`);
}

function termSheet(key) {
  const g = GLOSSARY[key];
  if (!g) return;
  openSheet(`<p class="kicker">Glossary</p><h2>${esc(g[0])}</h2><p>${esc(g[1])}</p>`);
}

const TRAIT_ROWS = [
  [1, 'Moving', 'from fixed to the floor to always on the move'],
  [2, 'Segments', 'a body of repeated parts'],
  [3, 'Legs', 'for walking and raking the mud'],
  [4, 'Swimming', 'flaps along the sides'],
  [5, 'Eyes', 'from eye spots to eyes with lenses'],
  [6, 'Skeleton', 'shells, plates or a tube'],
  [7, 'Spines', 'harder to swallow'],
  [8, 'Jaws', 'a wider mouth that breaks shells'],
  [9, 'Digging', 'into the mud'],
  [10, 'Hunting', 'how much of its food is other animals'],
  [11, 'Filtering', 'straining plankton from the water'],
];

function speciesSheet(s, traits) {
  const t = traits ?? s.mean;
  const g = GROUPS[s.group];
  const L = lengthOf(t[0]);
  const born = s.born !== undefined ? `It appeared ${(560 - s.born * 0.1).toFixed(1)} million years ago` : '';
  openSheet(`
    <p class="kicker">${traits ? 'One animal of the species' : 'A species, as its average animal'}</p>
    <h2><i>${esc(s.name)}</i></h2>
    <p class="sheet-value">${esc(g.one[0].toUpperCase() + g.one.slice(1))}, like ${esc(g.like)} · ${esc(fmt.len(L))} long</p>
    <canvas class="portrait" id="portrait" width="320" height="150" role="img" aria-label="A drawing of ${esc(s.name)}"></canvas>
    <p>${s.count ? `${fmt.int(s.count)} animals of this species are alive now. ` : ''}${born ? `${born}.` : ''}</p>
    <ul class="traits">${TRAIT_ROWS.map(
      ([k, name, about]) =>
        `<li><span class="t-name">${name}</span><span class="t-bar"><i style="width:${Math.round(t[k] * 100)}%"></i></span><span class="t-about">${esc(about)}</span></li>`,
    ).join('')}</ul>`);
  const c = $('portrait');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = c.clientWidth || 320;
  const hgt = c.clientHeight || 150;
  c.width = Math.round(w * dpr);
  c.height = Math.round(hgt * dpr);
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sessile = t[1] < 0.2;
  const len = sessile ? hgt * 0.62 : Math.min(w * 0.6, hgt * 1.6);
  drawAnimal(ctx, t, w / 2, sessile ? hgt * 0.92 : hgt * 0.5, len, 1, 1.2, speciesColor(s.id, s.group), 'live');
}

const GROUP_RULE = {
  frond: 'Fixed to the floor, not hunting and without a skeleton.',
  tube: 'Fixed to the floor, inside a mineral tube.',
  polyp: 'Fixed to the floor, catching animals that pass.',
  soft: 'Moving over the floor without legs, flaps, a skeleton or spines.',
  burrower: 'Moving, without legs or flaps, and living mostly in the mud.',
  shelled: 'Crawling under a mineral shell.',
  spiny: 'Crawling, covered in spines and plates.',
  lobopod: 'Walking on legs, with a soft, barely segmented body.',
  arthropod: 'Walking on legs, with a segmented body.',
  swimmer: 'Swimming with flaps, not a big hunter.',
  radiodont: 'A swimming hunter with jaws and grasping arms.',
};

function groupSheet(gi) {
  const g = GROUPS[gi];
  const h = last();
  const n = h ? h.groups[gi] : 0;
  const sp = (state.frame?.fauna ?? []).filter((s) => s.group === gi).slice(0, 4);
  openSheet(`
    <p class="kicker">Body plan</p>
    <h2>${esc(g.name)}</h2>
    <p class="sheet-value">${n ? `${fmt.int(n)} species alive now` : 'None alive now'}</p>
    <p>Real animals with this kind of body: ${esc(g.like)}.</p>
    <p><b>How the model sorts a species here:</b> ${esc(GROUP_RULE[g.key])}</p>
    ${sp.length ? `<p>The commonest now: ${sp.map((s) => `<button type="button" class="term" data-species="${s.id}"><i>${esc(s.name)}</i></button>`).join(', ')}.</p>` : ''}`);
}

function wireGlobal() {
  document.addEventListener('click', (e) => {
    const t = e.target.closest('.term[data-term]');
    if (t) {
      termSheet(t.dataset.term);
      return;
    }
    const sp = e.target.closest('[data-species]');
    if (sp) {
      const s = (state.frame?.fauna ?? []).find((q) => q.id === Number(sp.dataset.species));
      if (s) speciesSheet(s);
      return;
    }
    const n = e.target.closest('[data-explain]');
    if (n) {
      explainSheet(n.dataset.explain, n.dataset.step !== undefined ? Number(n.dataset.step) : undefined);
      return;
    }
    const go = e.target.closest('[data-gochart]');
    if (go) {
      closeSheet();
      focusCharts();
      return;
    }
    const ev = e.target.closest('#events li');
    if (ev) {
      state.cursor = Number(ev.dataset.step);
      state.chartsDirty = true;
      reveal($('charts'), 'center');
    }
  });
  $('sheet-close').addEventListener('click', closeSheet);
  $('sheet-backdrop').addEventListener('click', closeSheet);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('sheet').hidden) closeSheet();
  });
  $('scene-help').addEventListener('click', () => {
    const v = VIEWS.find((x) => x.key === state.view) ?? VIEWS[0];
    openSheet(`<p class="kicker">The picture: ${esc(v.label)}</p><h2>How to read it</h2>${PICTURE_HELP[v.key].map((p) => `<p>${esc(p)}</p>`).join('')}`);
  });
  $('tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) {
      if (b.dataset.tab !== 'watch') state.fromLesson = false;
      setTab(b.dataset.tab);
    }
  });
  $('tabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const tabs = [...document.querySelectorAll('[data-tab]')].filter((b) => b.offsetParent !== null);
    const i = tabs.findIndex((b) => b.dataset.tab === state.tab);
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    setTab(next.dataset.tab);
    next.focus();
  });
  $('back-to-lesson').addEventListener('click', () => {
    state.fromLesson = false;
    setTab('learn');
    reveal($('panel-learn'));
  });
}

// ---------------------------------------------------------------- the loop

function tick(now) {
  scene.draw(now);
  if (state.dirty) {
    state.dirty = false;
    updateBar();
    updateReadouts();
    updateLegend();
  }
  updateNarrator(now);
  if (state.chartsDirty && (now - state.lastCharts > 150 || !state.running)) drawCharts(now);
  requestAnimationFrame(tick);
}

function boot() {
  renderBar();
  renderViews();
  renderReadouts();
  renderLearn();
  wireLearn();
  wireCheck();
  wireCharts();
  wireScene();
  wireGlobal();
  renderCheck();
  scene.setView(state.view);
  $('scene-wrap').dataset.view = state.view;
  $('scene').setAttribute('aria-label', SCENE_LABELS[state.view]);
  placePanels();
  WIDE.addEventListener?.('change', placePanels);
  const bar = $('bar');
  const barSize = () => document.documentElement.style.setProperty('--bar-h', `${bar.offsetHeight}px`);
  new ResizeObserver(barSize).observe(bar);
  barSize();
  const ro = new ResizeObserver(() => sizeCanvases());
  ro.observe($('scene'));
  ro.observe($('charts'));
  const theme = window.matchMedia('(prefers-color-scheme: dark)');
  theme.addEventListener?.('change', () => {
    colors = null;
    state.chartsDirty = true;
  });
  new MutationObserver(() => {
    colors = null;
    state.chartsDirty = true;
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  host = createHost(onSim);
  window.__cam = { state, host, scene };
  resumeOnUpdate();
  requestAnimationFrame(tick);
}

// When a new version of the page is published while it is open, carry on
// from where the reader was. The same seed and settings always give the
// same run, so running back to the same step restores it (Lab buttons
// pressed along the way are not replayed).
function resumeOnUpdate() {
  const hot = window.claude?.hot;
  let started = false;
  const start = (data) => {
    if (started) return;
    started = true;
    const d = data && typeof data === 'object' ? data : {};
    const at = Number(d.step);
    startRun({
      seed: typeof d.seed === 'string' && d.seed ? d.seed : DEFAULT_SEED,
      scenario: typeof d.scenario === 'string' ? d.scenario : 'real',
      params: d.params && typeof d.params === 'object' ? d.params : {},
      then: Number.isFinite(at) && at > 0 ? () => runTo(at) : null,
    });
  };
  try {
    hot?.snapshot?.(() => ({ seed: state.seed, scenario: state.scenario, params: { ...state.labParams }, step: step() }));
    if (hot?.ready) {
      hot.ready(start);
      setTimeout(() => start({}), 1500);
    } else start(hot?.data ?? {});
  } catch {
    start({});
  }
}

boot();
