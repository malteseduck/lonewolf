"""tools/item_sections.py is a script: it scans a book's sect*.htm for item wording and writes the matching
sections out of reading.txt. Run here as a copy inside a temporary tree, on made-up pages."""
import os
import runpy
import shutil
import sys

import pytest

SRC = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'tools', 'item_sections.py'))


def article(body):
    return f'<html><article><div class="maintext">{body}</div></article><p>after</p></html>'


def run_script(root, pages, reading, book='02fotw'):
    tools = root / 'tools'
    tools.mkdir(parents=True, exist_ok=True)
    script = tools / 'item_sections.py'
    shutil.copyfile(SRC, script)
    d = root / 'data' / 'projectaon' / book
    d.mkdir(parents=True, exist_ok=True)
    for n, body in pages.items():
        (d / f'sect{n}.htm').write_text(article(body), encoding='utf-8')
    if reading is not None:
        (d / 'reading.txt').write_text(reading, encoding='utf-8')
    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(sys, 'argv', [str(script), book])
        ns = runpy.run_path(str(script))
    return ns, d / 'items-reading.txt'


READING = ''.join(f'#{n} -> {n + 1}\nText of {n}.\n\n' for n in (1, 2, 3, 4, 5, 10))


@pytest.fixture(scope='module')
def KEY(tmp_path_factory):
    return run_script(tmp_path_factory.mktemp('is'), {1: '<p>.</p>'}, READING)[0]['KEY']


@pytest.mark.parametrize('text', [
    'You find a Sword.', 'Add it to your Action Chart.', 'You may take a Special Item.', 'You have 12 Gold Crowns.',
    'You must eat a Meal.', 'You lose 3 ENDURANCE points.', 'deduct 1 from your COMBAT SKILL', 'erase it from your Chart',
    'a dose of laumspur', 'a rope and a torch', 'the Golden Key', 'You pick up the lamp.', 'it was stolen',
])
def test_key_matches_item_wording(KEY, text):
    assert KEY.search(text)


@pytest.mark.parametrize('text', ['The road bends north.', 'A quiet room with a view.', 'He nods.'])
def test_key_ignores_plain_scenery(KEY, text):
    assert not KEY.search(text)


def test_writes_only_sections_with_item_wording_and_their_choice_lines(tmp_path, capsys):
    pages = {
        1: '<p>You find a Sword.</p><p class="choice">Turn to <a href="sect2.htm">2</a>.</p>',
        2: '<p>A quiet room.</p><p class="choice">Turn to <a href="sect3.htm">3</a>.</p>',
        3: '<p>The hall.</p><p class="choice">If you have a Golden Key, turn to <a href="sect4.htm">4</a>.</p>'
           '<p class="choice">Otherwise turn to <a href="sect5.htm">5</a>.</p>',   # the gate is in the choice line
        4: '<p class="combat">Rat: COMBAT SKILL 5 ENDURANCE 5</p><p>The Rat bites.</p>',   # stat lines are not scanned
        5: '<p>You may eat a Meal.</p>',
    }
    _, out = run_script(tmp_path, pages, READING)
    assert out.read_text(encoding='utf-8') == (
        '#1 -> 2\nText of 1.\n  > Turn to 2.\n\n'
        '#3 -> 4\nText of 3.\n  > If you have a Golden Key, turn to 3 4.\n'.replace('3 4', '4')
        + '  > Otherwise turn to 5.\n\n'
        '#5 -> 6\nText of 5.\n\n')
    printed = capsys.readouterr().out.splitlines()
    assert printed[0].startswith('3 sections to read, written to ')
    assert printed[1] == '1 3 5'


def test_a_hit_not_in_the_reading_copy_is_counted_but_not_written(tmp_path, capsys):
    _, out = run_script(tmp_path, {1: '<p>A Sword.</p>', 99: '<p>A Sword.</p>'}, READING)
    assert out.read_text(encoding='utf-8') == '#1 -> 2\nText of 1.\n\n'
    assert capsys.readouterr().out.splitlines()[1] == '1 99'


def test_hits_are_listed_in_numeric_order(tmp_path, capsys):
    run_script(tmp_path, {10: '<p>A Sword.</p>', 2: '<p>A Sword.</p>', 3: '<p>A Sword.</p>'}, READING)
    assert capsys.readouterr().out.splitlines()[1] == '2 3 10'


def test_only_the_article_is_scanned(tmp_path, capsys):
    root = tmp_path
    run_script(root, {1: '<p>Calm.</p>'}, READING)
    d = root / 'data' / 'projectaon' / '02fotw'
    (d / 'sect1.htm').write_text('<html><nav><p>Sword</p></nav><article><p>Calm.</p></article></html>', encoding='utf-8')
    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(sys, 'argv', [str(root / 'tools' / 'item_sections.py'), '02fotw'])
        runpy.run_path(str(root / 'tools' / 'item_sections.py'))
    assert '0 sections to read' in capsys.readouterr().out.splitlines()[-2]


def test_exits_with_advice_when_the_reading_copy_is_missing(tmp_path):
    with pytest.raises(SystemExit) as e:
        run_script(tmp_path, {1: '<p>A Sword.</p>'}, None)
    assert 'reading_copy.py 02fotw' in str(e.value)


def test_tags_in_a_choice_line_are_stripped_and_entities_decoded(tmp_path):
    pages = {1: '<p>Sword.</p><p class="choice">Pay <b>5</b> Gold &amp; turn to <a href="sect2.htm">2</a>.</p>'}
    _, out = run_script(tmp_path, pages, READING)
    assert '  > Pay 5 Gold & turn to 2.\n' in out.read_text(encoding='utf-8')
