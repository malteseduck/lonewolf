"""tools/book_status.py against a temporary project tree: every path constant is pointed at tmp_path and
subprocess.run is replaced by a recorder, so no node process starts and nothing real is read or written.
Book data are stand-ins (made-up sections), never Project Aon text."""
import datetime
import json
import os
from types import SimpleNamespace

import pytest

import book_status as bs

T0 = 1_700_000_000  # an arbitrary epoch second the tests count from
CODE, TITLE, N = '03tcok', 'The Caverns of Kalte', 3
CLEAN = {'1': {'text': [], 'choices': [{'to': '2'}]}, '2': {'text': [], 'choices': [], 'end': 'victory'}}


class Env:
    def __init__(self, root):
        self.root = root

    def path(self, *p):
        return self.root.joinpath(*p)

    def write(self, rel, text='', t=None):
        f = self.root.joinpath(*rel.split('/'))
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(text, encoding='utf-8')
        if t is not None:
            os.utime(f, (T0 + t, T0 + t))
        return f

    def touch(self, rel, t=None):
        return self.write(rel, 'x', t)

    def book(self, code=CODE, sections=None, t=100, map_name='map.png', report=True):
        book = {'id': code, 'sections': CLEAN if sections is None else sections, 'map': map_name}
        js = ('(window.LW = window.LW || {}).BOOKS = Object.assign(window.LW.BOOKS || {}, '
              + json.dumps({code: book}) + ');\n')
        self.write(f'data/projectaon/{code}/book.js', js, t)
        if report:
            self.write(f'data/projectaon/{code}/import-report.json', '{}', t)

    def downloaded(self, code=CODE, sects=3, rules=True, t=0):
        for i in range(1, sects + 1):
            self.touch(f'data/projectaon/{code}/sect{i}.htm', t)
        if rules:
            self.touch(f'data/projectaon/{code}/gamerulz.htm', t)

    def status(self, code=CODE, title=TITLE, n=N, **kw):
        kw.setdefault('hand', {})
        kw.setdefault('main_js', '')
        kw.setdefault('rules_md', '')
        kw.setdefault('known', {code})
        return bs.book_status(code, title, n, **kw)


SERIES_JS = """  LW.SERIES = {
    kai: { name: 'Kai', first: 5 },
    magnakai: { name: 'Magnakai', first: 3 },
  };
"""


@pytest.fixture
def env(tmp_path, monkeypatch):
    e = Env(tmp_path)
    e.write('shared/rules-series.js', SERIES_JS)
    monkeypatch.setattr(bs, 'ROOT', str(tmp_path))
    monkeypatch.setattr(bs, 'DATA', str(tmp_path / 'data' / 'projectaon'))
    monkeypatch.setattr(bs, 'STATUS', str(tmp_path / 'docs' / 'book-status.json'))
    monkeypatch.setattr(bs, 'CHECKLIST', str(tmp_path / 'docs' / 'book-checklist.md'))
    monkeypatch.setattr(bs, 'IMPORTER', str(tmp_path / 'tools' / 'import_projectaon.py'))
    monkeypatch.setattr(bs, 'PINS', str(tmp_path / 'assets' / 'plates' / 'approved'))
    bs._cache.clear()
    bs._pin_cache.clear()
    e.calls = []

    def fake_run(cmd, **kw):
        e.calls.append(cmd)
        return SimpleNamespace(returncode=0, stdout=getattr(e, 'node_out', ''), stderr='')
    monkeypatch.setattr(bs.subprocess, 'run', fake_run)
    return e


# ---- small helpers ----


def test_steps_and_hand_marks():
    assert sorted(bs.STEPS) == list(range(1, 10))
    assert bs.HAND == {3, 4, 6, 7}
    assert [s[0] for s in bs.STEPS.values()] == ['fetch', 'import', 'phrasings', 'rules', 'items', 'testplay', 'pictures', 'map', 'ills']


# ---- import_stats ----
def stats_book(env, sections, plates=None, map_name='map.png'):
    env.book(sections=sections, map_name=map_name)
    if plates is not None:
        env.write('assets/plates/plates.json', plates if isinstance(plates, str) else json.dumps({'plates': plates}), 50)
    js = os.path.join(bs.DATA, CODE, 'book.js')
    return bs.import_stats(CODE, js, os.path.join(bs.ROOT, 'assets', 'plates', 'plates.json'))


