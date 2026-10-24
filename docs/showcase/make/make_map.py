"""Makes up a fantasy map (the Emberlands), painted procedurally to read as an aged hand-drawn map, plus the
stages of the repaint process. Nothing here comes from any book. Usage: mapgen2.py <outdir>"""
import sys, os, math
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
FONTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "tools", "fonts")
W, H = 3200, 2400
R = np.random.default_rng(21)


def noise(w, h, cells, seed):
    r = np.random.default_rng(seed)
    g = r.random((cells[1] + 3, cells[0] + 3)).astype(np.float32)
    return cv2.resize(g, (w, h), interpolation=cv2.INTER_CUBIC)


def fbm(w, h, base, octaves, seed):
    out = np.zeros((h, w), np.float32); amp = 1.0; tot = 0
    for o in range(octaves):
        c = (base * 2 ** o, max(1, int(base * 2 ** o * h / w)))
        out += amp * noise(w, h, c, seed + o); tot += amp; amp *= 0.5
    return out / tot


# ---------------------------------------------------------------- terrain
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
# warp the lookup so the coast is ragged at every scale
wx = (fbm(W, H, 6, 5, 40) - 0.5) * 260
wy = (fbm(W, H, 6, 5, 50) - 0.5) * 260
hgt = fbm(W, H, 3, 6, 11)
hgt = cv2.remap(hgt, xx + wx, yy + wy, cv2.INTER_LINEAR)
cx, cy = W * 0.5, H * 0.53
d = np.sqrt(((xx - cx) / (W * 0.47)) ** 2 + ((yy - cy) / (H * 0.43)) ** 2)
land_h = hgt * 1.2 - d ** 1.6 * 0.9 + 0.14
bay = np.exp(-(((xx - W * 0.56) / (W * 0.09)) ** 2 + ((yy - H * 0.25) / (H * 0.15)) ** 2))
land_h -= bay * 0.6
SEA = 0.30
land = land_h > SEA
land = cv2.morphologyEx(land.astype(np.uint8), cv2.MORPH_OPEN, np.ones((11, 11), np.uint8))
land = cv2.morphologyEx(land, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8)).astype(bool)
elev = np.clip((land_h - SEA) / 0.42, 0, 1) * land
moist = fbm(W, H, 5, 4, 91)
dry = np.clip((yy / H - 0.66) * 4.5, 0, 1) * (0.6 + 0.4 * fbm(W, H, 8, 3, 7))  # the Cinder Wastes in the south
dist_land = cv2.distanceTransform((~land).astype(np.uint8), cv2.DIST_L2, 5)   # sea: distance to land
dist_sea = cv2.distanceTransform(land.astype(np.uint8), cv2.DIST_L2, 5)       # land: distance to coast

mount = land & (elev > 0.66) & (dist_sea > 40)
hills = land & (elev > 0.40) & (elev <= 0.66)
forest = land & (moist > 0.50) & (elev > 0.10) & (elev < 0.62) & (dry < 0.25) & (dist_sea > 22)

# rivers: walk downhill from the heights, keeping the paths so they can be drawn as wandering lines
sm = cv2.GaussianBlur(land_h, (0, 0), 7)
pts = np.argwhere(mount)
rivers = []
rr = np.random.default_rng(4)
for k in rr.choice(len(pts), 7, replace=False):
    y, x = pts[k]; path = [(x, y)]
    for _ in range(900):
        best = None; bv = sm[y, x]
        for dy in (-10, 0, 10):
            for dx in (-10, 0, 10):
                ny, nx = y + dy, x + dx
                if 0 <= ny < H and 0 <= nx < W and sm[ny, nx] < bv - 1e-5:
                    bv = sm[ny, nx]; best = (ny, nx)
        if best is None:
            break
        y, x = best; path.append((x, y))
        if not land[y, x]:
            break
    if len(path) > 25:
        rivers.append(path)

# ---------------------------------------------------------------- places (snapped onto land)
def snap(fx, fy):
    x, y = int(fx * W), int(fy * H)
    if land[y, x] and dist_sea[y, x] > 25:
        return x, y
    ys, xs = np.nonzero(dist_sea > 40)
    i = np.argmin((xs - x) ** 2 + (ys - y) ** 2)
    return int(xs[i]), int(ys[i])


