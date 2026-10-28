/* The import dashboard: every book's steps from GET /api/admin/status (tools/book_status.py), jobs
   run through /api/admin/run and followed by polling, hand steps marked through /api/admin/mark, the
   sheets and the map editor inside the step they belong to, and the agent steps' prompts.
   The window holds a rail of books, the picked book's steps as tabs with one step shown, and the
   step's sheet under it; only the panes scroll. Where you are is kept in the address (#/<code>/<step>).
   docs/reference/dashboard.md. */
import { PROMPTS } from './prompts.js';

const PY = 'uv run --project tools python';
const SIZE = 'about 400 files, about 4 MB';  // Books 1, 6 and 12 as downloaded

/* The columns, in the checklist's order. kind: who does it. step: its row in docs/book-checklist.md. */
const STAGES = [
  { id: 'fetch', group: 'Getting the book', label: 'Download', kind: 'script', step: 1 },
  { id: 'import', group: 'Getting the book', label: 'Import', kind: 'script', step: 2 },
  { id: 'phrasings', group: 'Getting the book', label: 'Phrasings', kind: 'agent', step: 3 },
  { id: 'rules', group: 'Getting the book', label: 'Rules', kind: 'agent', step: 4 },
  { id: 'reading', group: 'Items', label: 'Reading copy', kind: 'script' },
  { id: 'items', group: 'Items', label: 'Item table', kind: 'agent', step: 5 },
  { id: 'testplay', group: 'Play', label: 'Test play', kind: 'agent', step: 6 },
  { id: 'pictures', group: 'Pictures', label: 'Fights', kind: 'agent', step: 7 },  // then your look at the sheet
  { id: 'map', group: 'Pictures', label: 'Map', kind: 'owner', step: 8 },
  { id: 'ills', group: 'Pictures', label: 'Illustrations', kind: 'script', step: 9 },
];
const SERIES = { kai: 'Kai', magnakai: 'Magnakai', 'grand master': 'Grand Master', 'new order': 'New Order' };
const WHO = { agent: 'Claude Code: copy the prompt', owner: 'yours', script: 'a script' };
// the step each sheet belongs to; a page not here spans the books, and takes the work area alone
const SHEET_STEP = { 'fights.html': 'pictures', 'proposals.html': 'pictures', 'items.html': 'items', 'ills.html': 'ills', 'map-editor.html': 'map' };

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const when = (t) => (t ? new Date(t).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'never');
let books = [], running = null;
/* where the owner is: the book, its step, the pane (steps, the grid of every book, a tool), every step at
   once, a sheet full window, the rail narrowed by hand (null: narrow while a sheet is open), the fold */
const ui = { code: null, step: null, view: 'steps', all: false, max: false, narrow: null, later: false };
const KEEP = 'lw-admin-layout';
try { const k = JSON.parse(localStorage.getItem(KEEP) || '{}'); Object.assign(ui, { code: k.code ?? null, all: !!k.all, narrow: k.narrow ?? null, later: !!k.later }); } catch { /* none kept */ }
const keep = () => { try { localStorage.setItem(KEEP, JSON.stringify({ code: ui.code, all: ui.all, narrow: ui.narrow, later: ui.later })); } catch { /* not kept */ } };

// ---------- status ----------
async function api(path, opts) {
  try {
    const r = await fetch('/api/admin/' + path, { cache: 'no-store', ...opts });
    return { status: r.status, j: await r.json().catch(() => ({})) };
  } catch (e) { return { status: 0, j: { error: String(e.message || e) } }; }
}
let first = true;
async function load() {
  const { status, j } = await api('status');
  if (status !== 200) {
    $('#loading').textContent = status === 403 ? 'The dashboard answers this PC only: open it at http://localhost:8766/tools/admin/.'
      : `No status from the server (${j.error || status}). Is it tools/serve.py, restarted since the dashboard was added?`;
    ui.view = 'overview'; layout();
    return;
  }
  books = j.books;
  running = j.running;
  if (first) { first = false; fromAddress(); }
  render();
  loadSetup();
}
const book = (code) => books.find((b) => b.code === code);

// ---------- setup: what the tools need on this PC (tools/setup.py, ADR 0036), under the bar's Setup ----------
let setup = [];
async function loadSetup() {
  const { status, j } = await api('setup');
  if (status !== 200 || !Array.isArray(j)) return;
  setup = j;
  renderSetup();
}
function renderSetup() {
  const el = $('#setup'), lack = setup.filter((r) => r.state === 'missing');
  const seal = (s) => (s === 'ok' ? 'done' : s === 'missing' ? 'todo' : 'na');
  el.hidden = false;
  $('#setup-seal').className = 'st ' + (lack.length ? 'warn' : 'done');
  $('#setup-btn').title = lack.length ? `${lack.length} part${lack.length === 1 ? '' : 's'} missing on this PC` : 'Everything the tools need is here';
  el.innerHTML = `<header><span class="kind" data-kind="script"></span><b>Setup</b>
      <span class="say">${lack.length ? `${lack.length} part${lack.length === 1 ? '' : 's'} missing on this PC` : 'Everything the tools need is here'}</span></header>` +
    setup.map((r, i) => `<div class="part"><span class="st ${seal(r.state)}"></span>
      <span class="kind" data-kind="${r.install ? 'script' : 'owner'}"></span><b>${esc(r.label)}</b>
      <div>${esc(r.detail)}<small>${esc(r.what)}</small></div>
      <div>${r.state === 'missing' && r.install ? `<button data-setup="${i}" ${running ? 'disabled title="a job is running"' : ''}>${r.gated ? 'Download...' : 'Install'}</button>` : ''}</div></div>`).join('');
}
$('#setup').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-setup]');
  if (!btn) return;
  const r = setup[+btn.dataset.setup];
  let confirm;
  if (r.gated) { confirm = await gate('setup', r); if (!confirm) return; }
  startJob('setup-' + r.id, '', confirm);
});
let reloadTimer;
const reloadSoon = () => { clearTimeout(reloadTimer); reloadTimer = setTimeout(load, 400); };

