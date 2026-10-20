"""map_font.py: the font builds in every weight, covers what map names use, and each weight is
heavier than the one before."""
import string

import numpy as np
import pytest
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

import map_font


def ink(path, text):
    f = ImageFont.truetype(str(path), 80)
    im = Image.new('L', (1600, 140), 0)
    ImageDraw.Draw(im).text((10, 10), text, font=f, fill=255)
    return (np.array(im) > 128).sum()


@pytest.mark.parametrize('family', map_font.FAMILIES)
def test_builds_every_weight_covering_letters_digits_and_map_punctuation(tmp_path, family):
    fonts = [map_font.build(w, tmp_path / f'{family}-{w}.ttf', family) for w in map_font.WEIGHTS]
    need = string.ascii_letters + string.digits + " .,'-/&()"
    for f in fonts:
        t = TTFont(str(f))
        cmap = t.getBestCmap()
        assert all(ord(c) in cmap for c in need)
        assert all(t['hmtx'][cmap[ord(c)]][0] > 0 for c in need)
        assert t['name'].getDebugName(1) == map_font.FAMILIES[family]
    weights = [ink(f, 'SOMMERLUND Naogizaga') for f in fonts]
    assert all(w > 0 for w in weights)
    assert weights == sorted(weights)  # Thin to Bold, each darker


def test_a_stroke_is_drawn_clockwise_and_a_dot_has_area():
    poly = map_font.outlines([[(0, 0), (0, 700)]], 60, 20)[0]
    area = sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(poly, poly[1:] + poly[:1])) / 2
    assert area < 0  # clockwise, as TrueType wants outer contours
    dot = map_font.outlines([[(0, 20)]], 60, 20)[0]
    assert len(dot) == 4


def test_serif_face_gives_a_capital_stem_a_bar_at_each_end_and_a_curve_none():
    bars = map_font.serifs([[(0, 0), (0, 700)]], lower=False)
    assert len(bars) == 2 and all(p[1] == q[1] for p, q in bars)  # level, across the stem
    assert map_font.serifs([map_font.arc(280, 350, 280, 350, 90, 450)], lower=False) == []
    assert map_font.serifs([[(0, 0), (400, 0)]], lower=False) == []  # a flat stroke takes none
