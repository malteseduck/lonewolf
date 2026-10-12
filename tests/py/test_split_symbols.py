"""split_symbols.py: cutting a sheet of drawn symbols into single symbols and contact sheets.
Sheets are white (or black) pages with filled blocks the test draws."""
import json
import sys

import cv2
import numpy as np
import pytest

import split_symbols as ss


def page(w=400, h=300, bg=255):
    return np.full((h, w, 3), bg, np.uint8)


def block(im, x, y, w, h, col=0):
    im[y:y + h, x:x + w] = col


def save(path, im):
    cv2.imencode('.png', im)[1].tofile(str(path))


# ---- read_colour --------------------------------------------------------------------------

def test_read_colour_of_a_colour_png(tmp_path):
    im = np.random.RandomState(1).randint(0, 255, (10, 12, 3)).astype(np.uint8)
    save(tmp_path / 'a.png', im)
    out = ss.read_colour(tmp_path / 'a.png')
    assert out.shape == (10, 12, 3) and (out == im).all()


def test_read_colour_promotes_grey_to_three_channels(tmp_path):
    g = np.full((6, 8), 90, np.uint8)
    cv2.imencode('.png', g)[1].tofile(str(tmp_path / 'g.png'))
    out = ss.read_colour(tmp_path / 'g.png')
    assert out.shape == (6, 8, 3) and (out == 90).all()


def test_read_colour_flattens_transparency_onto_white(tmp_path):
    rgba = np.zeros((4, 4, 4), np.uint8)
    rgba[:, :2] = (0, 0, 0, 255)       # left half opaque black
    rgba[:, 2:] = (0, 0, 0, 0)         # right half fully transparent
    cv2.imencode('.png', rgba)[1].tofile(str(tmp_path / 't.png'))
    out = ss.read_colour(tmp_path / 't.png')
    assert out.shape == (4, 4, 3)
    assert (out[:, :2] == 0).all() and (out[:, 2:] == 255).all()


def test_read_colour_half_transparent_blends_towards_white(tmp_path):
    rgba = np.zeros((2, 2, 4), np.uint8)
    rgba[..., 3] = 128
    cv2.imencode('.png', rgba)[1].tofile(str(tmp_path / 'h.png'))
    out = ss.read_colour(tmp_path / 'h.png')
    assert 120 <= out[0, 0, 0] <= 135


def test_read_colour_raises_on_a_file_that_is_not_an_image(tmp_path):
    (tmp_path / 'x.png').write_bytes(b'nope')
    with pytest.raises(ValueError):
        ss.read_colour(tmp_path / 'x.png')


# ---- find_boxes ---------------------------------------------------------------------------

def test_finds_each_symbol_in_reading_order():
    im = page()
    block(im, 250, 20, 40, 40)      # top right
    block(im, 40, 22, 40, 40)       # top left (a few px lower: same band)
    block(im, 100, 200, 30, 50)     # lower row
    boxes = ss.find_boxes(im, 1.0)
    assert [(b[0], b[1], b[2], b[3]) for b in boxes] == [(40, 22, 40, 40), (250, 20, 40, 40), (100, 200, 30, 50)]


def test_boxes_are_the_tight_ink_bounds_not_the_dilated_ones():
    im = page()
    block(im, 60, 60, 25, 35)
    (x, y, w, h, texty), = ss.find_boxes(im, 1.0)
    assert (x, y, w, h) == (60, 60, 25, 35)
    assert texty is False


def test_strokes_of_one_symbol_merge_into_one_box():
    im = page()
    block(im, 100, 100, 20, 20)
    block(im, 123, 100, 20, 20)     # 3 px gap, closed by the dilation (k = 4 on a 300 px page)
    boxes = ss.find_boxes(im, 1.0)
    assert len(boxes) == 1 and boxes[0][2] == 43


