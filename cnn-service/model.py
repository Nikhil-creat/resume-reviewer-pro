"""Small CNN that classifies a resume page image into ATS layout classes."""
from __future__ import annotations

import torch
import torch.nn as nn

LABELS = ["ats_safe", "two_column", "table_heavy", "graphics_heavy"]


def block(cin: int, cout: int) -> nn.Sequential:
    return nn.Sequential(nn.Conv2d(cin, cout, 3, padding=1, bias=False), nn.BatchNorm2d(cout), nn.ReLU(inplace=True), nn.MaxPool2d(2))


class LayoutCNN(nn.Module):
    def __init__(self, n_classes: int = len(LABELS)) -> None:
        super().__init__()
        self.features = nn.Sequential(block(1, 16), block(16, 32), block(32, 64), block(64, 96))
        self.head = nn.Sequential(nn.AdaptiveAvgPool2d(1), nn.Flatten(), nn.Dropout(0.2), nn.Linear(96, n_classes))

    def forward(self, x: torch.Tensor) -> torch.Tensor:  # x: (B,1,160,128) in [0,1]
        return self.head(self.features(x))
