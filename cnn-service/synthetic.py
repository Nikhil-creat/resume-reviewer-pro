"""Procedural resume page generator for training and testing the layout CNN (no dataset download needed).
Classes: 0 ats_safe (single column), 1 two_column (incl. sidebars), 2 table_heavy, 3 graphics_heavy."""
from __future__ import annotations

import random

import numpy as np
from PIL import Image, ImageDraw, ImageFont

LABELS = ["ats_safe", "two_column", "table_heavy", "graphics_heavy"]
WORDS = ("built designed python docker kubernetes api service data model pipeline team reduced improved latency users deployed testing cloud security "
         "agent retrieval vision network learning project skills experience education university engineer platform dashboard automation").split()
W, H = 600, 780


def _font(size: int):
    try:
        return ImageFont.load_default(size=size)
    except TypeError:  # old Pillow
        return ImageFont.load_default()


def _text_block(d: ImageDraw.ImageDraw, rng: random.Random, x0: int, x1: int, y0: int, y1: int, size: int):
    f = _font(size)
    y = y0
    while y < y1 - size:
        if rng.random() < 0.12:  # heading line
            d.text((x0, y), " ".join(rng.choices(WORDS, k=2)).upper(), fill=20, font=_font(size + 2))
            d.line((x0, y + size + 4, x1, y + size + 4), fill=60, width=1)
            y += size + 10
            continue
        line, w = [], 0
        while w < (x1 - x0) * rng.uniform(0.7, 1.0):
            word = rng.choice(WORDS)
            line.append(word)
            w += len(word) * size * 0.55 + size * 0.3
        d.text((x0, y), " ".join(line), fill=30, font=f)
        y += int(size * rng.uniform(1.35, 1.7))


def make_page(label: int, rng: random.Random) -> Image.Image:
    img = Image.new("L", (W, H), 255)
    d = ImageDraw.Draw(img)
    size = rng.choice([10, 11, 12])
    m = rng.randint(34, 70)
    top = rng.randint(30, 55)
    if label == 0:
        _text_block(d, rng, m, W - m, top, H - 40, size)
    elif label == 1:
        split = rng.choice([0.5, 0.5, 0.34, 0.66])
        gx = int(W * split)
        gap = rng.randint(26, 44)
        _text_block(d, rng, m // 2 + 10, gx - gap // 2, top, H - 40, size)
        _text_block(d, rng, gx + gap // 2, W - m // 2 - 10, top, H - 40, size)
    elif label == 2:
        _text_block(d, rng, m, W - m, top, rng.randint(180, 260), size)
        y0 = rng.randint(290, 330)
        rows, cols = rng.randint(4, 7), rng.randint(2, 4)
        rh, cw = rng.randint(34, 48), (W - 2 * m) // cols
        for r in range(rows + 1):
            d.line((m, y0 + r * rh, m + cols * cw, y0 + r * rh), fill=50, width=1)
        for c in range(cols + 1):
            d.line((m + c * cw, y0, m + c * cw, y0 + rows * rh), fill=50, width=1)
        for r in range(rows):
            for c in range(cols):
                d.text((m + c * cw + 5, y0 + r * rh + 8), " ".join(rng.choices(WORDS, k=2)), fill=30, font=_font(size))
        _text_block(d, rng, m, W - m, y0 + rows * rh + 20, H - 40, size)
    else:
        _text_block(d, rng, m + 60, W - m, top, H - 40, size)
        px = rng.randint(m - 10, m + 10)
        d.rectangle((px, top, px + rng.randint(90, 130), top + rng.randint(110, 150)), fill=rng.randint(60, 130))  # photo
        for i in range(rng.randint(3, 6)):  # skill bars
            y = 330 + i * 28
            d.rectangle((px, y, px + 150, y + 10), outline=40)
            d.rectangle((px, y, px + rng.randint(40, 150), y + 10), fill=40)
    arr = img
    if rng.random() < 0.5:
        arr = arr.rotate(rng.uniform(-1.0, 1.0), fillcolor=255)
    return arr


def make_dataset(n: int, seed: int = 0, size: tuple[int, int] = (128, 160)):
    rng = random.Random(seed)
    xs = np.zeros((n, 1, size[1], size[0]), dtype=np.float32)
    ys = np.zeros(n, dtype=np.int64)
    for i in range(n):
        lab = i % 4
        im = make_page(lab, rng).resize(size, Image.BILINEAR)
        a = np.asarray(im, dtype=np.float32) / 255.0
        a = np.clip(a + np.random.default_rng(seed + i).normal(0, 0.01, a.shape), 0, 1)
        xs[i, 0] = a
        ys[i] = lab
    return xs, ys
