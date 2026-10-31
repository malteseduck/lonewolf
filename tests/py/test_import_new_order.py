"""The importer on a New Order book (ADR 0047): the demo's stand-in pages under a New Order code, so
no book text is needed. Ranks are read within the series, the new disciplines are gates."""
import json
import os
import runpy
import shutil
import sys

import add_book
import book_status
import demo_book

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


def test_the_catalogue_knows_the_series(tmp_path, monkeypatch):
    assert book_status.SERIES(20) == 'grand master' and book_status.SERIES(21) == 'new order'
    assert book_status.SERIES(99) == 'kai'
    f = tmp_path / 'import_projectaon.py'
    f.write_text("BOOKS = {\n    '20tcon': (20, 'grandmaster', 'x'),\n}\n", encoding='utf-8')
    monkeypatch.setattr(add_book, 'IMPORTER', str(f))
    monkeypatch.setattr(book_status, 'IMPORTER', str(f))
    assert add_book.add('21')[0]
    assert "(21, 'neworder', 'Voyage of the Moonstone')" in f.read_text(encoding='utf-8')


def test_the_importer_reads_a_new_order_book(tmp_path, monkeypatch):
    shutil.copytree(os.path.join(REPO, 'demo'), tmp_path / 'demo')
    demo_book.install(str(tmp_path), importer=False)
    d = tmp_path / 'data' / 'projectaon'
    shutil.move(str(d / '99ember'), str(d / '21votm'))
    page = d / '21votm' / 'sect1.htm'
    page.write_text(page.read_text('utf-8').replace('Sixth Sense', 'Astrology'), 'utf-8')
    (tmp_path / 'tools').mkdir()
    script = tmp_path / 'tools' / 'import_projectaon.py'
    src = open(os.path.join(REPO, 'tools', 'import_projectaon.py'), encoding='utf-8').read()
    script.write_text(src.replace('BOOKS = {  # code: (number, series, title)\n', "BOOKS = {  # code: (number, series, title)\n    '21votm': (21, 'neworder', 'Stand-in'),\n", 1), 'utf-8')
    (tmp_path / 'assets' / 'plates').mkdir(parents=True)
    (tmp_path / 'assets' / 'plates' / 'plates.json').write_text('{"plates": []}')
    monkeypatch.setattr(sys, 'argv', [str(script), '21votm'])
    g = runpy.run_path(str(script))
    book = json.loads((d / '21votm' / 'book.js').read_text('utf-8').split('|| {}, ', 1)[1].rsplit(');', 1)[0])['21votm']
    assert book['number'] == 21 and book['series'] == 'neworder'
    assert book['sections']['1']['choices'][0]['need'] == {'disc': 'astrology'}
    # a rank's count of the series' Disciplines: five at the start, sixteen at the top
    assert g['rank_of']('Kai Grand Master Senior') == 5
    assert g['rank_of']('Grand Sentinel') == 7
    assert g['rank_of']('Kai Supreme Master') == 16
    assert all(g['DISC'][k] for k in ('astrology', 'herbmastery', 'elementalism', 'bardsmanship'))
