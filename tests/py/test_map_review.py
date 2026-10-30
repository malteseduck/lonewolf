"""map_review.py: cleaning an OCR draft before anyone looks at it, and flagging the lettered names
worth a look. Stand-in names and images only; Cabin from tools/fonts/."""
import json

import cv2
import numpy as np

import map_letter
import map_review

PAPER = (190, 215, 232)       # BGR
INK = (20, 20, 20)
CABIN = str(map_letter.FONTS / 'Cabin.ttf') + '|SemiBold'
IDX = {'words': {'ruins': 9, 'of': 90, 'zarnok': 9, 'mines': 9, 'vashtor': 9, 'hills': 9},
       'text': ' ruins of zarnok \n vashtor hills \n ', 'phrases': set(),
       'long': ['ruins', 'zarnok', 'mines', 'vashtor', 'hills']}


def lab(text, box, **kw):
    return {'text': text, 'box': box, 'slant': 0, 'conf': 1, 'retype': True, **kw}


def paper(w=400, h=300):
    return np.full((h, w, 3), PAPER, np.uint8)


def texts(labels):
    return [x['text'] for x in labels]


# ---- clean --------------------------------------------------------------------------------

def test_clean_drops_what_cannot_be_a_name():
    labels, did = map_review.clean([lab('12', [10, 10, 30, 30]), lab('SAAA', [50, 10, 90, 30]), lab('44A', [10, 50, 40, 70]),
                                    lab('北水', [50, 50, 90, 70]), lab('ib', [10, 90, 30, 110]),
                                    lab('ZARNOK', [100, 90, 200, 120])], IDX)
    assert texts(labels) == ['ZARNOK']
    assert did['dropped'] == 5


def test_clean_leaves_the_scale_numbers_beside_the_scale():
    labels, _ = map_review.clean([lab('SCALE IN MILES', [100, 100, 300, 130], retype=False), lab('50', [150, 140, 180, 160]),
                                  lab('50', [900, 900, 930, 920])], IDX)
    assert texts(labels) == ['SCALE IN MILES', '50']


def test_clean_strips_a_symbol_read_onto_a_name():
    labels, did = map_review.clean([lab('ZARNOK司', [100, 90, 200, 120])], IDX)
    assert texts(labels) == ['ZARNOK']
    assert did['stripped'] == 1


def test_clean_mends_a_near_certain_misread_in_the_labels_case():
    labels, did = map_review.clean([lab('ZARNOC', [100, 90, 200, 120]), lab('Vashtar Hills', [100, 190, 300, 220])], IDX)
    assert texts(labels) == ['ZARNOK', 'Vashtor Hills']
    assert did['mended'] == 2
    assert labels[0]['mended'] == 'ZARNOC'      # the sheet flags it, as a right map-only name can be mended too
    im = paper()
    assert 'mended' in map_review.flags(labels[:1], im, im, {0: blank_mask(im.shape, [105, 95, 195, 115])})[0]


def test_clean_keeps_a_short_read_with_punctuation_or_in_capitals():
    labels, did = map_review.clean([lab('R.Ak', [10, 10, 50, 30]), lab('OGA', [100, 10, 150, 30]), lab('+', [200, 10, 220, 30]),
                                    lab('Kaí', [300, 10, 350, 30])], IDX)
    assert texts(labels) == ['R.Ak', 'OGA', '+', 'Kaí']
    assert did['dropped'] == 0


def test_clean_leaves_a_short_word_or_one_much_longer_to_the_owner():
    # 'Mins' is near 'mines', but printed as an abbreviation; 'RUINSOF' is two words run together
    labels, did = map_review.clean([lab('Mins', [100, 90, 150, 120]), lab('RUINSOF', [200, 90, 300, 120])], IDX)
    assert texts(labels) == ['Mins', 'RUINSOF']
    assert did['mended'] == 0


def test_clean_joins_a_name_read_as_two_stacked_lines():
    labels, did = map_review.clean([lab('Ruins of', [100, 100, 200, 125]), lab('Zarnok', [110, 128, 190, 153])], IDX)
    assert len(labels) == 1
    assert labels[0]['lines'] == ['Ruins of', 'Zarnok']
    assert labels[0]['text'] == 'Ruins of Zarnok'
    assert labels[0]['box'] == [100, 100, 200, 153]
    assert did['joined'] == 1


