"""Finish a map: warp the upscaled repaint onto the 4K frame, erase its faults, letter the labels
Gemini was not trusted with, and save the 4K WebP.

Run (from the project root):
  uv run --project tools python tools/map_letter.py <map-2k.png> <maps/<book>/labels.json> <repaint-x4.png> <H.json> <out.webp> [--mark x0,y0,x1,y1 ...] [--hand FONT] [--caps FONT] [--sheet PATH]

<repaint-x4.png> is map_upscale.py's 4x of the Gemini round kept; <H.json> is map_check.py's warp
for that round. Boxes, in the label list and --mark, are in map-2k.png's px.
Labels marked "retype" (erased before Gemini saw the map) and "fix" (Gemini misspelled them) are
lettered here. For each, the scan's ink in its box gives the angle (its long axis, or the OCR draft's "slant" where that is
3-20 degrees off it; "upwards" or
"downwards" in its "where" picks the reading direction) and the size (the type is fitted to the
ink's length, then pulled most of the way to the map's common size unless much bigger: COMMON, PULL). "lines" splits a label over lines as printed, set level ("angle" in degrees
otherwise) and fitted to the box, "leading" its line spacing (1 = the font's own); "height" gives the type's height outright, in map-2k px;
"nudge" [dx, dy] (map-2k px) moves a label off something the larger type runs into. "set" {at: [x, y],
size, angle} places the type by hand (the map editor's text frame): centre of its lines, type size in
map-2k px, reading angle in degrees; it overrides all of the above. Mixed-case labels (the hand-lettered
names) get --hand, capitals get --caps, set larger and heavier than the scan's ink measures
(SCALE, BOLD): at the scan's size they looked faint beside Gemini's own labels (owner, Book 1).
Before lettering, Gemini's own ink is erased from "fix" boxes, any ghost letters in "retype" boxes,
and anything in a --mark box (a stray colon); its sparkle watermark, bottom right, always.
--only n,n,... limits the erasing and lettering to those labels (Book 1, round 8: Gemini copied
the clean type of most names right, so only the ones it garbled are set again). Without --only,
on a repaint, labels marked "reset" (ticked in tools/map-editor.html after the round's check)
and "fix" are the ones done, if any label is marked "reset". With none marked "reset", only the
"fix" labels are done, so Gemini's names stand; --all sets every "retype" label again as well
(ADR 0004). With nothing to letter, it still warps, erases --mark and the sparkle, and saves.
Also writes <out>-sheet.png (or --sheet <path>): each lettered label, the scan beside the result.
With <H.json> given as -, it letters Gemini's input instead: <repaint> is map_erase.py's picture,
lettered at its own size (Book 1: the owner's idea, so Gemini copies clean type and paints round
it). Book 1 used Cabin SemiBold, a free Gill Sans relative, for every place name: --hand and
--caps 'Cabin.ttf|SemiBold'.
"""
import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from map_erase import LabelInk

Image.MAX_IMAGE_PIXELS = None
WIDTH = 3840
FONTS = Path(__file__).parent / 'fonts'
INK = (38, 30, 24)        # RGB: Gemini's lettering on Book 1 is a warm near-black
SCALE = 1.3               # type size over the scan's for the scale's small numbers
SMALL = 30                # px on map-2k: numbers thinner than this are small and get SCALE
SNAP = 1.05               # a name's type size over the map's common size, before PULL (the owner's, 2026-10-19)
PULL = 0.6                # how far a name's own size moves it off the common one (0 none, 1 its own)
BIG = 1.25                # a name fitted over this times the common size keeps its own (a title, a region)
TRACK = 0.05              # extra space between letters, as a share of the type size
BOLD = 0.025              # stroke added round each glyph, as a share of the type size
FILL = 0.92               # type length as a share of the scan's ink length: hand ink is loose
SLANT_TRUST = (3, 20)     # degrees between the ink's axis and OCR's slant where the slant is taken
SPAN = 0.4                # ink spanning less of its box's long side than this is measured from the box


