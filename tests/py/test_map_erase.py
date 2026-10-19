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