def test_merge_scale_controls_how_far_apart_strokes_still_join():
    im = page(800, 800)
    block(im, 100, 100, 20, 20)
    block(im, 133, 100, 20, 20)     # 13 px gap; k = round(800 * 0.012) = 10
    assert len(ss.find_boxes(im, 1.0)) == 2
    assert len(ss.find_boxes(im, 2.0)) == 1


def test_specks_under_twelve_px_are_dropped():
    im = page()
    block(im, 50, 50, 8, 8)         # both sides small
    block(im, 150, 50, 10, 11)      # both under 12
    block(im, 250, 50, 40, 40)
    assert len(ss.find_boxes(im, 1.0)) == 1


def test_thin_lines_are_dropped_if_either_side_is_under_twelve():
    im = page()
    block(im, 50, 100, 80, 6)       # a rule: long, 6 px tall
    block(im, 50, 150, 5, 60)       # a stick
    block(im, 250, 50, 40, 40)
    boxes = ss.find_boxes(im, 1.0)
    assert [b[0] for b in boxes] == [250]


def test_a_whole_panel_blob_is_dropped():
    im = page(500, 500)
    block(im, 20, 20, 300, 300)     # 36% of the page: over the 25% limit
    block(im, 380, 380, 40, 40)
    boxes = ss.find_boxes(im, 1.0)
    assert [(b[0], b[1]) for b in boxes] == [(380, 380)]


def test_texty_marks_wide_short_boxes():
    im = page(1000, 1000)
    block(im, 100, 100, 120, 15)    # 15 px tall (<20 = 2% of h), 8:1: a caption line
    block(im, 100, 300, 80, 80)
    boxes = {b[1]: b for b in ss.find_boxes(im, 1.0)}
    assert boxes[100][4] is True
    assert boxes[300][4] is False


def test_texty_needs_both_shortness_and_a_wide_ratio():
    im = page(1000, 1000)
    block(im, 100, 100, 40, 15)     # short but only 2.7:1
    block(im, 100, 300, 120, 40)    # wide but taller than 2% of the page
    assert all(b[4] is False for b in ss.find_boxes(im, 1.0))


def test_light_on_dark_sheets_work_too():
    im = page(bg=0)
    block(im, 40, 22, 40, 40, 255)
    block(im, 250, 20, 40, 40, 255)
    boxes = ss.find_boxes(im, 1.0)
    assert [(b[0], b[1], b[2], b[3]) for b in boxes] == [(40, 22, 40, 40), (250, 20, 40, 40)]


def test_blank_page_has_no_symbols():
    assert ss.find_boxes(page(), 1.0) == []


def test_reading_order_bands_rows_by_two_percent_of_the_height():
    im = page(400, 1000)            # band = 20 px
    block(im, 300, 100, 30, 30)     # y 100 -> band 5
    block(im, 50, 110, 30, 30)      # y 110 -> band 5: same row, so left of the first
    block(im, 50, 200, 30, 30)      # y 200 -> band 10: next row
    assert [(b[0], b[1]) for b in ss.find_boxes(im, 1.0)] == [(50, 110), (300, 100), (50, 200)]


def test_box_values_are_plain_python_numbers():
    im = page()
    block(im, 60, 60, 25, 35)
    box = ss.find_boxes(im, 1.0)[0]
    json.dumps(box)                  # numpy ints would raise here
    assert all(type(v) in (int, bool) for v in box)


# ---- make_sheets --------------------------------------------------------------------------

def crops(n, h=30, w=40):
    return [(i + 1, np.full((h, w, 3), 50, np.uint8)) for i in range(n)]


def sheet_img(path):
    return cv2.imdecode(np.fromfile(str(path), np.uint8), cv2.IMREAD_COLOR)


