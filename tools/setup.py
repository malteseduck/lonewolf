"""What a checkout needs for the tools, what it has, and installing what is missing (ADR 0036).

    uv run --no-project python tools/setup.py                 one line per part
    uv run --no-project python tools/setup.py --json          the same as JSON (the dashboard's Setup panel)
    uv run --no-project python tools/setup.py install <part>  venv, npm, realesrgan, ocr
    uv run --no-project python tools/setup.py install all     venv and npm: what a fresh checkout needs first

Standard library only, run with --no-project so that it reports what is missing rather than having uv
install it first. The Python tools' packages are tools/pyproject.toml's, at uv.lock's versions (ADR 0037).
uv and Node are installed by the owner, not here. realesrgan and ocr download files (about 45 MB from
GitHub; about 1 GB of packages): the dashboard gates them. The books are downloaded from each book's
row; art/ (the owner's own pictures) is git-ignored: those with a link in art/sources.json are fetched
again by tools/art_sources.py (the dashboard's setup-art, gated), the rest copied from the old checkout.
"""
import glob
import io
import json
import os
import shutil
import subprocess
import sys
import tomllib
import urllib.request
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PYEXE = 'Scripts/python.exe' if os.name == 'nt' else 'bin/python'
SITE = 'Lib/site-packages' if os.name == 'nt' else 'lib/python*/site-packages'
ESRGAN_URL = 'https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-windows.zip'
ESRGAN_EXE = 'realesrgan-ncnn-vulkan.exe'
ESRGAN_FILES = [ESRGAN_EXE, 'models/realesrgan-x4plus.param', 'models/realesrgan-x4plus.bin']
VENV, PADDLE = 'tools/.venv', 'tools/.venv-paddle'


def p(*parts):
    return os.path.join(ROOT, *parts)


def norm(name):
    return name.lower().replace('-', '_').replace('.', '_')


def requirements():
    """The names in tools/pyproject.toml: its dependencies and its dependency groups (uv syncs them all)."""
    with open(p('tools', 'pyproject.toml'), 'rb') as f:
        proj = tomllib.load(f)
    names = []
    for spec in proj.get('project', {}).get('dependencies', []) + [x for g in proj.get('dependency-groups', {}).values() for x in g]:
        for stop in '<>=!~;[ ':
            spec = spec.split(stop)[0]
        names.append(spec.strip())
    return names


def dists(venv):
    """The normalised names of the packages installed in a venv."""
    return {norm(os.path.basename(d).split('-')[0]) for d in glob.glob(p(venv, SITE, '*.dist-info'))}


def has_python(venv):
    return os.path.isfile(p(venv, PYEXE))


def row(id_, label, what, state, detail, install=False, gated=False, size=''):
    return {'id': id_, 'label': label, 'what': what, 'state': state, 'detail': detail,
            'install': install, 'gated': gated, 'size': size}


def status():
    rows = []
    for tool, label, url in (('uv', 'uv', 'https://docs.astral.sh/uv/'), ('node', 'Node.js', 'https://nodejs.org/')):
        at = shutil.which(tool)
        rows.append(row(tool, label, 'runs the Python tools' if tool == 'uv' else 'runs the unit tests and the item checks',
                        'ok' if at else 'missing', at or f'not on PATH: install it from {url}, then restart the server'))
    need = requirements()
    if has_python(VENV):
        lack = [n for n in need if norm(n) not in dists(VENV)]
        rows.append(row('venv', 'Python packages', 'tools/.venv: ' + ', '.join(need), 'missing' if lack else 'ok',
                        f"not installed: {', '.join(lack)}" if lack else 'all installed', install=True))
    else:
        rows.append(row('venv', 'Python packages', 'tools/.venv: ' + ', '.join(need), 'missing', 'no tools/.venv yet', install=True))
    node = shutil.which('node')
    ok = os.path.isfile(p('node_modules', 'vitest', 'package.json'))
    rows.append(row('npm', 'npm packages', 'node_modules: Vitest, jsdom (package-lock.json)', 'ok' if ok else 'missing',
                    'installed' if ok else 'not installed' if node else 'install Node.js first', install=bool(node)))
    lack = [f for f in ESRGAN_FILES if not os.path.isfile(p('tools', 'realesrgan', f))]
    rows.append(row('realesrgan', 'Real-ESRGAN', 'upscales illustrations, fight pictures and maps (tools/realesrgan)',
                    'missing' if lack else 'ok', f"missing: {', '.join(lack)}" if lack else 'v0.2.5.0 present',
                    install=True, gated=True, size='about 45 MB from github.com/xinntao/Real-ESRGAN'))
    ok = has_python(PADDLE) and 'paddleocr' in dists(PADDLE)
    rows.append(row('ocr', 'Map OCR', "PaddleOCR for the map editor's label draft (tools/.venv-paddle, Python 3.12)",
                    'ok' if ok else 'missing', 'installed' if ok else 'not installed', install=True, gated=True,
                    size='about 1 GB of packages from PyPI, and its models on the first run'))
    import book_status
    codes = [c for c, _ in book_status.CATALOGUE]
    got = [c for c in codes if os.path.isfile(p('data', 'projectaon', c, 'gamerulz.htm'))]
    imp = [c for c in got if os.path.isfile(p('data', 'projectaon', c, 'book.js'))]
    rows.append(row('books', 'Books', 'data/projectaon/ (git-ignored)', 'info',
                    f'{len(got)} of {len(codes)} downloaded, {len(imp)} imported: each from its row below, with your go-ahead'))
    rows.append(art_row())
    return rows


