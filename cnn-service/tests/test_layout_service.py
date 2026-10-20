"""Run: python -m pytest cnn-service/tests  (or: python cnn-service/tests/test_layout_service.py)"""
import random
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from heuristics import analyze_gray, label_from  # noqa: E402
from synthetic import LABELS, make_dataset, make_page  # noqa: E402


def test_dataset_shapes_and_balance():
    x, y = make_dataset(16, seed=3)
    assert x.shape == (16, 1, 160, 128) and set(y.tolist()) == {0, 1, 2, 3}
    assert 0.0 <= x.min() and x.max() <= 1.0


def test_heuristics_separate_the_four_layouts():
    rng = random.Random(11)
    hits = {k: 0 for k in range(4)}
    n = 12
    for lab in range(4):
        for _ in range(n):
            g = np.asarray(make_page(lab, rng))
            hits[lab] += LABELS.index(label_from(analyze_gray(g))) == lab
    acc = {LABELS[k]: v / n for k, v in hits.items()}
    assert acc["two_column"] >= 0.8 and acc["table_heavy"] >= 0.8 and acc["graphics_heavy"] >= 0.8 and acc["ats_safe"] >= 0.8, acc


if __name__ == "__main__":
    test_dataset_shapes_and_balance()
    test_heuristics_separate_the_four_layouts()
    print("ok")
