"""tools/plates_draft.py, step 7's draft (ADRs 0008, 0036), against a temporary project tree: made-up
books, pictures and notes, never Project Aon's."""
import json

import pytest

import plates_draft as pd
import plates_file as pf

CODE = '05xx'


def fight(*enemies):
    return {'combat': {'enemies': [{'name': e} if isinstance(e, str) else {'name': e[0], 'art': e[1]} for e in enemies]}}


@pytest.fixture
def tree(tmp_path, monkeypatch):
    monkeypatch.setattr(pf, 'ROOT', str(tmp_path))
    monkeypatch.setattr(pf, 'PLATES', str(tmp_path / 'assets' / 'plates' / 'plates.json'))

    class T:
        root = tmp_path

        def file(self, rel, data=b'x'):
            f = tmp_path.joinpath(*rel.split('/'))
            f.parent.mkdir(parents=True, exist_ok=True)
            f.write_bytes(data if isinstance(data, bytes) else data.encode('utf-8'))

        def book(self, code, *sections):
            secs = {str(i + 1): s for i, s in enumerate(sections)}
            self.file(f'data/projectaon/{code}/book.js', '(window.LW = window.LW || {}).BOOKS = Object.assign(window.LW.BOOKS || {}, '
                      + json.dumps({code: {'id': code, 'sections': secs}}) + ');\n')

        def plates(self, plates=None):
            if plates is not None:
                self.file('assets/plates/plates.json', json.dumps({'_readme': 'x', 'plates': plates}))
            return json.loads(tmp_path.joinpath('assets', 'plates', 'plates.json').read_text(encoding='utf-8'))['plates']

        def index(self, idx):
            self.file('data/projectaon/ill-index.json', json.dumps(idx))
    return T()


def ill(book, fight=(), shows='', near=()):
    return {'book': book, 'fight': list(fight), 'near': list(near), 'shows': shows}


def test_kinds_are_read_from_the_names_alone():
    assert pd.kind('Vazhag pack') == ('vazhag',) and pd.kind('Plague Hound (wounded)') == ('plague', 'hound')
    assert pd.same_kind(pd.kind('Drakkarim 2'), pd.kind('Drakkar')) == 'exact'
    assert pd.same_kind(pd.kind('Vazhag'), pd.kind('Fat Vazhag')) == 'held'
    assert pd.same_kind(pd.kind('Guard'), pd.kind('Town Guard')) is None        # a lone person's word fits no longer name
    assert pd.person(pd.kind('Monks of the Sword'), set()) and not pd.person(pd.kind('Giak Officer'), {('giak',)})