def test_one_sheet_for_a_few_crops(tmp_path):
    names = ss.make_sheets(crops(3), tmp_path, 'stem')
    assert names == ['stem_sheet.png']
    img = sheet_img(tmp_path / 'stem_sheet.png')
    # 11 columns of 130 + 8 gutter; one row of 120 + 16 label + 8 gap, plus the top gutter
    assert img.shape == (8 + 144, 8 + 11 * 138, 3)


def test_crops_are_scaled_to_fit_the_120_px_cell_and_numbered(tmp_path):
    ss.make_sheets([(7, np.full((240, 60, 3), 0, np.uint8))], tmp_path, 's')
    img = sheet_img(tmp_path / 's_sheet.png')
    cell = img[8:8 + 120, 8:8 + 130]
    dark = (cell.sum(-1) == 0)
    assert dark.sum() > 0
    ys, xs = np.nonzero(dark)
    assert ys.max() - ys.min() + 1 == 120 and xs.max() - xs.min() + 1 == 30   # 240x60 -> 120x30
    assert (img[8 + 120:8 + 136, 8:8 + 20] < 255).any()                       # the number below


def test_small_crops_are_enlarged_at_most_twofold(tmp_path):
    ss.make_sheets([(1, np.full((10, 20, 3), 0, np.uint8))], tmp_path, 's')
    img = sheet_img(tmp_path / 's_sheet.png')
    ys, xs = np.nonzero(img[8:128, 8:138].sum(-1) == 0)
    assert xs.max() - xs.min() + 1 == 40 and ys.max() - ys.min() + 1 == 20


def test_cells_fill_rows_left_to_right_eleven_to_a_row(tmp_path):
    ss.make_sheets(crops(12), tmp_path, 's')
    img = sheet_img(tmp_path / 's_sheet.png')
    assert img.shape[0] == 8 + 2 * 144
    # the twelfth crop starts the second row, in column 0
    row2 = img[8 + 144:8 + 144 + 120, 8:8 + 130]
    assert (row2.sum(-1) < 3 * 255).any()
    assert not (img[8 + 144:8 + 144 + 120, 8 + 138:8 + 2 * 138] < 255).any()


def test_a_long_run_of_crops_splits_into_numbered_sheets(tmp_path):
    # 16 rows of 11 per sheet = 176 cells
    names = ss.make_sheets(crops(177, 10, 10), tmp_path, 'big')
    assert names == ['big_sheet1.png', 'big_sheet2.png']
    first, second = sheet_img(tmp_path / 'big_sheet1.png'), sheet_img(tmp_path / 'big_sheet2.png')
    assert first.shape[0] == 8 + 16 * 144
    assert second.shape[0] == 8 + 1 * 144


def test_exactly_one_full_sheet_is_not_split(tmp_path):
    assert ss.make_sheets(crops(176, 10, 10), tmp_path, 'full') == ['full_sheet.png']


def test_no_crops_still_makes_an_empty_sheet(tmp_path):
    names = ss.make_sheets([], tmp_path, 'none')
    assert names == ['none_sheet.png']
    img = sheet_img(tmp_path / 'none_sheet.png')
    assert img.shape[0] == 8 and (img == 255).all()


# ---- main ---------------------------------------------------------------------------------

def run(monkeypatch, *args):
    monkeypatch.setattr(sys, 'argv', ['split_symbols.py', *map(str, args)])
    ss.main()


def test_main_splits_each_sheet_and_writes_the_index(tmp_path, monkeypatch, capsys):
    inp, out = tmp_path / 'in', tmp_path / 'out'
    inp.mkdir()
    im = page()
    block(im, 40, 22, 40, 40)
    block(im, 250, 20, 40, 40)
    save(inp / 'trees.png', im)
    run(monkeypatch, inp, out)
    index = json.loads((out / 'index.json').read_text(encoding='utf-8'))
    assert index == {'trees': [{'n': 1, 'box': [40, 22, 40, 40], 'texty': False},
                               {'n': 2, 'box': [250, 20, 40, 40], 'texty': False}]}
    assert (out / 'trees' / '1.png').exists() and (out / 'trees' / '2.png').exists()
    assert (out / 'trees_sheet.png').exists()
    assert 'trees.png: 2 symbols, 0 texty; trees_sheet.png' in capsys.readouterr().out