def read(p):
    return cv2.imdecode(np.fromfile(str(p), np.uint8), cv2.IMREAD_COLOR)


def ink_mask(im, dark_min=30, chroma_max=24):
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    dark = cv2.medianBlur(g, 31).astype(np.int16) - g
    lab = cv2.cvtColor(im, cv2.COLOR_BGR2LAB).astype(np.int16)
    chroma = np.hypot(lab[..., 1] - 128, lab[..., 2] - 128)
    return (dark > dark_min) & (chroma < chroma_max), dark


def ink_points(scan_ink, lab):
    x0, y0, x1, y1 = scan_ink.box(lab)
    ys, xs = np.nonzero(scan_ink.mask(lab))
    return np.column_stack([xs + x0, ys + y0]).astype(np.float64)


def from_box(scan_ink, lab, pts=None):
    """True where the ink's long axis spans under SPAN of the box's long side: the strip took in one
    tall letter of a title, or a tower or palm joined to the letters left a speck (Book 7: 5 of 60;
    none on Books 1-6 and 12). The box, along OCR's slant, is then the better guess."""
    if lab.get('spread') or lab.get('lines'):
        return False
    pts = ink_points(scan_ink, lab) if pts is None else pts
    if len(pts) < 2:
        return False
    c = pts.mean(0)
    d = np.linalg.eigh(np.cov((pts - c).T))[1][:, 1]
    along = (pts - c) @ d
    x0, y0, x1, y1 = lab['box']
    return along.max() - along.min() < SPAN * max(x1 - x0, y1 - y0)


def geometry(scan_ink, lab):
    """Centre, reading direction (radians, y down) and length/thickness of the scan's ink."""
    pts = ink_points(scan_ink, lab)
    if len(pts) < 2:  # its letters are joined to a road or coast running out of the box
        return None
    if from_box(scan_ink, lab, pts):
        x0, y0, x1, y1 = lab['box']
        w, h = x1 - x0, y1 - y0
        a = np.radians(lab['angle'] if 'angle' in lab else lab.get('slant', -90 if h > w * 1.6 else 0))
        horiz = abs(np.cos(a)) >= 0.5
        return np.array([(x0 + x1) / 2, (y0 + y1) / 2]), a, float(w if horiz else h), float(h if horiz else w)
    c = pts.mean(0)
    w, v = np.linalg.eigh(np.cov((pts - c).T))
    d = v[:, 1]  # long axis
    if 'slant' in lab and 'angle' not in lab:
        # OCR's line (map_ocr_paddle.py) where the ink's axis is a little off it, as a road or tree
        # in the box makes it; far off, OCR misread a short word's box. On Books 3-6 and 12 this
        # halved the names set more than 3 degrees from the owner's hand angle (27 to 13).
        s = np.radians(lab['slant'])
        off = abs((np.degrees(np.arctan2(d[1], d[0])) - lab['slant'] + 90) % 180 - 90)
        if SLANT_TRUST[0] < off < SLANT_TRUST[1]:
            d = np.array([np.cos(s), np.sin(s)])
    if 'angle' in lab:  # given by hand where a flag or road in the box skews the axis
        d = np.array([np.cos(np.radians(lab['angle'])), np.sin(np.radians(lab['angle']))])
    where = lab.get('where', '')
    if 'upwards' in where:
        d = d if d[1] < 0 else -d
    elif 'downwards' in where:
        d = d if d[1] > 0 else -d
    elif d[0] < 0:
        d = -d
    along = (pts - c) @ d
    across = (pts - c) @ np.array([-d[1], d[0]])
    centre = c + d * (along.max() + along.min()) / 2 + np.array([-d[1], d[0]]) * (across.max() + across.min()) / 2
    return centre, np.arctan2(d[1], d[0]), along.max() - along.min(), across.max() - across.min()


