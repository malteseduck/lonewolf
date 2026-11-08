"""The example pair's lighter round 8 (owner, 2026-11-08, ADR 0004): Gemini copied its dark tone."""
import os

import cv2
import numpy as np

import map_example


def picture(level, size=64):
    im = np.full((size, size, 3), level, np.uint8)
    im[:8, :8] = 0  # an inked outline
    im[8:16, :8] = (40, 120, 60)  # a green wood
    return im


def test_a_dark_repaint_is_lifted_toward_its_scan_keeping_ink_and_colour():
    scan, dark = picture(200), picture(100)
    out = map_example.lighten(dark, cv2.cvtColor(scan, cv2.COLOR_BGR2GRAY))
    g = cv2.cvtColor(out, cv2.COLOR_BGR2GRAY)
    want = 200 * map_example.FRAC
    assert abs(np.median(g) - want) < 12          # lighter overall, still a shade below the scan
    assert g[:8, :8].max() < 10                   # outlines stay inked
    b, gr, r = out[12, 4].astype(int)
    assert gr - max(b, r) > 40                    # the wood stays green, not greyed


def test_a_repaint_already_as_light_is_left_alone():
    im = picture(200)
    out = map_example.lighten(im, cv2.cvtColor(picture(200), cv2.COLOR_BGR2GRAY))
    assert np.abs(out.astype(int) - im).max() <= 3


def test_make_writes_once_and_again_only_when_the_source_changes(tmp_path):
    before, after, out = (str(tmp_path / n) for n in ('before.jpg', 'after.jpg', 'light.jpg'))
    cv2.imwrite(before, picture(200))
    cv2.imwrite(after, picture(100))
    assert map_example.make(before, after, out) is True
    assert map_example.make(before, after, out) is False  # up to date
    t = os.path.getmtime(out)
    os.utime(after, (t + 10, t + 10))
    assert map_example.make(before, after, out) is True
