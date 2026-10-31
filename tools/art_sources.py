"""Where each picture in art/ came from (ADR 0038): art/sources.json, committed though art/ is not, so
that a fresh checkout can fetch its pictures again.

    python tools/art_sources.py                     what is here, what can be fetched again, what has no link
    python tools/art_sources.py --json              the same as JSON
    python tools/art_sources.py link <art/...> <url> record a picture's link
    python tools/art_sources.py nolink <art/...>     mark a picture as having none (a screenshot, your own drawing)
    python tools/art_sources.py ai <art/plates/...>  made with an AI from a text prompt: moved to the committed
                                                    assets/plates/ (ADR 0042)
    python tools/art_sources.py ai-back             every picture credited to an AI back to art/plates/, to be
                                                    classified again
    python tools/art_sources.py fetch               fetch every missing picture from its link (a download: the
                                                    dashboard's Setup gates it)

An entry is {"url", "fetched": date} or {"url": null} for no link; "page" (where it was found) and "note"
(what was done to it by hand) are kept if written. Left out: art/reference/ (map-making material, not
loaded by the player), notes and code, and the -2x.webp copies, which ill_upscale.py makes again.
The listing needs only the standard library (setup.py reads it with --no-project); fetch needs Pillow.
"""
import datetime
import html
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = ('.png', '.jpg', '.jpeg', '.webp', '.gif')
LONG = 2000  # the longest side kept, as the picture sheet does (tools/admin/fights.html)
MAX = 25 * 1024 * 1024
OG = re.compile(r'<meta\b[^>]*?(?:property|name)=["\'](?:og:image|twitter:image)["\'][^>]*>', re.I)
CONTENT = re.compile(r'content=["\']([^"\']+)', re.I)


def list_path():
    return os.path.join(ROOT, 'art', 'sources.json')


def counts(rel):
    """A picture of art/ this list is for."""
    parts = rel.split('/')
    return (len(parts) > 1 and parts[0] == 'art' and parts[1] != 'reference' and '..' not in parts and '' not in parts
            and rel.lower().endswith(IMG) and not rel.lower().endswith('-2x.webp'))


def pictures():
    out = []
    for dirpath, dirs, files in os.walk(os.path.join(ROOT, 'art')):
        rel_dir = os.path.relpath(dirpath, ROOT).replace(os.sep, '/')
        dirs[:] = sorted(d for d in dirs if not (rel_dir == 'art' and d == 'reference'))
        out += [f'{rel_dir}/{f}' for f in files if counts(f'{rel_dir}/{f}')]
    return sorted(out)


def load():
    try:
        with open(list_path(), encoding='utf-8') as f:
            return json.load(f).get('sources', {})
    except FileNotFoundError:
        return {}


