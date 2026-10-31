"""map_sepia.py: the finished map baked into the sepia the player shows (ADR 0004)."""
import os

import numpy as np
import pytest
from PIL import Image

import map_sepia


def flat(path, colour, size=(320, 240)):
    Image.new('RGB', size, colour).save(path, quality=90)


def test_the_same_size_and_a_warm_sepia_from_a_plain_colour(tmp_path):
    src, out = tmp_path / 'map-4k.webp', tmp_path / 'map-sepia.webp'
    flat(src, (130, 130, 130))
    map_sepia.bake(str(src), str(out))
    im = Image.open(out)
    assert im.size == (320, 240)
    r, g, b = np.asarray(im.convert('RGB'), float)[100:140, 140:180].mean((0, 1))
    assert r > g > b  # plain grey comes out brown


def test_water_is_darker_than_land_of_the_same_lightness():
    land = map_sepia.ink(np.full((1, 1, 3), (120, 120, 120), np.float32))
    water = map_sepia.ink(np.full((1, 1, 3), (70, 120, 200), np.float32))
    assert water[..., 1].item() < land[..., 1].item()


def test_strong_red_survives_as_a_rubric():
    out = map_sepia.ink(np.full((1, 1, 3), (220, 30, 30), np.float32))[0, 0]
    assert out[0] > out[1] * 2


def test_the_edges_are_darker_than_the_middle():
    a = map_sepia.sepia(np.full((300, 400, 3), 200, np.uint8))
    assert a[150, 200].sum() > a[150, 2].sum() and a[150, 200].sum() > a[2, 200].sum()


def test_the_same_map_bakes_the_same():
    m = np.full((120, 160, 3), 180, np.uint8)
    assert np.array_equal(map_sepia.sepia(m), map_sepia.sepia(m))


def test_bake_book_makes_it_once_and_again_after_a_new_map(tmp_path):
    d = tmp_path
    assert map_sepia.bake_book(str(d)) is None  # no finished map
    flat(d / 'map-4k.webp', (150, 140, 120))
    assert map_sepia.bake_book(str(d)) == 'map-sepia.webp'
    made = os.path.getmtime(d / 'map-sepia.webp')
    os.utime(d / 'map-sepia.webp', (made, made))
    os.utime(d / 'map-4k.webp', (made - 10, made - 10))
    assert map_sepia.bake_book(str(d)) == 'map-sepia.webp'
    assert os.path.getmtime(d / 'map-sepia.webp') == made  # up to date: left alone
    os.utime(d / 'map-4k.webp', (made + 10, made + 10))
    map_sepia.bake_book(str(d))
    assert os.path.getmtime(d / 'map-sepia.webp') != made  # the map was finished again


def test_the_colour_map_is_left_alone(tmp_path):
    flat(tmp_path / 'map-4k.webp', (150, 140, 120))
    before = (tmp_path / 'map-4k.webp').read_bytes()
    map_sepia.bake_book(str(tmp_path))
    assert (tmp_path / 'map-4k.webp').read_bytes() == before
