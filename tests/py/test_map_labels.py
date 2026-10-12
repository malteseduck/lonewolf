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


def test_overlap_of_empty_box_does_not_divide_by_zero():
    assert map_labels.overlap([0, 0, 10, 10], [5, 5, 5, 5]) == 0


# ---- kept_elsewhere -----------------------------------------------------------------------

def write_labels(root, code, labels):
    d = root / 'maps' / code
    d.mkdir(parents=True)
    (d / 'labels.json').write_text(json.dumps(labels), encoding='utf-8')
    return d / 'labels.json'


def test_kept_elsewhere_collects_wordings_other_books_keep_as_drawn(tmp_path):
    me = write_labels(tmp_path, '01', [lab('Mine', retype=True)])
    write_labels(tmp_path, '02', [lab('Key', retype=False), lab('Holmgard', retype=True),
                                  lab('Scale of Miles'), lab('', retype=False)])
    kept = map_labels.kept_elsewhere(me)
    assert kept == {'KEY', 'SCALEOFMILES'}            # a place name is not kept; blank is dropped


def test_kept_elsewhere_ignores_the_book_itself(tmp_path):
    me = write_labels(tmp_path, '01', [lab('Mine')])
    assert map_labels.kept_elsewhere(me) == set()


def test_kept_elsewhere_a_place_in_one_book_stays_ticked_even_if_a_caption_in_another(tmp_path):
    me = write_labels(tmp_path, '01', [])
    write_labels(tmp_path, '02', [lab('Name')])               # a caption here ...
    write_labels(tmp_path, '03', [lab('NAME', retype=True)])  # ... a place there
    assert map_labels.kept_elsewhere(me) == set()


def test_kept_elsewhere_joins_lines_and_skips_bad_files(tmp_path):
    me = write_labels(tmp_path, '01', [])
    write_labels(tmp_path, '02', [{'text': 'x', 'box': [0, 0, 1, 1], 'lines': ['SCALE', 'OF MILES']}])
    bad = tmp_path / 'maps' / '03'
    bad.mkdir()
    (bad / 'labels.json').write_text('{not json', encoding='utf-8')
    assert map_labels.kept_elsewhere(me) == {'SCALEOFMILES'}


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


def test_check_joins_pieces_in_reading_order(capsys):
    labels = [lab('THE WILDLANDS', (0, 0, 200, 60))]
    reads = [read('LANDS', (10, 40, 80, 58)), read('THE WILD', (10, 2, 90, 20))]
    map_labels.check(labels, reads)
    out = capsys.readouterr().out
    assert '1 read the same, 0 differ or missing' in out    # joined top line first


def test_check_a_read_must_overlap_more_than_half_the_smaller_box(capsys):
    labels = [lab('A WORD', (0, 0, 100, 20))]
    map_labels.check(labels, [read('A WORD', (90, 0, 190, 20))])   # only 10% overlap
    out = capsys.readouterr().out
    assert 'missing      A WORD' in out
    assert "added       'A WORD'" in out


def test_check_single_character_stray_reads_are_not_reported(capsys):
    map_labels.check([], [read('x', (0, 0, 5, 5)), read('..', (9, 9, 12, 12))])
    out = capsys.readouterr().out
    assert 'added' not in out
    assert 'labels 0 (+0 by eye): 0 read the same, 0 differ or missing; 0 unlisted reads' in out


# ---- names / prompt -----------------------------------------------------------------------

def test_names_uppercases_and_joins_with_commas():
    assert map_labels.names([lab('Holmgard'), lab('Sommerlund')]) == 'HOLMGARD, SOMMERLUND'


def test_names_joins_a_hyphen_split_name_as_one():
    out = map_labels.names([lab('The Wild-'), lab('lands'), lab('River')])
    assert out == 'THE WILD- / LANDS (one name, split in two), RIVER'


def test_names_a_trailing_hyphen_on_the_last_label_stays_alone():
    assert map_labels.names([lab('River'), lab('Wild-')]) == 'RIVER, WILD-'


def test_names_of_nothing():
    assert map_labels.names([]) == ''


PLACE, CAPTION = lab('Holmgard', retype=True), lab('Scale', retype=False)


def test_prompt_unlettered_lists_only_the_kept_labels_and_forbids_the_erased_ones():
    p = map_labels.prompt([PLACE, CAPTION])
    assert 'spelled exactly as written here, letter for letter: SCALE.' in p
    assert 'HOLMGARD' not in p
    assert 'have no name or numbers written beside them' in p


