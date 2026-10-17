"""The item and icon sheets' icons (tools/admin/items.html and icons.html, through serve.py's /api/admin/icons,
/api/admin/item-glyph and /api/admin/ui-glyph; docs/reference/dashboard.md).

The icons are game-icons.net glyphs in assets/icons/, credited by author in assets/icons/README.txt
(CC BY 3.0). An item's glyph is named in the file that defines it: its book's item table
(items/items-<code>.js, the ITEMS entry's `glyph`), or itemglyphs.js for the engine's own items. A
new icon is picked from https://github.com/game-icons/icons: its list and previews are kept in
data/reference/game-icons/ (git-ignored), and the one picked is saved to assets/icons/ with the black
square behind it removed, as tools/fetch_icons.py does, and credited.
"""
import json
import os
import re
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TREE = 'https://api.github.com/repos/game-icons/icons/git/trees/master?recursive=1'
RAW = 'https://raw.githubusercontent.com/game-icons/icons/master/{}.svg'
PATH = re.compile(r'[a-z0-9-]+/[a-z0-9-]+')
NAME = re.compile(r'[a-z0-9-]+')
ID = re.compile(r'[A-Za-z_]\w*')
AUTHOR = re.compile(r'  by ([^(:]+?)\s*[(:]')
PICKED = '    and picked on the item sheet (tools/admin/items.html): '


def _p(*parts):
    return os.path.join(ROOT, *parts)


def _read(path):
    with open(path, encoding='utf-8', newline='') as f:
        return f.read()


def _write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(text)


def _get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'lone-wolf-personal'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read(20 * 1024 * 1024)


def strip(svg):
    """The black square behind a game-icons.net glyph and its white fill removed: the page uses the shape as a mask."""
    return re.sub(r'<path d="M0 0h512v512H0z"\s*/>', '', svg).replace(' fill="#fff"', '')


# ---------- the credits in assets/icons/README.txt ----------

def _blocks(lines):
    """[(author slug, first line, last line)] of each "  by Author" block: its header and the indented lines under it."""
    out = []
    for i, line in enumerate(lines):
        m = AUTHOR.match(line)
        if not m:
            continue
        end = i
        while end + 1 < len(lines) and lines[end + 1].startswith('    '):
            end += 1
        out.append((m.group(1).strip().lower().replace(' ', '-'), i, end))
    return out


def credits(text):
    """{icon name: author slug} for every name listed under an author."""
    lines, got = text.splitlines(), {}
    for who, a, b in _blocks(lines):
        for line in lines[a + 1:b + 1]:
            for n in line.rsplit(':', 1)[-1].split(','):
                n = n.strip().rstrip('.')
                if NAME.fullmatch(n):
                    got.setdefault(n, who)
    return got


def credit(text, author, name):
    """text with name credited to author (a slug, as in the repository's folders): on the author's
    "picked on the item sheet" line, or a new block for an author not listed yet."""
    if credits(text).get(name) == author:
        return text
    lines = text.split('\n')
    blocks = _blocks(lines)
    mine = [b for b in blocks if b[0] == author]
    if mine:
        _, a, b = mine[0]
        at = next((i for i in range(a + 1, b + 1) if lines[i].startswith(PICKED)), None)
        if at is None:
            lines.insert(b + 1, PICKED + name)
        else:
            lines[at] += ', ' + name
    else:
        at = blocks[-1][2] + 1 if blocks else len(lines)
        display = ' '.join(w.capitalize() for w in author.split('-'))
        lines[at:at] = [f'  by {display}:', PICKED + name]
    return '\n'.join(lines)


def local():
    """Every icon in assets/icons/, with its author from the README (None where it is not credited)."""
    d = _p('assets', 'icons')
    who = credits(_read(os.path.join(d, 'README.txt')))
    names = sorted(f[:-4] for f in os.listdir(d) if f.endswith('.svg'))
    return [{'name': n, 'author': who.get(n)} for n in names]


def tables():
    """The books with an item table: their codes, from items/items-<code>.js."""
    d = _p('items')
    return sorted(m.group(1) for f in (os.listdir(d) if os.path.isdir(d) else []) if (m := re.fullmatch(r'items-([\w-]+)\.js', f)))


# ---------- game-icons.net ----------

def remote(refresh=False):
    """{fetched, paths: ['author/name', ...]}: every icon in the game-icons repository, kept after the first fetch."""
    keep = _p('data', 'reference', 'game-icons', 'tree.json')
    if os.path.isfile(keep) and not refresh:
        return json.loads(_read(keep))
    tree = json.loads(_get(TREE).decode('utf-8'))
    paths = sorted(t['path'][:-4] for t in tree.get('tree', []) if t.get('path', '').endswith('.svg') and PATH.fullmatch(t['path'][:-4]))
    got = {'fetched': time.strftime('%Y-%m-%d'), 'paths': paths}
    _write(keep, json.dumps(got))
    return got


def preview(path):
    """The glyph at author/name, its square removed, as SVG text: kept in data/reference/game-icons/."""
    if not PATH.fullmatch(path or ''):
        raise ValueError('not an author/name')
    keep = _p('data', 'reference', 'game-icons', *path.split('/')) + '.svg'
    if not os.path.isfile(keep):
        _write(keep, strip(_get(RAW.format(path)).decode('utf-8')))
    return _read(keep)


def fetch(path):
    """The icon author/name put into assets/icons/ and credited; returns the name it is saved under
    (name, or name-author where another author's icon has the name already)."""
    if not PATH.fullmatch(path or ''):
        raise ValueError('not an author/name')
    author, name = path.split('/')
    readme = _p('assets', 'icons', 'README.txt')
    text = _read(readme)
    if os.path.isfile(_p('assets', 'icons', name + '.svg')) and credits(text).get(name) != author:
        name = f'{name}-{author}'
    if os.path.isfile(_p('assets', 'icons', name + '.svg')):
        return name
    _write(_p('assets', 'icons', name + '.svg'), preview(path))
    _write(readme, credit(text, author, name))
    return name


