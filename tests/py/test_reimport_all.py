"""tools/reimport_all.py against a temporary tree. The importer, reading-copy and item-check commands are
never started: subprocess.run is replaced by a fake that makes the change a real import would (rewriting
book.js and import-report.json), so the comparison logic is what is tested. Book data are stand-ins."""
import json
import os
import sys
from types import SimpleNamespace

import pytest

import book_status as bs
import reimport_all as ra

T0 = 1_700_000_000
CODE = '02fotw'


def sections(broken=0, noway=0, fights=0, total=3, bare=0):
    """A book.js `sections` dict with the given figures (made up)."""
    secs = {}
    for i in range(1, total + 1):
        secs[str(i)] = {'text': [], 'choices': [{'to': str(i + 1) if i < total else '1'}]}
    secs['1']['choices'] += [{'to': '900'}] * broken
    for k in range(noway):
        secs[str(100 + k)] = {'text': [], 'choices': []}
    for k in range(fights):
        enemies = [{'name': f'Foe{k}-{j}'} if j < bare else {'name': f'Foe{k}-{j}', 'art': 'ill1.png'} for j in range(max(bare, 1))]
        secs[str(200 + k)] = {'text': [], 'choices': [{'to': '1'}], 'combat': {'enemies': enemies}}
    return secs


class World:
    def __init__(self, root):
        self.root = root
        self.d = root / 'data' / 'projectaon'
        self.imports = []     # codes the fake importer ran for
        self.commands = []    # every command line given to subprocess.run
        self.rc = {}          # code -> return code of the fake importer
        self.after = {}       # code -> what the fake importer leaves behind (kwargs of write_book), or None for nothing
        self.tick = 1000

    def write_book(self, code, secs, report=None, bump=True):
        d = self.d / code
        d.mkdir(parents=True, exist_ok=True)
        js = ('(window.LW = window.LW || {}).BOOKS = Object.assign(window.LW.BOOKS || {}, '
              + json.dumps({code: {'id': code, 'sections': secs, 'map': 'map.png'}}) + ');\n')
        (d / 'book.js').write_text(js, encoding='utf-8')
        if report is not None:
            (d / 'import-report.json').write_text(json.dumps(report), encoding='utf-8')
        if bump:
            self.tick += 100
            for f in ('book.js', 'import-report.json'):
                if (d / f).exists():
                    os.utime(d / f, (T0 + self.tick, T0 + self.tick))

    def fake_run(self, cmd, **kw):
        self.commands.append(cmd)
        if len(cmd) > 1 and str(cmd[1]).endswith('import_projectaon.py'):
            code = cmd[2]
            self.imports.append(code)
            rc = self.rc.get(code, 0)
            if rc == 0 and self.after.get(code) is not None:
                self.write_book(code, **self.after[code])
            out = ('boom line\nanother\nlast words\nend\n' if rc else 'ok\n').encode()
            return SimpleNamespace(returncode=rc, stdout=out, stderr=b'')
        return SimpleNamespace(returncode=0, stdout=b'', stderr=b'')


@pytest.fixture
def w(tmp_path, monkeypatch):
    world = World(tmp_path)
    for mod in (ra, bs):
        monkeypatch.setattr(mod, 'ROOT', str(tmp_path))
    monkeypatch.setattr(ra, 'DATA', str(world.d))
    monkeypatch.setattr(bs, 'DATA', str(world.d))
    monkeypatch.setattr(ra, 'PLATES', str(tmp_path / 'assets' / 'plates' / 'plates.json'))
    monkeypatch.setattr(bs, 'IMPORTER', str(tmp_path / 'tools' / 'import_projectaon.py'))
    (tmp_path / 'tools').mkdir()
    (tmp_path / 'tools' / 'import_projectaon.py').write_text(
        "BOOKS = {'01fftd': (1, 'kai', 'A'), '02fotw': (2, 'kai', 'B'), '03tcok': (3, 'kai', 'C')}\n", encoding='utf-8')
    (tmp_path / 'assets' / 'plates').mkdir(parents=True)
    (tmp_path / 'assets' / 'plates' / 'plates.json').write_text('{"plates": []}', encoding='utf-8')
    bs._cache.clear()
    monkeypatch.setattr(ra.subprocess, 'run', world.fake_run)
    # whether the reading copy is "touched" is decided by refresh(); record it instead of running it
    world.refreshed = []
    monkeypatch.setattr(ra, 'refresh', lambda code: world.refreshed.append(code) or [])
    return world


