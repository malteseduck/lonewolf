"""map_names.py: each label's wording checked against the place names in the books' own text, with
suggestions for OCR misreads. Stand-in books and label lists of our own, in a temporary folder."""
import json
import subprocess
import sys
from pathlib import Path

import map_names

BOOK = ('(window.LW = window.LW || {}).BOOKS = Object.assign(window.LW.BOOKS || {}, {"99xx": {"sections": '
        '{"1": {"text": ["<p>You ride north to Holmgard, past the Dainarg Swamp and over the '
        'Skaror Pass.</p>"]}, "2": {"text": ["<p>The road to Agna-Kor-Kuzim climbs into the mountains.</p>"]}}}});')


def books(tmp_path):
    root = tmp_path / 'data' / 'projectaon'
    (root / '99xx').mkdir(parents=True)
    (root / '99xx' / 'book.js').write_text(BOOK, encoding='utf-8')
    (root / '99xx' / 'footnotz.htm').write_text('<p>Ruanon lies by the River D&#246;rn.</p>', encoding='utf-8')
    return root


def maps(tmp_path, own, others=None):
    m = tmp_path / 'maps'
    (m / '98yy').mkdir(parents=True)
    (m / '98yy' / 'labels.json').write_text(json.dumps(own), encoding='utf-8')
    for code, (labels, checked) in (others or {}).items():
        (m / code).mkdir()
        (m / code / 'labels.json').write_text(json.dumps(labels), encoding='utf-8')
        if checked:
            (m / code / 'labels-checked.txt').write_text('done', encoding='utf-8')
    return m / '98yy' / 'labels.json'


def index(tmp_path, others=None):
    return map_names.build_index(books(tmp_path), maps(tmp_path, [], others))


def test_a_name_in_the_text_is_known_whatever_its_case_hyphens_and_article(tmp_path):
    idx = index(tmp_path)
    for t in ('HOLMGARD', 'THE DAINARG SWAMP', 'AGNA-KOR-KUZIM', 'Agna Kor Kuzim', 'Skaror Pass', 'RUANON'):
        assert map_names.check(t, idx)['status'] == 'name', t


def test_text_from_the_front_matter_counts_and_its_entities_are_read(tmp_path):
    assert map_names.check('RIVER DÖRN', index(tmp_path))['status'] == 'name'


def test_known_words_not_found_together_are_words_not_a_name(tmp_path):
    assert map_names.check('HOLMGARD PASS', index(tmp_path))['status'] == 'words'


def test_an_ocr_misread_is_near_with_the_name_suggested_in_the_labels_case(tmp_path):
    idx = index(tmp_path)
    r = map_names.check('THE DAINARG SWA2HP', idx)
    assert r['status'] == 'near' and r['unknown'] == ['SWA2HP']
    assert r['suggest'][0] == 'THE DAINARG SWAMP'
    r = map_names.check('H0LMGARD', idx)  # a digit for a letter
    assert r['status'] == 'near' and r['suggest'][0] == 'HOLMGARD'
    assert map_names.check('Holmgrad', idx)['suggest'][0] == 'Holmgard'


def test_a_name_nowhere_near_anything_is_unknown_with_no_suggestion(tmp_path):
    r = map_names.check('QWXZYV', index(tmp_path))
    assert r['status'] == 'unknown' and r['suggest'] == []


def test_only_names_are_suggested_never_a_common_word(tmp_path):
    r = map_names.check('ROADS', index(tmp_path))  # "road" is in the text, but not as a name
    assert r['status'] == 'unknown' and r['suggest'] == []


def test_map_abbreviations_count_as_words(tmp_path):
    assert map_names.check('SKAROR MTNS', index(tmp_path))['status'] == 'words'


def test_numbers_and_empty_labels_are_not_judged(tmp_path):
    idx = index(tmp_path)
    assert map_names.check('25', idx) is None
    assert map_names.check('', idx) is None


def test_names_on_other_checked_maps_count_and_unchecked_ones_do_not(tmp_path):
    idx = index(tmp_path, {'97zz': ([{'text': 'OGIAN MOUNTAINS'}], True), '96ww': ([{'text': 'KAKARMI'}], False)})
    assert map_names.check('OGIAN MOUNTAINS', idx)['status'] == 'name'
    assert map_names.check('OGLAN MOUNTAINS', idx)['suggest'][0] == 'OGIAN MOUNTAINS'
    assert map_names.check('KAKARMI', idx)['status'] == 'unknown'


def test_the_command_writes_every_label_by_its_wording(tmp_path):
    root = books(tmp_path)
    lf = maps(tmp_path, [{'text': 'HOLMGARD'}, {'text': 'H0LMGARD'}, {'text': '25'}, {'text': 'QWXZYV', 'lines': ['QWX', 'ZYV']},
                         {'text': 'KLIU', 'named': 'KLIU'}, {'text': 'GYEMX', 'named': 'GYEM'}])
    out = tmp_path / 'map-names.json'
    r = subprocess.run([sys.executable, str(Path(map_names.__file__)), str(lf), str(out), '--books', str(root)],
                       capture_output=True, text=True, encoding='utf-8')
    assert r.returncode == 0, r.stderr
    got = {e['text']: e for e in json.loads(out.read_text(encoding='utf-8'))['labels']}
    assert set(got) == {'HOLMGARD', 'H0LMGARD', 'QWXZYV', 'KLIU', 'GYEMX'}
    assert got['H0LMGARD']['status'] == 'near' and got['H0LMGARD']['i'] == 1
    assert got['KLIU']['status'] == 'name'  # marked right as it is
    assert got['GYEMX']['status'] == 'unknown'  # marked for another wording, since changed
    assert '1 near' in r.stdout and '2 unknown' in r.stdout
