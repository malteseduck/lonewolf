"""map_letter.py: measuring the scan's ink, setting type, wiping and erasing Gemini's strokes,
and the run that picks which labels to set. Stand-in images only; Cabin from tools/fonts/."""
import json
import math
import sys

import cv2
import numpy as np
import pytest
from PIL import Image

import map_letter
from map_erase import LabelInk

PAPER = (190, 215, 232)       # BGR
INK = (20, 20, 20)
CABIN = str(map_letter.FONTS / 'Cabin.ttf') + '|SemiBold'


def paper(w=300, h=200, col=PAPER):
    return np.full((h, w, 3), col, np.uint8)


def write_png(path, im):
    cv2.imencode('.png', im)[1].tofile(str(path))


@pytest.fixture(autouse=True)
def module_state(monkeypatch):
    """map_letter keeps K, WIPE, PHASE and COMMON in module globals that main sets."""
    monkeypatch.setattr(map_letter, 'K', 1)
    monkeypatch.setattr(map_letter, 'WIPE', False)
    monkeypatch.setattr(map_letter, 'PHASE', 'draw')
    monkeypatch.setattr(map_letter, 'COMMON', None)


# ---- ink_mask -----------------------------------------------------------------------------

def test_ink_mask_finds_dark_neutral_strokes():
    im = paper()
    im[100:103, 100:130] = INK
    m, dark = map_letter.ink_mask(im)
    assert m[100:103, 100:130].all()
    assert m.sum() == 3 * 30
    assert dark[101, 110] > 100 and dark[10, 10] == 0






# ---- geometry -----------------------------------------------------------------------------

def scan_ink(draw):
    im = paper()
    draw(im)
    return LabelInk(im)


def test_geometry_of_a_level_stroke():
    li = scan_ink(lambda im: im.__setitem__((slice(100, 103), slice(100, 150)), INK))
    c, ang, length, thick = map_letter.geometry(li, {'box': [95, 92, 155, 110]})
    assert abs(c[0] - 124.5) < 1 and abs(c[1] - 101) < 1
    assert abs(math.degrees(ang)) < 1
    assert abs(length - 49) < 1.5
    assert abs(thick - 2) < 1.5


def test_geometry_takes_the_ocr_slant_only_where_the_ink_is_a_little_off_it():
    li = scan_ink(lambda im: im.__setitem__((slice(100, 103), slice(100, 150)), INK))
    box = [95, 92, 155, 110]
    def deg(**kw):
        return math.degrees(map_letter.geometry(li, {'box': box, **kw})[1])
    assert abs(deg(slant=10) - 10) < 0.1   # a road or tree in the box skews the ink's axis: OCR's line wins
    assert abs(deg(slant=1.5)) < 1         # they agree: the ink's own
    assert abs(deg(slant=60)) < 1          # too far apart: OCR misread a short word's box
    assert abs(deg(slant=10, angle=-5) + 5) < 0.1  # a hand angle wins over both


def slanted():
    return scan_ink(lambda im: cv2.line(im, (100, 100), (140, 140), INK, 3))


BOX45 = [95, 95, 146, 146]








# ---- render -------------------------------------------------------------------------------

def ink_extent(img):
    ys, xs = np.nonzero(np.asarray(img) > 128)
    return xs.min(), xs.max(), ys.min(), ys.max()


def test_render_at_an_outright_size():
    img, own = map_letter.render(['HOLM'], CABIN, 0, 0, 1, size=40)
    assert img.mode == 'L'
    x0, x1, y0, y1 = ink_extent(img)
    assert 40 * 0.6 < y1 - y0 < 40 * 1.0           # capitals about 0.7 em tall
    assert own > 40                                # a font's own line height beats its em
    assert x0 > 0 and y0 > 0                       # padded all round for the wipe's reach
















# ---- place --------------------------------------------------------------------------------

def test_place_draws_ink_colour_at_the_centre():
    base = Image.new('RGB', (100, 100), (255, 255, 255))
    mask = Image.new('L', (30, 10), 255)
    map_letter.place(base, mask, 10, np.array([50.0, 50.0]), 0.0)
    assert base.getpixel((50, 50)) == map_letter.INK
    assert base.getpixel((5, 5)) == (255, 255, 255)
    assert base.getpixel((50, 62)) == (255, 255, 255)








# ---- wipe ---------------------------------------------------------------------------------



# ---- erase --------------------------------------------------------------------------------

def test_erase_all_fills_every_dark_stroke_in_the_box():
    A = paper(200, 120)
    A[50:53, 40:90] = INK
    A[10:13, 10:30] = INK                            # outside the box
    map_letter.erase(A, (30, 40, 110, 70), 'all')
    assert A[50:53, 40:90].mean() > 180
    assert A[10:13, 10:30].mean() < 60






# ---- unmark -------------------------------------------------------------------------------





# ---- letter -------------------------------------------------------------------------------

def blank_base(w=300, h=200):
    return Image.new('RGB', (w, h), (255, 255, 255))


