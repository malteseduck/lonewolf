"""Packs the Widman map symbols into one sprite sheet for maps.js.

    python tools/build_map_atlas.py <folder of the "Widman Cartography Brushes 2.1 PNG Pack">

Widman is K. M. Alexander's CC0 brush set from a 1680 atlas: https://kmalexander.com (free).
Writes assets/map/widman.png and assets/map/widman.json ({kind: [[x, y, w, h], ...]}).
One sheet because the local server takes seconds to hand out hundreds of small files.
Standard library only, so the PNG reading and writing is done here by hand (8-bit RGBA only).
"""
import json, os, struct, sys, zlib

KINDS = {  # kind -> folder in the pack
    'mountain': r'Landforms/Mountains',
    'range': r'Landforms/Mountain Range',
    'forest': r'Trees/Forest',
    'tree': r'Trees/Individual Trees',
    'city': r'Settlements/Cities',
    'town': r'Settlements/Towns',
    'village': r'Settlements/Villages',
    'fort': r'Settlements/Forts',
    'walled': r'Settlements/Fortified Cities',
    'bridge': r'Settlements/River Crossings/East West River',
}
WIDTH = 2048


def read_png(path):
    with open(path, 'rb') as f:
        data = f.read()
    pos, idat, w = 8, b'', 0
    while pos < len(data):
        n, kind = struct.unpack('>I4s', data[pos:pos + 8])
        body = data[pos + 8:pos + 8 + n]
        if kind == b'IHDR':
            w, h, depth, ctype, _, _, interlace = struct.unpack('>IIBBBBB', body)
            assert depth == 8 and ctype == 6 and not interlace, (path, depth, ctype, interlace)
        elif kind == b'IDAT':
            idat += body
        pos += 12 + n
    raw, stride, rows, prev = zlib.decompress(idat), w * 4, [], bytearray(w * 4)
    for y in range(h):
        ft, line = raw[y * (stride + 1)], bytearray(raw[y * (stride + 1) + 1:(y + 1) * (stride + 1)])
        for i in range(stride):
            a = line[i - 4] if i >= 4 else 0
            b = prev[i]
            c = prev[i - 4] if i >= 4 else 0
            if ft == 1: line[i] = (line[i] + a) & 255
            elif ft == 2: line[i] = (line[i] + b) & 255
            elif ft == 3: line[i] = (line[i] + (a + b) // 2) & 255
            elif ft == 4:
                p = a + b - c; pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[i] = (line[i] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rows.append(line); prev = line
    return w, h, rows


def write_png(path, w, h, rows):
    raw = b''.join(b'\0' + bytes(r) for r in rows)
    chunk = lambda k, b: struct.pack('>I', len(b)) + k + b + struct.pack('>I', zlib.crc32(k + b) & 0xffffffff)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
                + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))


def main(src):
    if os.name == 'nt':
        src = '\\\\?\\' + os.path.abspath(src)  # the pack's paths run past Windows' 260 characters
    sprites = []
    for kind, folder in KINDS.items():
        d = os.path.join(src, *folder.split('/'))
        for f in sorted(x for x in os.listdir(d) if x.lower().endswith('.png')):
            sprites.append((kind,) + read_png(os.path.join(d, f)))
    # shelf packing, tallest first, one pixel apart
    order = sorted(range(len(sprites)), key=lambda i: -sprites[i][2])
    x = y = shelf = 0
    place = {}
    for i in order:
        _, w, h, _ = sprites[i]
        if x + w > WIDTH:
            x, y, shelf = 0, y + shelf + 1, 0
        place[i] = (x, y); x += w + 1; shelf = max(shelf, h)
    H = y + shelf
    sheet = [bytearray(WIDTH * 4) for _ in range(H)]
    index = {}
    for i, (kind, w, h, rows) in enumerate(sprites):
        px, py = place[i]
        for r in range(h):
            sheet[py + r][px * 4:(px + w) * 4] = rows[r]
        index.setdefault(kind, []).append([px, py, w, h])
    out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'map')
    os.makedirs(out, exist_ok=True)
    write_png(os.path.join(out, 'widman.png'), WIDTH, H, sheet)
    with open(os.path.join(out, 'widman.json'), 'w') as f:
        json.dump(index, f, separators=(',', ':'))
    print(f'{len(sprites)} symbols in {WIDTH}x{H}:', {k: len(v) for k, v in index.items()})


if __name__ == '__main__':
    main(sys.argv[1])
