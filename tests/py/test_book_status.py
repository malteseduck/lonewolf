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


@pytest.fixture
def env(tmp_path, monkeypatch):
    e = Env(tmp_path)
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
def test_series_by_book_number():
    assert [bs.SERIES(n) for n in (1, 5, 6, 12, 13, 20)] == ['kai', 'kai', 'magnakai', 'magnakai', 'grand master', 'grand master']


def test_catalogue_is_the_twenty_books_in_order():
    assert len(bs.CATALOGUE) == 20
    assert bs.CATALOGUE[0][0] == '01fftd' and bs.CATALOGUE[12][0] == '13tplor' and bs.CATALOGUE[19][0] == '20tcon'
    assert [c[0][:2] for c in bs.CATALOGUE] == [f'{i:02d}' for i in range(1, 21)]


def test_steps_and_hand_marks():
    assert sorted(bs.STEPS) == list(range(1, 9))
    assert bs.HAND == {3, 4, 6, 7}
    assert [s[0] for s in bs.STEPS.values()] == ['fetch', 'import', 'phrasings', 'rules', 'items', 'pictures', 'testplay', 'map']


def test_mtime_and_read_and_day(env):
    f = env.write('a.txt', 'hello', 5)
    assert bs.mtime(str(f)) == (T0 + 5) * 1000
    assert bs.mtime(str(env.path('nope'))) is None
    assert bs.read(str(f)) == 'hello'
    assert bs.read(str(env.path('nope'))) == ''
    assert bs.day(None) is None and bs.day(0) is None
    ms = datetime.datetime(2026, 1, 2, 3, 4).timestamp() * 1000
    assert bs.day(ms) == '2026-01-02 03:04'


def test_read_survives_bad_bytes(env):
    f = env.path('bad.txt')
    f.write_bytes(b'ok \xff\xfe end')
    assert bs.read(str(f)).startswith('ok ')


@pytest.mark.parametrize('arg,expect', [
    ('03tcok', ('03tcok', 'The Caverns of Kalte', 3)), ('3', ('03tcok', 'The Caverns of Kalte', 3)),
    ('03', ('03tcok', 'The Caverns of Kalte', 3)), ('1', ('01fftd', 'Flight from the Dark', 1)),
    ('13', ('13tplor', 'The Plague Lords of Ruel', 13)), ('20', ('20tcon', 'The Curse of Naar', 20)),
    ('19wb', ('19wb', "Wolf's Bane", 19)),
])
def test_find_by_code_or_number(arg, expect):
    assert bs.find(arg) == expect


@pytest.mark.parametrize('arg', ['', '0', '21', '3tcok', 'zzz', '003'])
def test_find_unknown(arg):
    assert bs.find(arg) is None


def test_importer_books_reads_the_books_table(env):
    env.write('tools/import_projectaon.py', "BOOKS = {\n '01fftd': (1, 'kai', 'A'), '02fotw': (2, 'kai', 'B'),\n}\nX = {'zz': (1, 2)}\n")
    assert bs.importer_books() == {'01fftd', '02fotw'}


def test_importer_books_empty_when_importer_missing(env):
    assert bs.importer_books() == set()


def test_load_and_save_hand_marks(env):
    assert bs.load_hand() == {'books': {}}
    env.write('docs/book-status.json', '{not json')
    assert bs.load_hand() == {'books': {}}
    bs.save_hand({'books': {'b': {'3': 'x'}, 'a': {}}})
    text = (env.path('docs', 'book-status.json')).read_text(encoding='utf-8')
    assert text.endswith('\n') and text.index('"a"') < text.index('"b"')        # sorted keys
    assert json.loads(text) == {'books': {'a': {}, 'b': {'3': 'x'}}}
    assert not env.path('docs', 'book-status.json.part').exists()


def test_load_book_reads_the_json_inside_the_script(env):
    env.book(sections=CLEAN)
    got = bs.load_book(CODE, os.path.join(bs.DATA, CODE, 'book.js'))
    assert got['id'] == CODE and set(got['sections']) == {'1', '2'}
    assert bs.load_book(CODE)['id'] == CODE                       # default path


def test_load_book_raises_when_book_js_is_missing_or_not_a_book(env):
    with pytest.raises(ValueError):
        bs.load_book(CODE)
    env.write(f'data/projectaon/{CODE}/book.js', 'nothing here')
    with pytest.raises(ValueError):
        bs.load_book(CODE)


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


