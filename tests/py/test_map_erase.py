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

def test_box_pads_by_four_px():
    li = LabelInk(paper())
    assert li.box({'box': [50, 60, 100, 90]}) == (46, 56, 104, 94)


def test_box_clamps_at_the_top_left_edge():
    li = LabelInk(paper())
    assert li.box({'box': [2, 3, 20, 30]}) == (0, 0, 24, 34)


# ---- LabelInk.mask ------------------------------------------------------------------------

def test_blank_paper_has_no_ink():
    li = LabelInk(paper())
    assert li.mask({'box': [50, 50, 150, 100]}).sum() == 0


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


def test_line_running_out_of_the_box_stays():
    # a coast or road: one diagonal stroke, only its first ~40% inside the box (under the 60% bar)
    im = paper()
    cv2.line(im, (100, 100), (180, 180), INK, 3)
    li = LabelInk(im)
    assert li.mask({'box': [95, 95, 125, 125]}).sum() == 0


def test_line_mostly_inside_the_box_is_taken():
    im = paper()
    cv2.line(im, (100, 100), (180, 180), INK, 3)
    li = LabelInk(im)
    assert li.mask({'box': [95, 95, 190, 190]}).sum() > 100


def test_tree_blob_stays():
    im = paper()
    cv2.circle(im, (120, 100), 9, INK, -1)  # near-black blob, thicker than BLOB
    li = LabelInk(im)
    assert li.mask({'box': [100, 80, 140, 120]}).sum() == 0


def test_long_straight_grid_line_is_cut_out():
    im = paper()
    bar(im, 20, 200, 100, t=2)  # longer than the 61 px grid-line test
    li = LabelInk(im)
    assert li.mask({'box': [10, 90, 210, 110]}).sum() == 0


def test_coloured_ink_is_not_label_ink():
    im = paper()
    bar(im, 100, 130, 100, col=(0, 0, 220))  # a red stroke: chroma far over 24
    li = LabelInk(im)
    assert li.mask({'box': [95, 95, 135, 108]}).sum() == 0


def test_clip_takes_faint_ghost_ink_that_plain_mask_skips():
    im = paper()
    ghost = tuple(c - 22 for c in PAPER)  # darker than paint by ~22: over 18, under the 30 ink test
    im[100:106, 100:130] = ghost
    li = LabelInk(im)
    box = [95, 95, 135, 112]
    assert li.mask({'box': box}).sum() == 0
    m = li.mask({'box': box, 'clip': True})
    assert m[100 - 91:106 - 91, 100 - 91:130 - 91].all()


def test_keep_box_protects_ink_inside_it():
    im = paper()
    bar(im, 100, 130, 100)
    li = LabelInk(im)
    box = [95, 95, 135, 108]
    m = li.mask({'box': box, 'keep': [[116, 90, 140, 110]]})  # the right half of the stroke
    assert m[100 - 91:103 - 91, 100 - 91:116 - 91].all()       # left half still taken
    assert not m[:, 116 - 91:].any()                           # right half kept


def _stroke_joined_to_line():
    im = paper()
    bar(im, 100, 130, 100)                      # a letter stroke in the box ...
    cv2.line(im, (131, 101), (200, 170), INK, 3)  # ... joined to a line running far out of it
    return im


def test_joined_letters_stay_without_the_flag_and_go_with_it():
    li = LabelInk(_stroke_joined_to_line())
    box = [95, 95, 140, 110]
    plain = li.mask({'box': box})
    assert plain.sum() == 0                     # one shape running out of the box: left alone
    joined = li.mask({'box': box, 'joined': True})
    assert joined[100 - 91:103 - 91, 100 - 91:130 - 91].all()


def test_joined_ignored_when_clip_is_set():
    li = LabelInk(_stroke_joined_to_line())
    m = li.mask({'box': [95, 95, 140, 110], 'joined': True, 'clip': True})
    # clip takes everything darker than the paint in the padded box, the line's part included
    assert m[100 - 91:103 - 91, 100 - 91:130 - 91].all()


# ---- LabelInk.enclosed --------------------------------------------------------------------

def test_enclosed_takes_a_speck_ringed_by_taken_ink():
    m = np.zeros((40, 40), bool)
    m[10:30, 10:30] = True
    m[17:23, 17:23] = False           # a hole in the taken ink ...
    dark = np.zeros((40, 40), bool)
    dark[19:21, 19:21] = True         # ... with a dark speck in it (an A's apex)
    out = LabelInk.enclosed(m, dark)
    assert out[19:21, 19:21].all()
    assert not out[0:5, 0:5].any()


def test_enclosed_leaves_an_isolated_speck():
    m = np.zeros((40, 40), bool)
    m[2:6, 2:6] = True
    dark = np.zeros((40, 40), bool)
    dark[25:28, 25:28] = True         # nowhere near taken ink
    assert not LabelInk.enclosed(m, dark).any()


def test_enclosed_ignores_big_blobs_and_ones_on_the_edge():
    m = np.zeros((60, 60), bool)
    m[5:55, 5:55] = True
    m[15:45, 15:45] = False
    dark = np.zeros((60, 60), bool)
    dark[18:42, 18:42] = True         # 576 px: over the 150 px limit, a tree
    assert not LabelInk.enclosed(m, dark).any()
    dark[:] = False
    dark[0:3, 20:24] = True           # touches the top edge of the box
    assert not LabelInk.enclosed(m, dark).any()


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


def test_main_with_no_retype_labels_changes_nothing_much(tmp_path, monkeypatch, capsys):
    im = paper()
    bar(im, 100, 130, 100)
    src, lab, out = tmp_path / 'map.png', tmp_path / 'labels.json', tmp_path / 'erased.jpg'
    write_png(src, im)
    lab.write_text(json.dumps([{'text': 'AAA', 'box': [95, 95, 135, 108]}]), encoding='utf-8')
    run_main(monkeypatch, src, lab, out)
    assert 'erased 0 labels, 0 px' in capsys.readouterr().out
    assert read_any(out)[100:103, 100:131].mean() < 80


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
