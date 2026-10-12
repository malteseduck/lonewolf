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








# ---- run ----






# ---- stale ----






# ---- refresh (the real one, with run faked) ----










# ---- main ----
def lines(capsys):
    return capsys.readouterr().out.splitlines()










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




def test_main_lists_changes_beside_a_regression(w, capsys):
    w.write_book(CODE, sections(broken=0, fights=1))
    w.after[CODE] = {'secs': sections(broken=1, fights=2), 'report': None}
    assert ra.main([CODE]) == 1
    out = lines(capsys)[0]
    assert 'WORSE: broken 0 -> 1' in out and '; also ' in out and 'fights 1 -> 2' in out




















def test_main_counts_every_bad_book_once(w, capsys):
    for code in ('01fftd', '02fotw', '03tcok'):
        w.write_book(code, sections())
    w.rc['01fftd'] = 1
    w.after['02fotw'] = {'secs': sections(broken=1), 'report': None}
    w.after['03tcok'] = {'secs': sections(), 'report': None}
    assert ra.main([]) == 1
    assert lines(capsys)[-1] == '3 books re-imported; 2 worse or failed'