def art_row():
    """art/ is git-ignored; art/sources.json (committed) has the links its pictures can be fetched again from."""
    import art_sources
    s = art_sources.summary()
    n, lost = len(s['missing']), len(s['lost'])
    copy = f"; {lost} with no link: copy {'it' if lost == 1 else 'them'} from your old checkout" if lost else ''
    what = 'art/: your fight pictures and borrowed art (git-ignored; their links in art/sources.json)'
    if n:
        return row('art', 'Your pictures', what, 'missing', f"{s['present']} here, {n} missing that can be fetched again from their links{copy}",
                   install=True, gated=True, size=f"{n} picture{'s' if n > 1 else ''} from their links (art/sources.json)")
    if lost:
        return row('art', 'Your pictures', what, 'missing', f"{s['present']} here{copy}")
    if not s['present']:
        return row('art', 'Your pictures', what, 'missing', 'none here: copy art/ from your old checkout, or add pictures on the picture sheet')
    return row('art', 'Your pictures', what, 'ok', f"{s['present']} here: {s['linked']} with a link, {s['nolink']} with none, "
                                                   f"{len(s['unasked'])} not asked yet")


def _run(argv):
    print('$ ' + ' '.join(argv), flush=True)
    return subprocess.run(argv, cwd=ROOT).returncode


def _fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'lone-wolf-setup'})
    with urllib.request.urlopen(req, timeout=300) as r:
        return r.read()


def unpack_realesrgan(data):
    """Only the program, its DLLs and its models, from wherever the archive keeps the program; never a path
    outside tools/realesrgan. 0, or 1 if the archive has no program."""
    z = zipfile.ZipFile(io.BytesIO(data))
    names = [n for n in z.namelist() if not n.endswith('/')]
    exe = next((n for n in names if n.rsplit('/', 1)[-1] == ESRGAN_EXE), None)
    if not exe:
        print(f'the archive has no {ESRGAN_EXE}')
        return 1
    top = exe[:-len(ESRGAN_EXE)]
    dest = p('tools', 'realesrgan')
    for n in names:
        rel = n[len(top):] if n.startswith(top) else None
        if not rel or '..' in rel.split('/') or rel.startswith('/') or ':' in rel:
            continue
        if not (rel == ESRGAN_EXE or (rel.endswith('.dll') and '/' not in rel) or rel.startswith('models/')):
            continue
        out = os.path.join(dest, *rel.split('/'))
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out, 'wb') as f:
            f.write(z.read(n))
        print('wrote', 'tools/realesrgan/' + rel)
    return 0


COMMANDS = {
    'venv': lambda: [['uv', 'sync', '--project', 'tools']],  # tools/.venv at uv.lock's versions
    'npm': lambda: [[shutil.which('npm') or 'npm', 'ci']],
    'ocr': lambda: [['uv', 'venv', '--allow-existing', '--system-certs', '--python', '3.12', PADDLE],
                    # the GPU build (CUDA 12.6, this PC's RTX 2060): a map in a minute, where the CPU one took ten
                    ['uv', 'pip', 'install', '--system-certs', '--python', f'{PADDLE}/{PYEXE}', 'paddlepaddle-gpu==3.3.1',
                     '--index-url', 'https://www.paddlepaddle.org.cn/packages/stable/cu126/',
                     '--extra-index-url', 'https://pypi.org/simple', '--index-strategy', 'unsafe-best-match'],
                    ['uv', 'pip', 'install', '--system-certs', '--python', f'{PADDLE}/{PYEXE}', 'paddleocr', 'truststore']],
}


def install(part, run=_run, fetch=_fetch):
    """Install one part; the exit code."""
    if part == 'realesrgan':
        print('downloading', ESRGAN_URL, flush=True)
        return unpack_realesrgan(fetch(ESRGAN_URL))
    if part not in COMMANDS:
        print(f'{part}: not something setup installs (uv and Node are yours to install)')
        return 1
    for argv in COMMANDS[part]():
        code = run(argv)
        if code:
            return code
    return 0


def main(argv):
    if argv[:1] == ['install'] and len(argv) == 2:
        for part in (['venv', 'npm'] if argv[1] == 'all' else [argv[1]]):
            code = install(part)
            if code:
                return code
        return 0
    if argv == ['--json']:
        print(json.dumps(status()))
        return 0
    if argv:
        print(__doc__)
        return 2
    for r in status():
        print(f"{r['state']:8} {r['label']:16} {r['detail']}")
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