def test_clean_keeps_neighbours_apart_when_the_books_do_not_hold_them_together():
    labels, did = map_review.clean([lab('Zarnok', [100, 100, 200, 125]), lab('Vashtor', [110, 128, 190, 153])], IDX)
    assert texts(labels) == ['Zarnok', 'Vashtor']
    assert did['joined'] == 0


def test_clean_leaves_the_owners_settled_labels_alone():
    settled = lab('12', [10, 10, 30, 30], named='12')
    placed = lab('SAAA', [50, 10, 90, 30], set={'at': [70, 20], 'size': 20, 'angle': 0})
    caption = lab('ZARNOC', [100, 90, 200, 120], retype=False)
    labels, did = map_review.clean([settled, placed, caption], IDX)
    assert labels == [settled, placed, caption]
    assert did == {'dropped': 0, 'stripped': 0, 'mended': 0, 'joined': 0}


# ---- flags --------------------------------------------------------------------------------

def blank_mask(shape, box):
    m = np.zeros(shape[:2], bool)
    m[box[1]:box[3], box[0]:box[2]] = True
    return m


def test_flags_two_names_set_on_top_of_each_other():
    im = paper()
    labels = [lab('AAA', [50, 50, 150, 80]), lab('BBB', [120, 50, 220, 80])]
    masks = {0: blank_mask(im.shape, [50, 50, 150, 80]), 1: blank_mask(im.shape, [120, 50, 220, 80])}
    f = map_review.flags(labels, im, im, masks)
    assert 'overlap' in f[0] and 'overlap' in f[1]


def test_flags_nothing_on_a_clean_name():
    im = paper()
    labels = [lab('AAA', [50, 50, 150, 80])]
    assert map_review.flags(labels, im, im, {0: blank_mask(im.shape, [55, 55, 145, 75])}) == {}


def test_flags_letters_the_eraser_left_behind():
    scan = paper()
    scan[55:75, 60:140] = INK
    erased = scan.copy()
    erased[55:75, 60:110] = PAPER     # the last part of the name stays
    labels = [lab('AAA', [50, 50, 150, 80])]
    assert 'left' in map_review.flags(labels, scan, erased, {0: blank_mask(scan.shape, [55, 55, 145, 75])})[0]


def test_flags_type_set_far_bigger_than_the_printed_name():
    im = paper()
    labels = [lab('AAA', [50, 50, 100, 70])]
    assert 'size' in map_review.flags(labels, im, im, {0: blank_mask(im.shape, [30, 40, 200, 90])})[0]


def test_flags_a_name_set_much_taller_than_the_maps_usual():
    im = paper()
    boxes = [[20, 20, 120, 40], [20, 60, 120, 80], [20, 100, 120, 120]]
    labels = [lab('AAA', b) for b in boxes] + [lab('BBB', [200, 100, 300, 170])]
    masks = {i: blank_mask(im.shape, [b[0] + 5, b[1] + 5, b[2] - 5, b[3] - 5]) for i, b in enumerate(boxes)}
    masks[3] = blank_mask(im.shape, [205, 105, 295, 165])
    f = map_review.flags(labels, im, im, masks)
    assert 'size' in f[3] and 0 not in f


def test_flags_type_set_away_from_the_printed_name():
    im = paper()
    labels = [lab('AAA', [50, 50, 100, 70])]
    assert 'off' in map_review.flags(labels, im, im, {0: blank_mask(im.shape, [250, 200, 300, 220])})[0]


def test_flags_type_over_something_left_on_the_map():
    scan = paper()
    scan[58:72, 60:140] = INK          # a tower, outside the name's ink and kept
    labels = [lab('AAA', [200, 50, 300, 80], nudge=[-140, 0])]
    f = map_review.flags(labels, scan, scan, {0: blank_mask(scan.shape, [60, 55, 150, 75])})
    assert 'over' in f[0]


def test_flags_a_name_with_no_type_at_all():
    im = paper()
    assert 'none' in map_review.flags([lab('AAA', [50, 50, 150, 80])], im, im, {})[0]


# ---- the type's own place, from map_letter --------------------------------------------------

def test_masks_are_where_the_letter_step_paints():
    scan = paper()
    labels = [lab('ZARNOK', [100, 100, 220, 130], set={'at': [160, 115], 'size': 24, 'angle': 0})]
    masks = map_letter.masks(scan, labels, CABIN, CABIN)
    ys, xs = np.nonzero(masks[0])
    assert 100 < xs.mean() < 220 and 100 < ys.mean() < 130
    # the same place as the picture the step makes
    base = map_letter.Image.fromarray(scan.copy())
    map_letter.letter(base, labels[0], None, CABIN, CABIN, 1)
    drawn = np.asarray(base).astype(int).sum(2) < 200
    assert (drawn & ~cv2.dilate(masks[0].astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)).sum() == 0


