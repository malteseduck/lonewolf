"""The importer on a New Order book (ADR 0047): the demo's stand-in pages under a New Order code, so
no book text is needed. Ranks are read within the series, the new disciplines are gates."""
import json
import os
import re
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


def test_every_new_order_book_can_be_downloaded_and_imported():
    new = [(c, n) for n, (c, _) in enumerate(book_status.CATALOGUE, 1) if n > 20]
    assert [c for c, _ in new] == ['21votm', '22tbos', '23mh', '24rw', '25totw', '26tfobm', '27v', '28thos', '29tsoc']
    assert all(book_status.SERIES(n) == 'new order' for _, n in new)
    assert {c for c, _ in new} <= book_status.importer_books()
    assert book_status.find('29') == ('29tsoc', 'The Storms of Chai', 29)


def test_the_shelf_names_every_book_of_the_catalogue():
    with open(os.path.join(REPO, 'main.js'), encoding='utf-8') as f:
        block = re.search(r'const SERIES_TITLES = \[(.*?)\];', f.read(), re.S).group(1)
    titles = [a or b for a, b in re.findall(r"'([^']+)'|\"([^\"]+)\"", block)]
    assert titles == [t for _, t in book_status.CATALOGUE]


def test_the_importer_reads_a_new_order_book(tmp_path, monkeypatch):
    shutil.copytree(os.path.join(REPO, 'demo'), tmp_path / 'demo')
    demo_book.install(str(tmp_path), importer=False)
    d = tmp_path / 'data' / 'projectaon'
    shutil.move(str(d / '99ember'), str(d / '21votm'))
    (d / '21votm' / 'map-4k.webp').unlink(missing_ok=True)  # baking the real 4K map takes seconds
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