# ---------- an item's glyph, in the file that defines it ----------

def _close(text, i):
    """The index of the brace that closes the one at text[i], past strings and comments."""
    depth, n = 0, len(text)
    while i < n:
        c = text[i]
        if c in '\'"`':
            i += 1
            while i < n and text[i] != c:
                i += 2 if text[i] == '\\' else 1
        elif text.startswith('//', i):
            i = text.find('\n', i)
            i = n if i < 0 else i
        elif text.startswith('/*', i):
            i = text.find('*/', i) + 1 or n
        elif c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return i
        i += 1
    raise ValueError('an unclosed brace')


def _block(text, head):
    """(start, end) of the object literal after head, or None."""
    at = text.find(head)
    if at < 0:
        return None
    start = text.index('{', at)
    return start, _close(text, start)


def _entry(text, item):
    """(start, end) of item's own `{...}` inside the table's ITEMS, or None."""
    b = _block(text, 'export const ITEMS = {')
    if not b:
        return None
    m = re.compile(r'^\s*' + re.escape(item) + r':\s*\{', re.M).search(text, b[0], b[1])
    if not m:
        return None
    start = m.end() - 1
    return start, _close(text, start)


def _standard(item):
    """item's glyph from the engine's own list, or '' when it is an engine item with none; None if it is not one."""
    g = _block(_read(_p('itemglyphs.js')), 'export const ITEM_GLYPH = {')
    text = _read(_p('itemglyphs.js'))
    m = re.compile(r"^\s*" + re.escape(item) + r": '([^']*)'", re.M).search(text, g[0], g[1])
    if m:
        return m.group(1)
    for f in ('core.js', 'rules-series.js'):
        path = _p('shared', f)
        t = _read(path) if os.path.isfile(path) else ''
        m = re.search(r'\b' + re.escape(item) + r":\s*\{([^{}]*)\}", t)
        if m:
            g = re.search(r"\bglyph:\s*'([^']*)'", m.group(1))
            return g.group(1) if g else ''
    return None


def home(item):
    """The file that names item's glyph, relative to the root: its book's table, or itemglyphs.js."""
    d = _p('items')
    for f in sorted(os.listdir(d)) if os.path.isdir(d) else []:
        if re.fullmatch(r'items-[\w-]+\.js', f) and _entry(_read(os.path.join(d, f)), item):
            return 'items/' + f
    return 'itemglyphs.js' if _standard(item) is not None else None


def set_glyph(item, glyph):
    """item's glyph made glyph, in the file that defines it; returns {file, was} (was: the glyph it named, or None)."""
    if not ID.fullmatch(item or '') or not NAME.fullmatch(glyph or ''):
        raise ValueError('not an item id and an icon name')
    if not os.path.isfile(_p('assets', 'icons', glyph + '.svg')):
        raise ValueError(f'no icon {glyph} in assets/icons/')
    rel = home(item)
    if not rel:
        raise ValueError(f'no item {item} in the item tables or the engine')
    path = _p(*rel.split('/'))
    text = _read(path)
    if rel == 'itemglyphs.js':
        was = _standard(item) or None
        a, b = _block(text, 'export const ITEM_GLYPH = {')
        line = f"  {item}: '{glyph}',"
        m = re.compile(r'^\s*' + re.escape(item) + r": '[^']*',?[ \t]*$", re.M).search(text, a, b)
        text = text[:m.start()] + line + text[m.end():] if m else text[:b] + line + '\n' + text[b:]
    else:
        a, b = _entry(text, item)
        body = text[a:b + 1]
        m = re.search(r"\bglyph:\s*'([^']*)'", body)
        was = m.group(1) if m else None
        if m:
            body = body[:m.start()] + f"glyph: '{glyph}'" + body[m.end():]
        else:
            k = re.search(r"\bkind:\s*'[^']*'", body)
            body = body[:k.end()] + f", glyph: '{glyph}'" + body[k.end():] if k else re.sub(r'^\{\s*', f"{{ glyph: '{glyph}', ", body)
        text = text[:a] + body + text[b + 1:]
    _write(path, text)
    return {'file': rel, 'was': was}


# ---------- the player's other glyphs, in glyphs.js (the icon sheet, tools/admin/icons.html) ----------

UI_LISTS = ('DISC_GLYPH', 'UI_GLYPH', 'KIND_GLYPH')


def set_ui_glyph(name, key, glyph):
    """key's glyph in glyphs.js's list name made glyph; returns {file, was}. Only an entry already there:
    a new place to draw an icon is added in the code, not from the sheet."""
    if name not in UI_LISTS:
        raise ValueError(f'{name} is not a list of glyphs')
    if not ID.fullmatch(key or '') or not NAME.fullmatch(glyph or ''):
        raise ValueError('not a key and an icon name')
    if not os.path.isfile(_p('assets', 'icons', glyph + '.svg')):
        raise ValueError(f'no icon {glyph} in assets/icons/')
    path = _p('glyphs.js')
    text = _read(path)
    a, b = _block(text, f'export const {name} = {{')
    m = re.compile(r'^(\s*' + re.escape(key) + r": ')([^']*)'", re.M).search(text, a, b)
    if not m:
        raise ValueError(f'no entry {key} in {name}')
    _write(path, text[:m.start(2)] + glyph + text[m.end(2):])
    return {'file': 'glyphs.js', 'was': m.group(2)}
