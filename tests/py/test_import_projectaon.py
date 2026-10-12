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




# plain / lines / sentences
def test_plain_strips_tags_entities_and_footnote_marks(kai):
    p = kai['plain']
    assert p('<i>Hello</i>&nbsp;  &amp; <b>bye</b>\n now') == 'Hello & bye now'
    assert p('Word<sup> <a href="#s1-foot" id="x">1</a> </sup> after') == 'Word after'
    # a superscript that is not a footnote mark keeps its text
    assert p('x<sup>2</sup>') == 'x2'








# disc_list




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


def test_gate_treats_a_contraction_as_negative(kai):
    assert kai['gate']("If you haven't the Kai Discipline of Hunting, turn to 5.") is None






# as_int / span


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




# number_rules / reach




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


def test_number_rules_reads_however_if(kai):
    assert kai['number_rules']('However, if you have the Kai Discipline of Hunting, add 1 to the number.') == [
        {'disc': ['hunting'], 'plus': 1}]
















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




def test_mind_drain_unless_shielded(tmp_path):
    s = secs(tmp_path, {1: '<p>Unless you possess the Kai Discipline of Mindshield, deduct 2 ENDURANCE points every round.</p>'
                        + foe('Rat', 1, 1) + foe('Bat', 1, 1)})
    assert [e['drain'] for e in s['1']['combat']['enemies']] == [2, 2]




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








def test_a_contest_in_target_points_is_a_combat_on_points(tmp_path):
    # "ENDURANCE (TARGET points) 50": a contest scored in points on each side, his Endurance untouched
    s = secs(tmp_path, {
        1: '<p>The final.</p><p class="combat">Archer: <span class="cs">COMBAT SKILL</span> 28 '
           '<span class="ep">ENDURANCE</span> (TARGET points) 50</p>' + choice('If you win, turn to', 2),
        2: '<p>.</p>'})
    c = s['1']['combat']
    assert c['enemies'][0]['name'] == 'Archer' and c['enemies'][0]['cs'] == 28 and c['enemies'][0]['ep'] == 50
    assert c['points'] == {'n': 50}
