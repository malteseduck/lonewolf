"""ill_upscale.py: every illustration of a book upscaled 2x to WebP beside its original.
subprocess.run is replaced by a stand-in that 4x-enlarges the picture, so Real-ESRGAN never runs;
the pictures are blank stand-ins made here."""
import os
import subprocess
from types import SimpleNamespace

import pytest
from PIL import Image

import ill_upscale

CODE = '02fotw'


@pytest.fixture
def book(tmp_path, monkeypatch):
    monkeypatch.setattr(ill_upscale, 'DATA', str(tmp_path))
    calls = []

    def fake_run(cmd, check, capture_output):
        calls.append(cmd)
        src, dst = cmd[cmd.index('-i') + 1], cmd[cmd.index('-o') + 1]
        im = Image.open(src)
        im.resize((im.width * 4, im.height * 4), Image.NEAREST).save(dst)

    monkeypatch.setattr(subprocess, 'run', fake_run)
    d = tmp_path / CODE
    d.mkdir()
    for name, size, mode in (('ill1.png', (20, 30), 'L'), ('small1.png', (40, 10), 'P'), ('ill2.png', (20, 30), 'RGBA'), ('map.png', (50, 50), 'RGB')):
        Image.new(mode, size).save(d / name)
    return SimpleNamespace(dir=d, calls=calls)


def test_each_illustration_gets_a_2x_webp_beside_it_and_nothing_else_is_touched(book, capsys):
    assert ill_upscale.main([CODE]) == 0
    for name, size in (('ill1', (40, 60)), ('small1', (80, 20)), ('ill2', (40, 60))):
        im = Image.open(book.dir / f'{name}-2x.webp')
        assert im.format == 'WEBP' and im.size == size
    assert not (book.dir / 'map-2x.webp').exists()  # the map has its own step
    assert len(book.calls) == 3
    assert '3 upscaled' in capsys.readouterr().out


def test_a_second_run_skips_those_done_unless_forced_or_the_original_is_newer(book):
    ill_upscale.main([CODE])
    book.calls.clear()
    assert ill_upscale.main([CODE]) == 0 and book.calls == []
    t = os.path.getmtime(book.dir / 'ill1-2x.webp') + 10
    os.utime(book.dir / 'ill1.png', (t, t))  # the original changed since
    ill_upscale.main([CODE])
    assert len(book.calls) == 1
    book.calls.clear()
    ill_upscale.main([CODE, '--force'])
    assert len(book.calls) == 3


