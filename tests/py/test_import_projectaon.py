"""tools/import_projectaon.py is a script, not a module: it parses a book when run. The tests copy it into
a temporary tools/ folder (so the data/ and assets/ it builds its paths from are temporary too), run it
with runpy against a tiny made-up book, and read both its parser functions (the returned namespace) and
the files it wrote. The sections below are stand-ins written for the tests, in Project Aon's markup shape."""
import json
import os
import runpy
import shutil
import sys

import pytest

SRC = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'tools', 'import_projectaon.py'))
FIN = {999: '<p>Fin.</p>'}  # the highest-numbered section is the book's victory; tests keep it out of the way


def page(body):
    return '<html><body><div class="maintext">' + body + '</div><p id="page-navigation"></p></body></html>'


def choice(text, to):
    return f'<p class="choice">{text} <a href="sect{to}.htm">{to}</a>.</p>'


def foe(name, cs, ep):
    return (f'<p class="combat">{name}: <span class="cs">COMBAT SKILL</span> {cs} '
            f'<span class="ep">ENDURANCE</span> {ep}</p>')


def run_importer(root, book='02fotw', sections=None, extra=None, plates=None, fin=True):
    """Run a copy of the importer inside root; returns its namespace. Writes only under root."""
    tools = root / 'tools'
    tools.mkdir(parents=True, exist_ok=True)
    script = tools / 'import_projectaon.py'
    shutil.copyfile(SRC, script)
    d = root / 'data' / 'projectaon' / book
    d.mkdir(parents=True, exist_ok=True)
    pages = dict(sections or {})
    if fin:
        pages.update(FIN)
    for n, body in pages.items():
        (d / f'sect{n}.htm').write_text(page(body), encoding='utf-8')
    for name, text in (extra or {}).items():
        (d / name).write_text(text, encoding='utf-8')
    pl = root / 'assets' / 'plates'
    pl.mkdir(parents=True, exist_ok=True)
    (pl / 'plates.json').write_text(json.dumps({'plates': plates or []}), encoding='utf-8')
    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(sys, 'argv', [str(script), book])
        return runpy.run_path(str(script))


def secs(tmp_path, sections, **kw):
    return run_importer(tmp_path, sections=sections, **kw)['sections']


# ---- the parser functions, by series (the series follows the book code) ----
@pytest.fixture(scope='module')
def kai(tmp_path_factory):
    return run_importer(tmp_path_factory.mktemp('kai'), '01fftd')


@pytest.fixture(scope='module')
def magnakai(tmp_path_factory):
    return run_importer(tmp_path_factory.mktemp('mk'), '06tkot')


@pytest.fixture(scope='module')
def grand(tmp_path_factory):
    return run_importer(tmp_path_factory.mktemp('gm'), '13tplor')


def test_series_follows_the_book_code(kai, magnakai, grand):
    assert (kai['number'], kai['series']) == (1, 'kai')
    assert (magnakai['number'], magnakai['series']) == (6, 'magnakai')
    assert (grand['number'], grand['series']) == (13, 'grandmaster')


# plain / lines / sentences
def test_plain_strips_tags_entities_and_footnote_marks(kai):
    p = kai['plain']
    assert p('<i>Hello</i>&nbsp;  &amp; <b>bye</b>\n now') == 'Hello & bye now'
    assert p('Word<sup> <a href="#s1-foot" id="x">1</a> </sup> after') == 'Word after'
    # a superscript that is not a footnote mark keeps its text
    assert p('x<sup>2</sup>') == 'x2'


def test_lines_breaks_at_br_and_drops_empty_lines(kai):
    assert kai['lines']('One<br>Two<br/>  <br />Three') == ['One', 'Two', 'Three']


def test_sentences_split_after_stops_but_not_after_ie_or_eg(kai):
    s = kai['sentences']
    assert s('First one. Second one! Third? Fourth.') == ['First one.', 'Second one!', 'Third?', 'Fourth.']
    assert s('You may (i.e. you possess it) go. Next.') == ['You may (i.e. you possess it) go.', 'Next.']
    assert s('Take it (e.g. a sword) now. Next.') == ['Take it (e.g. a sword) now.', 'Next.']


def test_gm_names_turns_grand_mastery_of_nexus_into_grand_nexus(kai):
    assert kai['gm_names']('the Grand Mastery of Nexus') == 'the Grand Nexus'
    assert kai['gm_names']('Mastery of Nexus') == 'Mastery of Nexus'


# disc_list
@pytest.mark.parametrize('text,expect', [
    ('Hunting', (['hunting'], False)),
    ('either Tracking or Sixth Sense', (['tracking', 'sixthSense'], False)),
    ('both Camouflage and Hunting', (['camouflage', 'hunting'], True)),
    ('Hunting, Tracking and Camouflage', (['hunting', 'tracking', 'camouflage'], True)),
    ('Hunting, Tracking, or Camouflage', (['hunting', 'tracking', 'camouflage'], False)),
    ('Weaponskill (any weapon)', (['weaponskill'], False)),
    ('Animal Kinship', (['animalKinship'], False)),
    ('hunting', (['hunting'], False)),
])
def test_disc_list_reads_names_with_or_as_any_and_and_as_all(kai, text, expect):
    assert kai['disc_list'](text) == expect


@pytest.mark.parametrize('text', ['Hunting or Tracking and Camouflage', 'Hunting or a Sword', 'Sword', ''])
def test_disc_list_refuses_mixed_connectives_and_unknown_names(kai, text):
    assert kai['disc_list'](text) is None


