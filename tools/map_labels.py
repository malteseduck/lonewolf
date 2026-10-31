"""Draft a map's label list, and check a repaint's labels against it.

Run (from the project root):
  uv run --project tools python tools/map_labels.py draft <map-2k.png> <maps/<book>/labels.json>
  uv run --project tools python tools/map_labels.py check <maps/<book>/labels.json> <aligned.png> [<map-2k.png>]
  uv run --project tools python tools/map_labels.py prompt <maps/<book>/labels.json> <prompt.txt> [--lettered]
  uv run --project tools python tools/map_labels.py retype <maps/<book>/labels.json>

draft: OCR finds each label's box and guesses its wording: PaddleOCR (map_ocr_paddle.py, in
tools/.venv-paddle) when that venv exists, else EasyOCR. The guesses are only a start:
correct every wording by eye and add what it missed (docs/reference/map-upscale.md, step 2).
Entries are {"text", "box": [x0, y0, x1, y1], "conf", "retype"}. "retype" is ticked on every read
except those captions() finds are not place names: worded like a label another book's list keeps
as drawn, holding a caption word (map, being, banner, arms, key, scale, miles), a title's other
lines stacked on one, and the key's entries in line with those recurring in other keys.
retype: the same on the corrected list (step 3's "Untick captions"): unticks, never ticks.
The corrected list drops "conf" and adds "where" (the label's place in words, for the prompt) and
"small" (hand-lettered names OCR cannot read; check reports them for a look by eye instead of
diffing them).
prompt: writes the Gemini prompt (step 3) from the corrected list, for the owner to paste.
check: OCRs <aligned.png> (map_check.py's repaint, warped onto map-2k.png, so boxes line up),
matches each listed label to the read text overlapping its box, and prints every one that reads
differently or is missing, and any text read where no label is listed. It prints label numbers
and wordings, which are the map's place names: keep them out of chat beyond what a fix needs.
The OCR is a hint only (it misreads the faithful map too). Given <map-2k.png>, check also writes
labels.png beside <aligned.png>: every label, faithful beside repaint, for the real check by eye.
"""
import difflib
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import cv2
import numpy as np

MODELS = Path(__file__).parent.parent / 'data' / 'models' / 'easyocr'
PADDLE = Path(__file__).parent / '.venv-paddle' / 'Scripts' / 'python.exe'


def ocr(path):
    if PADDLE.exists():  # far better on slanted and hand-lettered names (Book 4)
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / 'reads.json'
            subprocess.run([str(PADDLE), str(Path(__file__).parent / 'map_ocr_paddle.py'), str(path), str(out)],
                           check=True)
            return json.loads(out.read_text(encoding='utf-8'))
    import easyocr
    r = easyocr.Reader(['en'], model_storage_directory=str(MODELS), download_enabled=False, verbose=False)
    im = cv2.imdecode(np.fromfile(str(path), np.uint8), cv2.IMREAD_COLOR)
    out = []
    # rotation_info catches labels set along a river or coast at a steep angle
    for quad, text, conf in r.readtext(im, rotation_info=[90, 270]):
        xs, ys = [p[0] for p in quad], [p[1] for p in quad]
        out.append({'text': text.strip(), 'box': [int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys))],
                    'conf': round(float(conf), 2)})
    return out


def norm(text):
    return ''.join(c for c in text.upper() if c.isalnum())


def kept_elsewhere(labels_file, skip=()):
    """Wordings other books' lists keep as drawn: the key and captions recur from map to map. A name
    that is a place on one map and a caption on another stays ticked, and so does one kept on a
    single other map: Book 5's key has an Oasis, Book 4's map a place of that name. Books sharing one
    map (1 and 2) count once. skip: folders to leave out."""
    maps, places = {}, set()
    for f in Path(labels_file).resolve().parent.parent.glob('*/labels.json'):
        if f.parent == Path(labels_file).resolve().parent or f.parent.name in skip:
            continue
        try:
            text = f.read_text(encoding='utf-8')
            labels = json.loads(text)
        except (OSError, ValueError):
            continue
        for lab in labels:
            t = norm(' '.join(lab.get('lines') or [lab.get('text', '')]))
            if lab.get('retype'):
                places.add(t)
            else:
                maps.setdefault(t, set()).add(text)
    return {t for t, m in maps.items() if len(m) >= 2} - places - {''}


# Words no place name on Books 1-12's maps holds: the title's "A map of ... being ...", the panels'
# banners and arms, the key and the scale
CAPTION_WORDS = {'MAP', 'BEING', 'BANNER', 'ARMS', 'KEY', 'LEGEND', 'SCALE', 'MILES', 'LEAGUES'}


