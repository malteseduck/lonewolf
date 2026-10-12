"""Check everything: the real books through every script, and both unit-test suites.

    python tools/check_all.py

The unit tests (tests/, ADR 0022) use stand-in data, so they cannot show that the real books still
import and pass their checks. This runs, at once where nothing depends on another:

  - npm test (Vitest) and pytest, which never touch the books, beside
  - reimport_all.py: every imported book re-imported, its report against the last (rewrites a
    book.js only where the importer's output changed; that is what an importer change is for),
    and once it is done, together, the checks that read the books:
      check_items.mjs --json for every book with an item table (step 5's check)
      plates_pin.mjs --all --json: fights whose picture would differ from the approved one (a
        warning for the owner, not a failure)
      offline_check.py: every file the page names exists

It prints a line as each step ends, with the tail of the output of any that failed. Counts and ids
only, never the books' text. Exits 1 if any step failed. The dashboard's "Check everything" runs it.
"""
import glob
import json
import os
import re
import subprocess
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data', 'projectaon')
PY = [sys.executable]
NODE = 'node'
NPX = 'npx.cmd' if os.name == 'nt' else 'npx'
ANSI = re.compile(r'\x1b\[[0-9;]*m')


def run(cmd, timeout=1800, summary=None):
    """(exit code, output). summary: a pattern for the line worth showing (the suites' pass counts)."""
    env = dict(os.environ, NO_COLOR='1', FORCE_COLOR='0', PY_COLORS='0')  # plain text in the dashboard's log
    p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=timeout, env=env)
    out = ANSI.sub('', (p.stdout or '') + (p.stderr or ''))
    if summary:
        found = re.findall(summary, out, re.M)
        if found:
            out += '\n' + found[-1].strip()
    return p.returncode, out


def tail(out, n=15):
    return '\n'.join('      ' + l for l in out.strip().splitlines()[-n:])


def item_books():
    """The books with an item table and an imported book.js."""
    for f in sorted(glob.glob(os.path.join(ROOT, 'items-*.js'))):
        code = os.path.basename(f)[len('items-'):-len('.js')]
        if os.path.isfile(os.path.join(DATA, code, 'book.js')):
            yield code


def check_items(code):
    rc, _ = run([NODE, 'tools/check_items.mjs', code, '--json'])
    try:
        with open(os.path.join(DATA, code, 'check-items.json'), encoding='utf-8') as f:
            errors = len(json.load(f).get('errors') or [])
    except (OSError, ValueError):
        errors = None
    return None if not rc and not errors else f'{code}: ' + (f'{errors} error(s)' if errors else f'exit {rc}')


def step_items():
    with ThreadPoolExecutor(4) as pool:  # one node each, the books apart
        bad = [b for b in pool.map(check_items, list(item_books())) if b]
    return (1 if bad else 0), '\n'.join(bad) or 'every item table clean'


def step_pins():
    # stdout alone: node may warn on stderr (a typeless package.json)
    p = subprocess.run([NODE, 'tools/plates_pin.mjs', '--all', '--json'], cwd=ROOT, capture_output=True, text=True,
                       encoding='utf-8', errors='replace', timeout=300)
    out = p.stdout or ''
    if p.returncode:
        return p.returncode, out + (p.stderr or '')
    try:
        books = json.loads(out)
    except ValueError:
        return 1, out
    waiting = {b: len(r.get('changed') or []) for b, r in (books.items() if isinstance(books, dict) else []) if r.get('changed')}
    note = ', '.join(f'{b}: {n}' for b, n in waiting.items())
    return 0, f'pictures waiting for approval: {note}' if waiting else 'no fight picture changed since approval'


TESTS = [
    ('JavaScript tests', lambda: run([NPX, 'vitest', 'run'], summary=r'^\s*Tests\s+.*$')),
    ('Python tests', lambda: run(PY + ['-m', 'pytest', '-p', 'no:cacheprovider'], summary=r'^\d+ (?:passed|failed).*$')),
]
REIMPORT = ('Re-import every book', lambda: run(PY + ['tools/reimport_all.py']))
AFTER_REIMPORT = [
    ('Item tables', step_items),
    ('Approved fight pictures', step_pins),
    ('Offline copy', lambda: run(PY + ['tools/offline_check.py'])),
]

failed, _print = [], threading.Lock()


def do(title, step, t0):
    try:
        rc, out = step()
    except (OSError, subprocess.TimeoutExpired) as e:
        rc, out = 1, str(e)
    last = out.strip().splitlines()[-1] if out.strip() else ''
    with _print:  # a step's lines together, whichever finishes first
        print(f'{"ok    " if rc == 0 else "FAILED"} {title} ({time.time() - t0:.0f} s): {last}', flush=True)
        if rc:
            failed.append(title)
            print(tail(out), flush=True)
    return rc


def books(t0):
    if do(*REIMPORT, t0) == 0:  # the checks read what the import wrote
        with ThreadPoolExecutor(len(AFTER_REIMPORT)) as pool:
            list(pool.map(lambda s: do(*s, t0), AFTER_REIMPORT))


def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except AttributeError:
        pass
    t0 = time.time()
    with ThreadPoolExecutor(len(TESTS) + 1) as pool:
        jobs = [pool.submit(books, t0)] + [pool.submit(do, title, step, t0) for title, step in TESTS]
        for j in jobs:
            j.result()
    print(f'Everything passed in {time.time() - t0:.0f} s.' if not failed else f'{len(failed)} step(s) failed: {", ".join(failed)}')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
