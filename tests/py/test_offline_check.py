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


def test_json_lists_only_ten_largest(site, capsys, monkeypatch):
    import sys
    for i in range(15):
        w(site, f'many/f{i:02d}.js', 100 + i)
    with open(os.path.join(site, 'main.js'), 'w') as f:
        f.write(''.join(f'import "./many/f{i:02d}.js";' for i in range(15)))
    monkeypatch.setattr(sys, 'argv', ['x', '--json'])
    assert offline_check.main() == 0
    got = json.loads(capsys.readouterr().out)
    assert len(got['largest']) == 10 and got['files'] > 15


def test_text_output(site, capsys, monkeypatch):
    import sys
    monkeypatch.setattr(sys, 'argv', ['x'])
    assert offline_check.main() == 0
    out = capsys.readouterr().out
    total = sum(os.path.getsize(os.path.join(site, f)) for f in
                ('index.html', 'main.js', 'shared/a.js', 'data/projectaon/01fftd/book.js', 'data/projectaon/02fotw/book.js'))
    assert out.startswith(f'5 files, {total / 1e6:.2f} MB, version {serve.offline_list(site)["version"]}')
    assert '\nby group:\n' in out and '\nlargest:\n' in out and out.rstrip().endswith('missing: 0')
    groups = out.split('by group:')[1].split('largest:')[0]
    lines = [l for l in groups.splitlines() if l.strip()]
    assert lines[0].endswith('data/projectaon/01fftd') and 'files' in lines[0]  # biggest group first
    assert 'data/projectaon/02fotw' in groups and '  shared' in groups.replace('files  shared', '  shared')
    largest = out.split('largest:')[1].split('missing:')[0]
    assert [l.split()[-1] for l in largest.splitlines() if l.strip()][0] == 'data/projectaon/01fftd/book.js'


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


def test_module_import_does_not_run_anything():
    # imported by the tests without side effects: main() runs only under __main__
    assert callable(offline_check.main) and callable(offline_check.group)