def wording(lab):
    return ' '.join(lab.get('lines') or [lab.get('text', '')]).upper()


def stacked(a, b):
    """b sits directly above or below a, as the next line of one caption: overlapping across by half
    the narrower and the gap between them under half the smaller line's height."""
    (ax0, ay0, ax1, ay1), (bx0, by0, bx1, by1) = a['box'], b['box']
    across = min(ax1, bx1) - max(ax0, bx0)
    gap = max(by0 - ay1, ay0 - by1)
    line = min((ay1 - ay0) / len(a.get('lines') or [1]), (by1 - by0) / len(b.get('lines') or [1]))
    return across >= 0.5 * min(ax1 - ax0, bx1 - bx0) and -0.2 * line <= gap <= 0.5 * line


def captions(labels, kept):
    """The labels that are not place names, {index: why}: the ones the draft leaves unticked (D8,
    ADR 0036). Certain readings only; what it misses (a title with none of CAPTION_WORDS, a panel's
    picture caption) is left ticked for the owner. Scale numbers are not judged: most lists retype
    them."""
    why = {}
    for i, lab in enumerate(labels):
        t = wording(lab)
        ws = {norm(w) for w in t.split()}
        if norm(t).isdigit():
            continue
        # "A map of ... being ...", "... & the Darklands": the title (read back by style_draft)
        if ws & {'MAP', 'BEING'} or t.lstrip().startswith(('&', 'AND ')):
            why[i] = 'title'
        elif norm(t) in kept:
            why[i] = 'kept as drawn in another book'
        elif CAPTION_WORDS & ws:
            why[i] = 'caption word'
    # a caption's other lines, read as labels of their own: the title's "the Lastlands" under "A map of"
    grow = [i for i, w in why.items() if w != 'kept as drawn in another book']
    while grow:
        i = grow.pop()
        title = why[i] == 'title'
        for j, lab in enumerate(labels):
            if (j not in why or title and why[j] == 'kept as drawn in another book') \
                    and not norm(wording(lab)).isdigit() and stacked(labels[i], lab):
                why[j] = 'title' if title else 'stacked on a caption'
                grow.append(j)
    # the key's entries: in a column (left edges) or a row (baselines) with entries that recur in other
    # keys, two of them, and one step of the key's pitch from the nearest (start to start, at most 1.3
    # times the closest two's): Book 4's Gulf of Durenor lines up with its key's first row, and Book
    # 12's Ogia with a column of its key, each further off than that
    tol = 0.005 * max((lab['box'][2] for lab in labels), default=0)
    anchors = {i for i, w in why.items() if w == 'kept as drawn in another book'}

    def near(line, lab, edge):
        k = 1 if edge == 0 else 0  # a column steps down by its tops, a row across by its left edges
        starts = sorted(labels[i]['box'][k] for i in line)
        pitch = min(max(b - a, 1) for a, b in zip(starts, starts[1:]))
        return min(abs(s - lab['box'][k]) for s in starts) <= 1.3 * pitch

    found = True
    while found:
        found = False
        for j, lab in enumerate(labels):
            if j in why or norm(wording(lab)).isdigit():
                continue
            for edge in (0, 3):
                line = [i for i in anchors if abs(labels[i]['box'][edge] - lab['box'][edge]) <= tol]
                if len(line) >= 2 and near(line, lab, edge):
                    why[j] = 'in line with the key'
                    anchors.add(j)
                    found = True
                    break
    return why


