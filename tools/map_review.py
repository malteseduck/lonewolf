"""Make a map's labels cheap to review (ADR 0004): clean the OCR draft by script, then show only what
needs a look. Prints counts and label indexes, never wordings.

Run (from the project root):
  uv run --project tools python tools/map_review.py clean <book>
  uv run --project tools python tools/map_review.py prepare <book>
  uv run --project tools python tools/map_review.py clean <book>
  uv run --project tools python tools/map_review.py sheet <book> [--flagged]
  uv run --project tools python tools/map_review.py fonts <book>

prepare (the dashboard's "Prepare first pass"): everything before anyone reads the map. Upscale where
there is no map-2k.png; draft and clean where there is no list (a list already there may hold the
owner's corrections, so it is neither drafted nor cleaned again); measure, erase, letter, sheet, fonts.

fonts: work/map-review-fonts.jpg, five of the map's level names as printed, then in each font held
(TRIAL), for choosing the map's font.txt (ADR 0004).

clean (after the draft, before the list is read): reads no one could want as a name go (numbers away
from the scale, a letter run together, symbols read as letters), a symbol read onto a name is stripped,
a near-certain misread is mended from the books' own names, and two lines the books hold as one name
are joined. It only touches ticked labels the owner has not settled ("named" or a hand "set"), and
keeps the list before it as labels.json.bak.

sheet (after Letter): work/map-review-<n>.jpg, each set name's scan crop beside its lettered crop,
the flagged first and framed in red; work/map-review-overview.jpg, the whole map with every box, for
names the draft missed. --flagged leaves the unflagged out, for the check after a correction pass. Flags:
  overlap  its type touches another name's
  over     its type lies on something left on the map (a tower, a road, a frame)
  left     ink stays in its box after the erase: letters not taken, or kept work beside them
  size     its type is far bigger or smaller than the printed name
  off      its type is away from the printed name
  none     it could not be set (no ink of its own to measure)
  mended   clean changed its wording: compare it with the scan
"""
import difflib
import json
import re
import shutil
import subprocess
import sys
import unicodedata
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

import map_letter
import map_names

ROOT = Path(__file__).resolve().parent.parent
SCALE_REACH = 200       # px on map-2k: a number this near a scale caption belongs to it
SHORT = 3               # a read of this few letters, not a word of the books, is a symbol
MEND_MIN = 5          # shorter words are left: 'Mins' was Mtns, not the books' Mines
OVER = 0.25             # share of a name's type lying on what the map kept
LEFT = 0.22             # ink left in the box after the erase, as a share of the scan's there
SIZE = (0.5, 1.75)      # the type's long side over the box's
BIG = 1.3               # a name this much taller than the map's usual is too big, or a region's
OVERVIEW = 1500         # px, the overview's long side
CELL = (180, 60)        # px, one crop on a sheet
COLUMNS = 4
PER_SHEET = 92
SCALE_WORDS = {'SCALE', 'MILES', 'LEAGUES'}
TRIAL = ('Cabin.ttf|SemiBold', 'DarklandHand-Regular.ttf', 'DarklandHand-Bold.ttf', 'DarklandSerif-Regular.ttf', 'Almendra-Regular.ttf')


def settled(lab):
    return not lab.get('retype') or lab.get('named') or lab.get('set')


def letters(text):
    return re.sub(r'[^A-Za-z]', '', unicodedata.normalize('NFKD', text))


def near_scale(lab, labels):
    x0, y0, x1, y1 = lab['box']
    for o in labels:
        if SCALE_WORDS & set(re.findall(r'[A-Z]+', o['text'].upper())):
            a, b, e, f = o['box']
            if max(a - x1, x0 - e, b - y1, y0 - f) <= SCALE_REACH:
                return True
    return False


