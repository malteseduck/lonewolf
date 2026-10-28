"""tools/docs_check.py: the decision records, their index and citations, and AGENTS.md kept true."""
import pytest

import docs_check as dc

AGENTS = """# X

## How to run
`tools/serve.py`

## How to test

## Hard rules

## Maintaining the repository
"""
ADR = """# 0001. A decision

- Status: Accepted
- Date: 2026-01-01
- Amended: 2026-01-03

## Context

Once `tools/gone.py` did it.

## Decision

Use `tools/serve.py`.

## Consequences

## Changes

- 2026-01-02: first.
- 2026-01-03: second.
"""
INDEX = """# Decision records

| # | Decision | Amended |
|---|---|---|
| [0001](0001-a-decision.md) | A decision | 2026-01-03 |

### Rulings

game rules (R1-R2). The next free id is R3.
"""
RULINGS = """| Id | Ruling | Date |
|---|---|---|
| R1 | One. | 2026-01-01 |
| R2 | Two. | 2026-01-01 |
"""


@pytest.fixture
def tree(tmp_path, monkeypatch):
    monkeypatch.setattr(dc, 'ROOT', str(tmp_path))
    files = {'AGENTS.md': AGENTS, 'docs/spec.md': 'Intent (ruling R1, ADR 0001).\n',
             'docs/adr/README.md': INDEX, 'docs/adr/rulings.md': RULINGS,
             'docs/adr/0001-a-decision.md': ADR, 'tools/serve.py': '# ruling R2\n'}

    def write(rel, text):
        p = tmp_path / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding='utf-8')
    for rel, text in files.items():
        write(rel, text)

    def run():
        return dc.main([]), None
    run.write = write
    return run


def problems(capsys, tree):
    code, _ = tree()
    lines = capsys.readouterr().out.strip().splitlines()
    return code, lines[:-1]


def test_consistent_docs_pass(tree, capsys):
    assert problems(capsys, tree) == (0, [])


def test_a_ruling_id_used_twice_and_one_missing_from_the_index(tree, capsys):
    tree.write('docs/adr/rulings.md', RULINGS + '| R2 | Again. | 2026-01-02 |\n| R3 | Three. | 2026-01-02 |\n')
    code, out = problems(capsys, tree)
    assert code == 1
    assert 'rulings.md: R2 is used twice' in out
    assert 'adr/README.md: the Rulings line does not list R3' in out
    assert 'adr/README.md: says the next free id is R3, it is R4' in out


def test_an_amendment_not_carried_to_the_index_or_the_amended_line(tree, capsys):
    tree.write('docs/adr/0001-a-decision.md', ADR + '- 2026-01-09: third.\n')
    code, out = problems(capsys, tree)
    assert code == 1
    assert any('latest change is 2026-01-09' in p for p in out)


def test_a_citation_of_a_record_that_does_not_exist(tree, capsys):
    tree.write('main.js', '// rulings R1, R9 and ADR 0042\n')
    code, out = problems(capsys, tree)
    assert 'main.js: cites ruling R9, which does not exist' in out
    assert 'main.js: cites ADR 0042, which does not exist' in out


def test_a_path_named_in_a_decision_must_exist_but_history_may_name_old_ones(tree, capsys):
    assert problems(capsys, tree)[0] == 0  # tools/gone.py is in Context only
    tree.write('docs/spec.md', 'See `tools/missing.py` and `data/projectaon/x/`.\n')
    code, out = problems(capsys, tree)
    assert out == ['docs/spec.md: names `tools/missing.py`, which does not exist']


def test_agents_md_needs_its_sections_and_holds_no_dates(tree, capsys):
    tree.write('AGENTS.md', '# X\n\n## How to run\n\nBook 13 imported on 2026-10-10.\n')
    code, out = problems(capsys, tree)
    assert 'AGENTS.md: no "## How to test" section' in out
    assert 'AGENTS.md: holds a date (2026-10-10); state belongs in the docs it points to' in out


def test_a_folders_agents_md_is_imported_names_real_paths_and_holds_no_dates(tree, capsys):
    tree.write('items/AGENTS.md', 'Run `tools/serve.py`, then `check.mjs` and `tools/gone.py`.\n')
    tree.write('items/check.mjs', '')
    tree.write('maps/AGENTS.md', 'Labels fixed on 2026-10-07.\n')
    tree.write('maps/CLAUDE.md', '@AGENTS.md\n')
    code, out = problems(capsys, tree)
    assert sorted(out) == [
        'items/AGENTS.md: names `tools/gone.py`, which does not exist',
        'items/AGENTS.md: no CLAUDE.md beside it importing it (@AGENTS.md)',
        'maps/AGENTS.md: holds a date (2026-10-07); state belongs in the docs it points to']


def test_every_asset_is_credited_in_its_folders_readme(tree, capsys):
    tree.write('tools/fonts/README.txt', 'Darkland Hand (DarklandHand-Thin, -Regular): ours.\n')
    for f in ('DarklandHand-Thin.ttf', 'DarklandHand-Regular.ttf', 'OFL-DarklandHand.txt', 'Cabin.ttf'):
        tree.write(f'tools/fonts/{f}', '')
    tree.write('assets/plates/README.txt', 'wolf.jpg\n  An engraving.\n\n01xx/toad.webp\n  Made with AI.\n')
    for f in ('wolf.jpg', 'wolf-2x.webp', '01xx/toad.webp', 'plates.json', 'approved/01xx.json', 'bear.png'):
        tree.write(f'assets/plates/{f}', '')
    tree.write('assets/plates/AGENTS.md', 'Rules.\n')
    tree.write('assets/plates/CLAUDE.md', '@AGENTS.md\n')
    code, out = problems(capsys, tree)
    assert sorted(out) == ['assets/plates/README.txt: does not credit bear.png',
                           'tools/fonts/README.txt: does not credit Cabin.ttf']


def test_a_readmes_links_are_relative_to_it(tree, capsys):
    tree.write('docs/showcase/make/map.py', '')
    tree.write('docs/showcase/README.md', 'See [`make/map.py`](make/map.py) and `make/gone.py`.\n')
    code, out = problems(capsys, tree)
    assert out == ['docs/showcase/README.md: names `make/gone.py`, which does not exist']
