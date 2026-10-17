"""map_font.py: the font builds in every weight, covers what map names use, and each weight is
heavier than the one before."""
import string

import numpy as np
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

import map_font


def ink(path, text):
    f = ImageFont.truetype(str(path), 80)
    im = Image.new('L', (1600, 140), 0)
    ImageDraw.Draw(im).text((10, 10), text, font=f, fill=255)
    return (np.array(im) > 128).sum()


def test_builds_every_weight_covering_letters_digits_and_map_punctuation(tmp_path):
    fonts = [map_font.build(w, tmp_path / f'DarklandHand-{w}.ttf') for w in map_font.WEIGHTS]
    need = string.ascii_letters + string.digits + " .,'-/&()"
    for f in fonts:
        t = TTFont(str(f))
        cmap = t.getBestCmap()
        assert all(ord(c) in cmap for c in need)
        assert all(t['hmtx'][cmap[ord(c)]][0] > 0 for c in need)
        assert t['name'].getDebugName(1) == 'Darkland Hand'
    weights = [ink(f, 'SOMMERLUND Naogizaga') for f in fonts]
    assert all(w > 0 for w in weights)
    assert weights == sorted(weights)  # Thin to Bold, each darker


def test_a_stroke_is_drawn_clockwise_and_a_dot_has_area():
    poly = map_font.outlines([[(0, 0), (0, 700)]], 60, 20)[0]
    area = sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(poly, poly[1:] + poly[:1])) / 2
    assert area < 0  # clockwise, as TrueType wants outer contours
    dot = map_font.outlines([[(0, 20)]], 60, 20)[0]
    assert len(dot) == 4