# ---- figures ----
def test_figures_none_without_a_readable_book_js(w):
    assert ra.figures(CODE) is None
    (w.d / CODE).mkdir(parents=True)
    (w.d / CODE / 'book.js').write_text('junk', encoding='utf-8')
    assert ra.figures(CODE) is None


def test_figures_are_the_book_stats(w):
    w.write_book(CODE, sections(broken=1, noway=1, fights=2, total=3))
    f = ra.figures(CODE)
    assert (f['sections'], f['fights'], f['broken'], f['noway']) == (3 + 1 + 2, 2, 1, 1)
    assert 'map' in f and f['kinds'] == 2


def test_figures_merge_the_import_report_flattening_lists_and_dicts(w):
    w.write_book(CODE, sections(), report={
        'book': CODE, 'sections': 3, 'fights': 0, 'gates': {'disc': 2, 'rank': 1},
        'broken_links': [['1', '9'], ['2', '8']], 'no_way_on': [], 'map': 'map.png', 'flag': True})
    f = ra.figures(CODE)
    assert f['gates.disc'] == 2 and f['gates.rank'] == 1
    assert f['broken_links'] == 2 and f['no_way_on'] == 0       # lists become their length
    assert 'book' not in f and 'flag' in f                      # strings are not figures; a boolean is a number to Python


def test_figures_ignore_a_broken_report(w):
    w.write_book(CODE, sections())
    (w.d / CODE / 'import-report.json').write_text('{oops', encoding='utf-8')
    assert ra.figures(CODE)['sections'] == 3


# ---- run ----
def test_run_returns_code_and_output_lines(tmp_path, monkeypatch):
    monkeypatch.setattr(ra, 'ROOT', str(tmp_path))
    rc, out = ra.run(sys.executable, '-c', 'import sys; print("a"); print("b"); sys.stderr.write("c\\n"); sys.exit(3)')
    assert rc == 3 and sorted(out) == ['a', 'b', 'c']            # stderr is merged in (the interleaving is the OS's)


def test_run_uses_utf8_for_output(tmp_path, monkeypatch):
    monkeypatch.setattr(ra, 'ROOT', str(tmp_path))
    rc, out = ra.run(sys.executable, '-c', 'print("caf\\u00e9")')
    assert (rc, out) == (0, ['café'])


def test_run_works_in_the_project_root(tmp_path, monkeypatch):
    monkeypatch.setattr(ra, 'ROOT', str(tmp_path))
    rc, out = ra.run(sys.executable, '-c', 'import os; print(os.getcwd())')
    assert os.path.samefile(out[0], tmp_path)


# ---- stale ----
def test_stale_is_false_with_no_book(w):
    assert ra.stale(CODE) is False


def test_stale_reading_copy_rules(w):
    w.write_book(CODE, sections(), bump=False)
    d = w.d / CODE
    os.utime(d / 'book.js', (T0 + 100, T0 + 100))
    assert ra.stale(CODE) is True                                  # no reading copy
    for name, t in (('reading.txt', 150), ('items-reading.txt', 160)):
        (d / name).write_text('x', encoding='utf-8')
        os.utime(d / name, (T0 + t, T0 + t))
    assert ra.stale(CODE) is False
    os.utime(d / 'reading.txt', (T0 + 90, T0 + 90))               # older than book.js
    assert ra.stale(CODE) is True
    os.utime(d / 'reading.txt', (T0 + 170, T0 + 170))             # newer than items-reading
    assert ra.stale(CODE) is True


def test_stale_item_check_rules(w):
    w.write_book(CODE, sections(), bump=False)
    d = w.d / CODE
    os.utime(d / 'book.js', (T0 + 100, T0 + 100))
    for name in ('reading.txt', 'items-reading.txt'):
        (d / name).write_text('x', encoding='utf-8')
        os.utime(d / name, (T0 + 200, T0 + 200))
    items = w.root / f'items-{CODE}.js'
    items.write_text('x', encoding='utf-8')
    os.utime(items, (T0 + 120, T0 + 120))
    assert ra.stale(CODE) is True                                  # a table but no check yet
    (d / 'check-items.json').write_text('{}', encoding='utf-8')
    os.utime(d / 'check-items.json', (T0 + 110, T0 + 110))          # older than the table
    assert ra.stale(CODE) is True
    os.utime(d / 'check-items.json', (T0 + 130, T0 + 130))
    assert ra.stale(CODE) is False
    os.utime(d / 'book.js', (T0 + 140, T0 + 140))                  # book newer than the table and the check
    assert ra.stale(CODE) is True


