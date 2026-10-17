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

const STAGE_IDS = ['fetch', 'import', 'phrasings', 'rules', 'reading', 'items', 'testplay', 'pictures', 'map', 'ills'];
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
    expect($$('#grid thead tr.groups th').map((t) => t.textContent).filter(Boolean)).toEqual(['Getting the book', 'Items', 'Play', 'Pictures']);
    expect($$('#grid thead tr:nth-child(2) th').map((t) => t.textContent)).toEqual(['Book', 'Download', 'Import', 'Phrasings', 'Rules', 'Reading copy', 'Item table', 'Test play', 'Fights', 'Map', 'Illustrations', 'Next']);
  });

  it('has a row per book and folds the books not downloaded, whatever their series', async () => {
    await boot({ books: [...books(), book(4, { folder: false, imp: null })], running: null });
    expect($$('#grid tbody tr[data-code]').map((r) => r.dataset.code)).toEqual(['01book1', '02book2', '03book3']);
    expect($('tr.fold').textContent).toMatch(/Books 4, 13-14: not downloaded/);
  });





  it('names the next step: an undone one first, then a stale one, or done', async () => {
    await boot({ books: books(), running: null });
    const next = (code) => $(`tr[data-code="${code}"] td.next`).textContent.trim();
    expect(next('01book1')).toBe('done');
    expect(next('02book2')).toBe('Phrasings');
    expect(next('03book3')).toBe('Rules');
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
    expect($$('#detail .step:not(.sub)')).toHaveLength(10);
    expect($('#detail .meta').textContent).toContain('350 sections, 40 fights, 25 kinds of enemy');
    expect($('#detail .nextup').textContent).toBe('Every step done.');
  });


  it('says what is next and who does it', async () => {
    await setup(withStages(book(1), { phrasings: stage('todo') }));
    await pickBook('01book1');
    expect($('#detail .nextup').textContent).toBe('Next: Phrasings (Claude Code: copy the prompt)');
  });










});

describe('actions', () => {
  const state = () => [200, { files: {}, rounds: [] }];
  const setup = async (b, extra = {}) => { await boot({ books: [b], running: null }, { 'GET map/*': state, ...extra }); await pickBook(b.code); };




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


  it('runs an ungated job at once, without a confirm body', async () => {
    await setup(book(1), { 'POST admin/run/*': () => [200, { id: 7, title: 'Reading copy' }], 'GET admin/jobs/*': () => [200, { lines: [], from: 0, state: 'done', code: 0, started: 0, ended: 1000 }] });
    btn('Make reading copy').click();
    await until(() => expect(post('POST admin/run/reading')).toHaveLength(1));
    expect(post('POST admin/run/reading')[0].search).toBe('?book=01book1');
    expect(post('POST admin/run/reading')[0].body).toEqual({});
  });

  it('upscales a book\'s illustrations at once, and offers the re-import that shows them once they are made', async () => {
    await setup(withStages(book(1), { ills: stage('warn') }), { 'POST admin/run/*': () => [200, { id: 8, title: 'Upscale illustrations' }], 'GET admin/jobs/*': () => [200, { lines: [], from: 0, state: 'done', code: 0, started: 0, ended: 1000 }] });
    const step = $('#detail .step[data-stage="ills"]');
    expect([...step.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Upscale 2x', 'Open illustration sheet', 'Re-import...']);
    step.querySelector('button').click();
    await until(() => expect(post('POST admin/run/ills')).toHaveLength(1));
    expect(post('POST admin/run/ills')[0].search).toBe('?book=01book1');
    expect(post('POST admin/run/ills')[0].body).toEqual({});
  });

  it('upscales a book\'s fight pictures from step 7, at once', async () => {
    await setup(book(1), { 'POST admin/run/*': () => [200, { id: 9, title: 'Upscale fight pictures' }], 'GET admin/jobs/*': () => [200, { lines: [], from: 0, state: 'done', code: 0, started: 0, ended: 1000 }] });
    [...$('#detail .step[data-stage="pictures"]').querySelectorAll('button')].find((b) => b.textContent === 'Upscale 2x').click();
    await until(() => expect(post('POST admin/run/fights-up')).toHaveLength(1));
    expect(post('POST admin/run/fights-up')[0].search).toBe('?book=01book1');
    expect(post('POST admin/run/fights-up')[0].body).toEqual({});
  });

  it('opens the illustration sheet for the book inline under the grid', async () => {
    await setup(book(1));
    const step = $('#detail .step[data-stage="ills"]');
    [...step.querySelectorAll('button')].find((b) => b.textContent === 'Open illustration sheet').click();
    expect($('#mapwrap').hidden).toBe(false);
    expect($('#mapframe').dataset.src).toBe('/tools/admin/ills.html?book=01book1&embed=1');
    expect($('#map-title').textContent).toBe('Illustrations: 1. Stand-in 1');
  });

  it('opens the item sheet for a book with an item table, inline under the grid', async () => {
    await setup(book(1));
    const button = () => [...$('#detail .step[data-stage="items"]').querySelectorAll('button')].find((b) => b.textContent === 'Open item sheet');
    button().click();
    expect($('#mapframe').dataset.src).toBe('/tools/admin/items.html?book=01book1&embed=1');
    expect($('#map-title').textContent).toBe('Items: 1. Stand-in 1');
    await setup(book(2, { items: { exists: false, todos: 0, registered: false, check: null } }));
    expect(button()).toBeUndefined();
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





});

