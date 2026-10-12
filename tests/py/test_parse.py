"""Every Python script of ours compiles, including the tools no other test imports."""
import os

import pytest

from conftest import ROOT

SKIP = {'data', 'art', 'node_modules', 'backups', '.git', '.venv', '.venv-paddle', '.vitest', 'release',
        'realesrgan', '.claude', '__pycache__'}


def scripts():
    for top, dirs, names in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in SKIP]
        for n in names:
            if n.endswith('.py'):
                yield os.path.relpath(os.path.join(top, n), ROOT).replace('\\', '/')


@pytest.mark.parametrize('rel', sorted(scripts()))
def test_compiles(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
        compile(f.read(), rel, 'exec')
