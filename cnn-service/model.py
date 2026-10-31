import torch
import torch.nn as nn


class LayoutCNN(nn.Module):
    """Small 3-block CNN: ~110k parameters, trains on CPU in about a minute."""

    def __init__(self, n_classes: int = 3):
        super().__init__()

        def block(i, o):
            return nn.Sequential(
                nn.Conv2d(i, o, 3, padding=1, bias=False),
                nn.BatchNorm2d(o),
                nn.ReLU(inplace=True),
                nn.MaxPool2d(2),
            )

        self.features = nn.Sequential(block(3, 16), block(16, 32), block(32, 64))
        self.pool = nn.AdaptiveAvgPool2d((4, 4))
        self.head = nn.Sequential(nn.Flatten(), nn.Dropout(0.25), nn.Linear(64 * 16, 64), nn.ReLU(inplace=True), nn.Linear(64, n_classes))

    def forward(self, x):
        return self.head(self.pool(self.features(x)))
