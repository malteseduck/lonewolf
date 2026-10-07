"""Upscale a printed map with Real-ESRGAN, then size it and save it.

Run (from the project root):
  uv run --no-project --python tools/.venv/Scripts/python.exe python tools/map_upscale.py <in> <out> [--width 3840]

Runs realesrgan-x4plus (tools/realesrgan/, git-ignored) in 4x passes until the image is at least
--width wide, then LANCZOS down to exactly --width. An <out> ending .webp is saved lossy at quality
90 (Book 4 at 4K: 1.3 MB, against 10.9 MB as PNG); anything else is saved lossless.
The procedure around it is in docs/reference/map-upscale.md.
"""
import argparse
import subprocess
import tempfile
import time
from pathlib import Path

from PIL import Image

Image.MAX_IMAGE_PIXELS = None  # a second 4x pass is 16384 px wide
HERE = Path(__file__).parent / 'realesrgan'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('out')
    ap.add_argument('--width', type=int, default=3840)
    a = ap.parse_args()
    cur, out = Path(a.src), Path(a.out)
    w = Image.open(cur).width
    with tempfile.TemporaryDirectory() as tmp:
        n = 0
        while w < a.width:
            nxt = Path(tmp) / f'pass{n}.png'
            t = time.time()
            subprocess.run([str(HERE / 'realesrgan-ncnn-vulkan.exe'), '-i', str(cur), '-o', str(nxt),
                            '-n', 'realesrgan-x4plus', '-m', str(HERE / 'models')], check=True, capture_output=True)
            print(f'pass {n + 1}: {time.time() - t:.0f} s')
            cur, w, n = nxt, w * 4, n + 1
        im = Image.open(cur).convert('RGB')
        im = im.resize((a.width, round(im.height * a.width / im.width)), Image.LANCZOS)
        if out.suffix.lower() == '.webp':
            im.save(out, quality=90, method=6)
        else:
            im.save(out, optimize=True)
    print(f'{out}: {im.width}x{im.height}, {out.stat().st_size} bytes')


if __name__ == '__main__':
    main()
