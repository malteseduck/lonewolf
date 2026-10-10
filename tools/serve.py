"""Serve the player, and keep adventure backups in backups/.

    python tools/serve.py [port] [--bind ADDRESS]      (defaults: 8765, 127.0.0.1)

Static files as `python -m http.server` serves them, from the project root, plus:

    GET  /api/backups          the backups, newest first: [{name, size, made}]
    GET  /api/backups/<name>   one backup's JSON
    POST /api/backups/<name>   write a backup (JSON body, up to 5 MB)

    GET  /api/maplabels/<book>   a book's map label list, maps/<book>/labels.json (committed: the
                                 owner's work, not the book's; the scan and the pictures made from
                                 it stay in data/projectaon/<book>/, the steps' files in its work/)
    POST /api/maplabels/<book>   write it (a JSON list of {text, box, ...}); the old file is copied
                                 to labels.json.bak first (git-ignored). For tools/map-editor.html

    The map editor's steps (docs/reference/map-upscale.md). Refused with 403 unless the request comes
    from this machine (127.0.0.1 or ::1), because they run scripts, even if the server is bound to
    the LAN. <book> is an existing folder of data/projectaon:
    GET  /api/map/books               every book folder: {code, number, title, stage} (how far its map is)
    GET  /api/map/<book>/state        the map files (names starting "map" in the book's folder and its
                                      work/, named without the folder, and work/map-check-<n>/*, and
                                      maps/<book>/'s labels.json, style.txt, labels-checked.txt) with
                                      size and mtime, the Gemini rounds present, the job running, when book.js was written
    POST /api/map/<book>/run/<step>   run one step: upscale, draft, measure, erase, letter, prompt,
                                      check, finish, import. ?round=n for prompt, check, finish;
                                      ?force=1 for draft over an existing list; ?width=n for finish.
                                      One job at a time (409 if busy). Returns {code, out}
    POST /api/map/<book>/checked      mark step 3 (labels checked) done: writes maps/<book>/labels-checked.txt;
                                      ?undo=1 removes it. Drafting again removes it too
    POST /api/map/<book>/gemini/<n>   body: the round's image (png, jpeg or webp, up to 30 MB), saved
                                      as work/map-gemini-<n>.<ext>; 409 if there is one, unless ?force=1

    The import dashboard, tools/admin/ (docs/reference/dashboard.md). Local requests only, like the map's:
    GET  /api/admin/status            every book's steps: tools/book_status.py's all_status(), and the job running
    POST /api/admin/run/<stage>       start a job: a stage of ADMIN_STAGES, ?book=<code or number> for a book's.
                                      Gated stages need the JSON body {"confirm": "<code>"} ("all" for re-import
                                      all), else 428. One job at a time, shared with the map steps (409 if busy)
    GET  /api/admin/jobs              the last ten jobs; GET /api/admin/jobs/<id>?from=n: its state and lines from n
    POST /api/admin/mark/<book>/<n>   book_status.py's done (or ?undo=1) for checklist step n
    POST /api/admin/plate             the picture sheet: {book, enemy, image?: base64 WebP, crop?, levels?, remove?};
                                      the owner's picture for one enemy, saved as art/plates/<book>/<slug>.webp and
                                      written into assets/plates/plates.json (tools/plates_file.py). Or src: a picture
                                      already on disk (assets/, art/, data/) to stand in, instead of image
    GET  /api/admin/standins          every picture a fight can borrow: [{src, group, size, shows?, near?}]

    GET  /api/offline          what the offline copy holds: {version, files: {path: hash}}

A page cannot write to disk by itself; this lets the "backup" button do it without a dialog.
Names are plain file names ending in .json: no folders, so nothing outside backups/ is touched.

/api/offline is read by sw.js, which keeps a copy of every file listed so the player runs with no
connection (see docs/reference/offline.md). A file whose hash changes is fetched again; `version`
changes whenever any file does.
"""
import argparse
import hashlib
import json
import os
import posixpath
import re
import shutil
import subprocess
import threading
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKUPS = os.path.join(ROOT, 'backups')
MAX = 5 * 1024 * 1024
NAME = re.compile(r'^[^\\/:*?"<>|\x00-\x1f]{1,120}\.json$')

