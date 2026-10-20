"""Train the layout CNN on procedurally generated resume pages and export ONNX.
    python train.py --out ./weights --epochs 8
Trained on synthetic pages only: treat accuracy as a sanity check, and fine-tune on real resumes for production."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F

from model import LABELS, LayoutCNN
from synthetic import make_dataset


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="weights")
    ap.add_argument("--epochs", type=int, default=8)
    ap.add_argument("--train", type=int, default=1600)
    ap.add_argument("--val", type=int, default=400)
    a = ap.parse_args()
    torch.manual_seed(0)
    xt, yt = make_dataset(a.train, seed=1)
    xv, yv = make_dataset(a.val, seed=99999)
    xt, yt, xv, yv = map(torch.from_numpy, (xt, yt, xv, yv))
    model = LayoutCNN()
    opt = torch.optim.Adam(model.parameters(), lr=2e-3)
    for ep in range(a.epochs):
        model.train()
        perm = torch.randperm(len(xt))
        for i in range(0, len(xt), 32):
            idx = perm[i:i + 32]
            loss = F.cross_entropy(model(xt[idx]), yt[idx])
            opt.zero_grad()
            loss.backward()
            opt.step()
        model.eval()
        with torch.no_grad():
            acc = (model(xv).argmax(1) == yv).float().mean().item()
        print(f"epoch {ep + 1}/{a.epochs} loss {loss.item():.3f} val_acc {acc:.3f}", flush=True)
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), out / "layout_cnn.pt")
    torch.onnx.export(model, torch.zeros(1, 1, 160, 128), str(out / "layout_cnn.onnx"), input_names=["page"], output_names=["logits"], dynamic_axes={"page": {0: "b"}}, opset_version=17)
    (out / "labels.json").write_text(json.dumps(LABELS))
    print("saved", out)


if __name__ == "__main__":
    main()
