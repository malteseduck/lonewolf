"""map_fit.py: laying a name's type over the scan's own letters. Stand-in names printed in Cabin."""
import math

import cv2
import numpy as np
import pytest
from PIL import Image

import map_fit
import map_letter
from map_erase import LabelInk

CABIN = str(map_letter.FONTS / 'Cabin.ttf') + '|SemiBold'


@pytest.fixture(autouse=True)
def module_state(monkeypatch):
    monkeypatch.setattr(map_letter, 'K', 1)
    monkeypatch.setattr(map_letter, 'PHASE', 'draw')


def printed(text, at, deg, size, w=320, h=220):
    """A scan with <text> printed in Cabin at <at>, <deg> and type <size>, as place() sets it."""
    base = Image.new('RGB', (w, h), (232, 215, 190))
    map_letter.place(base, *map_letter.render([text], CABIN, 0, 0, 1, size=size), np.array(at, float), math.radians(deg))
    return LabelInk(cv2.cvtColor(np.asarray(base), cv2.COLOR_RGB2BGR), None)


LAB = {'text': 'HOLMGARD', 'box': [90, 80, 230, 140], 'retype': True}


def test_fit_finds_the_printed_names_place_angle_and_size_from_a_rough_start():
    ink = printed('HOLMGARD', (160, 110), 6, 22)
    c, ang, size = map_fit.fit(ink, LAB, CABIN, CABIN, (np.array([166.0, 105.0]), 0.0, 27.0))
    assert math.dist(c, (160, 110)) < 1.5
    assert abs(math.degrees(ang) - 6) < 1.5  # TURN holds it a little towards the start
    assert size == pytest.approx(22, rel=0.04)


def test_fit_keeps_the_angle_when_told_to():
    ink = printed('HOLMGARD', (160, 110), 6, 22)
    _, ang, _ = map_fit.fit(ink, LAB, CABIN, CABIN, (np.array([160.0, 110.0]), 0.0, 22.0), turn=False)
    assert ang == 0


def test_fit_keeps_the_size_within_reach_of_the_start():
    ink = printed('HOLMGARD', (160, 110), 0, 22)
    _, _, size = map_fit.fit(ink, LAB, CABIN, CABIN, (np.array([160.0, 110.0]), 0.0, 40.0))
    assert size >= 40 * map_fit.GROW[0] - 0.01


def test_type_is_never_taller_than_the_printed_letters_even_if_it_comes_out_shorter():
    # printed wider than the font sets it (letter-spaced): matching its length would make the type taller
    # than the printed letters, which reads as too big (owner, 2026-11-13)
    ink = printed('H O L M G A R D', (160, 110), 0, 22)
    lab = {'text': 'HOLMGARD', 'box': [20, 80, 300, 140], 'retype': True}
    c, _, size = map_fit.placement(ink, lab, CABIN, CABIN)
    assert size <= 22 * 1.03
    assert math.dist(c, (160, 110)) < 1.5  # the shorter type centred on the printed name, not slid to one end


def test_the_letters_height_is_the_common_letters_not_the_few_that_rise_or_drop():
    # a hand whose letters are mostly short, a few rising above them (h, l, d) or dropping (g): the
    # type's capitals stand no taller than the common letters (owner, 2026-11-13, Book 24)
    ink = printed('m o r n a v e s h', (160, 110), 0, 22)
    lab = {'text': 'MORNAVESH', 'box': [20, 80, 300, 140], 'retype': True}
    _, _, size = map_fit.placement(ink, lab, CABIN, CABIN)
    _, _, x_height, _ = map_letter.block(['xmoar'], CABIN, 22)
    _, _, h, _ = map_letter.block(['MORNAVESH'], CABIN, 100)
    assert size * (h / 100 + 2 * map_letter.BOLD) <= (x_height + 2 * map_letter.BOLD * 22) * 1.15


def test_fit_leaves_the_start_where_there_is_no_ink():
    ink = printed('HOLMGARD', (160, 110), 0, 22)
    lab = {'text': 'HOLM', 'box': [5, 5, 40, 30], 'retype': True}
    start = (np.array([20.0, 18.0]), 0.0, 14.0)
    assert map_fit.fit(ink, lab, CABIN, CABIN, start) is start


def test_placement_measures_then_fits_and_holds_a_hand_angle():
    ink = printed('HOLMGARD', (160, 110), 6, 22)
    c, ang, size = map_fit.placement(ink, LAB, CABIN, CABIN)
    assert math.dist(c, (160, 110)) < 1.5 and abs(math.degrees(ang) - 6) < 1
    assert size == pytest.approx(22, rel=0.04)
    _, held, _ = map_fit.placement(ink, {**LAB, 'angle': 0}, CABIN, CABIN)
    assert held == 0
