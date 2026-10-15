"""Draft a map's label list, and check a repaint's labels against it.

Run (from the project root):
  uv run --project tools python tools/map_labels.py draft <map-2k.png> <maps/<book>/labels.json>
  uv run --project tools python tools/map_labels.py check <maps/<book>/labels.json> <aligned.png> [<map-2k.png>]
  uv run --project tools python tools/map_labels.py prompt <maps/<book>/labels.json> <prompt.txt> [--lettered]

draft: OCR finds each label's box and guesses its wording: PaddleOCR (map_ocr_paddle.py, in
tools/.venv-paddle) when that venv exists, else EasyOCR. The guesses are only a start:
correct every wording by eye and add what it missed (docs/reference/map-upscale.md, step 2).
Entries are {"text", "box": [x0, y0, x1, y1], "conf", "retype"}. "retype" is ticked on every read
except one worded like a label another book's list keeps as drawn (key entries, panel captions).
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
        out.append({'text': text.upper().strip(), 'box': [int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys))],
                    'conf': round(float(conf), 2)})
    return out


def norm(text):
    return ''.join(c for c in text.upper() if c.isalnum())


def kept_elsewhere(labels_file):
    """Wordings other books' lists keep as drawn: the key and captions recur from map to map. A name
    that is a place on one map and a caption on another stays ticked."""
    out, places = set(), set()
    for f in Path(labels_file).resolve().parent.parent.glob('*/labels.json'):
        if f.parent == Path(labels_file).resolve().parent:
            continue
        try:
            labels = json.loads(f.read_text(encoding='utf-8'))
        except (OSError, ValueError):
            continue
        for lab in labels:
            (places if lab.get('retype') else out).add(norm(' '.join(lab.get('lines') or [lab.get('text', '')])))
    return out - places - {''}


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
    if lettered and lettering:  # font.txt's second line (ADR 0006), e.g. a hand Gemini is not to tidy into type
        p += (f' The place names are {lettering}: keep that same lettering for them, not other type, '
              'and keep the ground behind each name clear so it stays easy to read.')
    elif lettered:
        p += (' The place names are set in clean sans-serif type: keep that clean, legible sans-serif lettering for '
              'them, and keep the ground behind each name clear so it stays easy to read.')
    if erased:  # erased from the picture by map_erase.py: asking Gemini to leave them out failed
        p += (' Some towns, rivers, roads, islands and the scale bar have no name or numbers written beside them: '
              'leave them that way, with no lettering of any kind there.')
    return p + (' Do not add, remove or rename any other label. Add nothing that is not on the original: no fruit, '
                'foliage, vines, scrolls or extra ornaments along the edges or in the corners, no new trees, creatures, '
                'ships or buildings. Keep the burnt, torn parchment edge as it is. Every line stays clean and steady: '
                'straight roads, frame lines and lettering, no warping or melting.\n')


def main():
    cmd, a, b = sys.argv[1:4]
    if cmd == 'draft':
        reads = ocr(a)
        reads.sort(key=lambda r: (r['box'][1] // 40, r['box'][0]))
        kept = kept_elsewhere(b)
        for r in reads:  # most labels are place names; the title and new captions are left to untick by hand
            r['retype'] = norm(r['text']) not in kept
        Path(b).write_text(json.dumps(reads, indent=1), encoding='utf-8')
        print(f'{len(reads)} boxes, {sum(r["conf"] < 0.5 for r in reads)} under 0.5 confidence, '
              f'{sum(not r["retype"] for r in reads)} unticked retype (kept as drawn in another book)')
    elif cmd == 'check':
        labels = json.loads(Path(a).read_text(encoding='utf-8'))
        check(labels, ocr(b))
        if len(sys.argv) > 4:  # the faithful map: also write the eye-check sheet beside <aligned.png>
            sheet(labels, sys.argv[4], b, Path(b).parent / 'labels.png')
    elif cmd == 'prompt':
        style = Path(a).parent / 'style.txt'
        style = style.read_text(encoding='utf-8') if style.exists() else None
        font = Path(a).parent / 'font.txt'  # line 1 the font, line 2 how to describe it to Gemini
        font = font.read_text(encoding='utf-8').splitlines() if font.exists() else []
        lettering = font[1].strip() if len(font) > 1 and font[1].strip() else None
        Path(b).write_text(prompt(json.loads(Path(a).read_text(encoding='utf-8')), '--lettered' in sys.argv, style,
                                  lettering), encoding='utf-8')
    else:
        sys.exit('draft, check or prompt')


if __name__ == '__main__':
    main()