# condition
@pytest.mark.parametrize('text,expect', [
    ('have the Kai Discipline of Hunting', {'disc': ['hunting']}),
    ('possess the Magnakai Discipline of either Tracking or Sixth Sense', {'disc': ['tracking', 'sixthSense']}),
    ('have the Discipline of both Camouflage and Hunting', {'disc': ['camouflage', 'hunting'], 'every': True}),
    ('have reached the Kai rank of Guardian', {'rank': 7}),
    ('have reached the Kai rank of Guardian or higher', {'rank': 7}),
    ('have attained the Magnakai rank of Primate', {'rank': 4}),
    ('have completed the Lore-circle of Fire', {'circle': ['Circle of Fire']}),
    ('have completed the Lore-circles of Fire and Light', {'circle': ['Circle of Fire', 'Circle of Light']}),
    ('possess the Lore-circle of the Spirit', {'circle': ['Circle of the Spirit']}),
    ('have the Kai Discipline of Hunting (you possess 8 Kai Disciplines)', {'disc': ['hunting']}),
    ('have the Kai Discipline of Hunting and have reached the Kai rank of Guardian', {'disc': ['hunting'], 'rank': 7}),
    ('have the Kai Discipline of Hunting and also have completed the Lore-circle of Light', {'disc': ['hunting'], 'circle': ['Circle of Light']}),
    ('your current ENDURANCE point total is less than 10', {'ep': [-99, 9]}),
    ('your ENDURANCE points total is now 20 or more', {'ep': [20, 99]}),
    ('your ENDURANCE point total is more than 5', {'ep': [6, 99]}),
    ('your ENDURANCE point total is 8 or less', {'ep': [-99, 8]}),
    ('your ENDURANCE point total is below 4', {'ep': [-99, 3]}),
])
def test_condition_reads_disciplines_ranks_circles_and_endurance(kai, text, expect):
    assert kai['condition'](text) == expect


@pytest.mark.parametrize('text', [
    'have a Sword',                                           # an item
    'have the Kai Discipline of Hunting and have a Sword',    # one clause unreadable spoils the whole
    'have the Kai Discipline of Juggling',                    # not a discipline
    'have reached the Kai rank of Overlord',                  # not a rank
    'have completed the Lore-circle of Mud',                  # not a circle
    'your ENDURANCE point total is exactly 7',
    'have the Kai Discipline of Hunting and have the Kai Discipline of Tracking',  # a second disc clause is refused
    '',
])
def test_condition_gives_up_on_anything_else(kai, text):
    assert kai['condition'](text) is None


def test_condition_grand_master_forms(grand):
    c = grand['condition']
    assert c('possess Kai-screen') == {'disc': ['kaiScreen']}
    assert c('have the Grand Mastery of Nexus') == {'disc': ['grandNexus']}
    assert c('have the Grand Master Discipline of Telegnosis') == {'disc': ['telegnosis']}
    assert c('have Mastery of Telegnosis') == {'disc': ['telegnosis']}
    assert c('possess Grand Weaponmastery (with Bow)') is None  # the Bow must be mastered: a condition cannot say


def test_condition_bare_names_only_in_a_grand_master_book(kai):
    assert kai['condition']('possess Kai-screen') is None


# gate
@pytest.mark.parametrize('text,expect', [
    ('If you have the Kai Discipline of Hunting, turn to 5.', {'disc': 'hunting'}),
    ('If you possess the Kai Discipline of Hunting turn to 5.', {'disc': 'hunting'}),
    ('If you have the Kai Discipline of Tracking or Sixth Sense, turn to 5.', {'disc': ['tracking', 'sixthSense']}),
    ('If you have the Kai Discipline of both Camouflage and Hunting, turn to 5.', {'disc': ['camouflage', 'hunting'], 'every': True}),
    ('If you have reached the Kai rank of Guardian, turn to 9.', {'rank': 7}),
    ('If you have completed the Lore-circle of Fire, turn to 3.', {'circle': ['Circle of Fire']}),
    ('If you have the Kai Discipline of Hunting or have reached the Kai rank of Primate, turn to 8.',
     {'any': [{'disc': 'hunting'}, {'rank': 4}]}),
    ('If you wish to use the Kai Discipline of Hunting, turn to 7.', {'disc': 'hunting'}),
    ('If you have the Kai Discipline of Hunting and wish to go left, turn to 7.', {'disc': 'hunting'}),
])
def test_gate_reads_the_condition_before_the_comma(kai, text, expect):
    assert kai['gate'](text) == expect


@pytest.mark.parametrize('text', [
    'If you do not have the Kai Discipline of Hunting, turn to 5.',
    'If you have yet to complete the Lore-circle of Fire, turn to 5.',
    'If you have neither the Kai Discipline of Hunting nor Tracking, turn to 5.',
    'If you have the Kai Discipline of Hunting or have a Sword, turn to 8.',
    'If you wish to enter the door, turn to 5.',
    'If you have a Sword, turn to 5.',
    'Turn to 5.',
    'If you have the Kai Discipline of Swimming, turn to 5.',
])
def test_gate_leaves_negative_or_unreadable_choices_open(kai, text):
    assert kai['gate'](text) is None


@pytest.mark.xfail(strict=True, reason="gate(): r\"\b(?:...|n't)\b\" can never match inside a word, so a contraction (haven't, don't) is not seen as negative")
def test_gate_treats_a_contraction_as_negative(kai):
    assert kai['gate']("If you haven't the Kai Discipline of Hunting, turn to 5.") is None


