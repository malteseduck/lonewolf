"""Build Darkland Hand, our own font for the map names of Book 12 on (the owner, 2026-10-16).

Run (from the project root):
  uv run --project tools python tools/map_font.py [<out dir>] [--sheet <specimen.png>]

The printed maps of Books 12 and 13 are lettered by hand with a chisel pen in straight strokes: a
diamond O, S and s of three zigzag strokes with a hooked serif, B, D, P and R bowls of two
diagonals, a looped e, flicks at the ends of E, F, L, T and Z's bars, slabs on I. The letters are
short for their width and loosely spaced (TALL, WIDE, SIDE, set by measuring Book 12's names against
the scan and by the owner's eye). No free font has that with lower case, so each letter here is a few strokes (polylines in font units, below) drawn with a
chisel nib: every segment becomes the convex hull of the nib's rectangle at its two ends, so the
stroke is thick across the nib's angle and thin along it, as a broad pen is. The pieces overlap
and are left so (TrueType fills by nonzero winding). Our own drawing, not traced from the scans:
OFL, like the other fonts in tools/fonts/.

Four weights from one drawing: Thin is Book 12's pen once map_letter.py's added stroke is counted
(stroke width over letter height 0.074 on the map, the scan's 0.075); Bold is about Book 13's pen.
--sheet also writes a specimen of every glyph in every weight.

Darkland Serif (Book 9, the owner, 2026-10-20) is built beside it from the same nib: Book 9's map is
lettered with a broad pen in a hand still angular but serifed: every long steep stroke ends in a serif
(serifs(), below), O and the bowls are rounded diamonds (only C, G and c round), the S is angular
with a round bottom, contrast is stronger and the letters are closer set.
"""
import argparse
import math
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

UPM = 1000
TALL = 0.77      # every drawing squashed top to bottom: the scans' letters are short for their width (KAAG, Maakengorge)
CAP, XH, ASC, DESC = (round(v * TALL) for v in (700, 480, 720, -220))  # the drawings' heights below, as set
NIB_ANGLE = 30   # degrees from the horizontal: a near-even felt pen, verticals a little thicker than flats
WEIGHTS = {'Thin': (30, 16), 'Light': (70, 30), 'Regular': (95, 38), 'Bold': (150, 46)}  # nib length and thickness, font units
SIDE = 75        # side bearing beyond the nib's reach: the scans space their letters loosely
WIDE = 1.0       # every drawing stretched across, so names have the scan's proportions
LOWER_WIDE = 1.15  # lower case a little broader than the capitals, as on the scan (owner, by eye)

