"""The tools are plain scripts in tools/, not a package: put tools/ on the path so a test can import
one by name (import plates_file). A tool that writes into the repository is pointed at a temporary
copy with monkeypatch (its ROOT, or the path constants it builds from ROOT), never at the real files."""
import os
import sys

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'tools'))


@pytest.fixture(autouse=True)
def _art_sources_apart(tmp_path, monkeypatch):
    """art/sources.json is real and committed: tools that write it (plates_file, serve, setup) meet a temporary one."""
    import art_sources
    monkeypatch.setattr(art_sources, 'ROOT', str(tmp_path))