def save(sources):
    rows = [f'    {json.dumps(k)}: {json.dumps(sources[k], ensure_ascii=False)}' for k in sorted(sources)]
    text = ('{\n  "_readme": "Where each picture in art/ came from (ADR 0038; tools/art_sources.py). url null: it has no link.",\n'
            '  "sources": {\n' + ',\n'.join(rows) + '\n  }\n}\n')
    os.makedirs(os.path.dirname(list_path()), exist_ok=True)
    with open(list_path() + '.part', 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    os.replace(list_path() + '.part', list_path())


def web(url):
    return isinstance(url, str) and urllib.parse.urlsplit(url).scheme in ('http', 'https') and bool(urllib.parse.urlsplit(url).netloc)


def record(rel, url, today=None):
    """The link of one picture (rel as art/...), or None: it has none. Keeps a page or note already written."""
    if not counts(rel):
        raise ValueError('not a picture under art/ (art/reference/ is left out)')
    if url is not None and not web(url):
        raise ValueError('the link must be an http(s) address')
    sources = load()
    keep = {k: v for k, v in sources.get(rel, {}).items() if k in ('page', 'note')}
    sources[rel] = {'url': url, **({'fetched': today or datetime.date.today().isoformat()} if url else {}), **keep}
    save(sources)
    return sources[rel]


def link_existing(rel, url):
    """The picture sheet's Link...: a link (or None) for a picture already here."""
    if not counts(rel) or not os.path.isfile(os.path.join(ROOT, *rel.split('/'))):
        raise ValueError('not a picture under art/ on this PC')
    return record(rel, url)


def forget(rel):
    """A picture deleted on purpose (the picture sheet's Remove): its link goes too."""
    sources = load()
    if sources.pop(rel, None) is not None:
        save(sources)


AI_NOTE = ('  Made with an AI image generator from a text prompt alone (the proposal sheet\'s prompt);\n'
           '  no book picture was given to it, so it is ours to commit (ADR 0042). Moved here {date}.\n')


def make_ai(rel, today=None, replace=False):
    """A fight picture the owner made with an AI from a text prompt (ADR 0042): it leaves git-ignored
    art/plates/ for the committed assets/plates/, its -2x copy with it, and every mention of its path
    follows (plates.json, the approved pins, the upscaled lists, about/ill-about.json). Its link entry
    goes; assets/plates/README.txt says what it is. Returns the new path."""
    path = lambda r: os.path.join(ROOT, *r.split('/'))
    if not (counts(rel) and rel.startswith('art/plates/') and os.path.isfile(path(rel))):
        raise ValueError('not a fight picture under art/plates/ on this PC')
    new = 'assets/plates/' + rel[len('art/plates/'):]
    if os.path.exists(path(new)) and not replace:  # replace: the owner's new picture for the same enemy
        raise ValueError(f'{new} is already there')
    stem = lambda r: r.rsplit('.', 1)[0] + '-2x.webp'
    moves = [(rel, new)] + ([(stem(rel), stem(new))] if os.path.isfile(path(stem(rel))) else [])
    _move_mentioned(moves)
    forget(rel)
    with open(path('assets/plates/README.txt'), 'a', encoding='utf-8', newline='\n') as f:
        f.write(f'\n{new[len("assets/plates/"):]}\n' + AI_NOTE.format(date=today or datetime.date.today().isoformat()))
    return new


def _move_mentioned(moves):
    """Each (old, new) picture moved, and its path followed wherever it is named."""
    path = lambda r: os.path.join(ROOT, *r.split('/'))
    for old, to in moves:
        os.makedirs(os.path.dirname(path(to)), exist_ok=True)
        os.replace(path(old), path(to))
    mentions = ['assets/plates/plates.json', 'about/ill-about.json', 'data/projectaon/ill-index.json']
    for sub in ('approved', 'upscaled'):
        d = path(f'assets/plates/{sub}')
        mentions += [f'assets/plates/{sub}/{n}' for n in sorted(os.listdir(d))] if os.path.isdir(d) else []
    books = path('data/projectaon')
    for code in sorted(os.listdir(books)) if os.path.isdir(books) else []:
        mentions += [f'data/projectaon/{code}/{n}' for n in ('plate-proposals.json', 'plate-proposals.done.json')]
    for m in mentions:
        if not os.path.isfile(path(m)):
            continue
        with open(path(m), encoding='utf-8', newline='') as f:
            text = f.read()
        changed = text
        for old, to in moves:  # quoted, so another picture whose name starts the same is left alone
            changed = changed.replace(f'"{old}"', f'"{to}"')
        if changed != text:
            with open(path(m) + '.part', 'w', encoding='utf-8', newline='') as f:
                f.write(changed)
            os.replace(path(m) + '.part', path(m))


def unmake_all_ai():
    """Every picture assets/plates/README.txt credits to an AI generator back to git-ignored art/plates/, -2x
    copies and mentions with it, marked as having no link, its credit gone (ADR 0042: the owner re-classifies
    them with "Made with AI"). Nothing is moved if any would overwrite a picture in art/. Returns the new paths
    and the credits whose picture was no longer there."""
    path = lambda r: os.path.join(ROOT, *r.split('/'))
    stem = lambda r: r.rsplit('.', 1)[0] + '-2x.webp'
    with open(path('assets/plates/README.txt'), encoding='utf-8', newline='') as f:
        readme = f.read()
    block = re.compile(r'^(\S[^\r\n]*)\r?\n((?:[ \t]+\S[^\r\n]*(?:\r?\n|$))+)(?:\r?\n)?', re.M)
    named = list(dict.fromkeys(m.group(1) for m in block.finditer(readme) if 'AI image generator' in m.group(2)))
    here = [n for n in named if os.path.isfile(path('assets/plates/' + n))]
    gone = [n for n in named if n not in here]
    moves = []
    for n in here:
        for old, to in ((f'assets/plates/{n}', f'art/plates/{n}'), (stem(f'assets/plates/{n}'), stem(f'art/plates/{n}'))):
            if os.path.isfile(path(old)):
                if os.path.exists(path(to)):
                    raise ValueError(f'{to} is already there')
                moves.append((old, to))
    _move_mentioned(moves)
    for n in here:
        record(f'art/plates/{n}', None)
    readme = block.sub(lambda m: '' if m.group(1) in named else m.group(0), readme)
    with open(path('assets/plates/README.txt') + '.part', 'w', encoding='utf-8', newline='') as f:
        f.write(readme.rstrip() + '\n')
    os.replace(path('assets/plates/README.txt') + '.part', path('assets/plates/README.txt'))
    return [f'art/plates/{n}' for n in here], gone


def listing():
    """The picture-sources sheet's list (tools/admin/sources.html): every picture here with its entry
    ({} when none was given) and the books whose plates.json entries use it, those without a link first."""
    sources = load()
    try:
        with open(os.path.join(ROOT, 'assets', 'plates', 'plates.json'), encoding='utf-8') as f:
            plates = json.load(f)['plates']
    except (FileNotFoundError, ValueError, KeyError):
        plates = []
    out = [{'src': r, 'entry': sources.get(r, {}), 'used': sorted({p.get('book') or 'any' for p in plates if p.get('src') == r})}
           for r in pictures()]
    return sorted(out, key=lambda p: (bool(p['entry'].get('url')), p['src']))


def summary():
    sources, here = load(), pictures()
    have = set(here)
    gone = [r for r in sorted(sources) if r not in have and counts(r)]
    return {'present': len(here),
            'linked': sum(1 for r in here if (sources.get(r) or {}).get('url')),
            'nolink': sum(1 for r in here if r in sources and not sources[r].get('url')),
            'unasked': [r for r in here if r not in sources],
            'missing': [r for r in gone if sources[r].get('url')],
            'lost': [r for r in gone if not sources[r].get('url')]}


def kind(data):
    if data[:8] == b'\x89PNG\r\n\x1a\n':
        return 'image/png'
    if data[:3] == b'\xff\xd8\xff':
        return 'image/jpeg'
    if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return 'image/webp'
    if data[:4] == b'GIF8':
        return 'image/gif'
    return None


def _fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (lone-wolf art sources)', 'Accept': 'image/*,text/html;q=0.8'})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read(MAX + 1)
        if len(data) > MAX:
            raise ValueError('over 25 MB')
        return data, r.headers.get('Content-Type', '')


def get_picture(url, fetch=None):
    """The picture at a link: the file itself, or the picture a page names as its own (og:image), as
    image-sharing sites' pages do. Raises ValueError when there is none."""
    if not web(url):
        raise ValueError('the link must be an http(s) address')
    fetch = fetch or _fetch
    data, _ = fetch(url)
    if kind(data):
        return data
    m = OG.search(data[:400000].decode('utf-8', 'replace'))
    c = CONTENT.search(m.group(0)) if m else None
    if not c:
        raise ValueError('that address is neither a picture nor a page that names one')
    img = urllib.parse.urljoin(url, html.unescape(c.group(1)))
    if not web(img):
        raise ValueError('the page names a picture at an address that is not http(s)')
    data, _ = fetch(img)
    if not kind(data):
        raise ValueError('the picture the page names is not a PNG, JPEG, WebP or GIF')
    return data


def convert(data, rel):
    """As the picture sheet saves a picture: at most LONG px on its long side, in the format its name says."""
    from PIL import Image
    im = Image.open(io.BytesIO(data))
    im.load()
    k = min(1.0, LONG / max(im.size))
    if k < 1:
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    ext = rel.lower().rsplit('.', 1)[-1]
    fmt = {'jpg': 'JPEG', 'jpeg': 'JPEG', 'png': 'PNG', 'webp': 'WEBP', 'gif': 'GIF'}[ext]
    if fmt == 'JPEG' and im.mode not in ('RGB', 'L'):
        im = im.convert('RGB')
    out = io.BytesIO()
    im.save(out, fmt, **({'quality': 90} if fmt in ('JPEG', 'WEBP') else {}))
    return out.getvalue()


def fetch_missing(fetch=None):
    """Every picture in the list with a link and no file here, fetched again. 0, or 1 if any failed."""
    failed = 0
    todo = summary()['missing']
    sources = load()
    print(f'{len(todo)} picture(s) to fetch', flush=True)
    for rel in todo:
        url = sources[rel]['url']
        try:
            data = convert(get_picture(url, fetch=fetch), rel)
        except Exception as e:  # a broken link is reported, the rest still fetched
            print(f'FAILED {rel}: {url}: {e}', flush=True)
            failed = 1
            continue
        path = os.path.join(ROOT, *rel.split('/'))
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path + '.part', 'wb') as f:
            f.write(data)
        os.replace(path + '.part', path)
        print(f'wrote {rel} ({len(data) // 1024} KB)', flush=True)
    return failed


def main(argv):
    if argv == ['fetch']:
        return fetch_missing()
    if len(argv) == 3 and argv[0] == 'link':
        print(record(argv[1], argv[2]))
        return 0
    if len(argv) == 2 and argv[0] == 'ai':
        print(make_ai(argv[1]))
        return 0
    if argv == ['ai-back']:
        back, gone = unmake_all_ai()
        print(f'{len(back)} pictures back in art/plates/; {len(gone)} credits had no picture')
        return 0
    if len(argv) == 2 and argv[0] == 'nolink':
        print(record(argv[1], None))
        return 0
    if argv == ['--json']:
        print(json.dumps(summary()))
        return 0
    if argv:
        print(__doc__)
        return 2
    s = summary()
    print(f"{s['present']} pictures here: {s['linked']} with a link, {s['nolink']} with none, {len(s['unasked'])} not asked yet")
    for key, what in (('missing', 'missing, fetchable'), ('lost', 'missing, no link'), ('unasked', 'no entry')):
        for rel in s[key]:
            print(f'  {what:18} {rel}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