# Each glyph: (width of the drawing, [stroke, ...]); a stroke is a list of points, a dot is one point
G = {
    'A': (540, [[(0, 0), (270, 700), (540, 0)], [(0, 0), (405, 350)]]),  # the bar from the left foot up to the right leg's middle
    'B': (400, [[(0, 0), (0, 700), (340, 530), (0, 370), (400, 180), (0, 0)]]),
    'C': (440, [[(440, 620), (250, 700), (0, 350), (250, 0), (450, 70)]]),
    'D': (440, [[(0, 0), (0, 700), (60, 700), (440, 340), (60, 0), (0, 0)]]),
    'E': (420, [[(400, 590), (420, 700), (-40, 700)], [(0, 700), (0, 0)], [(-40, 0), (420, 0), (440, 110)], [(0, 360), (300, 360), (310, 310)]]),
    'F': (400, [[(390, 650), (410, 700), (0, 700), (0, 0)], [(0, 370), (290, 370)]]),
    'G': (580, [[(420, 610), (290, 700), (0, 350), (290, 0), (580, 340), (330, 340)]]),  # a broad O, open at the top right
    'H': (460, [[(0, 0), (0, 700)], [(460, 0), (460, 700)], [(0, 360), (460, 360)]]),
    'I': (140, [[(70, 0), (70, 700)], [(0, 700), (140, 700)], [(0, 0), (140, 0)]]),
    'J': (340, [[(340, 700), (340, 170), (190, 0), (0, 110)]]),
    'K': (440, [[(0, 0), (0, 700)], [(420, 700), (0, 290)], [(130, 420), (440, 0)]]),
    'L': (400, [[(0, 700), (0, 0), (400, 0), (420, 60)]]),
    'M': (580, [[(0, 0), (0, 700), (290, 260), (580, 700), (580, 0)]]),
    'N': (470, [[(0, 0), (0, 700), (470, 0), (470, 700)]]),
    'O': (520, [[(260, 700), (520, 350), (260, 0), (0, 350), (260, 700)]]),
    'P': (380, [[(0, 0), (0, 700), (380, 540), (0, 360)]]),
    'Q': (520, [[(260, 700), (520, 350), (260, 0), (0, 350), (260, 700)], [(310, 170), (540, -60)]]),
    'R': (420, [[(0, 0), (0, 700), (380, 540), (0, 370), (420, 0)]]),
    'S': (440, [[(440, 600), (440, 700), (0, 460), (440, 240), (0, 0)]]),
    'T': (500, [[(0, 650), (20, 700), (480, 700), (500, 650)], [(250, 700), (250, 0)]]),
    'U': (450, [[(0, 700), (0, 150), (225, 0), (450, 150), (450, 700)]]),
    'V': (500, [[(0, 700), (250, 0), (500, 700)]]),
    'W': (660, [[(0, 700), (165, 0), (330, 520), (495, 0), (660, 700)]]),
    'X': (460, [[(0, 700), (460, 0)], [(460, 700), (0, 0)]]),
    'Y': (480, [[(0, 700), (240, 350), (480, 700)], [(240, 350), (240, 0)]]),
    'Z': (440, [[(0, 650), (20, 700), (440, 700), (0, 0), (440, 0), (460, 60)]]),
    'a': (330, [[(40, 430), (190, 480), (330, 400), (330, 0)], [(330, 270), (110, 270), (0, 130), (120, 0), (330, 70)]]),
    'b': (330, [[(0, 720), (0, 0)], [(0, 330), (160, 480), (330, 240), (160, 0), (0, 40)]]),
    'c': (310, [[(300, 420), (170, 480), (0, 240), (170, 0), (310, 60)]]),
    'd': (330, [[(330, 720), (330, 0)], [(330, 330), (170, 480), (0, 240), (170, 0), (330, 40)]]),
    'e': (320, [[(0, 220), (300, 330), (200, 480), (50, 400), (0, 220), (110, 0), (320, 60)]]),
    'f': (280, [[(290, 690), (190, 720), (100, 640), (100, 0)], [(0, 440), (250, 440)]]),
    'g': (330, [[(330, 480), (330, -130), (190, -220), (20, -160)], [(330, 400), (170, 480), (0, 270), (160, 70), (330, 150)]]),
    'h': (320, [[(0, 720), (0, 0)], [(0, 340), (130, 470), (290, 450), (290, 40), (340, 0)]]),
    'i': (0, [[(0, 480), (0, 0)], [(0, 640)]]),
    'j': (180, [[(180, 480), (180, -120), (80, -220), (0, -180)], [(180, 640)]]),
    'k': (320, [[(0, 720), (0, 0)], [(300, 480), (0, 190)], [(100, 280), (320, 0)]]),
    'l': (60, [[(0, 720), (0, 60), (60, 0)]]),
    'm': (520, [[(0, 480), (0, 0)], [(0, 340), (110, 470), (240, 450), (240, 0)], [(240, 350), (350, 470), (470, 450), (470, 40), (520, 0)]]),
    'n': (340, [[(0, 480), (0, 0)], [(0, 340), (130, 470), (290, 450), (290, 40), (340, 0)]]),
    'o': (340, [[(170, 480), (340, 240), (170, 0), (0, 240), (170, 480)]]),
    'p': (330, [[(0, 480), (0, -220)], [(0, 330), (160, 480), (330, 240), (160, 0), (0, 40)]]),
    'q': (330, [[(330, 480), (330, -220)], [(330, 330), (170, 480), (0, 240), (170, 0), (330, 40)]]),
    'r': (270, [[(0, 480), (0, 0)], [(0, 360), (110, 470), (240, 460), (260, 380)]]),
    's': (300, [[(300, 410), (300, 480), (0, 315), (300, 165), (0, 0)]]),  # the S's three strokes and serif
    't': (270, [[(100, 650), (100, 70), (180, 0), (270, 40)], [(0, 440), (250, 440)]]),
    'u': (320, [[(0, 480), (0, 130), (140, 0), (320, 110)], [(320, 480), (320, 0)]]),
    'v': (340, [[(0, 480), (170, 0), (340, 480)]]),
    'w': (500, [[(0, 480), (125, 0), (250, 380), (375, 0), (500, 480)]]),
    'x': (320, [[(0, 480), (320, 0)], [(320, 480), (0, 0)]]),
    'y': (340, [[(0, 480), (170, 40)], [(340, 480), (120, -220), (0, -200)]]),
    'z': (320, [[(0, 480), (320, 480), (0, 0), (330, 0)]]),
    '0': (400, [[(200, 700), (400, 350), (200, 0), (0, 350), (200, 700)]]),
    '1': (220, [[(0, 560), (200, 700), (200, 0)]]),
    '2': (400, [[(10, 600), (190, 700), (380, 600), (0, 0), (400, 0)]]),
    '3': (400, [[(10, 700), (380, 700), (150, 410), (400, 200), (220, 0), (0, 70)]]),
    '4': (420, [[(310, 0), (310, 700), (0, 220), (420, 220)]]),
    '5': (400, [[(390, 700), (40, 700), (20, 410), (290, 430), (400, 210), (240, 0), (0, 70)]]),
    '6': (400, [[(330, 700), (20, 300), (160, 0), (400, 150), (310, 390), (40, 330)]]),
    '7': (400, [[(0, 700), (400, 700), (130, 0)]]),
    '8': (420, [[(210, 700), (380, 540), (210, 380), (40, 540), (210, 700)], [(210, 380), (420, 190), (210, 0), (0, 190), (210, 380)]]),
    '9': (400, [[(70, 0), (380, 400), (240, 700), (0, 550), (90, 310), (360, 370)]]),
    '.': (0, [[(0, 20)]]),
    ',': (60, [[(60, 40), (0, -120)]]),
    "'": (40, [[(40, 720), (0, 560)]]),
    '-': (240, [[(0, 300), (240, 300)]]),
    '/': (320, [[(0, -60), (320, 760)]]),
    '&': (480, [[(480, 0), (60, 520), (160, 700), (320, 600), (0, 200), (150, 0), (300, 40), (460, 300)]]),
    '(': (160, [[(160, 760), (0, 350), (160, -60)]]),
    ')': (160, [[(0, 760), (160, 350), (0, -60)]]),
}
SPACE = 260


