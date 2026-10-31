"""map_sepia.py: the colour rules of the sepia the player shows (ADR 0004). A whole bake paints the
parchment stroke by stroke, too slow for here; test_import_projectaon.py bakes one small map."""
import numpy as np

import map_sepia


def test_water_is_darker_than_land_of_the_same_lightness():
    land = map_sepia.ink(np.full((1, 1, 3), (120, 120, 120), np.float32))
    water = map_sepia.ink(np.full((1, 1, 3), (70, 120, 200), np.float32))
    assert water[..., 1].item() < land[..., 1].item()


def test_strong_red_survives_as_a_rubric():
    out = map_sepia.ink(np.full((1, 1, 3), (220, 30, 30), np.float32))[0, 0]
    assert out[0] > out[1] * 2