K = 1  # 4K or 2K px per map-2k px, set in main
COMMON = None  # the map's usual type size in map-2k px (common_size()), set in main


def block(lines, font_path, size, leading=1):
    """The font at <size>, the longest line's width, the block's height and its line height."""
    path, _, variant = str(font_path).partition('|')  # 'Cabin.ttf|SemiBold': a variable font's weight
    f = ImageFont.truetype(path, size)
    if variant:
        f.set_variation_by_name(variant)
    boxes = [f.getbbox(t) for t in lines]
    boxes = [(b[0], b[1], b[2] + round(TRACK * size * (len(t) - 1)), b[3]) for b, t in zip(boxes, lines)]
    lh = (f.getmetrics()[0] + f.getmetrics()[1]) * leading
    return f, max(b[2] - b[0] for b in boxes), lh * (len(lines) - 1) + (boxes[-1][3] - boxes[0][1]), lh


def fit_size(lines, font_path, length, thick, leading=1):
    """The type size whose longest line spans <length> px, capped so the block is no thicker than the
    ink was, with a little give."""
    _, w, h, _ = block(lines, font_path, 100, leading)
    return 100 * min(length * FILL / w, thick * 1.25 / h)


def common_size(labels, scan_ink, hand, caps):
    """The map's usual type size (map-2k px): the median of its lettered one-line names fitted to
    their own ink. None with no such name."""
    sizes = []
    for lab in labels:
        if not (lab.get('retype') or lab.get('fix')) or lab.get('lines') or lab.get('spread') or lab.get('height'):
            continue
        g = geometry(scan_ink, lab)
        if g is not None:
            font = hand if any(ch.islower() for ch in lab['text']) else caps
            sizes.append(fit_size([lab['text']], font, g[2], g[3]))
    return float(np.median(sizes)) if sizes else None


def render(lines, font_path, length, thick, nlines, boost=None, leading=1, size=None):
    """The label as an RGBA image, horizontal, at fit_size() for <length> and <thick>, or at type
    <size> outright."""
    if size is None:
        size = fit_size(lines, font_path, length, thick, leading)
        if boost is None:
            boost = SCALE if thick < SMALL * K else 1
        size *= boost
    f, w, h, lh = block(lines, font_path, max(int(size), 6), leading)
    sw = max(1, round(f.size * BOLD))
    own = lh / leading  # the font's own line height: the wipe's reach and the padding go by it
    pad = int(own * 0.8)  # room for wipe()'s reach round the letters
    img = Image.new('L', (w + 2 * pad, int(lh * (nlines - 1) + own) + 2 * pad), 0)
    dr = ImageDraw.Draw(img)
    for i, t in enumerate(lines):  # each line centred, as the scan's are
        tw = f.getbbox(t)[2] - f.getbbox(t)[0] + TRACK * f.size * (len(t) - 1)
        x = pad + (w - tw) / 2 - f.getbbox(t)[0]
        for ch in t:  # letter by letter, a little apart: Cabin's tight 'rn' read as 'm' (Book 1)
            dr.text((x, pad + i * lh), ch, font=f, fill=255, stroke_width=sw, stroke_fill=255)
            x += f.getlength(ch) + TRACK * f.size
    return img, own


