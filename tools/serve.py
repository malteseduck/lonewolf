"""Serve the player, and keep adventure backups in backups/.

    python tools/serve.py [port] [--bind ADDRESS]      (defaults: 8765, 127.0.0.1)

Static files as `python -m http.server` serves them, from the project root, plus:

    GET  /api/backups          the backups, newest first: [{name, size, made}]
    GET  /api/backups/<name>   one backup's JSON
    POST /api/backups/<name>   write a backup (JSON body, up to 5 MB)

A page cannot write to disk by itself; this lets the "backup" button do it without a dialog.
Names are plain file names ending in .json: no folders, so nothing outside backups/ is touched.
"""
import argparse
import json
import os
import re
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKUPS = os.path.join(ROOT, 'backups')
MAX = 5 * 1024 * 1024
NAME = re.compile(r'^[^\\/:*?"<>|\x00-\x1f]{1,120}\.json$')


class Handler(SimpleHTTPRequestHandler):
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
    server = ThreadingHTTPServer((a.bind, a.port), partial(Handler, directory=ROOT))
    print(f'Serving {ROOT} on http://{a.bind}:{a.port}/ (backups in {BACKUPS})', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