def test_import_stats_counts(env):
    st = stats_book(env, {
        '1': {'text': [], 'choices': [{'to': '2'}, {'to': '77'}], 'rnt': 'auto'},
        '2': fight(('Giak', 'ill1.png'), ('Rat', None)) | {'rnt': 'free'},
        '3': {'text': [], 'choices': []},                          # no way on
        '4': {'text': [], 'choices': [], 'puzzle': True},          # a puzzle is a way on
        '5': {'text': [], 'choices': [], 'end': 'death'}},
        plates=[])
    assert st == {'sections': 5, 'fights': 1, 'rnt': 2, 'broken': 1, 'noway': 1, 'kinds': 2, 'bare': 1, 'map': 'map.png'}


def test_import_stats_enemy_with_a_picture_anywhere_is_not_bare(env):
    st = stats_book(env, {'1': fight(('Rat', None)), '2': fight(('Rat', 'ill2.png'))}, plates=[])
    assert (st['kinds'], st['bare']) == (1, 0)


def test_import_stats_library_entry_covers_an_enemy_for_this_book_only(env):
    plates = [{'match': 'rat', 'src': 'a'}, {'match': '^bat$', 'book': CODE, 'src': 'b'},
              {'match': 'owl', 'book': '05sots', 'src': 'c'}, {'match': '(', 'src': 'bad regex'}]
    st = stats_book(env, {'1': fight(('Rat', None), ('Bat', None), ('Owl', None), ('Eel', None))}, plates=plates)
    assert (st['kinds'], st['bare']) == (4, 2)     # Owl (another book's entry) and Eel (nothing) stay bare


def test_import_stats_bad_or_missing_plates_file_means_an_empty_library(env):
    assert stats_book(env, {'1': fight(('Rat', None))}, plates='{broken')['bare'] == 1
    bs._cache.clear()
    assert stats_book(env, {'1': fight(('Rat', None))}, plates='{"other": 1}')['bare'] == 1


def test_import_stats_is_cached_until_a_file_changes(env):
    first = stats_book(env, CLEAN, plates=[])
    js = os.path.join(bs.DATA, CODE, 'book.js')
    assert bs.import_stats(CODE, js, os.path.join(bs.ROOT, 'assets', 'plates', 'plates.json')) is first
    env.book(sections={'1': {'text': [], 'choices': []}}, t=500)
    again = bs.import_stats(CODE, js, os.path.join(bs.ROOT, 'assets', 'plates', 'plates.json'))
    assert again is not first and again['sections'] == 1


# ---- map_stage ----
@pytest.mark.parametrize('files,expect', [
    ([], 'no map'),
    (['data/projectaon/03tcok/map.png'], 'not started'),
    (['data/projectaon/03tcok/map.png', 'data/projectaon/03tcok/work/map-2k.png'], 'started'),
    (['data/projectaon/03tcok/work/map-2k.png', 'maps/03tcok/labels.json'], 'labels'),
    (['maps/03tcok/labels.json', 'maps/03tcok/labels-checked.txt'], 'labels checked'),
    (['maps/03tcok/labels-checked.txt', 'data/projectaon/03tcok/work/map-2k-lettered.jpg'], 'lettered'),
    (['data/projectaon/03tcok/work/map-2k-lettered.jpg', 'data/projectaon/03tcok/work/map-gemini-2.png'], 'gemini'),
    (['data/projectaon/03tcok/work/map-gemini-1.webp', 'data/projectaon/03tcok/map-4k.webp'], 'done'),
])
def test_map_stage_is_the_furthest_file_that_exists(env, files, expect):
    (env.path('data', 'projectaon', CODE)).mkdir(parents=True)
    for f in files:
        env.touch(f)
    d = os.path.join(bs.DATA, CODE)
    assert bs.map_stage(CODE, d, None) == expect


def test_map_stage_gemini_names_must_have_a_positive_round_number(env):
    (env.path('data', 'projectaon', CODE)).mkdir(parents=True)
    for f in ('map-gemini-0.png', 'map-gemini-x.png', 'map-gemini-1.gif', 'xmap-gemini-1.png'):
        env.touch(f'data/projectaon/{CODE}/work/{f}')
    assert bs.map_stage(CODE, os.path.join(bs.DATA, CODE), None) == 'no map'


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