def letter(base, lab, scan_ink, hand, caps, k):
    text = lab['text']
    font = hand if any(ch.islower() for ch in text) else caps
    s = lab.get('set')
    if s and None in [*s.get('at', [None, None])[:2], s.get('size'), s.get('angle')]:
        print(f'label at box {lab["box"]}: hand placement has a blank number, set from the measure instead')
        s = None
    if s and not lab.get('spread'):  # placed by hand in the map editor
        lines = lab.get('lines') or [text]
        mask, lh = render(lines, font, 0, 0, len(lines), leading=lab.get('leading', 1), size=s['size'] * k)
        place(base, mask, lh, np.array(s['at'], np.float64) * k, np.radians(s['angle']))
        return
    g = geometry(scan_ink, lab)
    if g is None:
        if PHASE == 'draw':
            print(f'label at box {lab["box"]} ({len(text)} letters): no ink of its own to measure, not lettered;'
                  ' tick "clip" on it, or place it by hand, in the map editor')
        return
    centre, ang, length, thick = g
    centre = centre + np.array(lab.get('nudge', [0, 0]))  # map-2k px, off a tower the bigger type runs into
    if lab.get('lines'):  # stacked lines: the ink's long axis may run down the stack, so level
        ang = np.radians(lab.get('angle', 0))
        length = (lab['box'][2] - lab['box'][0]) / FILL * 0.95  # fills the box: a panel or a gap
        thick = lab['box'][3] - lab['box'][1]
    if lab.get('height'):  # type height given outright (the scale's ink box takes in the bar)
        thick = lab['height'] / 1.25
        if not lab.get('spread'):  # the length follows from it (spread words keep their ends)
            length = 10 ** 6
    if lab.get('spread'):  # the scale's numbers: each word on its own, evenly from end to end
        words = text.split()
        d = np.array([np.cos(ang), np.sin(ang)])
        step = length / max(len(words) - 1, 1) * 0.94
        for i, w in enumerate(words):
            c = centre + d * (i - (len(words) - 1) / 2) * step
            place(base, *render([w], font, 10 ** 6, thick * k, 1), c * k, ang)
        return
    lines = lab.get('lines') or [text]
    size = None
    if not lab.get('lines') and not lab.get('height'):
        # a one-line name between its own fitted size and the map's common one: of the owner's 159 hand
        # sizes on Books 3-6 and 12, fitting each to its own ink set 71 more than 15% off, one size a
        # map 44, this blend 16. A name much bigger than the rest (a title, a region) keeps its own.
        size = fit_size(lines, font, length * k, thick * k)
        if COMMON and size <= BIG * COMMON * k:
            size = COMMON * k * SNAP * (size / (COMMON * k)) ** PULL
    # stacked lines are fitted to their box, which is already the size wanted
    mask, lh = render(lines, font, length * k, thick * k, len(lines), 1 if lab.get('lines') else None,
                      lab.get('leading', 1), size)
    place(base, mask, lh, centre * k, ang)


def place(base, mask, lh, centre, ang):
    deg = -np.degrees(ang)  # PIL turns anticlockwise; ang is measured with y down
    mask = mask.rotate(deg, resample=Image.BICUBIC, expand=True)
    x = int(round(centre[0] - mask.width / 2))
    y = int(round(centre[1] - mask.height / 2))
    region = np.asarray(base.crop((x, y, x + mask.width, y + mask.height)))
    if PHASE == 'wipe':  # every wipe before any drawing, or one name's wipe eats the last one's type
        base.paste(Image.fromarray(wipe(region, np.asarray(mask), lh)), (x, y))
        return
    region = region.astype(np.float32)
    a = np.asarray(mask, np.float32)[..., None] / 255
    region = region * (1 - a) + np.array(INK, np.float32) * a
    base.paste(Image.fromarray(region.astype(np.uint8)), (x, y))


WIPE = False  # set in main: on a repaint, clear Gemini's own try at a name before setting it
PHASE = 'draw'


def wipe(region, mask, lh):
    """Gemini's thin dark strokes near where the name is about to go, filled from the paint round
    them. Gemini placed each name where the lettered input had it, so its misspelling sits there;
    a correct name beside it lies further off and stays. Thick shapes (its trees) stay too."""
    bgr = cv2.cvtColor(region, cv2.COLOR_RGB2BGR)
    m, _ = ink_mask(bgr, 30, 32)
    blob = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    m &= cv2.dilate(blob, np.ones((9, 9), np.uint8)) == 0
    r = max(int(lh * 0.5), 3)
    near = cv2.dilate((mask > 40).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1)))
    m = cv2.dilate((m & (near > 0)).astype(np.uint8) * 255, np.ones((5, 5), np.uint8))
    return cv2.cvtColor(cv2.inpaint(bgr, m, 7, cv2.INPAINT_TELEA), cv2.COLOR_BGR2RGB)


