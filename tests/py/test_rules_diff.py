"""tools/rules_diff.py, step 4's rules diff (ADR 0036): two made-up books' rules pages, never Project
Aon's text, compared page by page, and the skeleton addendum read from them."""
import json

import rules_diff as rd


def page(*blocks):
    return '<html><body><article>' + ''.join(blocks) + '<p id="page-navigation">Back</p></article></body></html>'


OLD = {
    'gamerulz.htm': page('<h3>Rules</h3>', '<p>You are a hero of the realm.</p>',
                         '<p>Pick a number from the Random Number Table and add ten to it for your fighting score.</p>'),
    'equipmnt.htm': page('<h3>Gear</h3>', '<p>The pouch holds gold. Pick a number from the Random Number Table. Add 10 to the number '
                         'you have picked. The total is the number of Gold Crowns you start with.</p>',
                         '<p>You may take six of the following.</p>', '<ul><li>Sword (Weapons)</li><li>Rope (Backpack Items)</li></ul>',
                         '<p>List the six items that you choose on your Action Chart.</p>'),
    'lorecrcl.htm': page('<p>The circles of lore.</p>'),
    'footnotz.htm': page('<p><a href="sect7.htm#sect7-1">7</a> A ruling.</p>'),
}
NEW = {
    'gamerulz.htm': page('<h3>Rules</h3>', '<p>You are a hero of the realm.</p>',
                         '<p>Pick a number from the Random Number Table and add twenty-five to it for your fighting score.</p>',
                         '<p>A wholly new paragraph about the dark.</p>'),
    'equipmnt.htm': page('<h3>Gear</h3>', '<p>The pouch holds gold. Pick a number from the Random Number Table. Add 20 to the number '
                         'you have picked. The total is the number of Gold Crowns you start with.</p>',
                         '<p>You may take five of the following.</p>',
                         '<ul><li>Sword (Weapons)</li><li>Bow (Weapons)</li><li>4 Meals (Meals) Each fills a space.</li></ul>',
                         '<p>List the five items that you choose on your Action Chart.</p>'),
    'imprvdsc.htm': page('<p>Improved powers.</p>'),
    'footnotz.htm': page('<p><a href="sect15.htm#sect15-1">15</a> One.</p>', '<p><a href="sect48.htm#sect48-1">48</a> Two, and '
                         '<a href="sect48.htm">48</a> again.</p>'),
}


def write(tmp_path, code, pages):
    (tmp_path / code).mkdir()
    for name, html in pages.items():
        (tmp_path / code / name).write_text(html, encoding='utf-8')


def test_each_page_is_compared_paragraph_by_paragraph_with_the_numbers_that_moved(tmp_path, monkeypatch):
    monkeypatch.setattr(rd, 'DATA', str(tmp_path))
    write(tmp_path, '01aa', OLD)
    write(tmp_path, '02bb', NEW)
    out = rd.diff('02bb', '01aa')
    g = out['pages']['gamerulz.htm']
    assert g['state'] == 'changed' and g['same'] == 2 and g['new'] == [4] and g['gone'] == []
    assert g['changed'] == [{'p': 3, 'was': ['10'], 'now': ['25']}]
    e = out['pages']['equipmnt.htm']
    assert [c['p'] for c in e['changed']] == [2, 3, 7] and e['changed'][0] == {'p': 2, 'was': ['10'], 'now': ['20']}
    assert e['new'] == [5, 6] and e['gone'] == [5]  # Bow and the Meals are new, Rope gone (its number on the old page)
    assert out['pages']['lorecrcl.htm']['state'] == 'gone' and out['pages']['imprvdsc.htm']['state'] == 'new'
    assert out['look'] == 1 + 1 + 3 + 2 + 1  # gamerulz changed and new, equipmnt changed and new, imprvdsc's one paragraph
    # the skeleton: only what reads with certainty
    k = out['draft']
    assert k['gold'] == 20 and k['choose'] == 5 and k['kit'] == ['Sword', 'Bow', '4 Meals'] and k['footnotes'] == [15, 48]
    text = rd.report(out)
    assert text.startswith('02bb against 01aa: 8 paragraphs to read')
    assert 'hero' not in text and 'Sword' not in text  # page names, paragraph numbers and figures, never the text


def test_json_draft_and_reading_copy_written_beside_the_book(tmp_path, monkeypatch):
    monkeypatch.setattr(rd, 'DATA', str(tmp_path))
    monkeypatch.setattr(rd, 'CATALOGUE', [('01aa', 'The First'), ('02bb', 'The Second')])
    write(tmp_path, '01aa', OLD)
    write(tmp_path, '02bb', NEW)
    assert rd.main(['02bb', '--json']) == 0
    got = json.loads((tmp_path / '02bb' / 'rules-diff.json').read_text(encoding='utf-8'))
    assert got['against'] == '01aa' and got['look'] == 8 and got['newPages'] == ['imprvdsc.htm'] and got['gonePages'] == ['lorecrcl.htm']
    draft = (tmp_path / '02bb' / 'rules-draft.md').read_text(encoding='utf-8')
    assert draft.startswith('### Book 2, The Second (Kai)')
    assert '**Gold**: 20 + a Random Number' in draft and 'Choose any **5** of: Sword, Bow, 4 Meals' in draft and 'todo' in draft
    copy = (tmp_path / '02bb' / 'rules-diff.txt').read_text(encoding='utf-8')
    assert 'wholly new paragraph' in copy and 'add ten to it' in copy  # the text, for the agent to read, stays beside the book
    # the first book has nothing before it: every page new; a book with no rules pages is an error
    assert rd.main(['01aa']) == 0
    assert rd.main(['03cc']) == 1