def test_gate_ignores_what_follows_the_comma(kai):
    # the discipline named after the comma is not part of the condition
    assert kai['gate']('If you have the Kai Discipline of Hunting, turn to 5; if you have Tracking, turn to 6.') == {'disc': 'hunting'}


def test_gate_grand_master_bare_discipline_and_bow(grand, kai):
    assert grand['gate']('If you possess Kai-screen, turn to 5.') == {'disc': 'kaiScreen'}
    assert grand['gate']('If you have the Grand Mastery of Nexus, turn to 5.') == {'disc': 'grandNexus'}
    assert grand['gate']('If you possess Grand Weaponmastery (with Bow), turn to 5.') is None
    assert kai['gate']('If you possess Kai-screen, turn to 5.') is None


# as_int / span
def test_as_int_reads_the_books_minus_sign(kai):
    assert kai['as_int']('−3') == -3
    assert kai['as_int']('+2') == 2
    assert kai['as_int']('7') == 7


@pytest.mark.parametrize('text,expect', [
    ('If the number you have picked is 0–4, turn to 9.', [0, 4]),
    ('If the number you have picked is 0-4, turn to 9.', [0, 4]),
    ('If your total is −2–+3, turn to 9.', [-2, 3]),
    ('If your total is 5 or more, turn to 9.', [5, 99]),
    ('If the score is 7 or higher, turn to 9.', [7, 99]),
    ('If your total is 4 or less, turn to 9.', [-99, 4]),
    ('If your total is 4 or lower, turn to 9.', [-99, 4]),
    ('If the number picked is below 7, turn to 9.', [-99, 6]),
    ('If the total is less than 7, turn to 9.', [-99, 6]),
    ('If the total is above 6, turn to 9.', [7, 99]),
    ('If the total is more than 6, turn to 9.', [7, 99]),
    ('If the number is 0, turn to 9.', [0, 0]),
    ('If the number you pick is 3, turn to 9.', [3, 3]),
    ('If the total is 10–12, turn to 9.', [10, 12]),
])
def test_span_reads_the_random_number_range(kai, text, expect):
    assert kai['span'](text) == expect


@pytest.mark.parametrize('text', [
    'If you lose any ENDURANCE, even when the number is 3, turn to 9.',
    'Your COMBAT SKILL total is 4 or less, turn to 9.',
    'Turn to 4.',
    'If you have a Sword, turn to 9.',
])
def test_span_ignores_endurance_combat_skill_and_non_draws(kai, text):
    assert kai['span'](text) is None


# number_rules / reach
def test_number_rules_none_when_zero_counts_as_ten(kai):
    assert kai['number_rules']('Pick a number. 0 = 10. If you have the Kai Discipline of Hunting, add 2 to the number.') is None


def test_number_rules_empty_when_nothing_is_added(kai):
    assert kai['number_rules']('Pick a number from the Random Number Table.') == []


def test_number_rules_reads_discipline_bonus_and_penalty(kai):
    nr = kai['number_rules']
    assert nr('If you have the Kai Discipline of Hunting, add 2 to the number you have picked.') == [
        {'disc': ['hunting'], 'plus': 2}]
    assert nr('If you have the Kai Discipline of Hunting, deduct 1 from the number you have picked.') == [
        {'disc': ['hunting'], 'plus': -1}]
    assert nr('If you have reached the Kai rank of Guardian, add 1 to the total.') == [{'rank': 7, 'plus': 1}]
    assert nr('If you have the Kai Discipline of Hunting, add a further 1 to the number.') == [
        {'disc': ['hunting'], 'plus': 1}]
    assert nr('Also, If you have the Kai Discipline of Hunting, add another 1 to the number.') == [
        {'disc': ['hunting'], 'plus': 1}]


@pytest.mark.xfail(strict=True, reason="number_rules(): the prefix is (?:However, |Also, )?If with a capital I, so the natural 'However, if you ...' is not read and the section goes free")
def test_number_rules_reads_however_if(kai):
    assert kai['number_rules']('However, if you have the Kai Discipline of Hunting, add 1 to the number.') == [
        {'disc': ['hunting'], 'plus': 1}]


def test_number_rules_endurance_condition(kai):
    assert kai['number_rules']('If your current ENDURANCE point total is less than 10, deduct 1 from the number.') == [
        {'ep': [-99, 9], 'plus': -1}]


def test_number_rules_adds_up_several_sentences(kai):
    got = kai['number_rules']('If you have the Kai Discipline of Hunting, add 1 to the number. '
                              'If you have the Kai Discipline of Tracking, add 2 to the number.')
    assert got == [{'disc': ['hunting'], 'plus': 1}, {'disc': ['tracking'], 'plus': 2}]


def test_number_rules_for_every_magnakai_discipline(kai):
    got = kai['number_rules']('Add 1 for every Magnakai Discipline you possess (above your initial three) to the number.')
    assert got == [{'plus': 1, 'each': 'magnakai', 'over': 3}]
    got = kai['number_rules']('Add 2 to the number for every Magnakai Discipline you possess.')
    assert got == [{'plus': 2, 'each': 'magnakai', 'over': 0}]


def test_number_rules_skips_combat_skill_sentences_and_examples(kai):
    assert kai['number_rules']('If you have the Kai Discipline of Hunting, add 1 to your COMBAT SKILL.') == []
    assert kai['number_rules']('Pick a number. (for example, add 3 to a 4 and you get 7). Go on.') == []