# Darkland Serif (Book 9 on, the owner, 2026-10-20): the same nib and still angular, but Book 9's map
# is lettered with a broad pen whose stems end in wedge serifs (lower case: an exit flick); its O and
# bowls are rounded diamonds, only C (and G, c) truly round; its letters are less squashed.
BOWL = 1.35  # a bowl's superellipse exponent: 1 a diamond, 2 an ellipse (owner: "almost like a slightly rounded diamond")


def arc(cx, cy, rx, ry, a0, a1, n=BOWL):
    """Part of a superellipse, from angle a0 to a1 in degrees (anticlockwise if a1 > a0)."""
    k = max(4, round(abs(a1 - a0) / 10))
    def at(t):
        c, s = math.cos(math.radians(t)), math.sin(math.radians(t))
        return cx + rx * math.copysign(abs(c) ** (2 / n), c), cy + ry * math.copysign(abs(s) ** (2 / n), s)
    return [at(a0 + (a1 - a0) * i / k) for i in range(k + 1)]


def cubic(*curves):
    """Joined cubic Béziers, each (p0, p1, p2, p3), as one polyline."""
    out = []
    for p0, p1, p2, p3 in curves:
        for i in range(0 if not out else 1, 13):
            t = i / 12
            out.append(tuple((1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d
                             for a, b, c, d in zip(p0, p1, p2, p3)))
    return out


# S: a flick, an angular top and spine in straight strokes, and a round bottom bowl ending in a tail
_S = [(440, 560), (430, 690), (160, 700), (30, 580), (70, 440), (380, 290)] + cubic(((380, 290), (470, 220), (450, 10), (220, 0)), ((220, 0), (90, -5), (0, 50), (10, 160)))[1:]
_ARCH = lambda x, w: [(x, 300), (x + 0.4 * w, 480), (x + w + 10, 420), (x + w + 10, 0)]  # an angular shoulder and its leg
GS = dict(G)  # digits and punctuation as Darkland Hand's
GS.update({
    'A': (560, [[(0, 0), (280, 700), (560, 0)], [(130, 250), (440, 250)], [(230, 700), (320, 700)]]),
    'B': (420, [[(0, 0), (0, 700)], [(0, 700)] + arc(150, 535, 210, 165, 90, -90) + [(0, 370)], [(0, 370)] + arc(170, 185, 250, 185, 90, -90) + [(0, 0)]]),
    'C': (500, [[(490, 520)] + arc(280, 350, 280, 350, 45, 315, 2)]),
    'D': (460, [[(0, 0), (0, 700)], [(0, 700)] + arc(130, 350, 330, 350, 90, -90) + [(0, 0)]]),
    'E': (420, [[(0, 700), (0, 0)], [(0, 700), (400, 700), (410, 610)], [(0, 360), (280, 360)], [(0, 0), (420, 0), (430, 90)]]),
    'F': (400, [[(0, 700), (0, 0)], [(0, 700), (400, 700), (410, 610)], [(0, 370), (280, 370)]]),
    'G': (580, [arc(290, 350, 290, 350, 45, 345, 2), [(340, 290), (590, 290), (590, 30)]]),
    'H': (480, [[(0, 0), (0, 700)], [(480, 0), (480, 700)], [(0, 360), (480, 360)]]),
    'I': (0, [[(0, 0), (0, 700)]]),
    'J': (380, [[(380, 700), (380, 200)] + arc(200, 200, 180, 200, 0, -160)]),
    'K': (460, [[(0, 0), (0, 700)], [(440, 700), (0, 300)], [(120, 400), (470, 0)]]),
    'L': (400, [[(0, 700), (0, 0), (400, 0), (415, 90)]]),
    'M': (620, [[(0, 0), (40, 700), (310, 160), (580, 700), (620, 0)]]),
    'N': (500, [[(0, 0), (0, 700), (500, 0), (500, 700)]]),
    'O': (560, [arc(280, 350, 280, 350, 90, 450)]),
    'P': (420, [[(0, 0), (0, 700)], [(0, 700)] + arc(150, 520, 230, 180, 90, -90) + [(0, 340)]]),
    'Q': (560, [arc(280, 350, 280, 350, 90, 450), cubic(((300, 60), (380, -30), (480, -80), (590, -60)))]),
    'R': (460, [[(0, 0), (0, 700)], [(0, 700)] + arc(150, 530, 220, 170, 90, -90) + [(0, 360)], [(170, 360), (470, 0)]]),
    'S': (440, [_S]),
    'T': (520, [[(10, 610), (0, 700), (520, 700), (530, 610)], [(260, 700), (260, 0)]]),
    'U': (480, [[(0, 700), (0, 230)] + arc(240, 230, 240, 230, 180, 360), [(480, 700), (480, 0)]]),
    'V': (520, [[(0, 700), (260, 0), (520, 700)]]),
    'W': (700, [[(0, 700), (175, 0), (350, 600), (525, 0), (700, 700)]]),
    'X': (480, [[(0, 700), (480, 0)], [(480, 700), (0, 0)]]),
    'Y': (500, [[(0, 700), (250, 350), (500, 700)], [(250, 350), (250, 0)]]),
    'Z': (460, [[(10, 610), (0, 700), (460, 700), (0, 0), (460, 0), (470, 90)]]),
    'a': (350, [arc(175, 240, 175, 240, 0, 360), [(350, 480), (350, 0)]]),
    'b': (360, [[(0, 720), (0, 0)], arc(185, 240, 175, 240, 180, 540)]),
    'c': (330, [arc(180, 240, 180, 240, 50, 310, 2)]),
    'd': (350, [arc(175, 240, 175, 240, 0, 360), [(350, 720), (350, 0)]]),
    'e': (340, [[(10, 250), (345, 250)] + arc(175, 240, 170, 240, 5, 310)]),
    'f': (300, [[(310, 650), (250, 720), (160, 720), (120, 640), (120, 0)], [(0, 440), (270, 440)]]),
    'g': (345, [arc(175, 260, 170, 220, 0, 360), [(345, 480), (345, -100)] + arc(190, -100, 155, 120, 0, -170)]),
    'h': (320, [[(0, 720), (0, 0)], _ARCH(0, 300)]),
    'i': (0, [[(0, 480), (0, 0)], [(0, 640)]]),
    'j': (180, [[(180, 480), (180, -100)] + arc(60, -100, 120, 120, 0, -150), [(180, 640)]]),
    'k': (330, [[(0, 720), (0, 0)], [(300, 480), (0, 180)], [(110, 250), (330, 0)]]),
    'l': (0, [[(0, 720), (0, 0)]]),
    'm': (520, [[(0, 480), (0, 0)], _ARCH(0, 240), _ARCH(250, 240)]),
    'n': (320, [[(0, 480), (0, 0)], _ARCH(0, 300)]),
    'o': (360, [arc(180, 240, 180, 240, 90, 450)]),
    'p': (360, [[(0, 480), (0, -220)], arc(185, 240, 175, 240, 180, 540)]),
    'q': (350, [arc(175, 240, 175, 240, 0, 360), [(350, 480), (350, -220)]]),
    'r': (280, [[(0, 480), (0, 0)], [(0, 300), (100, 470), (240, 470), (280, 400)]]),
    's': (300, [[(x * 0.68, y * 480 / 700) for x, y in _S]]),
    't': (280, [[(110, 650), (110, 80), (180, 0), (280, 50)], [(0, 440), (260, 440)]]),
    'u': (320, [[(0, 480), (0, 130), (130, 0), (310, 90)], [(310, 480), (310, 0)]]),
})
SERIF = 70       # a serif's reach either side of the stem, font units
SERIF_STYLE = dict(tall=0.85, wide=0.92, lower_wide=0.88, nib_angle=30, side=40,  # spaced closer than Darkland Hand, as Book 9's names are
                   weights={'Thin': (55, 14), 'Light': (95, 18), 'Regular': (130, 26), 'Bold': (175, 34)})


def serifs(strokes, lower):
    """A serif at each free end of a long, steep stroke: a bar across a capital's stem, a wedge into a
    lower-case stem's top and a flick out of its foot (a bar on a descender)."""
    out = []
    for s in strokes:
        for p, q in ((s[0], s[1]), (s[-1], s[-2])) if len(s) > 1 else ():
            dx, dy = p[0] - q[0], p[1] - q[1]
            if math.hypot(dx, dy) < 150 or abs(dy) <= 1.2 * abs(dx):
                continue
            x, y = p
            if dy > 0:
                out.append([(x - SERIF, y - (12 if lower else 0)), (x + (10 if lower else SERIF * 0.7), y)])
            elif lower and y > -50:
                out.append([(x, y), (x + SERIF, y + 18)])
            else:
                out.append([(x - SERIF * 0.7, y), (x + SERIF, y)])
    return out


def hull(pts):
    pts = sorted(set(pts))
    if len(pts) < 3:
        return pts
    cross = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, hi = [], []
    for p in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0:
            lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(hi) >= 2 and cross(hi[-2], hi[-1], p) <= 0:
            hi.pop()
        hi.append(p)
    return lo[:-1] + hi[:-1]  # anticlockwise


def nib(length, thick, angle=NIB_ANGLE):
    a = math.radians(angle)
    u, v = (math.cos(a) * length / 2, math.sin(a) * length / 2), (-math.sin(a) * thick / 2, math.cos(a) * thick / 2)
    return [(su * u[0] + sv * v[0], su * u[1] + sv * v[1]) for su in (-1, 1) for sv in (-1, 1)]


def outlines(strokes, length, thick, angle=NIB_ANGLE):
    """Each segment (or a lone point) swept by the nib: one convex polygon, clockwise as TrueType wants."""
    corners = nib(length, thick, angle)
    out = []
    for s in strokes:
        segs = list(zip(s, s[1:])) or [(s[0], s[0])]
        for p, q in segs:
            pts = [(x + dx, y + dy) for (x, y) in (p, q) for dx, dy in corners]
            out.append([(round(x), round(y)) for x, y in reversed(hull(pts))])
    return out


FAMILIES = {'DarklandHand': 'Darkland Hand', 'DarklandSerif': 'Darkland Serif'}


def build(weight, out, family='DarklandHand'):
    serif = family == 'DarklandSerif'
    st = SERIF_STYLE if serif else dict(tall=TALL, wide=WIDE, lower_wide=LOWER_WIDE, nib_angle=NIB_ANGLE, side=SIDE, weights=WEIGHTS)
    glyph_set = GS if serif else G
    tall = st['tall']
    asc, desc = round(720 * tall), round(-220 * tall)
    length, thick = st['weights'][weight]
    reach = math.ceil(max(abs(x) for x, _ in nib(length, thick, st['nib_angle'])))
    names = {c: (c if c.isalnum() and c.isascii() else f'uni{ord(c):04X}') for c in glyph_set}
    order = ['.notdef', 'space'] + [names[c] for c in glyph_set]
    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap({32: 'space', **{ord(c): names[c] for c in glyph_set}})
    glyphs, metrics = {}, {}
    for name in ('.notdef', 'space'):
        glyphs[name] = TTGlyphPen(None).glyph()
        metrics[name] = (SPACE, 0)
    for c, (w, strokes) in glyph_set.items():
        if serif and c.isalpha():
            strokes = strokes + serifs(strokes, c.islower())
        k = st['lower_wide'] if c.islower() else st['wide']
        w, strokes = round(w * k), [[(x * k, y * tall) for x, y in s] for s in strokes]
        pen = TTGlyphPen(None)
        polys = outlines(strokes, length, thick, st['nib_angle'])
        left = min(x for poly in polys for x, _ in poly)
        # Darkland Hand spaces by the drawing's width; the serif face by its ink, since serifs reach past it
        dx = st['side'] - left if serif else SIDE + reach
        for poly in polys:
            pen.moveTo((poly[0][0] + dx, poly[0][1]))
            for x, y in poly[1:]:
                pen.lineTo((x + dx, y))
            pen.closePath()
        glyphs[names[c]] = pen.glyph()
        right = max(x for poly in polys for x, _ in poly)
        metrics[names[c]] = (round(right - left) + 2 * st['side'] if serif else w + 2 * (SIDE + reach), left + dx)
    fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=asc + 80, descent=desc - 60)
    name = FAMILIES[family]
    fb.setupNameTable({'familyName': name, 'styleName': weight, 'uniqueFontIdentifier': f'{name} {weight}',
                       'fullName': f'{name} {weight}', 'psName': f'{family}-{weight}', 'version': 'Version 1.0',
                       'copyright': 'Copyright 2026, the Lone Wolf player project. SIL Open Font License 1.1.'})
    fb.setupOS2(sTypoAscender=asc + 80, sTypoDescender=desc - 60, usWinAscent=asc + 120, usWinDescent=-(desc - 100),
                sxHeight=round(480 * tall), sCapHeight=round(700 * tall), usWeightClass={'Thin': 200, 'Light': 300, 'Regular': 400, 'Bold': 700}[weight])
    fb.setupPost()
    fb.save(str(out))
    return out


def sheet(fonts, out):
    from PIL import Image, ImageDraw, ImageFont
    lines = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', "0123456789 .,'-/&()",
             'SOMMERLUND THE DARKLANDS', 'Naogizaga Point Vashna', 'The Kaltersee Gourdanak Mtns',
             'LOURDEN STONEWATCH', 'Slovarian Plain Forest of Ruel', 'SLOVIA SUENTINA FERRAR', 'Kakush Uplands R. Chah']
    im = Image.new('RGB', (1500, 90 * len(lines) * len(fonts) + 20), 'white')
    d = ImageDraw.Draw(im)
    y = 10
    for f in fonts:
        ft = ImageFont.truetype(str(f), 64)
        for t in lines:
            d.text((20, y), t, font=ft, fill='black')
            y += 90
    im.save(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('out', nargs='?', default=str(Path(__file__).parent / 'fonts'))
    ap.add_argument('--sheet')
    a = ap.parse_args()
    fonts = [build(w, Path(a.out) / f'{fam}-{w}.ttf', fam) for fam in FAMILIES for w in WEIGHTS]
    for f in fonts:
        print(f)
    if a.sheet:
        sheet(fonts, a.sheet)


if __name__ == '__main__':
    main()