def erase(A, box, mode):
    """Gemini's ink inside <box> (4K px), filled from the paint around it. 'all': every dark stroke
    (flat ground only); 'letters': only thin near-neutral shapes lying inside, so trees stay."""
    x0, y0, x1, y1 = box
    c = A[y0:y1, x0:x1]
    m, dark = ink_mask(c, 30, 30)
    if mode == 'letters':
        blob = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
        lines = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, np.ones((1, 101), np.uint8)) | cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, np.ones((101, 1), np.uint8))
        m &= cv2.dilate(lines, np.ones((5, 5), np.uint8)) == 0  # the grid lines cross names
        m &= cv2.dilate(blob, np.ones((9, 9), np.uint8)) == 0
        n, cc, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8))
        h, w = m.shape
        inside = np.array([True] + [s[0] > 0 and s[1] > 0 and s[0] + s[2] < w and s[1] + s[3] < h for s in st[1:]])
        m = inside[cc] & m
    else:
        m = dark > 25
    m = cv2.dilate(m.astype(np.uint8) * 255, np.ones((7, 7), np.uint8))
    A[y0:y1, x0:x1] = cv2.inpaint(c, m, 9, cv2.INPAINT_TELEA)


def unmark(A, k):
    """Gemini's sparkle watermark: a flat, half see-through grey star in the bottom-right corner."""
    h, w = A.shape[:2]
    x0, y0 = w - int(200 * k), h - int(200 * k)
    c = A[y0:, x0:]
    lab = cv2.cvtColor(c, cv2.COLOR_BGR2LAB).astype(int)
    m = ((np.hypot(lab[..., 1] - 128, lab[..., 2] - 128) < 14) & (lab[..., 0] > 90) & (lab[..., 0] < 240)).astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))  # the star, not paper grain
    A[y0:, x0:] = cv2.inpaint(c, cv2.dilate(m, np.ones((11, 11), np.uint8)), 9, cv2.INPAINT_TELEA)