def test_number_rules_both_clause_is_taken_as_read(kai):
    got = kai['number_rules']('If you have the Discipline of Tracking or Sixth Sense, add 3 to the number. '
                              'If you have both, you may only add 3.')
    assert got == [{'disc': ['tracking', 'sixthSense'], 'plus': 3}]


@pytest.mark.parametrize('text', [
    'If you have a Sword, add 1 to the number you have picked.',   # an item
    'Add 1 to the number if you are lucky.',                        # a shape it cannot read
    'Add 1 to the number.',                                         # no condition at all
])
def test_number_rules_gives_up_on_what_it_cannot_read(kai, text):
    assert kai['number_rules'](text) is None


def test_reach_is_the_lowest_and_highest_total(kai):
    r = kai['reach']
    assert r([]) == (0, 9)
    assert r([{'plus': 2}]) == (0, 11)
    assert r([{'plus': -1}]) == (-1, 9)
    assert r([{'plus': 2}, {'plus': -3}]) == (-3, 11)
    assert r([{'plus': 1, 'each': 'magnakai', 'over': 3}]) == (0, 16)   # up to 7 disciplines above three
    assert r([{'plus': 1, 'each': 'magnakai', 'over': 0}]) == (0, 19)


# cs_rule
@pytest.mark.parametrize('text,expect', [
    ('If you have the Kai Discipline of Mindshield, you may add 2 to your COMBAT SKILL.',
     (2, {'disc': ['mindshield']}, None)),
    ('If you have the Kai Discipline of Mindshield you may add 2 to your COMBAT SKILL.',
     (2, {'disc': ['mindshield']}, None)),
    ('Unless you have the Kai Discipline of Camouflage, deduct 2 from your COMBAT SKILL.',
     (-2, None, {'disc': ['camouflage']})),
    ('Deduct 2 from your COMBAT SKILL for this fight.', (-2, None, None)),
    ('Increase your COMBAT SKILL by 3.', (3, None, None)),
    ('Subtract 1 from your COMBAT SKILL.', (-1, None, None)),
    ('Add an additional 1 to your COMBAT SKILL.', (1, None, None)),
    ('If you have reached the Kai rank of Guardian, reduce your COMBAT SKILL by 2.', (-2, {'rank': 7}, None)),
])
def test_cs_rule_reads_a_whole_fight_adjustment(kai, text, expect):
    assert kai['cs_rule'](text) == expect


@pytest.mark.parametrize('text', [
    'The Giak is weak.',                                                          # no COMBAT SKILL
    'Deduct 2 from your COMBAT SKILL for the first round.',                       # some rounds only
    'Add 2 to your COMBAT SKILL instead of the normal bonus.',                    # the engine's own bonus
    'If you carry the Sword, add 2 to your COMBAT SKILL.',                        # another condition
    'If you have a Sword, add 2 to your COMBAT SKILL.',
    'While wielding it you may add 2 to your COMBAT SKILL.',                      # a weapon
    'Add 2 to your COMBAT SKILL when it is dark.',                                # an unread condition word
    'If your ENDURANCE is 5 or less, add 2 to your COMBAT SKILL.',                # more than disciplines
    'Add 1 to your COMBAT SKILL. Deduct 2 from your COMBAT SKILL.',               # two rules: left to the text
])
def test_cs_rule_leaves_other_wording_to_the_text(kai, text):
    assert kai['cs_rule'](text) is None


# ---- the whole run ----
def test_choices_with_gates_and_several_links(tmp_path):
    s = secs(tmp_path, {
        1: '<p>A crossroads.</p>'
           + choice('If you have the Kai Discipline of Hunting, turn to', 2)
           + choice('If you do not, turn to', 3)
           + '<p class="choice">Or go <a href="sect4.htm">4</a> or <a href="sect5.htm">5</a>.</p>',
        2: '<p>x</p>', 3: '<p>y</p>', 4: '<p>z</p>', 5: '<p>w</p>'})
    c = s['1']['choices']
    assert [x['to'] for x in c] == ['2', '3', '4', '5']
    assert c[0]['need'] == {'disc': 'hunting'}
    assert c[0]['text'] == 'If you have the Kai Discipline of Hunting, turn to 2.'
    assert 'need' not in c[1] and 'need' not in c[2]
    assert c[2]['text'] == c[3]['text']          # one paragraph, one choice per link
    assert all('range' not in x for x in c)      # no Random Number here
    assert s['1']['text'] == ['A crossroads.']


def test_text_markup_lists_signposts_verse_and_footnotes(tmp_path):
    s = secs(tmp_path, {
        1: '<p>Intro<sup><a href="#s1-foot">1</a></sup> text.</p>'
           '<ul><li>A rope</li><li>A lamp</li></ul>'
           '<div class="signpost">NORTH ROAD</div>'
           '<blockquote>Line one<br/>Line two</blockquote>'
           '<p>One<br>Two</p>' + choice('Turn to', 999)})
    assert s['1']['text'] == ['Intro text.', '– A rope', '– A lamp', 'NORTH ROAD', 'Line one', 'Line two', 'One', 'Two']