# ---- refresh (the real one, with run faked) ----
def test_refresh_runs_the_reading_scripts_then_the_item_check(tmp_path, monkeypatch):
    monkeypatch.setattr(ra, 'ROOT', str(tmp_path))
    monkeypatch.setattr(ra, 'DATA', str(tmp_path / 'data'))
    (tmp_path / f'items-{CODE}.js').write_text('x', encoding='utf-8')
    calls = []

    def fake(*cmd):
        calls.append(list(cmd))
        if cmd[0] == 'node':
            d = tmp_path / 'data' / CODE
            d.mkdir(parents=True, exist_ok=True)
            (d / 'check-items.json').write_text('{"errors": []}', encoding='utf-8')
        return 0, []
    monkeypatch.setattr(ra, 'run', fake)
    assert ra.refresh(CODE) == []
    assert [c[1:] if c[0] == sys.executable else c for c in calls] == [
        [os.path.join('tools', 'reading_copy.py'), CODE], [os.path.join('tools', 'item_sections.py'), CODE],
        ['node', os.path.join('tools', 'check_items.mjs'), CODE, '--json']]


def test_refresh_without_an_item_table_runs_only_the_two_scripts(tmp_path, monkeypatch):
    monkeypatch.setattr(ra, 'ROOT', str(tmp_path))
    calls = []
    monkeypatch.setattr(ra, 'run', lambda *c: calls.append(c) or (0, []))
    assert ra.refresh(CODE) == []
    assert len(calls) == 2


def test_refresh_reports_a_failing_script_and_item_errors(tmp_path, monkeypatch):
    monkeypatch.setattr(ra, 'ROOT', str(tmp_path))
    monkeypatch.setattr(ra, 'DATA', str(tmp_path / 'data'))
    (tmp_path / f'items-{CODE}.js').write_text('x', encoding='utf-8')
    (tmp_path / 'data' / CODE).mkdir(parents=True)

    def fake(*cmd):
        if cmd[0] == 'node':
            (tmp_path / 'data' / CODE / 'check-items.json').write_text('{"errors": ["a", "b"]}', encoding='utf-8')
            return 1, []
        return (2, []) if cmd[1].endswith('reading_copy.py') else (0, [])
    monkeypatch.setattr(ra, 'run', fake)
    assert ra.refresh(CODE) == ['reading_copy.py failed (2)', f'item check: 2 errors (node tools/check_items.mjs {CODE})']


def test_refresh_reports_an_item_check_that_gave_no_result(tmp_path, monkeypatch):
    monkeypatch.setattr(ra, 'ROOT', str(tmp_path))
    monkeypatch.setattr(ra, 'DATA', str(tmp_path / 'data'))
    (tmp_path / f'items-{CODE}.js').write_text('x', encoding='utf-8')
    monkeypatch.setattr(ra, 'run', lambda *c: (7, []))
    assert ra.refresh(CODE)[-1] == 'check_items.mjs gave no result (7)'


def test_refresh_treats_a_missing_errors_list_as_clean(tmp_path, monkeypatch):
    monkeypatch.setattr(ra, 'ROOT', str(tmp_path))
    monkeypatch.setattr(ra, 'DATA', str(tmp_path / 'data'))
    (tmp_path / f'items-{CODE}.js').write_text('x', encoding='utf-8')
    (tmp_path / 'data' / CODE).mkdir(parents=True)
    (tmp_path / 'data' / CODE / 'check-items.json').write_text('{}', encoding='utf-8')
    monkeypatch.setattr(ra, 'run', lambda *c: (0, []))
    assert ra.refresh(CODE) == []


# ---- main ----
def lines(capsys):
    return capsys.readouterr().out.splitlines()


def test_main_skips_a_book_the_importer_does_not_know(w, capsys):
    assert ra.main(['19wb']) == 0
    assert lines(capsys) == ['19wb: the importer does not know this book; skipped', '1 books re-imported; 0 worse or failed']
    assert w.imports == []


