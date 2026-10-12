"""map_ocr_paddle.py is a script, not a module: it builds a PaddleOCR reader at import and writes
the reads. PaddleOCR lives only in tools/.venv-paddle, so these tests run the script with stand-in
`truststore` and `paddleocr` modules (the real ones are never imported) and check what it does with
what the reader returns: boxes from polygons, upper-cased text, rounded scores, the reader's options."""
import json
import os
import runpy
import sys
import types
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[2] / 'tools' / 'map_ocr_paddle.py'


@pytest.fixture
def run_script(tmp_path, monkeypatch):
    """Run the script against a fake PaddleOCR whose predict() returns the given pages."""
    seen = {'injected': False}

    def go(pages):
        class FakePaddleOCR:
            def __init__(self, **kw):
                seen['kwargs'] = kw

            def predict(self, img):
                seen['img'] = img
                return pages

        monkeypatch.setitem(sys.modules, 'truststore',
                            types.SimpleNamespace(inject_into_ssl=lambda: seen.update(injected=True)))
        monkeypatch.setitem(sys.modules, 'paddleocr', types.SimpleNamespace(PaddleOCR=FakePaddleOCR))
        monkeypatch.setenv('PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK', 'x')  # so it is restored afterwards
        monkeypatch.delenv('PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK')
        out = tmp_path / 'reads.json'
        monkeypatch.setattr(sys, 'argv', [str(SCRIPT), str(tmp_path / 'map.png'), str(out)])
        runpy.run_path(str(SCRIPT), run_name='__main__')
        seen['env'] = os.environ.get('PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK')
        return json.loads(out.read_text(encoding='utf-8')), seen

    return go


def page(polys, texts, scores):
    return {'rec_polys': polys, 'rec_texts': texts, 'rec_scores': scores}


def test_polygons_become_axis_aligned_boxes_with_upper_case_text(run_script):
    # a slanted quad: the box is the min/max of its corners
    poly = [[10.9, 20.2], [60.1, 12.7], [62.8, 31.5], [12.0, 40.0]]
    reads, _ = run_script([page([poly], [' Holmgard '], [0.8765])])
    assert reads == [{'text': 'HOLMGARD', 'box': [10, 12, 62, 40], 'conf': 0.88}]


def test_every_polygon_of_every_page_is_read_in_order(run_script):
    sq = lambda x, y: [[x, y], [x + 10, y], [x + 10, y + 5], [x, y + 5]]
    reads, _ = run_script([page([sq(0, 0), sq(50, 50)], ['a', 'b'], [0.5, 0.6]),
                           page([sq(100, 100)], ['c'], [0.7])])
    assert [r['text'] for r in reads] == ['A', 'B', 'C']
    assert reads[1]['box'] == [50, 50, 60, 55]


def test_no_reads_writes_an_empty_list(run_script):
    reads, _ = run_script([page([], [], [])])
    assert reads == []


def test_scores_may_be_numpy_floats(run_script):
    import numpy as np
    reads, _ = run_script([page([[[0, 0], [4, 0], [4, 4], [0, 4]]], ['x'], [np.float32(0.123456)]) ])
    assert reads[0]['conf'] == 0.12


def test_reader_is_built_for_big_maps_with_mkldnn_off(run_script):
    _, seen = run_script([])
    kw = seen['kwargs']
    assert kw['text_det_limit_side_len'] == 2048 and kw['text_det_limit_type'] == 'max'
    assert kw['enable_mkldnn'] is False
    assert kw['use_textline_orientation'] is True
    assert kw['use_doc_orientation_classify'] is False and kw['use_doc_unwarping'] is False


def test_tls_is_injected_and_the_model_source_check_disabled(run_script):
    _, seen = run_script([])
    assert seen['injected'] is True
    assert seen['env'] == 'True'


def test_the_image_path_is_passed_to_the_reader(run_script, tmp_path):
    _, seen = run_script([])
    assert seen['img'] == str(tmp_path / 'map.png')

