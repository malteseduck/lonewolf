"""Serve the player, and keep adventure backups in backups/.

    python tools/serve.py [port] [--bind ADDRESS]      (defaults: 8766, 127.0.0.1)
    python tools/serve.py --release [--bind ADDRESS]   the last release, for the iPad, on 8765 (below)

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
                                      maps/<book>/'s labels.json, style.txt, labels-checked.txt, font.txt) with
                                      size and mtime, the Gemini rounds present, the job running, when book.js was written
    POST /api/map/<book>/run/<step>   run one step: upscale, draft, retype, missed, names, measure, erase, letter, prompt,
                                      check, finish, import. ?round=n for prompt, check, finish;
                                      ?force=1 for draft over an existing list; ?width=n for finish;
                                      ?all=1 for finish to set every place name again when none is ticked reset.
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
    GET  /api/admin/setup             what the tools need and have: tools/setup.py's status() (setup-<part> stages install)
    GET  /api/admin/jobs              the last ten jobs; GET /api/admin/jobs/<id>?from=n: its state and lines from n
    POST /api/admin/mark/<book>/<n>   book_status.py's done (or ?undo=1) for checklist step n
    POST /api/admin/plate             the picture sheet: {book, enemy, image?: base64 WebP, link?, crop?, levels?, flip?, remove?};
                                      the owner's picture for one enemy, saved as art/plates/<book>/<slug>.webp and
                                      written into assets/plates/plates.json (tools/plates_file.py). Or src: a picture
                                      already on disk (assets/, art/, data/) to stand in, instead of image
    POST /api/admin/hero              {name: frontis|likeness, data: base64 WebP}: Lone Wolf's picture, baked by
                                      tools/admin/hero.html, written to assets/hero/<name>.webp
    POST /api/admin/proposals         {book, enemy, how: chosen|kept|null, src?}: the owner's decision on one row of the
                                      proposal sheet; /proposals/finish {book} ends the round (tools/plates_proposals.py)
    POST /api/admin/picture-url      {url}: the picture at an address (or the one its page names), {type, data: base64}
    POST /api/admin/art-link          {src, url|null}: a link for a picture already in art/ (art/sources.json, ADR 0038)
    GET  /api/admin/standins          every picture a fight can borrow: [{src, group, size, shows?, near?}]
    GET  /api/admin/ills?book=<code>  the illustration sheet: [{name, bytes, big, bigBytes, sections}] (tools/ill_upscale.py)
    GET  /api/admin/icons             the item sheet: {local: [{name, author}], tables: [code]}: the icons in assets/icons/, the item tables
    GET  /api/admin/icons/remote      every icon at game-icons.net: {fetched, paths: ['author/name']}; ?refresh=1 asks again
    GET  /api/admin/icons/preview?path=<author/name>   one of them, as SVG (kept in data/reference/game-icons/)
    POST /api/admin/item-glyph        {item, glyph} or {item, remote: 'author/name'} (fetched into assets/icons/ and
                                      credited): the item's glyph rewritten in its table or itemglyphs.js. {file, glyph, was}
    POST /api/admin/ui-glyph          {list, key, glyph} or {list, key, remote}: the icon sheet's change to one of the
                                      player's own glyphs (DISC_GLYPH, UI_GLYPH, KIND_GLYPH in glyphs.js). {file, glyph, was}

    GET  /api/offline          what the offline copy holds: {version, files: {path: hash}}

A page cannot write to disk by itself; this lets the "backup" button do it without a dialog.
Names are plain file names ending in .json: no folders, so nothing outside backups/ is touched.

/api/offline is read by sw.js, which keeps a copy of every file listed so the player runs with no
connection (see docs/reference/offline.md). A file whose hash changes is fetched again; `version`
changes whenever any file does.

--release serves release/ (tools/release.py) instead of the working copy, so the iPad gets only what
was released: the files of the folder release/CURRENT names, read at each request (a new release
takes over without a restart), and the backups API. The map and admin APIs are not there.
"""
import argparse
import hashlib
import json
import os
import posixpath
import re
import shutil
import subprocess
import sys
import threading
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKUPS = os.path.join(ROOT, 'backups')
MAX = 5 * 1024 * 1024
NAME = re.compile(r'^[^\\/:*?"<>|\x00-\x1f]{1,120}\.json\Z')  # \Z: $ would let a trailing newline through

