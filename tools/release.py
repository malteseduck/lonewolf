"""Release a commit to the iPad: copy what the offline copy needs into release/, which
`python tools/serve.py 8765 --release` serves (docs/reference/offline.md, "Releasing").

    python tools/release.py [commit]      (default HEAD)
    python tools/release.py --status      what is released, and what HEAD would add, as JSON

The dashboard's "Release" button runs it too, after tools/offline_check.py (docs/reference/dashboard.md).

The code comes from the commit, never the working copy, so uncommitted work stays on the PC. The
books and art are git-ignored (data/projectaon/, art/), so they come from disk as they are now; a
file the page needs that is neither in the commit nor ignored (a new file not yet committed) stops
the release. The folder holds only the files GET /api/offline lists, plus sw.js. The last two
releases are kept, so `release.py <older commit>` puts an earlier one back. When the files are exactly
those released already (a commit that changes only docs or tools), nothing is made and it says so.
"""
import io
import json
import os
import shutil
import subprocess
import sys
import tarfile
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import serve  # noqa: E402
from serve import RELEASES, ROOT, offline_list  # noqa: E402

KEEP = 2
EXTRA = ['sw.js']  # registered by main.js, fetched outside the list


def git(*args, data=None, ok=(0,)):
    p = subprocess.run(['git', *args], cwd=ROOT, input=data, capture_output=True)
    if p.returncode not in ok:
        sys.exit(f'git {" ".join(args)} failed: {p.stderr.decode(errors="replace").strip()}')
    return p.stdout


def current():
    try:
        with open(os.path.join(RELEASES, 'CURRENT'), encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def status():
    """The current release, the commit HEAD is, and how many files have uncommitted changes."""
    sha, subject = git('log', '-1', '--format=%h%x00%s', 'HEAD').decode().strip().split('\0', 1)
    cur = current()
    behind = 0
    if cur.get('commit'):
        p = subprocess.run(['git', 'rev-list', '--count', f'{cur["commit"]}..HEAD'], cwd=ROOT, capture_output=True)
        behind = int(p.stdout or 0) if not p.returncode else None
    dirty = git('status', '--porcelain', '--untracked-files=no').decode().splitlines()
    return {'current': cur, 'head': {'commit': sha, 'subject': subject}, 'commits_since': behind, 'dirty': len(dirty)}


def main():
    if sys.argv[1:] == ['--status']:
        print(json.dumps(status()))
        return 0
    ref = sys.argv[1] if len(sys.argv) > 1 else 'HEAD'
    sha = git('rev-parse', '--verify', '--short', f'{ref}^{{commit}}').decode().strip()
    subject = git('log', '-1', '--format=%s', sha).decode().strip()
    os.makedirs(RELEASES, exist_ok=True)
    stage = os.path.join(RELEASES, '.building')
    shutil.rmtree(stage, ignore_errors=True)
    with tarfile.open(fileobj=io.BytesIO(git('archive', '--format=tar', sha))) as t:
        t.extractall(stage, filter='data')

    borrowed = []  # git-ignored files brought from disk

    def fill(rel):
        src = os.path.join(ROOT, rel)
        if not os.path.isfile(src):
            return False
        os.makedirs(os.path.dirname(os.path.join(stage, rel)), exist_ok=True)
        shutil.copy2(src, os.path.join(stage, rel))
        borrowed.append(rel)
        return True

    # the build folder's path is the same each time: hashes remembered from the last build would hide a change
    with serve._hash_lock:
        for k in [k for k in serve._hashes if k.startswith(stage)]:
            del serve._hashes[k]
    got = offline_list(stage, fill)
    # what came from disk must be ignored by git: anything else is code not committed
    ignored = set(git('check-ignore', '--stdin', '-z', data='\0'.join(borrowed).encode(), ok=(0, 1)).decode().split('\0')) if borrowed else set()
    stray = sorted(set(borrowed) - ignored)
    problems = [f'  not in {sha}: {r}' for r in stray] + [f'  missing: {r}' for r in got['missing']]
    if problems:
        shutil.rmtree(stage, ignore_errors=True)
        sys.exit('Not released. The page names files the release cannot have:\n' + '\n'.join(problems)
                 + ('\nCommit them first.' if stray else ''))
    keep = set(got['files']) | set(EXTRA)
    for d, _, names in os.walk(stage, topdown=False):
        for n in names:
            rel = os.path.relpath(os.path.join(d, n), stage).replace(os.sep, '/')
            if rel not in keep:
                os.remove(os.path.join(d, n))
        if d != stage and not os.listdir(d):
            os.rmdir(d)

    before = current()
    if before.get('version') == got['version'] and os.path.isdir(os.path.join(RELEASES, before.get('dir') or '.building')):
        shutil.rmtree(stage, ignore_errors=True)
        print(f'Nothing to release: the iPad already has exactly these files ({before["dir"]}).')
        return 0
    name = f'{time.strftime("%Y%m%d-%H%M%S")}-{sha}'
    os.replace(stage, os.path.join(RELEASES, name))
    size = sum(os.path.getsize(os.path.join(RELEASES, name, r)) for r in got['files'])
    info = {'dir': name, 'commit': sha, 'subject': subject, 'made': time.strftime('%Y-%m-%d %H:%M'),
            'version': got['version'], 'files': len(got['files']), 'bytes': size}
    tmp = os.path.join(RELEASES, 'CURRENT.part')
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(info, f, indent=1)
    os.replace(tmp, os.path.join(RELEASES, 'CURRENT'))  # the server reads it at each request
    old = sorted(e.name for e in os.scandir(RELEASES) if e.is_dir() and not e.name.startswith('.'))
    for n in old[:-KEEP]:
        shutil.rmtree(os.path.join(RELEASES, n), ignore_errors=True)

    print(f'Released {sha} "{subject}": {len(got["files"])} files, {size / 1e6:.1f} MB, version {got["version"]}.')
    print('The iPad fetches it at its next sync (opening the app with the PC in reach).')
    dirty = git('status', '--porcelain', '--untracked-files=no').decode().splitlines()
    if dirty and ref == 'HEAD':
        print(f'Not included: uncommitted changes to {len(dirty)} file{"s" * (len(dirty) != 1)}.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
