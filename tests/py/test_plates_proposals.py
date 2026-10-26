"""tools/plates_proposals.py, step 7's proposal file (ruling R23): what the agent offers the owner for
each enemy, checked before the proposal sheet shows it. Made-up books and pictures, never Project Aon's."""
import json

import pytest

import plates_file as pf
import plates_proposals as pp

CODE = '05xx'


@pytest.fixture
def tree(tmp_path, monkeypatch):
    monkeypatch.setattr(pf, 'ROOT', str(tmp_path))
    monkeypatch.setattr(pp, 'ROOT', str(tmp_path))

    class T:
        root = tmp_path

        def file(self, rel, data='x'):
            f = tmp_path.joinpath(*rel.split('/'))
            f.parent.mkdir(parents=True, exist_ok=True)
            f.write_text(data, encoding='utf-8')

        def book(self):
            secs = {'1': {'text': ['A start.'], 'choices': [{'to': '2'}]},
                    '2': {'text': ['A bog.'], 'combat': {'enemies': [{'name': 'Mire Toad'}]}, 'choices': []},
                    '3': {'text': ['A gate.'], 'combat': {'enemies': [{'name': 'Iron Gate'}]}, 'choices': []}}
            self.file(f'data/projectaon/{CODE}/book.js',
                      '(window.LW = window.LW || {}).BOOKS = Object.assign(window.LW.BOOKS || {}, '
                      + json.dumps({CODE: {'id': CODE, 'sections': secs}}) + ');')
            # the sheets' colour list, which the check reads
            self.file('tools/admin/plateprompt.js', "export const COLOURS = ['red', 'black',\n  'grey'];")

        def proposals(self, enemies):
            self.file(f'data/projectaon/{CODE}/plate-proposals.json', json.dumps({'made': '2026-10-26', 'enemies': enemies}))

    return T()


def test_a_sound_file_has_no_problems(tree):
    tree.book()
    tree.file('assets/plates/gate.jpg')
    tree.file(f'data/projectaon/{CODE}/ill1.png')
    tree.proposals([
        {'name': 'Iron Gate', 'note': 'A door.', 'candidates': [
            {'src': 'assets/plates/gate.jpg', 'why': 'an iron door'},
            {'web': 'https://example.org/thumb.jpg', 'page': 'https://example.org/gate', 'licence': 'CC0'}], 'pick': 1},
        {'name': 'Mire Toad', 'sections': [1], 'refs': [f'data/projectaon/{CODE}/ill1.png'], 'candidates': [{'src': f'data/projectaon/{CODE}/ill1.png', 'crop': [0, 0, .5, 1]}]},
    ])
    assert pp.problems(CODE) == []


def test_each_mistake_the_sheet_could_not_show_is_named(tree):
    tree.book()
    tree.proposals([
        {'name': 'Mire Frog', 'candidates': []},                                          # no such enemy
        {'name': 'Iron Gate', 'sections': [9], 'pick': 2, 'refs': ['data/projectaon/05xx/small9.png'], 'candidates': [
            {'src': 'assets/plates/none.jpg'},                                            # not on disk
            {'web': 'http://example.org/t.jpg'}]},                                        # no page, not https
    ])
    found = ' | '.join(pp.problems(CODE))
    assert 'Mire Frog' in found and 'not an enemy' in found
    assert 'assets/plates/none.jpg' in found
    assert 'page' in found and 'https' in found
    assert 'section 9' in found
    assert 'pick' in found
    assert 'small9.png' in found                                                         # a reference not on disk


def test_a_prompt_is_text_in_our_own_words(tree):
    """The prompt is sent to an image generator: never a run of the book's own words (ADR 0042)."""
    tree.book()
    tree.proposals([
        {'name': 'Mire Toad', 'candidates': [], 'prompt': 'A squat warty toad the size of a pony, wide mouth agape, in a reedy bog'},
        {'name': 'Iron Gate', 'candidates': [], 'prompt': ['not', 'text']},
    ])
    assert [p for p in pp.problems(CODE)] == ['Iron Gate: its prompt must be text']
    secs = json.loads((tree.root / 'data' / 'projectaon' / CODE / 'book.js').read_text(encoding='utf-8').split(', ', 1)[1].rsplit(');', 1)[0])
    secs[CODE]['sections']['2']['text'] = ['Out of the dark water rises a squat warty toad the size of a pony and it croaks.']
    tree.file(f'data/projectaon/{CODE}/book.js', '(window.LW = window.LW || {}).BOOKS = Object.assign(window.LW.BOOKS || {}, ' + json.dumps(secs) + ');')
    tree.proposals([{'name': 'Mire Toad', 'candidates': [], 'prompt': 'Out of the dark water rises a squat warty toad the size of a pony'}])
    assert pp.problems(CODE) == ["Mire Toad: its prompt repeats 8 or more of the book's words in a row: reword it"]


