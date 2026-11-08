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


def test_check_returns_what_it_prints_for_the_editor(capsys):
    labels = [lab('HOLMGARD', (0, 0, 100, 20)),
              lab('RIVER', (0, 50, 100, 70)),
              lab('LAKE', (0, 100, 100, 120)),
              lab('TOWER', (0, 150, 100, 170), small=True)]
    reads = [read('Holm-gard', (2, 2, 98, 18)), read('RIVAR', (2, 52, 98, 68)),
             read('TOWN', (2, 152, 98, 168)), read('STRAY', (300, 300, 380, 320))]
    got = map_labels.check(labels, reads)
    assert [(f.get('i'), f['kind']) for f in got] == [(1, 'reads'), (2, 'missing'), (3, 'eye'), (None, 'added')]
    assert got[0]['got'] == 'RIVAR' and 0 < got[0]['ratio'] < 1
    assert got[3]['box'] == [300, 300, 380, 320]


def test_check_main_writes_check_json_beside_aligned(tmp_path, monkeypatch, capsys):
    labels = tmp_path / 'labels.json'
    labels.write_text(json.dumps([lab('RIVER', (0, 50, 100, 70))]), encoding='utf-8')
    (tmp_path / 'map-check-2').mkdir()
    aligned = tmp_path / 'map-check-2' / 'aligned.png'
    monkeypatch.setattr(map_labels, 'ocr', lambda p: [read('RIVAR', (2, 52, 98, 68))])
    monkeypatch.setattr(sys, 'argv', ['map_labels.py', 'check', str(labels), str(aligned)])
    map_labels.main()
    got = json.loads((tmp_path / 'map-check-2' / 'check.json').read_text(encoding='utf-8'))
    assert [(f['i'], f['kind']) for f in got] == [(0, 'reads')]








# ---- names / prompt -----------------------------------------------------------------------

def test_names_uppercases_and_joins_with_commas():
    assert map_labels.names([lab('Holmgard'), lab('Sommerlund')]) == 'HOLMGARD, SOMMERLUND'








PLACE, CAPTION = lab('Holmgard', retype=True), lab('Scale', retype=False)


def test_prompt_unlettered_lists_only_the_kept_labels_and_forbids_the_erased_ones():
    p = map_labels.prompt([PLACE, CAPTION])
    assert 'spelled exactly as written here, letter for letter: SCALE.' in p
    assert 'HOLMGARD' not in p
    assert 'have no name or numbers written beside them' in p


def test_prompt_lets_woods_be_filled_out_but_adds_no_new_feature():
    p = map_labels.prompt([PLACE, CAPTION])
    assert 'new trees' not in p
    assert 'woods already drawn may be filled out' in p
    assert 'add no feature that is not on the original' in p
    assert 'no new castles, towers, towns, buildings, ruins, creatures or ships' in p


def test_prompt_asks_every_map_for_round_8s_richness_without_new_features():
    # what made Book 1's round 8 the best repaint: inked outlines, rich shading, trees with definition,
    # the existing frame embellished; the map's own colours not frozen (rounds 10-11 came back as copies)
    for style in (None, 'Repaint this map of somewhere.'):
        p = map_labels.prompt([PLACE, CAPTION], True, style)
        look = p.index('crisply outlined in dark ink')
        assert look < p.index('Keep the layout')
        assert 'never a flat blob of colour' in p and 'not rows of identical symbols' in p
        assert 'embellish the existing frame' in p and 'add no map feature' in p
        assert 'every object already drawn on the map stays in its place.' in p
        assert 'with its colours' not in p


def test_prompt_with_the_example_pair_shows_round_8_rather_than_describing_it():
    # owner, 2026-11-07: Book 1's scan and round 8 attached as a before and after got Book 6 near round 8's
    # look, where no wording had; but it took Book 1's tan ground and ivy too, so the map's own colours are named
    p = map_labels.prompt([PLACE, CAPTION], True, 'Repaint this map of somewhere. The plains are green.', example=True)
    assert p.startswith('The first picture is a printed fantasy map and the second')
    assert 'third picture' in p and p.index('third picture') < p.index('Keep every place')
    # round 4 read "not its colours, ground..." as change little: take only the painting, not the colours
    assert "only the way of painting, not the example's colours" in p and 'not its colours' not in p
    assert 'Mass the trees' in p and 'The plains are green.' not in p  # nor style.txt
    assert 'never a flat blob' not in p  # the example shows the look; the long description is left out
    # owner, 2026-11-07: basic guidance only, as the round that came close had; no label list
    assert 'HOLMGARD' not in p and 'SCALE' not in p and len(p) < 1100
    # round 6, mostly what to keep, came back a near copy: the keeping is one sentence, numbers included
    assert p.count('Keep ') == 1 and 'word and number exactly' in p and 'add no features' in p