def junk(lab, labels, idx):
    """Surely no name: a bare number away from the scale; another script's symbols; a mix of digits
    and letters only a few long; a letter three times over; two plain letters, or three in lower
    case, not a word of the books. Punctuation spares a short read ("R.Ak"), and a lone mark
    stays: both are on the owner's lists. None of the owner's names on Books 1-13 and 15 goes."""
    t = lab['text'].strip()
    bare = re.sub(r'[\W_]', '', t)
    if not letters(t):
        return not near_scale(lab, labels) if bare.isdigit() else bool(bare)
    if re.search(r'\d', t) and len(bare) <= 4:
        return True
    if re.search(r'(.)\1\1', letters(t), re.I):
        return True
    word = letters(t)
    return (word == t and word.lower() not in idx['words']
            and (len(word) < SHORT or len(word) == SHORT and word[0].islower()))


def mend(text, idx):
    """The wording with its one misread word put right, else None: the whole result is in the books,
    and one letter differs in a word not short. Of 37 such mends on five drafts 2 were wrong, and a
    right map-only name can turn into a book's close one (11 on the owner's lists), so clean marks
    each as "mended" and the sheet flags it."""
    r = map_names.check(text, idx)
    if not r or r['status'] != 'near' or len(r['unknown']) != 1:
        return None
    was = r['unknown'][0]
    for m in r['suggest']:
        if not map_names.known(map_names.words(m), idx):
            continue
        now = re.findall(map_names.WORD, m)[re.findall(map_names.WORD, text).index(was)]
        ops = difflib.SequenceMatcher(None, was.lower(), now.lower()).get_opcodes()
        if len(was) >= MEND_MIN and sum(max(o[2] - o[1], o[4] - o[3]) for o in ops if o[0] != 'equal') == 1:
            return m
        return None
    return None


def stacks(a, b):
    (ax0, ay0, ax1, ay1), (bx0, by0, bx1, by1) = a['box'], b['box']
    line = min(ay1 - ay0, by1 - by0)
    return (min(ax1, bx1) - max(ax0, bx0) >= 0.5 * min(ax1 - ax0, bx1 - bx0)
            and -0.5 * line <= by0 - ay1 <= 0.5 * line
            and abs(a.get('slant', 0)) < 6 and abs(b.get('slant', 0)) < 6)


def clean(labels, idx):
    """(the list cleaned, what was done as counts). See the docstring."""
    did = {'dropped': 0, 'stripped': 0, 'mended': 0, 'joined': 0}
    out = []
    for lab in labels:
        if settled(lab):
            out.append(lab)
            continue
        kept = dict(lab)
        t = ''.join(c for c in kept['text'] if ord(c) < 0x250)  # OCR's other scripts: a symbol on the map
        if t != kept['text'] and letters(t):
            kept['text'] = t.strip()
            did['stripped'] += 1
        if junk(kept, labels, idx):
            did['dropped'] += 1
            continue
        m = mend(kept['text'], idx)
        if m:
            kept['mended'] = kept['text']
            kept['text'] = m
            did['mended'] += 1
        out.append(kept)
    gone = set()
    for i, a in enumerate(out):
        if i in gone or settled(a) or a.get('lines'):
            continue
        for j, b in enumerate(out):
            if j == i or j in gone or settled(b) or b.get('lines') or not stacks(a, b):
                continue
            whole = f"{a['text']} {b['text']}"
            if map_names.known(map_names.words(whole), idx):
                a['lines'] = [a['text'], b['text']]
                a['text'] = whole
                a['box'] = [min(a['box'][0], b['box'][0]), min(a['box'][1], b['box'][1]),
                            max(a['box'][2], b['box'][2]), max(a['box'][3], b['box'][3])]
                a['slant'] = 0
                gone.add(j)
                did['joined'] += 1
                break
    return [x for i, x in enumerate(out) if i not in gone], did


def clean_file(path, idx):
    path = Path(path)
    labels = json.loads(path.read_text(encoding='utf-8'))
    shutil.copyfile(path, str(path) + '.bak')
    cleaned, did = clean(labels, idx)
    path.write_text(json.dumps(cleaned, indent=1, ensure_ascii=False), encoding='utf-8')
    return did


