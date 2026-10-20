"""Rule-based resume layout analysis (columns, tables, graphics, margins). Port of lib/layout.js; always available,
used as the fallback and as a feature extractor next to the CNN."""
from __future__ import annotations

import cv2
import numpy as np

GW, GH = 160, 208


def analyze_gray(gray: np.ndarray, text_based: bool = True) -> dict:
    gray = gray.astype(np.uint8)
    dens = cv2.resize((gray < 170).astype(np.float32), (GW, GH), interpolation=cv2.INTER_AREA)
    ink = dens > 0.08
    total = int(ink.sum())
    if total == 0:
        return dict(columns=1, hasTables=False, hasGraphics=False, marginsOk=True, textBased=text_based, inkDensity=0.0, blank=True, risk=0.5)
    ys, xs = np.nonzero(ink)
    left, right, top = xs.min() / GW, 1 - (xs.max() + 1) / GW, ys.min() / GH
    margins_ok = bool(left >= 0.03 and right >= 0.03 and top >= 0.015 and left <= 0.3 and right <= 0.3)

    bands, band_h = 14, GH // 14
    with_text = with_gutter = 0
    lo, hi, min_gap = int(GW * 0.2), int(GW * 0.8), int(GW * 0.035)
    for b in range(bands):
        block = ink[b * band_h:(b + 1) * band_h]
        col = block.sum(axis=0)
        band_ink = int(col.sum())
        if band_ink < GW * 0.15:
            continue
        with_text += 1
        run = 0
        found = False
        for x in range(lo, hi + 1):
            if col[x] == 0:
                run += 1
                if run >= min_gap:
                    start = x - run + 1
                    if col[:start].sum() > band_ink * 0.12 and col[x + 1:].sum() > band_ink * 0.12:
                        found = True
                        break
            else:
                run = 0
        with_gutter += found
    columns = 2 if with_text >= 4 and with_gutter / with_text >= 0.45 else 1

    def longest_run(v: np.ndarray) -> int:
        best = cur = 0
        for e in v:
            cur = cur + 1 if e else 0
            best = max(best, cur)
        return best

    line = ink & (dens <= 0.7)  # filled blocks are not rules
    h_rows = [y for y in range(GH) if longest_run(line[y]) >= GW * 0.5]
    v_cols = [x for x in range(GW) if longest_run(line[:, x]) >= GH * 0.07]
    crossings = sum(1 for y in h_rows for x in v_cols if line[y, x])
    h_lines, v_lines = len(h_rows), len(v_cols)
    has_tables = h_lines >= 3 and v_lines >= 2 and crossings >= 4
    has_graphics = bool((dens > 0.7).mean() > 0.012)
    risk = min(1.0, (0.4 if columns > 1 else 0) + (0.3 if has_tables else 0) + (0.2 if has_graphics else 0) + (0 if margins_ok else 0.1) + (0 if text_based else 0.3))
    return dict(columns=columns, hasTables=has_tables, hasGraphics=has_graphics, marginsOk=margins_ok, textBased=text_based,
                inkDensity=round(total / (GW * GH), 3), hLines=h_lines, vLines=v_lines, risk=round(risk, 2))


def label_from(h: dict) -> str:
    if h.get("hasGraphics"):
        return "graphics_heavy"
    if h.get("hasTables"):
        return "table_heavy"
    if h.get("columns", 1) > 1:
        return "two_column"
    return "ats_safe"
