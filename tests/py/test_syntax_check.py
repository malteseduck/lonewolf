"""tools/syntax_check.py over stand-in scripts in tmp_path (its ROOT is pointed there). Needs node."""
import os
import shutil
import sys

import pytest

import syntax_check as sc

needs_node = pytest.mark.skipif(shutil.which('node') is None, reason='node is not installed')


def put(root, rel, text='x'):
    p = os.path.join(root, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(text)


@pytest.fixture
def tree(tmp_path, monkeypatch):
    monkeypatch.setattr(sc, 'ROOT', str(tmp_path))
    return str(tmp_path)


def run(capsys):
    code = sc.main()
    return code, capsys.readouterr().out.splitlines()


def test_files_walks_scripts_and_skips_the_ignored_folders(tree):
    for rel in ['a.js', 'b.mjs', 'c.py', 'd.txt', 'e.json', 'sub/f.js', 'tools/g.py',
                'data/x.js', 'art/x.js', 'node_modules/x.js', 'backups/x.py', '.git/x.js', '.venv/x.py',
                '.venv-paddle/x.py', 'tools/__pycache__/x.py', 'realesrgan/x.py', '.claude/x.js', 'sub/data/y.js']:
        put(tree, rel)
    got = {os.path.relpath(p, tree).replace('\\', '/') for p in sc.files()}
    # SKIP is by folder name at any depth
    assert got == {'a.js', 'b.mjs', 'c.py', 'sub/f.js', 'tools/g.py'}


@pytest.mark.parametrize('text,is_module', [
    ('import x from "./a.js";', True),
    ('import {a, b} from "./a.js";', True),
    ('import * as a from "./a.js"', True),
    ('import "./side.js";', True),
    ("import './side.js'", True),
    ('import("./dyn.js")', True),  # the pattern takes import( at a line start as a module too
    ('export const a = 1;', True),
    ('export default function(){}', True),
    ('  import x\n  from "./a.js"', True),
    ('const a = 1; // import x from "y"', False),
    ('var s = "export";', False),
    ('function f(){ return 1 }', False),
    ('x.import = 1', False),
    ('important = 2', False),
    ('exports.a = 1', False),
])
def test_module_pattern(text, is_module):
    assert bool(sc.MODULE.search(text)) is is_module


def test_clean_tree_passes(tree, capsys):
    put(tree, 'ok.py', 'x = 1\n')
    code, out = run(capsys)
    assert code == 0 and out == ['1 files checked, 0 failed']


@needs_node
def test_clean_scripts_pass(tree, capsys):
    put(tree, 'classic.js', 'var a = 1; function f() { return a }')
    put(tree, 'mod.js', 'import x from "./other.js"; export const y = x;')
    put(tree, 'm.mjs', 'export const z = 1')
    put(tree, 'ok.py', 'print(1)')
    code, out = run(capsys)
    assert code == 0 and out == ['4 files checked, 0 failed']


def test_python_syntax_error_is_named_with_its_file_and_reason(tree, capsys):
    put(tree, 'good.py', 'x = 1')
    put(tree, 'sub/bad.py', 'def f(:\n    pass\n')
    code, out = run(capsys)
    assert code == 1
    assert out[0].startswith('sub/bad.py: ') and 'SyntaxError' in out[0]
    assert out[-1] == '2 files checked, 1 failed'


def test_python_check_leaves_no_pyc_beside_the_source(tree, capsys):
    put(tree, 'good.py', 'x = 1')
    run(capsys)
    assert os.listdir(tree) == ['good.py']


@needs_node
def test_js_syntax_error(tree, capsys):
    put(tree, 'bad.js', 'function (')
    code, out = run(capsys)
    assert code == 1 and out[0].startswith('bad.js: ') and 'SyntaxError' in out[0]
    assert out[-1] == '1 files checked, 1 failed'


@needs_node
def test_mjs_syntax_error_is_reported_under_its_own_name(tree, capsys):
    put(tree, 'sub/bad.mjs', 'export const = 1')
    code, out = run(capsys)
    assert code == 1 and out[0].startswith('sub/bad.mjs: ')
    assert '(sub/bad.mjs' in out[0]  # the temporary path is replaced by the real one


@needs_node
def test_duplicate_const_in_an_es_module_is_caught(tree, capsys):
    # plain `node --check` on a root .js reads it as CommonJS and misses this (AGENTS.md)
    put(tree, 'main.js', 'import x from "./y.js";\nconst a = 1;\nconst a = 2;\n')
    code, out = run(capsys)
    assert code == 1
    assert out[0].startswith('main.js: ') and "already been declared" in out[0]
    assert '(main.js' in out[0] and tree not in out[0] and '.mjs' not in out[0].split('(')[0]


@needs_node
def test_a_classic_script_is_checked_where_it_is(tree, capsys):
    put(tree, 'shared/x.js', 'var a = 1;\nvar a = 2;\nlet = ;')
    code, out = run(capsys)
    assert code == 1 and out[0].startswith('shared/x.js: ')


@needs_node
def test_every_failure_is_listed_and_counted(tree, capsys):
    put(tree, 'a.js', 'function (')
    put(tree, 'b.py', 'def (')
    put(tree, 'c.js', 'ok = 1')
    code, out = run(capsys)
    assert code == 1 and len(out) == 3 and out[-1] == '3 files checked, 2 failed'
    assert sorted(l.split(':')[0] for l in out[:2]) == ['a.js', 'b.py']


def test_without_node_scripts_are_flagged_but_python_still_checked(tree, capsys, monkeypatch):
    monkeypatch.setattr(sc.shutil, 'which', lambda name: None)
    put(tree, 'a.js', 'ok = 1')
    put(tree, 'b.mjs', 'ok = 1')
    put(tree, 'c.py', 'x = 1')
    code, out = run(capsys)
    assert code == 1
    assert sorted(out[:2]) == ['a.js: node not found', 'b.mjs: node not found']
    assert out[-1] == '3 files checked, 2 failed'


def test_non_ascii_source_does_not_break_the_report(tree, capsys):
    put(tree, 'bad.py', '# café ☃\ndef (:\n')
    code, out = run(capsys)
    assert code == 1 and out[0].startswith('bad.py: ')