function nextStage(b) {
  // an undone step first; a step that is only stale or unticked after that
  return STAGES.find((s) => ['todo', 'bad'].includes(b.stages[s.id].state)) || STAGES.find((s) => b.stages[s.id].state === 'warn') || null;
}

function render() {
  $('#loading').hidden = true;
  renderGrid();
  renderRail();
  renderDetail(book(ui.code));
  layout();
}

// ---------- the grid of every book ("All books") ----------
function renderGrid() {
  const groups = [...new Set(STAGES.map((s) => s.group))];
  $('#grid thead').innerHTML =
    `<tr class="groups"><th></th>${groups.map((g) => `<th colspan="${STAGES.filter((s) => s.group === g).length}">${esc(g)}</th>`).join('')}<th></th></tr>` +
    `<tr><th class="book">Book</th>${STAGES.map((s) => `<th title="${esc(s.kind)}"><span class="kind" data-kind="${s.kind}"></span>${esc(s.label)}</th>`).join('')}<th class="book">Next</th></tr>`;
  const row = (b) => {
    const nx = nextStage(b);
    return `<tr data-code="${b.code}" class="${b.code === ui.code ? 'sel' : ''} ${!b.folder ? 'later' : ''}">
      <td class="book"><b>${b.n}</b><span>${esc(b.title)}</span><small>${b.code} · ${b.series}</small></td>
      ${STAGES.map((s, i) => {
        const x = b.stages[s.id];
        const gs = i && STAGES[i - 1].group !== s.group ? ' gstart' : '';
        return `<td class="${gs}" data-stage="${s.id}" title="${esc(s.label + ': ' + x.ev)}"><span class="st ${x.state}"></span></td>`;
      }).join('')}
      <td class="next">${nx ? `<span class="kind" data-kind="${nx.kind}" style="width:12px;height:12px;vertical-align:-1px"></span> ${esc(nx.label)}` : 'done'}</td></tr>`;
  };
  // a book not downloaded has only the download to offer, so it is folded away (ADR 0036)
  const now = books.filter((b) => b.folder), later = books.filter((b) => !b.folder);
  const runs = [...later].sort((a, b) => a.n - b.n).reduce((r, b) => { const last = r.at(-1); if (last && last[1] === b.n - 1) last[1] = b.n; else r.push([b.n, b.n]); return r; }, [])
    .map(([a, z]) => (a === z ? `${a}` : `${a}-${z}`)).join(', ');
  $('#grid tbody').innerHTML = now.map(row).join('') + (later.length
    ? `<tr class="fold"><td colspan="${STAGES.length + 2}">${ui.later ? '▾' : '▸'} Books ${runs}: not downloaded; each is offered every step that works for it once it is</td></tr>` +
      (ui.later ? later.map(row).join('') : '') : '');
}

// a cell takes you to that book at that step; the book's name, to its next step
$('#grid').addEventListener('click', (e) => {
  if (e.target.closest('tr.fold')) { ui.later = !ui.later; keep(); return render(); }
  const tr = e.target.closest('tbody tr[data-code]');
  if (!tr) return;
  pick(tr.dataset.code, e.target.closest('td[data-stage]')?.dataset.stage);
});

// ---------- the rail: a book a line, its steps as ten small seals ----------
function renderRail() {
  const row = (b) => `<button class="bk ${b.code === ui.code ? 'sel' : ''} ${b.folder ? '' : 'later'}" data-code="${b.code}" title="${esc(`${b.n}. ${b.title}`)}">
      <b class="n ${nextStage(b) ? '' : 'done'}">${b.n}</b><span class="t">${esc(b.title)}</span>
      <span class="dots">${STAGES.map((s) => `<i class="${b.stages[s.id].state}"></i>`).join('')}</span></button>`;
  let html = '', heading = null;
  for (const b of books.filter((x) => x.folder)) {
    const h = b.n >= 99 ? 'Demo' : SERIES[b.series] || b.series;  // the made-up demo book (ruling R20) comes last
    if (h !== heading) { heading = h; html += `<div class="series">${esc(h)}</div>`; }
    html += row(b);
  }
  const later = books.filter((b) => !b.folder);
  if (later.length) html += `<button class="fold" id="rail-later">${ui.later ? '▾' : '▸'} Not downloaded (${later.length})</button>` + (ui.later ? later.map(row).join('') : '');
  $('#rail-list').innerHTML = html;
  $('#rail-list .bk.sel')?.scrollIntoView?.({ block: 'nearest' });
}
$('#rail-list').addEventListener('click', (e) => {
  if (e.target.closest('#rail-later')) { ui.later = !ui.later; keep(); return render(); }
  const bk = e.target.closest('.bk');
  if (bk) pick(bk.dataset.code);
});