# What each kind of ground in a map's key is to look like, in our words: Gemini's default paints
# every land green (Book 3's snowfields, Book 5's desert), so each key entry that is not green says so
GROUND = [
    ({'DESERT', 'DESERTS', 'SAND', 'DUNES'}, 'The desert is pale sand and dunes, never green.'),
    ({'WASTELANDS', 'WASTELAND', 'WASTE', 'BADLANDS'},
     'The wastelands are pale, dry, sparsely grassed ground and bare earth, not green farmland and not desert sand.'),
    ({'TUNDRA', 'SNOW', 'ICE', 'PACKICE', 'GLACIER', 'GLACIERS', 'ICESHELF'},
     'The snow, ice and tundra stay white and cold pale grey, not green woodland.'),
    ({'VOLCANO', 'VOLCANOES'}, 'The volcanoes are dark cones, red-hot at their craters.'),
    ({'MARSH', 'MARSHES', 'SWAMP', 'SWAMPS', 'BOG', 'MIRE'}, 'The marshes are murky brown-green ground with reeds and pools.'),
    ({'SALTLAKE', 'SALTLAKES', 'SALTFLATS'}, 'The salt lakes are pale white crusted flats, not blue water.'),
    ({'OASIS', 'OASES'}, 'The oases are small green pools with a few palms in the sand, as drawn.'),
    ({'ROCKSPIRES', 'SPIRES'}, 'The rock spires are tall, sculpted pinnacles of bare rock, as drawn.'),
    ({'MOUNTAINS', 'MOUNTAIN', 'MOUNTAINRANGE'}, 'The mountains are shaded, three-dimensional rocky ranges.'),
    ({'HILLS'}, 'The hills are soft rolling ground with shaded rises.'),
    ({'PLAIN', 'PLAINS', 'GRASSLAND'}, 'The plains are open grassland.'),
    ({'FOREST', 'FORESTS', 'CONIFEROUSFOREST', 'DECIDUOUSFOREST', 'WOODS'},
     'The forests are dense, individually painted trees, only where the map draws trees.'),
    ({'LAKE', 'LAKES'}, 'The lakes are dark blue water.'),
]
DRAFT = '# DRAFT by tools/map_labels.py style'
SMALL = {'A', 'AN', 'AND', 'OF', 'THE', 'BEING', 'UPON', 'WHICH', 'THAT', 'IN', 'TO'}


def style_draft(labels, kept=frozenset()):
    """A first style.txt from the checked list (D8, ADR 0036): the map's title and its key's ground,
    each in a stock sentence, around the default's look. Returns (text, key entries it has no
    sentence for). Only what the list shows for certain: a region's ground is the agent's to add."""
    why = captions(labels, kept)
    title, seen = [], []
    for i in sorted((i for i, w in why.items() if w == 'title' and not labels[i].get('retype')),
                    key=lambda i: (labels[i]['box'][1], labels[i]['box'][0])):
        if any(overlap(labels[i]['box'], b) > 0.5 for b in seen):  # one name read twice
            continue
        seen.append(labels[i]['box'])
        title.append(wording(labels[i]).replace('&', ' & '))
    words = ' '.join(title).split()
    if words[:3] == ['A', 'MAP', 'OF']:
        words = words[3:]
    name = ' '.join(w.lower() if w in SMALL and k else w.capitalize() for k, w in enumerate(words))
    found, unknown = [], []
    for i, lab in enumerate(labels):  # a key entry: not a place name, worded as a kind of ground
        if lab.get('retype') or norm(wording(lab)).isdigit():
            continue
        t = norm(wording(lab))
        hit = next((s for keys, s in GROUND if t in keys), None)
        if hit and hit not in found:
            found.append(hit)
        elif not hit and why.get(i) == 'in line with the key':
            unknown.append(wording(lab))
    found.sort(key=[s for _, s in GROUND].index)
    text = (f'Repaint this map{" of " + name if name else ""} as a richly detailed hand-painted fantasy '
            'illustration on aged parchment. ' + ' '.join(found) + (' ' if found else '') +
            'The water keeps the colour the map gives it, with soft depth and wave texture, never tropical turquoise. '
            'Add finer detail in the existing frame, panels and key.')
    return text, unknown


def overlap(a, b):  # intersection over the smaller box, so a label read in pieces still matches
    w = min(a[2], b[2]) - max(a[0], b[0])
    h = min(a[3], b[3]) - max(a[1], b[1])
    if w <= 0 or h <= 0:
        return 0
    small = min((a[2] - a[0]) * (a[3] - a[1]), (b[2] - b[0]) * (b[3] - b[1]))
    return w * h / max(small, 1)


def norm(s):
    return ''.join(c for c in s.upper() if c.isalnum())


