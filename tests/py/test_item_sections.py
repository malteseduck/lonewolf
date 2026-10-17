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


# general signs (ADR 0036): a gate on something carried, whatever the book calls it, gold however it is
# named, food, a fight's rule for some rounds; a gate on a discipline or a rank is no item sign
@pytest.mark.parametrize('text, hit', [
    ('If you possess a Brass Whistle, turn to 9.', True), ('If you are carrying some Blue Stones, turn to 9.', True),
    ('If you do not have an Ornate Ring, turn to 9.', True), ('If you do not possess this, turn to 9.', True),
    ('If you are already wearing a cloak, turn to 9.', True), ('If you wish to offer the guard something, turn to 9.', True),
    ('If you wish to rest, turn to 9.', False), ('If you do not possess this skill, turn to 9.', False),
    ('If you do not possess either of these skills, turn to 9.', False),
    ('The purse holds forty gold pieces.', True), ('You eat the last of your food.', True),
    ('For the first two rounds of combat, you fight bare-handed.', True),
    ('If you have the Kai Discipline of Tracking, turn to 9.', False), ('If you have reached the rank of Guardian, turn to 9.', False),
    ('You look round the empty hall.', False),
])
def test_key_matches_general_signs_of_items(KEY, text, hit):
    assert bool(KEY.search(text)) is hit




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








def test_exits_with_advice_when_the_reading_copy_is_missing(tmp_path):
    with pytest.raises(SystemExit) as e:
        run_script(tmp_path, {1: '<p>A Sword.</p>'}, None)
    assert 'reading_copy.py 02fotw' in str(e.value)