# What the offline copy holds: only what the player loads, never whole folders, so map work files,
# trial upscales, prototypes, docs and tools stay on the PC. It is found by following references from
# index.html, so a new file the page loads by a plain path comes along by itself: <script src> and
# <link href> (also the <script> tags data/projectaon/index.js writes), the web manifest's icons,
# static imports, fetch('a literal path') and CSS url(). Each book.js brings the images it names
# (pictures and its one map); plates.json, art/manifest.json and assets/plates/approved/*.json bring the
# pictures they name.
OFFLINE_ENTRY = 'index.html'
DEMO_BOOKS = ('99ember',)  # book_status.DEMO: not in the offline copy or the release
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


def _hash(rel, root=ROOT):
    """sha1 of a file, remembered while its size and time stay the same."""
    full = os.path.join(root, rel)
    st = os.stat(full)
    key = (st.st_size, st.st_mtime_ns)
    with _hash_lock:
        got = _hashes.get(full)
        if got and got[0] == key:
            return got[1]
    h = hashlib.sha1()
    with open(full, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 16), b''):
            h.update(chunk)
    with _hash_lock:
        _hashes[full] = (key, h.hexdigest()[:16])
    return _hashes[full][1]


MAPS = os.path.join(ROOT, 'maps')
MAPS_FILES = ('labels.json', 'style.txt', 'labels-checked.txt', 'font.txt')  # the owner's work on a map, committed


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
PY = ['uv', 'run', '--project', 'tools', 'python']
LOCAL = ('127.0.0.1', '::1', '::ffff:127.0.0.1')
HERO_PICTURES = ('frontis', 'likeness')  # the only files POST /api/admin/hero writes, in assets/hero/
FONTS = ['--hand', 'Cabin.ttf|SemiBold', '--caps', 'Cabin.ttf|SemiBold']


def _fonts(book):
    """map_letter.py's font arguments: the file in tools/fonts that maps/<book>/font.txt names,
    honoured for every map that has one (ADR 0004); else Cabin."""
    try:
        with open(os.path.join(MAPS, book, 'font.txt'), encoding='utf-8') as fh:
            name = fh.readline().strip()
    except OSError:
        return FONTS
    if not re.fullmatch(r'[\w.-]+\.(ttf|otf)(\|\w+)?', name) or not os.path.isfile(
            os.path.join(ROOT, 'tools', 'fonts', name.partition('|')[0])):
        return FONTS
    return ['--hand', name, '--caps', name]
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
    style = os.path.join(own, 'style.txt')  # map_labels.py style's draft, until its first line is deleted
    draft = False
    if os.path.isfile(style):
        with open(style, encoding='utf-8') as f:
            draft = f.readline().startswith('# DRAFT')
    return {'files': files, 'rounds': rounds, 'running': _job[0], 'styleDraft': draft,
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
    if step == 'retype':  # step 3's Untick captions (D8): unticks what is surely not a place name
        if not os.path.isfile(os.path.join(MAPS, book, 'labels.json')):
            return None, 'no labels.json yet', 404
        return [PY + [t('map_labels.py'), 'retype', labels]], None, 0
    if step == 'missed':  # step 3's Find missed labels: Claude Sonnet looks for names outside the boxes (ADR 0004)
        if not os.path.isfile(os.path.join(MAPS, book, 'labels.json')):
            return None, 'no labels.json yet', 404
        return [PY + [t('map_missed.py'), f'{wk}/map-2k.png', labels]], None, 0
    if step == 'names':  # step 3's Check names: each wording against the books' own text (map_names.py)
        if not os.path.isfile(os.path.join(MAPS, book, 'labels.json')):
            return None, 'no labels.json yet', 404
        return [PY + [t('map_names.py'), labels, f'{wk}/map-names.json']], None, 0
    if step == 'measure':
        return [PY + [t('map_measure.py'), f'{wk}/map-2k.png', labels]], None, 0
    if step == 'erase':
        return [PY + [t('map_erase.py'), f'{wk}/map-2k.png', labels, f'{wk}/map-2k-erased.jpg']], None, 0
    if step == 'letter':
        return [PY + [t('map_letter.py'), f'{wk}/map-2k.png', labels, f'{wk}/map-2k-erased.jpg', '-', f'{wk}/map-2k-lettered.jpg'] + _fonts(book)], None, 0
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
                PY + [t('map_letter.py'), f'{wk}/map-2k.png', labels, x4, f'{wk}/map-check-{rnd}/H.json', f'{d}/map-4k.webp', '--sheet', f'{wk}/map-4k-sheet.png'] + _fonts(book)
                + (['--all'] if q.get('all', [''])[0] == '1' else [])], None, 0
    if step == 'import':
        return [PY + [t('import_projectaon.py'), book]], None, 0
    return None, 'unknown step', 404


