"""tools/fetch_projectaon.py downloads books. These tests never touch the network: urllib.request.urlopen is
replaced by a fake site (a dict of page name -> bytes) and the socket layer is blocked as a second guard.
The script is run as a copy inside a temporary tree so what it saves lands under tmp_path."""
import io
import os
import runpy
import shutil
import socket
import sys
import urllib.request
import zipfile

import pytest

SRC = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'tools', 'fetch_projectaon.py'))
BASE = 'https://www.projectaon.org/en/xhtml/lw/{}/'


class Reply:
    def __init__(self, data):
        self.data = data

    def read(self):
        return self.data


class Site:
    """A fake Project Aon. Anything not in pages is an error, as a 404 is."""
    def __init__(self, pages):
        self.pages = pages
        self.requests = []   # (url, headers, timeout)

    def urlopen(self, req, timeout=None):
        self.requests.append((req.full_url, dict(req.header_items()), timeout))
        name = req.full_url.rsplit('/', 1)[1]
        if name not in self.pages:
            raise OSError('HTTP Error 404')
        return Reply(self.pages[name])

    def names(self):
        return [u.rsplit('/', 1)[1] for u, _, _ in self.requests]


@pytest.fixture
def offline(monkeypatch):
    """No real request can be made: the fake replaces urlopen, sleeping is skipped, sockets are refused."""
    def refuse(*a, **k):
        raise AssertionError('a real network connection was attempted')
    monkeypatch.setattr(socket.socket, 'connect', refuse)
    monkeypatch.setattr(socket, 'create_connection', refuse)
    monkeypatch.setattr('time.sleep', lambda s: None)

    def install(pages):
        site = Site(pages)
        monkeypatch.setattr(urllib.request, 'urlopen', site.urlopen)
        return site
    return install


def run_script(root, *args):
    tools = root / 'tools'
    tools.mkdir(parents=True, exist_ok=True)
    script = tools / 'fetch_projectaon.py'
    shutil.copyfile(SRC, script)
    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(sys, 'argv', [str(script), *args])
        return runpy.run_path(str(script))


def book_dir(root, book):
    return root / 'data' / 'projectaon' / book


def art(body):
    return f'<html><article>{body}</article><footer><img src="footer.png"/></footer></html>'.encode()


def test_fetches_pages_sections_until_one_is_missing_and_the_images_they_use(tmp_path, offline, capsys):
    site = offline({
        'license.htm': b'license', 'tssf.htm': art('<img src="ill0.jpg"/>'), 'map.htm': art('<img src="map.png"/>'),
        'sect1.htm': art('<p>a</p><img src="ill1.png"/>'), 'sect2.htm': art('<img src="ill2.gif"/><img src="skip.svg"/>'),
        'ill0.jpg': b'0' * 10, 'ill1.png': b'1' * 20, 'ill2.gif': b'2' * 30, 'map.png': b'M' * 40, 'sect4.htm': b'unreachable'})
    run_script(tmp_path, '02fotw')
    d = book_dir(tmp_path, '02fotw')
    assert sorted(os.listdir(d)) == ['ill0.jpg', 'ill1.png', 'ill2.gif', 'license.htm', 'map.htm', 'map.png', 'sect1.htm', 'sect2.htm', 'tssf.htm']
    assert (d / 'ill1.png').read_bytes() == b'1' * 20
    names = site.names()
    assert 'sect3.htm' in names and 'sect4.htm' not in names     # stops at the first missing section
    assert 'footer.png' not in names and 'skip.svg' not in names    # only images inside <article>, of the known types
    assert all(u.startswith(BASE.format('02fotw')) for u, _, _ in site.requests)
    out = capsys.readouterr().out.strip()
    assert out == '2 sections, 4 images, 0.0 MB'


def test_asks_for_every_rules_page_and_ignores_the_ones_a_book_lacks(tmp_path, offline, capsys):
    site = offline({'sect1.htm': art(''), 'gamerulz.htm': art(''), 'random.htm': art('')})
    ns = run_script(tmp_path, '01fftd')
    assert set(ns['RULES']) <= set(site.names())
    assert len(ns['RULES']) == 14 and 'cmbtrulz.htm' in ns['RULES'] and 'kainame.htm' in ns['RULES']
    out = capsys.readouterr().out
    assert 'FAILED gamerulz' not in out and 'FAILED lorecrcl' not in out   # rules pages are fetched quietly