# ---- the sheets -----------------------------------------------------------------------------

def test_sheets_put_flagged_labels_first_and_split_when_long(tmp_path):
    scan = paper(600, 400)
    labels = [lab(f'N{i}', [20 + i, 20 + i, 80 + i, 50 + i]) for i in range(5)]
    labels.append(lab('title', [0, 0, 50, 20], retype=False))
    out = map_review.sheets(labels, scan, scan, {3: ['left']}, tmp_path, per_sheet=4)
    assert [p.name for p in out] == ['map-review-1.jpg', 'map-review-2.jpg']
    assert map_review.order(labels, {3: ['left']})[0] == 3
    assert 5 not in map_review.order(labels, {3: ['left']})   # not set in type, nothing to compare


def test_flagged_sheet_holds_only_the_flagged_and_leaves_no_stale_sheet(tmp_path):
    scan = paper(600, 400)
    labels = [lab(f'N{i}', [20 + i, 20 + i, 80 + i, 50 + i]) for i in range(5)]
    map_review.sheets(labels, scan, scan, {}, tmp_path, per_sheet=2)
    out = map_review.sheets(labels, scan, scan, {3: ['left']}, tmp_path, per_sheet=2, flagged=True)
    assert [p.name for p in out] == ['map-review-1.jpg']
    assert [p.name for p in tmp_path.glob('map-review-*.jpg')] == ['map-review-1.jpg']


def test_overview_is_one_small_picture_with_every_box(tmp_path):
    scan = paper(3000, 2000)
    p = map_review.overview([lab('A', [100, 100, 200, 130])], scan, tmp_path)
    im = cv2.imdecode(np.fromfile(str(p), np.uint8), cv2.IMREAD_COLOR)
    assert max(im.shape[:2]) <= map_review.OVERVIEW
    assert (im != np.array(PAPER)).any()


def test_font_sheet_shows_each_font_held_against_the_scan(tmp_path):
    scan = paper(600, 400)
    labels = [lab('Zarnok Hills', [20, 20, 160, 50]), lab('VASHTOR', [20, 80, 160, 110]),
              lab('Slanted Name', [20, 150, 160, 200], slant=30), lab('title', [200, 20, 300, 50], retype=False)]
    p = map_review.font_sheet(labels, scan, tmp_path)
    assert p.name == 'map-review-fonts.jpg' and p.is_file()
    assert [t for t in map_review.font_samples(labels)] == [labels[0], labels[1]]
    assert all((map_letter.FONTS / f.partition('|')[0]).is_file() for f in map_review.TRIAL)


def test_a_new_map_is_drafted_and_cleaned_before_it_is_lettered():
    assert map_review.plan(False, False) == ['upscale', 'draft', 'clean', 'measure', 'erase', 'letter', 'sheet', 'fonts']


def test_a_list_already_there_is_never_drafted_or_cleaned_again():
    # it may hold the owner's corrections, which a clean could undo
    assert map_review.plan(True, True) == ['measure', 'erase', 'letter', 'sheet', 'fonts']


def test_prepare_runs_the_plan_and_stops_at_a_failed_step(tmp_path):
    ran = []
    assert map_review.prepare('xx', False, False, lambda s: (ran.append(s), s != 'draft')[1]) is False
    assert ran == ['upscale', 'draft']
    ran.clear()
    assert map_review.prepare('xx', True, True, lambda s: (ran.append(s), True)[1]) is True
    assert ran == ['measure', 'erase', 'letter', 'sheet', 'fonts']


def test_clean_file_keeps_the_previous_list(tmp_path):
    f = tmp_path / 'labels.json'
    f.write_text(json.dumps([lab('12', [10, 10, 30, 30]), lab('ZARNOK', [100, 90, 200, 120])]), encoding='utf-8')
    did = map_review.clean_file(f, IDX)
    assert did['dropped'] == 1
    assert texts(json.loads(f.read_text(encoding='utf-8'))) == ['ZARNOK']
    assert len(json.loads((tmp_path / 'labels.json.bak').read_text(encoding='utf-8'))) == 2