# What the offline copy holds: only what the player loads, never whole folders, so map work files,
# trial upscales, prototypes, docs and tools stay on the PC. It is found by following references from
# index.html, so a new file the page loads by a plain path comes along by itself: <script src> and
# <link href> (also the <script> tags data/projectaon/index.js writes), the web manifest's icons,
# static imports, fetch('a literal path') and CSS url(). Each book.js brings the images it names
# (pictures and its one map); plates.json and art/manifest.json bring the pictures they name.
OFFLINE_ENTRY = 'index.html'
# paths built at runtime, which the walk cannot see: main.js asks for `assets/icons/${name}.svg`
OFFLINE_DIRS = {'assets/icons': ('.svg',)}
BOOK_IMAGE = re.compile(r'"([\w.-]+\.(?:png|jpe?g|gif|webp))"', re.I)
HTML_TAG = re.compile(r'<(script|link)\b([^>]*)>', re.I)
HTML_ATTR = re.compile(r'\b(src|href|rel)\s*=\s*["\']([^"\']*)["\']', re.I)
LINK_RELS = {'stylesheet', 'manifest', 'apple-touch-icon'}
JS_IMPORT = re.compile(r'''\b(?:import|export)\s+(?:[\w*{}\s,$]+?\s+from\s+)?['"]([^'"`]+)['"]''')
JS_FETCH = re.compile(r'''\bfetch\(\s*['"]([^'"`]+)['"]''')
JS_SCRIPT = re.compile(r'''<script\b[^>]*\bsrc=["']([^"']+)["']''')  # document.write in data/projectaon/index.js
CSS_URL = re.compile(r'''url\(\s*['"]?([^'")]+?)['"]?\s*\)''')
BOOK_JS = re.compile(r'data/projectaon/[\w-]+/book\.js')
_hashes, _hash_lock = {}, threading.Lock()


def _hash(rel):
    """sha1 of a file, remembered while its size and time stay the same."""
    st = os.stat(os.path.join(ROOT, rel))
    key = (st.st_size, st.st_mtime_ns)
    with _hash_lock:
        got = _hashes.get(rel)
        if got and got[0] == key:
            return got[1]
    h = hashlib.sha1()
    with open(os.path.join(ROOT, rel), 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 16), b''):
            h.update(chunk)
    with _hash_lock:
        _hashes[rel] = (key, h.hexdigest()[:16])
    return _hashes[rel][1]


MAPS = os.path.join(ROOT, 'maps')
MAPS_FILES = ('labels.json', 'style.txt', 'labels-checked.txt')  # the owner's work on a map, committed


def _labels_file(book):
    """maps/<book>/labels.json for a book that is an existing folder of data/projectaon, else None."""
    if not _book_dir(book):
        return None
    return os.path.join(MAPS, book, 'labels.json')


def _labels_ok(data):
    num = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool)
    return (isinstance(data, list) and all(
        isinstance(l, dict) and isinstance(l.get('text'), str)
        and isinstance(l.get('box'), list) and len(l['box']) == 4 and all(num(v) for v in l['box'])
        for l in data))


# ---- the map editor's steps ----
MAP_MAX = 30 * 1024 * 1024
PY = ['uv', 'run', '--no-project', '--python', 'tools/.venv/Scripts/python.exe', 'python']
LOCAL = ('127.0.0.1', '::1', '::ffff:127.0.0.1')
FONTS = ['--hand', 'Cabin.ttf|SemiBold', '--caps', 'Cabin.ttf|SemiBold']
IMG_TYPES = {'image/png': ('png', b'\x89PNG'), 'image/jpeg': ('jpg', b'\xff\xd8\xff'), 'image/webp': ('webp', b'RIFF')}
_job, _job_lock = [None], threading.Lock()


def _book_dir(book):
    base = os.path.join(ROOT, 'data', 'projectaon')
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,40}', book) or not os.path.isdir(os.path.join(base, book)):
        return None
    return os.path.join(base, book)


def _work(d, make=False):
    """A book's map work folder: everything the map steps make, except map-4k.webp, which book.js
    names. map.png, the printed scan, stays beside book.js too. Kept apart so the book folder holds
    only what the importer reads and the page loads."""
    w = os.path.join(d, 'work')
    if make:
        os.makedirs(w, exist_ok=True)
    return w


def _gemini_files(d, n):
    w = _work(d)
    return [f for f in os.listdir(w) if re.fullmatch(rf'map-gemini-{n}\.(png|jpg|webp)', f)] if os.path.isdir(w) else []