def test_import_is_na_when_the_importer_does_not_know_the_book(env):
    env.downloaded()
    assert env.status(known=set())['stages']['import']['state'] == 'na'


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


def test_import_time_is_the_report_not_book_js(env):
    # book.js is left alone when nothing changed, so the report's time is when the importer last ran
    env.downloaded(t=0)
    env.touch('tools/import_projectaon.py', 150)
    env.book(t=100, report=False)
    assert env.status()['stale'] == ['the importer changed since']
    env.write(f'data/projectaon/{CODE}/import-report.json', '{}', 400)
    assert env.status()['stale'] == []


def test_import_notes_a_map_upscale_the_book_does_not_name_yet(env):
    env.downloaded(t=0)
    env.book(t=100)
    env.touch(f'data/projectaon/{CODE}/map-4k.webp', 50)
    b = env.status()
    assert b['stale'] == ['map-4k.webp is not named yet']
    env.book(t=100, map_name='map-4k.webp')
    bs._cache.clear()           # same mtime as before: the figures cache cannot tell the file changed
    assert env.status()['stale'] == []


def test_unreadable_book_js_is_reported(env):
    env.downloaded()
    env.write(f'data/projectaon/{CODE}/book.js', 'broken', 100)
    b = env.status()
    assert 'impError' in b and b['stages']['import']['state'] == 'todo'
    assert b['stages']['import']['ev'].startswith('book.js unreadable: ')


def test_phrasings_wait_for_the_import_then_follow_the_mark(env):
    assert env.status()['stages']['phrasings'] == {'state': 'todo', 'ev': 'After import', 'src': 'hand'}
    env.book()
    p = env.status()['stages']['phrasings']
    assert p['state'] == 'todo' and p['src'] == 'hand'
    p = env.status(hand={'books': {CODE: {'3': '2026-02-03'}}})['stages']['phrasings']
    assert p['state'] == 'done' and p['ev'].endswith('Marked done 2026-02-03')


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


def test_rules_heading_needs_the_book_number_and_a_comma(env):
    assert env.status(n=1, code='01fftd', title='A', rules_md='### Book 12, X\n')['rulesHeading'] is False
    assert env.status(rules_md='intro\n### Book 3, X\n')['rulesHeading'] is True
    assert env.status(rules_md='  ### Book 3, X\n')['rulesHeading'] is False   # must start the line
    assert env.status(rules_md='## Book 3, X\n')['rulesHeading'] is False


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


def test_reading_copy_waits_for_the_import(env):
    assert env.status()['stages']['reading'] == {'state': 'todo', 'ev': 'After import', 'src': 'disk'}


REG = "const ITEM_TABLES = {\n  '03tcok': T3,\n  '04tcod': T4,\n};\n"


def test_items_stage_walks_through_its_states(env):
    env.book(t=100)
    st = lambda **kw: env.status(main_js=kw.get('main_js', ''))['stages']['items']
    assert st()['state'] == 'todo'
    env.write(f'items-{CODE}.js', 'export default { a: { todo: "x" }, b: { todo: "y" }, c: {} };', 200)
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


def test_items_check_is_stale_after_a_reimport_too(env):
    env.write(f'items-{CODE}.js', 'x', 100)
    env.write(f'data/projectaon/{CODE}/check-items.json', '{"errors": []}', 150)
    env.book(t=200)
    assert env.status(main_js=REG)['stages']['items']['state'] == 'warn'


def test_items_todo_count_only_counts_the_todo_key(env):
    env.write(f'items-{CODE}.js', 'todo: 1, mytodo: 2, todo : 3, //todo: x\n', 100)
    assert env.status(main_js=REG)['items']['todos'] == 2    # "todo:" and "//todo:"; not "mytodo:" and not "todo :"


def test_items_unreadable_check_json_counts_as_not_run(env):
    env.write(f'items-{CODE}.js', 'x', 100)
    env.write(f'data/projectaon/{CODE}/check-items.json', '{oops', 200)
    assert env.status(main_js=REG)['stages']['items']['ev'].endswith('check_items.mjs not run yet (Check items)')