def test_an_unknown_book_or_a_missing_folder_fails(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(ill_upscale, 'DATA', str(tmp_path))
    assert ill_upscale.main(['nosuch']) == 1
    assert ill_upscale.main([CODE]) == 1  # not downloaded


def test_listing_gives_each_illustration_its_upscale_and_sections_for_the_sheet(book):
    ill_upscale.main([CODE])
    os.remove(book.dir / 'ill2-2x.webp')
    secs = {'4': {'img': {'file': 'ill1-2x.webp', 'full': True}}, '9': {'img': {'file': 'ill1.png', 'full': True}},
            '12': {'img': {'file': 'small1.png', 'full': False}}, '13': {}}
    js = '(window.LW = window.LW || {}).BOOKS = Object.assign(window.LW.BOOKS || {}, ' + \
        __import__('json').dumps({CODE: {'sections': secs}}) + ');\n'
    (book.dir / 'book.js').write_text(js, encoding='utf-8')
    got = ill_upscale.listing(CODE)
    assert [i['name'] for i in got] == ['ill1.png', 'ill2.png', 'small1.png']  # by number, the map left out
    one = got[0]
    assert one['big'] == 'ill1-2x.webp' and one['bytes'] == os.path.getsize(book.dir / 'ill1.png')
    assert one['bigBytes'] == os.path.getsize(book.dir / 'ill1-2x.webp') and one['sections'] == ['4', '9']
    assert got[1]['big'] is None and got[1]['sections'] == []
    assert got[2]['sections'] == ['12']


def test_listing_of_a_book_not_downloaded_is_none(tmp_path, monkeypatch):
    monkeypatch.setattr(ill_upscale, 'DATA', str(tmp_path))
    assert ill_upscale.listing(CODE) is None and ill_upscale.listing('nosuch') is None


def test_fights_upscales_every_picture_the_books_fights_can_show_and_lists_them(book, tmp_path, monkeypatch, capsys):
    import json
    import plates_file
    monkeypatch.setattr(ill_upscale, 'ROOT', str(tmp_path))
    monkeypatch.setattr(plates_file, 'ROOT', str(tmp_path))
    monkeypatch.setattr(plates_file, 'PLATES', str(tmp_path / 'assets' / 'plates' / 'plates.json'))
    pic = lambda rel, size=(30, 20): (tmp_path.joinpath(*rel.split('/')).parent.mkdir(parents=True, exist_ok=True),
                                      Image.new('RGB', size, 'white').save(tmp_path.joinpath(*rel.split('/'))))
    # the book's own picture (ill1.png, from the fixture), a library one, the owner's, and an approved one
    pic('assets/plates/troll.png')
    pic(f'art/plates/{CODE}/giak.webp')
    pic(f'art/plates/{CODE}/old.webp')
    (tmp_path / 'assets' / 'plates' / 'plates.json').write_text(json.dumps({'plates': [
        {'match': '^giak$', 'book': CODE, 'src': f'art/plates/{CODE}/giak.webp', 'crop': [0, 0, 0.5, 0.5]},
        {'match': 'troll', 'src': 'assets/plates/troll.png'}]}), encoding='utf-8')
    secs = {'1': {'combat': {'enemies': [{'name': 'Kraan', 'art': 'ill1.png'}, {'name': 'Giak'}, {'name': 'Cave Troll'}, {'name': 'Nobody'}]}}}
    (book.dir / 'book.js').write_text('(window.LW = window.LW || {}).BOOKS = Object.assign(window.LW.BOOKS || {}, '
                                      + json.dumps({CODE: {'assets': f'data/projectaon/{CODE}/', 'sections': secs}}) + ');\n', encoding='utf-8')
    (tmp_path / 'data' / 'projectaon').mkdir(parents=True, exist_ok=True)
    os.replace(book.dir, tmp_path / 'data' / 'projectaon' / CODE)
    monkeypatch.setattr(ill_upscale, 'DATA', str(tmp_path / 'data' / 'projectaon'))
    (tmp_path / 'assets' / 'plates' / 'approved').mkdir()
    (tmp_path / 'assets' / 'plates' / 'approved' / f'{CODE}.json').write_text(json.dumps({'pins': {
        '1/1': {'name': 'x', 'plate': {'src': f'art/plates/{CODE}/old.webp'}}, '1/3': {'name': 'y', 'plate': None}}}), encoding='utf-8')
    assert ill_upscale.main(['--fights', CODE]) == 0
    want = [f'art/plates/{CODE}/giak.webp', f'art/plates/{CODE}/old.webp', 'assets/plates/troll.png', f'data/projectaon/{CODE}/ill1.png']
    got = json.loads((tmp_path / 'assets' / 'plates' / 'upscaled' / f'{CODE}.json').read_text(encoding='utf-8'))
    assert got['srcs'] == want
    for rel in want:  # each copy beside its picture, twice its size
        assert Image.open(tmp_path.joinpath(*rel.split('/')).with_name(rel.split('/')[-1].rsplit('.', 1)[0] + '-2x.webp')).width == 2 * Image.open(tmp_path.joinpath(*rel.split('/'))).width
    assert '4 fight pictures upscaled' in capsys.readouterr().out
    book.calls.clear()
    assert ill_upscale.main(['--fights', CODE]) == 0 and book.calls == []  # done already
