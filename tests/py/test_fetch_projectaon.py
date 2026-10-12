"""tools/fetch_projectaon.py downloads books. These tests never touch the network: urllib.request.urlopen is
replaced by a fake site (a dict of page name -> bytes) and the socket layer is blocked as a second guard.
The script is run as a copy inside a temporary tree so what it saves lands under tmp_path."""
import os
import runpy
import shutil
import socket
import sys
import urllib.request

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
    assert len(ns['RULES']) == 13 and 'cmbtrulz.htm' in ns['RULES']
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


def test_sends_a_browser_style_user_agent_and_a_timeout(tmp_path, offline):
    site = offline({'sect1.htm': art('')})
    run_script(tmp_path, '02fotw')
    url, headers, timeout = site.requests[0]
    assert headers['User-agent'] == 'Mozilla/5.0 (personal reader)'
    assert timeout == 30


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


def test_an_empty_file_on_disk_counts_as_missing_and_is_fetched(tmp_path, offline):
    d = book_dir(tmp_path, '02fotw')
    d.mkdir(parents=True)
    (d / 'sect1.htm').write_bytes(b'')
    site = offline({'sect1.htm': art('x')})
    run_script(tmp_path, '02fotw')
    assert 'sect1.htm' in site.names() and (d / 'sect1.htm').stat().st_size > 0


def test_a_flaky_page_is_retried(tmp_path, offline, monkeypatch):
    calls = {'n': 0}
    pages = {'sect1.htm': art('')}

    def flaky(req, timeout=None):
        name = req.full_url.rsplit('/', 1)[1]
        if name == 'license.htm':
            calls['n'] += 1
            if calls['n'] < 3:
                raise OSError('reset')
            return Reply(b'finally')
        if name in pages:
            return Reply(pages[name])
        raise OSError('404')
    offline({})
    monkeypatch.setattr(urllib.request, 'urlopen', flaky)
    run_script(tmp_path, '02fotw')
    assert calls['n'] == 3
    assert (book_dir(tmp_path, '02fotw') / 'license.htm').read_bytes() == b'finally'


def test_rules_only_fetches_just_the_rules_pages_and_exits(tmp_path, offline, capsys):
    site = offline({'gamerulz.htm': b'g', 'random.htm': b'r', 'sect1.htm': art('')})
    with pytest.raises(SystemExit) as e:
        run_script(tmp_path, '03tcok', '--rules')
    assert e.value.code == 0
    assert capsys.readouterr().out.strip() == '03tcok: 2 rules pages: gamerulz.htm random.htm'
    assert 'sect1.htm' not in site.names() and 'license.htm' not in site.names()
    assert sorted(os.listdir(book_dir(tmp_path, '03tcok'))) == ['gamerulz.htm', 'random.htm']


def test_rules_flag_may_come_before_the_book_code(tmp_path, offline, capsys):
    offline({'gamerulz.htm': b'g'})
    with pytest.raises(SystemExit):
        run_script(tmp_path, '--rules', '04tcod')
    assert capsys.readouterr().out.startswith('04tcod: 1 rules pages')


def test_default_book_is_the_first(tmp_path, offline):
    site = offline({'sect1.htm': art('')})
    ns = run_script(tmp_path)
    assert ns['book'] == '01fftd'
    assert site.requests[0][0].startswith(BASE.format('01fftd'))


def test_the_test_harness_really_blocks_the_network(offline):
    offline({})
    with pytest.raises(AssertionError):
        socket.create_connection(('example.invalid', 80))