def test_prompt_keeps_the_maps_drawn_spirit_not_realism():
    # owner, 2026-11-06: ChatGPT's repaint was "closer to real", round 8 truer to the map's spirit;
    # its crisp buildings were the part worth keeping
    for style in (None, 'Repaint this map of somewhere.'):
        p = map_labels.prompt([PLACE, CAPTION], True, style)
        assert "Keep the original's drawn, illustrated style" in p
        assert 'never turned into a realistic or photographic painting' in p
        assert 'Towns, castles and towers are crisp and clean, drawn as on the original' in p
        assert p.index("drawn, illustrated style") < p.index('Keep the layout')












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
        {**read('HOLM', (50, 500, 100, 520), 0.95), 'slant': 12.5},  # kept for map_letter.py's measure
        read('ARDEN', (10, 12, 60, 30), 0.4),
        read('RIVER', (200, 45, 260, 60), 0.8),
    ])
    main_with(monkeypatch, 'draft', 'map.png', mine)
    out = json.loads(mine.read_text(encoding='utf-8'))
    # 40 px bands top to bottom, then left to right inside a band
    assert [r['text'] for r in out] == ['ARDEN', 'KEY', 'RIVER', 'HOLM']
    assert [r['retype'] for r in out] == [True, False, True, True]
    assert out[3]['slant'] == 12.5
    assert '4 boxes, 2 under 0.5 confidence, 1 unticked retype' in capsys.readouterr().out


# A made-up map: a stacked title, a key of three columns' worth of entries, a scale, places
TITLE = [lab('A MAP OF', (400, 20, 600, 50)), lab('THE WESTLANDS', (350, 55, 650, 100)),
         lab('BEING THE SOUTHERN REALMS', (360, 105, 640, 130))]
KEY = [lab('KEY', (900, 20, 950, 45)), lab('PLAINS', (910, 60, 990, 85)), lab('HILLS', (910, 120, 980, 145)),
       lab('TUNDRA', (911, 180, 1000, 205)), lab('SCALE IN MILES', (900, 300, 1000, 320))]
PLACES = [lab('0 50 100', (900, 330, 1000, 345)),
          lab('HOLMGARD', (909, 500, 1010, 530)),   # in the key's column, but far below it
          lab('ARDEN', (100, 400, 200, 430)),
          lab('TORAN', (100, 600, 200, 630))]


def other_keys(root):  # two other maps whose keys keep Plains and Hills as drawn, and one with an Oasis
    write_labels(root, '02', [lab('Plains', retype=False), lab('Hills', retype=False), lab('Oasis', retype=False)])
    write_labels(root, '03', [lab('Plains', retype=False), lab('Hills', retype=False), lab('Holm', retype=True)])


def test_kept_elsewhere_needs_two_other_maps_and_no_place_of_that_name(tmp_path):
    mine = write_labels(tmp_path, '01', [])
    other_keys(tmp_path)
    write_labels(tmp_path, '04', [lab('Holm', retype=False), lab('Plains', retype=False)])
    assert map_labels.kept_elsewhere(mine) == {'PLAINS', 'HILLS'}   # Oasis once, Holm a place on 03
    assert map_labels.kept_elsewhere(mine, skip={'03'}) == {'PLAINS'}


def test_main_retype_unticks_title_key_and_scale_but_no_place(tmp_path, monkeypatch, capsys):
    other_keys(tmp_path)
    labels = [dict(x, retype=True) for x in TITLE + KEY + PLACES]
    labels[-1]['retype'] = False                    # the owner's own untick stays
    mine = write_labels(tmp_path, '01', labels)
    main_with(monkeypatch, 'retype', mine)
    got = json.loads(mine.read_text(encoding='utf-8'))
    assert [x['text'] for x in got if x['retype']] == ['0 50 100', 'HOLMGARD', 'ARDEN']
    out = capsys.readouterr().out
    assert '  1 unticked: title' in out and '  6 unticked: in line with the key' in out
    assert '8 unticked; 3 of 12 labels left as place names' in out
    assert 'WESTLANDS' not in out                   # numbers and reasons only


def test_main_style_drafts_title_and_key_and_never_replaces_the_books_own(tmp_path, monkeypatch, capsys):
    labels = [dict(x, retype=False) for x in TITLE + KEY] + [dict(x, retype=True) for x in PLACES]
    labels.append(lab('ROCK SPIRES', (912, 240, 990, 265), retype=False))  # a key entry with no sentence
    other_keys(tmp_path)
    mine = write_labels(tmp_path, '01', labels)
    labels[-1]['text'] = 'ODD GROUND'
    mine.write_text(json.dumps(labels), encoding='utf-8')
    main_with(monkeypatch, 'style', mine)
    first, text = (mine.parent / 'style.txt').read_text(encoding='utf-8').splitlines()
    assert first.startswith(map_labels.DRAFT) and 'Key entries with no sentence: ODD GROUND.' in first
    assert text.startswith('Repaint this map of The Westlands being the Southern Realms as a richly')
    assert 'tundra stay white' in text and 'The hills are' in text and 'The plains are' in text
    assert 'desert' not in text
    # the prompt leaves the draft's note out
    main_with(monkeypatch, 'prompt', mine, tmp_path / 'p.txt')
    p = (tmp_path / 'p.txt').read_text(encoding='utf-8')
    assert p.startswith('Repaint this map of The Westlands') and 'DRAFT' not in p
    # a draft is written again; the book's own style is not
    main_with(monkeypatch, 'style', mine)
    (mine.parent / 'style.txt').write_text('Our own look.\n', encoding='utf-8')
    with pytest.raises(SystemExit):
        main_with(monkeypatch, 'style', mine)
    assert (mine.parent / 'style.txt').read_text(encoding='utf-8') == 'Our own look.\n'


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