def test_endings_deadend_failed_puzzle_victory(tmp_path):
    s = secs(tmp_path, {
        1: '<p>Doom.</p><p class="deadend">Your life ends here.</p>',
        2: '<p>Quest over.</p><p class="choice">Your mission has failed.</p>',
        3: '<p>Answer.</p><p class="puzzle">What is the number?</p>',
        4: '<p>Odd.</p><p class="choice">No way on.</p>' + choice('Turn to', 999),
        5: '<p>Nothing.</p>'})
    assert s['1']['end'] == 'death' and s['1']['text'] == ['Doom.', 'Your life ends here.']
    assert s['2']['end'] == 'failed' and 'Your mission has failed.' in s['2']['text']
    assert s['3']['puzzle'] is True and 'end' not in s['3']
    assert 'end' not in s['4']              # a real way on beside the dead-looking choice
    assert 'end' not in s['5'] and s['5']['choices'] == []
    assert s['999']['end'] == 'victory'


def test_victory_is_the_highest_number_not_the_last_name(tmp_path):
    s = secs(tmp_path, {2: '<p>a</p>', 10: '<p>b</p>'}, fin=False)
    assert s['10']['end'] == 'victory'
    assert 'end' not in s['2']
    assert list(s) == ['2', '10']


def test_forced_meal(tmp_path):
    s = secs(tmp_path, {
        1: '<p>You must eat a Meal now or lose 3 ENDURANCE points.</p>',
        2: '<p>Unless you eat a Meal now you lose 3 ENDURANCE points.</p>',
        3: '<p>You must also eat a Meal here.</p>',
        4: '<p>You may eat a Meal if you wish.</p>'})
    assert [s[k].get('meal') for k in '1234'] == [True, True, True, None]


def random_page(intro_tail, *choices):
    return ('<p>Pick a number from the <a href="random.htm">Random Number Table</a>.' + intro_tail + '</p>'
            + ''.join(choice(t, to) for t, to in choices))


def test_random_number_auto_when_ranges_cover_every_total_once(tmp_path):
    s = secs(tmp_path, {1: random_page('', ('If your total is 0-4, turn to', 2), ('If it is 5 or more, turn to', 3)),
                        2: '<p>.</p>', 3: '<p>.</p>'})
    sec = s['1']
    assert sec['rnt'] == 'auto' and 'rntMod' not in sec
    assert [c['range'] for c in sec['choices']] == [[0, 4], [5, 99]]


def test_random_number_free_when_a_total_is_not_covered_or_covered_twice(tmp_path):
    s = secs(tmp_path, {
        1: random_page('', ('If your total is 0-4, turn to', 3), ('If it is 6 or more, turn to', 3)),   # 5 is missing
        2: random_page('', ('If your total is 0-5, turn to', 3), ('If it is 5 or more, turn to', 3)),   # 5 twice
        3: '<p>.</p>'})
    for k in '12':
        assert s[k]['rnt'] == 'free'
        assert all('range' not in c for c in s[k]['choices'])   # ranges are dropped when free


def test_random_number_bonus_extends_the_ranges_that_must_be_covered(tmp_path):
    bonus = ' If you have the Kai Discipline of Hunting, add 2 to the number you have picked.'
    s = secs(tmp_path, {
        1: random_page(bonus, ('If the number you have picked is 0-5, turn to', 3), ('If it is 6 or more, turn to', 3)),
        2: random_page(bonus, ('If the number you have picked is 0-5, turn to', 3), ('If it is 6-9, turn to', 3)),  # 10, 11 uncovered
        3: '<p>.</p>'})
    assert s['1']['rnt'] == 'auto'
    assert s['1']['rntMod'] == [{'disc': ['hunting'], 'plus': 2}]
    assert s['2']['rnt'] == 'free' and 'rntMod' not in s['2']


def test_random_number_free_when_the_bonus_cannot_be_read(tmp_path):
    s = secs(tmp_path, {
        1: random_page(' If you have a Sword, add 1 to the number you have picked.',
                       ('If the number is 0-4, turn to', 2), ('If it is 5 or more, turn to', 2)),
        2: '<p>.</p>'})
    assert s['1']['rnt'] == 'free'


def test_random_number_choice_before_the_draw_stands_beside_ranges(tmp_path):
    s = secs(tmp_path, {
        1: random_page('', ('If you have the Kai Discipline of Sixth Sense, turn to', 2),
                       ('Otherwise if your total is 0-4, turn to', 2), ('If it is 5 or more, turn to', 2)),
        2: '<p>.</p>'})
    sec = s['1']
    assert sec['rnt'] == 'auto'
    assert sec['choices'][0]['need'] == {'disc': 'sixthSense'} and 'range' not in sec['choices'][0]


def test_random_number_free_when_a_plain_choice_stands_beside_ranges(tmp_path):
    s = secs(tmp_path, {
        1: random_page('', ('Go back, turn to', 2), ('If your total is 0-4, turn to', 2), ('If it is 5 or more, turn to', 2)),
        2: '<p>.</p>'})
    assert s['1']['rnt'] == 'free'


def test_ranges_are_dropped_in_a_section_with_no_random_number_link(tmp_path):
    s = secs(tmp_path, {1: '<p>Pick a number.</p>' + choice('If your total is 0-4, turn to', 2), 2: '<p>.</p>'})
    assert 'rnt' not in s['1'] and 'range' not in s['1']['choices'][0]


def test_combat_with_evade_after_n_rounds(tmp_path):
    s = secs(tmp_path, {
        1: '<p>A guard attacks.</p>' + foe('Giak Guard', 15, 20)
           + choice('You may evade combat after two rounds, turn to', 2) + choice('If you win, turn to', 3),
        2: '<p>.</p>', 3: '<p>.</p>'})
    assert s['1']['combat'] == {
        'enemies': [{'name': 'Giak Guard', 'cs': 15, 'ep': 20, 'sprite': 'giak'}],
        'evade': {'after': 2, 'to': '2'}}
    assert s['1']['choices'][0]['evade'] is True and 'evade' not in s['1']['choices'][1]
    assert s['1']['text'] == ['A guard attacks.']   # the stat line is not text


