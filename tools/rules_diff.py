"""Step 4's rules diff (ADR 0036): a book's rules pages against the previous book's, page by page and
paragraph by paragraph, and a skeleton addendum for docs/reference/rules-books.md.

    python tools/rules_diff.py <code>          # prints the figures: pages, paragraph numbers, numbers moved
    python tools/rules_diff.py <code> --json   # also writes, beside the book (git-ignored):
        rules-diff.json   the figures, for the dashboard
        rules-diff.txt    the changed and new paragraphs, old and new, for the agent to read
        rules-draft.md    the skeleton addendum: what reads with certainty, the rest todo

A paragraph is a block of the page's article (heading, paragraph, list item, definition). Paragraphs
the two books share word for word are "same"; one whose words mostly match is "changed", with the
numbers that moved (digits and number words); the others are "new" (numbered on this book's page) or
"gone" (numbered on the previous book's). The footnotes and errata are the book's own, so they are
not compared: the draft lists the footnotes' sections. What the skeleton reads, only where the page
has its usual shape: the starting gold (a Random Number plus N, in the Gold Crowns paragraph), the
kit (the list before "List the N items you choose") and the footnotes' section ids. Everything else,
and every Engine line, is a todo for the agent (Copy prompt) and the owner.

Page names, paragraph numbers and figures only on the console, never the books' text.
"""
import difflib
import html
import json
import os
import re
import sys

from book_status import CATALOGUE, SERIES

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data', 'projectaon')
# the pages compared, in the order printed (tools/fetch_projectaon.py RULES, less the book's own two)
PAGES = ['gamerulz.htm', 'discplnz.htm', 'equipmnt.htm', 'cmbtrulz.htm', 'levels.htm', 'lorecrcl.htm', 'imprvdsc.htm',
         'kaiwisdm.htm', 'crsumary.htm', 'crtable.htm', 'random.htm']
OWN = ['footnotz.htm', 'errata.htm']
WORDS = {w: i for i, w in enumerate('zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen '
                                     'fifteen sixteen seventeen eighteen nineteen'.split())}