def across(mask):
    """How far the type spreads across its own long axis, in px."""
    ys, xs = np.nonzero(mask)
    pts = np.column_stack([xs, ys]).astype(np.float64)
    pts -= pts.mean(0)
    if len(pts) < 2:
        return 0.0
    d = np.linalg.eigh(np.cov(pts.T))[1][:, 0]  # the short axis
    return float(np.ptp(pts @ d))


def flags(labels, scan, erased, masks):
    """{label index: [flags]} for the set names. masks: {label index: the type's pixels, map-sized}."""
    out = {}

    def add(i, f):
        out.setdefault(i, [])
        if f not in out[i]:
            out[i].append(f)
    set_names = [i for i, lab in enumerate(labels) if lab.get('retype') or lab.get('fix')]
    grown = {i: cv2.dilate(m.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0 for i, m in masks.items()}
    scan_ink, _ = map_letter.ink_mask(scan)
    left_ink, _ = map_letter.ink_mask(erased)
    # each one-line name's height across its own line, so one set far taller than the map's usual
    # stands out: a tower in the box had blown a short name up (Book 18)
    tall = {i: across(m) for i, m in masks.items() if m.any() and not labels[i].get('lines')}
    common = float(np.median(list(tall.values()))) if len(tall) >= 3 else None
    for i in set_names:
        lab = labels[i]
        x0, y0, x1, y1 = lab['box']
        if lab.get('mended'):
            add(i, 'mended')
        if i not in masks or not masks[i].any():
            add(i, 'none')
            continue
        for j in set_names:
            if j > i and j in masks and (grown[i] & grown[j]).sum() >= 10:
                add(i, 'overlap')
                add(j, 'overlap')
        ys, xs = np.nonzero(masks[i])
        long_side = max(xs.max() - xs.min(), ys.max() - ys.min())
        ratio = long_side / max(x1 - x0, y1 - y0, 1)
        if ratio > SIZE[1] or ratio < SIZE[0] or (common and i in tall and tall[i] > BIG * common):
            add(i, 'size')
        gx, gy = (x1 - x0) / 2 + 10, (y1 - y0) / 2 + 10
        if abs(xs.mean() - (x0 + x1) / 2) > gx or abs(ys.mean() - (y0 + y1) / 2) > gy:
            add(i, 'off')
        if (left_ink & masks[i]).sum() > OVER * masks[i].sum():
            add(i, 'over')
        had = scan_ink[y0:y1, x0:x1].sum()
        if had and left_ink[y0:y1, x0:x1].sum() > LEFT * had:
            add(i, 'left')
    return out


def order(labels, found):
    """The set names' indexes, the flagged first."""
    names = [i for i, lab in enumerate(labels) if lab.get('retype') or lab.get('fix')]
    return sorted(names, key=lambda i: (i not in found, i))


def crop(im, box):
    x0, y0, x1, y1 = box
    h, w = im.shape[:2]
    c = im[max(y0 - 14, 0):min(y1 + 14, h), max(x0 - 14, 0):min(x1 + 14, w)]
    s = min(CELL[0] / max(c.shape[1], 1), CELL[1] / max(c.shape[0], 1))
    return Image.fromarray(cv2.cvtColor(cv2.resize(c, None, fx=s, fy=s, interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC), cv2.COLOR_BGR2RGB))


def sheets(labels, scan, lettered, found, out_dir, per_sheet=PER_SHEET, flagged=False):
    """Write the sheets, return their paths. A cell: the label's number and flags, scan, set type."""
    names = [i for i in order(labels, found) if i in found or not flagged]
    for old in Path(out_dir).glob('map-review-[0-9]*.jpg'):  # a shorter run leaves no stale sheet
        old.unlink()
    w, h = (CELL[0] * 2 + 16) * COLUMNS, CELL[1] + 18
    font = ImageFont.load_default()
    paths = []
    for n in range(0, max(len(names), 1), per_sheet):
        part = names[n:n + per_sheet]
        rows = (len(part) + COLUMNS - 1) // COLUMNS
        im = Image.new('RGB', (w, max(rows, 1) * h), 'white')
        d = ImageDraw.Draw(im)
        for k, i in enumerate(part):
            x, y = k % COLUMNS * (CELL[0] * 2 + 16), k // COLUMNS * h
            im.paste(crop(scan, labels[i]['box']), (x + 2, y + 15))
            im.paste(crop(lettered, labels[i]['box']), (x + CELL[0] + 6, y + 15))
            d.text((x + 3, y + 2), f"{i} {' '.join(found.get(i, []))}", fill=(190, 0, 0) if i in found else (60, 60, 60), font=font)
            if i in found:
                d.rectangle((x, y, x + CELL[0] * 2 + 10, y + h - 1), outline=(190, 0, 0))
        p = Path(out_dir) / f'map-review-{n // per_sheet + 1}.jpg'
        im.save(p, quality=88)
        paths.append(p)
    return paths


def overview(labels, scan, out_dir):
    s = min(OVERVIEW / max(scan.shape[:2]), 1)
    im = cv2.resize(scan, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
    for lab in labels:
        (x0, y0, x1, y1) = [int(v * s) for v in lab['box']]
        cv2.rectangle(im, (x0, y0), (x1, y1), (20, 20, 220) if lab.get('retype') else (220, 60, 20), 1)
    p = Path(out_dir) / 'map-review-overview.jpg'
    cv2.imencode('.jpg', im, [cv2.IMWRITE_JPEG_QUALITY, 88])[1].tofile(str(p))
    return p


def font_samples(labels):
    """Up to five level one-line names to try the fonts on, mixed case before capitals."""
    level = [x for x in labels if x.get('retype') and not x.get('lines') and abs(x.get('slant', 0)) < 4
             and 5 <= len(x['text']) <= 14]
    mixed = [x for x in level if not x['text'].isupper()]
    caps = [x for x in level if x['text'].isupper()]
    return (mixed[:3] + caps[:2] + mixed[3:] + caps[2:])[:5]


def font_sheet(labels, scan, out_dir):
    """The sheet's rows: the scan's crop of each sample, then each font of TRIAL, named at the left."""
    w, h = 240, 44
    samples = font_samples(labels)
    im = Image.new('RGB', (70 + w * 5, h * (len(TRIAL) + 1)), 'white')
    d = ImageDraw.Draw(im)
    for r, f in enumerate(TRIAL):
        d.text((2, (r + 1) * h + 12), f.split('-')[0].split('.')[0] + ('\nBold' if 'Bold' in f else ''), fill=(90, 90, 90))
    for k, lab in enumerate(samples):
        x = 70 + k * w
        c = crop(scan, lab['box'])
        s = min(w / c.width, h / c.height)
        im.paste(c.resize((int(c.width * s), int(c.height * s))), (x, 0))
        for r, f in enumerate(TRIAL):
            mask = map_letter.render([lab['text']], str(map_letter.FONTS / f), 0, 0, 1, size=26)[0]
            mask = mask.crop(mask.getbbox())
            s = min((w - 8) / mask.width, 1)
            mask = mask.resize((int(mask.width * s), int(mask.height * s)))
            im.paste(Image.new('RGB', mask.size, map_letter.INK), (x, (r + 1) * h + 6), mask)
    p = Path(out_dir) / 'map-review-fonts.jpg'
    im.save(p, quality=90)
    return p


def plan(has_scan, has_list):
    """The steps prepare runs: see the docstring."""
    return (([] if has_scan else ['upscale']) + ([] if has_list else ['draft', 'clean'])
            + ['measure', 'erase', 'letter', 'sheet', 'fonts'])


def prepare(book, has_scan, has_list, run):
    """Run the plan, each step through run(step), stopping at the first that fails. True if all went."""
    for step in plan(has_scan, has_list):
        print(f'== {step}', flush=True)
        if not run(step):
            return False
    return True


def run_step(book, step):
    """One of prepare's steps, by the same commands as the map editor's (tools/serve.py)."""
    d = ROOT / 'data' / 'projectaon' / book
    w, labels = d / 'work', ROOT / 'maps' / book / 'labels.json'
    t = lambda name: str(ROOT / 'tools' / name)
    font = font_name(book)
    cmds = {
        'upscale': [t('map_upscale.py'), d / 'map.png', w / 'map-2k.png', '--width', '2048'],
        'draft': [t('map_labels.py'), 'draft', w / 'map-2k.png', labels],
        'clean': [t('map_review.py'), 'clean', book],
        'measure': [t('map_measure.py'), w / 'map-2k.png', labels],
        'erase': [t('map_erase.py'), w / 'map-2k.png', labels, w / 'map-2k-erased.jpg'],
        'letter': [t('map_letter.py'), w / 'map-2k.png', labels, w / 'map-2k-erased.jpg', '-', w / 'map-2k-lettered.jpg', '--hand', font, '--caps', font],
        'sheet': [t('map_review.py'), 'sheet', book],
        'fonts': [t('map_review.py'), 'fonts', book],
    }
    w.mkdir(parents=True, exist_ok=True)
    labels.parent.mkdir(parents=True, exist_ok=True)
    ok = subprocess.run([sys.executable] + [str(a) for a in cmds[step]], cwd=ROOT).returncode == 0
    if ok and step == 'letter':  # the list the lettered picture was made from, as the map editor keeps it
        shutil.copyfile(labels, w / 'map-labels-lettered.json')
    return ok


def font_name(book):
    """map_letter.py's font: the one maps/<book>/font.txt names, else Cabin (ADR 0004)."""
    f = ROOT / 'maps' / book / 'font.txt'
    return f.read_text(encoding='utf-8').splitlines()[0].strip() if f.is_file() else 'Cabin.ttf|SemiBold'


def font_of(book):
    return str(map_letter.FONTS / font_name(book))


def main():
    if len(sys.argv) < 3 or sys.argv[1] not in ('prepare', 'clean', 'sheet', 'fonts'):
        sys.exit(__doc__)
    step, book = sys.argv[1], sys.argv[2]
    labels_file = ROOT / 'maps' / book / 'labels.json'
    if step == 'prepare':
        has_scan = (ROOT / 'data' / 'projectaon' / book / 'work' / 'map-2k.png').is_file()
        sys.exit(0 if prepare(book, has_scan, labels_file.is_file(), lambda s: run_step(book, s)) else 1)
    if step == 'fonts':
        w = ROOT / 'data' / 'projectaon' / book / 'work'
        font_sheet(json.loads(labels_file.read_text(encoding='utf-8')), map_letter.read(w / 'map-2k.png'), w)
        print(f'{len(TRIAL)} fonts on map-review-fonts.jpg')
        return
    if step == 'clean':
        did = clean_file(labels_file, map_names.build_index(ROOT / 'data' / 'projectaon', labels_file))
        print(f"{did['dropped']} dropped, {did['stripped']} stripped, {did['mended']} mended, {did['joined']} joined")
        return
    w = ROOT / 'data' / 'projectaon' / book / 'work'
    scan, erased, lettered = (map_letter.read(w / n) for n in ('map-2k.png', 'map-2k-erased.jpg', 'map-2k-lettered.jpg'))
    labels = json.loads(labels_file.read_text(encoding='utf-8'))
    font = font_of(book)
    found = flags(labels, scan, erased, map_letter.masks(scan, labels, font, font))
    paths = sheets(labels, scan, lettered, found, w, flagged='--flagged' in sys.argv)
    overview(labels, scan, w)
    print(f'{len(order(labels, found))} names on {len(paths)} sheet(s), {len(found)} flagged')
    for f in ('overlap', 'over', 'left', 'size', 'off', 'none', 'mended'):
        ids = [str(i) for i, v in found.items() if f in v]
        if ids:
            print(f'{f}: ' + ' '.join(ids))


if __name__ == '__main__':
    main()
