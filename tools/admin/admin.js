/* The import dashboard: every book's steps from GET /api/admin/status (tools/book_status.py), jobs
   run through /api/admin/run and followed by polling, hand steps marked through /api/admin/mark, the
   map editor inline, and the agent steps' prompts. docs/reference/dashboard.md. */
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

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const when = (t) => (t ? new Date(t).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'never');
let books = [], selected = null, showLater = false, running = null;

// ---------- status ----------
async function api(path, opts) {
  try {
    const r = await fetch('/api/admin/' + path, { cache: 'no-store', ...opts });
    return { status: r.status, j: await r.json().catch(() => ({})) };
  } catch (e) { return { status: 0, j: { error: String(e.message || e) } }; }
}
async function load() {
  const { status, j } = await api('status');
  if (status !== 200) {
    $('#loading').textContent = status === 403 ? 'The dashboard answers this PC only: open it at http://localhost:8766/tools/admin/.'
      : `No status from the server (${j.error || status}). Is it tools/serve.py, restarted since the dashboard was added?`;
    return;
  }
  books = j.books;
  running = j.running;
  render();
  loadSetup();
}

// ---------- setup: what the tools need on this PC (tools/setup.py, ADR 0036) ----------
let setup = [], showSetup = false;
async function loadSetup() {
  const { status, j } = await api('setup');
  if (status !== 200 || !Array.isArray(j)) return;
  setup = j;
  renderSetup();
}
function renderSetup() {
  const el = $('#setup'), lack = setup.filter((r) => r.state === 'missing');
  const open = showSetup || lack.length > 0;
  const seal = (s) => (s === 'ok' ? 'done' : s === 'missing' ? 'todo' : 'na');
  el.hidden = false;
  el.innerHTML = `<header><span class="kind" data-kind="script"></span><b>Setup</b>
      <span class="say">${lack.length ? `${lack.length} part${lack.length === 1 ? '' : 's'} missing on this PC` : 'Everything the tools need is here'}</span>
      <button id="setup-toggle">${open ? 'Hide' : 'Show'}</button></header>` +
    (open ? setup.map((r, i) => `<div class="part"><span class="st ${seal(r.state)}"></span>
      <span class="kind" data-kind="${r.install ? 'script' : 'owner'}"></span><b>${esc(r.label)}</b>
      <div>${esc(r.detail)}<small>${esc(r.what)}</small></div>
      <div>${r.state === 'missing' && r.install ? `<button data-setup="${i}" ${running ? 'disabled title="a job is running"' : ''}>${r.gated ? 'Download...' : 'Install'}</button>` : ''}</div></div>`).join('') : '');
  $('#setup-toggle').onclick = () => { showSetup = !open; renderSetup(); };
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

// ---------- the grid ----------
function render() {
  $('#loading').hidden = true;
  const groups = [...new Set(STAGES.map((s) => s.group))];
  $('#grid thead').innerHTML =
    `<tr class="groups"><th></th>${groups.map((g) => `<th colspan="${STAGES.filter((s) => s.group === g).length}">${esc(g)}</th>`).join('')}<th></th></tr>` +
    `<tr><th class="book">Book</th>${STAGES.map((s) => `<th title="${esc(s.kind)}"><span class="kind" data-kind="${s.kind}"></span>${esc(s.label)}</th>`).join('')}<th class="book">Next</th></tr>`;
  const row = (b) => {
    const nx = nextStage(b);
    return `<tr data-code="${b.code}" class="${b.code === selected ? 'sel' : ''} ${!b.folder ? 'later' : ''}">
      <td class="book"><b>${b.n}</b><span>${esc(b.title)}</span><small>${b.code} · ${b.series}</small></td>
      ${STAGES.map((s, i) => {
        const x = b.stages[s.id];
        const gs = i && STAGES[i - 1].group !== s.group ? ' gstart' : '';
        return `<td class="${gs}" data-stage="${s.id}" title="${esc(s.label + ': ' + x.ev)}"><span class="st ${x.state}"></span>${x.num != null && x.state !== 'done' ? `<span class="cellnum">${esc(x.num)}</span>` : ''}</td>`;
      }).join('')}
      <td class="next">${nx ? `<span class="kind" data-kind="${nx.kind}" style="width:12px;height:12px;vertical-align:-1px"></span> ${esc(nx.label)}` : 'done'}</td></tr>`;
  };
  // a book not downloaded has only the download to offer, so it is folded away (ADR 0039)
  const now = books.filter((b) => b.folder), later = books.filter((b) => !b.folder);
  const runs = [...later].sort((a, b) => a.n - b.n).reduce((r, b) => { const last = r.at(-1); if (last && last[1] === b.n - 1) last[1] = b.n; else r.push([b.n, b.n]); return r; }, [])
    .map(([a, z]) => (a === z ? `${a}` : `${a}-${z}`)).join(', ');
  $('#grid tbody').innerHTML = now.map(row).join('') + (later.length
    ? `<tr class="fold"><td colspan="${STAGES.length + 2}">${showLater ? '▾' : '▸'} Books ${runs}: not downloaded; each is offered every step that works for it once it is</td></tr>` +
      (showLater ? later.map(row).join('') : '') : '');
  if (selected) renderDetail(books.find((b) => b.code === selected));
}

$('#grid').addEventListener('click', (e) => {
  if (e.target.closest('tr.fold')) { showLater = !showLater; return render(); }
  const tr = e.target.closest('tbody tr[data-code]');
  if (!tr) return;
  selected = tr.dataset.code;
  render();
  const b = books.find((x) => x.code === selected);
  const cell = e.target.closest('td[data-stage]');
  if (!cell) return;
  if (cell.dataset.stage === 'map') return openMap(b);
  showStep(cell.dataset.stage);
});
function showStep(id) {  // a step's cell in the grid scrolls the book's panel to that step and lights it
  const el = document.querySelector(`#detail .step[data-stage="${id}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
}

// ---------- one book ----------
const ACTIONS = {
  fetch: (b) => b.stages.fetch.state === 'todo'
    ? [run('Download...', 'fetch', { gate: 'download' })]
    : [run('Fetch rules pages...', 'fetch-rules', { gate: 'rules' })],
  import: (b) => !b.known ? (b.folder ? [prompt('newBook')] : [])
    : !b.folder ? [] : [run(b.imp ? 'Re-import...' : 'Import...', 'import', { gate: 'import' })],
  phrasings: () => [prompt('phrasings'), mark(3)],
  rules: () => [prompt('rules'), mark(4)],
  reading: () => [run('Make reading copy', 'reading')],
  // the draft first (ADR 0036); over a hand-made table it only writes items-draft.js beside the book, to compare
  items: (b) => [run(b.items.exists && !b.items.draft ? 'Draft and compare' : 'Draft table', 'items-draft'), prompt('items'), run('Check items', 'check-items'), ...(b.items.check?.errors?.length ? [prompt('itemsFix', 'Copy fix prompt')] : [])],
  pictures: (b) => [prompt('pictures'), { t: 'sheet', label: 'Open picture sheet' }, run('Upscale 2x', 'fights-up'), mark(7),
    ...(b.pins?.waiting ? [run('Approve picture changes...', 'approve-pictures', { gate: 'pictures' })] : [])],
  testplay: () => [prompt('testplay'), link('Test address', 'http://127.0.0.1:8766/'), mark(6)],
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
  if (a.t === 'sheet' || a.t === 'ills') return `<button data-act="${i}">${esc(a.label)}</button>`;
  if (a.t === 'link') return `<a class="btn" href="${esc(a.href)}" target="_blank">${esc(a.label)}</a>`;
  if (a.t === 'mark') return `<button data-act="${i}">${b.marks[a.step] ? 'Mark not done' : 'Mark done'}</button>`;
  return `<button data-act="${i}" ${a.t === 'run' && running ? 'disabled title="a job is running"' : ''}>${esc(a.label)}</button>`;
}

async function renderDetail(b) {
  if (!b) return;
  acts = [];
  const nx = nextStage(b);
  const steps = STAGES.map((s) => {
    const x = b.stages[s.id];
    const list = x.state === 'na' && s.id !== 'import' ? [] : ACTIONS[s.id]?.(b) || [];
    return `<div class="step" data-stage="${s.id}"><span class="st ${x.state}"></span><span class="kind" data-kind="${s.kind}"></span>
      <div class="what"><b>${s.step ? s.step + '. ' : ''}${esc(s.label)}</b><div class="ev">${esc(x.ev)}</div><div class="src">${x.src === 'disk' ? 'from the files' : 'marked by hand (docs/book-status.json)'}</div></div>
      <div class="acts">${list.map((a) => actHtml(a, b)).join('')}</div></div>`;
  }).join('');
  $('#detail').innerHTML = `<h2>${b.n}. ${esc(b.title)}</h2>
    <div class="meta">${b.code} · ${b.series}${b.imp ? ` · ${b.imp.sections} sections, ${b.imp.fights} fights, ${b.imp.kinds} kinds of enemy` : ''}</div>
    ${nx ? `<div class="nextup">Next: <b>${esc(nx.label)}</b> (${nx.kind === 'agent' ? 'Claude Code: copy the prompt' : nx.kind === 'owner' ? 'yours' : 'a script'})</div>` : '<div class="nextup">Every step done.</div>'}
    <h3>Steps</h3>${steps}<h3>Map, step by step</h3><div id="mapsteps"><p class="hint">${b.folder ? 'Reading the map files...' : 'After download.'}</p></div>`;
  if (b.folder) renderMap(b, await (await fetch(`/api/map/${b.code}/state`, { cache: 'no-store' }).catch(() => null))?.json().catch(() => null));
}

/* The map editor's rail, summarised: what is done, who does it, and the editor opened at that step. */
function renderMap(b, state) {
  if (selected !== b.code || !$('#mapsteps')) return;
  if (!state || !state.files) { $('#mapsteps').innerHTML = '<p class="hint">The map API did not answer.</p>'; return; }
  const f = state.files, has = (n) => n in f, rounds = state.rounds?.filter((n) => n > 0) || [];
  const last = rounds.at(-1);
  const ed = (step) => ({ t: 'map', label: 'Open', step });
  const rows = [
    ['Upscale the scan to 2K', 'script', has('map-2k.png'), 'map-2k.png', ed(1)],
    ['OCR draft of the labels', 'script', has('labels.json'), `maps/${b.code}/labels.json`, ed(2)],
    ['Correct every label by eye', 'owner', has('labels-checked.txt'), 'in the editor', ed(3)],
    ['Untick retype on captions', 'agent', has('labels-checked.txt'), 'judged from wording and boxes', has('labels.json') ? prompt('mapRetype') : null],
    ['Labels checked', 'owner', has('labels-checked.txt'), 'labels-checked.txt', ed(3)],
    ['Style for the prompt', has('style.txt') ? 'owner' : 'agent', has('style.txt'), `maps/${b.code}/style.txt`, has('style.txt') ? null : prompt('mapStyle')],
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
  if (a.t === 'ills') return openIlls(a.b);
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

// ---------- the map editor and the picture sheet, inline under the grid (one at a time) ----------
function openSheet(b) {
  if (!b?.imp) return toast('Import the book first', 3000);
  openInline(b, `/tools/admin/fights.html?book=${encodeURIComponent(b.code)}&embed=1`, `Fight pictures: ${b.n}. ${b.title}`);
}
function openIlls(b) {  // every illustration, and each one's original beside its upscale (step 9)
  if (!b?.folder) return toast('Download the book first', 3000);
  openInline(b, `/tools/admin/ills.html?book=${encodeURIComponent(b.code)}&embed=1`, `Illustrations: ${b.n}. ${b.title}`);
}
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
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function leaveMap() {  // the editor's unsaved labels, or a picture being adjusted, would go with the frame
  let dirty = false;
  try { const w = $('#mapframe').contentWindow; dirty = w.mapEditorDirty?.() || w.document.querySelector('#ed')?.open; } catch { /* not loaded */ }
  return !dirty || window.confirm('The page below has unsaved changes. Close it and lose them?');
}
$('#map-close').onclick = () => {
  if (!leaveMap()) return;
  $('#mapwrap').hidden = true;
  const frame = $('#mapframe'); frame.src = 'about:blank'; frame.dataset.src = ''; frame.dataset.book = '';
  load();
};
window.addEventListener('message', (e) => {
  if (e.origin === location.origin && (e.data?.mapEditor === 'state' || e.data?.fightSheet === 'changed')) reloadSoon();
});
window.addEventListener('beforeunload', (e) => {
  try { if ($('#mapframe').contentWindow.mapEditorDirty?.()) { e.preventDefault(); e.returnValue = ''; } } catch { /* none */ }
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
    body = `<p>Copies commit <code>${esc(r.head.commit)}</code>, <i>${esc(r.head.subject)}</i>, with the books and art as they are on disk, into <code>release/</code>. The release server serves it at once; the iPad fetches it at its next sync.</p>
      <table class="dates">
        <tr><th>Released now</th><td>${cur.commit ? `<code>${esc(cur.commit)}</code> ${esc(cur.subject || '')}, ${esc(cur.made || '')}` : 'nothing yet'}</td></tr>
        <tr><th>Commits since</th><td>${r.commits_since == null ? '?' : r.commits_since}</td></tr>
      </table>
      ${r.dirty ? `<p class="stale">${r.dirty} file${r.dirty === 1 ? ' has' : 's have'} uncommitted changes: left out. Commit first to include them.</p>` : ''}
      ${same ? '<p class="hint">This commit is already released: only changed books or art would go.</p>' : ''}`;
    ackText = 'I approve releasing this to the iPad.';
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
