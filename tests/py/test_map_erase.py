"""map_erase.py: which of the scan's pixels belong to a label (LabelInk), and the erase run.
Stand-in maps only: cream paper with near-black strokes drawn by the test."""
import json
import sys

import cv2
import numpy as np
import pytest

import map_erase
from map_erase import LabelInk

PAPER = (190, 215, 232)  # BGR
INK = (20, 20, 20)


def paper(w=300, h=200):
    return np.full((h, w, 3), PAPER, np.uint8)


def bar(im, x0, x1, y, t=3, col=INK):
    """A thin horizontal stroke, x0..x1 inclusive, t px thick (a letter stroke)."""
    im[y:y + t, x0:x1 + 1] = col


def write_png(path, im):
    cv2.imencode('.png', im)[1].tofile(str(path))


def read_any(path):
    return cv2.imdecode(np.fromfile(str(path), np.uint8), cv2.IMREAD_COLOR)


# ---- LabelInk.box -------------------------------------------------------------------------


# ---- LabelInk.mask ------------------------------------------------------------------------


def test_mask_is_box_sized_and_takes_a_stroke_inside_the_box():
    im = paper()
    bar(im, 100, 130, 100)
    li = LabelInk(im)
    m = li.mask({'box': [95, 95, 135, 108]})
    assert m.shape == (21, 48)           # padded box 91..139 x 91..112
    # the whole stroke is taken: rows 100-102, columns 100-130, in the padded box's frame
    assert m[100 - 91:103 - 91, 100 - 91:131 - 91].all()
    # and nothing else (the 3 px stroke alone, no stray pixels far from it)
    assert m.sum() < 31 * 3 + 80


def test_stroke_outside_the_box_is_not_taken():
    im = paper()
    bar(im, 200, 230, 150)
    li = LabelInk(im)
    assert li.mask({'box': [95, 95, 135, 108]}).sum() == 0


def test_tree_blob_stays():
    im = paper()
    cv2.circle(im, (120, 100), 9, INK, -1)  # near-black blob, thicker than BLOB
    li = LabelInk(im)
    assert li.mask({'box': [100, 80, 140, 120]}).sum() == 0


def test_bold_lettering_is_taken_and_a_tree_still_stays():
    """Book 7: lettering this bold read as trees at the fixed BLOB; the map's own stroke sets it."""
    im = paper(400, 200)
    labels = []
    for y in (40, 100):
        for x in (40, 70, 100):
            im[y:y + 30, x:x + 10] = INK  # a bold letter's upright, two place names
        labels.append({'box': [35, y - 5, 115, y + 35], 'retype': True})
    cv2.circle(im, (300, 100), 14, INK, -1)
    assert LabelInk(im).mask(labels[0]).sum() == 0  # the old size took it for a tree
    li = LabelInk(im, labels)
    assert li.mask(labels[0]).sum() >= 3 * 30 * 10
    assert li.mask({'box': [280, 80, 320, 120]}).sum() == 0


def test_coloured_ink_is_not_label_ink():
    im = paper()
    bar(im, 100, 130, 100, col=(0, 0, 220))  # a red stroke: chroma far over 24
    li = LabelInk(im)
    assert li.mask({'box': [95, 95, 135, 108]}).sum() == 0


def test_turned_keep_box_protects_what_lies_along_it():
    im = paper()
    cv2.line(im, (100, 100), (130, 130), INK, 3)  # something drawn on a slant (a ship's hull)
    bar(im, 145, 165, 105)                        # a letter beside it
    li = LabelInk(im)
    lab = {'box': [90, 90, 170, 140]}
    x0, y0 = li.box(lab)[:2]
    slant = np.zeros(li.mask(lab).shape, bool)
    slant[100 - 2 - y0:130 + 3 - y0, 100 - 2 - x0:130 + 3 - x0] = True
    # a level box over the same middle leaves the slant's ends to the eraser ...
    assert (li.mask({**lab, 'keep': [[90, 110, 140, 120]]}) & slant).any()
    # ... the same box turned 45 degrees round its centre keeps all of it, and the letter is still taken
    m = li.mask({**lab, 'keep': [[90, 110, 140, 120, 45]]})
    assert not (m & slant).any()
    assert m[105 - y0:108 - y0, 145 - x0:166 - x0].all()


def _stroke_joined_to_line():
    im = paper()
    bar(im, 100, 130, 100)                      # a letter stroke in the box ...
    cv2.line(im, (131, 101), (200, 170), INK, 3)  # ... joined to a line running far out of it
    return im