TOWNS = {"Thornwick": snap(0.42, 0.70), "Brindle Cross": snap(0.60, 0.68), "Saltmere": snap(0.27, 0.62),
         "Marrow Ford": snap(0.73, 0.64), "Old Emberhold": snap(0.47, 0.40)}
# kind: title | sea | region | town. (text, x, y, size, angle)
LABELS = [("THE EMBERLANDS", 0.50, 0.085, 104, 0, "title"),
          ("The Quiet Sea", 0.17, 0.30, 100, 7, "sea"),
          ("Gloamwater", 0.80, 0.50, 78, -10, "sea"),
          ("The Ashen Reach", 0.50, 0.93, 90, 0, "sea"),
          ("Cairn Peaks", None, None, 92, 14, "region"),
          ("Vale of Hollin", None, None, 86, 0, "region"),
          ("Ashgrove", None, None, 82, -8, "region"),
          ("The Cinder Wastes", None, None, 88, 3, "region")]
REGION_AT = {"Cairn Peaks": (0.34, 0.52), "Vale of Hollin": (0.50, 0.57), "Ashgrove": (0.68, 0.40), "The Cinder Wastes": (0.55, 0.80)}
for k, (fx, fy) in REGION_AT.items():
    REGION_AT[k] = snap(fx, fy)

# ---------------------------------------------------------------- pen work
def jit(p, a, rng):
    return (p[0] + rng.normal(0, a), p[1] + rng.normal(0, a))


def hand_line(dr, pts, col, width, rng, a=1.2, step=14):
    out = []
    for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
        n = max(1, int(math.hypot(x1 - x0, y1 - y0) / step))
        for i in range(n):
            t = i / n
            out.append((x0 + (x1 - x0) * t + rng.normal(0, a), y0 + (y1 - y0) * t + rng.normal(0, a)))
    out.append(pts[-1])
    dr.line(out, fill=col, width=width, joint="curve")