WORDS.update({'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50, 'hundred': 100})
SAME_ENOUGH = 0.6  # a paragraph whose words match this much is the old one changed, not a new one


def blocks(code, name):
    """The page's blocks as text, or None when the book has no such page."""
    try:
        with open(os.path.join(DATA, code, name), encoding='utf-8', errors='replace') as f:
            t = f.read()
    except OSError:
        return None
    a = t[t.find('<article'):t.find('</article')] if '<article' in t else t
    out = []
    for tag, attrs, inner in re.findall(r'<(p|li|h\d|dt|dd)\b([^>]*)>(.*?)</\1>', a, re.S):
        if 'navigation' in attrs:
            continue
        s = ' '.join(html.unescape(re.sub(r'<[^>]+>', ' ', inner)).split())
        s = re.sub(r'\s+([.,;:)])', r'\1', s).replace('( ', '(')
        if s:
            out.append(s)
    return out


def numbers(s):
    """The numbers a paragraph states, in order: digits and number words (twenty-five is 25)."""
    out = []
    for m in re.finditer(r'\d+|[A-Za-z]+(?:-[A-Za-z]+)?', s):
        w = m.group().lower()
        if w.isdigit():
            out.append(w)
            continue
        parts = w.split('-')
        if all(p in WORDS for p in parts) and (len(parts) == 1 or WORDS[parts[0]] >= 20):
            out.append(str(sum(WORDS[p] for p in parts)))
    return out


def similar(a, b):
    return difflib.SequenceMatcher(None, a.split(), b.split()).ratio()


def compare(old, new):
    """Paragraph by paragraph: same count, changed [{p, was, now}], new [p] and gone [p], 1-based."""
    res = {'same': 0, 'changed': [], 'new': [], 'gone': [], 'pairs': []}
    sm = difflib.SequenceMatcher(None, old, new, autojunk=False)
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == 'equal':
            res['same'] += i2 - i1
            continue
        # pair each new paragraph with the first old one after the last pair that it mostly matches
        i = i1
        for j in range(j1, j2):
            k = next((k for k in range(i, i2) if similar(old[k], new[j]) >= SAME_ENOUGH), None)
            if k is None:
                res['new'].append(j + 1)
                continue
            res['gone'] += [x + 1 for x in range(i, k)]
            was, now = numbers(old[k]), numbers(new[j])
            res['changed'].append({'p': j + 1, 'was': [n for n in was if n not in now or was.count(n) > now.count(n)],
                                   'now': [n for n in now if n not in was or now.count(n) > was.count(n)]})
            res['pairs'].append((k, j))
            i = k + 1
        res['gone'] += [x + 1 for x in range(i, i2)]
    return res


def read_draft(code):
    """What the skeleton can read with certainty from the book's own pages."""
    eq = blocks(code, 'equipmnt.htm') or []
    gold = None
    for s in eq:
        m = re.search(r'Random Number Table\.?\s*(?:Now\s+)?(?:and\s+)?add (\w+) to', s, re.I)
        if m and 'Gold Crown' in s and numbers(m.group(1)):
            gold = int(numbers(m.group(1))[0])
            break
    choose, kit = None, []
    for i, s in enumerate(eq):
        m = re.match(r'List the (\w+) items? (?:that )?you (?:choose|select)', s)
        if m and numbers(m.group(1)):
            choose = int(numbers(m.group(1))[0])
            item = lambda s2: re.match(r'[^()]+ \((?:Weapons?|Backpack Items?|Special Items?|Meals?)\)', s2)
            # the list just above it (a note about the earlier book's weapons may stand between): items
            # written "Name (Weapons)", the first words before the bracket
            end = i - 1 if i > 1 and not item(eq[i - 1]) and item(eq[i - 2]) else i
            j = end
            while j > 0 and item(eq[j - 1]):
                j -= 1
            kit = [re.match(r'([^()]+) \(', s2).group(1).strip() for s2 in eq[j:end]]
            break
    foot = []
    try:
        with open(os.path.join(DATA, code, 'footnotz.htm'), encoding='utf-8', errors='replace') as f:
            for n in re.findall(r'href="sect(\d+)\.htm', f.read()):
                if int(n) not in foot:
                    foot.append(int(n))
    except OSError:
        pass
    return {'gold': gold, 'choose': choose, 'kit': kit, 'footnotes': foot}


def diff(code, against):
    pages, look, texts = {}, 0, []
    for name in PAGES:
        new, old = blocks(code, name), blocks(against, name) if against else None
        if new is None and old is None:
            continue
        if new is None:
            pages[name] = {'state': 'gone', 'paragraphs': len(old)}
            continue
        if old is None:
            pages[name] = {'state': 'new', 'paragraphs': len(new), 'same': 0, 'changed': [], 'new': list(range(1, len(new) + 1)), 'gone': []}
            look += len(new)
            texts.append((name, [(None, None, j + 1, s) for j, s in enumerate(new)]))
            continue
        c = compare(old, new)
        pairs = c.pop('pairs')
        state = 'same' if not (c['changed'] or c['new'] or c['gone']) else 'changed'
        pages[name] = {'state': state, 'paragraphs': len(new), **c}
        look += len(c['changed']) + len(c['new'])
        if state == 'changed':
            rows = [(k + 1, old[k], j + 1, new[j]) for k, j in pairs]
            rows += [(None, None, p, new[p - 1]) for p in c['new']] + [(p, old[p - 1], None, None) for p in c['gone']]
            texts.append((name, sorted(rows, key=lambda r: r[2] if r[2] else r[0])))
    own = {n: len(blocks(code, n) or []) for n in OWN}
    return {'book': code, 'against': against, 'look': look, 'pages': pages,
            'newPages': [n for n, p in pages.items() if p['state'] == 'new'],
            'gonePages': [n for n, p in pages.items() if p['state'] == 'gone'],
            'own': own, 'draft': read_draft(code), 'texts': texts}


def report(out):
    lines = [f"{out['book']} against {out['against'] or 'nothing (the first book)'}: "
             f"{out['look']} paragraph{'s' * (out['look'] != 1)} to read"]
    for name, p in out['pages'].items():
        if p['state'] in ('same', 'gone', 'new'):
            lines.append(f"  {name:13} {p['state']}" + (f", {p['paragraphs']} paragraphs" if p['state'] != 'same' else ''))
            continue
        moved = [f"{c['p']} ({','.join(c['was']) or '-'} > {','.join(c['now']) or '-'})" if c['was'] or c['now'] else str(c['p'])
                 for c in p['changed']]
        lines.append(f"  {name:13} {p['same']} same, {len(p['changed'])} changed" + (f": {'; '.join(moved)}" if moved else '')
                     + (f"; {len(p['new'])} new: {', '.join(map(str, p['new']))}" if p['new'] else '')
                     + (f"; {len(p['gone'])} gone" if p['gone'] else ''))
    d = out['draft']
    lines.append(f"  draft: gold {d['gold'] if d['gold'] is not None else 'todo'}, kit "
                 + (f"choose {d['choose']} of {len(d['kit'])}" if d['choose'] else 'todo')
                 + f", {len(d['footnotes'])} footnoted sections; {out['own'].get('errata.htm', 0)} errata paragraphs")
    return '\n'.join(lines)


def skeleton(out, n, title):
    d, series = out['draft'], SERIES(n).title()
    lines = [f'### Book {n}, {title} ({series})', '',
             f"todo: read from the rules diff against {out['against'] or 'nothing'} (rules-diff.txt): every changed or new "
             'paragraph below is in our words, numbers as printed, and nothing is "as Book N".', '']
    if out['newPages'] or out['gonePages']:
        lines.append(f"- **Pages**: new {', '.join(out['newPages']) or 'none'}; not in this book {', '.join(out['gonePages']) or 'none'}. todo")
    lines.append('- **Scores**: todo (gamerulz.htm). *Engine*: todo.')
    lines.append(f"- **Gold**: {d['gold']} + a Random Number, added to any he carries. *Engine*: todo (`LW.KITS[{n}]`)."
                 if d['gold'] is not None else '- **Gold**: todo. *Engine*: todo.')
    lines.append(f"- **Kit**: todo (what he is given). Choose any **{d['choose']}** of: {', '.join(d['kit'])}; todo (Special Items, "
                 f"doses, Arrows). *Engine*: todo (`LW.KITS[{n}]`)." if d['choose'] and d['kit'] else '- **Kit**: todo. *Engine*: todo.')
    if 'imprvdsc.htm' in out['pages'] and out['pages']['imprvdsc.htm']['state'] in ('new', 'changed'):
        lines.append('- **Improved Disciplines introduced**: todo (imprvdsc.htm). *Engine*: todo.')
    for name, p in out['pages'].items():
        if name not in ('gamerulz.htm', 'equipmnt.htm', 'imprvdsc.htm') and p['state'] in ('new', 'changed'):
            lines.append(f"- todo: {name}, paragraphs {', '.join(map(str, sorted({c['p'] for c in p['changed']} | set(p['new']))))}.")
    lines.append(f"- **Footnotes**: todo, one ruling each ({', '.join(map(str, d['footnotes']))}). *Engine*: todo."
                 if d['footnotes'] else '- **Footnotes**: none.')
    return '\n'.join(lines) + '\n'


def reading(out):
    """The changed and new paragraphs, old above new, for the agent: kept beside the book (git-ignored)."""
    parts = [f"Rules diff, {out['book']} against {out['against'] or 'nothing'} (tools/rules_diff.py)."]
    for name, rows in out['texts']:
        parts.append(f'\n=== {name}')
        for op, old, np_, new in rows:
            if old is not None and new is not None:
                parts.append(f'\n[changed: was {op}, now {np_}]\n- {old}\n+ {new}')
            elif new is not None:
                parts.append(f'\n[new {np_}]\n+ {new}')
            else:
                parts.append(f'\n[gone {op}]\n- {old}')
    return '\n'.join(parts) + '\n'


def main(argv):
    args = [a for a in argv if not a.startswith('--')]
    if not args:
        print(__doc__)
        return 2
    code = args[0]
    at = next((i for i, (c, _) in enumerate(CATALOGUE) if c == code), None)
    if not any(blocks(code, p) is not None for p in PAGES):
        print(f'{code}: no rules pages (fetch them first)')
        return 1
    against = CATALOGUE[at - 1][0] if at else None
    out = diff(code, against)
    print(report(out))
    if '--json' in argv:
        d = os.path.join(DATA, code)
        with open(os.path.join(d, 'rules-diff.json'), 'w', encoding='utf-8') as f:
            json.dump({k: v for k, v in out.items() if k != 'texts'}, f, indent=1)
        with open(os.path.join(d, 'rules-diff.txt'), 'w', encoding='utf-8') as f:
            f.write(reading(out))
        n, title = (at + 1, CATALOGUE[at][1]) if at is not None else (0, code)
        with open(os.path.join(d, 'rules-draft.md'), 'w', encoding='utf-8') as f:
            f.write(skeleton(out, n, title))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
