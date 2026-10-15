"""tools/phrasings_scan.py, step 3's leftover scan (ADR 0036): a made-up book's sections, never Project
Aon's text, run through the importer's own readers."""
import json

import phrasings_scan as ps


def sec(*text, choices=(), **more):
    return {'text': list(text), 'choices': [c if isinstance(c, dict) else {'text': c, 'to': '9'} for c in choices], **more}


def foe(**more):
    return {'enemies': [{'name': 'Bog Troll', 'cs': 15, 'ep': 20}], **more}


BOOK = {'series': 'kai', 'sections': {
    # gates: one the importer reads (need set), one on a discipline it left, a negative one, one on an item
    '1': sec(choices=[{'text': 'If you have the Kai Discipline of Hunting, turn to 2.', 'to': '2', 'need': {'disc': 'hunting'}},
                      'If you have the Kai Discipline of Tracking and you have reached the Kai rank of Guardian or higher, turn to 3.',
                      'If you do not have Tracking, turn to 4.', 'If you have a Rope, turn to 5.']),
    # draws: one read, one whose bonus is a discipline not read, one changed by an item, one counting gold
    '2': sec('Pick a number from the Random Number Table.', choices=['If your total is 0-4, turn to 1.', 'If it is 5-9, turn to 3.'], rnt='auto'),
    '3': sec('Pick a number from the Random Number Table. If you have Tracking, or if you have reached the Kai rank of Guardian, then add 2.',
             choices=['If your total is now 0-6, turn to 1.', 'If your total is now 7-11, turn to 2.'], rnt='free'),
    '4': sec('Pick a number from the Random Number Table. If you are carrying a Lantern, add 2 to the number.',
             choices=['If your total is now 0-6, turn to 1.', 'If your total is now 7-11, turn to 2.'], rnt='free'),
    '5': sec('Pick a number from the Random Number Table. Add 5 to it: that is how many Gold Crowns you find.', choices=['Turn to 6.'], rnt='free'),
    '6': sec('You hear of the Random Number Table but draw nothing.', choices=['Turn to 7.']),
    # combat: an enemy line left as text, a change on a discipline not read, one for some rounds, evasion and a drain and immunity left
    '7': sec('Bandit Chief: COMBAT SKILL 18 ENDURANCE 25', choices=['If you win, turn to 8.']),
    '8': sec('If you have the Kai Discipline of Mindshield you may add 3 points to your COMBAT SKILL by a further trick of the light.',
             'You can evade combat after one round by running up the stairs.', choices=['If you win, turn to 9.'], combat=foe()),
    '9': sec('Deduct 2 points from your COMBAT SKILL for the first round of combat only.', 'You cannot evade this fight.',
             'If you do not have Mindshield, you will lose 2 ENDURANCE points for every round. It is immune to all psychic attacks.',
             choices=['If you win, turn to 10.'], combat=foe()),
    # all read: evasion, immunity, drain and the change set; nothing left
    '10': sec('Add 2 points to your COMBAT SKILL for this fight.', 'It is immune to Mindblast. You may evade after two rounds.',
              choices=[{'text': 'If you evade, turn to 1.', 'to': '1', 'evade': True}],
              combat={'enemies': [{'name': 'Wraith', 'immune': True, 'drain': 2}], 'csMod': 2, 'evade': {'after': 2, 'to': '1'}}),
}}


def test_each_leftover_is_listed_by_kind_and_the_ones_to_look_at_apart():
    out = ps.scan(BOOK)
    assert {k: v for k, v in out.items() if v} == {
        'gate': ['1'], 'gate-negative': ['1'], 'gate-item': ['1'],
        'rn-unlinked': ['6'], 'rn-bonus': ['3'], 'rn-other': ['4'], 'rn-counts': ['5'],
        'combat-line': ['7'], 'cs': ['8'], 'cs-other': ['9'], 'evade': ['8'], 'immune': ['9'], 'drain': ['9'],
    }
    text = ps.report('01xx', out)
    assert text.startswith('01xx: 6 sections to look at (1, 3, 6, 7, 8, 9)')
    assert 'Hunting' not in text and 'Bandit' not in text  # ids and kinds, never the text


def test_json_written_beside_the_book_for_the_dashboard(tmp_path, monkeypatch):
    monkeypatch.setattr(ps, 'DATA', str(tmp_path))
    (tmp_path / '01xx').mkdir()
    (tmp_path / '01xx' / 'book.js').write_text('(window.LW = window.LW || {}).BOOKS = Object.assign(window.LW.BOOKS || {}, '
                                               + json.dumps({'01xx': BOOK}) + ');\n', encoding='utf-8')
    assert ps.main(['01xx', '--json']) == 0
    got = json.loads((tmp_path / '01xx' / 'phrasings.json').read_text(encoding='utf-8'))
    assert got['look'] == [1, 3, 6, 7, 8, 9] and got['kinds']['gate-item'] == ['1']
    assert ps.main(['02xx']) == 1  # not imported