/* A book at a step (its next one, unless named; the same step when it is the book already open). */
function pick(code, step) {
  const b = book(code);
  if (!b) return;
  if (!b.folder && !ui.later) ui.later = true;
  const changed = ui.code !== code;
  ui.code = code;
  ui.step = step || (changed || !ui.step ? nextStage(b)?.id || 'fetch' : ui.step);
  if (step) ui.all = false;
  ui.view = 'steps';
  keep();
  render();
}
function toStep(id) { ui.step = id; ui.all = false; ui.view = 'steps'; layout(); }

// ---------- one book: its head, its steps as tabs, the step ----------
const ACTIONS = {
  fetch: (b) => b.stages.fetch.state === 'todo'
    ? [run('Download...', 'fetch', { gate: 'download' })]
    : [run('Fetch rules pages...', 'fetch-rules', { gate: 'rules' })],
  import: (b) => !b.known ? (b.folder ? [run('Add to importer', 'add-book'), prompt('newBook')] : [])
    : !b.folder ? [] : [run(b.imp ? 'Re-import...' : 'Import...', 'import', { gate: 'import' })],
  // the scan first (ADR 0036): what the importer left as text, by id; the agent judges each
  phrasings: (b) => [...(b.imp ? [run('Scan phrasings', 'phrasings-scan')] : []), prompt('phrasings'), mark(3)],
  // the diff first (ADR 0036): each rules page against the book before, and a skeleton addendum
  rules: (b) => [...(b.rulesPage ? [run('Diff rules', 'rules-diff')] : []), prompt('rules'), mark(4)],
  reading: () => [run('Make reading copy', 'reading')],
  // the draft first (ADR 0036); over a hand-made table it only writes items-draft.js beside the book, to compare
  items: (b) => [run(b.items.exists && !b.items.draft ? 'Draft and compare' : 'Draft table', 'items-draft'), prompt('items'), run('Check items', 'check-items'), ...(b.items.check?.errors?.length ? [prompt('itemsFix', 'Copy fix prompt')] : []),
    ...(b.items.exists ? [{ t: 'items', label: 'Open item sheet' }] : [])],
  // the draft first (ADR 0036), while an enemy has no picture: the script's picks, judged on the sheet
  pictures: (b) => [...(b.imp?.bare ? [run('Draft pictures', 'pictures-draft')] : []), prompt('pictures'), ...(b.proposals ? [{ t: 'proposals', label: `Open proposals (${b.proposals.open ? b.proposals.open + ' to settle' : 'all settled: Finish'})` }] : []), { t: 'sheet', label: 'Open picture sheet' }, run('Upscale 2x', 'fights-up'), mark(7),
    ...(b.pins?.waiting ? [run('Approve picture changes...', 'approve-pictures', { gate: 'pictures' })] : [])],
  // the walk first (ADR 0036): the engine over every section in Node, what is wrong by id; then the agent plays
  testplay: (b) => [...(b.imp ? [run('Walk the book', 'walk')] : []), prompt('testplay'), link('Test address', 'http://127.0.0.1:8766/'), mark(6)],
  map: () => [{ t: 'map', label: 'Open map editor' }],
  // made beside the originals, then shown by a re-import (gated, as always)
  ills: (b) => [run('Upscale 2x', 'ills'), { t: 'ills', label: 'Open illustration sheet' }, ...(b.stages.ills.state === 'warn' && b.known ? [run('Re-import...', 'import', { gate: 'import' })] : [])],
};
function run(label, stage, opt = {}) { return { t: 'run', label, stage, ...opt }; }
function prompt(key, label = 'Copy prompt') { return { t: 'prompt', key, label }; }
function link(label, href) { return { t: 'link', label, href }; }
function mark(step) { return { t: 'mark', step }; }

let acts = [];
function actHtml(a, b) {
  const i = acts.push({ ...a, b }) - 1;
  if (a.t === 'sheet' || a.t === 'proposals' || a.t === 'ills' || a.t === 'items') return `<button data-act="${i}">${esc(a.label)}</button>`;
  if (a.t === 'link') return `<a class="btn" href="${esc(a.href)}" target="_blank">${esc(a.label)}</a>`;
  if (a.t === 'mark') return `<button data-act="${i}">${b.marks[a.step] ? 'Mark not done' : 'Mark done'}</button>`;
  return `<button data-act="${i}" ${a.t === 'run' && running ? 'disabled title="a job is running"' : ''}>${esc(a.label)}</button>`;
}

