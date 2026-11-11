"""One command from a fresh checkout to books that play: the tools' packages, then each book downloaded
from Project Aon and imported (ADR 0036). Only the basics: the printed maps and the books' own pictures.

    uv run --no-project python tools/quickstart.py                every book the importer knows
    uv run --no-project python tools/quickstart.py 1 2 05sots     these books (a number or a code)
    ... --no-setup                                                skip the packages (tools/.venv)

A book with a book.js already is left alone. A download picks up where an interrupted one stopped.
Run with --no-project, as setup.py is, so it works before tools/.venv exists; fetch and import go
through uv (ADR 0037). Prints the commands it runs; exits 1 if any step failed, 2 on a bad argument.
"""
import os
import sys

import book_status
import setup

ROOT = book_status.ROOT
DATA = book_status.DATA


def known():
    return book_status.importer_books()


def tool(script, code):
    return ['uv', 'run', '--project', 'tools', 'python', os.path.join('tools', script), code]


def main(argv, run=setup._run):
    flags = [a for a in argv if a.startswith('-')]
    if set(flags) - {'--no-setup'}:
        print(__doc__)
        return 2
    have = known()
    codes = []
    for name in (a for a in argv if not a.startswith('-')):
        found = book_status.find(name)
        if not found or found[0] not in have:
            why = 'not a book' if not found else 'not in the importer yet: run tools/add_book.py first'
            print(f'{name}: {why}')
            return 2
        codes.append(found[0])
    codes = codes or sorted(have)
    if '--no-setup' not in flags and run(setup.COMMANDS['venv']()[0]):
        print('setup failed: nothing downloaded')
        return 1
    failed = []
    for code in codes:
        if os.path.isfile(os.path.join(DATA, code, 'book.js')):
            print(f'{code}: imported already')
            continue
        step = 'download' if run(tool('fetch_projectaon.py', code)) else \
               'import' if run(tool('import_projectaon.py', code)) else None
        if step:
            failed.append(f'{code} ({step})')
    print(f'{len(codes) - len(failed)} of {len(codes)} books ready' + (f"; failed: {', '.join(failed)}" if failed else ''))
    print('play: uv run --project tools python tools/serve.py, then http://localhost:8766/')
    return 1 if failed else 0


if __name__ == '__main__':
    os.chdir(ROOT)
    sys.exit(main(sys.argv[1:]))