def test_pictures_stage(env):
    sections_bare = {'1': fight(('Rat', None), ('Bat', 'ill1.png')), '2': {'text': [], 'choices': [], 'end': 'victory'}}
    env.write('assets/plates/plates.json', '{"plates": []}', 0)
    env.book(sections=sections_bare, t=100)
    p = env.status()['stages']['pictures']
    assert p['state'] == 'todo' and p['num'] == 1 and p['ev'] == '1 of 2 kinds of enemy have no picture'
    p = env.status(hand={'books': {CODE: {'6': '2026-03-04'}}})['stages']['pictures']
    assert p['state'] == 'warn' and p['ev'] == 'Marked done 2026-03-04, but 1 of 2 kinds of enemy have no picture'


def pictured_book(env):
    env.write('assets/plates/plates.json', '{"plates": []}', 0)
    env.book(sections={'1': fight(('Rat', 'ill1.png')), '2': {'text': [], 'choices': [], 'end': 'victory'}}, t=100)


def test_pictures_all_pictured_waits_for_the_owner(env):
    pictured_book(env)
    p = env.status()['stages']['pictures']
    assert p['state'] == 'warn' and p['ev'] == 'All 1 kinds of enemy have a picture; waiting for your look at the sheet'


def test_pictures_marked_but_not_kept(env):
    pictured_book(env)
    b = env.status(hand={'books': {CODE: {'6': '2026-03-04'}}})
    assert b['stages']['pictures']['state'] == 'warn' and 'are not kept yet' in b['stages']['pictures']['ev']
    assert b['pins'] == {'waiting': 1, 'approved': '2026-03-04', 'sections': ['all']}


def test_pictures_marked_and_kept_is_done(env, monkeypatch):
    pictured_book(env)
    env.touch(f'assets/plates/approved/{CODE}.json')
    monkeypatch.setattr(bs, 'pin_report', lambda: {})
    p = env.status(hand={'books': {CODE: {'6': '2026-03-04'}}})['stages']['pictures']
    assert p['state'] == 'done' and p['src'] == 'hand'
    assert p['ev'] == 'All 1 kinds of enemy have a picture; sheet looked at, marked done 2026-03-04; those pictures are kept'


def test_pictures_changed_since_approval_are_listed_by_section(env, monkeypatch):
    pictured_book(env)
    env.touch(f'assets/plates/approved/{CODE}.json')
    report = {CODE: {'approved': '2026-03-01', 'changed': [{'key': '12/Rat'}, {'key': '3/Bat'}], 'unpinned': [{'key': '12/Owl'}]}}
    monkeypatch.setattr(bs, 'pin_report', lambda: report)
    b = env.status(hand={'books': {CODE: {'6': '2026-03-04'}}})
    p = b['stages']['pictures']
    assert p['state'] == 'warn' and p['num'] == 3
    assert b['pins'] == {'waiting': 3, 'approved': '2026-03-01', 'sections': ['3', '12']}     # numeric order
    assert '3 fights would show another picture than you approved on 2026-03-01 (sections 3, 12)' in p['ev']


def test_pictures_wait_for_the_import(env):
    assert env.status()['stages']['pictures'] == {'state': 'todo', 'ev': 'After import', 'src': 'disk'}


def test_testplay_follows_the_mark(env):
    assert env.status()['stages']['testplay']['state'] == 'todo'
    t = env.status(hand={'books': {CODE: {'7': '2026-05-06'}}})['stages']['testplay']
    assert t['state'] == 'done' and t['ev'].endswith('. Marked done 2026-05-06')


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


def test_grand_master_books_only_count_the_download(env):
    code, title = '13tplor', 'The Plague Lords of Ruel'
    env.downloaded(code, sects=2, rules=True)
    st = env.status(code=code, title=title, n=13)['stages']
    assert st['fetch']['state'] == 'done'
    assert all(st[k]['state'] == 'na' for k in st if k != 'fetch')      # nothing to do; they were todo or warn


def test_grand_master_keeps_a_state_that_is_already_done(env):
    code = '13tplor'
    env.downloaded(code, sects=2, rules=True)
    env.book(code, t=100)
    st = env.status(code=code, title='x', n=13, hand={'books': {code: {'7': '2026-01-01'}}})['stages']
    assert st['testplay']['state'] == 'done' and st['import']['state'] == 'done'