# ---- only the ink along the line of letters ---------------------------------------------------

def word(im, text, at, angle=0):
    """Stand-in lettering about 15 px tall, its baseline starting at <at>, turned <angle> degrees
    (clockwise, y down) round that point. Returns where its ink is (boolean, image-sized)."""
    layer = np.zeros(im.shape[:2], np.uint8)
    cv2.putText(layer, text, at, cv2.FONT_HERSHEY_DUPLEX, 0.6, 255, 1 if angle else 2, cv2.LINE_8)
    if angle:
        layer = cv2.warpAffine(layer, cv2.getRotationMatrix2D(at, -angle, 1), layer.shape[::-1], flags=cv2.INTER_NEAREST)
    im[layer > 0] = INK
    return layer > 0


def peak(im, x, y, size=7):
    """A mountain's outline: two thin strokes meeting at the top, <x, y> its foot's middle."""
    m = np.zeros(im.shape[:2], np.uint8)
    cv2.line(m, (x - size, y), (x, y - size), 1, 2)
    cv2.line(m, (x, y - size), (x + size, y), 1, 2)
    im[m > 0] = INK
    return m > 0


def around(ink, grow=2, up=0):
    """A box drawn tight round <ink>, as the owner draws them, <up> px taller above."""
    ys, xs = np.nonzero(ink)
    return [int(xs.min()) - grow, int(ys.min()) - grow - up, int(xs.max()) + grow, int(ys.max()) + grow]


def taken(li, lab, ink):
    """The share of <ink> (image-sized) the label's mask takes."""
    x0, y0, x1, y1 = li.box(lab)
    m = li.mask(lab)
    return (m & ink[y0:y1, x0:x1]).sum() / ink[y0:y1, x0:x1].sum()


def _name_under_peaks(**flags):
    im = paper(400, 200)
    letters = word(im, 'ABCDEFGHK', (80, 130))
    box = around(letters, up=16)               # the box takes in the peaks' tops above the name
    peaks = peak(im, 100, box[1] + 12) | peak(im, 160, box[1] + 12)
    return im, letters, peaks, {'box': box, 'text': 'ABCDEFGHK', **flags}


def test_peaks_beside_the_letters_stay_and_the_letters_go():
    im, letters, peaks, lab = _name_under_peaks()
    li = LabelInk(im)
    assert taken(li, lab, letters) > 0.97
    assert taken(li, lab, peaks) == 0


def test_a_slanted_name_in_its_level_box_leaves_the_corners():
    im = paper(400, 400)
    letters = word(im, 'ABCDEFGHKMN', (100, 120), angle=40)
    x0, y0, x1, y1 = box = around(letters)
    corners = peak(im, x1 - 20, y0 + 25) | peak(im, x0 + 20, y1 - 10)   # off the slant, inside the level box
    li = LabelInk(im)
    lab = {'box': box, 'text': 'ABCDEFGHKMN'}
    assert taken(li, lab, letters) > 0.97
    assert taken(li, lab, corners) == 0


def test_a_solid_letter_on_the_line_goes_and_a_tree_above_it_stays():
    """Book 13: its hand fills the counters of R, a, e, o; thick as a tree, they were left as blots."""
    im = paper(400, 200)
    letters = word(im, 'ABCDEFGHK', (80, 130))
    xs = np.nonzero(letters)[1]
    solid = np.zeros(im.shape[:2], np.uint8)
    cv2.circle(solid, (int(xs.max()) + 9, 124), 6, 1, -1)   # a filled o at the end of the name
    im[solid > 0] = INK
    box = around(letters | (solid > 0), up=16)
    tree = np.zeros(im.shape[:2], np.uint8)
    cv2.circle(tree, (130, box[1] + 8), 6, 1, -1)            # the same blot above the name, in its box
    im[tree > 0] = INK
    li = LabelInk(im)
    lab = {'box': box, 'text': 'ABCDEFGHKO'}
    assert taken(li, lab, solid > 0) > 0.97
    assert taken(li, lab, tree > 0) == 0


def test_a_name_set_over_two_lines_goes_whole():
    im = paper(400, 200)
    letters = word(im, 'ABC', (130, 100)) | word(im, 'DEFGHKMN', (90, 125))
    li = LabelInk(im)
    lab = {'box': around(letters), 'text': 'ABC DEFGHKMN', 'lines': ['ABC', 'DEFGHKMN']}
    assert taken(li, lab, letters) > 0.97


