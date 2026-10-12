"""tools/offline_check.py over a stand-in site in tmp_path (its ROOT and the offline_list it calls are
pointed there; the default offline_list would read the real repository)."""
import json
import os

import pytest

import offline_check
import serve


def w(root, rel, size=1):
    p = os.path.join(root, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'wb') as f:
        f.write(b'x' * size)


@pytest.fixture
def site(tmp_path, monkeypatch):
    root = str(tmp_path)
    page = (b'<script src="main.js"></script><script src="data/projectaon/01fftd/book.js"></script>'
            b'<script src="data/projectaon/02fotw/book.js"></script><script src="shared/a.js"></script>')
    os.makedirs(root, exist_ok=True)
    with open(os.path.join(root, 'index.html'), 'wb') as f:
        f.write(page)
    w(root, 'main.js', 5000)
    w(root, 'shared/a.js', 300)
    w(root, 'data/projectaon/01fftd/book.js', 20000)
    w(root, 'data/projectaon/02fotw/book.js', 10)
    monkeypatch.setattr(offline_check, 'ROOT', root)
    monkeypatch.setattr(offline_check, 'offline_list', lambda: serve.offline_list(root))
    return root


def test_group_names():
    g = offline_check.group
    assert g('index.html') == '(root)'
    assert g('main.js') == '(root)'
    assert g('shared/a.js') == 'shared'
    assert g('assets/icons/key.svg') == 'assets'
    assert g('data/projectaon/index.js') == 'data/projectaon'
    assert g('data/projectaon/01fftd/book.js') == 'data/projectaon/01fftd'
    assert g('data/projectaon/01fftd/sub/p.png') == 'data/projectaon/01fftd'
    assert g('data/other.json') == 'data'


def test_json_output(site, capsys):
    assert offline_check.main.__module__ == 'offline_check'
    import sys
    sys.argv = ['offline_check.py', '--json']
    assert offline_check.main() == 0
    got = json.loads(capsys.readouterr().out)
    assert got['files'] == 5
    sizes = {'main.js': 5000, 'shared/a.js': 300, 'data/projectaon/01fftd/book.js': 20000, 'data/projectaon/02fotw/book.js': 10,
             'index.html': os.path.getsize(os.path.join(site, 'index.html'))}
    assert got['bytes'] == sum(sizes.values())
    assert got['version'] == serve.offline_list(site)['version']
    assert got['groups'] == {'(root)': [2, sizes['main.js'] + sizes['index.html']], 'shared': [1, 300],
                             'data/projectaon/01fftd': [1, 20000], 'data/projectaon/02fotw': [1, 10]}
    assert got['largest'][0] == ['data/projectaon/01fftd/book.js', 20000]
    assert [n for _, n in got['largest']] == sorted((n for _, n in got['largest']), reverse=True)
    assert got['missing'] == []


def test_a_missing_file_is_reported_and_exits_1(site, capsys, monkeypatch):
    import sys
    os.remove(os.path.join(site, 'shared', 'a.js'))
    monkeypatch.setattr(sys, 'argv', ['x'])
    assert offline_check.main() == 1
    out = capsys.readouterr().out
    assert 'missing: 1' in out and out.rstrip().endswith('  shared/a.js')
    monkeypatch.setattr(sys, 'argv', ['x', '--json'])
    assert offline_check.main() == 1
    assert json.loads(capsys.readouterr().out)['missing'] == ['shared/a.js']


