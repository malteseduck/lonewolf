"""Our descriptions of the books' pictures and enemies (about/*.json) are committed (ADR 0042), so none
may repeat a book's own wording: this lists every entry that shares a run of RUN words with its book's
sections. Ids and counts only, never the matching text.

    python tools/about_check.py        exit 1 if any entry does

A book not downloaded is skipped (a fresh checkout has none); check_all.py runs this with the books here.
"""
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PA = os.path.join(ROOT, 'data', 'projectaon')
ABOUT_DIR = os.path.join(ROOT, 'about')
RUN = 8  # words in a row; shorter runs are names and stock phrases ("at the foot of the stairs")


def words(text):
    return re.findall(r"[a-z0-9']+", text.lower().replace('-', ' '))


def runs(ws):
    return {' '.join(ws[i:i + RUN]) for i in range(len(ws) - RUN + 1)}


def book_runs(code, cache):
    if code not in cache:
        text = ''
        for f in glob.glob(os.path.join(PA, code, 'sect*.htm')):
            with open(f, encoding='utf-8', errors='replace') as fh:
                text += ' ' + re.sub(r'<[^>]+>', ' ', fh.read())
        cache[code] = runs(words(text)) if text else None
    return cache[code]


def entries():
    """(file, key, book code, text) for every description."""
    def load(name):
        try:
            with open(os.path.join(ABOUT_DIR, name), encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            return {}
    for code, names in load('foe-about.json').items():
        for name, text in names.items():
            yield 'foe-about.json', f'{code}/{name}', code, text
    for name in ('ill-about.json', 'ill-notes.json'):
        for key, text in load(name).items():
            yield name, key, key.split('/')[0], text


def copied():
    cache, out = {}, []
    for file, key, code, text in entries():
        book = book_runs(code, cache)
        n = len(runs(words(text)) & book) if book else 0
        if n:
            out.append({'file': file, 'key': key, 'runs': n})
    return out


def main(argv):
    bad = copied()
    for b in bad:
        print(f"{b['file']} {b['key']}: {b['runs']} run(s) of {RUN} words from the book")
    print(f'{len(bad)} description(s) repeat the book\'s wording' if bad else 'no description repeats the book\'s wording')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