def letter_row(im, n, x, y, dy, h=18, step=13):
    """<n> letter-like strokes (an upright with a foot) from <x, y>, the line stepping <dy> px a letter."""
    m = np.zeros(im.shape[:2], np.uint8)
    for i in range(n):
        cx, cy = int(x + i * step), int(y + i * dy)
        cv2.line(m, (cx, cy), (cx, cy - h), 1, 3)
        cv2.line(m, (cx, cy), (cx + 7, cy), 1, 3)
    im[m > 0] = INK
    return m > 0


def test_a_name_bent_between_its_words_goes_whole():
    """Book 10, Blackshroud Trail: the first word rises, the second sits higher and falls away;
    one straight strip along the first ran over the second's tops and left the rest."""
    im = paper(600, 300)
    first = letter_row(im, 11, 40, 200, -1.5)
    second = letter_row(im, 5, 196, 148, 3)
    box = around(first | second, up=6)
    below = peak(im, 225, box[3] - 2)        # a peak in the box under the second word
    li = LabelInk(im)
    lab = {'box': box, 'text': 'ABCDEFGHKMN PQRST'}
    assert taken(li, lab, first) > 0.97
    assert taken(li, lab, second) > 0.97
    assert taken(li, lab, below) == 0


def test_joined_takes_the_line_only_along_the_letters():
    im = paper(400, 200)
    letters = word(im, 'ABCDEFGHK', (80, 130))
    box = around(letters, up=20)
    # a river bank from the last letter's top, up through the box and out of it
    bank = np.zeros(im.shape[:2], np.uint8)
    cv2.line(bank, (box[2] - 6, 118), (box[2] + 20, 40), 1, 2)
    im[bank > 0] = INK
    li = LabelInk(im)
    lab = {'box': box, 'text': 'ABCDEFGHK', 'joined': True}
    x0, y0 = li.box(lab)[:2]
    above = np.zeros(im.shape[:2], bool)
    above[box[1]:110] = True                  # the bank above the letters, still in the box
    assert taken(li, lab, letters) > 0.97
    assert taken(li, lab, (bank > 0) & above) == 0


def test_clip_still_clears_the_whole_box():
    im, letters, peaks, lab = _name_under_peaks(clip=True)
    li = LabelInk(im)
    assert taken(li, lab, peaks) > 0.9


def test_a_label_without_text_is_taken_as_before():
    im, letters, peaks, lab = _name_under_peaks()
    li = LabelInk(im)
    del lab['text']
    assert taken(li, lab, peaks) > 0.9


# ---- LabelInk.enclosed --------------------------------------------------------------------


# ---- main ---------------------------------------------------------------------------------

def run_main(monkeypatch, *args):
    monkeypatch.setattr(sys, 'argv', ['map_erase.py', *map(str, args)])
    map_erase.main()


def test_main_erases_retype_labels_only(tmp_path, monkeypatch, capsys):
    im = paper()
    bar(im, 100, 130, 100)   # label 0, to retype
    bar(im, 100, 130, 150)   # label 1, kept as drawn
    src, lab, out = tmp_path / 'map.png', tmp_path / 'labels.json', tmp_path / 'erased.jpg'
    write_png(src, im)
    lab.write_text(json.dumps([
        {'text': 'AAA', 'box': [95, 95, 135, 108], 'retype': True},
        {'text': 'BBB', 'box': [95, 145, 135, 158]},
    ]), encoding='utf-8')
    run_main(monkeypatch, src, lab, out)
    res = read_any(out)
    assert res.shape == im.shape
    assert res[98:105, 100:131].mean() > 180        # label 0 painted over with the paper
    assert res[150:153, 100:131].mean() < 80        # label 1 untouched (JPEG tolerance)
    assert 'erased 1 labels' in capsys.readouterr().out


def test_main_reports_the_mask_size(tmp_path, monkeypatch, capsys):
    im = paper()
    bar(im, 100, 130, 100)
    src, lab, out = tmp_path / 'map.png', tmp_path / 'labels.json', tmp_path / 'erased.jpg'
    write_png(src, im)
    lab.write_text(json.dumps([{'text': 'AAA', 'box': [95, 95, 135, 108], 'retype': True}]), encoding='utf-8')
    run_main(monkeypatch, src, lab, out)
    px = int(capsys.readouterr().out.split(',')[1].split()[0])
    # the 31x3 stroke grown by the 5x5 soft edge: (31+4) x (3+4) = 245
    assert 200 <= px <= 300