def test_a_missing_file_says_so(tree):
    tree.book()
    assert pp.problems(CODE) == [f'no data/projectaon/{CODE}/plate-proposals.json']


def test_the_sentences_marked_as_describing_it_are_in_their_section(tree):
    """`describe` names phrases of a section that describe the enemy, for the sheet to highlight; a phrase not
    in that section (mistyped, or another section's) would highlight nothing."""
    tree.book()
    tree.proposals([{'name': 'Mire Toad', 'candidates': [], 'describe': {'2': ['a bog'], '1': ['a bog'], '7': ['x']}}])
    assert pp.problems(CODE) == ["Mire Toad: section 1 has no 'a bog' to highlight", 'Mire Toad: no section 7']


def test_a_prompt_names_no_colour(tree, monkeypatch):
    """A fight picture is an ink drawing: the prompt names no colour (the owner, 2026-10-26), by the list the
    sheets strip (tools/admin/plateprompt.js); a name such as "Black Hawk" is not a colour."""
    tree.book()
    tree.file('tools/admin/plateprompt.js', "export const COLOURS = ['red', 'black',\n  'grey'];\nconst C = 1;")
    tree.proposals([
        {'name': 'Mire Toad', 'candidates': [], 'prompt': 'a reddish toad with blood-red eyes and a black-and-grey hide'},
        {'name': 'Iron Gate', 'candidates': [], 'prompt': 'a gate guarded by Black Hawk, dark and weathered'},
    ])
    assert pp.problems(CODE) == ['Mire Toad: its prompt names a colour (reddish, red, black, grey): an ink drawing has none, describe it in tone and texture']


def test_a_row_is_settled_by_a_choice_or_kept_as_it_is_and_can_be_reopened(tree):
    tree.book()
    tree.proposals([{'name': 'Mire Toad', 'candidates': []}, {'name': 'Iron Gate', 'candidates': []}])
    pp.decide(CODE, 'Mire Toad', 'chosen', 'art/plates/05xx/mire-toad.webp', today='2026-10-26')
    pp.decide(CODE, 'Iron Gate', 'kept', today='2026-10-26')
    rows = {e['name']: e for e in pp.load(CODE)['enemies']}
    assert rows['Mire Toad']['decided'] == {'how': 'chosen', 'src': 'art/plates/05xx/mire-toad.webp', 'on': '2026-10-26'}
    assert rows['Iron Gate']['decided'] == {'how': 'kept', 'on': '2026-10-26'}
    assert pp.open_rows(CODE) == 0 and pp.problems(CODE) == []
    pp.decide(CODE, 'Iron Gate', None)
    assert 'decided' not in {e['name']: e for e in pp.load(CODE)['enemies']}['Iron Gate'] and pp.open_rows(CODE) == 1
    with pytest.raises(ValueError):
        pp.decide(CODE, 'Mire Frog', 'kept')
    with pytest.raises(ValueError):
        pp.decide(CODE, 'Mire Toad', 'maybe')


def test_finishing_moves_the_round_to_the_done_file_which_keeps_every_round(tree):
    tree.book()
    tree.proposals([{'name': 'Mire Toad', 'candidates': []}])
    pp.decide(CODE, 'Mire Toad', 'kept', today='2026-10-26')
    assert pp.finish(CODE, today='2026-10-26') == 1
    assert not tree.root.joinpath('data', 'projectaon', CODE, 'plate-proposals.json').exists()
    tree.proposals([{'name': 'Iron Gate', 'candidates': []}])
    assert pp.finish(CODE, today='2026-10-27') == 1
    done = pp.done(CODE)
    assert [r['finished'] for r in done['rounds']] == ['2026-10-26', '2026-10-27']
    assert done['rounds'][0]['enemies'][0]['decided']['how'] == 'kept'
    assert 'decided' not in done['rounds'][1]['enemies'][0]  # finished with it still open
    with pytest.raises(ValueError):
        pp.finish(CODE)