@pytest.mark.parametrize('sentence,expect', [
    ('You may evade combat after the first round, turn to', {'after': 1, 'to': '2'}),
    ('You can evade combat after 3 rounds, turn to', {'after': 3, 'to': '2'}),
    ('You may evade combat until the beginning of the third round, turn to', {'after': 2, 'to': '2'}),
    ('You may evade combat in the first round only, turn to', {'after': 0, 'to': '2', 'within': 1}),
    ('You may evade combat at any time, turn to', {'after': 0, 'to': '2'}),
    ("You may cease 'combat' at any time, turn to", {'after': 0, 'to': '2'}),
])
def test_evade_timing(tmp_path, sentence, expect):
    s = secs(tmp_path, {1: foe('Rat', 5, 5) + choice(sentence, 2), 2: '<p>.</p>'})
    assert s['1']['combat']['evade'] == expect


def test_losing_endurance_even_when_evading_is_not_the_evade_exit(tmp_path):
    s = secs(tmp_path, {1: foe('Rat', 5, 5) + choice('If you lose any ENDURANCE points, even when attempting to evade, turn to', 2),
                        2: '<p>.</p>'})
    assert 'evade' not in s['1']['combat']
    assert 'evade' not in s['1']['choices'][0]


def test_may_evade_wins_over_a_choice_that_only_mentions_evading(tmp_path):
    s = secs(tmp_path, {1: foe('Rat', 5, 5) + choice('If you evade the Rat anywhere else, turn to', 3)
                        + choice('You may evade combat after two rounds, turn to', 2), 2: '<p>.</p>', 3: '<p>.</p>'})
    assert s['1']['combat']['evade'] == {'after': 2, 'to': '2'}


def test_resistance_enemy_is_a_fight_but_target_points_are_not(tmp_path):
    s = secs(tmp_path, {
        1: '<p class="combat">Iron Door: COMBAT SKILL 20 ENDURANCE (RESISTANCE points) 35</p>',
        2: '<p class="combat">Target: COMBAT SKILL 20 ENDURANCE (TARGET points) 35</p>'})
    assert s['1']['combat']['enemies'] == [{'name': 'Iron Door', 'cs': 20, 'ep': 35, 'sprite': 'emblem'}]
    assert 'combat' not in s['2']


def test_several_enemies_and_sprites(tmp_path):
    s = secs(tmp_path, {1: foe('Kraan Rider', 12, 18) + foe('Vordak 2', 10, 10) + foe('Doomwolf', 8, 8)})
    assert [(e['name'], e['cs'], e['ep'], e['sprite']) for e in s['1']['combat']['enemies']] == [
        ('Kraan Rider', 12, 18, 'kraan'), ('Vordak 2', 10, 10, 'vordak'), ('Doomwolf', 8, 8, 'emblem')]


def test_mind_immunity_only_for_the_enemies_named(tmp_path):
    s = secs(tmp_path, {
        1: '<p>The Doomwolf is immune to Mindblast.</p>' + foe('Doomwolf', 8, 8) + foe('Giak', 9, 9),
        2: '<p>The enemies are immune to Mindblast.</p>' + foe('Rat', 1, 1) + foe('Bat', 1, 1),
        3: foe('Rat', 1, 1)})
    e1 = s['1']['combat']['enemies']
    assert e1[0]['immune'] is True and 'immune' not in e1[1]
    assert all(e['immune'] is True for e in s['2']['combat']['enemies'])   # none named: all are
    assert 'immune' not in s['3']['combat']['enemies'][0]


def test_mind_immunity_variants(tmp_path):
    s = secs(tmp_path, {
        1: '<p>It is immune to Mindblast (but not Psi-surge).</p>' + foe('Rat', 1, 1),
        2: '<p>It is immune to Mindblast and Psi-surge (but not Kai-surge).</p>' + foe('Rat', 1, 1),
        3: '<p>It is immune to Mindblast and Psi-surge; only the Grand Mastery of Kai-surge will work.</p>' + foe('Rat', 1, 1),
        4: '<p>It is immune to Psi-surge.</p>' + foe('Rat', 1, 1)})
    assert [s[k]['combat']['enemies'][0]['immune'] for k in '1234'] == ['mindblast', 'psi', 'psi', True]


def test_mind_drain_unless_shielded(tmp_path):
    s = secs(tmp_path, {1: '<p>Unless you possess the Kai Discipline of Mindshield, deduct 2 ENDURANCE points every round.</p>'
                        + foe('Rat', 1, 1) + foe('Bat', 1, 1)})
    assert [e['drain'] for e in s['1']['combat']['enemies']] == [2, 2]


def test_mind_drain_shield_is_psi_screen_in_a_magnakai_book(tmp_path):
    mk = lambda d: run_importer(tmp_path / d, '06tkot', {1: foe('Rat', 1, 1) + {
        'k': '<p>Unless you possess the Magnakai Discipline of Psi-screen, lose 3 ENDURANCE points each round.</p>',
        'w': '<p>Unless you possess the Kai Discipline of Mindshield, deduct 2 ENDURANCE points every round.</p>'}[d]})['sections']
    assert mk('k')['1']['combat']['enemies'][0]['drain'] == 3
    assert 'drain' not in mk('w')['1']['combat']['enemies'][0]


