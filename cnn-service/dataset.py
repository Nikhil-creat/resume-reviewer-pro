"""Synthetic resume-page generator used to train the layout CNN.

Three visual classes (what matters for ATS parsing):
  0 ats_friendly  - single column, plain text blocks
  1 two_column    - sidebar + main column
  2 graphic_heavy - colour header band, photo circle, skill bars, icons
Pure numpy + Pillow (no torch) so it can be tested anywhere.
"""
import random
from typing import Tuple

import numpy as np
from PIL import Image, ImageDraw

CLASSES = ["ats_friendly", "two_column", "graphic_heavy"]
W, H = 128, 168  # model input size (A4-ish)


def _rgb(rng: random.Random, lo: int, hi: int) -> Tuple[int, int, int]:
    return (rng.randint(lo, hi), rng.randint(lo, hi), rng.randint(lo, hi))


def _text_lines(d: ImageDraw.ImageDraw, rng, x0, x1, y, n, ink, th=2, gap=5, short_last=True):
    for i in range(n):
        frac = rng.uniform(0.72, 1.0)
        if short_last and i == n - 1:
            frac = rng.uniform(0.3, 0.6)
        d.rectangle([x0, y, x0 + int((x1 - x0) * frac), y + th - 1], fill=ink)
        y += th + gap
    return y


def _heading(d, rng, x0, y, w, ink):
    d.rectangle([x0, y, x0 + w, y + 3], fill=ink)
    return y + 9


def _ats(rng, d):
    ink = _rgb(rng, 20, 90)
    m = rng.randint(10, 16)
    # name + contact line
    nx = m if rng.random() < 0.6 else W // 2 - 22
    d.rectangle([nx, 10, nx + rng.randint(34, 48), 16], fill=ink)
    d.rectangle([m, 20, W - m - rng.randint(0, 30), 21], fill=_rgb(rng, 110, 160))
    y = 30
    while y < H - 24:
        y = _heading(d, rng, m, y, rng.randint(22, 36), ink)
        y = _text_lines(d, rng, m, W - m, y, rng.randint(3, 6), _rgb(rng, 90, 150)) + 5
    return d


def _two_col(rng, d):
    ink = _rgb(rng, 20, 90)
    side_w = rng.randint(34, 48)
    left = rng.random() < 0.75
    tint = rng.choice([(236, 239, 245), (228, 234, 240), (245, 245, 245), (255, 255, 255)])
    sx0, sx1 = (0, side_w) if left else (W - side_w, W)
    mx0, mx1 = (side_w + 8, W - 8) if left else (8, W - side_w - 8)
    d.rectangle([sx0, 0, sx1, H], fill=tint)
    # sidebar: short blocks
    y = 14
    while y < H - 20:
        y = _heading(d, rng, sx0 + 5, y, rng.randint(12, side_w - 14), ink)
        for _ in range(rng.randint(3, 6)):
            d.rectangle([sx0 + 5, y, sx0 + 5 + rng.randint(10, side_w - 12), y + 1], fill=_rgb(rng, 100, 150))
            y += 6
        y += 6
    # main column
    d.rectangle([mx0, 10, mx0 + rng.randint(30, 44), 16], fill=ink)
    y = 26
    while y < H - 20:
        y = _heading(d, rng, mx0, y, rng.randint(20, 32), ink)
        y = _text_lines(d, rng, mx0, mx1, y, rng.randint(3, 5), _rgb(rng, 90, 150)) + 5
    return d


def _graphic(rng, d):
    brand = rng.choice([(37, 99, 235), (219, 39, 119), (234, 88, 12), (16, 185, 129), (124, 58, 237), (15, 23, 42)])
    # coloured header band
    d.rectangle([0, 0, W, rng.randint(34, 52)], fill=brand)
    # photo circle
    r = rng.randint(11, 16)
    cx = rng.choice([r + 10, W - r - 10])
    d.ellipse([cx - r, 8, cx + r, 8 + 2 * r], fill=(240, 240, 240), outline=(255, 255, 255), width=2)
    d.ellipse([cx - r // 2, 12, cx + r // 2, 12 + r], fill=(180, 190, 200))
    # sidebar with skill bars
    if rng.random() < 0.7:
        side = rng.randint(36, 46)
        x0 = 0 if rng.random() < 0.6 else W - side
        d.rectangle([x0, 56, x0 + side, H], fill=tuple(max(0, c - 40) for c in brand) if rng.random() < 0.6 else (30, 41, 59))
        y = 64
        while y < H - 12:
            d.rectangle([x0 + 5, y, x0 + side - 5, y + 4], fill=(255, 255, 255))
            d.rectangle([x0 + 5, y, x0 + 5 + int((side - 10) * rng.uniform(0.3, 1.0)), y + 4], fill=brand)
            y += 11
        mx0, mx1 = (side + 8, W - 8) if x0 == 0 else (8, W - side - 8)
    else:
        mx0, mx1 = 10, W - 10
    # icons / dots + text blocks
    y = 62
    while y < H - 20:
        d.ellipse([mx0, y - 1, mx0 + 6, y + 5], fill=brand)
        d.rectangle([mx0 + 10, y + 1, mx0 + 10 + rng.randint(18, 30), y + 3], fill=brand)
        y += 10
        y = _text_lines(d, rng, mx0, mx1, y, rng.randint(2, 4), _rgb(rng, 120, 170)) + 4
        if rng.random() < 0.5:  # progress bars / charts
            for _ in range(rng.randint(1, 3)):
                d.rounded_rectangle([mx0, y, mx1, y + 4], radius=2, fill=(226, 232, 240))
                d.rounded_rectangle([mx0, y, mx0 + int((mx1 - mx0) * rng.uniform(0.3, 0.95)), y + 4], radius=2, fill=brand)
                y += 8
    return d


_GEN = [_ats, _two_col, _graphic]


def make_image(label: int, rng: random.Random) -> Image.Image:
    img = Image.new("RGB", (W, H), (255, 255, 255) if rng.random() < 0.9 else (250, 250, 247))
    _GEN[label](rng, ImageDraw.Draw(img))
    arr = np.asarray(img).astype(np.float32)
    # scan-like noise / brightness jitter
    arr += np.random.default_rng(rng.randint(0, 10**9)).normal(0, rng.uniform(0, 5), arr.shape)
    arr = arr * rng.uniform(0.94, 1.03) + rng.uniform(-6, 6)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def make_dataset(n_per_class: int, seed: int = 0):
    rng = random.Random(seed)
    xs, ys = [], []
    for label in range(len(CLASSES)):
        for _ in range(n_per_class):
            xs.append(np.asarray(make_image(label, rng), dtype=np.uint8))
            ys.append(label)
    idx = list(range(len(xs)))
    rng.shuffle(idx)
    return np.stack([xs[i] for i in idx]), np.array([ys[i] for i in idx], dtype=np.int64)


def preprocess(img: Image.Image) -> np.ndarray:
    """PIL image -> float32 CHW array in [0,1], padded to page aspect then resized."""
    img = img.convert("RGB")
    w, h = img.size
    target = W / H
    if w / h > target:  # too wide -> pad height
        nh = int(w / target)
        canvas = Image.new("RGB", (w, nh), (255, 255, 255))
        canvas.paste(img, (0, 0))
        img = canvas
    elif w / h < target:
        nw = int(h * target)
        canvas = Image.new("RGB", (nw, h), (255, 255, 255))
        canvas.paste(img, (0, 0))
        img = canvas
    img = img.resize((W, H), Image.BILINEAR)
    return (np.asarray(img, dtype=np.float32) / 255.0).transpose(2, 0, 1)
