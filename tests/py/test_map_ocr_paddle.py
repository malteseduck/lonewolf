"""map_ocr_paddle.py: turning the map for each pass, mapping reads back, and keeping the best read of
each place. Made-up reads; PaddleOCR is not run (it lives in its own venv)."""
import numpy as np

import map_ocr_paddle as ocr


def quad(x, y, w, h, deg=0):
    """A read's quad: top-left, top-right, bottom-right, bottom-left, turned clockwise (y down) round (x, y)."""
    a = np.radians(deg)
    r = np.array([[np.cos(a), -np.sin(a)], [np.sin(a), np.cos(a)]])
    return np.array([[0, 0], [w, 0], [w, h], [0, h]], np.float64) @ r.T + [x, y]


def test_a_point_read_on_the_turned_and_doubled_map_maps_back_to_the_map():
    m, (w, h) = ocr.turn((400, 600), 30, 2)
    assert w > 1200 and h > 800  # the whole map fits the turned canvas
    p = np.array([[150.0, 320.0], [0, 0], [599, 399]])
    on_turned = np.c_[p, np.ones(3)] @ m.T
    assert np.allclose(ocr.back(on_turned, m), p, atol=1e-6)
    assert (on_turned >= -1).all() and (on_turned[:, 0] <= w + 1).all() and (on_turned[:, 1] <= h + 1).all()


def test_merge_keeps_the_best_read_of_each_place_with_its_slant():
    reads = [
        {'text': 'HOLMGARD', 'quad': quad(100, 100, 200, 30, 20), 'conf': 0.95},  # read at the 30 turn
        {'text': 'HOLMGAR', 'quad': quad(102, 101, 190, 32, 18), 'conf': 0.9},   # the same at 0: dropped
        {'text': 'TORAN', 'quad': quad(500, 400, 100, 25), 'conf': 0.8},
        {'text': 'ARDEN', 'quad': quad(700, 100, 100, 25), 'conf': 0.5},          # too unsure
        {'text': 'X', 'quad': quad(800, 300, 20, 20), 'conf': 0.99},              # a tree read as a letter
    ]
    out = ocr.merge(reads)
    assert [r['text'] for r in out] == ['HOLMGARD', 'TORAN']
    holm = out[0]
    assert abs(holm['slant'] - 20) < 0.1 and holm['conf'] == 0.95
    assert holm['box'] == [90, 100, 288, 197]  # the slanted quad's upright bounds
    assert out[1]['slant'] == 0 and out[1]['box'] == [500, 400, 600, 425]


def test_merge_drops_trees_and_border_ornament_read_as_letters():
    reads = [
        {'text': 'TT', 'quad': quad(300, 300, 40, 30), 'conf': 0.98},            # a pair of trees (Book 7)
        {'text': '0J', 'quad': quad(1000, 70, 60, 25, 88), 'conf': 0.9},          # the frame, read on end
        {'text': 'OJ', 'quad': quad(1000, 400, 60, 25, 88), 'conf': 0.9},         # the same inland: a short name
        {'text': 'ASH', 'quad': quad(20, 900, 60, 25), 'conf': 0.9},              # level by the edge: a name
    ]
    assert sorted(r['text'] for r in ocr.merge(reads, (2048, 1500))) == ['ASH', 'OJ']


def test_slant_folds_a_line_read_backwards_onto_the_same_slant():
    assert abs(ocr.slant(quad(0, 0, 100, 20, 30)) - 30) < 1e-6
    assert abs(ocr.slant(quad(0, 0, 100, 20, 30 + 180)) - 30) < 1e-6
    assert ocr.slant(quad(0, 0, 100, 20, 90)) == -90  # upright: one end of the fold
