"""tools/fetch_icons.py is a top-level script: it runs on import and writes next to itself. So the tests run
a copy of it placed in tmp_path/tools/ (its OUT is ../assets/icons from there), with urlopen mocked: no
network, nothing written into the repository."""
import io
import os
import runpy
import shutil
import urllib.error
import urllib.request

import pytest

SRC = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'tools', 'fetch_icons.py')

GLYPH = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M0 0h512v512H0z"/>'
         '<path fill="#fff" d="M10 10h20v20z"/></svg>')


class Resp:
    def __init__(self, data):
        self._d = data

    def read(self):
        return self._d


@pytest.fixture
def run(tmp_path, monkeypatch, capsys):
    (tmp_path / 'tools').mkdir()
    (tmp_path / 'assets' / 'icons').mkdir(parents=True)
    script = tmp_path / 'tools' / 'fetch_icons.py'
    shutil.copyfile(SRC, script)
    requests = []

    def go(args, replies):
        """replies: {'lorc/key': svg text | HTTPError code}"""
        def fake(req, timeout=None):
            requests.append((req, timeout))
            tail = req.full_url.rsplit('/master/', 1)[1][:-4]
            r = replies[tail]
            if isinstance(r, int):
                raise urllib.error.HTTPError(req.full_url, r, 'nope', {}, io.BytesIO(b''))
            return Resp(r.encode())
        monkeypatch.setattr(urllib.request, 'urlopen', fake)
        monkeypatch.setattr('sys.argv', ['fetch_icons.py', *args])
        runpy.run_path(str(script), run_name='__main__')
        return capsys.readouterr().out.splitlines()
    go.requests = requests
    go.icons = tmp_path / 'assets' / 'icons'
    return go


def test_writes_the_glyph_without_its_black_square_and_white_fill(run):
    out = run(['lorc/key'], {'lorc/key': GLYPH})
    assert out == ['wrote assets/icons/key.svg']
    svg = (run.icons / 'key.svg').read_text(encoding='utf-8')
    assert 'M0 0h512v512H0z' not in svg and 'fill="#fff"' not in svg
    assert svg == GLYPH.replace('<path d="M0 0h512v512H0z"/>', '').replace(' fill="#fff"', '')
    assert 'd="M10 10h20v20z"' in svg


def test_black_square_with_a_space_before_the_close_is_also_removed(run):
    run(['a/b'], {'a/b': '<svg><path d="M0 0h512v512H0z" /><path d="M1 1"/></svg>'})
    assert (run.icons / 'b.svg').read_text() == '<svg><path d="M1 1"/></svg>'


def test_requests_the_game_icons_url_with_a_user_agent_and_timeout(run):
    run(['delapouite/soap'], {'delapouite/soap': GLYPH})
    req, timeout = run.requests[0]
    assert req.full_url == 'https://raw.githubusercontent.com/game-icons/icons/master/delapouite/soap.svg'
    assert req.get_header('User-agent') == 'lone-wolf-personal' and timeout == 30


def test_file_is_named_after_the_icon_not_its_author(run):
    run(['lorc/key', 'delapouite/soap'], {'lorc/key': GLYPH, 'delapouite/soap': GLYPH})
    assert sorted(os.listdir(run.icons)) == ['key.svg', 'soap.svg']


def test_a_missing_icon_prints_not_found_and_the_rest_go_on(run):
    out = run(['lorc/nope', 'lorc/key'], {'lorc/nope': 404, 'lorc/key': GLYPH})
    assert out == ['not found lorc/nope', 'wrote assets/icons/key.svg']
    assert os.listdir(run.icons) == ['key.svg']


def test_no_arguments_does_nothing(run):
    assert run([], {}) == [] and run.requests == [] and os.listdir(run.icons) == []


def test_an_existing_icon_is_overwritten(run):
    (run.icons / 'key.svg').write_text('old')
    run(['lorc/key'], {'lorc/key': GLYPH})
    assert 'old' not in (run.icons / 'key.svg').read_text()


def test_every_http_error_is_reported_as_not_found(run):
    # a 500 is reported as "not found" too: the script catches HTTPError whatever its code
    out = run(['lorc/key'], {'lorc/key': 500})
    assert out == ['not found lorc/key']