def map_books():
    """Every book folder, for the editor's picker: code, number and title (from book.js's head),
    and how far its map has got."""
    base = os.path.join(ROOT, 'data', 'projectaon')
    out = []
    for e in sorted(os.scandir(base), key=lambda e: e.name):
        if not e.is_dir() or not _book_dir(e.name):
            continue
        head, num, title = '', None, None
        js = os.path.join(e.path, 'book.js')
        if os.path.isfile(js):
            with open(js, encoding='utf-8', errors='replace') as f:
                head = f.read(4096)
        if m := re.search(r'"number":\s*(\d+)', head):
            num = int(m.group(1))
        if m := re.search(r'"title":\s*"((?:[^"\\]|\\.)*)"', head):
            title = json.loads('"' + m.group(1) + '"')
        w = _work(e.path)
        has = lambda f: os.path.isfile(os.path.join(e.path, f))
        work = lambda f: os.path.isfile(os.path.join(w, f))
        # round 0 is the owner's tries from before the procedure
        rounds = [f for f in os.listdir(w) if re.fullmatch(r'map-gemini-[1-9]\d*\.(png|jpg|webp)', f)] if os.path.isdir(w) else []
        stage = ('done' if has('map-4k.webp') else 'gemini' if rounds else 'lettered' if work('map-2k-lettered.jpg')
                 else 'labels' if os.path.isfile(os.path.join(MAPS, e.name, 'labels.json')) else 'started' if work('map-2k.png')
                 else 'not started' if has('map.png') else 'no map')
        out.append({'code': e.name, 'number': num, 'title': title, 'stage': stage})
    return out


def map_state(d):
    files = {}

    def add(rel, base=d):
        st = os.stat(os.path.join(base, rel))
        files[rel] = {'size': st.st_size, 'mtime': int(st.st_mtime * 1000)}
    own = os.path.join(MAPS, os.path.basename(d))
    for f in MAPS_FILES:
        if os.path.isfile(os.path.join(own, f)):
            add(f, own)
    w = _work(d)
    # named without their folder: the editor knows map.png and map-4k.webp are in the book's, the rest in work/
    for base in (d, w) if os.path.isdir(w) else (d,):
        for e in sorted(os.scandir(base), key=lambda e: e.name):
            if e.is_file() and e.name.startswith('map'):
                add(e.name, base)
            elif e.is_dir() and re.fullmatch(r'map-check-\d+', e.name):
                for f in sorted(os.listdir(e.path)):
                    if os.path.isfile(os.path.join(e.path, f)):
                        add(f'{e.name}/{f}', base)
    rounds = sorted({int(m.group(1)) for f in (os.listdir(w) if os.path.isdir(w) else [])
                     if (m := re.fullmatch(r'map-gemini-(\d+)\.(png|jpg|webp)', f))})
    book_js = os.path.join(d, 'book.js')  # when the book was last imported
    return {'files': files, 'rounds': rounds, 'running': _job[0],
            'book': int(os.stat(book_js).st_mtime * 1000) if os.path.isfile(book_js) else None}


def _tail(text, n=300):
    return '\n'.join(text.splitlines()[-n:])


def _exec(argv, timeout):
    env = {**os.environ, 'PYTHONIOENCODING': 'utf-8', 'PYTHONUTF8': '1'}
    try:
        p = subprocess.run(argv, cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=timeout)
        return p.returncode, p.stdout.decode('utf-8', 'replace')
    except subprocess.TimeoutExpired as e:
        return -1, (e.stdout or b'').decode('utf-8', 'replace') + '\n[timed out]'
    except OSError as e:
        return -1, f'could not start: {e}'


