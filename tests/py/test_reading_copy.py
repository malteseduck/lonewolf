"""tools/reading_copy.py is a script: it reads data/projectaon/<book>/book.js and writes reading.txt.
The tests run a copy of it inside a temporary tree, against a made-up book.js."""
import json
import os
import runpy
import shutil
import sys

import pytest

SRC = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'tools', 'reading_copy.py'))


def run_script(root, sections, book='02fotw'):
    tools = root / 'tools'
    tools.mkdir(parents=True, exist_ok=True)
    script = tools / 'reading_copy.py'
    shutil.copyfile(SRC, script)
    d = root / 'data' / 'projectaon' / book
    d.mkdir(parents=True, exist_ok=True)
    js = ('(window.LW = window.LW || {}).BOOKS = Object.assign(window.LW.BOOKS || {}, '
          + json.dumps({book: {'id': book, 'sections': sections}}) + ');\n')
    (d / 'book.js').write_text(js, encoding='utf-8')
    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(sys, 'argv', [str(script), book])
        ns = runpy.run_path(str(script))
    return ns, d / 'reading.txt'


@pytest.fixture(scope='module')
def outs(tmp_path_factory):
    return run_script(tmp_path_factory.mktemp('rc'), {'1': {'text': ['x'], 'choices': []}})[0]['outs']


def test_outs_lists_choices_in_order(outs):
    assert outs({'choices': [{'to': '5'}, {'to': '3'}]}) == ['5', '3']


def test_outs_takes_every_row_of_a_random_table(outs):
    sec = {'choices': [{'to': '9', 'random': {'table': [[[0, 4], 7], [[5, 9], 8]]}}, {'to': '2'}]}
    assert outs(sec) == ['7', '8', '2']


def test_outs_adds_a_fights_exits_and_makes_ids_text(outs):
    sec = {'choices': [{'to': 4}], 'combat': {'to': 10, 'evade': {'after': 1, 'to': 11}}}
    assert outs(sec) == ['4', '10', '11']


def test_outs_ignores_a_fight_without_exits_or_evade(outs):
    assert outs({'choices': [], 'combat': {'enemies': [], 'evade': None}}) == []
    assert outs({}) == []


def test_reading_file_layout(tmp_path):
    sections = {
        '10': {'text': ['Ten.'], 'choices': [{'to': '1'}], 'end': 'victory'},
        '2': {'text': ['Two a.', 'Two b.'], 'choices': [{'to': '10'}, {'to': '1'}, {'to': '10'}]},
        '1': {'text': ['One.'], 'choices': [{'to': '2'}],
              'combat': {'enemies': [{'name': 'Rat'}, {'name': 'Bat'}], 'evade': {'to': '10'}}},
    }
    _, f = run_script(tmp_path, sections)
    assert f.read_text(encoding='utf-8') == (
        '#1 -> 2,10 [fight: Rat, Bat]\nOne.\n\n'     # sections in numeric order, not text order
        '#2 -> 10,1\nTwo a.\nTwo b.\n\n'              # repeats listed once, order kept
        '#10 -> 1\nTen.\n\n')


def test_a_section_with_no_way_on_shows_its_ending_or_a_dash(tmp_path):
    sections = {'1': {'text': ['a'], 'choices': [], 'end': 'death'}, '2': {'text': ['b'], 'choices': []},
                '3': {'choices': [{'to': '1'}]}}
    _, f = run_script(tmp_path, sections)
    lines = f.read_text(encoding='utf-8').splitlines()
    assert lines[0] == '#1 -> death'
    assert '#2 -> -' in lines
    assert '#3 -> 1' in lines   # no text field: just a blank line after the header


def test_prints_the_count(tmp_path, capsys):
    _, f = run_script(tmp_path, {'1': {'text': [], 'choices': []}, '2': {'text': [], 'choices': []}})
    out = capsys.readouterr().out
    assert out.startswith('wrote ') and out.strip().endswith('reading.txt: 2 sections')


def test_text_is_written_as_utf8(tmp_path):
    _, f = run_script(tmp_path, {'1': {'text': ['Café — done.'], 'choices': []}})
    assert 'Café — done.' in f.read_text(encoding='utf-8')