def offline_list(root=ROOT, fill=None):
    """The files under root the page loads. fill(rel), if given, may put a file not under root
    there and return True (tools/release.py brings the git-ignored books and art that way)."""
    def text(rel):
        try:
            with open(os.path.join(root, rel), encoding='utf-8') as f:
                return f.read()
        except OSError:
            return ''

    def as_json(rel):
        try:
            return json.loads(text(rel))
        except ValueError:
            return {}

    seen, missing, todo = set(), set(), [OFFLINE_ENTRY]
    # main.js asks for assets/plates/approved/${book}.json, a path the walk cannot see
    # and assets/plates/upscaled/${book}.json, the same way
    for sub in ('approved', 'upscaled'):
        pins = os.path.join(root, 'assets', 'plates', sub)
        if os.path.isdir(pins):
            todo += [f'assets/plates/{sub}/{e.name}' for e in os.scandir(pins) if e.is_file() and e.name.endswith('.json')]

    def add(base, url):
        """Queue url as read from a file in folder base ('' for the page itself); not data:, other
        hosts, the server's api/, or a path with ${...} in it."""
        url = url.split('#', 1)[0].split('?', 1)[0].strip()
        if not url or re.match(r'^(?:[a-z][\w+.-]*:|//)', url, re.I) or '${' in url:
            return
        rel = posixpath.normpath(url.lstrip('/') if url.startswith('/') else posixpath.join(base, url))
        # the made-up demo book is for the PC alone (ruling R20): index.js names it, the iPad never gets it
        if not rel.startswith('..') and not rel.startswith('api/') and not any(rel.startswith(f'data/projectaon/{c}/') for c in DEMO_BOOKS):
            todo.append(rel)

    while todo:
        rel = todo.pop()
        if rel in seen:
            continue
        seen.add(rel)
        if not os.path.isfile(os.path.join(root, rel)) and not (fill and fill(rel)):
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
        elif rel.startswith('assets/plates/approved/'):  # the approved pictures, which plates.json may no longer name
            for pin in as_json(rel).get('pins', {}).values():
                if (pin or {}).get('plate'):
                    add('', pin['plate'].get('src', ''))
        elif rel.startswith('assets/plates/upscaled/'):  # fight pictures shown from their 2x copy (ADR 0031)
            for src in as_json(rel).get('srcs', []):
                add('', posixpath.splitext(src)[0] + '-2x.webp')
        elif rel == 'art/manifest.json':
            art = as_json(rel)
            hero, portrait = art.get('hero'), art.get('portrait')
            for s in [*(art.get('enemies') or {}).values(), hero.get('src') if isinstance(hero, dict) else hero,
                      portrait.get('src') if isinstance(portrait, dict) else portrait]:
                if s:
                    add('art', s)
    for top, exts in OFFLINE_DIRS.items():
        if os.path.isdir(os.path.join(root, top)):
            seen.update(f'{top}/{e.name}' for e in os.scandir(os.path.join(root, top))
                        if e.is_file() and e.name.lower().endswith(exts))
    files = {r: _hash(r, root) for r in sorted(seen - missing)}
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
    # D7 (ADR 0036): a downloaded book the importer does not know gets its BOOKS entry from the catalogue; imports nothing
    'add-book': {'title': 'Add to importer', 'folder': True, 'timeout': 60, 'cmds': lambda c: [PY + ['tools/add_book.py', c]]},
    'import': {'title': 'Import', 'gated': True, 'timeout': 900, 'known': True, 'cmds': lambda c: [PY + ['tools/import_projectaon.py', c]]},
    'reading': {'title': 'Reading copy', 'folder': True, 'timeout': 600, 'cmds': lambda c: [PY + ['tools/reading_copy.py', c], PY + ['tools/item_sections.py', c]]},
    # step 5's draft (ADR 0036): written to items/ only where there is no table yet, else beside the book
    'items-draft': {'title': 'Draft item table', 'folder': True, 'timeout': 300, 'cmds': lambda c: [['node', 'tools/items_draft.mjs', c]]},
    'check-items': {'title': 'Check items', 'folder': True, 'timeout': 300, 'cmds': lambda c: [['node', 'tools/check_items.mjs', c, '--json']]},
    # the fight pictures that now differ from those approved at step 7 become the approved ones (the owner's go-ahead)
    'approve-pictures': {'title': 'Approve fight pictures', 'folder': True, 'gated': True, 'timeout': 120, 'cmds': lambda c: [['node', 'tools/plates_pin.mjs', c, '--approve']]},
    # step 6's walk (ADR 0036): the engine over every section in Node, writes only walk.json beside the book
    'walk': {'title': 'Walk the book', 'folder': True, 'timeout': 300, 'cmds': lambda c: [['node', 'tools/walk_book.mjs', c, '--json']]},
    # step 4's diff (ADR 0036): reads the rules pages, writes only rules-diff.json, .txt and rules-draft.md beside the book
    'rules-diff': {'title': 'Diff rules', 'folder': True, 'timeout': 120, 'cmds': lambda c: [PY + ['tools/rules_diff.py', c, '--json']]},
    # the map's style draft (D8, ADR 0036): title and key from the label list, into maps/<code>/style.txt, never over the book's own
    'map-style': {'title': 'Draft map style', 'folder': True, 'timeout': 60, 'cmds': lambda c: [PY + ['tools/map_labels.py', 'style', f'maps/{c}/labels.json']]},
    # step 3's scan (ADR 0036): reads book.js, writes only phrasings.json beside it
    'phrasings-scan': {'title': 'Scan phrasings', 'folder': True, 'timeout': 120, 'cmds': lambda c: [PY + ['tools/phrasings_scan.py', c, '--json']]},
    # Real-ESRGAN on the PC: fetches nothing, writes only <name>-2x.webp beside each original (ADR 0031)
    # every picture the book's fights can show, the same way; listed in assets/plates/upscaled/<code>.json
    # step 7's draft (ADRs 0008, 0036): the index afresh, then a picture for each enemy with none, entered in plates.json
    'pictures-draft': {'title': 'Draft fight pictures', 'folder': True, 'timeout': 300, 'cmds': lambda c: [PY + ['tools/ill_index.py'], PY + ['tools/plates_draft.py', c]]},
    'fights-up': {'title': 'Upscale fight pictures', 'folder': True, 'timeout': 3600, 'cmds': lambda c: [PY + ['tools/ill_upscale.py', '--fights', c]]},
    'ills': {'title': 'Upscale illustrations', 'folder': True, 'timeout': 3600, 'cmds': lambda c: [PY + ['tools/ill_upscale.py', c]]},
    # the real books through every script, then both unit-test suites (ADR 0022: re-importing here needs no go-ahead)
    'check': {'title': 'Check everything', 'book': False, 'timeout': 3600, 'cmds': lambda c: [PY + ['tools/check_all.py']]},
    # the last commit to the iPad (the release server, docs/reference/offline.md); gated: the owner's go-ahead.
    # The offline check first: its sizes in the log, and nothing released if the page names a missing file.
    # Then main goes to GitHub (ruling R25), only once the release has gone well
    'release': {'title': 'Release to the iPad', 'book': False, 'gated': True, 'timeout': 600,
                'cmds': lambda c: [PY + ['tools/offline_check.py'], PY + ['tools/release.py'], ['git', 'push', 'origin', 'main']]},
}
# Setup (ADR 0036): tools/setup.py installs a part. Not through PY: tools/.venv may not exist yet.
# realesrgan and ocr download files, so they are gated.
for _part, _title, _gated in (('venv', 'Install Python packages', False), ('npm', 'Install npm packages', False),
                              ('realesrgan', 'Download Real-ESRGAN', True), ('ocr', 'Install the map OCR', True)):
    ADMIN_STAGES['setup-' + _part] = {'title': _title, 'book': False, 'gated': _gated, 'timeout': 3600,
                                      'cmds': lambda c, part=_part: [['uv', 'run', '--no-project', 'python', 'tools/setup.py', 'install', part]]}