async function renderDetail(b) {
  if (!b) { $('#bookhead').innerHTML = ''; $('#strip').innerHTML = ''; $('#detail').innerHTML = '<p class="hint">Pick a book to see its steps.</p>'; return; }
  acts = [];
  const nx = nextStage(b);
  $('#bookhead').innerHTML = `<h2>${b.n}. ${esc(b.title)}</h2>
    <span class="meta">${b.code} · ${b.series}${b.imp ? ` · ${b.imp.sections} sections, ${b.imp.fights} fights, ${b.imp.kinds} kinds of enemy` : ''}</span>
    ${nx ? `<button class="nextup" data-step="${nx.id}" title="${esc(WHO[nx.kind])}">Next: <b>${esc(nx.label)}</b> →</button>` : '<span class="nextup done">Every step done</span>'}
    <button class="away" id="back-sheet" hidden></button>`;
  // the tabs, under the grid's groups; a dot on the one whose sheet is open
  const groups = [...new Set(STAGES.map((s) => s.group))];
  $('#strip').innerHTML = groups.map((g) => `<div class="grp"><div class="gl">${esc(g)}</div><div class="tabs">${STAGES.filter((s) => s.group === g).map((s) =>
    `<button class="tab" data-step="${s.id}" title="${esc(b.stages[s.id].ev)}"><span class="tt"><span class="st ${b.stages[s.id].state}"></span><span class="kind" data-kind="${s.kind}"></span>${s.step ? `<small>${s.step}</small>` : ''}</span><span class="lb">${esc(s.label)}</span><span class="open" hidden>●</span></button>`).join('')}</div></div>`).join('') +
    '<div class="grp all"><div class="gl">&nbsp;</div><div class="tabs"><button class="tab" data-all="1" title="Every step at once (A)"><span class="tt">☰</span><span class="lb">All steps</span></button></div></div>';
  const steps = STAGES.map((s) => {
    const x = b.stages[s.id];
    const list = x.state === 'na' && s.id !== 'import' ? [] : ACTIONS[s.id]?.(b) || [];
    return `<div class="step" data-stage="${s.id}"><span class="st ${x.state}"></span><span class="kind" data-kind="${s.kind}"></span>
      <div class="what"><b>${s.step ? s.step + '. ' : ''}${esc(s.label)}</b><div class="ev">${esc(x.ev)}</div><div class="src">${x.src === 'disk' ? 'from the files' : 'marked by hand (docs/book-status.json)'}</div></div>
      <div class="acts">${list.map((a) => actHtml(a, b)).join('')}</div></div>`;
  }).join('');
  $('#detail').innerHTML = `${steps}<h3>Map, step by step</h3><div id="mapsteps"><p class="hint">${b.folder ? 'Reading the map files...' : 'After download.'}</p></div>`;
  layout();
  if (b.folder) renderMap(b, await (await fetch(`/api/map/${b.code}/state`, { cache: 'no-store' }).catch(() => null))?.json().catch(() => null));
}
window.addEventListener('click', (e) => {
  const t = e.target.closest('#strip [data-step], #bookhead [data-step]');
  if (t) return toStep(t.dataset.step);
  if (e.target.closest('#strip [data-all]')) { ui.all = !ui.all; ui.view = 'steps'; keep(); layout(); }
});

/* The map editor's rail, summarised: what is done, who does it, and the editor opened at that step. */
function renderMap(b, state) {
  if (ui.code !== b.code || !$('#mapsteps')) return;
  if (!state || !state.files) { $('#mapsteps').innerHTML = '<p class="hint">The map API did not answer.</p>'; return; }
  const f = state.files, has = (n) => n in f, rounds = state.rounds?.filter((n) => n > 0) || [];
  const last = rounds.at(-1);
  const ed = (step) => ({ t: 'map', label: 'Open', step });
  const rows = [
    ['Upscale the scan to 2K', 'script', has('map-2k.png'), 'map-2k.png', ed(1)],
    ['OCR draft of the labels', 'script', has('labels.json'), `maps/${b.code}/labels.json`, ed(2)],
    ['Correct every label by eye', 'owner', has('labels-checked.txt'), 'in the editor', ed(3)],
    ['Untick retype on captions', 'agent', has('labels-checked.txt'), 'the editor\'s Untick captions, then the prompt for what it missed', has('labels.json') ? prompt('mapRetype') : null],
    ['Labels checked', 'owner', has('labels-checked.txt'), 'labels-checked.txt', ed(3)],
    ['Draft the style', 'script', has('style.txt'), 'title and key from the label list', has('style.txt') || !has('labels-checked.txt') ? null : run('Draft style', 'map-style')],
    ['Style for the prompt', has('style.txt') && !state.styleDraft ? 'owner' : 'agent', has('style.txt') && !state.styleDraft,
      `maps/${b.code}/style.txt${state.styleDraft ? ': the draft, to refine' : ''}`, has('style.txt') && !state.styleDraft ? null : prompt('mapStyle')],
    ['Erase and letter the names', 'script', has('map-2k-lettered.jpg'), 'map-2k-lettered.jpg', ed(6)],
    ['Gemini repaint', 'owner', rounds.length > 0, rounds.length ? `${rounds.length} round(s), last ${last}` : 'in the Gemini app, outside', ed(7)],
    ['Check the round', 'script', last != null && Object.keys(f).some((k) => k.startsWith(`map-check-${last}/`)), last != null ? `map-check-${last}/` : '', ed(8)],
    ['Finish at 4K', 'script', has('map-4k.webp'), 'map-4k.webp', ed(9)],
    ['Re-import; shown in the player', 'script', b.imp?.map === 'map-4k.webp', 'book.js names map-4k.webp', ed(10)],
  ];
  $('#mapsteps').innerHTML = rows.map(([label, kind, ok, ev, act]) =>
    `<div class="step sub"><span class="st ${ok ? 'done' : 'todo'}"></span><span class="kind" data-kind="${kind}"></span>
      <div class="what"><b>${esc(label)}</b><div class="ev">${esc(ev)}</div></div>
      <div class="acts">${act ? actHtml(act, b) : ''}</div></div>`).join('');
}

