// @vitest-environment jsdom
/* tools/admin/admin.js, the import dashboard. It reads GET /api/admin/status on import (top-level await),
   so each test builds the page's DOM from tools/admin/index.html, stubs fetch with a table of routes,
   and imports a fresh copy of the module. No request leaves the test. */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ROOT } from './helpers.js';
import { PROMPTS } from '../../tools/admin/prompts.js';

const BODY = (() => {
  const html = fs.readFileSync(path.join(ROOT, 'tools', 'admin', 'index.html'), 'utf8');
  return html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>')).replace(/<script[\s\S]*?<\/script>/g, '');
})();

const STAGE_IDS = ['fetch', 'import', 'phrasings', 'rules', 'reading', 'items', 'pictures', 'testplay', 'map'];
const stage = (state = 'done', ev = 'evidence', o = {}) => ({ state, ev, src: 'disk', ...o });
const book = (n, o = {}) => ({
  n, title: `Stand-in ${n}`, code: `${String(n).padStart(2, '0')}book${n}`, series: 'kai', known: true, folder: true,
  imp: { sections: 350, fights: 40, rnt: 20, broken: 0, noway: 0, bare: 0, kinds: 25, map: 'map.png' },
  items: { exists: true, todos: 3, registered: true, check: null }, marks: {}, pins: null,
  times: { imported: 1, bookjs: 1, sources: 1, importer: 1 }, stale: [],
  stages: Object.fromEntries(STAGE_IDS.map((id) => [id, stage()])), ...o,
});
const withStages = (b, over) => ({ ...b, stages: { ...b.stages, ...over } });

let listeners, routes, calls, toastTimers;

/* routes: {'GET status': () => [200, {...}], 'POST run/import': (url, body) => [200, {...}]} (path after /api/) */
async function boot(statusBody, extra = {}) {
  routes = {
    'GET admin/status': () => [200, statusBody],
    'GET admin/jobs': () => [200, []],
    ...extra,
  };
  calls = [];
  vi.stubGlobal('fetch', async (url, opts = {}) => {
    const u = new URL(url, 'http://localhost'), key = `${opts.method || 'GET'} ${u.pathname.replace(/^\/api\//, '')}`;
    const body = opts.body ? JSON.parse(opts.body) : undefined;
    calls.push({ key, search: u.search, body });
    const route = Object.entries(routes).find(([k]) => k === key || (k.endsWith('*') && key.startsWith(k.slice(0, -1))));
    if (!route) return new Response('{}', { status: 404 });
    const [status, json] = route[1](u, body);
    return new Response(JSON.stringify(json), { status });
  });
  document.body.innerHTML = BODY;
  vi.resetModules();
  await import('../../tools/admin/admin.js');
}
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const flush = () => new Promise((r) => setTimeout(r, 0));
const until = (fn) => vi.waitFor(fn, { timeout: 2000, interval: 5 });
const post = (key) => calls.filter((c) => c.key === key);
const pickBook = async (code) => { $(`tr[data-code="${code}"] td.book`).click(); await until(() => expect($('#detail h2')).not.toBeNull()); };
const btn = (text) => $$('#detail button, #detail a.btn').find((b) => b.textContent === text);

