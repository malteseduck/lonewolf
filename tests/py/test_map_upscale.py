"""map_upscale.py: Real-ESRGAN passes until wide enough, then LANCZOS to the exact width.
subprocess.run is replaced by a stand-in that 4x-enlarges the picture, so Real-ESRGAN never runs."""
import subprocess
import sys

import pytest
from PIL import Image

import map_upscale


@pytest.fixture
def esrgan(monkeypatch):
    """Replace the Real-ESRGAN call; record each command line."""
    calls = []

    def fake_run(cmd, check, capture_output):
        calls.append(cmd)
        src, dst = cmd[cmd.index('-i') + 1], cmd[cmd.index('-o') + 1]
        im = Image.open(src)
        im.resize((im.width * 4, im.height * 4), Image.NEAREST).save(dst)

    monkeypatch.setattr(subprocess, 'run', fake_run)
    return calls


def make(tmp_path, w=20, h=10, mode='RGB', name='in.png'):
    p = tmp_path / name
    Image.new(mode, (w, h), (200, 100, 50) if mode == 'RGB' else 128).save(p)
    return p


def run(monkeypatch, *args):
    monkeypatch.setattr(sys, 'argv', ['map_upscale.py', *map(str, args)])
    map_upscale.main()


def test_one_pass_then_lanczos_down_to_the_exact_width(tmp_path, monkeypatch, esrgan, capsys):
    src, out = make(tmp_path), tmp_path / 'out.png'
    run(monkeypatch, src, out, '--width', 60)      # 20 -> 80 by one pass -> 60
    assert len(esrgan) == 1
    assert Image.open(out).size == (60, 30)        # height follows the aspect ratio
    assert 'pass 1:' in capsys.readouterr().out


def test_passes_repeat_until_the_picture_is_wide_enough(tmp_path, monkeypatch, esrgan):
    src, out = make(tmp_path), tmp_path / 'out.png'
    run(monkeypatch, src, out, '--width', 200)     # 20 -> 80 -> 320 -> 200
    assert len(esrgan) == 2
    assert Image.open(out).width == 200
    # the second pass reads the first pass's output, not the original
    assert esrgan[1][esrgan[1].index('-i') + 1] == esrgan[0][esrgan[0].index('-o') + 1]


def test_webp_output_is_lossy_webp(tmp_path, monkeypatch, esrgan):
    src, out = make(tmp_path), tmp_path / 'out.webp'
    run(monkeypatch, src, out, '--width', 60)
    im = Image.open(out)
    assert im.format == 'WEBP' and im.size == (60, 30)


def test_a_failed_pass_stops_the_run_and_leaves_no_output(tmp_path, monkeypatch):
    def boom(cmd, check, capture_output):
        raise subprocess.CalledProcessError(1, cmd)

    monkeypatch.setattr(subprocess, 'run', boom)
    src, out = make(tmp_path), tmp_path / 'out.png'
    with pytest.raises(subprocess.CalledProcessError):
        run(monkeypatch, src, out, '--width', 60)
    assert not out.exists()