def drawn_centre(base):
    ys, xs = np.nonzero((np.asarray(base).astype(int).sum(-1) < 600))
    return (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2, xs.max() - xs.min(), ys.max() - ys.min()


def test_letter_places_by_hand_with_set():
    base = blank_base()
    lab = {'text': 'HOLM', 'box': [0, 0, 1, 1], 'set': {'at': [150, 100], 'size': 30, 'angle': 0}}
    map_letter.letter(base, lab, None, CABIN, CABIN, 1)
    cx, cy, w, h = drawn_centre(base)
    assert abs(cx - 150) < 8 and abs(cy - 100) < 10
    assert 40 < w < 110








def level_bar_ink():
    return scan_ink(lambda im: im.__setitem__((slice(100, 103), slice(100, 150)), INK))




def test_letter_measures_the_scan_and_fits_the_ink_length():
    base = blank_base()
    lab = {'text': 'HOLM', 'box': [95, 92, 155, 110]}
    map_letter.letter(base, lab, level_bar_ink(), CABIN, CABIN, 1)
    cx, cy, w, _ = drawn_centre(base)
    assert abs(cx - 124.5) < 5 and abs(cy - 101) < 6
    assert w <= 49 * 1.1                                 # fitted to the ink, at most a little over


def test_letter_sets_a_name_between_its_own_size_and_the_maps_unless_its_own_is_much_bigger(monkeypatch):
    ink = scan_ink(lambda im: cv2.putText(im, 'HOLM', (110, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.6, INK, 2))
    lab = {'text': 'HOLM', 'box': [100, 90, 180, 118]}
    def width(common):
        monkeypatch.setattr(map_letter, 'COMMON', common)
        base = blank_base()
        map_letter.letter(base, lab, ink, CABIN, CABIN, 1)
        return drawn_centre(base)[2]
    own = width(None)               # no common size: fitted to its own ink
    assert width(1) == own          # its own is over 1.25 times the map's: a title or region keeps it
    s = map_letter.fit_size(['HOLM'], CABIN, *map_letter.geometry(ink, lab)[2:])
    assert 1.4 < width(3 * s) / own < 2.5  # a small name on a map of names 3 times its size: pulled up, not all the way


def test_common_size_is_the_median_of_the_single_line_names():
    bars = ((20, 12), (60, 20), (100, 28))  # short enough that each is sized by its length
    li = scan_ink(lambda im: [im.__setitem__((slice(y, y + 6), slice(20, 20 + n)), INK) for y, n in bars])
    labs = [{'text': 'HOLM', 'box': [15, y - 5, 25 + n, y + 11], 'retype': True} for y, n in bars]
    sizes = [map_letter.fit_size(['HOLM'], CABIN, *map_letter.geometry(li, lab)[2:], 1) for lab in labs]
    others = [{'text': 'A B', 'box': [15, 140, 200, 190], 'retype': True, 'lines': ['A', 'B']},  # stacked: fills its box
              {'text': 'KEY', 'box': [15, 15, 60, 30], 'retype': False},                       # left as drawn
              {'text': 'NONE', 'box': [250, 150, 290, 190], 'retype': True}]                     # no ink to measure
    assert map_letter.common_size(labs + others, li, CABIN, CABIN) == pytest.approx(sorted(sizes)[1])


def test_letter_skips_a_label_with_no_ink_to_measure(capsys):
    # its letters joined to a road: none of the box's ink counts, so it says so instead of crashing
    base = blank_base()
    lab = {'text': 'HOLM', 'box': [20, 20, 60, 40], 'retype': True}
    map_letter.letter(base, lab, level_bar_ink(), CABIN, CABIN, 1)
    assert np.asarray(base).min() == 255
    assert '[20, 20, 60, 40]' in capsys.readouterr().out










# ---- main ---------------------------------------------------------------------------------

@pytest.fixture
def files(tmp_path):
    """A 200x120 stand-in scan, a 400x240 'repaint', an identity warp, and a label list."""
    scan = paper(200, 120)
    scan[50:53, 60:100] = INK
    scan[80:83, 60:100] = INK
    scan[100:103, 60:100] = INK
    write_png(tmp_path / 'scan.png', scan)
    write_png(tmp_path / 'rep.png', paper(400, 240))
    (tmp_path / 'H.json').write_text(json.dumps(
        {'H': np.eye(3).tolist(), 'repaint': [200, 120], 'faithful': [200, 120]}))
    labels = [
        {'text': 'AAA', 'box': [55, 45, 105, 58], 'retype': True},          # 0
        {'text': 'BBB', 'box': [55, 75, 105, 88], 'fix': True},             # 1
        {'text': 'CCC', 'box': [55, 95, 105, 108]},                         # 2: kept as drawn
        {'text': 'DDD', 'box': [55, 95, 105, 108], 'retype': True, 'reset': True},  # 3
    ]
    (tmp_path / 'labels.json').write_text(json.dumps(labels))
    return tmp_path


def run_main(monkeypatch, files, *extra, warp='H.json', labels=None, out='out.png'):
    if labels is not None:
        (files / 'labels.json').write_text(json.dumps(labels))
    done = []
    monkeypatch.setattr(map_letter, 'WIDTH', 400)
    monkeypatch.setattr(map_letter, 'letter', lambda base, lab, *a: done.append(lab['text']))
    argv = ['map_letter.py', str(files / 'scan.png'), str(files / 'labels.json'), str(files / 'rep.png'),
            warp if warp == '-' else str(files / warp), str(files / out), *extra]
    monkeypatch.setattr(sys, 'argv', argv)
    map_letter.main()
    return done


def test_main_resets_ticked_labels_and_fix_labels(monkeypatch, files, capsys):
    done = run_main(monkeypatch, files)
    # 'reset' is ticked on DDD, so the ticked ones and the fix ones are done; the wipe pass
    # skips the fix label, so BBB is lettered once and DDD twice
    assert sorted(set(done)) == ['BBB', 'DDD']
    assert 'lettered 2, marks 0' in capsys.readouterr().out
















def test_main_writes_the_sheet_beside_the_output_or_where_told(monkeypatch, files):
    run_main(monkeypatch, files)
    assert (files / 'out-sheet.png').exists()
    run_main(monkeypatch, files, '--sheet', str(files / 'elsewhere.png'))
    assert (files / 'elsewhere.png').exists()
    sheet = Image.open(files / 'elsewhere.png')
    assert sheet.height > 0 and sheet.width > 0