beforeEach(() => {
  listeners = [];
  const add = window.addEventListener.bind(window);
  vi.spyOn(window, 'addEventListener').mockImplementation((t, fn, o) => { listeners.push([t, fn, o]); add(t, fn, o); });
  Element.prototype.scrollIntoView = vi.fn();
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function (v) { if (v !== undefined) this.returnValue = v; this.open = false; this.dispatchEvent(new Event('close')); };
  vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(async () => {}) } });
});
afterEach(() => {
  listeners.forEach(([t, fn, o]) => window.removeEventListener(t, fn, o));
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('loading the status', () => {
  it('asks GET api/admin/status and hides the loading line', async () => {
    await boot({ books: [book(1)], running: null });
    expect(calls[0].key).toBe('GET admin/status');
    expect($('#loading').hidden).toBe(true);
  });

  it('tells a visitor from another machine that the dashboard answers this PC only', async () => {
    await boot({}, { 'GET admin/status': () => [403, { error: 'no' }] });
    expect($('#loading').textContent).toMatch(/answers this PC only/);
    expect($('#grid tbody').children).toHaveLength(0);
  });

  it('suggests restarting the server when the status route is missing', async () => {
    await boot({}, { 'GET admin/status': () => [404, {}] });
    expect($('#loading').textContent).toMatch(/No status from the server \(404\)/);
  });

  it('shows the server error text when the request fails', async () => {
    await boot({}, { 'GET admin/status': () => { throw new Error('boom'); } });
    // a thrown route becomes a rejected fetch, which api() turns into status 0 and the message
    expect($('#loading').textContent).toMatch(/boom|No status/);
  });
});

describe('the grid', () => {
  const books = () => [
    book(1),
    withStages(book(2), { phrasings: stage('todo', 'not marked'), items: stage('bad', '2 errors', { num: 2 }) }),
    withStages(book(3), { rules: stage('warn', 'stale'), items: stage('warn', 'todos', { num: 5 }), phrasings: stage('done'), pictures: stage('done'), testplay: stage('done') }),
    book(13, { series: 'grand master', known: false, folder: false, imp: null }),
    book(14, { series: 'grand master', known: false, folder: false, imp: null }),
  ];

  it('has a header with the stage groups and one column per stage', async () => {
    await boot({ books: books(), running: null });
    expect($$('#grid thead tr.groups th').map((t) => t.textContent).filter(Boolean)).toEqual(['Getting the book', 'Items and fights', 'Play', 'Map']);
    expect($$('#grid thead tr:nth-child(2) th').map((t) => t.textContent)).toEqual(['Book', 'Download', 'Import', 'Phrasings', 'Rules', 'Reading copy', 'Item table', 'Fight pictures', 'Test play', 'Map', 'Next']);
  });

  it('has a row per book and folds the Grand Master books not downloaded', async () => {
    await boot({ books: books(), running: null });
    expect($$('#grid tbody tr[data-code]').map((r) => r.dataset.code)).toEqual(['01book1', '02book2', '03book3']);
    expect($('tr.fold').textContent).toMatch(/Books 13-14, Grand Master: not downloaded/);
  });

  it('unfolds them on a click and folds them again', async () => {
    await boot({ books: books(), running: null });
    $('tr.fold').click();
    expect($$('#grid tbody tr[data-code]')).toHaveLength(5);
    expect($('tr.fold').textContent.startsWith('▾')).toBe(true);
    $('tr.fold').click();
    expect($$('#grid tbody tr[data-code]')).toHaveLength(3);
  });

  it('shows a downloaded Grand Master book among the others', async () => {
    const b = book(13, { series: 'grand master', known: false, folder: true });
    await boot({ books: [book(1), b], running: null });
    expect($$('#grid tbody tr[data-code]')).toHaveLength(2);
    expect($('tr.fold')).toBeNull();
  });

  it('paints each cell with its state, and a number on an unfinished one', async () => {
    await boot({ books: books(), running: null });
    const cell = (code, id) => $(`tr[data-code="${code}"] td[data-stage="${id}"]`);
    expect(cell('01book1', 'fetch').querySelector('.st').classList.contains('done')).toBe(true);
    expect(cell('02book2', 'phrasings').querySelector('.st').classList.contains('todo')).toBe(true);
    expect(cell('02book2', 'items').querySelector('.cellnum').textContent).toBe('2');
    expect(cell('01book1', 'items').querySelector('.cellnum')).toBeNull();
  });

  it('puts the cell evidence in its tooltip', async () => {
    await boot({ books: books(), running: null });
    expect($('tr[data-code="02book2"] td[data-stage="items"]').title).toBe('Item table: 2 errors');
  });

  it('names the next step: an undone one first, then a stale one, or done', async () => {
    await boot({ books: books(), running: null });
    const next = (code) => $(`tr[data-code="${code}"] td.next`).textContent.trim();
    expect(next('01book1')).toBe('done');
    expect(next('02book2')).toBe('Phrasings');
    expect(next('03book3')).toBe('Rules');
  });

  it('escapes book titles', async () => {
    await boot({ books: [book(1, { title: '<img src=x onerror=alert(1)>' })], running: null });
    expect($('tr[data-code="01book1"] td.book span').textContent).toBe('<img src=x onerror=alert(1)>');
    expect($('tr[data-code="01book1"] img')).toBeNull();
  });
});

describe('one book', () => {
  const state = () => [200, { files: { 'map-2k.png': 1, 'labels.json': 1 }, rounds: [0, 1, 2] }];
  const setup = (b, extra = {}) => boot({ books: [b], running: null }, { 'GET map/*': state, ...extra });

  it('selects the row and shows the book header and steps', async () => {
    await setup(book(1));
    await pickBook('01book1');
    expect($('tr[data-code="01book1"]').classList.contains('sel')).toBe(true);
    expect($('#detail h2').textContent).toBe('1. Stand-in 1');
    expect($$('#detail .step:not(.sub)')).toHaveLength(9);
    expect($('#detail .meta').textContent).toContain('350 sections, 40 fights, 25 kinds of enemy');
    expect($('#detail .nextup').textContent).toBe('Every step done.');
  });

  it('numbers the checklist steps and says whether a step comes from the files or a hand mark', async () => {
    await setup(withStages(book(1), { rules: stage('done', 'marked', { src: 'mark' }) }));
    await pickBook('01book1');
    const rules = $('#detail .step[data-stage="rules"]');
    expect(rules.querySelector('b').textContent).toBe('4. Rules');
    expect(rules.querySelector('.src').textContent).toMatch(/marked by hand/);
    expect($('#detail .step[data-stage="import"] .src').textContent).toBe('from the files');
    expect($('#detail .step[data-stage="reading"] b').textContent).toBe('Reading copy');
  });

  it('says what is next and who does it', async () => {
    await setup(withStages(book(1), { phrasings: stage('todo') }));
    await pickBook('01book1');
    expect($('#detail .nextup').textContent).toBe('Next: Phrasings (Claude Code: copy the prompt)');
  });

  it('offers Download for an undownloaded book, and fetching rules pages otherwise', async () => {
    await setup(withStages(book(1, { folder: false }), { fetch: stage('todo') }));
    await pickBook('01book1');
    expect(btn('Download...')).toBeTruthy();
    expect(btn('Fetch rules pages...')).toBeUndefined();
  });
  it('offers Fetch rules pages once the book is downloaded', async () => {
    await setup(book(1));
    await pickBook('01book1');
    expect(btn('Fetch rules pages...')).toBeTruthy();
    expect(btn('Download...')).toBeUndefined();
  });

  it('offers Import the first time and Re-import after', async () => {
    await setup(withStages(book(1, { imp: null }), { import: stage('todo') }));
    await pickBook('01book1');
    expect(btn('Import...')).toBeTruthy();
    await setup(book(1));
    await pickBook('01book1');
    expect(btn('Re-import...')).toBeTruthy();
  });

  it('offers the agent prompt for an unknown book, and no import', async () => {
    await setup(withStages(book(1, { known: false, imp: null }), { import: stage('todo') }));
    await pickBook('01book1');
    expect(btn('Import...')).toBeUndefined();
    expect(btn('Re-import...')).toBeUndefined();
    expect($$('#detail .step[data-stage="import"] button')).toHaveLength(1);
  });

  it('shows the fix prompt for the item table only when the check found errors', async () => {
    await setup(book(1));
    await pickBook('01book1');
    expect(btn('Copy fix prompt')).toBeUndefined();
    await setup(book(1, { items: { exists: true, todos: 1, registered: true, check: { errors: ['x'] } } }));
    await pickBook('01book1');
    expect(btn('Copy fix prompt')).toBeTruthy();
  });

  it('offers to approve changed pictures only when some wait', async () => {
    await setup(book(1));
    await pickBook('01book1');
    expect(btn('Approve picture changes...')).toBeUndefined();
    await setup(book(1, { pins: { waiting: 2, approved: '2026-10-01', sections: ['4', '9'] } }));
    await pickBook('01book1');
    expect(btn('Approve picture changes...')).toBeTruthy();
  });

  it('shows no actions for a step that does not apply', async () => {
    await setup(withStages(book(1), { phrasings: stage('na') }));
    await pickBook('01book1');
    expect($$('#detail .step[data-stage="phrasings"] button')).toHaveLength(0);
  });

  it('labels the mark button by whether the step is marked', async () => {
    await setup(book(1, { marks: { 3: '2026-10-01' } }));
    await pickBook('01book1');
    expect($$('#detail .step[data-stage="phrasings"] button').map((b) => b.textContent)).toEqual(['Copy prompt', 'Mark not done']);
    expect($$('#detail .step[data-stage="rules"] button').map((b) => b.textContent)).toEqual(['Copy prompt', 'Mark done']);
  });

  it('disables the job buttons while a job runs', async () => {
    await boot({ books: [book(1)], running: 'Importing' }, { 'GET map/*': state });
    await pickBook('01book1');
    expect(btn('Make reading copy').disabled).toBe(true);
    expect(btn('Copy prompt').disabled).toBe(false);
  });

  it('links the test address with a new-tab target', async () => {
    await setup(book(1));
    await pickBook('01book1');
    const a = btn('Test address');
    expect(a.getAttribute('href')).toBe('http://127.0.0.1:8766/');
    expect(a.target).toBe('_blank');
  });

  describe('the map steps', () => {
    it('lists the map steps from the map API, ticking what the files show', async () => {
      await setup(book(1));
      await pickBook('01book1');
      await until(() => expect($$('#mapsteps .step.sub')).toHaveLength(11));
      const done = $$('#mapsteps .step.sub').map((s) => s.querySelector('.st').classList.contains('done'));
      expect(done.slice(0, 2)).toEqual([true, true]);        // 2K upscale, OCR draft
      expect(done[2]).toBe(false);                            // labels not checked
      expect($$('#mapsteps .step.sub')[7].querySelector('.ev').textContent).toBe('2 round(s), last 2'); // rounds > 0
      expect(done[10]).toBe(false);                           // book.js names map.png, not the 4K
    });

    it('says the map API did not answer', async () => {
      await setup(book(1), { 'GET map/*': () => [500, {}] });
      await pickBook('01book1');
      await until(() => expect($('#mapsteps').textContent).toBe('The map API did not answer.'));
    });

    it('does not read the map for a book not downloaded', async () => {
      await setup(book(1, { folder: false }));
      await pickBook('01book1');
      expect($('#mapsteps').textContent).toBe('After download.');
      expect(calls.some((c) => c.key.startsWith('GET map/'))).toBe(false);
    });

    it('offers the retype prompt only once labels.json exists and the style prompt only without style.txt', async () => {
      await setup(book(1));
      await pickBook('01book1');
      await until(() => expect($$('#mapsteps .step.sub')).toHaveLength(11));
      const rows = $$('#mapsteps .step.sub');
      expect(rows[3].querySelector('button')).not.toBeNull();   // retype prompt
      expect(rows[5].querySelector('button')).not.toBeNull();   // style prompt (no style.txt)
    });
  });
});

describe('actions', () => {
  const state = () => [200, { files: {}, rounds: [] }];
  const setup = async (b, extra = {}) => { await boot({ books: [b], running: null }, { 'GET map/*': state, ...extra }); await pickBook(b.code); };

  it('copies the prompt for the book to the clipboard and says so', async () => {
    const b = withStages(book(1), { phrasings: stage('todo') });
    await setup(b);
    $('#detail .step[data-stage="phrasings"] button').click();
    await until(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(PROMPTS.phrasings(b)));
    await until(() => expect($('#toast').textContent).toBe('Prompt copied: paste it into Claude Code'));
    expect($('#toast').hidden).toBe(false);
  });

  it('falls back to a selection copy when the clipboard is refused', async () => {
    await setup(book(1));
    navigator.clipboard.writeText = vi.fn(async () => { throw new Error('no focus'); });
    document.execCommand = vi.fn(() => true);
    $('#detail .step[data-stage="phrasings"] button').click();
    await until(() => expect(document.execCommand).toHaveBeenCalledWith('copy'));
    expect($('textarea')).toBeNull();
  });

  it('hides the toast again after its time', async () => {
    await setup(book(1));
    vi.useFakeTimers();
    $('#detail .step[data-stage="phrasings"] button').click();
    await vi.advanceTimersByTimeAsync(10);
    expect($('#toast').hidden).toBe(false);
    await vi.advanceTimersByTimeAsync(3600);
    expect($('#toast').hidden).toBe(true);
  });

  it('marks a step done through POST api/admin/mark/<book>/<step> and reloads the status', async () => {
    await setup(book(1), { 'POST admin/mark/*': () => [200, { message: 'Book 1 step 3 done' }] });
    const before = calls.filter((c) => c.key === 'GET admin/status').length;
    btn('Mark done').click();
    await until(() => expect(post('POST admin/mark/01book1/3')).toHaveLength(1));
    expect(post('POST admin/mark/01book1/3')[0].search).toBe('');
    await until(() => expect($('#toast').textContent).toBe('Book 1 step 3 done'));
    await until(() => expect(calls.filter((c) => c.key === 'GET admin/status').length).toBe(before + 1));
  });

  it('un-marks with ?undo=1', async () => {
    await setup(book(1, { marks: { 3: 'x' } }), { 'POST admin/mark/*': () => [200, { message: 'undone' }] });
    btn('Mark not done').click();
    await until(() => expect(post('POST admin/mark/01book1/3')[0]?.search).toBe('?undo=1'));
  });

  it('shows the server error when marking is refused', async () => {
    await setup(book(1), { 'POST admin/mark/*': () => [400, { error: 'NOT done: files disagree' }] });
    btn('Mark done').click();
    await until(() => expect($('#toast').textContent).toBe('NOT done: files disagree'));
  });

  it('runs an ungated job at once, without a confirm body', async () => {
    await setup(book(1), { 'POST admin/run/*': () => [200, { id: 7, title: 'Reading copy' }], 'GET admin/jobs/*': () => [200, { lines: [], from: 0, state: 'done', code: 0, started: 0, ended: 1000 }] });
    btn('Make reading copy').click();
    await until(() => expect(post('POST admin/run/reading')).toHaveLength(1));
    expect(post('POST admin/run/reading')[0].search).toBe('?book=01book1');
    expect(post('POST admin/run/reading')[0].body).toEqual({});
  });

  describe('a gated job', () => {
    const jobs = { 'POST admin/run/*': () => [200, { id: 1, title: 'Job' }], 'GET admin/jobs/*': () => [200, { lines: [], from: 0, state: 'done', code: 0, started: 0, ended: 0 }] };

    it('opens a dialog naming the book, with the button disabled until the box is ticked', async () => {
      await setup(book(1), jobs);
      btn('Re-import...').click();
      await until(() => expect($('#confirm').open).toBe(true));
      expect($('#confirm-title').textContent).toBe('Re-import Book 1?');
      expect($('#confirm-ok').textContent).toBe('Re-import Book 1');
      expect($('#confirm-ok').disabled).toBe(true);
      $('#confirm-ack').checked = true; $('#confirm-ack').dispatchEvent(new Event('change'));
      expect($('#confirm-ok').disabled).toBe(false);
      expect(post('POST admin/run/import')).toHaveLength(0);
    });

    it('runs the job with the book code as confirmation when approved', async () => {
      await setup(book(1), jobs);
      btn('Re-import...').click();
      await until(() => expect($('#confirm').open).toBe(true));
      $('#confirm').close('ok');
      await until(() => expect(post('POST admin/run/import')).toHaveLength(1));
      expect(post('POST admin/run/import')[0].body).toEqual({ confirm: '01book1' });
      expect(post('POST admin/run/import')[0].search).toBe('?book=01book1');
    });

    it('does nothing when cancelled', async () => {
      await setup(book(1), jobs);
      btn('Re-import...').click();
      await until(() => expect($('#confirm').open).toBe(true));
      $('#confirm').close('cancel');
      await flush(); await flush();
      expect(post('POST admin/run/import')).toHaveLength(0);
    });

    it('describes a first import and a re-import differently', async () => {
      await setup(withStages(book(1, { imp: null }), { import: stage('todo') }), jobs);
      btn('Import...').click();
      await until(() => expect($('#confirm-title').textContent).toBe('Import Book 1 for the first time?'));
      expect($('#confirm-body').textContent).toContain('so the book appears in the player');
      expect($('#confirm-body').textContent).toContain('Not imported yet.');
    });

    it('says what is out of date in a re-import', async () => {
      await setup(book(1, { stale: ['importer changed'] }), jobs);
      btn('Re-import...').click();
      await until(() => expect($('#confirm-body').textContent).toContain('Out of date: importer changed.'));
    });

    it('describes a download, with the size and the licence, and a Grand Master warning', async () => {
      await setup(withStages(book(1, { series: 'grand master', known: false }), { fetch: stage('todo') }), jobs); // a Grand Master book shows once its folder exists
      btn('Download...').click();
      await until(() => expect($('#confirm-title').textContent).toBe('Download Book 1?'));
      expect($('#confirm-body').textContent).toContain('about 400 files, about 4 MB');
      expect($('#confirm-body').textContent).toContain('Grand Master');
      expect($('#confirm-ack-text').textContent).toBe('I approve downloading from projectaon.org for Book 1.');
    });

    it('describes approving changed pictures, with the sections', async () => {
      await setup(book(1, { pins: { waiting: 1, approved: '2026-10-01', sections: ['4'] } }), jobs);
      btn('Approve picture changes...').click();
      await until(() => expect($('#confirm-title').textContent).toBe("Approve Book 1's new fight pictures?"));
      expect($('#confirm-body').textContent).toContain('1 fight would now show another picture than the one you approved on 2026-10-01 (sections 4)');
    });
  });

  describe('the map editor and picture sheet', () => {
    it('opens the map editor inline when the map cell is clicked, and closes it', async () => {
      await setup(book(1));
      $('tr[data-code="01book1"] td[data-stage="map"]').click();
      expect($('#mapwrap').hidden).toBe(false);
      expect($('#mapframe').dataset.src).toBe('/tools/map-editor.html?book=01book1&embed=1');
      expect($('#map-title').textContent).toBe('Map editor: 1. Stand-in 1');
      $('#map-close').click();
      expect($('#mapwrap').hidden).toBe(true);
      expect($('#mapframe').dataset.src).toBe('');
    });

    it('refuses the map editor for a book not downloaded', async () => {
      await setup(book(1, { folder: false }));
      $('tr[data-code="01book1"] td[data-stage="map"]').click();
      expect($('#mapwrap').hidden).toBe(true);
      expect($('#toast').textContent).toBe('Download the book first');
    });

    it('opens the editor at a step', async () => {
      await setup(book(1));
      await until(() => expect($$('#mapsteps .step.sub').length).toBeGreaterThan(0));
      $$('#mapsteps .step.sub button')[0].click();
      expect($('#mapframe').dataset.src).toContain('&step=1');
    });

    it('opens the picture sheet for an imported book only', async () => {
      await setup(book(1));
      btn('Open picture sheet').click();
      expect($('#mapframe').dataset.src).toBe('/tools/admin/fights.html?book=01book1&embed=1');
      expect($('#map-title').textContent).toBe('Fight pictures: 1. Stand-in 1');
    });
    it('asks to import first for an unimported book', async () => {
      await setup(book(1, { imp: null }));
      btn('Open picture sheet').click();
      expect($('#mapwrap').hidden).toBe(true);
      expect($('#toast').textContent).toBe('Import the book first');
    });

    it('asks before closing a page with unsaved changes, and keeps it open if refused', async () => {
      await setup(book(1));
      $('tr[data-code="01book1"] td[data-stage="map"]').click();
      Object.defineProperty($('#mapframe'), 'contentWindow', { value: { mapEditorDirty: () => true, document }, configurable: true });
      const ask = vi.spyOn(window, 'confirm').mockReturnValue(false);
      $('#map-close').click();
      expect(ask).toHaveBeenCalled();
      expect($('#mapwrap').hidden).toBe(false);
      ask.mockReturnValue(true);
      $('#map-close').click();
      expect($('#mapwrap').hidden).toBe(true);
    });

    it('reloads the status when the editor says its state changed (same origin only)', async () => {
      await setup(book(1));
      const n = () => calls.filter((c) => c.key === 'GET admin/status').length, before = n();
      window.dispatchEvent(new MessageEvent('message', { data: { mapEditor: 'state' }, origin: 'http://evil.test' }));
      await new Promise((r) => setTimeout(r, 500));
      expect(n()).toBe(before);
      window.dispatchEvent(new MessageEvent('message', { data: { fightSheet: 'changed' }, origin: location.origin }));
      await until(() => expect(n()).toBe(before + 1));
    });
  });
});

describe('jobs', () => {
  const state = () => [200, { files: {}, rounds: [] }];
  const finished = (lines, o = {}) => () => [200, { lines, from: 0, state: 'done', code: 0, started: 1000, ended: 4000, ...o }];

  it('follows a job: shows its title and lines, styles commands and errors, reports the end', async () => {
    await boot({ books: [book(1)], running: null }, {
      'GET map/*': state,
      'POST admin/run/*': () => [200, { id: 3, title: 'Reading copy of 1' }],
      'GET admin/jobs/*': finished(['$ python x.py', 'made 4 files', '[exit 0]']),
    });
    await pickBook('01book1');
    btn('Make reading copy').click();
    await until(() => expect($('#log-state').textContent).toBe('finished (exit 0) in 3 s'));
    expect($('#log').hidden).toBe(false);
    expect($('#log-title').textContent).toBe('Reading copy of 1');
    const spans = $$('#log-out span');
    expect(spans.map((s) => s.textContent)).toEqual(['$ python x.py\n', 'made 4 files\n', '[exit 0]\n']);
    expect(spans.map((s) => s.className)).toEqual(['cmd', '', 'mock']);
    expect(calls.find((c) => c.key === 'GET admin/jobs/3').search).toBe('?from=0');
  });

  it('says FAILED with the exit code when the job fails', async () => {
    await boot({ books: [book(1)], running: null }, { 'GET map/*': state, 'POST admin/run/*': () => [200, { id: 3, title: 'T' }], 'GET admin/jobs/*': finished(['[error] x'], { state: 'failed', code: 2 }) });
    await pickBook('01book1');
    btn('Make reading copy').click();
    await until(() => expect($('#log-state').textContent).toBe('FAILED (exit 2) in 3 s'));
  });

  it('polls again while running and asks only for the new lines', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    let n = 0;
    await boot({ books: [book(1)], running: 'Job' }, {
      'GET admin/jobs': () => [200, [{ id: 9, title: 'Running job', state: 'running' }]],
      'GET admin/jobs/*': () => [200, n++ === 0 ? { lines: ['one', 'two'], from: 0, state: 'running', started: Date.now() } : { lines: ['three'], from: 2, state: 'done', code: 0, started: 0, ended: 1000 }],
    });
    await vi.advanceTimersByTimeAsync(1000);
    const polls = calls.filter((c) => c.key === 'GET admin/jobs/9');
    expect(polls.map((c) => c.search)).toEqual(['?from=0', '?from=2']);
    expect($$('#log-out span').map((s) => s.textContent)).toEqual(['one\n', 'two\n', 'three\n']);
  });

  it('follows a job already running when the page loads', async () => {
    await boot({ books: [book(1)], running: 'Job' }, {
      'GET admin/jobs': () => [200, [{ id: 5, title: 'Earlier job', state: 'running' }]],
      'GET admin/jobs/*': finished([]),
    });
    await until(() => expect($('#log-title').textContent).toBe('Earlier job'));
  });

  it('does not follow a finished job from the list', async () => {
    await boot({ books: [book(1)], running: null }, { 'GET admin/jobs': () => [200, [{ id: 5, title: 'Old', state: 'done' }]] });
    expect($('#log').hidden).toBe(true);
  });

  it('toasts the error when a job cannot start', async () => {
    await boot({ books: [book(1)], running: null }, { 'GET map/*': state, 'POST admin/run/*': () => [409, { error: 'another job is running' }] });
    await pickBook('01book1');
    btn('Make reading copy').click();
    await until(() => expect($('#toast').textContent).toBe('another job is running'));
    expect($('#log').hidden).toBe(true);
  });

  it('closes the log with its button', async () => {
    await boot({ books: [book(1)], running: 'x' }, { 'GET admin/jobs': () => [200, [{ id: 5, title: 'J', state: 'running' }]], 'GET admin/jobs/*': finished([]) });
    await until(() => expect($('#log').hidden).toBe(false));
    $('#log-close').click();
    expect($('#log').hidden).toBe(true);
  });

  it('says so when the job is lost', async () => {
    await boot({ books: [book(1)], running: 'x' }, { 'GET admin/jobs': () => [200, [{ id: 5, title: 'J', state: 'running' }]], 'GET admin/jobs/*': () => [404, { error: 'no such job' }] });
    await until(() => expect($('#log-state').textContent).toBe('no such job'));
  });
});

describe('the whole-project buttons', () => {
  const ok = { 'POST admin/run/*': () => [200, { id: 1, title: 'J' }], 'GET admin/jobs/*': () => [200, { lines: [], from: 0, state: 'done', code: 0, started: 0, ended: 0 }] };

  it('runs an ungated tool with no book', async () => {
    await boot({ books: [book(1)], running: null }, ok);
    document.querySelector('[data-global="offline"]').click();
    await until(() => expect(post('POST admin/run/offline')).toHaveLength(1));
    expect(post('POST admin/run/offline')[0].search).toBe('');
    expect(post('POST admin/run/offline')[0].body).toEqual({});
  });

  it('asks before re-importing every book, counting the imported and the out of date', async () => {
    await boot({ books: [book(1), book(2, { stale: ['x'] }), book(3, { imp: null })], running: null }, ok);
    document.querySelector('[data-global="reimport-all"]').click();
    await until(() => expect($('#confirm').open).toBe(true));
    expect($('#confirm-title').textContent).toBe('Re-import every book?');
    expect($('#confirm-body').textContent).toContain('for 2 imported books (1 out of date)');
    $('#confirm').close('ok');
    await until(() => expect(post('POST admin/run/reimport-all')).toHaveLength(1));
    expect(post('POST admin/run/reimport-all')[0].body).toEqual({ confirm: 'all' });
  });

  it('does not re-import when cancelled', async () => {
    await boot({ books: [book(1)], running: null }, ok);
    document.querySelector('[data-global="reimport-all"]').click();
    await until(() => expect($('#confirm').open).toBe(true));
    $('#confirm').close('cancel');
    await flush(); await flush();
    expect(post('POST admin/run/reimport-all')).toHaveLength(0);
  });

  it('reads the release state, shows the commit and what is left out, then releases', async () => {
    await boot({ books: [book(1)], running: null }, {
      ...ok,
      'GET admin/release': () => [200, { head: { commit: 'abc1234', subject: 'A change' }, current: { commit: 'old9999', subject: 'Before', made: 'yesterday' }, commits_since: 3, dirty: 2 }],
    });
    document.querySelector('[data-global="release"]').click();
    await until(() => expect($('#confirm-title').textContent).toBe('Release to the iPad?'));
    const t = $('#confirm-body').textContent;
    expect(t).toContain('abc1234');
    expect(t).toContain('old9999');
    expect(t).toContain('2 files have uncommitted changes');
    $('#confirm').close('ok');
    await until(() => expect(post('POST admin/run/release')[0]?.body).toEqual({ confirm: 'all' }));
  });

  it('says the commit is already released when it is', async () => {
    await boot({ books: [book(1)], running: null }, { 'GET admin/release': () => [200, { head: { commit: 'same', subject: 's' }, current: { commit: 'same' }, commits_since: 0, dirty: 0 }] });
    document.querySelector('[data-global="release"]').click();
    await until(() => expect($('#confirm-body').textContent).toContain('already released'));
  });

  it('toasts when the release state cannot be read', async () => {
    await boot({ books: [book(1)], running: null }, { 'GET admin/release': () => [500, { error: 'git missing' }] });
    document.querySelector('[data-global="release"]').click();
    await until(() => expect($('#toast').textContent).toBe('git missing'));
    expect($('#confirm').open).toBeFalsy();
  });
});

describe('leaving the page', () => {
  it('blocks unload while the editor has unsaved changes', async () => {
    await boot({ books: [book(1)], running: null });
    Object.defineProperty($('#mapframe'), 'contentWindow', { value: { mapEditorDirty: () => true }, configurable: true });
    const e = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
  });
  it('lets the page go when nothing is unsaved', async () => {
    await boot({ books: [book(1)], running: null });
    const e = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
  });
});
