"""Train the layout CNN on synthetic pages.   python train.py [--per-class 700] [--epochs 8]"""
import argparse
import time

import numpy as np
import torch
import torch.nn as nn

from dataset import CLASSES, make_dataset
from model import LayoutCNN


def to_tensor(x: np.ndarray) -> torch.Tensor:
    return torch.from_numpy(x.astype(np.float32) / 255.0).permute(0, 3, 1, 2).contiguous()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-class", type=int, default=700)
    ap.add_argument("--epochs", type=int, default=8)
    ap.add_argument("--out", default="model.pt")
    args = ap.parse_args()

    torch.manual_seed(0)
    np.random.seed(0)
    t0 = time.time()
    xtr, ytr = make_dataset(args.per_class, seed=1)
    xva, yva = make_dataset(max(60, args.per_class // 5), seed=2)  # different seed => unseen pages
    xtr, xva = to_tensor(xtr), to_tensor(xva)
    ytr, yva = torch.from_numpy(ytr), torch.from_numpy(yva)
    print(f"data: train={len(xtr)} val={len(xva)} ({time.time() - t0:.1f}s)")

    model = LayoutCNN(len(CLASSES))
    opt = torch.optim.AdamW(model.parameters(), lr=2e-3, weight_decay=1e-4)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=3e-3, total_steps=args.epochs * ((len(xtr) + 63) // 64))
    loss_fn = nn.CrossEntropyLoss()

    best = 0.0
    for ep in range(1, args.epochs + 1):
        model.train()
        perm = torch.randperm(len(xtr))
        for i in range(0, len(xtr), 64):
            idx = perm[i : i + 64]
            opt.zero_grad()
            loss = loss_fn(model(xtr[idx]), ytr[idx])
            loss.backward()
            opt.step()
            sched.step()
        model.eval()
        with torch.no_grad():
            pred = torch.cat([model(xva[i : i + 128]).argmax(1) for i in range(0, len(xva), 128)])
        acc = (pred == yva).float().mean().item()
        print(f"epoch {ep}/{args.epochs}  loss={loss.item():.3f}  val_acc={acc:.3f}")
        if acc >= best:
            best = acc
            torch.save({"state": model.state_dict(), "classes": CLASSES, "val_acc": acc}, args.out)
    print(f"saved {args.out}  best_val_acc={best:.3f}  total {time.time() - t0:.0f}s")
    print("NOTE: trained on synthetic layouts - retrain on real labelled resumes for production use.")


if __name__ == "__main__":
    main()