def test_main_crops_with_four_px_of_margin_clamped_to_the_page(tmp_path, monkeypatch):
    inp, out = tmp_path / 'in', tmp_path / 'out'
    inp.mkdir()
    im = page()
    block(im, 2, 100, 30, 30)       # 2 px from the left edge
    save(inp / 's.png', im)
    run(monkeypatch, inp, out)
    crop = sheet_img(out / 's' / '1.png')
    assert crop.shape == (30 + 8, 2 + 30 + 4, 3)    # left margin clamped to 2, others 4


def test_main_skips_non_image_files_and_reports_unreadable_ones_without_stopping(tmp_path, monkeypatch, capsys):
    inp, out = tmp_path / 'in', tmp_path / 'out'
    inp.mkdir()
    (inp / 'notes.txt').write_text('hello')
    (inp / 'broken.png').write_bytes(b'not a picture')
    im = page()
    block(im, 40, 22, 40, 40)
    save(inp / 'good.png', im)
    run(monkeypatch, inp, out)
    cap = capsys.readouterr()
    assert 'ERROR broken.png: could not decode image' in cap.err
    index = json.loads((out / 'index.json').read_text(encoding='utf-8'))
    assert list(index) == ['good']
    assert not (out / 'notes').exists()


def test_main_handles_an_extension_in_capitals(tmp_path, monkeypatch):
    inp, out = tmp_path / 'in', tmp_path / 'out'
    inp.mkdir()
    im = page()
    block(im, 40, 22, 40, 40)
    save(inp / 'a.png', im)
    (inp / 'a.png').rename(inp / 'A.PNG')
    run(monkeypatch, inp, out)
    assert 'A' in json.loads((out / 'index.json').read_text(encoding='utf-8'))


def test_main_counts_texty_symbols(tmp_path, monkeypatch, capsys):
    inp, out = tmp_path / 'in', tmp_path / 'out'
    inp.mkdir()
    im = page(1000, 1000)
    block(im, 100, 100, 120, 15)
    block(im, 100, 300, 80, 80)
    save(inp / 'm.png', im)
    run(monkeypatch, inp, out)
    assert '2 symbols, 1 texty' in capsys.readouterr().out


def test_main_makes_the_output_folder_and_an_empty_index_for_an_empty_input(tmp_path, monkeypatch):
    inp, out = tmp_path / 'in', tmp_path / 'deep' / 'out'
    inp.mkdir()
    run(monkeypatch, inp, out)
    assert json.loads((out / 'index.json').read_text(encoding='utf-8')) == {}


def test_main_merge_option_reaches_find_boxes(tmp_path, monkeypatch):
    inp, out = tmp_path / 'in', tmp_path / 'out'
    inp.mkdir()
    im = page(800, 800)
    block(im, 100, 100, 20, 20)
    block(im, 133, 100, 20, 20)
    save(inp / 'p.png', im)
    run(monkeypatch, inp, out)
    assert len(json.loads((out / 'index.json').read_text())['p']) == 2
    run(monkeypatch, inp, out, '--merge', 2)
    assert len(json.loads((out / 'index.json').read_text())['p']) == 1


def test_main_numbers_symbols_from_one_in_reading_order(tmp_path, monkeypatch):
    inp, out = tmp_path / 'in', tmp_path / 'out'
    inp.mkdir()
    im = page()
    block(im, 250, 20, 20, 20)
    block(im, 40, 22, 30, 30)
    save(inp / 'p.png', im)
    run(monkeypatch, inp, out)
    first = sheet_img(out / 'p' / '1.png')
    assert first.shape[:2] == (30 + 8, 30 + 8)       # the left (larger) block is number 1
