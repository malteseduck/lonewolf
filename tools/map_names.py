"""Check a map's label wordings against the place names in the books' own text (step 3's Check names).

Run (from the project root):
  uv run --project tools python tools/map_names.py <maps/<book>/labels.json> <work/map-names.json> [--books data/projectaon]

The index is built afresh on each run, in memory, from every downloaded book's book.js and its
.htm pages (front matter, footnotes) under --books, and from the other maps' label lists the owner
has checked (labels-checked.txt). Nothing made from the text is written but the result, which goes
in the book's git-ignored work/ folder.

Each label's wording (case, hyphens and a leading "the" ignored) is one of:
  name     the whole wording is in the text, or on another checked map
  words    every word is in the text, but not together (often a map-only name)
  near     some word is not, and is close to one that is: suggest holds the wording mended, best first
  unknown  some word is not, and nothing is close: an OCR misread, or a name found only on the map
Numbers are not judged, and the map abbreviations in ABBREVIATIONS count as words. A label whose
"named" holds its present wording (the editor's Right as it is) is a name. Close means alike after
reading a digit as the letter OCR confuses it with (0 O, 1 I, 2 Z, 5 S, 8 B), by difflib's ratio,
for words of four letters or more; only words the books capitalise mid-sentence at least half the
times they print them, or other checked maps hold, are suggested, so a name found only on the map is not "mended" into a common word.

It prints the counts and the indexes of the labels to look at, not their wordings.
"""
import difflib
import html
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORD = re.compile(r"[^\W_]+(?:['’][^\W_]+)*")
TAG = re.compile(r'<[^>]+>')
SHAPES = str.maketrans({'0': 'o', '1': 'i', '2': 'z', '3': 'e', '4': 'a', '5': 's', '6': 'g', '7': 't', '8': 'b', '|': 'i'})
CUTOFF = 0.72
# shortened words the printed maps letter beside names (Books 3-12's lists)
ABBREVIATIONS = {'mt', 'mts', 'mtn', 'mtns', 'r', 'st', 'is', 'n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'}
OPENS = re.compile('(^|[.!?:;]["“”‘’\']?)\\s*$')  # what goes before a sentence's first word


def words(text):
    return [w.replace('’', "'").lower() for w in WORD.findall(text)]


def strings(v):
    if isinstance(v, str):
        yield v
    elif isinstance(v, dict):
        for x in v.values():
            yield from strings(x)
    elif isinstance(v, list):
        for x in v:
            yield from strings(x)


def book_texts(folder):
    """The plain text of one book folder: book.js's strings and every .htm page, tags dropped."""
    out = []
    js = folder / 'book.js'
    if js.is_file():
        t = js.read_text(encoding='utf-8')
        try:
            out += strings(json.loads(t[t.index('{', t.index('BOOKS || {}') + 11):t.rindex('}') + 1]))
        except ValueError:
            out.append(t)
    for f in sorted(folder.glob('*.htm')):
        out.append(f.read_text(encoding='utf-8', errors='replace'))
    return [html.unescape(TAG.sub(' ', s)) for s in out]


def label_wording(lab):
    return ' '.join(lab.get('lines') or [lab.get('text', '')])


def build_index(books_root, labels_file):
    """{'words': Counter, 'text': ' every word of the books ', 'phrases': set of other maps' wordings}."""
    count, names, chunks, phrases = Counter(ABBREVIATIONS), Counter(), [], set()
    for folder in sorted(Path(books_root).iterdir()):
        if folder.is_dir():
            for s in book_texts(folder):
                w = words(s)
                count.update(w)
                chunks.append(' '.join(w))
                for m in WORD.finditer(s):  # capitalised mid-sentence: a name, or part of one
                    if m.group()[0].isupper() and not OPENS.search(s[max(0, m.start() - 4):m.start()]):
                        names[m.group().replace('’', "'").lower()] += 1
    own = Path(labels_file).resolve().parent
    for f in own.parent.glob('*/labels.json'):
        if f.parent == own or not (f.parent / 'labels-checked.txt').is_file():
            continue
        try:
            for lab in json.loads(f.read_text(encoding='utf-8')):
                w = words(label_wording(lab))
                count.update(w)
                names.update({x: count[x] for x in w})  # a word on a checked map counts as a name
                phrases.add(' '.join(strip_the(w)))
        except (OSError, ValueError):
            continue
    return {'words': count, 'text': ' ' + ' \n '.join(chunks) + ' ', 'phrases': phrases - {''},
            'long': sorted({w for w, n in names.items() if len(w) >= 3 and not w.isdigit() and 2 * n >= count[w]})}