def fight(*names_art):
    return {'text': [], 'choices': [{'to': '1'}],
            'combat': {'enemies': [{'name': n, **({'art': a} if a else {})} for n, a in names_art]}}


# ---- map_stage ----


# ---- book_status: stages ----
def test_nothing_on_disk(env):
    b = env.status()
    st = b['stages']
    assert (b['folder'], b['known'], b['series'], b['imp'], b['mapStage']) == (False, True, 'kai', None, None)
    assert st['fetch'] == {'state': 'todo', 'ev': 'Not downloaded (about 400 files, about 4 MB). Needs your go-ahead', 'src': 'disk'}
    assert st['import']['state'] == 'todo' and st['import']['ev'] == 'No book.js'
    assert [st[k]['state'] for k in ('phrasings', 'rules', 'reading', 'items', 'pictures', 'testplay')] == ['todo'] * 6
    assert st['items']['ev'] == f'No items-{CODE}.js'
    assert st['map'] == {'state': 'todo', 'ev': 'After download', 'src': 'disk'}


def test_fetch_states(env):
    env.downloaded(sects=0, rules=False)
    assert env.status()['stages']['fetch']['state'] == 'todo'
    env.downloaded(sects=3, rules=False)
    f = env.status()['stages']['fetch']
    assert f['state'] == 'warn' and f['ev'].startswith('3 section pages; rules pages missing')
    env.downloaded(sects=3, rules=True)
    f = env.status()['stages']['fetch']
    assert f['state'] == 'done' and f['ev'] == '3 section pages and the rules pages on disk'


def test_import_clean_done_with_figures(env):
    env.downloaded(t=0)
    env.touch('tools/import_projectaon.py', 0)
    env.book(t=100)
    b = env.status()
    s = b['stages']['import']
    assert s['state'] == 'done' and s['ev'].startswith('2 sections, 0 fights; 0 broken links, 0 with no way on. Imported ')
    assert b['stale'] == [] and b['imp']['sections'] == 2


def test_import_with_broken_links_or_dead_sections_is_bad(env):
    env.downloaded(t=0)
    env.book(sections={'1': {'text': [], 'choices': [{'to': '9'}]}, '2': {'text': [], 'choices': []}})
    s = env.status()['stages']['import']
    assert s['state'] == 'bad' and '1 broken links, 1 with no way on' in s['ev']


def test_import_out_of_date_when_importer_or_a_source_page_is_newer(env):
    env.downloaded(t=0)
    env.touch('tools/import_projectaon.py', 200)
    env.book(t=100)
    b = env.status()
    assert b['stale'] == ['the importer changed since']
    assert b['stages']['import']['state'] == 'warn' and b['stages']['import']['ev'].endswith('Out of date: the importer changed since')
    env.touch('tools/import_projectaon.py', 0)
    env.touch(f'data/projectaon/{CODE}/sect2.htm', 300)
    assert env.status()['stale'] == ['a source page is newer']


def test_rules_stage(env):
    heading = '### Book 3, The Caverns of Kalte\n'
    mark = {'books': {CODE: {'4': '2026-02-03'}}}
    r = env.status()['stages']['rules']
    assert r['state'] == 'todo' and r['ev'] == 'No addendum in rules-books.md'
    r = env.status(rules_md=heading)['stages']['rules']
    assert r['state'] == 'warn' and 'not marked checked' in r['ev']
    r = env.status(rules_md=heading, hand=mark)['stages']['rules']
    assert r['state'] == 'done' and r['ev'] == 'Addendum in rules-books.md. Marked done 2026-02-03'
    r = env.status(hand=mark)['stages']['rules']
    assert r['state'] == 'warn' and 'there is no "Book N" heading' in r['ev']


