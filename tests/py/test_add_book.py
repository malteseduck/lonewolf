"""tools/add_book.py against a stand-in importer: the BOOKS table is copied to tmp_path and the
script pointed at it, so the real importer is never written."""
import add_book
import book_status as bs

IMPORTER = """import sys

BOOKS = {  # code: (number, series, title)
    '01fftd': (1, 'kai', 'Flight from the Dark'), '02fotw': (2, 'kai', 'Fire on the Water'),
    '13tplor': (13, 'grandmaster', 'The Plague Lords of Ruel'),
}
DISC = {'camouflage': 'camouflage'}
"""


def setup(tmp_path, monkeypatch):
    f = tmp_path / 'import_projectaon.py'
    f.write_text(IMPORTER, encoding='utf-8')
    monkeypatch.setattr(add_book, 'IMPORTER', str(f))
    monkeypatch.setattr(bs, 'IMPORTER', str(f))
    return f


def books(f):
    ns = {}
    exec(f.read_text(encoding='utf-8').split('DISC')[0].replace('import sys', ''), ns)
    return ns['BOOKS']


def test_a_book_from_the_catalogue_is_added_with_its_number_series_and_title(tmp_path, monkeypatch):
    f = setup(tmp_path, monkeypatch)
    ok, msg = add_book.add('6')
    assert ok, msg
    assert books(f)['06tkot'] == (6, 'magnakai', 'The Kingdoms of Terror')
    assert '06tkot' in bs.importer_books()  # what the dashboard and serve.py read to call it known
    ok, _ = add_book.add('19wb')  # a title with an apostrophe, and the series the importer spells as one word
    assert ok
    assert books(f)['19wb'] == (19, 'grandmaster', "Wolf's Bane")
    assert books(f)['01fftd'] == (1, 'kai', 'Flight from the Dark')  # the rest untouched
    assert 'DISC' in f.read_text(encoding='utf-8')


def test_a_known_book_or_one_not_in_the_catalogue_is_refused_and_nothing_written(tmp_path, monkeypatch):
    f = setup(tmp_path, monkeypatch)
    for book in ('13', '01fftd', '29', 'xyz'):
        ok, msg = add_book.add(book)
        assert not ok and msg
    assert f.read_text(encoding='utf-8') == IMPORTER
