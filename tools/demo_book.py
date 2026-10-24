"""Install the made-up demo book (ruling R20) from its committed source into the importer's world.

    python tools/demo_book.py            copy demo/99ember/ into data/projectaon/99ember/ and import it
    python tools/demo_book.py --quiet    the same, only if something changed (what tools/serve.py runs)

demo/<code>/ holds the book as Project Aon's pages are laid out (sect<N>.htm, tssf.htm, ill<N>.png,
map.png) in text of our own, its item table (items.js, loaded by the player only where the book is) and
its map. The copy in data/projectaon/ is what the importer, the dashboard and the map editor work on,
exactly as for a downloaded book. Nothing here reaches the release, the iPad or the whole-library tools.
"""
import os
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import book_status  # noqa: E402

NOT_COPIED = {'items.js', 'README.md'}


def install(root=book_status.ROOT, code='99ember', importer=True):
    """Copy a demo book's source files that differ into <root>/data/projectaon/<code>/. Returns the files
    copied, then runs the importer if any was (or book.js is missing)."""
    src, dst = os.path.join(root, 'demo', code), os.path.join(root, 'data', 'projectaon', code)
    if not os.path.isdir(src):
        return []
    os.makedirs(dst, exist_ok=True)
    copied = []
    for name in sorted(os.listdir(src)):
        a, b = os.path.join(src, name), os.path.join(dst, name)
        if name in NOT_COPIED or not os.path.isfile(a):
            continue
        if not os.path.isfile(b) or os.path.getsize(a) != os.path.getsize(b) or open(a, 'rb').read() != open(b, 'rb').read():
            shutil.copy2(a, b)
            copied.append(name)
    if importer and (copied or not os.path.isfile(os.path.join(dst, 'book.js'))):
        p = subprocess.run([sys.executable, os.path.join(root, 'tools', 'import_projectaon.py'), code], cwd=root,
                           capture_output=True, text=True, encoding='utf-8', errors='replace')
        if p.returncode:
            sys.exit(p.stdout + p.stderr)
    return copied


if __name__ == '__main__':
    done = install()
    if '--quiet' not in sys.argv[1:] or done:
        print(f'demo book: {len(done)} file(s) copied to data/projectaon/99ember/' if done else 'demo book: up to date')