def test_rules_stage_shows_the_rules_diff(env):
    env.downloaded(t=100)
    r = lambda **kw: env.status(**kw)['stages']['rules']
    assert r()['ev'] == 'No addendum in rules-books.md. Not diffed yet (Diff rules)'
    # tools/rules_diff.py --json: the paragraphs to read, against the book before
    env.write(f'data/projectaon/{CODE}/rules-diff.json', json.dumps({'look': 31, 'against': '02fotw'}), 200)
    assert r() == {'state': 'todo', 'num': 31, 'src': 'hand',
                   'ev': 'No addendum in rules-books.md. Diff: 31 paragraphs to read against 02fotw; its draft is rules-draft.md (Copy prompt)'}
    assert r(rules_md='### Book 3, The Caverns of Kalte\n')['ev'] == ('Addendum written in rules-books.md; not marked checked. '
                                                                       'Diff: 31 paragraphs to read against 02fotw')
    # a rules page fetched again since: out of date
    env.touch(f'data/projectaon/{CODE}/gamerulz.htm', 300)
    assert r()['ev'] == 'No addendum in rules-books.md. Diff out of date: a rules page is newer (Diff rules)'


def test_reading_copy_stage(env):
    env.book(t=100)
    s = lambda: env.status()['stages']['reading']
    assert s()['state'] == 'todo' and 'not both made' in s()['ev']
    env.touch(f'data/projectaon/{CODE}/reading.txt', 150)
    assert s()['state'] == 'todo'
    env.touch(f'data/projectaon/{CODE}/items-reading.txt', 160)
    assert s()['state'] == 'done' and s()['ev'].startswith('Made ')
    env.touch(f'data/projectaon/{CODE}/reading.txt', 90)            # older than book.js
    assert s()['state'] == 'warn' and s()['ev'].startswith('Older than book.js')
    env.touch(f'data/projectaon/{CODE}/reading.txt', 170)           # newer than items-reading
    assert s()['state'] == 'warn'


REG = "const ITEM_TABLES = {\n  '03tcok': T3,\n  '04tcod': T4,\n};\n"


def test_items_stage_walks_through_its_states(env):
    env.book(t=100)
    st = lambda **kw: env.status(main_js=kw.get('main_js', ''))['stages']['items']
    assert st()['state'] == 'todo'
    env.write(f'items/items-{CODE}.js', 'export default { a: { todo: "x" }, b: { todo: "y" }, c: {} };', 200)
    assert st()['state'] == 'warn' and 'not in main.js ITEM_TABLES' in st()['ev']
    assert st(main_js="const ITEM_TABLES = {\n '04tcod': T4,\n};")['state'] == 'warn'     # another book's entry
    s = st(main_js=REG)
    assert s['state'] == 'warn' and s['num'] == 2 and s['ev'].startswith('2 todos; check_items.mjs not run yet')
    env.write(f'data/projectaon/{CODE}/check-items.json', json.dumps({'errors': ['e1', 'e2', 'e3']}), 300)
    s = st(main_js=REG)
    assert s['state'] == 'bad' and s['num'] == 3 and s['ev'] == 'check_items.mjs: 3 errors'
    env.write(f'data/projectaon/{CODE}/check-items.json', json.dumps({'errors': []}), 150)    # older than the table
    s = st(main_js=REG)
    assert s['state'] == 'warn' and 'changed since the last check' in s['ev']
    env.write(f'data/projectaon/{CODE}/check-items.json', json.dumps({'errors': []}), 300)
    s = st(main_js=REG)
    assert s['state'] == 'done' and s['num'] == 2 and s['ev'] == 'Registered, check clean; 2 todo entries left to the player'


def test_items_stage_a_script_draft_is_not_done_even_registered_and_clean(env):
    env.book(t=100)
    st = lambda **kw: env.status(main_js=kw.get('main_js', ''))['stages']['items']
    env.write(f'items/items-{CODE}.js', '// DRAFT by tools/items_draft.mjs (2026-10-14): 3 sections, 2 with a todo.\n'
              'export const SECTIONS = { 1: { todo: "x" }, 2: { todo: "y" }, 3: { ep: -2 } };', 200)
    s = st()
    assert s['state'] == 'todo' and s['num'] == 2 and s['ev'] == "The script's draft, 2 todos: not read yet (Copy prompt)"
    env.write(f'data/projectaon/{CODE}/check-items.json', json.dumps({'errors': []}), 300)
    assert st(main_js=REG)['state'] == 'todo'
    assert env.status(main_js='')['items']['draft'] is True