def map_commands(step, book, q):
    """(argv lists a step runs in order, None, 0), or (None, error, http code)."""
    d = f'data/projectaon/{book}'
    full = os.path.join(ROOT, d)
    wk = f'{d}/work'  # all the steps make, but map-4k.webp
    _work(full, make=step != 'import')
    rnd = q.get('round', [''])[0]
    if step in ('prompt', 'check', 'finish'):
        if not re.fullmatch(r'\d{1,3}', rnd):
            return None, 'round must be a small integer', 400
        rnd = int(rnd)
    t = lambda name: 'tools/' + name
    labels = f'maps/{book}/labels.json'
    if step == 'upscale':
        return [PY + [t('map_upscale.py'), f'{d}/map.png', f'{wk}/map-2k.png', '--width', '2048']], None, 0
    if step == 'draft':
        own = os.path.join(MAPS, book)
        f = os.path.join(own, 'labels.json')
        if os.path.isfile(f):
            if q.get('force', [''])[0] != '1':
                return None, 'labels.json exists; draft would overwrite it (force=1 to do so)', 409
            shutil.copyfile(f, f + '.bak')
        if os.path.isfile(os.path.join(own, 'labels-checked.txt')):  # a new list is unchecked
            os.remove(os.path.join(own, 'labels-checked.txt'))
        os.makedirs(own, exist_ok=True)
        return [PY + [t('map_labels.py'), 'draft', f'{wk}/map-2k.png', labels]], None, 0
    if step == 'measure':
        return [PY + [t('map_measure.py'), f'{wk}/map-2k.png', labels]], None, 0
    if step == 'erase':
        return [PY + [t('map_erase.py'), f'{wk}/map-2k.png', labels, f'{wk}/map-2k-erased.jpg']], None, 0
    if step == 'letter':
        return [PY + [t('map_letter.py'), f'{wk}/map-2k.png', labels, f'{wk}/map-2k-erased.jpg', '-', f'{wk}/map-2k-lettered.jpg'] + FONTS], None, 0
    if step == 'prompt':
        return [PY + [t('map_labels.py'), 'prompt', labels, f'{wk}/map-prompt-{rnd}.txt', '--lettered']], None, 0
    if step in ('check', 'finish'):
        got = _gemini_files(full, rnd)
        if not got:
            return None, f'no map-gemini-{rnd} image', 404
        g = f'{wk}/{got[0]}'
        if step == 'check':
            return [PY + [t('map_check.py'), f'{wk}/map-2k.png', g, f'{wk}/map-check-{rnd}'],
                    PY + [t('map_labels.py'), 'check', labels, f'{wk}/map-check-{rnd}/aligned.png', f'{wk}/map-2k-lettered.jpg']], None, 0
        w = q.get('width', [''])[0]
        if w:
            if not re.fullmatch(r'\d{3,5}', w):
                return None, 'width must be an integer', 400
            width = int(w)
        else:
            code, out = _exec(PY + ['-c', 'import sys;from PIL import Image;print(Image.open(sys.argv[1]).size[0])', g], 120)
            try:
                width = int(out.strip().splitlines()[-1])
            except (ValueError, IndexError):
                return None, 'could not read the round image width', 500
        x4 = f'{wk}/map-gemini-{rnd}-x4.png'
        return [PY + [t('map_upscale.py'), g, x4, '--width', str(width * 4)],
                PY + [t('map_letter.py'), f'{wk}/map-2k.png', labels, x4, f'{wk}/map-check-{rnd}/H.json', f'{d}/map-4k.webp', '--sheet', f'{wk}/map-4k-sheet.png'] + FONTS], None, 0
    if step == 'import':
        return [PY + [t('import_projectaon.py'), book]], None, 0
    return None, 'unknown step', 404


def offline_list():
    def text(rel):
        try:
            with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
                return f.read()
        except OSError:
            return ''

    def as_json(rel):
        try:
            return json.loads(text(rel))
        except ValueError:
            return {}

    seen, missing, todo = set(), set(), [OFFLINE_ENTRY]

    def add(base, url):
        """Queue url as read from a file in folder base ('' for the page itself); not data:, other
        hosts, the server's api/, or a path with ${...} in it."""
        url = url.split('#', 1)[0].split('?', 1)[0].strip()
        if not url or re.match(r'^(?:[a-z][\w+.-]*:|//)', url, re.I) or '${' in url:
            return
        rel = posixpath.normpath(url.lstrip('/') if url.startswith('/') else posixpath.join(base, url))
        if not rel.startswith('..') and not rel.startswith('api/'):
            todo.append(rel)

    while todo:
        rel = todo.pop()
        if rel in seen:
            continue
        seen.add(rel)
        if not os.path.isfile(os.path.join(ROOT, rel)):
            missing.add(rel)
            continue
        here, ext = posixpath.dirname(rel), os.path.splitext(rel)[1].lower()
        if ext not in ('.html', '.js', '.css', '.json', '.webmanifest'):
            continue
        t = text(rel)
        if ext == '.html':
            for tag, attrs in HTML_TAG.findall(t):
                a = {k.lower(): v for k, v in HTML_ATTR.findall(attrs)}
                if tag.lower() == 'script' and a.get('src'):
                    add(here, a['src'])
                elif tag.lower() == 'link' and a.get('href') and LINK_RELS & set(a.get('rel', '').lower().split()):
                    add(here, a['href'])
        elif BOOK_JS.fullmatch(rel):  # too big and too wordy to read for imports
            for name in set(BOOK_IMAGE.findall(t)):
                add(here, name)
        elif ext == '.js':
            for u in JS_IMPORT.findall(t):  # an import is relative to its module...
                add(here, u)
            for u in JS_FETCH.findall(t) + JS_SCRIPT.findall(t):  # ...a fetch or a written tag to the page
                add('', u)
        elif ext == '.css':
            for u in CSS_URL.findall(t):
                add(here, u)
        elif ext == '.webmanifest':
            for icon in as_json(rel).get('icons', []):
                add(here, icon.get('src', ''))
        elif rel == 'assets/plates/plates.json':
            for p in as_json(rel).get('plates', []):
                add('', p.get('src', ''))
        elif rel == 'art/manifest.json':
            art = as_json(rel)
            hero, portrait = art.get('hero'), art.get('portrait')
            for s in [*(art.get('enemies') or {}).values(), hero.get('src') if isinstance(hero, dict) else hero,
                      portrait.get('src') if isinstance(portrait, dict) else portrait]:
                if s:
                    add('art', s)
    for top, exts in OFFLINE_DIRS.items():
        if os.path.isdir(os.path.join(ROOT, top)):
            seen.update(f'{top}/{e.name}' for e in os.scandir(os.path.join(ROOT, top))
                        if e.is_file() and e.name.lower().endswith(exts))
    files = {r: _hash(r) for r in sorted(seen - missing)}
    version = hashlib.sha1(json.dumps(files, sort_keys=True).encode()).hexdigest()[:16]
    # missing: named by something the page loads but not on disk (tools/offline_check.py reports it;
    # sw.js reads only version and files)
    return {'version': version, 'files': files, 'missing': sorted(missing)}


