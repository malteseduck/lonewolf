"""map_check.py: aligning a repaint onto the faithful map and flagging colour and shape changes.
The maps are random blobs on cream paper, so SIFT has something to match; nothing from the books."""
import json
import re
import sys

import cv2
import numpy as np
import pytest

import map_check

PAPER = (190, 215, 232)


def textured(w=600, h=450, seed=1):
    r = np.random.RandomState(seed)
    im = np.full((h, w, 3), PAPER, np.uint8)
    for _ in range(120):
        c = tuple(int(v) for v in r.randint(30, 225, 3))
        x, y = int(r.randint(0, w)), int(r.randint(0, h))
        if r.rand() < .5:
            cv2.circle(im, (x, y), int(r.randint(6, 25)), c, -1)
        else:
            cv2.rectangle(im, (x, y), (x + int(r.randint(10, 50)), y + int(r.randint(10, 50))), c, -1)
    return im


# ---- helpers ------------------------------------------------------------------------------









def test_edges_find_the_outline_of_a_block_and_nothing_on_flat_ground():
    flat = np.full((100, 100, 3), 200, np.uint8)
    assert map_check.edges(flat, 2).sum() == 0
    blk = flat.copy()
    blk[30:70, 30:70] = 40
    e = map_check.edges(blk, 2)
    ys, xs = np.nonzero(e)
    assert e.any()
    # the outline runs round the block, not through the empty middle or the far corners
    assert not e[45:55, 45:55].any() and not e[:15, :15].any()
    assert 25 <= xs.min() and xs.max() <= 74 and 25 <= ys.min() and ys.max() <= 74


# ---- main ---------------------------------------------------------------------------------

def run(monkeypatch, faithful, repaint, out):
    monkeypatch.setattr(sys, 'argv', ['map_check.py', str(faithful), str(repaint), str(out)])
    map_check.main()


def figures(text):
    m = re.search(r'matches (\d+), inliers (\d+), edge error ([\d.]+) px', text)
    c = re.search(r'cells (\d+): colour (\d+), shape (\d+), both (\d+)', text)
    return [float(v) for v in m.groups()], [int(v) for v in c.groups()]


@pytest.fixture(scope='module')
def aligned_pair(tmp_path_factory):
    d = tmp_path_factory.mktemp('maps')
    O = textured()
    map_check.write(d / 'o.png', O)
    G = cv2.resize(O, (900, 675), interpolation=cv2.INTER_CUBIC)  # the repaint comes back at another size
    map_check.write(d / 'g.png', G)
    return d, O, G


def test_identical_repaint_at_another_size_aligns_and_flags_nothing(aligned_pair, tmp_path_factory, monkeypatch, capsys):
    d, O, G = aligned_pair
    out = tmp_path_factory.mktemp('out') / 'nested' / 'check'      # the output folder is made
    run(monkeypatch, d / 'o.png', d / 'g.png', out)
    (matches, inliers, err), (cells, colour, shape, both) = figures(capsys.readouterr().out)
    assert matches > 50 and inliers >= 0.8 * matches
    assert err < 2.0                                                # docs: edge error 1-4 px on real maps
    assert cells == (600 // 48) * (450 // 48)
    assert (colour, shape, both) == (0, 0, 0)
    assert {p.name for p in out.iterdir()} == {'aligned.png', 'H.json', 'flags.png'}
    A = map_check.read(out / 'aligned.png')
    assert A.shape == O.shape                                       # warped onto the faithful frame
    assert np.abs(A.astype(int) - O).mean() < 6




def test_recoloured_block_is_flagged_red_and_only_there(aligned_pair, tmp_path, monkeypatch, capsys):
    d, O, G = aligned_pair
    G2 = G.copy()
    G2[150:300, 300:450] = (0, 200, 0)          # a recoloured lake: repaint px, so faithful x 200-300, y 100-200
    map_check.write(tmp_path / 'g2.png', G2)
    run(monkeypatch, d / 'o.png', tmp_path / 'g2.png', tmp_path / 'c')
    _, (cells, colour, shape, both) = figures(capsys.readouterr().out)
    assert colour >= 1
    A, F = map_check.read(tmp_path / 'c' / 'aligned.png'), map_check.read(tmp_path / 'c' / 'flags.png')
    tinted = np.nonzero((A != F).any(-1))
    assert len(tinted[0]) > 0
    # tinted pixels lie in the whole cells covering the block (faithful x 192-336, y 96-240)
    assert tinted[1].min() >= 192 - 48 and tinted[1].max() < 336 + 48
    assert tinted[0].min() >= 96 - 48 and tinted[0].max() < 240 + 48




