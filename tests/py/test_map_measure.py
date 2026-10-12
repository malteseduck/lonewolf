"""map_measure.py: writes each lettered label's measured ink into the label list."""
import json
import math
import sys

import cv2
import numpy as np

import map_measure

PAPER = (190, 215, 232)
INK = (20, 20, 20)


def scan_with_bar():
    im = np.full((200, 300, 3), PAPER, np.uint8)
    im[100:103, 100:150] = INK  # 50 x 3 stroke, centre (124.5, 101)
    return im


def setup(tmp_path, labels):
    src, lab = tmp_path / 'map.png', tmp_path / 'labels.json'
    cv2.imencode('.png', scan_with_bar())[1].tofile(str(src))
    lab.write_text(json.dumps(labels), encoding='utf-8')
    return src, lab


def run(monkeypatch, src, lab):
    monkeypatch.setattr(sys, 'argv', ['map_measure.py', str(src), str(lab)])
    map_measure.main()
    return json.loads(lab.read_text(encoding='utf-8'))


def test_measures_a_retype_label(tmp_path, monkeypatch, capsys):
    src, lab = setup(tmp_path, [{'text': 'A', 'box': [95, 92, 155, 110], 'retype': True}])
    out = run(monkeypatch, src, lab)
    ink = out[0]['ink']
    assert abs(ink['at'][0] - 124.5) < 1.5 and abs(ink['at'][1] - 101) < 1.5
    assert abs(ink['angle']) < 1                 # a level stroke reads left to right
    assert abs(ink['length'] - 49) < 2
    assert abs(ink['thick'] - 2) < 1.5
    assert ink['box'] == [95, 92, 155, 110]
    assert 'measured 1 of 1 labels' in capsys.readouterr().out


def test_fix_labels_are_measured_too(tmp_path, monkeypatch):
    src, lab = setup(tmp_path, [{'text': 'A', 'box': [95, 92, 155, 110], 'fix': True}])
    assert 'ink' in run(monkeypatch, src, lab)[0]


def test_labels_kept_as_drawn_get_no_ink_and_lose_a_stale_one(tmp_path, monkeypatch, capsys):
    src, lab = setup(tmp_path, [{'text': 'T', 'box': [95, 92, 155, 110], 'ink': {'at': [1, 1]}}])
    out = run(monkeypatch, src, lab)
    assert 'ink' not in out[0]
    assert 'measured 0 of 1 labels' in capsys.readouterr().out


def test_box_without_ink_gets_no_ink(tmp_path, monkeypatch, capsys):
    src, lab = setup(tmp_path, [{'text': 'A', 'box': [200, 20, 260, 50], 'retype': True,
                                 'ink': {'at': [1, 1]}}])
    out = run(monkeypatch, src, lab)
    assert 'ink' not in out[0]
    assert 'measured 0 of 1 labels' in capsys.readouterr().out


def test_hand_angle_is_ignored_and_other_fields_kept(tmp_path, monkeypatch):
    src, lab = setup(tmp_path, [{'text': 'A', 'box': [95, 92, 155, 110], 'retype': True,
                                 'angle': 90, 'where': 'top', 'nudge': [3, 4]}])
    lab_after = run(monkeypatch, src, lab)[0]
    assert abs(lab_after['ink']['angle']) < 1    # measured from the ink, not the hand angle
    assert lab_after['angle'] == 90 and lab_after['where'] == 'top' and lab_after['nudge'] == [3, 4]


def test_angle_of_a_slanted_stroke(tmp_path, monkeypatch):
    im = np.full((200, 300, 3), PAPER, np.uint8)
    cv2.line(im, (100, 100), (140, 140), INK, 3)
    src, lab = tmp_path / 'map.png', tmp_path / 'labels.json'
    cv2.imencode('.png', im)[1].tofile(str(src))
    lab.write_text(json.dumps([{'text': 'A', 'box': [95, 95, 146, 146], 'retype': True}]), encoding='utf-8')
    ink = run(monkeypatch, src, lab)[0]['ink']
    assert abs(ink['angle'] - 45) < 2            # y down: the stroke runs down and to the right


def test_a_where_of_upwards_reads_the_other_way(tmp_path, monkeypatch):
    im = np.full((200, 300, 3), PAPER, np.uint8)
    cv2.line(im, (100, 100), (140, 140), INK, 3)
    src, lab = tmp_path / 'map.png', tmp_path / 'labels.json'
    cv2.imencode('.png', im)[1].tofile(str(src))
    lab.write_text(json.dumps([{'text': 'A', 'box': [95, 95, 146, 146], 'retype': True,
                                'where': 'runs upwards'}]), encoding='utf-8')
    ink = run(monkeypatch, src, lab)[0]['ink']
    assert abs(ink['angle'] - (-135)) < 2
    assert math.isclose(math.sin(math.radians(ink['angle'])), -math.sqrt(0.5), abs_tol=0.04)


def test_values_are_rounded(tmp_path, monkeypatch):
    src, lab = setup(tmp_path, [{'text': 'A', 'box': [95, 92, 155, 110], 'retype': True}])
    ink = run(monkeypatch, src, lab)[0]['ink']
    assert ink['angle'] == round(ink['angle'], 2)
    assert all(v == round(v, 1) for v in ink['at'] + [ink['length'], ink['thick']])
