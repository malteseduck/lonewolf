"""assets/plates/plates.json, read and written the way it is laid out (one entry per line, so a change
is a one-line diff), and the owner's own fight pictures put in from the picture sheet
(tools/admin/fights.html, through serve.py's POST /api/admin/plate; docs/reference/items.md).

An owner's entry is for one enemy of one book: `match` is that name, escaped and anchored, `book`
is set, and it sits at the top of the list, so it wins over every broader entry. Its picture is
art/plates/<book>/<slug>.webp (git-ignored), or, for a re-crop, the picture the enemy had before
(the book's own illustration, or another entry's file).
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLATES = os.path.join(ROOT, 'assets', 'plates', 'plates.json')
FIRST = ('match', 'book', 'src', 'crop', 'levels', 'over')


def load_plates():
    with open(PLATES, encoding='utf-8') as f:
        return json.load(f)


def _entry(e):
    keys = [k for k in FIRST if k in e] + [k for k in e if k not in FIRST]
    return '{ ' + ', '.join(f'{json.dumps(k)}: {json.dumps(e[k], ensure_ascii=False)}' for k in keys) + ' }'


def dump_plates(data):
    head = [f'  {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)},' for k, v in data.items() if k != 'plates']
    rows = [f'    {_entry(e)}' for e in data['plates']]
    return '{\n' + '\n'.join(head) + '\n  "plates": [\n' + ',\n'.join(rows) + '\n  ]\n}\n'


def save_plates(data):
    tmp = PLATES + '.part'
    with open(tmp, 'w', encoding='utf-8', newline='\n') as f:
        f.write(dump_plates(data))
    os.replace(tmp, PLATES)


def anchored(name):
    """The name as a match that fits it alone. Only regex syntax is escaped (re.escape would also
    escape spaces), the same as fights.html's anchored(), so the page finds the entry again."""
    return '^' + re.sub(r'([.^$*+?()\[\]{}|\\/])', r'\\\1', name.lower()) + '$'


def slug(name):
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')[:60] or 'enemy'


def _fits(p, code, name):
    try:
        return (not p.get('book') or p['book'] == code) and re.search(p['match'], name, re.I)
    except re.error:
        return False


def book_art(book, name):
    """The book's own picture for an enemy (the importer's art), or None."""
    for s in book['sections'].values():
        for e in s.get('combat', {}).get('enemies', []):
            if e['name'] == name and e.get('art'):
                return e['art']
    return None


def enemy_names(book):
    return {e['name'] for s in book['sections'].values() for e in s.get('combat', {}).get('enemies', [])}


def current(plates, code, book, name):
    """What the player shows for this enemy now (main.js nextFoe()): (src, entry or None)."""
    art = book_art(book, name)
    lib = next((p for p in plates if p.get('over') and _fits(p, code, name)), None) or (
        None if art else next((p for p in plates if _fits(p, code, name)), None))
    if lib:
        return lib['src'], lib
    return (f'data/projectaon/{code}/{art}' if art else None), None


IMG = ('.png', '.jpg', '.jpeg', '.webp')
# not stand-ins: the map symbols, split into hundreds of fragments, and the symbol packs
SKIP_DIRS = {'map-symbols', 'symbol-packs', 'work', 'node_modules'}
MIN_BYTES = 20 * 1024  # smaller files are icons and fragments, too low to make a plate


def standins():
    """Every picture a fight can borrow, for the picture sheet's picker: [{src, group, size}], a book
    picture also with shows and near (enemies fought within two links) from data/projectaon/ill-index.json.
    Groups: 'library' (assets/plates), 'yours' (art/plates), 'book <code>' (a book's illustrations,
    not its small ones or its maps), 'art' (the owner's borrowed art and reference images)."""
    out = []

    def walk(rel, group, keep=lambda n: True):
        top = os.path.join(ROOT, *rel.split('/'))
        for dp, dns, fns in os.walk(top):
            dns[:] = sorted(d for d in dns if d not in SKIP_DIRS)
            for fn in sorted(fns):
                if not fn.lower().endswith(IMG) or not keep(fn):
                    continue
                size = os.path.getsize(os.path.join(dp, fn))
                if size < MIN_BYTES:
                    continue
                r = os.path.relpath(os.path.join(dp, fn), ROOT).replace(os.sep, '/')
                out.append({'src': r, 'group': group(r) if callable(group) else group, 'size': size})

    walk('assets/plates', 'library')
    walk('art/plates', 'yours')
    pa = os.path.join(ROOT, 'data', 'projectaon')
    if os.path.isdir(pa):
        for code in sorted(os.listdir(pa)):
            if os.path.isdir(os.path.join(pa, code)):
                for fn in sorted(os.listdir(os.path.join(pa, code))):
                    if re.fullmatch(r'ill\d+\.(png|jpe?g|webp)', fn, re.I):
                        out.append({'src': f'data/projectaon/{code}/{fn}', 'group': 'book ' + code,
                                    'size': os.path.getsize(os.path.join(pa, code, fn))})
    for rel in ('art', 'data/reference'):
        if os.path.isdir(os.path.join(ROOT, *rel.split('/'))):
            walk(rel, 'art')
    first = {}
    for o in out:  # art/plates is walked twice: the first group wins
        first.setdefault(o['src'], o)
    # what each book picture shows and the fights near it, from tools/ill_index.py, if it has been run
    idx = os.path.join(pa, 'ill-index.json')
    if os.path.exists(idx):
        with open(idx, encoding='utf-8') as f:
            index = json.load(f)
        for key, v in index.items():
            o = first.get('data/projectaon/' + key)
            if o:
                o['shows'] = v['shows']
                o['near'] = sorted({e for n in v['near'] for e in n['enemies']} - set(v['fight']))
    return list(first.values())