def test_book_status_loads_what_it_is_not_given(env):
    env.write('docs/book-status.json', json.dumps({'books': {CODE: {'7': '2026-01-01'}}}))
    env.write('main.js', REG)
    env.write('docs/reference/rules-books.md', '### Book 3, X\n')
    env.write('tools/import_projectaon.py', "'03tcok': (3, 'kai', 'x')")
    env.downloaded()
    b = bs.book_status(CODE, TITLE, N)
    assert b['known'] and b['rulesHeading'] and b['marks'] == {'7': '2026-01-01'}


# ---- pin_report ----
def test_pin_report_without_approved_pictures_runs_nothing(env):
    assert bs.pin_report() == {}
    assert env.calls == []


def test_pin_report_runs_node_once_per_state(env):
    env.touch(f'assets/plates/approved/{CODE}.json', 10)
    env.node_out = json.dumps({CODE: {'approved': 'x', 'changed': []}})
    assert bs.pin_report() == {CODE: {'approved': 'x', 'changed': []}}
    bs.pin_report()
    assert len(env.calls) == 1 and env.calls[0][0] == 'node' and env.calls[0][1].endswith('plates_pin.mjs')
    assert env.calls[0][2:] == ['--all', '--json']
    env.touch(f'assets/plates/approved/{CODE}.json', 20)             # a change invalidates the cache
    bs.pin_report()
    assert len(env.calls) == 2


def test_pin_report_bad_output_is_empty(env):
    env.touch(f'assets/plates/approved/{CODE}.json')
    env.node_out = 'not json'
    assert bs.pin_report() == {}


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
    assert len(lines) == 2 + 4 + 8
    assert lines[2] == '| **Getting the book** | | |'
    assert lines[3] == f'| 1. Downloaded | ✅ | ⬜ |'
    assert lines[4].startswith('| 2. Imported; report clean') and lines[4].endswith('| ✅ | ⚠️ |')
    groups = [l for l in lines if l.startswith('| **')]
    assert [g.split('**')[1] for g in groups] == ['Getting the book', 'Items and fights', 'Play', 'Pictures']
    # a group heading comes just before its first step
    assert lines[lines.index(next(l for l in lines if '5. Item table' in l)) - 1].startswith('| **Items and fights**')


def test_checklist_table_marks_each_state():
    states = ['done', 'todo', 'na', 'warn', 'bad']
    table = bs.checklist_table(fake_books((1, True, states)))
    cells = [l.split('|')[2].strip() for l in table.split('\n') if l[2].isdigit()]
    assert cells[:5] == ['✅', '⬜', '➖', '⚠️', '❌']


def test_checklist_table_hides_later_books_with_no_folder():
    table = bs.checklist_table(fake_books((12, False, ['done']), (13, False, ['todo']), (14, True, ['done'])))
    assert table.split('\n')[0] == '| Step | 12 | 14 |'


def test_write_checklist_replaces_only_the_generated_table(env):
    env.write('docs/book-checklist.md', f'head\n{bs.BEGIN}\nold table\n{bs.END}\ntail\n')
    books = fake_books((1, True, ['done']))
    bs.write_checklist(books)
    md = env.path('docs', 'book-checklist.md').read_text(encoding='utf-8')
    assert md.startswith(f'head\n{bs.BEGIN}\n| Step | 1 |\n') and md.endswith(f'{bs.END}\ntail\n')
    assert 'old table' not in md


def test_write_checklist_leaves_the_file_untouched_when_nothing_changed(env):
    f = env.write('docs/book-checklist.md', f'{bs.BEGIN}\n{bs.END}\n')
    books = fake_books((1, True, ['done']))
    bs.write_checklist(books)
    os.utime(f, (1000, 1000))
    bs.write_checklist(books)
    assert os.stat(f).st_mtime == 1000


def test_write_checklist_uses_unix_newlines(env):
    env.write('docs/book-checklist.md', f'{bs.BEGIN}\n{bs.END}\n')
    bs.write_checklist(fake_books((1, True, ['done'])))
    assert b'\r' not in env.path('docs', 'book-checklist.md').read_bytes()


def test_write_checklist_refuses_a_file_without_markers(env):
    env.write('docs/book-checklist.md', 'no markers here')
    with pytest.raises(SystemExit) as e:
        bs.write_checklist(fake_books((1, True, ['done'])))
    assert 'no generated-table markers' in str(e.value)
    assert env.path('docs', 'book-checklist.md').read_text() == 'no markers here'