# ---- the import dashboard (tools/admin/, docs/reference/dashboard.md) ----
# Every job it can start, and nothing else: the command is built here from the stage and a book code
# from book_status.CATALOGUE, never from the request. gated: the page must send {"confirm": <code>}
# (or "all"), after asking the owner: downloads, and any import, which rewrites book.js.
ADMIN_STAGES = {
    'fetch': {'title': 'Download', 'gated': True, 'timeout': 1800, 'cmds': lambda c: [PY + ['tools/fetch_projectaon.py', c]]},
    'fetch-rules': {'title': 'Fetch rules pages', 'gated': True, 'timeout': 600, 'cmds': lambda c: [PY + ['tools/fetch_projectaon.py', c, '--rules']]},
    'import': {'title': 'Import', 'gated': True, 'timeout': 900, 'known': True, 'cmds': lambda c: [PY + ['tools/import_projectaon.py', c]]},
    'reading': {'title': 'Reading copy', 'folder': True, 'timeout': 600, 'cmds': lambda c: [PY + ['tools/reading_copy.py', c], PY + ['tools/item_sections.py', c]]},
    'check-items': {'title': 'Check items', 'folder': True, 'timeout': 300, 'cmds': lambda c: [['node', 'tools/check_items.mjs', c, '--json']]},
    'offline': {'title': 'Offline check', 'book': False, 'timeout': 300, 'cmds': lambda c: [PY + ['tools/offline_check.py']]},
    'syntax': {'title': 'Syntax check', 'book': False, 'timeout': 600, 'cmds': lambda c: [PY + ['tools/syntax_check.py']]},
    'reimport-all': {'title': 'Re-import all and compare', 'book': False, 'gated': True, 'timeout': 3600, 'cmds': lambda c: [PY + ['tools/reimport_all.py']]},
}
_jobs, _jobs_lock, _job_seq = {}, threading.Lock(), [0]
JOB_LINES = 20000


