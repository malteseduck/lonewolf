"""The made-up demo book (ADR 0046): its source in demo/99ember/ installs into data/projectaon/ and imports
like a downloaded book, and nothing outside the PC's working copy sees it: not the offline copy, the
whole-library tools or the checklist. The book is stand-in text written for the showcase."""
import os
import runpy
import shutil
import sys

import pytest

import book_status
import demo_book
import serve

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


@pytest.fixture
def root(tmp_path):
    shutil.copytree(os.path.join(REPO, 'demo'), tmp_path / 'demo')
    return tmp_path


def test_install_copies_the_pages_and_art_but_not_the_item_table_and_is_idempotent(root):
    first = demo_book.install(str(root), importer=False)
    d = root / 'data' / 'projectaon' / '99ember'
    assert 'sect1.htm' in first and 'ill1.png' in first and 'map.png' in first
    assert 'items.js' not in first and not (d / 'items.js').exists()
    assert demo_book.install(str(root), importer=False) == []
    (d / 'sect1.htm').write_text('changed')
    assert demo_book.install(str(root), importer=False) == ['sect1.htm']


def test_the_importer_reads_it_as_a_whole_book(root, monkeypatch):
    demo_book.install(str(root), importer=False)
    (root / 'tools').mkdir()
    script = root / 'tools' / 'import_projectaon.py'
    shutil.copyfile(os.path.join(REPO, 'tools', 'import_projectaon.py'), script)
    (root / 'assets' / 'plates').mkdir(parents=True)
    (root / 'assets' / 'plates' / 'plates.json').write_text('{"plates": []}')
    monkeypatch.setattr(sys, 'argv', [str(script), '99ember'])
    runpy.run_path(str(script))
    import json
    book = json.loads((root / 'data' / 'projectaon' / '99ember' / 'book.js').read_text('utf-8').split('|| {}, ', 1)[1].rsplit(');', 1)[0])['99ember']
    secs = book['sections']
    assert book['number'] == 99 and book['series'] == 'kai' and book['start'] == '1'
    assert all(c['to'] in secs for s in secs.values() for c in s['choices'])
    assert secs['27']['combat']['enemies'][0]['art'] == 'ill27.png'
    assert secs['38']['rnt'] == 'auto' and secs['1']['choices'][0]['need'] == {'disc': 'sixthSense'}
    assert secs['90']['end'] == 'victory' and len(book['intro']) == 2


def test_the_offline_copy_never_names_it(tmp_path):
    (tmp_path / 'index.html').write_text('<script src="data/projectaon/index.js"></script>')
    d = tmp_path / 'data' / 'projectaon'
    (d / '99ember').mkdir(parents=True)
    (d / 'index.js').write_text('''document.write('<script src="data/projectaon/99ember/book.js"></script>');''')
    (d / '99ember' / 'book.js').write_text('x')
    got = serve.offline_list(str(tmp_path))
    assert not any("99ember" in f for f in got["files"]) and not got["missing"]


def test_the_whole_library_tools_and_the_checklist_leave_it_alone(monkeypatch):
    assert '99ember' not in book_status.importer_books()
    assert '99ember' in book_status.importer_books(demo=True)
    assert book_status.find('99ember') == ('99ember', 'The Ember Road', 99)
    assert book_status.SERIES(99) == 'kai'
    shown = book_status.checklist_table([
        {'n': 1, 'folder': True, 'stages': {s[0]: {'state': 'done'} for s in book_status.STEPS.values()}},
        {'n': 99, 'demo': True, 'folder': True, 'stages': {s[0]: {'state': 'done'} for s in book_status.STEPS.values()}}])
    assert '99' not in shown.splitlines()[0]
