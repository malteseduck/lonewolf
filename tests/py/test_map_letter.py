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
    """map_letter keeps K, WIPE and PHASE in module globals that main sets."""
    monkeypatch.setattr(map_letter, 'K', 1)
    monkeypatch.setattr(map_letter, 'WIPE', False)
    monkeypatch.setattr(map_letter, 'PHASE', 'draw')


# ---- ink_mask -----------------------------------------------------------------------------

def test_ink_mask_finds_dark_neutral_strokes():
    im = paper()
    im[100:103, 100:130] = INK
    m, dark = map_letter.ink_mask(im)
    assert m[100:103, 100:130].all()
    assert m.sum() == 3 * 30
    assert dark[101, 110] > 100 and dark[10, 10] == 0


def test_ink_mask_rejects_coloured_strokes_unless_chroma_allowed():
    im = paper()
    im[100:103, 100:130] = (0, 0, 220)
    assert not map_letter.ink_mask(im)[0].any()
    assert map_letter.ink_mask(im, 30, 200)[0][101, 110]


def test_ink_mask_dark_min_cuts_faint_strokes():
    im = paper()
    im[100:103, 100:130] = tuple(c - 22 for c in PAPER)
    assert not map_letter.ink_mask(im)[0].any()
    assert map_letter.ink_mask(im, 15)[0][101, 110]


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


def slanted():
    return scan_ink(lambda im: cv2.line(im, (100, 100), (140, 140), INK, 3))


BOX45 = [95, 95, 146, 146]


def test_geometry_slanted_stroke_reads_left_to_right_by_default():
    _, ang, length, _ = map_letter.geometry(slanted(), {'box': BOX45})
    assert abs(math.degrees(ang) - 45) < 2
    assert abs(length - 40 * math.sqrt(2)) < 6


def test_geometry_upwards_and_downwards_pick_the_reading_direction():
    up = map_letter.geometry(slanted(), {'box': BOX45, 'where': 'running upwards'})[1]
    down = map_letter.geometry(slanted(), {'box': BOX45, 'where': 'running downwards'})[1]
    assert abs(math.degrees(up) - (-135)) < 2      # y down: up is a negative sine
    assert abs(math.degrees(down) - 45) < 2


def test_geometry_hand_angle_overrides_the_axis():
    _, ang, length, thick = map_letter.geometry(slanted(), {'box': BOX45, 'angle': 0})
    assert ang == 0
    # measured along the level axis the diagonal stroke spans ~40 px across ~40 px
    assert abs(length - 40) < 6 and abs(thick - 40) < 6


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


def test_render_size_scales_the_type():
    small, _ = map_letter.render(['HOLM'], CABIN, 0, 0, 1, size=30)
    big, _ = map_letter.render(['HOLM'], CABIN, 0, 0, 1, size=60)
    ws, wb = (ink_extent(i)[1] - ink_extent(i)[0] for i in (small, big))
    assert 1.8 < wb / ws < 2.2


def test_render_fits_the_longest_line_to_fill_times_length():
    # thick huge: the length binds, not the thickness
    img, _ = map_letter.render(['HOLM'], CABIN, 200, 1000, 1, boost=1)
    x0, x1, _, _ = ink_extent(img)
    assert 0.9 * 200 * map_letter.FILL < x1 - x0 < 1.1 * 200 * map_letter.FILL


def test_render_thickness_caps_the_size():
    free, _ = map_letter.render(['HOLM'], CABIN, 400, 1000, 1, boost=1)
    capped, _ = map_letter.render(['HOLM'], CABIN, 400, 12, 1, boost=1)
    assert ink_extent(capped)[3] - ink_extent(capped)[2] < ink_extent(free)[3] - ink_extent(free)[2]


def test_render_small_names_get_the_scale_boost():
    # thin ink (under SMALL px): boosted by SCALE when no boost is given
    plain, _ = map_letter.render(['HOLM'], CABIN, 1000, 10, 1, boost=1)
    boosted, _ = map_letter.render(['HOLM'], CABIN, 1000, 10, 1)
    hp, hb = (ink_extent(i)[3] - ink_extent(i)[2] for i in (plain, boosted))
    assert hb / hp == pytest.approx(map_letter.SCALE, rel=0.1)
    # thick ink (over SMALL) is not
    thick, _ = map_letter.render(['HOLM'], CABIN, 1000, 60, 1)
    thick1, _ = map_letter.render(['HOLM'], CABIN, 1000, 60, 1, boost=1)
    assert ink_extent(thick)[1:] == ink_extent(thick1)[1:]