$('#detail').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const a = acts[+btn.dataset.act];
  if (a.t === 'prompt') return copy(PROMPTS[a.key](a.b), 'Prompt copied: paste it into Claude Code');
  if (a.t === 'map') return openMap(a.b, a.step);
  if (a.t === 'sheet') return openSheet(a.b);
  if (a.t === 'proposals') return openProposals(a.b);
  if (a.t === 'ills') return openIlls(a.b);
  if (a.t === 'items') return openItems(a.b);
  if (a.t === 'mark') {
    const undo = !!a.b.marks[a.step];
    const { j } = await api(`mark/${a.b.code}/${a.step}${undo ? '?undo=1' : ''}`, { method: 'POST' });
    toast(j.message || j.error || 'Could not mark it', 5000);
    return load();
  }
  if (a.t === 'run') {
    let confirm;
    if (a.gate) {
      confirm = await gate(a.gate, a.b);
      if (!confirm) return;
    }
    startJob(a.stage, a.b.code, confirm);
  }
});

/* Which pane shows. Steps: the picked step; under it its sheet, when that is open for this book (the
   step shrinks to a bar over it). A tool: its sheet alone. The grid: every book. A sheet open
   elsewhere is kept, and the book's head offers the way back to it. */
function sheet() {
  const fr = $('#mapframe'), src = fr.dataset.src || '';
  if ($('#mapwrap').hidden || !src) return null;
  const page = src.split('?')[0].split('/').pop();
  return { page, step: SHEET_STEP[page] || null, book: fr.dataset.book || '', title: $('#map-title').textContent };
}
function layout() {
  const sh = sheet(), w = $('#work'), d = $('#detail');
  if (ui.view === 'tool' && (!sh || sh.step)) ui.view = 'steps';
  const here = sh && sh.step && sh.book === ui.code && sh.step === ui.step && !ui.all && ui.view === 'steps';
  const shown = here || (ui.view === 'tool');
  w.dataset.view = ui.view;
  w.classList.toggle('with-sheet', !!shown);
  $('#mapwrap').classList.toggle('off', !shown);
  d.classList.toggle('all', ui.all);
  d.dataset.step = ui.step || '';
  d.querySelectorAll(':scope > .step').forEach((s) => s.classList.toggle('on', s.dataset.stage === ui.step));
  document.querySelectorAll('#strip .tab[data-step]').forEach((t) => {
    t.classList.toggle('on', t.dataset.step === ui.step && !ui.all);
    t.querySelector('.open').hidden = !(sh && sh.book === ui.code && sh.step === t.dataset.step);
  });
  $('#strip [data-all]')?.classList.toggle('on', ui.all);
  const back = $('#back-sheet');
  if (back) { back.hidden = !sh || shown; if (sh) back.textContent = `${sh.title.split(':')[0]}${sh.book && sh.book !== ui.code ? `, Book ${book(sh.book)?.n}` : ''} open ↗`; }
  const shell = $('#shell');
  shell.classList.toggle('narrow', ui.narrow ?? !!(shown || ui.view === 'overview'));
  shell.classList.toggle('max', ui.max && !!shown);
  $('#rail-fold').textContent = shell.classList.contains('narrow') ? '»' : '«';
  $('#sheet-max').textContent = ui.max ? 'Leave full window' : 'Full window';
  $('#toolhead').innerHTML = ui.view === 'tool' && sh ? `<h2>${esc(sh.title)}</h2><span class="meta">for every book</span>` : '';
  $('#ov-btn').classList.toggle('on', ui.view === 'overview');
  document.querySelectorAll('#rail-list .bk').forEach((x) => x.classList.toggle('sel', x.dataset.code === ui.code));
  const h = ui.view === 'overview' ? '#/all' : ui.view === 'tool' && sh ? `#/tool/${sh.page.replace('.html', '')}`
    : ui.code ? `#/${ui.code}/${ui.all ? 'all' : ui.step}` : '';
  if (h && location.hash !== h) history.replaceState(null, '', h);
}
window.addEventListener('click', (e) => {
  if (!e.target.closest('#back-sheet')) return;
  const sh = sheet();
  if (!sh) return;
  if (!sh.step) { ui.view = 'tool'; return layout(); }
  if (sh.book !== ui.code) pick(sh.book, sh.step); else toStep(sh.step);
});
/* The address: #/<code>/<step> (or /all), #/all for the grid, #/tool/<page>; else the last book. */
function fromAddress() {
  const [a, s] = location.hash.replace(/^#\/?/, '').split('/');
  if (a === 'all') { ui.view = 'overview'; return; }
  if (a === 'tool' && s) { queueMicrotask(() => $(`[data-open="${s}"]`)?.click()); return; }
  const b = book(a) || book(ui.code) || books.find((x) => x.folder && nextStage(x)) || books[0];
  if (!b) return;
  ui.code = b.code;
  ui.all = s === 'all';
  ui.step = STAGES.some((x) => x.id === s) ? s : nextStage(b)?.id || 'fetch';
}

// ---------- the sheets, each in its step (or, for the tools, the work area), one at a time ----------
function openSheet(b) {
  if (!b?.imp) return toast('Import the book first', 3000);
  openInline(b, `/tools/admin/fights.html?book=${encodeURIComponent(b.code)}&embed=1`, `Fight pictures: ${b.n}. ${b.title}`);
}
function openProposals(b) {  // the agent's candidates for some enemies, with their context, to pick from (ruling R27)
  openInline(b, `/tools/admin/proposals.html?book=${encodeURIComponent(b.code)}&embed=1`, `Picture proposals: ${b.n}. ${b.title}`);
}
function openIlls(b) {  // every illustration, and each one's original beside its upscale (step 9)
  if (!b?.folder) return toast('Download the book first', 3000);
  openInline(b, `/tools/admin/ills.html?book=${encodeURIComponent(b.code)}&embed=1`, `Illustrations: ${b.n}. ${b.title}`);
}
function openItems(b) {  // every item of the book's table, its icon, and another picked (tools/item_icons.py)
  openInline(b, `/tools/admin/items.html?book=${encodeURIComponent(b.code)}&embed=1`, `Items: ${b.n}. ${b.title}`);
}
function openIcons() {  // every icon the player draws beside the books' items: it spans the books, so no book (glyphs.js)
  openInline({ code: '' }, '/tools/admin/icons.html?embed=1', 'Player icons');
}
$('[data-open="icons"]').onclick = openIcons;
// every picture in art/: its link, none, or made with AI and moved into the committed library (ADR 0038, 0042)
$('[data-open="sources"]').onclick = () => openInline({ code: '' }, '/tools/admin/sources.html?embed=1', 'Picture sources');
// Lone Wolf on the title page and the Kai panel, baked into assets/hero/ (hero.html)
$('[data-open="hero"]').onclick = () => openInline({ code: '' }, '/tools/admin/hero.html?embed=1', "Lone Wolf's pictures");
function openMap(b, step) {
  if (!b?.folder) return toast('Download the book first', 3000);
  openInline(b, `/tools/map-editor.html?book=${encodeURIComponent(b.code)}&embed=1${step ? '&step=' + step : ''}`, `Map editor: ${b.n}. ${b.title}`);
}
function openInline(b, src, title) {
  const wrap = $('#mapwrap'), frame = $('#mapframe');
  if (!wrap.hidden && frame.dataset.src !== src && !leaveMap()) return;
  $('#map-title').textContent = title;
  if (frame.dataset.src !== src) { frame.src = src; frame.dataset.src = src; frame.dataset.book = b.code; }
  wrap.hidden = false;
  const step = SHEET_STEP[src.split('?')[0].split('/').pop()];
  if (step) { ui.code = b.code; ui.step = step; ui.all = false; ui.view = 'steps'; } else ui.view = 'tool';
  render();
}
function leaveMap() {  // the editor's unsaved labels, or a picture being adjusted, would go with the frame
  let dirty = false;
  try { const w = $('#mapframe').contentWindow; dirty = w.mapEditorDirty?.() || w.document.querySelector('#ed')?.open; } catch { /* not loaded */ }
  return !dirty || window.confirm('The sheet open has unsaved changes. Close it and lose them?');
}
$('#map-close').onclick = () => {
  if (!leaveMap()) return;
  $('#mapwrap').hidden = true;
  const frame = $('#mapframe'); frame.src = 'about:blank'; frame.dataset.src = ''; frame.dataset.book = '';
  ui.max = false;
  if (ui.view === 'tool') ui.view = 'steps';
  layout();
  load();
};
window.addEventListener('message', (e) => {
  if (e.origin === location.origin && (e.data?.mapEditor === 'state' || e.data?.fightSheet === 'changed' || e.data?.itemSheet === 'changed')) reloadSoon();
});
window.addEventListener('beforeunload', (e) => {
  try { if ($('#mapframe').contentWindow.mapEditorDirty?.()) { e.preventDefault(); e.returnValue = ''; } } catch { /* none */ }
});

// ---------- the bar, the rail's buttons, the keys ----------
const overview = () => { ui.view = ui.view === 'overview' ? 'steps' : 'overview'; layout(); };
$('#ov-btn').onclick = overview;
$('#rail-fold').onclick = () => { ui.narrow = !$('#shell').classList.contains('narrow'); keep(); layout(); };
$('#sheet-max').onclick = () => { ui.max = !ui.max; layout(); };
const pop = (id, by) => {  // a popover under its button
  const el = $(id); el.hidden = !el.hidden;
  if (el.hidden) return;
  const r = $(by).getBoundingClientRect();
  el.style.top = r.bottom + 6 + 'px'; el.style.left = Math.max(30, Math.min(r.left, innerWidth - el.offsetWidth - 30)) + 'px';
};
$('#setup-btn').onclick = () => pop('#setup-pop', '#setup-btn');
$('#keys-btn').onclick = () => pop('#keys', '#keys-btn');
window.addEventListener('click', (e) => {
  for (const [p, by] of [['#setup-pop', '#setup-btn'], ['#keys', '#keys-btn']]) if (!e.target.closest(p) && !e.target.closest(by)) $(p).hidden = true;
});
$('#log-min').onclick = () => {
  const min = $('#log').classList.toggle('min');
  $('#log-min').textContent = min ? 'Grow' : 'Shrink';
  const o = $('#log-out'); o.scrollTop = o.scrollHeight;
};
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input, textarea, select, dialog, [contenteditable]') || $('#confirm').open) return;
  const k = e.key, list = books.filter((b) => b.folder || ui.later), i = list.findIndex((b) => b.code === ui.code);
  const ids = STAGES.map((s) => s.id), j = ids.indexOf(ui.step);
  if (k === 'ArrowDown' || k === 'ArrowUp') { const b = list[Math.max(0, Math.min(list.length - 1, i + (k === 'ArrowDown' ? 1 : -1)))]; if (b) pick(b.code); }
  else if ((k === 'ArrowRight' || k === 'ArrowLeft') && ui.code) toStep(ids[Math.max(0, Math.min(ids.length - 1, j + (k === 'ArrowRight' ? 1 : -1)))]);
  else if (/^[0-9]$/.test(k) && ui.code) toStep(ids[(+k + 9) % 10]);
  else if (k === 'n' || k === 'N') { const nx = book(ui.code) && nextStage(book(ui.code)); if (nx) toStep(nx.id); }
  else if (k === 'a' || k === 'A') { ui.all = !ui.all; ui.view = 'steps'; keep(); layout(); }
  else if (k === 'o' || k === 'O') overview();
  else if (k === 'f' || k === 'F') { if (sheet()) { ui.max = !ui.max; layout(); } }
  else if (k === 'Escape') { if (ui.max) ui.max = false; else if (ui.view !== 'steps') ui.view = 'steps'; layout(); }
  else return;
  e.preventDefault();
});