def test_combat_skill_adjustment_with_a_discipline_condition(tmp_path):
    s = secs(tmp_path, {
        1: '<p>If you have the Kai Discipline of Mindshield, you may add 2 to your COMBAT SKILL.</p>' + foe('Rat', 1, 1),
        2: '<p>Unless you have the Kai Discipline of Camouflage, deduct 2 from your COMBAT SKILL.</p>' + foe('Rat', 1, 1),
        3: '<p>Deduct 3 from your COMBAT SKILL.</p>' + foe('Rat', 1, 1),
        4: '<p>Deduct 3 from your COMBAT SKILL in the first round.</p>' + foe('Rat', 1, 1)})
    c1, c2, c3, c4 = (s[k]['combat'] for k in '1234')
    assert (c1['csMod'], c1['csIf'], c1['csNote']) == (2, {'disc': ['mindshield']}, 'As the text says')
    assert (c2['csMod'], c2['csUnless'], 'csIf' in c2) == (-2, {'disc': ['camouflage']}, False)
    assert c3['csMod'] == -3 and 'csIf' not in c3 and 'csUnless' not in c3
    assert 'csMod' not in c4


def test_plates_own_section_picture_and_image_fields(tmp_path):
    s = secs(tmp_path, {
        1: '<p>Before.</p><img src="ill3.png" alt="x"/>' + foe('Rat', 1, 1),
        2: '<p>Map.</p><img src="map.png"/>' + foe('Rat', 1, 1)})
    assert s['1']['img'] == {'file': 'ill3.png', 'full': True, 'at': 1}
    assert s['1']['combat']['enemies'][0]['art'] == 'ill3.png'
    assert s['2']['img'] == {'file': 'map.png', 'full': False, 'at': 1}
    assert 'art' not in s['2']['combat']['enemies'][0]


def test_enemy_borrows_the_plate_of_its_kind_pictured_elsewhere(tmp_path):
    s = secs(tmp_path, {
        1: '<img src="ill4.png"/>' + foe('Giak Scout', 1, 1),
        2: foe('Giak Scout 2', 1, 1),
        3: foe('Giak Scouts', 1, 1),
        4: foe('Giak Archer', 1, 1),     # another kind
        5: foe('Rat', 1, 1)})
    art = lambda k: s[k]['combat']['enemies'][0].get('art')
    assert (art('1'), art('2'), art('3'), art('4'), art('5')) == ('ill4.png', 'ill4.png', 'ill4.png', None, None)


def test_plate_fixes_for_book_one_are_checked_by_eye(tmp_path):
    s = run_importer(tmp_path, '01fftd', {1: foe('Kraan Rider', 1, 1) + foe('Gourgaz', 1, 1) + foe('Rat', 1, 1)})['sections']
    assert [e.get('art') for e in s['1']['combat']['enemies']] == ['ill3.png', 'ill7.png', None]


def test_intro_is_the_story_so_far_without_the_paragraph_that_links_on(tmp_path):
    tssf = ('<html><div class="frontmatter"><p>First   para.</p><p>Second <i>para</i>.</p>'
            '<p>See the <a href="gamerulz.htm">rules</a>.</p></div></article></html>')
    ns = run_importer(tmp_path, sections={1: '<p>.</p>'}, extra={'tssf.htm': tssf})
    assert ns['intro'] == ['First para.', 'Second para.']
    assert json.loads(open(tmp_path / 'data' / 'projectaon' / '02fotw' / 'import-report.json').read())['intro_paragraphs'] == 2


def test_no_intro_without_tssf(tmp_path):
    assert run_importer(tmp_path, sections={1: '<p>.</p>'})['intro'] == []


def book_js(tmp_path, book='02fotw'):
    js = (tmp_path / 'data' / 'projectaon' / book / 'book.js').read_text(encoding='utf-8')
    prefix = '(window.LW = window.LW || {}).BOOKS = Object.assign(window.LW.BOOKS || {}, '
    assert js.startswith(prefix) and js.endswith(');\n')
    return json.loads(js[len(prefix):-3])[book]


def test_book_js_has_the_book_format_fields(tmp_path):
    run_importer(tmp_path, '02fotw', {1: '<p>Hello.</p>' + choice('Turn to', 999)})
    b = book_js(tmp_path)
    assert (b['id'], b['number'], b['series'], b['title']) == ('02fotw', 2, 'kai', 'Fire on the Water')
    assert b['start'] == '1' and b['assets'] == 'data/projectaon/02fotw/' and b['map'] == 'map.png'
    assert b['bonusItem'] is False and b['intro'] == []
    assert set(b['sections']) == {'1', '999'}


def test_only_book_one_has_the_bonus_item(tmp_path):
    run_importer(tmp_path, '01fftd', {1: '<p>.</p>'})
    assert book_js(tmp_path, '01fftd')['bonusItem'] is True


def test_unknown_book_code_is_a_kai_book_numbered_zero(tmp_path):
    run_importer(tmp_path, 'zz99', {1: '<p>.</p>'})
    b = book_js(tmp_path, 'zz99')
    assert (b['number'], b['series'], b['title']) == (0, 'kai', 'zz99')


def test_map_names_the_upscale_once_it_exists(tmp_path):
    run_importer(tmp_path, sections={1: '<p>.</p>'}, extra={'map-4k.webp': 'x'})
    assert book_js(tmp_path)['map'] == 'map-4k.webp'