def test_phrasings_stage_follows_the_scan_and_the_mark(env):
    env.book(t=100)
    ph = lambda **kw: env.status(**kw)['stages']['phrasings']
    assert ph() == {'state': 'todo', 'ev': 'Not scanned yet (Scan phrasings)', 'src': 'hand'}
    # tools/phrasings_scan.py --json: sections left to judge
    env.write(f'data/projectaon/{CODE}/phrasings.json', json.dumps({'look': [7, 21]}), 200)
    assert ph() == {'state': 'todo', 'num': 2, 'src': 'hand', 'ev': 'Scan: 2 sections to look at (7, 21); judge each (Copy prompt), then mark'}
    # none left: the owner's mark
    env.write(f'data/projectaon/{CODE}/phrasings.json', json.dumps({'look': []}), 200)
    assert ph()['state'] == 'warn' and ph()['ev'] == 'Scan: none left to look at; yours to mark'
    assert ph(hand={'books': {CODE: {'3': '2026-10-14'}}}) == {'state': 'done', 'src': 'hand',
                                                               'ev': 'Judged by reading the sections against the importer. Scan: none left to look at. Marked done 2026-10-14'}
    # a re-import since: the scan is out of date
    env.book(t=300)
    assert ph()['ev'] == 'Scan out of date: book.js or the importer changed since (Scan phrasings)'


def test_testplay_stage_follows_the_walk_and_the_mark(env):
    env.book(t=100)
    env.write('shared/rules-series.js', SERIES_JS, 0)  # the engine, older than the walk
    tp = lambda **kw: env.status(**kw)['stages']['testplay']
    assert tp() == {'state': 'todo', 'ev': 'Not walked yet (Walk the book)', 'src': 'hand'}
    # tools/walk_book.mjs --json: sections to look at, by id
    walk = lambda look: json.dumps({'look': look, 'sections': 350, 'standIns': [{'reached': 340}, {'reached': 200}]})
    env.write(f'data/projectaon/{CODE}/walk.json', walk(['7', '21']), 200)
    assert tp() == {'state': 'todo', 'num': 2, 'src': 'hand', 'ev': 'Walk: 2 sections to look at (7, 21); then play it through (Copy prompt)'}
    env.write(f'data/projectaon/{CODE}/walk.json', walk([]), 200)
    assert tp() == {'state': 'todo', 'src': 'hand', 'ev': 'Walk: nothing to look at (340 of 350 sections reached); then play it through (Copy prompt)'}
    # the play-through's mark, with the walk's line beside it
    assert tp(hand={'books': {CODE: {'6': '2026-10-15'}}}) == {'state': 'done', 'src': 'hand',
        'ev': 'Every gate, fight and draw tried with test characters. Walk: nothing to look at (340 of 350 sections reached). Marked done 2026-10-15'}
    # the engine changed since: out of date
    env.write('shared/fight.js', '', 300)
    assert tp()['ev'] == 'Walk out of date: book.js, the item table or the engine changed since (Walk the book)'


def test_pictures_stage(env):
    sections_bare = {'1': fight(('Rat', None), ('Bat', 'ill1.png')), '2': {'text': [], 'choices': [], 'end': 'victory'}}
    env.write('assets/plates/plates.json', '{"plates": []}', 0)
    env.book(sections=sections_bare, t=100)
    p = env.status()['stages']['pictures']
    assert p['state'] == 'todo' and p['num'] == 1 and p['ev'] == '1 of 2 kinds of enemy have no picture'
    p = env.status(hand={'books': {CODE: {'7': '2026-03-04'}}})['stages']['pictures']
    assert p['state'] == 'warn' and p['ev'] == 'Marked done 2026-03-04, but 1 of 2 kinds of enemy have no picture'