# the pictures of art/ missing here, fetched again from their links in art/sources.json (ADR 0038): a download.
# Through PY: it converts with Pillow, and Setup offers it only once the Python packages are in.
ADMIN_STAGES['setup-art'] = {'title': 'Fetch your pictures', 'book': False, 'gated': True, 'timeout': 1800,
                             'cmds': lambda c: [PY + ['tools/art_sources.py', 'fetch']]}
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
        if code in book_status.DEMO and stage in ('fetch', 'fetch-rules'):
            return None, 'the demo book is made up: nothing to download', 409
        if spec.get('known') and code not in book_status.importer_books(demo=True):
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


RELEASES = os.path.join(ROOT, 'release')
RELEASE = False  # --release


def release_dir():
    """The folder of the current release (release/CURRENT, written by tools/release.py), or None."""
    try:
        with open(os.path.join(RELEASES, 'CURRENT'), encoding='utf-8') as f:
            d = os.path.join(RELEASES, json.load(f)['dir'])
    except (OSError, ValueError, KeyError, TypeError):  # TypeError: a CURRENT that is not {"dir": "<name>"}
        return None
    return d if os.path.isdir(d) else None


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
            if size > (25 * 1024 * 1024 if parts in (['plate'], ['hero']) else 64 * 1024):  # these carry a picture
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
        if method == 'GET' and parts == ['setup']:
            import setup
            return self._json(200, setup.status())
        if method == 'GET' and parts == ['release']:
            import release
            return self._json(200, release.status())
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
        if method == 'GET' and parts == ['ills']:
            import ill_upscale
            got = ill_upscale.listing(q.get('book', [''])[0])
            return self._json(200, got) if got is not None else self._json(404, {'error': 'not a downloaded book'})
        if parts[:1] == ['icons'] or parts in (['item-glyph'], ['ui-glyph']):
            return self._admin_icons(method, parts, q, body)
        if method == 'GET' and parts == ['standins']:
            import plates_file
            return self._json(200, plates_file.standins())
        if method == 'POST' and parts == ['plate']:
            return self._admin_plate(body)
        if method == 'POST' and parts in (['proposals'], ['proposals', 'finish']):  # the proposal sheet (ruling R23)
            import plates_proposals
            code = str(body.get('book') or '')
            if not re.fullmatch(r'[\w-]{1,40}', code):
                return self._json(400, {'error': 'not a book code'})
            try:
                if parts[-1] == 'finish':
                    return self._json(200, {'rows': plates_proposals.finish(code)})
                row = plates_proposals.decide(code, str(body.get('enemy') or ''), body.get('how') or None, body.get('src') or None)
                return self._json(200, {'row': row, 'open': plates_proposals.open_rows(code)})
            except ValueError as e:
                return self._json(400, {'error': str(e)})
        if method == 'POST' and parts == ['hero']:  # Lone Wolf's two pictures, baked by tools/admin/hero.html
            import base64
            name = str(body.get('name') or '')
            try:
                data = base64.b64decode(str(body.get('data') or ''))
            except ValueError:
                data = b''
            if name not in HERO_PICTURES or data[:4] != b'RIFF' or data[8:12] != b'WEBP':
                return self._json(400, {'error': 'expected frontis or likeness, as WebP'})
            file = os.path.join(ROOT, 'assets', 'hero', name + '.webp')
            os.makedirs(os.path.dirname(file), exist_ok=True)
            with open(file + '.part', 'wb') as f:
                f.write(data)
            os.replace(file + '.part', file)
            return self._json(200, {'saved': f'assets/hero/{name}.webp'})
        if method == 'GET' and parts == ['art-sources']:  # the picture-sources sheet (ADR 0038, 0042)
            import art_sources
            return self._json(200, {'pictures': art_sources.listing()})
        if method == 'POST' and parts in (['picture-url'], ['art-link']):
            import art_sources
            import base64
            try:
                if parts == ['art-link'] and body.get('made') == 'ai':  # ours: into the committed library (ADR 0042)
                    return self._json(200, {'src': art_sources.make_ai(str(body.get('src') or ''))})
                if parts == ['art-link']:  # a link for a picture already in art/ (ADR 0038)
                    return self._json(200, art_sources.link_existing(str(body.get('src') or ''), body.get('url') or None))
                # the picture sheet's picture by address: fetched here, shrunk and saved by the page as a dropped file is
                data = art_sources.get_picture(str(body.get('url') or ''))
                return self._json(200, {'type': art_sources.kind(data), 'data': base64.b64encode(data).decode('ascii')})
            except (ValueError, OSError) as e:
                return self._json(400, {'error': str(e)})
        if method == 'POST' and len(parts) == 3 and parts[0] == 'mark' and parts[2].isdigit():
            ok, msg = book_status.mark(parts[1], int(parts[2]), undo=q.get('undo', [''])[0] == '1', run_checks=False)
            return self._json(200 if ok else 409, {'ok': ok, 'message': msg})
        return self._json(404, {'error': 'nothing here'})

    def _admin_icons(self, method, parts, q, body):
        """The item and icon sheets' icons (tools/item_icons.py): the ones here, game-icons.net's list and previews,
        and an item's or the player's own glyph changed. Fetching from game-icons.net is the owner's own click on the sheet."""
        import item_icons
        try:
            if method == 'GET' and parts == ['icons']:
                return self._json(200, {'local': item_icons.local(), 'tables': item_icons.tables()})
            if method == 'GET' and parts == ['icons', 'remote']:
                return self._json(200, item_icons.remote(refresh=q.get('refresh', [''])[0] == '1'))
            if method == 'GET' and parts == ['icons', 'preview']:
                data = item_icons.preview(q.get('path', [''])[0]).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'image/svg+xml')
                self.send_header('Content-Length', str(len(data)))
                self.send_header('Cache-Control', 'max-age=86400')
                self.end_headers()
                self.wfile.write(data)
                return None
            if method == 'POST' and parts == ['item-glyph']:
                glyph = item_icons.fetch(str(body['remote'])) if body.get('remote') else str(body.get('glyph') or '')
                return self._json(200, {**item_icons.set_glyph(str(body.get('item') or ''), glyph), 'glyph': glyph})
            if method == 'POST' and parts == ['ui-glyph']:  # the icon sheet: a glyph of glyphs.js
                glyph = item_icons.fetch(str(body['remote'])) if body.get('remote') else str(body.get('glyph') or '')
                return self._json(200, {**item_icons.set_ui_glyph(str(body.get('list') or ''), str(body.get('key') or ''), glyph), 'glyph': glyph})
        except ValueError as e:
            return self._json(400, {'error': str(e)})
        except OSError as e:  # game-icons.net out of reach
            return self._json(502, {'error': f'game-icons.net did not answer: {e}'})
        return self._json(404, {'error': 'nothing here'})

    def _admin_plate(self, body):
        """The picture sheet's drop and adjust: the owner's own picture (or crop) for one enemy, written
        to plates.json by tools/plates_file.py. Body: {book, enemy, image?: base64 WebP, crop?, levels?,
        flip?, remove?, link?, made?: 'ai'}. The file name is made from the enemy's name, never taken from the request."""
        import base64
        import binascii
        import book_status
        import plates_file
        import art_sources
        hit = book_status.find(str(body.get('book') or ''))
        if not hit or not os.path.isfile(os.path.join(ROOT, 'data', 'projectaon', hit[0], 'book.js')):
            return self._json(404, {'error': 'not an imported book'})
        link = body.get('link') or None  # with a new picture: where it came from, or none (ADR 0038)
        if link is not None and not art_sources.web(link):
            return self._json(400, {'error': 'the link must be an http(s) address'})
        try:
            image = base64.b64decode(body['image'], validate=True) if body.get('image') else None
            entry, msg = plates_file.put(hit[0], book_status.load_book(hit[0]), str(body.get('enemy') or ''), image=image,
                                         crop=body.get('crop'), levels=body.get('levels'), remove=bool(body.get('remove')),
                                         src=body.get('src'), flip=body.get('flip') is True)
            if image is not None and body.get('made') == 'ai':  # ours: into the committed library (ADR 0042)
                entry['src'] = art_sources.make_ai(entry['src'], replace=True)
            elif image is not None and 'link' in body:
                art_sources.record(entry['src'], link)
        except (ValueError, binascii.Error) as e:
            return self._json(400, {'error': str(e)})
        # the owner's own change on the sheet is his approval for that enemy: re-pin it in a book already
        # approved (assets/plates/approved/, tools/plates_pin.mjs), or the player would keep the old one
        if os.path.isfile(os.path.join(ROOT, 'assets', 'plates', 'approved', hit[0] + '.json')):
            subprocess.run(['node', os.path.join('tools', 'plates_pin.mjs'), hit[0], '--approve-name', str(body.get('enemy') or '')],
                           cwd=ROOT, capture_output=True, timeout=120)
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
        if RELEASE and not (path == '/api/offline' or path.startswith('/api/backups')):
            if path.startswith('/api/'):
                return self._json(404, {'error': 'not in a release'})
            if not self.directory:
                return self._json(503, {'error': 'nothing released yet: run python tools/release.py'})
            return super().do_GET()
        if path.startswith('/api/map/'):
            return self._map_api('GET')
        if path.startswith('/api/admin/'):
            return self._admin_api('GET')
        if path == '/api/offline':
            if RELEASE and not self.directory:
                return self._json(503, {'error': 'nothing released yet'})
            return self._json(200, offline_list(self.directory if RELEASE else ROOT))
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

    def _drain(self, limit=MAX):
        """Read a refused request's body: left unread on a kept-alive connection it would be taken for the
        next request. One too large, or without a usable length, closes the connection instead."""
        try:
            size = int(self.headers.get('Content-Length') or 0)
        except ValueError:
            size = -1
        if 0 <= size <= limit:
            self.rfile.read(size)
        else:
            self.close_connection = True

    def do_POST(self):
        if RELEASE and not self.path.startswith('/api/backups/'):
            self._drain()
            return self._json(404, {'error': 'not in a release'})
        if self.path.startswith('/api/map/'):
            return self._map_api('POST')
        if self.path.startswith('/api/admin/'):
            return self._admin_api('POST')
        if self.path.split('?', 1)[0].startswith('/api/maplabels/'):
            return self._post_labels()
        if not self.path.startswith('/api/backups/'):
            self._drain()
            return self._json(404, {'error': 'nothing here'})
        name = self._name()
        if not name:
            self._drain()
            return self._json(400, {'error': 'not a backup file name'})
        size = int(self.headers.get('Content-Length') or 0)
        if not 0 < size <= MAX:
            self.close_connection = True
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
            self._drain()
            return self._json(400, {'error': 'not a book folder'})
        size = int(self.headers.get('Content-Length') or 0)
        if not 0 < size <= MAX:
            self.close_connection = True
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
    p.add_argument('port', nargs='?', type=int, help='default 8766, or 8765 with --release')
    p.add_argument('--bind', default='127.0.0.1')
    p.add_argument('--release', action='store_true', help='serve release/ (tools/release.py), not the working copy')
    a = p.parse_args()
    if sys.stderr is None:  # pythonw (started with Windows) has no console: log to a file instead
        os.makedirs(RELEASES, exist_ok=True)
        sys.stdout = sys.stderr = open(os.path.join(RELEASES, 'server.log'), 'a', encoding='utf-8', buffering=1)
    global RELEASE
    RELEASE = a.release
    a.port = a.port or (8765 if a.release else 8766)  # the release keeps the port Tailscale forwards to
    # the default queue of 5 waiting connections overflows when a page (or the offline copy) asks for
    # many files at once, and Windows answers the overflow with a reset
    ThreadingHTTPServer.request_queue_size = 128
    if a.release:  # each request looks up the current release, so a new one needs no restart
        handler = lambda *args, **kw: Handler(*args, directory=release_dir() or '', **kw)  # '' (not None, which means the current folder): nothing released
        print(f'Serving the release in {RELEASES} on http://{a.bind}:{a.port}/ (backups in {BACKUPS})', flush=True)
        if not release_dir():
            print('Nothing released yet: run python tools/release.py', flush=True)
    else:
        handler = partial(Handler, directory=ROOT)
        try:  # the made-up demo book (ruling R20), from its committed source into data/projectaon/
            import demo_book
            demo_book.install()
        except (OSError, SystemExit) as e:
            print(f'demo book not installed: {e}', flush=True)
        print(f'Serving {ROOT} on http://{a.bind}:{a.port}/ (backups in {BACKUPS})', flush=True)
    server = ThreadingHTTPServer((a.bind, a.port), handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