def main():
    ap = argparse.ArgumentParser()
    for n in ('faithful', 'labels', 'repaint', 'warp', 'out'):
        ap.add_argument(n)
    ap.add_argument('--mark', action='append', default=[])
    ap.add_argument('--only', default='')
    ap.add_argument('--all', action='store_true')  # on a repaint with nothing ticked: set every name again
    ap.add_argument('--hand', default='Cabin.ttf|SemiBold')
    ap.add_argument('--caps', default='Cabin.ttf|SemiBold')
    ap.add_argument('--sheet', default='')  # where the sheet goes; map-4k.webp's goes to work/, not beside it
    a = ap.parse_args()
    F = read(a.faithful)
    fh, fw = F.shape[:2]
    labels = json.loads(Path(a.labels).read_text(encoding='utf-8'))
    todo = [lab for lab in labels if lab.get('retype') or lab.get('fix')]
    if a.only:  # just the labels Gemini still got wrong, by number in the list
        todo = [labels[int(i)] for i in a.only.split(',')]
    elif a.warp != '-' and any(lab.get('reset') for lab in labels):  # the same, ticked in the editor
        todo = [lab for lab in labels if lab.get('reset') or lab.get('fix')]
    elif a.warp != '-' and not a.all:  # nothing ticked: keep Gemini's names (ADR 0004; re-setting
        todo = [lab for lab in labels if lab.get('fix')]  # them all left Book 12 a doubled "Vorndarol")
    if a.warp == '-':
        # Gemini's input instead: <repaint> is map_erase.py's picture, lettered at its own size
        A = read(a.repaint)
        H, W = A.shape[:2]
        k = W / fw
        pad = lambda b, p: [int(b[0] * k) - p, int(b[1] * k) - p, int(b[2] * k) + p, int(b[3] * k) + p]
        for lab in todo:
            if lab.get('fix'):  # still in the scan's own lettering: clear it first
                erase(A, pad(lab['box'], 3), 'all')
    else:
        k = WIDTH / fw
        W, H = WIDTH, round(fh * k)
        wp = json.loads(Path(a.warp).read_text())
        G = read(a.repaint)
        # repaint-x4 px -> repaint px -> the resize map_check made -> its homography -> 4K
        S = lambda sx, sy: np.diag([sx, sy, 1.0])
        M = S(k, k) @ np.array(wp['H']) @ S(fw / wp['repaint'][0], fh / wp['repaint'][1]) @ S(wp['repaint'][0] / G.shape[1], wp['repaint'][1] / G.shape[0])
        A = cv2.warpPerspective(G, M, (W, H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
        del G
        pad = lambda b, p: [int(b[0] * k) - p, int(b[1] * k) - p, int(b[2] * k) + p, int(b[3] * k) + p]
        for lab in todo:
            if lab.get('fix'):  # misspelled hand lettering on flat panel or paper: clear its box
                erase(A, pad(lab['box'], 12), 'all')
        for m in a.mark:
            erase(A, pad([int(v) for v in m.split(',')], 0), 'all')
        unmark(A, k)

    global K, WIPE, COMMON
    K, WIPE = k, a.warp != '-'
    scan_ink = LabelInk(F)  # the same ink map_erase.py takes out
    # from every lettered name, not only those set this run, so a name set again keeps its size
    COMMON = common_size(labels, scan_ink, FONTS / a.hand, FONTS / a.caps)
    base = Image.fromarray(cv2.cvtColor(A, cv2.COLOR_BGR2RGB))
    global PHASE
    for PHASE in (['wipe'] if WIPE else []) + ['draw']:
        for lab in todo:
            if PHASE == 'wipe' and lab.get('fix'):  # its box is cleared already; the wipe ate a panel's lines (Book 3's scale)
                continue
            letter(base, lab, scan_ink, FONTS / a.hand, FONTS / a.caps, k)
    out = Path(a.out)
    base.save(out, quality=90, method=6) if out.suffix == '.webp' else base.save(out, quality=92)
    print(f'{out}: {W}x{H}, {out.stat().st_size // 1024} KB, lettered {len(todo)}, marks {len(a.mark)}')

    # the sheet: scan (scaled to 4K) beside the result, for each lettered label
    R = cv2.cvtColor(np.asarray(base), cv2.COLOR_RGB2BGR)
    Fk = cv2.resize(F, (W, H), interpolation=cv2.INTER_CUBIC)
    rows = []
    for lab in todo:
        x0, y0, x1, y1 = pad(lab['box'], 30)
        x0, y0 = max(x0, 0), max(y0, 0)
        p, q = Fk[y0:y1, x0:x1], R[y0:y1, x0:x1]
        s = min(1.0, 500 / p.shape[1], 260 / p.shape[0])
        p, q = (cv2.resize(m, None, fx=s, fy=s, interpolation=cv2.INTER_AREA) for m in (p, q))
        row = np.full((p.shape[0] + 8, 2 * p.shape[1] + 24, 3), 255, np.uint8)
        row[4:4 + p.shape[0], :p.shape[1]], row[4:4 + p.shape[0], p.shape[1] + 24:] = p, q
        rows.append(row)
    if not rows:  # nothing lettered: no sheet, and none left from an earlier run
        Path(a.sheet or str(out.with_name(out.stem + '-sheet.png'))).unlink(missing_ok=True)
        return
    Wd = max(r.shape[1] for r in rows)
    sheet = np.vstack([np.pad(r, ((0, 0), (0, Wd - r.shape[1]), (0, 0)), constant_values=255) for r in rows])
    cv2.imencode('.png', sheet)[1].tofile(a.sheet or str(out.with_name(out.stem + '-sheet.png')))


if __name__ == '__main__':
    main()