// ---------- the deliberate steps: downloading, and any import ----------
function gate(kind, b) {
  const d = $('#confirm'), ok = $('#confirm-ok'), ack = $('#confirm-ack'), t = b?.times || {};
  let title, body, ackText, okText, value = b ? b.code : 'all';
  if (kind === 'download' || kind === 'rules') {
    title = kind === 'download' ? `Download Book ${b.n}?` : `Fetch Book ${b.n}'s rules pages?`;
    body = `<p><b>${esc(b.title)}</b> (${b.code}) from projectaon.org: ${kind === 'download' ? `section pages, rules pages and illustrations, ${SIZE}` : 'its rules pages only (a dozen small files)'}, into <code>data/projectaon/${b.code}/</code> (git-ignored, never committed). Files already there are not fetched again.</p>
      <ul><li>Personal use only, under Project Aon's licence.</li>${b.playable === false ? `<li>The engine has no ${esc(b.series)} rules yet: this book will not be playable after download.</li>` : ''}</ul>`;
    ackText = `I approve downloading from projectaon.org for Book ${b.n}.`;
    okText = kind === 'download' ? `Download Book ${b.n}` : 'Fetch rules pages';
  } else if (kind === 'import') {
    const first = !b.imp;
    title = first ? `Import Book ${b.n} for the first time?` : `Re-import Book ${b.n}?`;
    body = `<p><b>${esc(b.title)}</b> (${b.code}): ${first ? 'writes' : 'rewrites'} <code>data/projectaon/${b.code}/book.js</code> and refreshes <code>index.js</code>${first ? ', so the book appears in the player' : ''}. Saves are not touched.</p>
      <table class="dates">
        <tr><th>Last imported</th><td>${when(t.imported)}</td></tr>
        <tr><th>book.js last changed</th><td>${when(t.bookjs)}</td></tr>
        <tr><th>Source pages, newest</th><td>${when(t.sources)}</td></tr>
        <tr><th>Importer last changed</th><td>${when(t.importer)}</td></tr>
        ${t.map4k ? `<tr><th>map-4k.webp made</th><td>${when(t.map4k)}</td></tr>` : ''}
      </table>
      <p class="${b.stale?.length ? 'stale' : ''}">${first ? 'Not imported yet.' : b.stale?.length ? 'Out of date: ' + esc(b.stale.join('; ')) + '.' : 'Up to date: nothing has changed since it was made.'}</p>
      ${first ? '' : '<p class="hint">After an importer change, "Check everything" also checks no other book got worse.</p>'}`;
    ackText = `I approve ${first ? 'importing' : 're-importing'} Book ${b.n}.`;
    okText = first ? `Import Book ${b.n}` : `Re-import Book ${b.n}`;
  } else if (kind === 'pictures') {
    const p = b.pins;
    title = `Approve Book ${b.n}'s new fight pictures?`;
    body = `<p>${p.waiting} fight${p.waiting === 1 ? '' : 's'} would now show another picture than the one you approved on ${esc(p.approved || '?')} (sections ${esc(p.sections.join(', '))}). Until you approve, the player keeps the approved ones.</p>
      <p class="hint">Look at them first on the picture sheet: each changed card says so.</p>`;
    ackText = `I approve the new fight pictures for Book ${b.n}.`;
    okText = 'Approve';
  } else if (kind === 'setup') {
    value = 'all';
    title = `${b.label}: download?`;
    body = `<p><b>${esc(b.label)}</b>: ${esc(b.what)}.</p><p>Fetches ${esc(b.size)}, onto this PC only (git-ignored, never committed).</p>`;
    ackText = `I approve this download for ${b.label}.`;
    okText = 'Download';
  } else if (kind === 'release') {
    const r = b, cur = r.current || {}, same = cur.commit === r.head.commit;
    value = 'all';
    title = 'Release to the iPad?';
    body = `<p>Copies commit <code>${esc(r.head.commit)}</code>, <i>${esc(r.head.subject)}</i>, with the books and art as they are on disk, into <code>release/</code>. The release server serves it at once; the iPad fetches it at its next sync. Then it pushes <code>main</code> to GitHub.</p>
      <table class="dates">
        <tr><th>Released now</th><td>${cur.commit ? `<code>${esc(cur.commit)}</code> ${esc(cur.subject || '')}, ${esc(cur.made || '')}` : 'nothing yet'}</td></tr>
        <tr><th>Commits since</th><td>${r.commits_since == null ? '?' : r.commits_since}</td></tr>
        <tr><th>Not on GitHub</th><td>${r.unpushed == null ? '?' : `${r.unpushed} commit${r.unpushed === 1 ? '' : 's'} on main`}</td></tr>
      </table>
      ${r.dirty ? `<p class="stale">${r.dirty} file${r.dirty === 1 ? ' has' : 's have'} uncommitted changes: left out. Commit first to include them.</p>` : ''}
      ${same ? '<p class="hint">This commit is already released: only changed books or art would go.</p>' : ''}`;
    ackText = 'I approve releasing this to the iPad and pushing main to GitHub.';
    okText = 'Release';
  }
  $('#confirm-title').textContent = title;
  $('#confirm-body').innerHTML = body;
  $('#confirm-ack-text').textContent = ackText;
  ok.textContent = okText;
  ack.checked = false; ok.disabled = true;
  ack.onchange = () => { ok.disabled = !ack.checked; };
  d.returnValue = '';
  d.showModal();
  return new Promise((res) => d.addEventListener('close', () => res(d.returnValue === 'ok' ? value : null), { once: true }));
}