def draw_ink(rng):
    """The pen layer (RGBA): coast and ripples, rivers, hills, mountains, trees, towns, ships, frame, compass."""
    SS = 1
    ink = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dr = ImageDraw.Draw(ink)
    brown = (58, 40, 26, 255)
    # ripples round the coast: three fading outlines in the water
    for dd, al, wd in ((26, 150, 3), (58, 105, 3), (98, 70, 2), (150, 40, 2)):
        m = (dist_land < dd).astype(np.uint8)
        cs, _ = cv2.findContours(m, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
        for c in cs:
            if len(c) < 120:
                continue
            p = [(int(q[0][0]), int(q[0][1])) for q in c[::9]]
            # break the line so it reads as hand-drawn dashes
            seg = []
            for i, q in enumerate(p):
                seg.append(q)
                if len(seg) > 6 + rng.integers(0, 8):
                    dr.line([jit(s, 1.4, rng) for s in seg], fill=(70, 96, 100, al), width=wd, joint="curve")
                    seg = [q]
    # the coast itself, a heavy wobbling pen line
    cs, _ = cv2.findContours(land.astype(np.uint8), cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    for c in cs:
        if len(c) < 80:
            continue
        p = [(int(q[0][0]), int(q[0][1])) for q in c[::5]]
        dr.line([jit(s, 1.1, rng) for s in p] + [jit(p[0], 1.1, rng)], fill=brown, width=5, joint="curve")
    # rivers
    for path in rivers:
        p = path[::3]
        for w_, al in ((9, 90), (5, 255)):
            dr.line([jit(s, 2.2, rng) for s in p], fill=(54, 98, 118, al) if w_ == 5 else (54, 98, 118, 60), width=w_, joint="curve")
    # hills: little arcs
    ys, xs = np.nonzero(hills[::40, ::40])
    for y, x in zip(ys, xs):
        if rng.random() < 0.55:
            continue
        px, py = x * 40 + rng.integers(-14, 14), y * 40 + rng.integers(-14, 14)
        s = 22 + rng.integers(0, 14)
        arc = [(px - s + i * s * 2 / 8, py - math.sin(i / 8 * math.pi) * s * 0.7) for i in range(9)]
        dr.line([jit(a, 0.8, rng) for a in arc], fill=brown, width=3, joint="curve")
        dr.line([(px - s * 0.2, py - s * 0.4), (px + s * 0.5, py - s * 0.1)], fill=(58, 40, 26, 150), width=2)
    # mountains: ridge silhouettes with hatched shade, drawn back to front
    ys, xs = np.nonzero(mount[::60, ::60])
    ms = sorted([(y * 60 + rng.integers(-20, 20), x * 60 + rng.integers(-20, 20)) for y, x in zip(ys, xs) if rng.random() > 0.45])
    for by, px in ms:
        s = 34 + rng.integers(0, 26); h = s * (1.0 + rng.random() * 0.5)
        sil = [(px - s, by), (px - s * 0.6, by - h * 0.4), (px - s * 0.28, by - h * 0.62), (px - s * 0.08, by - h * 0.92), (px, by - h),
               (px + s * 0.22, by - h * 0.7), (px + s * 0.45, by - h * 0.55), (px + s * 0.7, by - h * 0.28), (px + s, by)]
        sil = [jit(q, 2.2, rng) for q in sil]
        dr.polygon(sil, fill=(214, 198, 166, 235))
        # shaded right face
        ridge = [(px, by - h)] + [(px + s * (0.05 + 0.12 * i), by - h * (0.82 - 0.2 * i)) for i in range(4)] + [(px + s * 0.5, by)]
        face = [jit(q, 1.6, rng) for q in ridge] + [(px + s, by)]
        dr.polygon(face, fill=(150, 130, 104, 150))
        for i in range(7):
            t = i / 7
            x0 = px + s * (0.1 + 0.8 * t); y0 = by - h * (0.55 * (1 - t))
            dr.line([(x0, y0), (x0 + s * 0.1, y0 + h * 0.3 * (1 - t) + 6)], fill=(70, 52, 38, 190), width=2)
        hand_line(dr, sil, brown, 4, rng, 1.0)
        dr.line([jit(q, 1, rng) for q in [(px, by - h)] + ridge[1:4]], fill=brown, width=3)
        # a few snow flecks on the highest
        if h > s * 1.3:
            dr.line([(px - s * 0.12, by - h * 0.86), (px + s * 0.1, by - h * 0.78)], fill=(244, 238, 226, 230), width=4)
    # trees: round canopies with a trunk, in tufts
    ys, xs = np.nonzero(forest[::30, ::30])
    ts = sorted([(y * 30 + rng.integers(-11, 11), x * 30 + rng.integers(-11, 11)) for y, x in zip(ys, xs) if rng.random() > 0.35])
    for ty, tx in ts:
        s = 15 + rng.integers(0, 9)
        dr.line([(tx, ty), (tx, ty + s * 0.9)], fill=brown, width=3)
        for ox, oy, rr_ in ((-0.45, 0.0, 0.7), (0.45, 0.05, 0.7), (0, -0.55, 0.85)):
            x0, y0, r0 = tx + ox * s, ty + oy * s, rr_ * s
            dr.ellipse([x0 - r0, y0 - r0, x0 + r0, y0 + r0], fill=(60, 92, 52, 235), outline=(34, 52, 30, 255), width=2)
            dr.ellipse([x0 - r0 * 0.7, y0 - r0 * 0.8, x0 - r0 * 0.1, y0 - r0 * 0.2], fill=(98, 132, 70, 190))
    # towns: a few houses and a tower each
    for name, (tx, ty) in TOWNS.items():
        for i in range(4):
            hx, hy = tx + rng.integers(-34, 34), ty + rng.integers(-10, 20)
            w_, h_ = 14 + rng.integers(0, 6), 12 + rng.integers(0, 5)
            dr.rectangle([hx - w_, hy - h_ * 0.2, hx + w_, hy + h_], fill=(236, 224, 192, 255), outline=brown, width=2)
            dr.polygon([(hx - w_ - 4, hy - h_ * 0.2), (hx, hy - h_ * 1.5), (hx + w_ + 4, hy - h_ * 0.2)], fill=(156, 74, 52, 255), outline=brown)
        dr.rectangle([tx - 9, ty - 54, tx + 9, ty - 8], fill=(226, 214, 184, 255), outline=brown, width=3)
        dr.polygon([(tx - 14, ty - 54), (tx, ty - 82), (tx + 14, ty - 54)], fill=(146, 62, 44, 255), outline=brown)
        dr.line([(tx, ty - 82), (tx, ty - 98)], fill=brown, width=3)
        dr.polygon([(tx, ty - 98), (tx + 20, ty - 92), (tx, ty - 86)], fill=(170, 40, 34, 255))
    # ships and little waves in the open sea
    sea_mask = (dist_land > 200) & (~land); sea_mask[:int(H * 0.2)] = False; sea_mask[int(H * 0.68):, int(W * 0.74):] = False
    sea_pts = np.argwhere(sea_mask)
    for _ in range(4):
        y, x = sea_pts[rng.integers(0, len(sea_pts))]
        dr.polygon([(x - 46, y), (x + 46, y), (x + 30, y + 22), (x - 30, y + 22)], fill=(110, 78, 50, 255), outline=brown)
        dr.line([(x, y), (x, y - 76)], fill=brown, width=4)
        dr.polygon([(x + 4, y - 74), (x + 44, y - 36), (x + 4, y - 10)], fill=(236, 226, 200, 255), outline=brown)
        dr.polygon([(x - 4, y - 66), (x - 36, y - 38), (x - 4, y - 14)], fill=(226, 214, 186, 255), outline=brown)
        dr.line([(x - 60, y + 30), (x - 30, y + 24), (x, y + 32), (x + 30, y + 24), (x + 60, y + 30)], fill=(70, 96, 100, 190), width=3)
    for _ in range(90):
        y, x = sea_pts[rng.integers(0, len(sea_pts))]
        dr.line([(x - 18, y), (x - 9, y - 7), (x, y), (x + 9, y - 7), (x + 18, y)], fill=(74, 100, 106, 120), width=2)
    # frame: a heavy and a fine rule, ticks between, corner blocks
    m = 46
    dr.rectangle([m, m, W - m, H - m], outline=brown, width=11)
    dr.rectangle([m + 22, m + 22, W - m - 22, H - m - 22], outline=brown, width=3)
    for x in range(m + 22, W - m - 22, 40):
        dr.line([(x, m + 12), (x, m + 22)], fill=brown, width=3); dr.line([(x, H - m - 12), (x, H - m - 22)], fill=brown, width=3)
    for y in range(m + 22, H - m - 22, 40):
        dr.line([(m + 12, y), (m + 22, y)], fill=brown, width=3); dr.line([(W - m - 12, y), (W - m - 22, y)], fill=brown, width=3)
    for cxn, cyn in ((m, m), (W - m, m), (m, H - m), (W - m, H - m)):
        dr.rectangle([cxn - 30, cyn - 30, cxn + 30, cyn + 30], fill=(206, 188, 150, 255), outline=brown, width=6)
        dr.ellipse([cxn - 14, cyn - 14, cxn + 14, cyn + 14], outline=brown, width=4)
    # compass rose
    cxr, cyr, Rr = int(W * 0.87), int(H * 0.83), 190
    for ring in (1.25, 1.12):
        dr.ellipse([cxr - Rr * ring, cyr - Rr * ring, cxr + Rr * ring, cyr + Rr * ring], outline=brown, width=4 if ring > 1.2 else 2)
    for ang in range(0, 360, 22):
        a = math.radians(ang); l = Rr * (0.5 if ang % 45 else 0.7)
        dr.line([(cxr, cyr), (cxr + math.sin(a) * l, cyr - math.cos(a) * l)], fill=brown, width=2)
    for ang in range(0, 360, 45):
        a = math.radians(ang); l = Rr if ang % 90 == 0 else Rr * 0.64
        tip = (cxr + math.sin(a) * l, cyr - math.cos(a) * l)
        l1 = (cxr + math.sin(a - 0.3) * Rr * 0.2, cyr - math.cos(a - 0.3) * Rr * 0.2)
        r1 = (cxr + math.sin(a + 0.3) * Rr * 0.2, cyr - math.cos(a + 0.3) * Rr * 0.2)
        dr.polygon([tip, l1, (cxr, cyr)], fill=(176, 50, 40, 255) if ang % 90 == 0 else (206, 188, 150, 255), outline=brown)
        dr.polygon([tip, r1, (cxr, cyr)], fill=(90, 60, 40, 255) if ang % 90 == 0 else (150, 128, 100, 255), outline=brown)
    dr.ellipse([cxr - 18, cyr - 18, cxr + 18, cyr + 18], fill=(226, 206, 160, 255), outline=brown, width=4)
    fn = ImageFont.truetype(os.path.join(FONTS, "DarklandSerif-Bold.ttf"), 52)
    dr.text((cxr - 14, cyr - Rr * 1.25 - 66), "N", font=fn, fill=brown)
    return ink


# ---------------------------------------------------------------- washes
def smooth(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def wash(style, rng):
    bl = fbm(W, H, 9, 5, 123)[..., None]       # watercolour blotches
    gr = (noise(W, H, (W // 3, H // 3), 77) - 0.5)[..., None]   # granulation
    L = cv2.GaussianBlur(land.astype(np.float32), (0, 0), 2.0)[..., None]
    if style == "print":
        sea = np.array([206, 220, 216], np.float32) + (bl - 0.5) * 10
        lnd = np.array([238, 228, 198], np.float32) + (bl - 0.5) * 8
        img = sea * (1 - L) + lnd * L
        return np.clip(img, 0, 255)
    deep = np.array([38, 82, 92], np.float32); shallow = np.array([96, 150, 148], np.float32); foam = np.array([168, 196, 180], np.float32)
    t = smooth(dist_land, 0, 520)[..., None]
    sea = shallow * (1 - t) + deep * t
    sea = sea * (0.88 + 0.28 * bl)
    pool = np.exp(-dist_land / 14.0)[..., None]                 # pigment pooling just off the coast
    sea = sea * (1 - 0.18 * pool) + foam * 0.10 * np.exp(-dist_land / 60.0)[..., None]
    green = np.array([132, 156, 82], np.float32); olive = np.array([104, 128, 66], np.float32)
    ochre = np.array([196, 170, 104], np.float32); ash = np.array([168, 150, 122], np.float32); rock = np.array([150, 136, 118], np.float32)
    e = smooth(elev, 0.05, 0.7)[..., None]
    lnd = green * (1 - e) + ochre * e * 0.8 + olive * 0.2 * e
    lnd = lnd * (1 - dry[..., None]) + ash * dry[..., None]
    lnd = lnd * (1 - smooth(elev, 0.62, 0.9)[..., None]) + rock * smooth(elev, 0.62, 0.9)[..., None]
    lnd = lnd * (1 - 0.30 * forest.astype(np.float32)[..., None] * L) + np.array([66, 104, 60], np.float32) * 0.30 * forest.astype(np.float32)[..., None]
    lnd = lnd * (0.80 + 0.40 * bl)
    ey = cv2.GaussianBlur(elev, (0, 0), 5)
    sh = np.clip(0.5 + (-cv2.Sobel(ey, cv2.CV_32F, 1, 0, ksize=5) - cv2.Sobel(ey, cv2.CV_32F, 0, 1, ksize=5)) * 5, 0, 1)[..., None]
    lnd = lnd * (0.82 + 0.36 * sh)
    edge = np.exp(-dist_sea / 16.0)[..., None]                    # darker rim inside the coast
    lnd = lnd * (1 - 0.16 * edge) + np.array([218, 200, 150], np.float32) * 0.18 * np.exp(-dist_sea / 5.0)[..., None]
    img = sea * (1 - L) + lnd * L
    img = img * (1 + gr * 0.10)
    return np.clip(img, 0, 255)


def paper(img, rng, strength=1.0):
    """fibres, mottling, foxing, creases, burnt-brown edges"""
    a = img.copy()
    h, w = a.shape[:2]
    mott = fbm(w, h, 14, 5, 301)
    a *= (0.90 + 0.18 * mott)[..., None]
    # fibres: many short faint strokes
    fib = Image.new("L", (w, h), 128)
    fd = ImageDraw.Draw(fib)
    for _ in range(int(9000 * w * h / (W * H))):
        x, y = rng.integers(0, w), rng.integers(0, h); l = rng.integers(8, 40); th = rng.random() * math.pi
        fd.line([(x, y), (x + math.cos(th) * l, y + math.sin(th) * l)], fill=int(128 + rng.integers(-26, 26)), width=1)
    a *= (np.asarray(fib.filter(ImageFilter.GaussianBlur(0.6))).astype(np.float32) / 128)[..., None] ** 0.6
    # foxing: a few brown blooms
    fox = np.zeros((h, w), np.float32)
    for _ in range(26):
        x, y = rng.integers(0, w), rng.integers(0, h); r_ = rng.integers(10, 60) * w / W
        cv2.circle(fox, (int(x), int(y)), int(max(2, r_)), 1.0, -1)
    fox = cv2.GaussianBlur(fox, (0, 0), 10 * w / W) * (fbm(w, h, 20, 3, 5) > 0.45)
    a = a * (1 - 0.22 * fox[..., None]) + np.array([150, 100, 50], np.float32) * 0.22 * fox[..., None] * 0.0 + a * 0
    a = img.copy() * 0 + a  # keep dtype
    # folds
    for fx in (0.5,):
        col = int(w * fx)
        a[:, max(0, col - 2):col + 3] *= 0.93
    row = int(h * 0.5)
    a[max(0, row - 2):row + 3, :] *= 0.94
    # edge burn with a ragged limit
    yy_, xx_ = np.mgrid[0:h, 0:w].astype(np.float32)
    dd = np.minimum(np.minimum(xx_, w - xx_), np.minimum(yy_, h - yy_)) / min(w, h)
    dd = dd + (fbm(w, h, 12, 4, 17) - 0.5) * 0.06
    burn = np.clip((0.09 - dd) / 0.09, 0, 1) ** 1.6
    a = a * (1 - 0.55 * burn[..., None]) + np.array([60, 36, 18], np.float32) * 0.55 * burn[..., None]
    return np.clip(a, 0, 255)


def lettering(img, rng, scale, style="paint", wrong=(), font="DarklandSerif-Regular.ttf", color=(44, 28, 20), halo=True, blur=0.0, sans=False):
    pil = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).convert("RGBA")
    pos = {}
    for name, (tx, ty) in TOWNS.items():
        pos[name] = (tx / W, (ty + 58) / H, 58, 0, "town")
    items = []
    for text, x, y, size, ang, kind in LABELS:
        if x is None:
            rx, ry = REGION_AT[text]; x, y = rx / W, ry / H
        items.append((text, x, y, size, ang, kind))
    for name, (x, y, size, ang, kind) in pos.items():
        items.append((name, x, y, size, ang, kind))
    for text, x, y, size, ang, kind in items:
        txt = text
        if text in wrong:
            tbl = {"o": "0", "n": "m", "r": "t", "i": "l", "h": "b", "T": "7", "a": "e", "e": "c", "c": "e", "l": "1"}
            txt = "".join(tbl.get(c, c) if k % 2 == 0 else c for k, c in enumerate(text))
        if kind == "title":
            txt = " ".join(txt)
        fnt = ImageFont.truetype(os.path.join(FONTS, font), max(8, int(size * scale)))
        tw = int(fnt.getlength(txt)) + 60
        tmp = Image.new("RGBA", (tw, int(size * scale * 1.9)), (0, 0, 0, 0))
        dd = ImageDraw.Draw(tmp)
        col = (30, 52, 70) if kind == "sea" else color
        pad = 30
        if halo:
            for ox, oy in ((-2, -2), (2, 2), (-2, 2), (2, -2), (0, 3), (0, -3), (3, 0), (-3, 0)):
                dd.text((pad + ox * scale * 1.2, 8 + oy * scale * 1.2), txt, font=fnt, fill=(232, 218, 182, 120))
        dd.text((pad, 8), txt, font=fnt, fill=col + (235,))
        if kind == "title":
            dd.rectangle([6, 2, tw - 6, int(size * scale * 1.35)], outline=col + (235,), width=max(2, int(4 * scale)))
        tmp = tmp.rotate(ang, expand=True, resample=Image.BICUBIC)
        if blur:
            tmp = tmp.filter(ImageFilter.GaussianBlur(blur))
        pil.alpha_composite(tmp, (int(x * W * scale - tmp.width / 2), int(y * H * scale - tmp.height / 2)))
    return np.asarray(pil.convert("RGB")).astype(np.float32)


def compose(style, with_names, scale, wrong=(), seed=1, font="DarklandSerif-Regular.ttf"):
    rng = np.random.default_rng(seed)
    base = wash(style, rng)
    ink = draw_ink(np.random.default_rng(3))                      # same pen work every time
    ia = np.asarray(ink).astype(np.float32)
    ia[..., 3] = cv2.GaussianBlur(ia[..., 3], (0, 0), 0.7)       # ink bleeds a little
    al = ia[..., 3:4] / 255
    if style == "print":
        flat = ia[..., :3]
        flat = flat * 0.55 + 90 * 0.45                            # printed ink is lighter and greyer
        img = base * (1 - al * 0.92) + flat * al * 0.92
    else:
        img = base * (1 - al) + ia[..., :3] * al * 0.96 + base * al * 0.04
    img = paper(img, np.random.default_rng(9)) if style == "paint" else img
    if with_names:
        img = lettering(img, rng, 1.0, style, wrong=wrong, font=font, halo=(style == "paint"))
    pil = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
    if scale != 1.0:
        pil = pil.resize((int(W * scale), int(H * scale)), Image.LANCZOS)
    return pil


def add_noise(pil, s=7, seed=2):
    a = np.asarray(pil).astype(np.float32)
    a += np.random.default_rng(seed).normal(0, s, a.shape)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


# ---------------------------------------------------------------- the stages
printed_named = compose("print", True, 1.0, font="ArchitectsDaughter-Regular.ttf")
scan = printed_named.resize((1024, 768), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.8))
scan = add_noise(scan.convert("RGB"), 6)
scan.save(f"{OUT}/s1-scan.png")
scan.resize((2048, 1536), Image.LANCZOS).filter(ImageFilter.UnsharpMask(3, 170, 2)).save(f"{OUT}/s2-esrgan.png")
printed_bare = compose("print", False, 1.0)
printed_bare.resize((2048, 1536), Image.LANCZOS).save(f"{OUT}/s3-erase.png")
printed_set = compose("print", True, 1.0, font="DarklandSerif-Regular.ttf")
printed_set.resize((2048, 1536), Image.LANCZOS).save(f"{OUT}/s4-letter.png")
painted_wrong = compose("paint", True, 1.0, wrong=("Thornwick", "Brindle Cross"), font="IMFeENit28P.ttf")
painted_wrong.resize((2048, 1536), Image.LANCZOS).save(f"{OUT}/s5-paint.png")
final = compose("paint", True, 1.0, font="DarklandSerif-Regular.ttf")
final = final.resize((3840, 2880), Image.LANCZOS)
final.save(f"{OUT}/s6-final.png")
final.save(f"{OUT}/map-4k.webp", quality=90)
final.resize((2048, 1536), Image.LANCZOS).save(f"{OUT}/s6-final-2k.png")
alone = compose("print", True, 1.0, wrong=("Thornwick", "Brindle Cross", "Saltmere", "Cairn Peaks"), font="DarklandSerif-Regular.ttf")
a = np.asarray(alone.resize((2048, 1536), Image.LANCZOS)).astype(np.float32) * np.array([0.97, 0.93, 0.84]) + np.array([6, 6, 0])
Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(f"{OUT}/alone.png")
# an unlettered painted base, for the "labels" pass
compose("paint", False, 1.0).resize((2048, 1536), Image.LANCZOS).save(f"{OUT}/painted-bare.png")
print("done")
