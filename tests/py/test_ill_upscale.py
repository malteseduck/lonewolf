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