def check(labels, reads):
    used = set()
    bad = 0
    for i, lab in enumerate(labels):
        hits = [j for j, r in enumerate(reads) if overlap(lab['box'], r['box']) > 0.5]
        used.update(hits)
        hits.sort(key=lambda j: (reads[j]['box'][1] // 20, reads[j]['box'][0]))  # reading order
        got = ' '.join(reads[j]['text'] for j in hits)
        ratio = difflib.SequenceMatcher(None, norm(lab['text']), norm(got)).ratio()
        if lab.get('small'):
            print(f'{i:3d} by eye      {lab["text"]!r} (OCR read {got!r})')
            continue
        if not hits:
            print(f'{i:3d} missing      {lab["text"]}')
        elif norm(got) != norm(lab['text']):
            print(f'{i:3d} reads {ratio:.2f}  {lab["text"]!r} as {got!r}')
        else:
            continue
        bad += 1
    extra = [r for j, r in enumerate(reads) if j not in used and len(norm(r['text'])) > 1]
    for r in extra:
        print(f'    added       {r["text"]!r} at {r["box"]}')
    n = sum(not lab.get('small') for lab in labels)
    print(f'labels {n} (+{len(labels) - n} by eye): {n - bad} read the same, {bad} differ or missing; {len(extra)} unlisted reads')


def sheet(labels, faithful, aligned, out):
    """Each label's box from the faithful map beside the same box of the repaint, numbered, for the
    eye check: on Book 1 the OCR misread 24 of 42 labels on the faithful map itself."""
    O, A = (cv2.imdecode(np.fromfile(str(p), np.uint8), cv2.IMREAD_COLOR) for p in (faithful, aligned))
    rows = []
    for i, lab in enumerate(labels):
        x0, y0, x1, y1 = lab['box']
        x0, y0, x1, y1 = max(x0 - 12, 0), max(y0 - 12, 0), x1 + 12, y1 + 12
        a, b = O[y0:y1, x0:x1], A[y0:y1, x0:x1]
        k = min(1.0, 400 / a.shape[1], 160 / a.shape[0])
        a, b = (cv2.resize(m, None, fx=k, fy=k, interpolation=cv2.INTER_AREA) for m in (a, b))
        h, w = a.shape[:2]
        row = np.full((h + 8, 60 + 2 * w + 16, 3), 255, np.uint8)
        cv2.putText(row, str(i), (4, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 200), 2)
        row[4:4 + h, 60:60 + w], row[4:4 + h, 76 + w:76 + 2 * w] = a, b
        rows.append(row)
    if not rows:
        return
    W = max(r.shape[1] for r in rows)
    rows = [np.pad(r, ((0, 0), (0, W - r.shape[1]), (0, 0)), constant_values=255) for r in rows]
    half = (len(rows) + 1) // 2  # two columns keep the sheet readable at a glance
    cols = [np.vstack(c) for c in (rows[:half], rows[half:]) if c]  # one label: one column
    H = max(c.shape[0] for c in cols)
    cols = [np.pad(c, ((0, H - c.shape[0]), (0, 20), (0, 0)), constant_values=255) for c in cols]
    cv2.imencode('.png', np.hstack(cols))[1].tofile(str(out))


def names(labels):
    out, i = [], 0
    while i < len(labels):  # a name split by a river ("THE WILD-" / "LANDS") goes in as one
        t = labels[i]['text'].upper()
        if t.endswith('-') and i + 1 < len(labels):
            t, i = f'{t} / {labels[i + 1]["text"].upper()} (one name, split in two)', i + 1
        out.append(t)
        i += 1
    return ', '.join(out)


def prompt(labels, lettered=False, style=None, lettering=None):
    """The repaint prompt, for the picture map_erase.py made. Labels marked "retype" are ones Gemini
    cannot spell reliably (Book 1: the small hand-lettered names, and a few it got wrong in every
    round); they are erased from its picture and lettered afterwards, so the prompt only asks it not
    to letter the bare places. Book 1's rounds behind the wording: docs/reference/map-upscale.md."""
    # lettered: the "retype" labels were erased and set again in clean type (map_letter.py with -),
    # so Gemini gets every label to copy, and copies the clean type far better than the scan's hand
    keep = labels if lettered else [lab for lab in labels if not lab.get('retype')]
    erased = [] if lettered else [lab for lab in labels if lab.get('retype')]
    # style: the book's own look, from style.txt beside the list. The default asks for forests and
    # water, and Gemini painted Book 3's snowfields as green woodland with it
    p = ((style.strip() + ' ') if style else
         'Repaint this fantasy map as a richly detailed hand-painted fantasy illustration on aged parchment: '
         'shaded, three-dimensional mountain ranges, dense individually painted forests, textured water with depth, '
         'and finer detail in the existing frame, panels and key. ')
    # no ship or compass rose named here: Book 12 has neither, and naming them got it two ships
    p += ('Keep the layout: every coastline, river, road, island, mountain range, forest and town stays where it is, '
         'and every panel and every object already drawn on the map stays in its place with its colours. '
         'Keep these labels in their present places and directions, spelled exactly as written here, letter for '
         'letter: ' + names(keep) + '.')
    if lettered and lettering:  # font.txt's second line (ADR 0004), e.g. a hand Gemini is not to tidy into type
        p += (f' The place names are {lettering}: keep that same lettering for them, not other type, '
              'and keep the ground behind each name clear so it stays easy to read.')
    elif lettered:
        p += (' The place names are set in clean sans-serif type: keep that clean, legible sans-serif lettering for '
              'them, and keep the ground behind each name clear so it stays easy to read.')
    if erased:  # erased from the picture by map_erase.py: asking Gemini to leave them out failed
        p += (' Some towns, rivers, roads, islands and the scale bar have no name or numbers written beside them: '
              'leave them that way, with no lettering of any kind there.')
    # woods may be fleshed out, new features may not (owner, ADR 0004)
    return p + (' Do not add, remove or rename any other label. The woods already drawn may be filled out, but add no '
                'feature that is not on the original: no fruit, foliage, vines, scrolls or extra ornaments along the '
                'edges or in the corners, no new castles, towers, towns, buildings, ruins, creatures or ships. '
                'Keep the burnt, torn parchment edge as it is. Every line stays clean and steady: '
                'straight roads, frame lines and lettering, no warping or melting.\n')


def main():
    cmd, a = sys.argv[1:3]
    b = sys.argv[3] if len(sys.argv) > 3 else None
    if cmd == 'draft':
        reads = ocr(a)
        reads.sort(key=lambda r: (r['box'][1] // 40, r['box'][0]))
        why = captions(reads, kept_elsewhere(b))
        for i, r in enumerate(reads):  # most labels are place names; what captions() misses is the owner's to untick
            r['retype'] = i not in why
        Path(b).write_text(json.dumps(reads, indent=1), encoding='utf-8')
        print(f'{len(reads)} boxes, {sum(r["conf"] < 0.5 for r in reads)} under 0.5 confidence, '
              f'{len(why)} unticked retype (not place names)')
    elif cmd == 'retype':  # the same judgement on the corrected list: unticks only, never ticks
        labels = json.loads(Path(a).read_text(encoding='utf-8'))
        why = {i: w for i, w in captions(labels, kept_elsewhere(a)).items() if labels[i].get('retype')}
        for i in why:
            labels[i]['retype'] = False
        if why:
            Path(a).write_text(json.dumps(labels, indent=1), encoding='utf-8')
        for i, w in sorted(why.items()):  # numbers and reasons only: the wordings are the map's
            print(f'{i:3d} unticked: {w}')
        print(f'{len(why)} unticked; {sum(bool(lab.get("retype")) for lab in labels)} of {len(labels)} labels left as place names')
    elif cmd == 'check':
        labels = json.loads(Path(a).read_text(encoding='utf-8'))
        check(labels, ocr(b))
        if len(sys.argv) > 4:  # the faithful map: also write the eye-check sheet beside <aligned.png>
            sheet(labels, sys.argv[4], b, Path(b).parent / 'labels.png')
    elif cmd == 'style':  # a first style.txt beside the list; never over the book's own
        out = Path(a).parent / 'style.txt'
        if out.exists() and not out.read_text(encoding='utf-8').startswith(DRAFT):
            sys.exit(f"{out} is the book's own (no draft line): not replaced")
        text, unknown = style_draft(json.loads(Path(a).read_text(encoding='utf-8')), kept_elsewhere(a))
        note = (f"{DRAFT}: title and key read from labels.json; add each region's ground and what must not "
                'appear (docs/reference/map-upscale.md, step 5), then delete this line. Lines starting # are '
                'left out of the prompt.' + (f' Key entries with no sentence: {", ".join(unknown)}.' if unknown else ''))
        out.write_text(f'{note}\n{text}\n', encoding='utf-8')
        print(f'{out}: draft written, {"a title" if " map of " in text else "no title"} read, '
              f'{len(unknown)} key entr{"y" if len(unknown) == 1 else "ies"} with no sentence')
    elif cmd == 'prompt':
        style = Path(a).parent / 'style.txt'
        # lines starting # are notes to the reader (the draft's first line), not the prompt
        style = '\n'.join(ln for ln in style.read_text(encoding='utf-8').splitlines()
                          if not ln.startswith('#')) if style.exists() else None
        font = Path(a).parent / 'font.txt'  # line 1 the font, line 2 how to describe it to Gemini
        font = font.read_text(encoding='utf-8').splitlines() if font.exists() else []
        lettering = font[1].strip() if len(font) > 1 and font[1].strip() else None
        Path(b).write_text(prompt(json.loads(Path(a).read_text(encoding='utf-8')), '--lettered' in sys.argv, style,
                                  lettering), encoding='utf-8')
    else:
        sys.exit('draft, retype, style, check or prompt')


if __name__ == '__main__':
    main()