// ---------- jobs ----------
let polling = null;
async function startJob(stage, book, confirm) {
  const { status, j } = await api(`run/${stage}${book ? '?book=' + encodeURIComponent(book) : ''}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(confirm ? { confirm } : {}) });
  if (status !== 200) return toast(j.error || `Could not start (${status})`, 6000);
  running = j.title;
  render();
  renderSetup();
  follow(j);
}
function follow(job) {
  clearTimeout(polling);
  $('#log').hidden = false;
  $('#log-title').textContent = job.title;
  const out = $('#log-out');
  out.textContent = '';
  let seen = 0;
  const tick = async () => {
    const { status, j } = await api(`jobs/${job.id}?from=${seen}`);
    if (status !== 200) { $('#log-state').textContent = j.error || 'lost'; return; }
    if (j.lines.length) {
      const atEnd = out.scrollTop + out.clientHeight >= out.scrollHeight - 4;
      for (const l of j.lines) {
        const span = document.createElement('span');
        span.className = l.startsWith('$ ') ? 'cmd' : /^\[(exit|error)/.test(l) ? 'mock' : '';
        span.textContent = l + '\n';
        out.append(span);
      }
      seen = j.from + j.lines.length;
      if (atEnd) out.scrollTop = out.scrollHeight;
    }
    $('#log-state').textContent = j.state === 'running' ? `running, ${Math.round((Date.now() - j.started) / 1000)} s`
      : `${j.state === 'done' ? 'finished' : 'FAILED'} (exit ${j.code}) in ${Math.round((j.ended - j.started) / 1000)} s`;
    if (j.state === 'running') polling = setTimeout(tick, 800);
    else { running = null; load(); }
  };
  tick();
}
$('#log-close').onclick = () => { $('#log').hidden = true; };
document.querySelectorAll('[data-global]').forEach((btn) => btn.onclick = async () => {
  const stage = btn.dataset.global;
  let confirm;
  if (stage === 'release') {
    const { status, j } = await api('release');
    if (status !== 200) return toast(j.error || `Could not read the release (${status})`, 6000);
    confirm = await gate('release', j); if (!confirm) return;
  }
  startJob(stage, '', confirm);
});

// ---------- small things ----------
async function copy(t, done) {
  try { await navigator.clipboard.writeText(t); toast(done, 3500); }
  catch {  // a page that is not focused cannot write the clipboard: copy through a selection instead
    const ta = Object.assign(document.createElement('textarea'), { value: t });
    document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast(done, 3500);
  }
}
let toastTimer;
function toast(t, ms = 3000) {
  const el = $('#toast'); el.textContent = t; el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}

// a job started before this page loaded (or from another tab) is followed too
await load();
const { j: jobs } = await api('jobs');
if (Array.isArray(jobs) && jobs[0]?.state === 'running') follow(jobs[0]);