def test_pictures_stage_needs_every_fight_picture_upscaled(env):
    env.write('assets/plates/plates.json', json.dumps({'plates': [{'match': 'rat', 'src': 'assets/plates/rat.png'}]}), 0)
    env.book(sections={'1': fight(('Rat', None), ('Bat', 'ill1.png')), '2': {'text': [], 'choices': [], 'end': 'victory'}}, t=100)
    env.touch('assets/plates/rat.png', 0)
    env.touch(f'data/projectaon/{CODE}/ill1.png', 0)
    p = env.status()['stages']['pictures']
    assert p['state'] == 'todo' and p['num'] == 2 and p['ev'] == '2 of 2 fight pictures not upscaled 2x yet (Upscale 2x)'
    # a copy beside each, listed: one listed but missing, then both
    env.write(f'assets/plates/upscaled/{CODE}.json', json.dumps({'srcs': ['assets/plates/rat.png', f'data/projectaon/{CODE}/ill1.png']}))
    env.touch('assets/plates/rat-2x.webp', 10)
    assert env.status()['stages']['pictures']['num'] == 1
    env.touch(f'data/projectaon/{CODE}/ill1-2x.webp', 10)
    assert env.status()['stages']['pictures']['state'] == 'warn'                 # waiting for the owner's look
    # the rat's picture made the script's pick (tools/plates_draft.py): the sheet's line says so
    env.write('assets/plates/plates.json', json.dumps({'plates': [{'match': '^rat$', 'book': CODE, 'src': 'assets/plates/rat.png', 'draft': 'stand-in'}]}), 5)
    assert "picture (1 the script's picks), upscaled" in env.status()['stages']['pictures']['ev']
    # the original replaced since: its copy is out of date
    env.touch('assets/plates/rat.png', 20)
    env.write(f'assets/plates/approved/{CODE}.json', json.dumps({'pins': {}}))
    p = env.status(hand={'books': {CODE: {'7': '2026-03-04'}}})['stages']['pictures']
    assert p['state'] == 'warn' and p['ev'] == 'Marked done 2026-03-04, but 1 of 2 fight pictures not upscaled 2x yet (Upscale 2x)'


def test_mark_step_7_refused_until_the_fight_pictures_are_upscaled(marking):
    pictured_book(marking)
    marking.touch(f'data/projectaon/{CODE}/ill1.png', 0)
    ok, msg = bs.mark(CODE, 7)
    assert not ok and msg.endswith('1 of 1 fight pictures not upscaled 2x yet (Upscale 2x)')
    assert not marking.path('docs', 'book-status.json').exists()
    marking.write(f'assets/plates/upscaled/{CODE}.json', json.dumps({'srcs': [f'data/projectaon/{CODE}/ill1.png']}))
    marking.touch(f'data/projectaon/{CODE}/ill1-2x.webp', 10)
    assert bs.mark(CODE, 7)[0] and '7' in marks(marking)[CODE]


def pictured_book(env):
    env.write('assets/plates/plates.json', '{"plates": []}', 0)
    env.book(sections={'1': fight(('Rat', 'ill1.png')), '2': {'text': [], 'choices': [], 'end': 'victory'}}, t=100)


def test_testplay_follows_the_mark(env):
    assert env.status()['stages']['testplay']['state'] == 'todo'
    t = env.status(hand={'books': {CODE: {'6': '2026-05-06'}}})['stages']['testplay']
    assert t['state'] == 'done' and t['ev'].endswith('. Marked done 2026-05-06')


def test_a_book_whose_series_the_engine_lacks_gets_every_step_that_works(env):
    # ADR 0036: everything but test play, and an item table read and checked but not registered;
    # the engine's series are read from shared/rules-series.js (the fixture's stand-in has kai and magnakai)
    gm = dict(code='13tplor', title='The Plague Lords', n=13)
    env.downloaded(code='13tplor')
    env.book(code='13tplor', t=100)
    st = env.status(**gm)['stages']
    assert st['testplay']['state'] == 'na' and 'Grand Master' in st['testplay']['ev']
    assert {k: st[k]['state'] for k in ('phrasings', 'rules', 'reading', 'items')} == {k: 'todo' for k in ('phrasings', 'rules', 'reading', 'items')}
    assert st['pictures']['state'] == 'warn'     # no fights in the stand-in: all pictured, waiting for the owner's mark
    env.write('items/items-13tplor.js', 'export const SECTIONS = { 1: { todo: "x" } };', 200)
    env.write('data/projectaon/13tplor/check-items.json', json.dumps({'errors': []}), 300)
    s = env.status(**gm)['stages']['items']
    assert s['state'] == 'warn' and s['ev'] == "1 todos; read and checked clean. Registering it waits for the engine's Grand Master rules (docs/plan.md)"
    assert env.status(**gm, hand={'books': {'13tplor': {'6': '2026-05-06'}}})['stages']['testplay']['state'] == 'na'
    assert env.status(**gm)['playable'] is False and env.status()['playable'] is True
    # once the engine has the series, the same book is played and registered like any other
    env.write('shared/rules-series.js', SERIES_JS.replace('    magnakai:', '    grandmaster: {},\n    magnakai:'))
    assert env.status(**gm)['playable'] is True
    assert env.status(**gm)['stages']['testplay']['state'] == 'todo'
    assert 'not in main.js ITEM_TABLES' in env.status(**gm)['stages']['items']['ev']