def test_main_ignores_arguments_that_are_not_books(w, capsys):
    assert ra.main(['nonsense']) == 0
    assert lines(capsys) == ['0 books re-imported; 0 worse or failed']


def test_main_takes_books_by_number_or_code(w, capsys):
    for code in ('02fotw', '03tcok'):
        w.write_book(code, sections(), report={'sections': 3})
    assert ra.main(['3', '02fotw']) == 0
    assert w.imports == ['03tcok', '02fotw']


def test_main_default_is_every_known_book_that_has_a_book_js(w, capsys):
    w.write_book('01fftd', sections())
    w.write_book('03tcok', sections())
    (w.d / '02fotw').mkdir()                  # known, but no book.js
    (w.d / '05sots').mkdir()
    w.write_book('05sots', sections())        # has a book.js but the importer (fake table) does not know it
    assert ra.main([]) == 0
    assert w.imports == ['01fftd', '03tcok']
    assert lines(capsys)[-1] == '2 books re-imported; 0 worse or failed'


def test_main_same_when_nothing_moves(w, capsys):
    w.write_book(CODE, sections(), report={'sections': 3})
    w.after[CODE] = {'secs': sections(), 'report': {'sections': 3}}
    assert ra.main([CODE]) == 0
    out = lines(capsys)
    assert out[0] == f'{CODE}: same' and out[-1] == '1 books re-imported; 0 worse or failed'


def test_main_reports_a_failed_import_with_the_tail_of_its_output(w, capsys):
    w.write_book(CODE, sections())
    w.rc[CODE] = 2
    assert ra.main([CODE]) == 1
    out = lines(capsys)
    assert out[0] == f'{CODE}: IMPORT FAILED (2)'
    assert out[1:4] == ['  another', '  last words', '  end']       # the last three lines
    assert out[-1] == '1 books re-imported; 1 worse or failed'


def test_main_worse_when_broken_links_rise(w, capsys):
    w.write_book(CODE, sections(broken=0), report={'sections': 3, 'broken_links': []})
    w.after[CODE] = {'secs': sections(broken=2), 'report': {'sections': 3, 'broken_links': [['1', '900'], ['1', '900']]}}
    assert ra.main([CODE]) == 1
    out = lines(capsys)[0]
    assert out.startswith(f'{CODE}: WORSE: ') and 'broken 0 -> 2' in out and 'broken_links 0 -> 2' in out


def test_main_worse_when_sections_are_lost_or_dead_ends_appear(w, capsys):
    w.write_book(CODE, sections(total=5))
    w.after[CODE] = {'secs': sections(total=4, noway=1), 'report': None}    # the same number of sections, one now a dead end
    assert ra.main([CODE]) == 1
    out = lines(capsys)[0]
    assert 'noway 0 -> 1' in out and 'sections' not in out


def test_main_worse_when_sections_are_lost(w, capsys):
    w.write_book(CODE, sections(total=5))
    w.after[CODE] = {'secs': sections(total=4), 'report': None}
    assert ra.main([CODE]) == 1
    assert 'WORSE: sections 5 -> 4' in lines(capsys)[0]


def test_main_worse_when_enemies_lose_their_pictures(w, capsys):
    w.write_book(CODE, sections(fights=1, bare=0))
    w.after[CODE] = {'secs': sections(fights=1, bare=1), 'report': None}
    assert ra.main([CODE]) == 1
    assert 'bare 0 -> 1' in lines(capsys)[0]


def test_main_improvement_is_not_worse(w, capsys):
    w.write_book(CODE, sections(broken=2))
    w.after[CODE] = {'secs': sections(broken=0), 'report': None}
    assert ra.main([CODE]) == 0
    out = lines(capsys)[0]
    assert out.startswith(f'{CODE}: changed: ') and 'broken 2 -> 0' in out


def test_main_more_sections_is_a_change_not_a_regression(w, capsys):
    w.write_book(CODE, sections(total=3))
    w.after[CODE] = {'secs': sections(total=4), 'report': None}
    assert ra.main([CODE]) == 0
    assert 'sections 3 -> 4' in lines(capsys)[0]


