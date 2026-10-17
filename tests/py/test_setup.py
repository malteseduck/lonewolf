"""tools/setup.py, main paths: what a fresh checkout has and lacks, a gated download unpacked safely,
and an install that runs its commands. ROOT is pointed at tmp_path; no network, no real installs."""
import io
import json
import os
import zipfile

import pytest

import setup


def write(path, data=b''):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as f:
        f.write(data if isinstance(data, bytes) else data.encode())
    return path


@pytest.fixture
def root(tmp_path, monkeypatch):
    monkeypatch.setattr(setup, 'ROOT', str(tmp_path))
    monkeypatch.setattr(setup.shutil, 'which', lambda name: f'/bin/{name}')
    write(tmp_path / 'tools' / 'pyproject.toml', '[project]\nname = "t"\ndependencies = ["numpy>=2", "opencv-python-headless"]\n'
                                                 '[dependency-groups]\ndev = ["pytest>=9"]\n')
    return tmp_path


def by_id(rows):
    return {r['id']: r for r in rows}


def venv(root, *dists):
    sp = root / 'tools' / '.venv' / setup.SITE
    write(root / 'tools' / '.venv' / setup.PYEXE)
    for d in dists:
        (sp / f'{d}-1.0.dist-info').mkdir(parents=True)


def test_fresh_checkout_lacks_every_installable_part(root):
    st = by_id(setup.status())
    assert [r['id'] for r in setup.status()] == ['uv', 'node', 'venv', 'npm', 'realesrgan', 'ocr', 'books', 'art']
    for k in ('venv', 'npm', 'realesrgan', 'ocr'):
        assert st[k]['state'] == 'missing' and st[k]['install'], k
    assert st['uv']['state'] == 'ok' and not st['uv']['install']  # found on PATH; never installed by us
    assert {k for k, r in st.items() if r['gated']} == {'realesrgan', 'ocr'}  # the downloads of files
    assert st['books']['state'] == 'info' and '0 of 20' in st['books']['detail']
    assert st['art']['state'] == 'missing' and 'copy' in st['art']['detail']  # git-ignored: cannot be made


def test_a_tool_not_on_path_is_missing(root, monkeypatch):
    monkeypatch.setattr(setup.shutil, 'which', lambda name: None if name == 'node' else f'/bin/{name}')
    st = by_id(setup.status())
    assert st['node']['state'] == 'missing' and 'nodejs.org' in st['node']['detail']
    assert st['npm']['state'] == 'missing' and not st['npm']['install']  # needs node first


def test_venv_needs_every_requirement(root):
    venv(root, 'numpy', 'pytest')
    st = by_id(setup.status())
    assert st['venv']['state'] == 'missing' and 'opencv-python-headless' in st['venv']['detail']
    venv(root, 'opencv_python_headless')  # dist-info names use underscores
    assert by_id(setup.status())['venv']['state'] == 'ok'


def test_everything_present(root):
    venv(root, 'numpy', 'opencv_python_headless', 'pytest')
    write(root / 'node_modules' / 'vitest' / 'package.json', '{}')
    for f in setup.ESRGAN_FILES:
        write(root / 'tools' / 'realesrgan' / f)
    write(root / 'tools' / '.venv-paddle' / setup.PYEXE)
    (root / 'tools' / '.venv-paddle' / setup.SITE / 'paddleocr-3.0.dist-info').mkdir(parents=True)
    write(root / 'data' / 'projectaon' / '01fftd' / 'gamerulz.htm')
    write(root / 'data' / 'projectaon' / '01fftd' / 'book.js')
    write(root / 'art' / 'plates' / '01fftd' / 'x.webp')
    st = by_id(setup.status())
    assert all(r['state'] in ('ok', 'info') for r in st.values()), st
    assert '1 of 20 downloaded, 1 imported' in st['books']['detail']


def esrgan_zip(extra=()):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w') as z:
        top = 'realesrgan-ncnn-vulkan-20220424-windows/'
        for f in setup.ESRGAN_FILES + ['models/realesr-animevideov3-x2.bin', 'input.jpg', 'vcomp140.dll']:
            z.writestr(top + f, b'x')
        for name in extra:
            z.writestr(name, b'evil')
    return buf.getvalue()


def test_realesrgan_install_unpacks_only_what_the_tools_use(root):
    got = setup.install('realesrgan', fetch=lambda url: esrgan_zip(['../outside.txt']))
    assert got == 0
    d = root / 'tools' / 'realesrgan'
    for f in setup.ESRGAN_FILES:
        assert (d / f).is_file()
    assert (d / 'vcomp140.dll').is_file() and (d / 'models' / 'realesr-animevideov3-x2.bin').is_file()
    assert not (d / 'input.jpg').exists()  # the release's demo pictures are left behind
    assert not (root / 'tools' / 'outside.txt').exists() and not (root / 'outside.txt').exists()
    assert by_id(setup.status())['realesrgan']['state'] == 'ok'


def test_realesrgan_install_refuses_an_archive_without_the_program(root):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w') as z:
        z.writestr('readme.txt', b'x')
    assert setup.install('realesrgan', fetch=lambda url: buf.getvalue()) == 1
    assert not (root / 'tools' / 'realesrgan').exists()


def test_install_runs_its_commands_and_stops_at_a_failure(root):
    ran = []
    assert setup.install('venv', run=lambda argv: ran.append(argv) or 0) == 0
    assert ran == [['uv', 'sync', '--project', 'tools']]  # tools/.venv at uv.lock's versions
    ran.clear()
    assert setup.install('ocr', run=lambda argv: ran.append(argv) or 2) == 2
    assert len(ran) == 1  # stopped after the first command
    assert setup.install('uv') == 1  # not ours to install
    assert setup.install('nope') == 1


def test_cli_json(root, capsys):
    assert setup.main(['--json']) == 0
    assert [r['id'] for r in json.loads(capsys.readouterr().out)][:2] == ['uv', 'node']


def test_your_pictures_offers_to_fetch_again_what_has_a_link(root):
    import art_sources
    write(root / 'art' / 'here.png')
    art_sources.record('art/here.png', 'https://example.org/here.png')
    assert by_id(setup.status())['art']['state'] == 'ok'
    art_sources.record('art/plates/02fotw/giak.webp', 'https://example.org/giak.png')  # listed, not on disk
    art_sources.record('art/me.png', None)
    art = by_id(setup.status())['art']
    assert art['state'] == 'missing' and art['install'] and art['gated']  # a download: the owner's go-ahead
    assert '1 missing that can be fetched' in art['detail'] and 'copy it' in art['detail'] and '1 picture' in art['size']