def test_render_two_lines_are_taller_and_leading_spreads_them():
    one, _ = map_letter.render(['HOLM'], CABIN, 0, 0, 1, size=40)
    two, _ = map_letter.render(['HOLM', 'GARD'], CABIN, 0, 0, 2, size=40)
    wide, _ = map_letter.render(['HOLM', 'GARD'], CABIN, 0, 0, 2, leading=2, size=40)
    assert two.height > one.height
    assert wide.height > two.height
    assert two.width == one.width or abs(two.width - one.width) < 20


def test_render_centres_each_line():
    img, _ = map_letter.render(['HOLMGARD', 'IO'], CABIN, 0, 0, 2, size=40)
    a = np.asarray(img) > 128
    top, bottom = a[: img.height // 2], a[img.height // 2:]
    cx = lambda m: np.nonzero(m.any(0))[0].mean()
    assert abs(cx(top) - cx(bottom)) < 6


def test_render_never_goes_below_six_px_type():
    img, own = map_letter.render(['A'], CABIN, 0, 0, 1, size=1)
    assert img.width > 0 and own > 0


# ---- place --------------------------------------------------------------------------------

def test_place_draws_ink_colour_at_the_centre():
    base = Image.new('RGB', (100, 100), (255, 255, 255))
    mask = Image.new('L', (30, 10), 255)
    map_letter.place(base, mask, 10, np.array([50.0, 50.0]), 0.0)
    assert base.getpixel((50, 50)) == map_letter.INK
    assert base.getpixel((5, 5)) == (255, 255, 255)
    assert base.getpixel((50, 62)) == (255, 255, 255)


def test_place_turns_the_type_with_the_angle():
    # only the start of the line is solid; reading downwards (90 deg, y down) puts the start on top
    base = Image.new('RGB', (100, 100), (255, 255, 255))
    mask = Image.new('L', (40, 6), 0)
    mask.paste(255, (0, 0, 10, 6))
    map_letter.place(base, mask, 6, np.array([50.0, 50.0]), math.radians(90))
    assert base.getpixel((50, 35)) == map_letter.INK
    assert base.getpixel((50, 65)) == (255, 255, 255)


def test_place_blends_by_the_mask():
    base = Image.new('RGB', (60, 60), (255, 255, 255))
    mask = Image.new('L', (20, 20), 128)
    map_letter.place(base, mask, 10, np.array([30.0, 30.0]), 0.0)
    r = base.getpixel((30, 30))[0]
    assert map_letter.INK[0] < r < 255
    assert abs(r - (255 + map_letter.INK[0]) / 2) < 4


def test_place_in_wipe_phase_draws_nothing_but_clears_strokes(monkeypatch):
    monkeypatch.setattr(map_letter, 'PHASE', 'wipe')
    arr = paper(120, 80)[..., ::-1].copy()          # RGB paper
    arr[40:43, 40:70] = (20, 20, 20)
    base = Image.fromarray(arr)
    mask = Image.new('L', (60, 30), 255)
    map_letter.place(base, mask, 20, np.array([55.0, 41.0]), 0.0)
    out = np.asarray(base)
    assert out[40:43, 45:65].mean() > 150           # the stroke is gone
    assert not (out == np.array(map_letter.INK)).all(-1).any()   # and no type was drawn


# ---- wipe ---------------------------------------------------------------------------------

def test_wipe_clears_thin_strokes_near_the_mask_and_keeps_far_ones_and_blobs():
    rgb = paper(220, 100)[..., ::-1].copy()
    rgb[50:52, 30:50] = (20, 20, 20)                 # thin stroke under the mask
    rgb[20:22, 190:215] = (20, 20, 20)               # thin stroke far from it
    cv2.circle(rgb, (100, 50), 9, (20, 20, 20), -1)  # a tree under the mask
    mask = np.zeros((100, 220), np.uint8)
    mask[40:60, 20:120] = 255
    out = map_letter.wipe(rgb, mask, 20)
    assert out[50:52, 32:48].mean() > 180            # wiped
    assert out[20:22, 190:215].mean() < 60           # too far to be touched
    assert out[50, 100].max() < 60                   # blob stays
    assert out.shape == rgb.shape


# ---- erase --------------------------------------------------------------------------------

def test_erase_all_fills_every_dark_stroke_in_the_box():
    A = paper(200, 120)
    A[50:53, 40:90] = INK
    A[10:13, 10:30] = INK                            # outside the box
    map_letter.erase(A, (30, 40, 110, 70), 'all')
    assert A[50:53, 40:90].mean() > 180
    assert A[10:13, 10:30].mean() < 60


def test_erase_letters_keeps_shapes_touching_the_box_edge():
    A = paper(200, 120)
    A[30:33, 30:60] = INK        # fully inside the box (box is 20..120 x 20..80)
    A[60:63, 60:120] = INK       # runs out of the right edge: a road
    map_letter.erase(A, (20, 20, 120, 80), 'letters')
    assert A[30:33, 30:60].mean() > 180
    assert A[60:63, 70:119].mean() < 60


def test_erase_letters_keeps_thick_blobs():
    A = paper(200, 120)
    cv2.circle(A, (70, 50), 12, INK, -1)
    map_letter.erase(A, (20, 20, 120, 80), 'letters')
    assert A[50, 70].max() < 60


# ---- unmark -------------------------------------------------------------------------------

def test_unmark_removes_a_grey_star_in_the_bottom_right_corner():
    ground = (150, 200, 230)                         # a strongly coloured paper
    A = paper(600, 400, ground)
    A[330:370, 530:570] = (128, 128, 128)            # flat neutral grey: the watermark
    A[50:90, 50:90] = (128, 128, 128)                # same grey elsewhere is not a watermark
    map_letter.unmark(A, 1.0)
    assert np.abs(A[330:370, 530:570].astype(int) - ground).max() < 40
    assert (A[50:90, 50:90] == 128).all()


def test_unmark_scales_its_corner_with_k():
    ground = (150, 200, 230)
    A = paper(600, 400, ground)
    A[330:370, 530:570] = (128, 128, 128)
    map_letter.unmark(A, 0.1)                        # corner is only 20 px: the patch lies outside it
    assert (A[330:370, 530:570] == 128).sum() > 0


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


def test_letter_set_is_scaled_by_k():
    one, two = blank_base(), blank_base(600, 400)
    lab = {'text': 'HOLM', 'box': [0, 0, 1, 1], 'set': {'at': [150, 100], 'size': 30, 'angle': 0}}
    map_letter.letter(one, lab, None, CABIN, CABIN, 1)
    map_letter.letter(two, lab, None, CABIN, CABIN, 2)
    (c1x, c1y, w1, _), (c2x, c2y, w2, _) = drawn_centre(one), drawn_centre(two)
    assert abs(c2x - 2 * c1x) < 4 and abs(c2y - 2 * c1y) < 4
    assert w2 / w1 == pytest.approx(2, rel=0.1)


def test_letter_set_angle_turns_the_name():
    base = blank_base()
    lab = {'text': 'HOLMGARD', 'box': [0, 0, 1, 1], 'set': {'at': [150, 100], 'size': 24, 'angle': 90}}
    map_letter.letter(base, lab, None, CABIN, CABIN, 1)
    _, _, w, h = drawn_centre(base)
    assert h > w


def test_letter_picks_hand_font_for_mixed_case_and_caps_font_for_capitals(monkeypatch):
    seen = []
    monkeypatch.setattr(map_letter, 'render', lambda lines, font, *a, **k: (seen.append(font) or (Image.new('L', (4, 4)), 4)))
    monkeypatch.setattr(map_letter, 'place', lambda *a: None)
    s = {'at': [10, 10], 'size': 20, 'angle': 0}
    map_letter.letter(blank_base(), {'text': 'Holm', 'box': [0, 0, 1, 1], 'set': s}, None, 'HAND', 'CAPS', 1)
    map_letter.letter(blank_base(), {'text': 'HOLM', 'box': [0, 0, 1, 1], 'set': s}, None, 'HAND', 'CAPS', 1)
    assert seen == ['HAND', 'CAPS']


def level_bar_ink():
    return scan_ink(lambda im: im.__setitem__((slice(100, 103), slice(100, 150)), INK))


def test_letter_with_a_blank_hand_placement_falls_back_to_the_measure(capsys):
    base = blank_base()
    lab = {'text': 'HOLM', 'box': [95, 92, 155, 110], 'set': {'at': [None, None], 'size': 30, 'angle': 0}}
    map_letter.letter(base, lab, level_bar_ink(), CABIN, CABIN, 1)
    assert 'blank number' in capsys.readouterr().out
    cx, cy, _, _ = drawn_centre(base)
    assert abs(cx - 124.5) < 6 and abs(cy - 101) < 6   # set where the scan's ink was


def test_letter_measures_the_scan_and_fits_the_ink_length():
    base = blank_base()
    lab = {'text': 'HOLM', 'box': [95, 92, 155, 110]}
    map_letter.letter(base, lab, level_bar_ink(), CABIN, CABIN, 1)
    cx, cy, w, _ = drawn_centre(base)
    assert abs(cx - 124.5) < 5 and abs(cy - 101) < 6
    assert w <= 49 * 1.1                                 # fitted to the ink, at most a little over


def test_letter_nudge_moves_the_name():
    a, b = blank_base(), blank_base()
    lab = {'text': 'HOLM', 'box': [95, 92, 155, 110]}
    map_letter.letter(a, lab, level_bar_ink(), CABIN, CABIN, 1)
    map_letter.letter(b, dict(lab, nudge=[20, -15]), level_bar_ink(), CABIN, CABIN, 1)
    (ax, ay, _, _), (bx, by, _, _) = drawn_centre(a), drawn_centre(b)
    assert (bx - ax, by - ay) == pytest.approx((20, -15), abs=2)


def test_letter_with_lines_stacks_them_level_in_the_box():
    base = blank_base()
    lab = {'text': 'HOLM GARD', 'lines': ['HOLM', 'GARD'], 'box': [100, 80, 200, 130], 'angle': 0}
    map_letter.letter(base, lab, level_bar_ink(), CABIN, CABIN, 1)
    cx, cy, w, h = drawn_centre(base)
    assert w < 110 and h > 25                             # two lines: taller than one


def test_letter_height_gives_the_type_height_outright():
    small, big = blank_base(), blank_base()
    lab = {'text': 'HOLM', 'box': [95, 92, 155, 110]}
    # both over SMALL (thick = height / 1.25 >= 30), so neither gets the small-name boost
    map_letter.letter(small, dict(lab, height=40), level_bar_ink(), CABIN, CABIN, 1)
    map_letter.letter(big, dict(lab, height=80), level_bar_ink(), CABIN, CABIN, 1)
    assert drawn_centre(big)[3] == pytest.approx(2 * drawn_centre(small)[3], rel=0.12)


def test_letter_spread_sets_each_word_apart_along_the_ink():
    base = blank_base()
    lab = {'text': '1 2 3', 'box': [95, 92, 155, 110], 'spread': True, 'height': 16}
    map_letter.letter(base, lab, level_bar_ink(), CABIN, CABIN, 1)
    cols = (np.asarray(base).astype(int).sum(-1) < 600).any(0)
    runs = np.diff(np.concatenate([[0], cols.astype(int), [0]]))
    assert (runs == 1).sum() == 3                        # three words, three separate runs
    cx = drawn_centre(base)[0]
    assert abs(cx - 124.5) < 5


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


def test_main_with_nothing_ticked_does_only_the_fix_labels(monkeypatch, files, capsys):
    labels = [dict(l) for l in json.loads((files / 'labels.json').read_text())]
    for l in labels:
        l.pop('reset', None)
    done = run_main(monkeypatch, files, labels=labels)
    assert set(done) == {'BBB'}
    assert 'lettered 1' in capsys.readouterr().out


def test_main_all_sets_every_retype_and_fix_label(monkeypatch, files):
    labels = [dict(l) for l in json.loads((files / 'labels.json').read_text())]
    for l in labels:
        l.pop('reset', None)
    done = run_main(monkeypatch, files, '--all', labels=labels)
    assert set(done) == {'AAA', 'BBB', 'DDD'}


def test_main_only_names_labels_by_number(monkeypatch, files, capsys):
    done = run_main(monkeypatch, files, '--only', '0,2')
    assert set(done) == {'AAA', 'CCC'}
    assert 'lettered 2' in capsys.readouterr().out


def test_main_dash_warp_letters_gemini_input_with_every_retype_and_fix(monkeypatch, files):
    write_png(files / 'rep.png', paper(200, 120))      # the erased picture, at the scan's size
    done = run_main(monkeypatch, files, warp='-')
    assert set(done) == {'AAA', 'BBB', 'DDD'}          # 'reset' plays no part here


def test_main_output_size_follows_the_width_and_warp(monkeypatch, files, capsys):
    run_main(monkeypatch, files)
    out = Image.open(files / 'out.png')
    assert out.size == (400, 240)                       # WIDTH 400 over a 200x120 scan
    assert '400x240' in capsys.readouterr().out


def test_main_dash_warp_keeps_the_input_size(monkeypatch, files):
    write_png(files / 'rep.png', paper(200, 120))
    run_main(monkeypatch, files, warp='-')
    assert Image.open(files / 'out.png').size == (200, 120)


def test_main_saves_webp_when_asked(monkeypatch, files):
    run_main(monkeypatch, files, out='out.webp')
    assert Image.open(files / 'out.webp').format == 'WEBP'


def test_main_writes_the_sheet_beside_the_output_or_where_told(monkeypatch, files):
    run_main(monkeypatch, files)
    assert (files / 'out-sheet.png').exists()
    run_main(monkeypatch, files, '--sheet', str(files / 'elsewhere.png'))
    assert (files / 'elsewhere.png').exists()
    sheet = Image.open(files / 'elsewhere.png')
    assert sheet.height > 0 and sheet.width > 0


def test_main_removes_a_stale_sheet_when_nothing_is_lettered(monkeypatch, files):
    labels = [{'text': 'CCC', 'box': [55, 95, 105, 108]}]
    stale = files / 'out-sheet.png'
    stale.write_bytes(b'old')
    done = run_main(monkeypatch, files, labels=labels)
    assert done == []
    assert not stale.exists()
    assert (files / 'out.png').exists()                  # still warps and saves


def test_main_mark_erases_gemini_ink_in_the_marked_box(monkeypatch, files):
    rep = paper(400, 240)
    rep[120:126, 100:160] = INK                           # a stray colon, in 4K-ish px (k = 2)
    write_png(files / 'rep.png', rep)
    labels = [{'text': 'CCC', 'box': [55, 95, 105, 108]}]
    run_main(monkeypatch, files, '--mark', '45,55,85,66', labels=labels)  # map-2k px -> x2
    out = np.asarray(Image.open(files / 'out.png').convert('RGB'))
    assert out[120:126, 100:160].mean() > 180


def test_main_mark_count_is_reported(monkeypatch, files, capsys):
    run_main(monkeypatch, files, '--mark', '1,1,5,5', '--mark', '6,6,9,9')
    assert 'marks 2' in capsys.readouterr().out


def test_main_wipe_phase_runs_before_drawing_on_a_repaint(monkeypatch, files):
    phases = []
    monkeypatch.setattr(map_letter, 'WIDTH', 400)
    monkeypatch.setattr(map_letter, 'letter', lambda base, lab, *a: phases.append((map_letter.PHASE, lab['text'])))
    monkeypatch.setattr(sys, 'argv', ['x', str(files / 'scan.png'), str(files / 'labels.json'),
                                      str(files / 'rep.png'), str(files / 'H.json'), str(files / 'o.png'),
                                      '--only', '0,1'])
    map_letter.main()
    # every wipe comes before any drawing; the fix label (1) is cleared up front, so not wiped
    assert phases == [('wipe', 'AAA'), ('draw', 'AAA'), ('draw', 'BBB')]