def test_all_status_has_every_book_and_the_steps(env):
    st = bs.all_status()
    assert [b['code'] for b in st['books']] == [c for c, _ in bs.CATALOGUE]
    assert [b['n'] for b in st['books']] == list(range(1, 21))
    assert st['steps'][3] == {'id': 'phrasings', 'label': bs.STEPS[3][1], 'hand': True}
    assert st['steps'][1]['hand'] is False
    json.dumps(st)     # serves as JSON


# ---- mark ----
@pytest.fixture
def marking(env):
    env.write('docs/book-checklist.md', f'{bs.BEGIN}\nold\n{bs.END}\n')
    return env


def marks(env):
    return json.loads(env.path('docs', 'book-status.json').read_text(encoding='utf-8'))['books']


def test_mark_rejects_unknown_book_and_step(marking):
    assert bs.mark('zzz', 3) == (False, 'unknown book zzz')
    assert bs.mark(CODE, 9) == (False, 'step must be 1-8')
    assert bs.mark(CODE, 0) == (False, 'step must be 1-8')


def test_mark_a_hand_step_records_today(marking):
    ok, msg = bs.mark('3', 3)
    assert ok and msg == "Book 3 step 3 (Importer reads the book's own phrasings (gates, Random Number, combat)): marked done"
    assert marks(marking) == {CODE: {'3': datetime.date.today().isoformat()}}
    assert 'old' not in marking.path('docs', 'book-checklist.md').read_text(encoding='utf-8')     # table rewritten


def test_mark_undo_takes_a_hand_mark_back(marking):
    bs.mark(CODE, 3)
    bs.mark(CODE, 7)
    ok, msg = bs.mark(CODE, 3, undo=True)
    assert ok and msg.endswith('unmarked')
    assert marks(marking) == {CODE: {'7': datetime.date.today().isoformat()}}
    assert bs.mark(CODE, 3, undo=True)[0]       # taking back a mark that is not there is harmless


def test_mark_step_4_needs_the_rules_heading(marking):
    ok, msg = bs.mark(CODE, 4)
    assert not ok and msg == 'step 4: write "### Book 3, The Caverns of Kalte" in docs/reference/rules-books.md first'
    assert not marking.path('docs', 'book-status.json').exists()
    marking.write('docs/reference/rules-books.md', '### Book 3, The Caverns of Kalte\n')
    assert bs.mark(CODE, 4)[0] and '4' in marks(marking)[CODE]


def test_mark_step_4_can_be_unmarked_without_the_heading(marking):
    bs.save_hand({'books': {CODE: {'4': '2026-01-01'}}})
    assert bs.mark(CODE, 4, undo=True)[0] and marks(marking) == {CODE: {}}


def test_mark_step_6_needs_the_pictures_read_from_files(marking):
    ok, msg = bs.mark(CODE, 6)
    assert not ok and msg == f'Book 3 step 6 is NOT done (read from the files): After import'
    assert not marking.path('docs', 'book-status.json').exists()


def test_mark_step_6_approves_the_pictures_with_node(marking):
    pictured_book(marking)
    ok, msg = bs.mark(CODE, 6)
    assert ok and '6' in marks(marking)[CODE]
    assert marking.calls[-1][:2] == ['node', os.path.join('tools', 'plates_pin.mjs')]
    assert marking.calls[-1][2:] == [CODE, '--approve']


def test_mark_step_6_allowed_while_the_owner_has_pictures_to_look_at(marking):
    # warn (all pictured, waiting for the look) is exactly when it may be marked; todo (enemies bare) is not
    marking.write('assets/plates/plates.json', '{"plates": []}', 0)
    marking.book(sections={'1': fight(('Rat', None)), '2': {'text': [], 'choices': [], 'end': 'victory'}})
    ok, msg = bs.mark(CODE, 6)
    assert not ok and '1 of 1 kinds of enemy have no picture' in msg


def test_unmarking_step_6_lets_go_of_the_kept_pictures(marking):
    pictured_book(marking)
    bs.mark(CODE, 6)
    pin = marking.touch(f'assets/plates/approved/{CODE}.json')
    marking.calls.clear()
    assert bs.mark(CODE, 6, undo=True)[0]
    assert not pin.exists()                               # let go
    assert not any('--approve' in c for c in marking.calls)
    assert marks(marking)[CODE] == {}


