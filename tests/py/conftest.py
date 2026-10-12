"""The tools are plain scripts in tools/, not a package: put tools/ on the path so a test can import
one by name (import plates_file). A tool that writes into the repository is pointed at a temporary
copy with monkeypatch (its ROOT, or the path constants it builds from ROOT), never at the real files."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
