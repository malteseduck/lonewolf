"""What the iPad's offline copy would hold, without starting a server.

    python tools/offline_check.py [--json]

Prints the file count and size, the size of each top-level group (each book folder on its own),
the 10 largest files, and every file the page names that is not on disk. Exits 1 if any is missing.
The list is serve.py's offline_list(), the same that GET /api/offline gives sw.js. --json prints the
same as one JSON object: {files, bytes, version, groups: {name: [count, bytes]}, largest: [[path, bytes]], missing}.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from serve import ROOT, offline_list  # noqa: E402


def group(rel):
    parts = rel.split('/')
    if parts[:2] == ['data', 'projectaon']:
        return '/'.join(parts[:3]) if len(parts) > 3 else 'data/projectaon'  # each book on its own
    return parts[0] if len(parts) > 1 else '(root)'


def main():
    got = offline_list()
    sizes = {r: os.path.getsize(os.path.join(ROOT, r)) for r in got['files']}
    mb = lambda n: f'{n / 1e6:7.2f} MB'
    if '--json' in sys.argv[1:]:
        groups = {}
        for r, n in sizes.items():
            c, t = groups.get(group(r), (0, 0))
            groups[group(r)] = (c + 1, t + n)
        print(json.dumps({'files': len(sizes), 'bytes': sum(sizes.values()), 'version': got['version'], 'groups': groups,
                          'largest': sorted(sizes.items(), key=lambda kv: -kv[1])[:10], 'missing': got.get('missing', [])}))
        return 1 if got.get('missing') else 0
    print(f'{len(sizes)} files, {mb(sum(sizes.values())).strip()}, version {got["version"]}')
    groups = {}
    for r, n in sizes.items():
        c, t = groups.get(group(r), (0, 0))
        groups[group(r)] = (c + 1, t + n)
    print('\nby group:')
    for g, (c, t) in sorted(groups.items(), key=lambda kv: -kv[1][1]):
        print(f'  {mb(t)}  {c:4d} files  {g}')
    print('\nlargest:')
    for r, n in sorted(sizes.items(), key=lambda kv: -kv[1])[:10]:
        print(f'  {mb(n)}  {r}')
    missing = got.get('missing', [])
    print(f'\nmissing: {len(missing)}')
    for r in missing:
        print('  ' + r)
    return 1 if missing else 0


if __name__ == '__main__':
    sys.exit(main())
