"""map_labels.py: wording helpers, the OCR-vs-list check, the eye-check sheet, the Gemini prompt,
and the draft/check/prompt commands. The OCR is replaced by made-up reads; no PaddleOCR, no EasyOCR."""
import json
import subprocess
import sys
import types

import cv2
import numpy as np
import pytest

import map_labels


def lab(text, box=(0, 0, 10, 10), **kw):
    return {'text': text, 'box': list(box), **kw}


def read(text, box, conf=0.9):
    return {'text': text, 'box': list(box), 'conf': conf}


# ---- norm / overlap -----------------------------------------------------------------------

def test_norm_keeps_only_upper_case_letters_and_digits():
    assert map_labels.norm("Holm-gard, 2nd!") == 'HOLMGARD2ND'
    assert map_labels.norm('') == ''
    assert map_labels.norm('. , -') == ''


def test_overlap_is_intersection_over_the_smaller_box():
    assert map_labels.overlap([0, 0, 10, 10], [0, 0, 10, 10]) == 1
    # a small box wholly inside a big one is a full match
    assert map_labels.overlap([0, 0, 100, 100], [10, 10, 20, 20]) == 1
    assert map_labels.overlap([0, 0, 10, 10], [5, 0, 15, 10]) == 0.5
    assert map_labels.overlap([0, 0, 10, 10], [20, 20, 30, 30]) == 0
    assert map_labels.overlap([0, 0, 10, 10], [10, 0, 20, 10]) == 0      # touching only




# ---- kept_elsewhere -----------------------------------------------------------------------

def write_labels(root, code, labels):
    d = root / 'maps' / code
    d.mkdir(parents=True)
    (d / 'labels.json').write_text(json.dumps(labels), encoding='utf-8')
    return d / 'labels.json'










# ---- check --------------------------------------------------------------------------------

def test_check_counts_matches_differences_missing_and_added(capsys):
    labels = [lab('HOLMGARD', (0, 0, 100, 20)),
              lab('RIVER', (0, 50, 100, 70)),
              lab('LAKE', (0, 100, 100, 120)),
              lab('TOWER', (0, 150, 100, 170), small=True)]
    reads = [read('Holm-gard', (2, 2, 98, 18)),     # same after norm
             read('RIVAR', (2, 52, 98, 68)),         # misread
             read('TOWN', (2, 152, 98, 168)),        # small: reported by eye only
             read('STRAY', (300, 300, 380, 320))]    # unlisted
    map_labels.check(labels, reads)
    out = capsys.readouterr().out
    assert "  1 reads" in out and "'RIVER' as 'RIVAR'" in out
    assert '  2 missing      LAKE' in out
    assert "  3 by eye      'TOWER' (OCR read 'TOWN')" in out
    assert "added       'STRAY' at [300, 300, 380, 320]" in out
    assert 'labels 3 (+1 by eye): 1 read the same, 2 differ or missing; 1 unlisted reads' in out
    assert 'HOLMGARD' not in out                      # the matching label is not reported








# ---- names / prompt -----------------------------------------------------------------------

def test_names_uppercases_and_joins_with_commas():
    assert map_labels.names([lab('Holmgard'), lab('Sommerlund')]) == 'HOLMGARD, SOMMERLUND'








PLACE, CAPTION = lab('Holmgard', retype=True), lab('Scale', retype=False)


def test_prompt_unlettered_lists_only_the_kept_labels_and_forbids_the_erased_ones():
    p = map_labels.prompt([PLACE, CAPTION])
    assert 'spelled exactly as written here, letter for letter: SCALE.' in p
    assert 'HOLMGARD' not in p
    assert 'have no name or numbers written beside them' in p












# ---- sheet --------------------------------------------------------------------------------

def png(path, im):
    cv2.imencode('.png', im)[1].tofile(str(path))








def test_sheet_with_a_single_label(tmp_path):
    png(tmp_path / 'f.png', np.zeros((100, 100, 3), np.uint8))
    png(tmp_path / 'a.png', np.zeros((100, 100, 3), np.uint8))
    map_labels.sheet([lab('ONE', (10, 10, 40, 30))], tmp_path / 'f.png', tmp_path / 'a.png', tmp_path / 'l.png')
    assert (tmp_path / 'l.png').exists()


# ---- ocr ----------------------------------------------------------------------------------





# ---- main ---------------------------------------------------------------------------------

def main_with(monkeypatch, *args):
    monkeypatch.setattr(sys, 'argv', ['map_labels.py', *map(str, args)])
    map_labels.main()


def test_main_draft_sorts_by_band_and_unticks_retype_for_other_books_captions(tmp_path, monkeypatch, capsys):
    mine = write_labels(tmp_path, '01', [])
    write_labels(tmp_path, '02', [lab('Key')])
    monkeypatch.setattr(map_labels, 'ocr', lambda p: [
        read('KEY', (300, 10, 340, 30), 0.3),
        read('HOLM', (50, 500, 100, 520), 0.95),
        read('ARDEN', (10, 12, 60, 30), 0.4),
        read('RIVER', (200, 45, 260, 60), 0.8),
    ])
    main_with(monkeypatch, 'draft', 'map.png', mine)
    out = json.loads(mine.read_text(encoding='utf-8'))
    # 40 px bands top to bottom, then left to right inside a band
    assert [r['text'] for r in out] == ['ARDEN', 'KEY', 'RIVER', 'HOLM']
    assert [r['retype'] for r in out] == [True, False, True, True]
    assert '4 boxes, 2 under 0.5 confidence, 1 unticked retype' in capsys.readouterr().out


def test_main_check_prints_the_comparison_and_writes_the_sheet_only_with_a_faithful_map(tmp_path, monkeypatch, capsys):
    lf = write_labels(tmp_path, '01', [lab('HOLM', (10, 10, 60, 30)), lab('RIVER', (10, 35, 60, 55))])
    png(tmp_path / 'aligned.png', np.zeros((60, 100, 3), np.uint8))
    png(tmp_path / 'faithful.png', np.zeros((60, 100, 3), np.uint8))
    monkeypatch.setattr(map_labels, 'ocr', lambda p: [read('HOLM', (10, 10, 60, 30)), read('RIVER', (10, 35, 60, 55))])
    main_with(monkeypatch, 'check', lf, tmp_path / 'aligned.png')
    assert '2 read the same' in capsys.readouterr().out
    assert not (tmp_path / 'labels.png').exists()
    main_with(monkeypatch, 'check', lf, tmp_path / 'aligned.png', tmp_path / 'faithful.png')
    assert (tmp_path / 'labels.png').exists()