def test_a_file_step_cannot_be_undone(marking):
    assert bs.mark(CODE, 1, undo=True) == (False, 'step 1 is read from the files: change the files, not the mark')


def test_a_file_step_is_checked_not_recorded(marking):
    ok, msg = bs.mark(CODE, 1)
    assert not ok and msg.startswith('Book 3 step 1 is NOT done (read from the files): Not downloaded')
    marking.downloaded()
    ok, msg = bs.mark(CODE, 1)
    assert ok and msg == 'Book 3 step 1 is done (read from the files): 3 section pages and the rules pages on disk'
    assert not marking.path('docs', 'book-status.json').exists()


def test_step_5_runs_the_item_check_first_when_there_is_a_table(marking):
    marking.downloaded()
    marking.write(f'items-{CODE}.js', 'x')
    bs.mark(CODE, 5)
    assert marking.calls == [['node', os.path.join('tools', 'check_items.mjs'), CODE, '--json']]


def test_step_5_skips_the_check_with_no_table_folder_or_when_told_not_to(marking):
    bs.mark(CODE, 5)                                  # no table, no folder
    marking.write(f'items-{CODE}.js', 'x')
    bs.mark(CODE, 5)                                  # a table but no downloaded folder
    marking.downloaded()
    bs.mark(CODE, 5, run_checks=False)
    assert marking.calls == []


# ---- main ----
def test_main_json(marking, capsys):
    assert bs.main(['--json']) == 0
    data = json.loads(capsys.readouterr().out)
    assert len(data['books']) == 20 and set(data['steps']) == {str(i) for i in range(1, 9)}


def test_main_done_and_undo(marking, capsys):
    assert bs.main(['done', '3', '3']) == 0
    assert capsys.readouterr().out.strip().endswith('marked done')
    assert bs.main(['undo', '3', '3']) == 0
    assert capsys.readouterr().out.strip().endswith('unmarked')


def test_main_done_exits_1_when_a_file_step_is_not_done(marking, capsys):
    assert bs.main(['done', CODE, '1']) == 1
    assert 'NOT done' in capsys.readouterr().out


def test_main_done_with_a_bad_book_exits_1(marking, capsys):
    assert bs.main(['done', 'zzz', '3']) == 1
    assert capsys.readouterr().out.strip() == 'unknown book zzz'


@pytest.mark.parametrize('argv', [['done'], ['done', '3'], ['done', '3', 'x'], ['done', '3', '3', '3'], ['bogus'], ['show'], ['show', '1', '2']])
def test_main_bad_usage_prints_the_help_and_exits_2(marking, capsys, argv):
    assert bs.main(argv) == 2
    assert capsys.readouterr().out.startswith('Where every book stands in the import')


def test_main_checklist_command(marking, capsys):
    assert bs.main(['checklist']) == 0
    assert capsys.readouterr().out.strip() == 'wrote the table in ' + os.path.relpath(bs.CHECKLIST, bs.ROOT)
    assert '| Step | 1 |' in marking.path('docs', 'book-checklist.md').read_text(encoding='utf-8')


def test_main_show_one_book(marking, capsys):
    marking.downloaded()
    assert bs.main(['show', '3']) == 0
    lines = capsys.readouterr().out.splitlines()
    assert lines[0] == 'Book 3, The Caverns of Kalte (03tcok, kai)'
    assert len(lines) == 1 + 8 + 1
    assert lines[1].startswith('   1. done  Downloaded') and '3 section pages and the rules pages on disk' in lines[1]
    assert lines[-1].strip().startswith('todo  Reading copy')


def test_main_show_unknown_book(marking, capsys):
    assert bs.main(['show', 'zzz']) == 1
    assert capsys.readouterr().out.strip() == 'unknown book zzz'


def test_main_lists_one_line_per_book_hiding_later_books_with_no_folder(marking, capsys):
    marking.downloaded('14tcok')
    assert bs.main([]) == 0
    lines = capsys.readouterr().out.splitlines()
    assert len(lines) == 13
    assert lines[0].startswith(' 1 01fftd   ') and lines[-1].startswith('14 14tcok   ')
    assert all(len(l.split()) == 2 + 8 for l in lines)       # number, code, one mark per step