def test_a_missing_ordinary_page_is_reported_failed_with_three_attempts(tmp_path, offline, capsys):
    site = offline({'sect1.htm': art('')})
    run_script(tmp_path, '02fotw')
    out = capsys.readouterr().out
    assert 'FAILED license.htm' in out and 'FAILED tssf.htm' in out and 'FAILED map.htm' in out
    assert 'FAILED sect' not in out                               # the probe past the last section is quiet
    assert 'FAILED map.png' in out
    assert site.names().count('license.htm') == 3
    assert not (book_dir(tmp_path, '02fotw') / 'license.htm').exists()   # nothing saved for a failure


def book_zip(book, files, prefix=None):
    """The zip Project Aon keeps beside a book's pages, its files under the site's own path."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w') as z:
        for name, data in files.items():
            z.writestr((prefix if prefix is not None else f'en/xhtml/lw/{book}/') + name, data)
    return buf.getvalue()


def test_a_book_comes_from_its_zip_in_one_request_keeping_only_what_the_pages_need(tmp_path, offline, capsys):
    files = {'license.htm': b'license', 'tssf.htm': art(''), 'map.htm': art('<img src="map.png"/>'), 'gamerulz.htm': art(''),
             'sect1.htm': art('<img src="ill1.png"/>'), 'sect2.htm': art(''), 'ill1.png': b'1' * 20, 'map.png': b'M' * 40,
             'main.css': b'unused', 'title.htm': b'unused', 'small1.png': b'unused'}
    site = offline({'22x.zip': book_zip('22x', files)})
    run_script(tmp_path, '22x')
    d = book_dir(tmp_path, '22x')
    assert sorted(os.listdir(d)) == ['gamerulz.htm', 'ill1.png', 'license.htm', 'map.htm', 'map.png', 'sect1.htm', 'sect2.htm', 'tssf.htm']
    assert (d / 'ill1.png').read_bytes() == b'1' * 20
    assert site.names() == ['22x.zip']     # no probing past the last section, no asking for pages a book lacks
    assert not (d / '22x.zip').exists()
    assert '2 sections, 2 images' in capsys.readouterr().out


def test_a_required_file_the_zip_lacks_is_asked_for_on_its_own(tmp_path, offline):
    files = {'license.htm': b'l', 'tssf.htm': art(''), 'map.png': b'M', 'sect1.htm': art('')}
    site = offline({'22x.zip': book_zip('22x', files), 'map.htm': art('')})
    run_script(tmp_path, '22x')
    assert (book_dir(tmp_path, '22x') / 'map.htm').exists()
    assert site.names() == ['22x.zip', 'map.htm']


@pytest.mark.parametrize('data', [b'not a zip', book_zip('22x', {'title.htm': b'x'}), book_zip('22x', {'sect1.htm': b'x'}, prefix='elsewhere/')],
                         ids=['not-a-zip', 'no-sections', 'elsewhere'])  # a zip's bytes hold the time: an id from them differs between xdist workers
def test_a_bad_zip_or_one_without_the_book_falls_back_to_the_pages(tmp_path, offline, data):
    site = offline({'22x.zip': data, 'sect1.htm': art(''), 'map.png': b'M'})
    run_script(tmp_path, '22x')
    d = book_dir(tmp_path, '22x')
    assert (d / 'sect1.htm').read_bytes() == art('') and 'sect2.htm' in site.names()
    assert not (d / 'title.htm').exists()


def test_a_zip_writes_nothing_outside_the_books_folder(tmp_path, offline):
    files = {'sect1.htm': art('<img src="../evil.png"/>'), 'license.htm': b'l', 'tssf.htm': art(''), 'map.htm': art(''), 'map.png': b'M'}
    data = book_zip('22x', files)
    buf = io.BytesIO(data)
    with zipfile.ZipFile(buf, 'a') as z:
        z.writestr('en/xhtml/lw/22x/../evil.png', b'evil')
    offline({'22x.zip': buf.getvalue()})
    run_script(tmp_path, '22x')
    assert not (book_dir(tmp_path, '22x').parent / 'evil.png').exists()


def test_files_already_on_disk_are_not_fetched_again(tmp_path, offline):
    d = book_dir(tmp_path, '02fotw')
    d.mkdir(parents=True)
    (d / 'sect1.htm').write_bytes(art('<img src="ill1.png"/>'))
    (d / 'ill1.png').write_bytes(b'already here')
    (d / 'empty.htm').write_bytes(b'')
    site = offline({'sect1.htm': b'NEW', 'sect2.htm': art(''), 'ill1.png': b'NEW'})
    run_script(tmp_path, '02fotw')
    assert (d / 'sect1.htm').read_bytes() != b'NEW' and (d / 'ill1.png').read_bytes() == b'already here'
    names = site.names()
    assert 'sect1.htm' not in names and 'ill1.png' not in names


