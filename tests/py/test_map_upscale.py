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


def test_exactly_four_times_the_width_is_one_pass_and_no_shrink(tmp_path, monkeypatch, esrgan):
    src, out = make(tmp_path), tmp_path / 'out.png'
    run(monkeypatch, src, out, '--width', 80)
    assert len(esrgan) == 1
    assert Image.open(out).size == (80, 40)


def test_already_wide_enough_runs_no_pass_and_just_resizes(tmp_path, monkeypatch, esrgan):
    src, out = make(tmp_path, 100, 50), tmp_path / 'out.png'
    run(monkeypatch, src, out, '--width', 40)
    assert esrgan == []
    assert Image.open(out).size == (40, 20)


def test_width_equal_to_the_source_runs_no_pass(tmp_path, monkeypatch, esrgan):
    src, out = make(tmp_path, 40, 40), tmp_path / 'out.png'
    run(monkeypatch, src, out, '--width', 40)
    assert esrgan == []
    assert Image.open(out).size == (40, 40)


def test_height_is_rounded_from_the_aspect_ratio(tmp_path, monkeypatch, esrgan):
    src, out = make(tmp_path, 30, 20), tmp_path / 'out.png'
    run(monkeypatch, src, out, '--width', 50)      # 30 -> 120 -> 50: 80 * 50/120 = 33.33
    assert Image.open(out).size == (50, 33)


def test_default_width_is_3840(tmp_path, monkeypatch, esrgan):
    src, out = make(tmp_path, 1000, 10), tmp_path / 'out.png'
    # 1000 -> 4000 in one pass, then down to 3840; the stand-in makes a 4000x40 picture quickly
    run(monkeypatch, src, out)
    assert Image.open(out).width == 3840
    assert len(esrgan) == 1


def test_the_command_names_the_model_and_the_realesrgan_folder(tmp_path, monkeypatch, esrgan):
    src, out = make(tmp_path), tmp_path / 'out.png'
    run(monkeypatch, src, out, '--width', 60)
    cmd = esrgan[0]
    assert cmd[0].endswith('realesrgan-ncnn-vulkan.exe')
    assert cmd[cmd.index('-n') + 1] == 'realesrgan-x4plus'
    assert cmd[cmd.index('-m') + 1].endswith('models')
    assert cmd[cmd.index('-i') + 1] == str(src)
    assert map_upscale.HERE.name == 'realesrgan' and map_upscale.HERE.parent.name == 'tools'


def test_webp_output_is_lossy_webp(tmp_path, monkeypatch, esrgan):
    src, out = make(tmp_path), tmp_path / 'out.webp'
    run(monkeypatch, src, out, '--width', 60)
    im = Image.open(out)
    assert im.format == 'WEBP' and im.size == (60, 30)


def test_other_suffixes_are_saved_lossless(tmp_path, monkeypatch, esrgan):
    src = make(tmp_path)
    out = tmp_path / 'out.png'
    run(monkeypatch, src, out, '--width', 60)
    im = Image.open(out)
    assert im.format == 'PNG'
    assert im.convert('RGB').getpixel((10, 10)) == (200, 100, 50)   # flat colour survives the resize


def test_suffix_check_is_case_insensitive(tmp_path, monkeypatch, esrgan):
    src, out = make(tmp_path), tmp_path / 'out.WEBP'
    run(monkeypatch, src, out, '--width', 60)
    assert Image.open(out).format == 'WEBP'


def test_output_is_rgb_even_from_a_grey_or_palette_source(tmp_path, monkeypatch, esrgan):
    src, out = make(tmp_path, mode='L'), tmp_path / 'out.png'
    run(monkeypatch, src, out, '--width', 60)
    assert Image.open(out).mode == 'RGB'


def test_summary_line_gives_size_and_bytes(tmp_path, monkeypatch, esrgan, capsys):
    src, out = make(tmp_path), tmp_path / 'out.png'
    run(monkeypatch, src, out, '--width', 60)
    last = capsys.readouterr().out.strip().splitlines()[-1]
    assert last == f'{out}: 60x30, {out.stat().st_size} bytes'


def test_a_failed_pass_stops_the_run_and_leaves_no_output(tmp_path, monkeypatch):
    def boom(cmd, check, capture_output):
        raise subprocess.CalledProcessError(1, cmd)

    monkeypatch.setattr(subprocess, 'run', boom)
    src, out = make(tmp_path), tmp_path / 'out.png'
    with pytest.raises(subprocess.CalledProcessError):
        run(monkeypatch, src, out, '--width', 60)
    assert not out.exists()


def test_the_decompression_bomb_limit_is_lifted():
    assert Image.MAX_IMAGE_PIXELS is None