def _admin_job(job, cmds, timeout):
    """Run a job's commands one after another, keeping their output line by line. Holds _job_lock,
    which the caller took, so the map editor's steps wait for it and it for them."""
    env = {**os.environ, 'PYTHONIOENCODING': 'utf-8', 'PYTHONUTF8': '1'}
    try:
        for argv in cmds:
            job['lines'].append('$ ' + ' '.join(argv))
            try:
                p = subprocess.Popen(argv, cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
            except OSError as e:
                job['lines'].append(f'could not start: {e}')
                job['code'] = -1
                break
            timed = []
            timer = threading.Timer(timeout, lambda: (timed.append(1), p.kill()))
            timer.start()
            for raw in p.stdout:
                if len(job['lines']) < JOB_LINES:
                    job['lines'].append(raw.decode('utf-8', 'replace').rstrip('\r\n'))
            p.wait()
            timer.cancel()
            job['code'] = p.returncode
            if p.returncode:
                job['lines'].append(f'[exit {p.returncode}]' + (' (timed out)' if timed else ''))
                break
        job['state'] = 'done' if job['code'] == 0 else 'failed'
    except Exception as e:  # noqa: BLE001 - whatever happens, the lock must be let go
        job['lines'].append(f'[error] {e}')
        job['state'] = 'failed'
    finally:
        job['ended'] = int(time.time() * 1000)
        _job[0] = None
        _job_lock.release()


def admin_start(stage, book, confirm):
    """(job, None, 0) or (None, error, http code)."""
    import book_status
    spec = ADMIN_STAGES.get(stage)
    if not spec:
        return None, 'unknown stage', 404
    code = ''
    if spec.get('book', True):
        hit = book_status.find(book or '')
        if not hit:
            return None, 'not a book in the catalogue', 404
        code = hit[0]
        if spec.get('folder') and not os.path.isdir(os.path.join(ROOT, 'data', 'projectaon', code)):
            return None, 'that book is not downloaded', 409
        if spec.get('known') and code not in book_status.importer_books():
            return None, 'the importer does not know that book', 409
    if spec.get('gated') and confirm != (code or 'all'):
        return None, 'this step needs the owner\'s confirmation', 428
    if not _job_lock.acquire(blocking=False):
        return None, f'busy: {_job[0]} is running', 409
    with _jobs_lock:
        _job_seq[0] += 1
        job = {'id': _job_seq[0], 'stage': stage, 'book': code, 'title': (code + ': ' if code else '') + spec['title'],
               'state': 'running', 'code': None, 'lines': [], 'started': int(time.time() * 1000), 'ended': None}
        _jobs[job['id']] = job
        for old in sorted(_jobs)[:-10]:  # the last ten are kept, in memory only
            del _jobs[old]
    _job[0] = job['title']
    threading.Thread(target=_admin_job, args=(job, spec['cmds'](code), spec['timeout']), daemon=True).start()
    return job, None, 0


def _job_view(job, start=0):
    return {k: v for k, v in job.items() if k != 'lines'} | {'from': start, 'lines': job['lines'][start:], 'total': len(job['lines'])}


class Handler(SimpleHTTPRequestHandler):
    # HTTP/1.0 closes the connection after each file, and on Windows that close cut files over about
    # 510 KB short whenever the browser had asked to keep the connection (the "reset on first load")
    protocol_version = 'HTTP/1.1'
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.webmanifest': 'application/manifest+json',
                      '.woff2': 'font/woff2', '.js': 'text/javascript', '.mjs': 'text/javascript'}

    def end_headers(self):
        # browsers check every file is current (a cheap 304 when it is): without this they keep a
        # changed main.js for a while on a guess. The offline copy (sw.js) does its own keeping.
        if not self.path.startswith('/api/'):
            self.send_header('Cache-Control', 'no-cache')
        super().end_headers()
    def _json(self, code, body):
        data = json.dumps(body).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(data)

    def _name(self):
        """The backup a /api/backups/<name> path names, or None if it is not a safe plain name."""
        name = unquote(self.path.split('?', 1)[0][len('/api/backups/'):])
        return name if NAME.match(name) and not name.startswith('.') else None

    def _map_api(self, method):
        """/api/map/<book>/...: state, run/<step>, gemini/<n>. Local requests only."""
        if self.client_address[0] not in LOCAL:
            self.close_connection = True
            return self._json(403, {'error': 'the map editor runs from this machine only'})
        route, _, query = self.path.partition('?')
        q = parse_qs(query)
        parts = [unquote(p) for p in route[len('/api/map/'):].split('/')]
        if method == 'GET' and parts == ['books']:
            return self._json(200, map_books())
        d = _book_dir(parts[0])
        if not d:
            self.close_connection = True
            return self._json(404, {'error': 'not a book folder'})
        if method == 'GET' and parts[1:] == ['state']:
            return self._json(200, map_state(d))
        if method == 'POST' and len(parts) == 3 and parts[1] == 'run':
            return self._map_run(parts[0], parts[2], q)
        if method == 'POST' and parts[1:] == ['checked']:
            os.makedirs(os.path.join(MAPS, parts[0]), exist_ok=True)
            f = os.path.join(MAPS, parts[0], 'labels-checked.txt')
            if q.get('undo', [''])[0] == '1':
                if os.path.isfile(f):
                    os.remove(f)
            else:
                with open(f, 'w', encoding='utf-8') as fh:
                    fh.write(time.strftime('%Y-%m-%d %H:%M\n'))
            return self._json(200, map_state(d))
        if method == 'POST' and len(parts) == 3 and parts[1] == 'gemini' and re.fullmatch(r'\d{1,3}', parts[2]):
            return self._map_upload(d, int(parts[2]), q)
        self.close_connection = True
        return self._json(404, {'error': 'nothing here'})

    def _admin_api(self, method):
        """/api/admin/...: status, run/<stage>, jobs, jobs/<id>, mark/<book>/<step>. Local requests only."""
        if self.client_address[0] not in LOCAL:
            self.close_connection = True
            return self._json(403, {'error': 'the dashboard runs from this machine only'})
        import book_status
        route, _, query = self.path.partition('?')
        q = parse_qs(query)
        parts = [unquote(p) for p in route[len('/api/admin/'):].split('/') if p]
        body = {}
        if method == 'POST':
            size = int(self.headers.get('Content-Length') or 0)
            if size > (25 * 1024 * 1024 if parts == ['plate'] else 64 * 1024):  # a plate carries a picture
                self.close_connection = True
                return self._json(413, {'error': 'too large'})
            try:
                body = json.loads(self.rfile.read(size).decode('utf-8') or '{}') if size else {}
            except ValueError:
                return self._json(400, {'error': 'not JSON'})
            body = body if isinstance(body, dict) else {}
        if method == 'GET' and parts == ['status']:
            st = book_status.all_status()
            st['running'] = _job[0]
            return self._json(200, st)
        if method == 'GET' and parts == ['jobs']:
            with _jobs_lock:
                return self._json(200, [_job_view(j, len(j['lines'])) for j in sorted(_jobs.values(), key=lambda j: -j['id'])])
        if method == 'GET' and len(parts) == 2 and parts[0] == 'jobs' and parts[1].isdigit():
            job = _jobs.get(int(parts[1]))
            if not job:
                return self._json(404, {'error': 'no such job (the server keeps the last ten, until it restarts)'})
            start = q.get('from', ['0'])[0]
            return self._json(200, _job_view(job, int(start) if start.isdigit() else 0))
        if method == 'POST' and len(parts) == 2 and parts[0] == 'run':
            job, err, code = admin_start(parts[1], q.get('book', [''])[0], body.get('confirm'))
            if err:
                return self._json(code, {'error': err})
            return self._json(200, _job_view(job))
        if method == 'GET' and parts == ['standins']:
            import plates_file
            return self._json(200, plates_file.standins())
        if method == 'POST' and parts == ['plate']:
            return self._admin_plate(body)
        if method == 'POST' and len(parts) == 3 and parts[0] == 'mark' and parts[2].isdigit():
            ok, msg = book_status.mark(parts[1], int(parts[2]), undo=q.get('undo', [''])[0] == '1', run_checks=False)
            return self._json(200 if ok else 409, {'ok': ok, 'message': msg})
        return self._json(404, {'error': 'nothing here'})

    def _admin_plate(self, body):
        """The picture sheet's drop and adjust: the owner's own picture (or crop) for one enemy, written
        to plates.json by tools/plates_file.py. Body: {book, enemy, image?: base64 WebP, crop?, levels?,
        remove?}. The file name is made from the enemy's name, never taken from the request."""
        import base64
        import binascii
        import book_status
        import plates_file
        hit = book_status.find(str(body.get('book') or ''))
        if not hit or not os.path.isfile(os.path.join(ROOT, 'data', 'projectaon', hit[0], 'book.js')):
            return self._json(404, {'error': 'not an imported book'})
        try:
            image = base64.b64decode(body['image'], validate=True) if body.get('image') else None
            entry, msg = plates_file.put(hit[0], book_status.load_book(hit[0]), str(body.get('enemy') or ''), image=image,
                                         crop=body.get('crop'), levels=body.get('levels'), remove=bool(body.get('remove')),
                                         src=body.get('src'))
        except (ValueError, binascii.Error) as e:
            return self._json(400, {'error': str(e)})
        return self._json(200, {'entry': entry, 'message': msg})

    def _map_run(self, book, step, q):
        cmds, err, code = map_commands(step, book, q)
        if err:
            return self._json(code, {'error': err})
        if not _job_lock.acquire(blocking=False):
            return self._json(409, {'error': f'busy: {_job[0]} is running'})
        try:
            _job[0] = f'{book} {step}'
            out, rc = '', 0
            for argv in cmds:
                rc, o = _exec(argv, 15 * 60)
                out += o
                if rc:
                    break
            if step == 'letter' and not rc:  # the list the lettered picture was made from, so the
                d = _book_dir(book)          # editor can tell which later edits matter to it
                shutil.copyfile(os.path.join(MAPS, book, 'labels.json'), os.path.join(_work(d, True), 'map-labels-lettered.json'))
            self._json(200, {'code': rc, 'out': _tail(out)})
        finally:
            _job[0] = None
            _job_lock.release()

    def _map_upload(self, d, n, q):
        kind = IMG_TYPES.get((self.headers.get('Content-Type') or '').split(';')[0].strip().lower())
        size = int(self.headers.get('Content-Length') or 0)
        have = _gemini_files(d, n)
        err = None
        if not kind:
            err = (400, 'Content-Type must be image/png, image/jpeg or image/webp')
        elif not 0 < size <= MAP_MAX:
            err = (413, 'empty or over 30 MB')
        elif have and q.get('force', [''])[0] != '1':
            err = (409, f'map-gemini-{n} exists')
        if err:
            if 0 < size <= MAP_MAX:
                self.rfile.read(size)  # unread, the close would reset the connection before the answer arrives
            else:
                self.close_connection = True
            return self._json(err[0], {'error': err[1], 'have': have})
        body = self.rfile.read(size)
        if not body.startswith(kind[1]):
            return self._json(400, {'error': 'the bytes are not that image type'})
        name = f'map-gemini-{n}.{kind[0]}'
        w = _work(d, True)
        tmp = os.path.join(w, name + '.part')
        with open(tmp, 'wb') as f:
            f.write(body)
        for f in have:
            os.remove(os.path.join(w, f))
        os.replace(tmp, os.path.join(w, name))
        self._json(200, {'saved': name, 'size': size})

    def do_GET(self):
        path = self.path.split('?', 1)[0]
        if path.startswith('/api/map/'):
            return self._map_api('GET')
        if path.startswith('/api/admin/'):
            return self._admin_api('GET')
        if path == '/api/offline':
            return self._json(200, offline_list())
        if path in ('/api/backups', '/api/backups/'):
            os.makedirs(BACKUPS, exist_ok=True)
            files = [e for e in os.scandir(BACKUPS) if e.is_file() and NAME.match(e.name)]
            files.sort(key=lambda e: e.stat().st_mtime, reverse=True)
            return self._json(200, [{'name': e.name, 'size': e.stat().st_size, 'made': int(e.stat().st_mtime * 1000)} for e in files])
        if path.startswith('/api/maplabels/'):
            file = _labels_file(unquote(path[len('/api/maplabels/'):]))
            if not file or not os.path.isfile(file):
                return self._json(404, {'error': 'no label file for that book'})
            with open(file, 'rb') as f:
                data = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(data)
            return
        if path.startswith('/api/backups/'):
            name = self._name()
            file = name and os.path.join(BACKUPS, name)
            if not file or not os.path.isfile(file):
                return self._json(404, {'error': 'no such backup'})
            with open(file, encoding='utf-8') as f:
                text = f.read()
            data = text.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(data)
            return
        super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/map/'):
            return self._map_api('POST')
        if self.path.startswith('/api/admin/'):
            return self._admin_api('POST')
        if self.path.split('?', 1)[0].startswith('/api/maplabels/'):
            return self._post_labels()
        if not self.path.startswith('/api/backups/'):
            return self._json(404, {'error': 'nothing here'})
        name = self._name()
        if not name:
            return self._json(400, {'error': 'not a backup file name'})
        size = int(self.headers.get('Content-Length') or 0)
        if not 0 < size <= MAX:
            return self._json(413, {'error': 'empty or too large'})
        body = self.rfile.read(size)
        try:
            json.loads(body.decode('utf-8'))
        except ValueError:
            return self._json(400, {'error': 'not JSON'})
        os.makedirs(BACKUPS, exist_ok=True)
        tmp = os.path.join(BACKUPS, '.' + name + '.part')
        with open(tmp, 'wb') as f:
            f.write(body)
        os.replace(tmp, os.path.join(BACKUPS, name))  # whole or not at all
        self._json(200, {'saved': 'backups/' + name})


    def _post_labels(self):
        file = _labels_file(unquote(self.path.split('?', 1)[0][len('/api/maplabels/'):]))
        if not file:
            return self._json(400, {'error': 'not a book folder'})
        size = int(self.headers.get('Content-Length') or 0)
        if not 0 < size <= MAX:
            return self._json(413, {'error': 'empty or too large'})
        body = self.rfile.read(size)
        try:
            data = json.loads(body.decode('utf-8'))
        except ValueError:
            return self._json(400, {'error': 'not JSON'})
        if not _labels_ok(data):
            return self._json(400, {'error': 'expected a list of objects with text (string) and box (4 numbers)'})
        if os.path.isfile(file):
            shutil.copyfile(file, file + '.bak')
        os.makedirs(os.path.dirname(file), exist_ok=True)
        tmp = file + '.part'
        with open(tmp, 'w', encoding='utf-8') as f:
            f.write(json.dumps(data, indent=1))  # as map_labels.py writes it
        os.replace(tmp, file)
        self._json(200, {'saved': len(data)})


def main():
    p = argparse.ArgumentParser(description='Serve the Lone Wolf player and keep its backups.')
    p.add_argument('port', nargs='?', type=int, default=8765)
    p.add_argument('--bind', default='127.0.0.1')
    a = p.parse_args()
    # the default queue of 5 waiting connections overflows when a page (or the offline copy) asks for
    # many files at once, and Windows answers the overflow with a reset
    ThreadingHTTPServer.request_queue_size = 128
    server = ThreadingHTTPServer((a.bind, a.port), partial(Handler, directory=ROOT))
    print(f'Serving {ROOT} on http://{a.bind}:{a.port}/ (backups in {BACKUPS})', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