def test_prompt_lettered_lists_every_label_and_asks_for_clean_sans_serif():
    p = map_labels.prompt([PLACE, CAPTION], lettered=True)
    assert 'HOLMGARD, SCALE.' in p
    assert 'clean sans-serif type' in p
    assert 'have no name or numbers written beside them' not in p


def test_prompt_lettering_from_font_txt_replaces_the_sans_serif_wording():
    p = map_labels.prompt([PLACE, CAPTION], lettered=True, lettering='hand-lettered in a thin pen')
    assert 'The place names are hand-lettered in a thin pen' in p
    assert 'sans-serif' not in p


def test_prompt_lettering_is_ignored_unless_lettered():
    p = map_labels.prompt([PLACE, CAPTION], lettered=False, lettering='hand-lettered in a thin pen')
    assert 'hand-lettered' not in p


def test_prompt_opens_with_the_books_style_or_the_default():
    default = map_labels.prompt([CAPTION])
    assert default.startswith('Repaint this fantasy map')
    styled = map_labels.prompt([CAPTION], style='  Snowfields stay white.\n')
    assert styled.startswith('Snowfields stay white. Keep the layout:')
    assert 'Repaint this fantasy map' not in styled


def test_prompt_always_forbids_additions_and_ends_with_a_newline():
    p = map_labels.prompt([CAPTION])
    assert 'Do not add, remove or rename any other label.' in p
    assert 'no new trees, creatures, ships or buildings' in p
    assert p.endswith('lettering, no warping or melting.\n')


# ---- sheet --------------------------------------------------------------------------------

def png(path, im):
    cv2.imencode('.png', im)[1].tofile(str(path))


def test_sheet_writes_one_row_per_label_in_two_columns(tmp_path):
    faithful = np.full((300, 400, 3), (10, 10, 10), np.uint8)
    aligned = np.full((300, 400, 3), (240, 240, 240), np.uint8)
    png(tmp_path / 'f.png', faithful)
    png(tmp_path / 'a.png', aligned)
    labels = [lab(f'L{i}', (40, 40 + 30 * i, 140, 60 + 30 * i)) for i in range(5)]
    map_labels.sheet(labels, tmp_path / 'f.png', tmp_path / 'a.png', tmp_path / 'labels.png')
    out = cv2.imdecode(np.fromfile(str(tmp_path / 'labels.png'), np.uint8), cv2.IMREAD_COLOR)
    # row: 60 px number gutter + faithful crop + 16 + repaint crop; crop = box + 12 px each way, here 124 x 44
    row_w = 60 + 2 * 124 + 16
    row_h = 44 + 8
    assert out.shape[1] == 2 * (row_w + 20)
    assert out.shape[0] == 3 * row_h              # 5 rows split 3 + 2
    # faithful is dark on the left of a row, the repaint is light on the right
    assert out[10, 70:100].mean() < 60
    assert out[10, 60 + 124 + 30:60 + 124 + 60].mean() > 200


def test_sheet_scales_big_boxes_down(tmp_path):
    png(tmp_path / 'f.png', np.zeros((600, 1200, 3), np.uint8))
    png(tmp_path / 'a.png', np.zeros((600, 1200, 3), np.uint8))
    big = lab('BIG', (100, 100, 900, 500))
    map_labels.sheet([big, big], tmp_path / 'f.png', tmp_path / 'a.png', tmp_path / 'l.png')
    out = cv2.imdecode(np.fromfile(str(tmp_path / 'l.png'), np.uint8), cv2.IMREAD_COLOR)
    assert out.shape[0] <= 160 + 8                # a label's crop is capped at 160 px tall (one row per column)
    assert out.shape[1] <= 2 * (60 + 2 * 400 + 16 + 20) + 1


def test_sheet_clamps_a_box_at_the_top_left(tmp_path):
    png(tmp_path / 'f.png', np.zeros((100, 100, 3), np.uint8))
    png(tmp_path / 'a.png', np.zeros((100, 100, 3), np.uint8))
    edge = lab('EDGE', (2, 2, 30, 20))
    map_labels.sheet([edge, edge], tmp_path / 'f.png', tmp_path / 'a.png', tmp_path / 'l.png')
    assert (tmp_path / 'l.png').exists()


@pytest.mark.xfail(strict=True, raises=ValueError,
                   reason='map_labels.py sheet(): with one label, rows[half:] is empty and np.vstack([]) raises '
                          '(check with a one-label list crashes instead of writing labels.png)')