def test_mark_step_6_refused_for_a_grand_master_book(marking):
    marking.downloaded(code='13tplor')
    marking.book(code='13tplor', t=100)
    ok, msg = bs.mark('13tplor', 6)
    assert not ok and 'Grand Master' in msg


def test_map_stage_in_the_book_status(env):
    env.downloaded()
    assert env.status()['stages']['map'] == {'state': 'na', 'ev': 'No printed map', 'src': 'disk'}
    env.touch(f'data/projectaon/{CODE}/map.png')
    m = env.status()['stages']['map']
    assert m['state'] == 'todo' and m['ev'] == 'Map: not started' and m['num'] == 'not started'
    env.touch(f'data/projectaon/{CODE}/map-4k.webp')
    m = env.status()['stages']['map']
    assert m['state'] == 'warn' and m['ev'] == 'map-4k.webp made; re-import to show it'
    env.book(map_name='map-4k.webp')
    m = env.status()['stages']['map']
    assert m['state'] == 'done' and m['ev'] == 'map-4k.webp made and shown in the player'


def test_ills_stage_upscaled_beside_the_originals_then_shown(env):
    env.downloaded()
    d = f'data/projectaon/{CODE}'
    assert env.status()['stages']['ills'] == {'state': 'na', 'ev': 'No illustrations', 'src': 'disk'}
    for f in ('ill1.png', 'ill2.png', 'small1.png'):
        env.touch(f'{d}/{f}')
    s = env.status()['stages']['ills']
    assert s['state'] == 'todo' and s['num'] == 3 and s['ev'] == '3 of 3 illustrations not upscaled yet'
    env.touch(f'{d}/ill1-2x.webp')
    s = env.status()['stages']['ills']
    assert s['state'] == 'todo' and s['num'] == 2
    env.touch(f'{d}/ill2-2x.webp')
    env.touch(f'{d}/small1-2x.webp')
    sec = lambda f: {'text': [], 'choices': [{'to': '2'}], 'img': {'file': f, 'full': f.startswith('ill'), 'at': 0}}
    # made, but book.js still names the originals: the import is out of date, the step waits for it
    env.book(sections={'1': sec('ill1.png'), '2': {**sec('small1.png'), 'choices': [], 'end': 'victory'}})
    b = env.status()
    assert b['stages']['ills'] == {'state': 'warn', 'ev': '3 illustrations upscaled; re-import to show them', 'src': 'disk'}
    assert 'upscaled illustrations not named yet' in b['stale']
    env.book(sections={'1': sec('ill1-2x.webp'), '2': {**sec('small1-2x.webp'), 'choices': [], 'end': 'victory'}}, t=200)
    b = env.status()
    assert b['stages']['ills'] == {'state': 'done', 'ev': '3 illustrations upscaled and shown in the player', 'src': 'disk'}
    assert b['stale'] == []


# ---- pin_report ----


# ---- checklist table ----
def fake_books(*specs):
    out = []
    for n, folder, states in specs:
        out.append({'n': n, 'folder': folder, 'stages': {sid: {'state': states[i % len(states)]} for i, (sid, _) in enumerate(bs.STEPS.values())}})
    return out