def test_main_lists_changes_beside_a_regression(w, capsys):
    w.write_book(CODE, sections(broken=0, fights=1))
    w.after[CODE] = {'secs': sections(broken=1, fights=2), 'report': None}
    assert ra.main([CODE]) == 1
    out = lines(capsys)[0]
    assert 'WORSE: broken 0 -> 1' in out and '; also ' in out and 'fights 1 -> 2' in out


def test_main_a_figure_that_vanishes_is_listed_as_gone(w, capsys):
    w.write_book(CODE, sections(), report={'sections': 3, 'extra': 5})
    w.after[CODE] = {'secs': sections(), 'report': {'sections': 3}}
    assert ra.main([CODE]) == 0
    assert 'extra gone' in lines(capsys)[0]


def test_main_a_figure_that_is_new_is_not_a_change(w, capsys):
    w.write_book(CODE, sections(), report={'sections': 3})
    w.after[CODE] = {'secs': sections(), 'report': {'sections': 3, 'extra': 5}}
    assert ra.main([CODE]) == 0
    assert lines(capsys)[0] == f'{CODE}: same'


def test_main_the_map_name_is_not_compared(w, capsys):
    w.write_book(CODE, sections())
    w.after[CODE] = {'secs': sections(), 'report': None}
    ra.main([CODE])
    assert lines(capsys)[0] == f'{CODE}: same'


def test_main_first_import_has_nothing_to_compare(w, capsys):
    (w.d / CODE).mkdir(parents=True)
    w.after[CODE] = {'secs': sections(), 'report': None}
    assert ra.main([CODE]) == 0
    assert lines(capsys)[0] == f'{CODE}: imported (no earlier figures to compare)'


def test_main_makes_the_reading_copy_again_when_book_js_changed(w, capsys):
    w.write_book(CODE, sections(total=3))
    w.after[CODE] = {'secs': sections(total=4), 'report': None}
    ra.main([CODE])
    assert w.refreshed == [CODE]
    assert '  reading copy made again, item check re-run' in lines(capsys)


def test_main_leaves_the_reading_copy_when_nothing_changed(w, capsys):
    w.write_book(CODE, sections())
    for name in ('reading.txt', 'items-reading.txt'):
        (w.d / CODE / name).write_text('x', encoding='utf-8')
        os.utime(w.d / CODE / name, (T0 + 9000, T0 + 9000))     # newer than book.js: not stale
    w.after[CODE] = None
    ra.main([CODE])
    assert w.refreshed == []
    assert '  reading copy made again, item check re-run' not in lines(capsys)


def test_main_makes_the_reading_copy_when_it_was_already_stale(w, capsys):
    w.write_book(CODE, sections())          # book.js unchanged by the import, but there is no reading copy
    w.after[CODE] = None
    ra.main([CODE])
    assert w.refreshed == [CODE]


def test_main_refresh_problems_count_as_worse(w, capsys, monkeypatch):
    w.write_book(CODE, sections())
    w.after[CODE] = None
    monkeypatch.setattr(ra, 'refresh', lambda code: ['item check: 3 errors (node tools/check_items.mjs 02fotw)'])
    assert ra.main([CODE]) == 1
    out = lines(capsys)
    assert out[0] == f'{CODE}: WORSE: item check: 3 errors (node tools/check_items.mjs 02fotw)'
    assert '  reading copy made again, item check re-run' not in out


def test_main_runs_the_importer_with_this_python_in_the_project_root(w):
    w.write_book(CODE, sections())
    w.after[CODE] = None
    ra.main([CODE])
    cmd = w.commands[0]
    assert cmd[0] == sys.executable and cmd[1] == os.path.join('tools', 'import_projectaon.py') and cmd[2] == CODE


def test_main_counts_every_bad_book_once(w, capsys):
    for code in ('01fftd', '02fotw', '03tcok'):
        w.write_book(code, sections())
    w.rc['01fftd'] = 1
    w.after['02fotw'] = {'secs': sections(broken=1), 'report': None}
    w.after['03tcok'] = {'secs': sections(), 'report': None}
    assert ra.main([]) == 1
    assert lines(capsys)[-1] == '3 books re-imported; 2 worse or failed'


def test_constants():
    assert 'broken' in ra.WORSE_UP and 'noway' in ra.WORSE_UP and 'bare' in ra.WORSE_UP
    assert ra.WORSE_DOWN == ('sections',)