def test_sheet_with_a_single_label(tmp_path):
    png(tmp_path / 'f.png', np.zeros((100, 100, 3), np.uint8))
    png(tmp_path / 'a.png', np.zeros((100, 100, 3), np.uint8))
    map_labels.sheet([lab('ONE', (10, 10, 40, 30))], tmp_path / 'f.png', tmp_path / 'a.png', tmp_path / 'l.png')
    assert (tmp_path / 'l.png').exists()


# ---- ocr ----------------------------------------------------------------------------------

def test_ocr_runs_paddle_in_its_own_venv_when_it_exists(tmp_path, monkeypatch):
    fake_python = tmp_path / 'python.exe'
    fake_python.write_text('')
    monkeypatch.setattr(map_labels, 'PADDLE', fake_python)
    calls = []

    def fake_run(cmd, check):
        calls.append(cmd)
        from pathlib import Path
        Path(cmd[-1]).write_text(json.dumps([{'text': 'HOLM', 'box': [1, 2, 3, 4], 'conf': 0.9}]), encoding='utf-8')

    monkeypatch.setattr(subprocess, 'run', fake_run)
    reads = map_labels.ocr(tmp_path / 'map.png')
    assert reads == [{'text': 'HOLM', 'box': [1, 2, 3, 4], 'conf': 0.9}]
    assert calls[0][0] == str(fake_python)
    assert calls[0][1].endswith('map_ocr_paddle.py')
    assert calls[0][2] == str(tmp_path / 'map.png')


def test_ocr_falls_back_to_easyocr_and_boxes_the_quads(tmp_path, monkeypatch):
    monkeypatch.setattr(map_labels, 'PADDLE', tmp_path / 'no-such-python.exe')
    seen = {}

    class Reader:
        def __init__(self, langs, **kw):
            seen['init'] = (langs, kw)

        def readtext(self, im, rotation_info):
            seen['rot'] = rotation_info
            seen['shape'] = im.shape
            return [([(10, 20), (50, 18), (52, 40), (9, 41)], ' holm ', 0.876)]

    monkeypatch.setitem(sys.modules, 'easyocr', types.SimpleNamespace(Reader=Reader))
    png(tmp_path / 'map.png', np.zeros((30, 60, 3), np.uint8))
    reads = map_labels.ocr(tmp_path / 'map.png')
    assert reads == [{'text': 'HOLM', 'box': [9, 18, 52, 41], 'conf': 0.88}]
    assert seen['rot'] == [90, 270]
    assert seen['shape'] == (30, 60, 3)
    assert seen['init'][0] == ['en'] and seen['init'][1]['download_enabled'] is False


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


def test_main_prompt_uses_style_and_font_files_beside_the_list(tmp_path, monkeypatch):
    lf = write_labels(tmp_path, '01', [lab('Holmgard', retype=True), lab('Scale')])
    (lf.parent / 'style.txt').write_text('Deserts stay yellow.', encoding='utf-8')
    (lf.parent / 'font.txt').write_text('ArchitectsDaughter-Regular.ttf\nhand-lettered in thin marker\n',
                                        encoding='utf-8')
    out = tmp_path / 'prompt.txt'
    main_with(monkeypatch, 'prompt', lf, out, '--lettered')
    p = out.read_text(encoding='utf-8')
    assert p.startswith('Deserts stay yellow. Keep the layout')
    assert 'HOLMGARD, SCALE.' in p                                # lettered: every label
    assert 'The place names are hand-lettered in thin marker' in p


def test_main_prompt_without_extra_files_or_flag(tmp_path, monkeypatch):
    lf = write_labels(tmp_path, '01', [lab('Holmgard', retype=True), lab('Scale')])
    out = tmp_path / 'prompt.txt'
    main_with(monkeypatch, 'prompt', lf, out)
    p = out.read_text(encoding='utf-8')
    assert p.startswith('Repaint this fantasy map')
    assert 'HOLMGARD' not in p and 'SCALE.' in p


def test_main_prompt_font_txt_with_one_line_gives_no_lettering(tmp_path, monkeypatch):
    lf = write_labels(tmp_path, '01', [lab('Holmgard', retype=True)])
    (lf.parent / 'font.txt').write_text('Cabin.ttf\n', encoding='utf-8')
    out = tmp_path / 'prompt.txt'
    main_with(monkeypatch, 'prompt', lf, out, '--lettered')
    assert 'clean sans-serif type' in out.read_text(encoding='utf-8')


def test_main_unknown_command_exits_with_usage(monkeypatch):
    with pytest.raises(SystemExit) as e:
        main_with(monkeypatch, 'bogus', 'a', 'b')
    assert 'draft, check or prompt' in str(e.value)
