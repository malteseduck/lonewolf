"""Serve the player, and keep adventure backups in backups/.

    python tools/serve.py [port] [--bind ADDRESS]      (defaults: 8765, 127.0.0.1)

Static files as `python -m http.server` serves them, from the project root, plus:

    GET  /api/backups          the backups, newest first: [{name, size, made}]
    GET  /api/backups/<name>   one backup's JSON
    POST /api/backups/<name>   write a backup (JSON body, up to 5 MB)

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
import re
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKUPS = os.path.join(ROOT, 'backups')
MAX = 5 * 1024 * 1024
NAME = re.compile(r'^[^\\/:*?"<>|\x00-\x1f]{1,120}\.json$')

# What the offline copy holds: the player and everything it loads. Project Aon's section pages and
# the importer's notes stay behind (the page reads book.js and the images), as do the prototypes,
# docs, tools and the reference images.
OFFLINE_FILES = ['index.html', 'manifest.webmanifest']
OFFLINE_DIRS = ['shared', 'assets', 'art', 'data/projectaon']
OFFLINE_SKIP_DIRS = {'art/reference', '__pycache__'}
OFFLINE_SKIP_EXT = {'.htm', '.html', '.txt', '.md', '.py', '.pyc'}
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


def offline_list():
    rels = [f for f in OFFLINE_FILES if os.path.isfile(os.path.join(ROOT, f))]
    rels += [e.name for e in os.scandir(ROOT) if e.is_file() and e.name.endswith('.js') and e.name != 'sw.js']
    for top in OFFLINE_DIRS:
        for dirpath, dirnames, filenames in os.walk(os.path.join(ROOT, top)):
            rel_dir = os.path.relpath(dirpath, ROOT).replace(os.sep, '/')
            dirnames[:] = [d for d in dirnames if not d.startswith('.') and d not in OFFLINE_SKIP_DIRS
                           and f'{rel_dir}/{d}' not in OFFLINE_SKIP_DIRS]
            for f in filenames:
                if not f.startswith('.') and os.path.splitext(f)[1].lower() not in OFFLINE_SKIP_EXT:
                    rels.append(f'{rel_dir}/{f}')
    files = {r: _hash(r) for r in sorted(set(rels))}
    version = hashlib.sha1(json.dumps(files, sort_keys=True).encode()).hexdigest()[:16]
    return {'version': version, 'files': files}


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

    def do_GET(self):
        path = self.path.split('?', 1)[0]
        if path == '/api/offline':
            return self._json(200, offline_list())
        if path in ('/api/backups', '/api/backups/'):
            os.makedirs(BACKUPS, exist_ok=True)
            files = [e for e in os.scandir(BACKUPS) if e.is_file() and NAME.match(e.name)]
            files.sort(key=lambda e: e.stat().st_mtime, reverse=True)
            return self._json(200, [{'name': e.name, 'size': e.stat().st_size, 'made': int(e.stat().st_mtime * 1000)} for e in files])
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