def test_checklist_table_layout():
    table = bs.checklist_table(fake_books((1, True, ['done']), (2, True, ['todo', 'warn'])))
    lines = table.split('\n')
    assert lines[0] == '| Step | 1 | 2 |' and lines[1] == '|---|---|---|'
    assert len(lines) == 2 + 4 + 9
    assert lines[2] == '| **Getting the book** | | |'
    assert lines[3] == f'| 1. Downloaded | ✅ | ⬜ |'
    assert lines[4].startswith('| 2. Imported; report clean') and lines[4].endswith('| ✅ | ⚠️ |')
    groups = [l for l in lines if l.startswith('| **')]
    assert [g.split('**')[1] for g in groups] == ['Getting the book', 'Items', 'Play', 'Pictures']
    # a group heading comes just before its first step
    assert lines[lines.index(next(l for l in lines if '5. Item table' in l)) - 1].startswith('| **Items**')
    # the picture work comes last, together: fight pictures, map, illustrations
    assert lines[lines.index(next(l for l in lines if l.startswith('| 7. Every enemy has a fight picture'))) - 1].startswith('| **Pictures**')


def test_checklist_table_marks_each_state():
    states = ['done', 'todo', 'na', 'warn', 'bad']
    table = bs.checklist_table(fake_books((1, True, states)))
    cells = [l.split('|')[2].strip() for l in table.split('\n') if l[2].isdigit()]
    assert cells[:5] == ['✅', '⬜', '➖', '⚠️', '❌']


def test_write_checklist_replaces_only_the_generated_table(env):
    env.write('docs/book-checklist.md', f'head\n{bs.BEGIN}\nold table\n{bs.END}\ntail\n')
    books = fake_books((1, True, ['done']))
    bs.write_checklist(books)
    md = env.path('docs', 'book-checklist.md').read_text(encoding='utf-8')
    assert md.startswith(f'head\n{bs.BEGIN}\n| Step | 1 |\n') and md.endswith(f'{bs.END}\ntail\n')
    assert 'old table' not in md


# ---- mark ----
@pytest.fixture
def marking(env):
    env.write('docs/book-checklist.md', f'{bs.BEGIN}\nold\n{bs.END}\n')
    return env


def marks(env):
    return json.loads(env.path('docs', 'book-status.json').read_text(encoding='utf-8'))['books']


def test_mark_a_hand_step_records_today(marking):
    ok, msg = bs.mark('3', 3)
    assert ok and msg == "Book 3 step 3 (Importer reads the book's own phrasings (gates, Random Number, combat)): marked done"
    assert marks(marking) == {CODE: {'3': datetime.date.today().isoformat()}}
    assert 'old' not in marking.path('docs', 'book-checklist.md').read_text(encoding='utf-8')     # table rewritten


def test_mark_undo_takes_a_hand_mark_back(marking):
    bs.mark(CODE, 3)
    bs.mark(CODE, 6)
    ok, msg = bs.mark(CODE, 3, undo=True)
    assert ok and msg.endswith('unmarked')
    assert marks(marking) == {CODE: {'6': datetime.date.today().isoformat()}}
    assert bs.mark(CODE, 3, undo=True)[0]       # taking back a mark that is not there is harmless


def test_mark_step_4_needs_the_rules_heading(marking):
    ok, msg = bs.mark(CODE, 4)
    assert not ok and msg == 'step 4: write "### Book 3, The Caverns of Kalte" in docs/reference/rules-books.md first'
    assert not marking.path('docs', 'book-status.json').exists()
    marking.write('docs/reference/rules-books.md', '### Book 3, The Caverns of Kalte\n')
    assert bs.mark(CODE, 4)[0] and '4' in marks(marking)[CODE]


def test_a_file_step_is_checked_not_recorded(marking):
    ok, msg = bs.mark(CODE, 1)
    assert not ok and msg.startswith('Book 3 step 1 is NOT done (read from the files): Not downloaded')
    marking.downloaded()
    ok, msg = bs.mark(CODE, 1)
    assert ok and msg == 'Book 3 step 1 is done (read from the files): 3 section pages and the rules pages on disk'
    assert not marking.path('docs', 'book-status.json').exists()


# ---- main ----


def test_main_done_and_undo(marking, capsys):
    assert bs.main(['done', '3', '3']) == 0
    assert capsys.readouterr().out.strip().endswith('marked done')
    assert bs.main(['undo', '3', '3']) == 0
    assert capsys.readouterr().out.strip().endswith('unmarked')