def strip_the(ws):
    return ws[1:] if len(ws) > 1 and ws[0] == 'the' else ws


def near(w, idx):
    """Words of the books close to w, best first."""
    count = idx['words']
    s = w.translate(SHAPES)
    if s != w and s in count:
        return [s]
    if len(w) < 4:
        return []
    pool = [x for x in idx['long'] if abs(len(x) - len(s)) <= 3]
    scored = [(difflib.SequenceMatcher(None, s, x).ratio(), count[x], x) for x in pool if x != w]
    return [x for r, _, x in sorted(scored, reverse=True) if r >= CUTOFF][:3]


def in_case(cand, like):
    if like.isupper():
        return cand.upper()
    if like[:1].isupper():
        return cand.capitalize()
    return cand


def known(ws, idx):
    p = ' '.join(strip_the(ws))
    return p in idx['phrases'] or f' {p} ' in idx['text']


def check(text, idx):
    """{'status', 'suggest', 'unknown'} for one wording, or None when there is nothing to judge."""
    spans = [(m.start(), m.end(), m.group()) for m in WORD.finditer(text)]
    ws = [s[2].replace('’', "'").lower() for s in spans]
    if not ws or all(w.isdigit() for w in ws):
        return None
    if known(ws, idx):
        return {'status': 'name', 'suggest': [], 'unknown': []}
    bad = [i for i, w in enumerate(ws) if w not in idx['words'] and not w.isdigit()]
    if not bad:
        return {'status': 'words', 'suggest': [], 'unknown': []}
    cands = {i: near(ws[i], idx) for i in bad}

    def mend(pick):  # the wording with each bad word replaced by its pick, in the label's own case
        out, at = '', 0
        for i, (a, b, orig) in enumerate(spans):
            out += text[at:a] + (in_case(pick[i], orig) if i in pick else orig)
            at = b
        return out + text[at:]

    first = {i: c[0] for i, c in cands.items() if c}
    tries = [first] + [{**first, i: c} for i in bad for c in cands[i][1:]] if first else []
    seen, suggest = set(), []
    for pick in tries:
        m = mend(pick)
        if m not in seen:
            seen.add(m)
            suggest.append((not known(words(m), idx), len(suggest), m))  # wordings the books hold first
    return {'status': 'near' if suggest else 'unknown', 'suggest': [m for _, _, m in sorted(suggest)][:3],
            'unknown': [spans[i][2] for i in bad]}


def main():
    args = sys.argv[1:]
    books = ROOT / 'data' / 'projectaon'
    if '--books' in args:
        k = args.index('--books')
        books = Path(args[k + 1])
        del args[k:k + 2]
    if len(args) != 2:
        sys.exit(__doc__)
    labels_file, out = Path(args[0]), Path(args[1])
    labels = json.loads(labels_file.read_text(encoding='utf-8'))
    idx = build_index(books, labels_file)
    res = []
    for i, lab in enumerate(labels):
        wording = label_wording(lab)
        r = check(wording, idx)
        if r and lab.get('named') == wording:  # the owner's Right as it is
            r = {'status': 'name', 'suggest': [], 'unknown': [], 'named': True}
        if r:
            res.append({'i': i, 'text': lab.get('text', ''), 'wording': wording, **r})
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({'labels': res}, indent=1, ensure_ascii=False), encoding='utf-8')
    by = Counter(r['status'] for r in res)
    print(f"{len(res)} labels checked against {len(idx['words'])} words of the books: "
          + ', '.join(f'{by[s]} {s}' for s in ('name', 'words', 'near', 'unknown')))
    for s in ('near', 'unknown'):
        if by[s]:
            print(f'{s}: ' + ' '.join(str(r['i']) for r in res if r['status'] == s))


if __name__ == '__main__':
    main()