def test_text_is_kept_utf8_not_escaped(tmp_path):
    run_importer(tmp_path, sections={1: '<p>Café “quoted”.</p>'})
    raw = (tmp_path / 'data' / 'projectaon' / '02fotw' / 'book.js').read_text(encoding='utf-8')
    assert 'Café “quoted”.' in raw


def test_index_js_loads_every_imported_book(tmp_path):
    other = tmp_path / 'data' / 'projectaon' / '01fftd'
    other.mkdir(parents=True)
    (other / 'book.js').write_text('x', encoding='utf-8')
    run_importer(tmp_path, '02fotw', {1: '<p>.</p>'})
    idx = (tmp_path / 'data' / 'projectaon' / 'index.js').read_text(encoding='utf-8')
    assert idx.splitlines()[0].startswith('/* written by tools/import_projectaon.py')
    lines = idx.splitlines()[1:]
    assert lines == ["document.write('<script src=\"data/projectaon/01fftd/book.js\"><\\/script>');",
                     "document.write('<script src=\"data/projectaon/02fotw/book.js\"><\\/script>');"]


def test_write_if_changed_leaves_an_identical_file_alone(tmp_path, kai):
    w = kai['write_if_changed']
    f = tmp_path / 'out.txt'
    assert w(str(f), 'abc') is True
    os.utime(f, (1000, 1000))
    assert w(str(f), 'abc') is False
    assert os.stat(f).st_mtime == 1000          # not rewritten, so what is judged against it stays current
    assert w(str(f), 'abcd') is True
    assert f.read_text() == 'abcd'


def test_a_reimport_that_changes_nothing_does_not_touch_book_js(tmp_path):
    secs_ = {1: '<p>Hello.</p>'}
    run_importer(tmp_path, '02fotw', secs_)
    js = tmp_path / 'data' / 'projectaon' / '02fotw' / 'book.js'
    os.utime(js, (1000, 1000))
    run_importer(tmp_path, '02fotw', secs_)
    assert os.stat(js).st_mtime == 1000


def test_report_counts_and_ids(tmp_path):
    run_importer(tmp_path, '02fotw', {
        1: '<p>Start.</p>' + choice('Turn to', 2) + choice('Or turn to', 77),
        2: '<p>Stuck.</p>',
        3: '<p>Gone.</p><p class="deadend">Dead.</p>',
        4: '<img src="ill1.png"/>' + foe('Giak', 1, 1) + '<p>You must eat a Meal now.</p>' + choice('Turn to', 999)},
        plates=[{'match': 'giak', 'src': 'x.webp'}], fin=False, extra={'sect5.htm': page('<p>Last.</p>')})
    r = json.loads((tmp_path / 'data' / 'projectaon' / '02fotw' / 'import-report.json').read_text())
    assert r['book'] == '02fotw' and r['sections'] == 5
    assert r['broken_links'] == [['1', '77'], ['4', '999']]
    assert r['no_way_on'] == ['2']
    assert (r['dead_ends'], r['fights'], r['illustrated'], r['forced_meals']) == (1, 1, 1, 1)
    assert (r['enemy_kinds'], r['with_book_plate'], r['from_library'], r['with_none']) == (1, 1, 0, 0)
    assert r['map'] == 'map.png' and r['intro_paragraphs'] == 0
    assert r['gates'] == {'disc': 0, 'rank': 0, 'any': 0, 'circle': 0}


def test_report_enemies_pictured_from_the_library_or_not_at_all(tmp_path, capsys):
    run_importer(tmp_path, '02fotw', {1: foe('Giak', 1, 1) + foe('Rat', 1, 1) + foe('Bat', 1, 1)},
                 plates=[{'match': 'giak', 'src': 'a.webp'}, {'match': 'bat', 'book': '05sots', 'src': 'b.webp'}])
    r = json.loads((tmp_path / 'data' / 'projectaon' / '02fotw' / 'import-report.json').read_text())
    assert (r['enemy_kinds'], r['with_book_plate'], r['from_library'], r['with_none']) == (3, 0, 1, 2)   # Bat's entry is for another book
    out = capsys.readouterr().out
    assert 'with none: Bat, Rat (add them to assets/plates/plates.json)' in out


def test_report_gate_counts(tmp_path):
    run_importer(tmp_path, '02fotw', {
        1: choice('If you have the Kai Discipline of Hunting, turn to', 999) + choice('If you have reached the Kai rank of Guardian, turn to', 999),
        2: choice('If you have the Kai Discipline of Hunting or have reached the Kai rank of Primate, turn to', 999),
        3: choice('If you have completed the Lore-circle of Fire, turn to', 999)})
    r = json.loads((tmp_path / 'data' / 'projectaon' / '02fotw' / 'import-report.json').read_text())
    assert r['gates'] == {'disc': 1, 'rank': 1, 'any': 1, 'circle': 1}


def test_report_random_counts(tmp_path):
    bonus = ' If you have the Kai Discipline of Hunting, add 2 to the number.'
    run_importer(tmp_path, '02fotw', {
        1: random_page('', ('If your total is 0-4, turn to', 999), ('If it is 5 or more, turn to', 999)),
        2: random_page(bonus, ('If the number is 0-5, turn to', 999), ('If it is 6 or more, turn to', 999)),
        3: random_page('', ('Turn to', 999))})
    r = json.loads((tmp_path / 'data' / 'projectaon' / '02fotw' / 'import-report.json').read_text())
    assert (r['auto_random'], r['free_random'], r['random_bonuses']) == (2, 1, 1)