def stand_in_ok(src):
    """src is a picture a fight may borrow: an existing image file under assets/, art/ or data/."""
    if not isinstance(src, str) or '..' in src.split('/') or '\\' in src or src.startswith('/'):
        return False
    if src.split('/')[0] not in ('assets', 'art', 'data') or not src.lower().endswith(IMG):
        return False
    return os.path.isfile(os.path.join(ROOT, *src.split('/')))


def put(code, book, name, image=None, crop=None, levels=None, remove=False, src=None):
    """Write (or remove) the owner's entry for one enemy. image: WebP bytes, or None to keep the
    picture it has; src: instead, a picture already on disk to stand in (see standins()).
    Returns (entry or None, message). Raises ValueError for a bad request."""
    if name not in enemy_names(book):
        raise ValueError('no enemy of that name in the book')
    data = load_plates()
    plates = data['plates']
    want = anchored(name)
    mine = next((i for i, p in enumerate(plates) if p.get('book') == code and p.get('match') == want), None)
    folder = f'art/plates/{code}/'
    if remove:
        if mine is None:
            raise ValueError('there is no picture of yours for that enemy')
        old = plates.pop(mine)
        save_plates(data)
        src = old.get('src', '')
        if src.startswith(folder) and not any(p.get('src') == src for p in plates):
            try:
                os.remove(os.path.join(ROOT, *src.split('/')))
            except OSError:
                pass
        return None, 'removed'
    if crop is not None:
        if not (isinstance(crop, list) and len(crop) == 4 and all(isinstance(v, (int, float)) for v in crop)):
            raise ValueError('crop must be [x, y, w, h]')
        x, y, w, h = (min(1.0, max(0.0, float(v))) for v in crop)
        w, h = min(w, 1 - x), min(h, 1 - y)
        if w < 0.02 or h < 0.02:
            raise ValueError('crop too small')
        tidy = lambda v: int(v) if v == int(v) else round(v, 4)  # 0, not 0.0
        crop = None if (x, y, w, h) == (0, 0, 1, 1) else [tidy(round(v, 4)) for v in (x, y, w, h)]
    if levels is not None:
        if not (isinstance(levels, list) and len(levels) == 2 and all(isinstance(v, (int, float)) for v in levels) and 0 <= levels[0] < levels[1] <= 255):
            raise ValueError('levels must be [black, white], 0-255, black below white')
        levels = [int(levels[0]), int(levels[1])]
    if src is not None:
        if image is not None:
            raise ValueError('give a picture or a stand-in, not both')
        if not stand_in_ok(src):
            raise ValueError('that stand-in is not a picture under assets/, art/ or data/')
        if mine is not None:  # the owner's file it replaces, if nothing else uses it
            old = plates[mine].get('src', '')
            if old != src and old.startswith(folder) and not any(p.get('src') == old for i, p in enumerate(plates) if i != mine):
                try:
                    os.remove(os.path.join(ROOT, *old.split('/')))
                except OSError:
                    pass
    elif image is not None:
        if not (image[:4] == b'RIFF' and image[8:12] == b'WEBP'):
            raise ValueError('the picture must be WebP')
        src = folder + slug(name) + '.webp'
        os.makedirs(os.path.join(ROOT, 'art', 'plates', code), exist_ok=True)
        path = os.path.join(ROOT, *src.split('/'))
        with open(path + '.part', 'wb') as f:
            f.write(image)
        os.replace(path + '.part', path)
    elif mine is not None:
        src = plates[mine]['src']
    else:
        src, _ = current(plates, code, book, name)
        if not src:
            raise ValueError('that enemy has no picture yet: drop one on its card')
    entry = {'match': want, 'book': code, 'src': src}
    if crop:
        entry['crop'] = crop
    if levels:
        entry['levels'] = levels
    others = [p for i, p in enumerate(plates) if i != mine]
    # over: needed where the book has its own picture, or another "over" entry would otherwise win
    if book_art(book, name) or any(p.get('over') and _fits(p, code, name) for p in others):
        entry['over'] = True
    if mine is not None:
        plates[mine] = entry
    else:
        plates.insert(0, entry)  # the top of the book entries: narrowest first
    save_plates(data)
    return entry, 'saved'