def test_each_enemy_with_no_picture_gets_one_in_adr_0008s_order_and_is_written_for_the_sheet(tree):
    for f in ('ill1', 'ill2', 'ill3', 'ill4'):
        tree.file(f'data/projectaon/{CODE}/{f}.png')
    tree.file('data/projectaon/01aa/ill1.png')
    tree.file('data/projectaon/03cc/ill1.png')
    tree.file('data/projectaon/03cc/ill2.png')
    tree.file('art/plates/guard-with-halberd.png')
    tree.file('art/plates/guard-with-halberd-2x.webp')
    tree.file('assets/plates/water-snake.jpg')
    tree.book(CODE, fight(('Rat', 'ill1.png')), fight('Rats 2'), fight('Gloom Beast'), fight('Marsh Thing'), fight('Lurker'),
              fight('Town Guard'), fight('Giak Officer'), fight('Swamp Snake'), fight('Zorg'), fight('Sea Hag'))
    tree.book('01aa', fight(('Gloom Beast', 'ill1.png')))
    tree.book('03cc', fight(('Gloom Beasts', 'ill1.png')), fight(('Town Guard', 'ill2.png')), fight('Giak'), fight('Sea Hag'))
    tree.plates([{'match': '^giak$', 'src': 'data/projectaon/03cc/ill2.png', 'crop': [0, 0, 0.5, 1]},
                 {'match': '^sea hag$', 'book': '03cc', 'src': 'data/projectaon/03cc/ill1.png'}])
    tree.index({f'{CODE}/ill1.png': ill(CODE, ['Rat']), f'{CODE}/ill2.png': ill(CODE, shows='a marsh thing rising from mud'),
                f'{CODE}/ill3.png': ill(CODE, near=[{'section': 5, 'enemies': ['Lurker'], 'steps': 1}]),
                f'{CODE}/ill4.png': ill(CODE, near=[{'section': 3, 'enemies': ['Gloom Beast'], 'steps': 1}])})

    picks = {name: (plate, why) for name, plate, why in pd.draft(CODE)}
    assert 'Rat' not in picks                                                     # 1: its own picture, from the importer
    assert picks['Rats 2'] == ({'src': f'data/projectaon/{CODE}/ill1.png'}, 'this book')
    assert picks['Marsh Thing'] == ({'src': f'data/projectaon/{CODE}/ill2.png'}, 'this book')   # a note names it
    assert picks['Gloom Beast'] == ({'src': 'data/projectaon/03cc/ill1.png'}, 'Book 3')        # the nearest book's, before a guess
    assert picks['Lurker'] == ({'src': f'data/projectaon/{CODE}/ill3.png'}, 'this book, a picture 1 link before the fight')
    assert picks['Town Guard'] == ({'src': 'art/plates/guard-with-halberd.png'}, 'stand-in')   # a person: a stand-in first (ADR 0008)
    assert picks['Giak Officer'] == ({'src': 'data/projectaon/03cc/ill2.png', 'crop': [0, 0, 0.5, 1]}, 'Book 3')  # a Giak, cropped as shown
    assert picks['Swamp Snake'] == ({'src': 'assets/plates/water-snake.jpg'}, 'stand-in')
    assert picks['Zorg'] == (None, None)
    assert picks['Sea Hag'] == ({'src': 'data/projectaon/03cc/ill1.png'}, 'Book 3')   # another book's entry for her

    assert pd.main([CODE]) == 0
    mine = [p for p in tree.plates() if p.get('book') == CODE]
    assert len(mine) == 8 and tree.plates()[-2]['match'] == '^giak$'               # at the top, the others kept after them
    rats = next(p for p in mine if p['match'] == pf.anchored('Rats 2'))
    assert rats == {'match': '^rats 2$', 'book': CODE, 'src': f'data/projectaon/{CODE}/ill1.png', 'draft': 'this book'}
    assert pd.draft(CODE) == [('Zorg', None, None)]                               # run again: only what is still bare


def test_dry_run_writes_nothing_and_compare_drafts_a_set_book_afresh(tree, capsys):
    tree.file(f'data/projectaon/{CODE}/ill1.png')
    tree.file('art/plates/rogue-masked.png')
    tree.book(CODE, fight(('Beast', 'ill1.png')), fight('Beast 2'), fight('Bandit'))
    tree.plates([{'match': '^beast 2$', 'book': CODE, 'src': f'data/projectaon/{CODE}/ill1.png'},
                 {'match': '^bandit$', 'book': CODE, 'src': 'art/plates/rogue-masked.png', 'crop': [0, 0, 1, 0.5]}])
    tree.index({})
    assert pd.main([CODE, '--dry']) == 0 and 'every enemy has a picture already' in capsys.readouterr().out
    assert pd.main([CODE, '--compare']) == 0
    assert '2 enemies pictured by its own plates.json entries; drafted afresh: 2 the same picture, 0 another, 0 none' in capsys.readouterr().out
    assert len(tree.plates()) == 2


def test_the_owner_adjusting_a_pick_on_the_sheet_makes_it_theirs(tree):
    tree.file(f'data/projectaon/{CODE}/ill1.png')
    book = {'sections': {'1': fight('Beast')}}
    tree.plates([{'match': '^beast$', 'book': CODE, 'src': f'data/projectaon/{CODE}/ill1.png', 'draft': 'this book'}])
    entry, _ = pf.put(CODE, book, 'Beast', crop=[0.1, 0.1, 0.5, 0.5])
    assert 'draft' not in entry and tree.plates() == [entry]
    pf.put(CODE, book, 'Beast', remove=True)
    assert tree.plates() == []
