"""Layout analysis microservice: POST /analyze {image: dataURL|base64} -> heuristic features + CNN class probabilities."""
from __future__ import annotations

import base64
import io
import json
import os
from pathlib import Path

import numpy as np
from fastapi import FastAPI, HTTPException
from PIL import Image
from pydantic import BaseModel

from heuristics import analyze_gray, label_from

LABELS = ["ats_safe", "two_column", "table_heavy", "graphics_heavy"]
MODEL_DIR = Path(os.environ.get("MODEL_DIR", "weights"))
MAX_BYTES = 8 * 1024 * 1024
app = FastAPI(title="NEXUS resume layout service", version="2.0")
_session = None


def _load():
    global _session
    p = MODEL_DIR / "layout_cnn.onnx"
    if p.exists():
        try:
            import onnxruntime as ort
            _session = ort.InferenceSession(str(p), providers=["CPUExecutionProvider"])
        except Exception:  # noqa: BLE001 - run on heuristics only
            _session = None


_load()


class Req(BaseModel):
    image: str
    text_based: bool = True


@app.get("/health")
def health():
    return {"ok": True, "cnn": _session is not None}


@app.post("/analyze")
def analyze(req: Req):
    data = req.image.split(",", 1)[-1]
    if len(data) > MAX_BYTES * 4 // 3:
        raise HTTPException(413, "image too large")
    try:
        img = Image.open(io.BytesIO(base64.b64decode(data))).convert("L")
    except Exception:  # noqa: BLE001
        raise HTTPException(400, "invalid image")
    gray = np.asarray(img)
    h = analyze_gray(gray, req.text_based)
    out = {"heuristics": h, "label": label_from(h), "confidence": 0.7, "probs": None, "model": "heuristic"}
    if _session is not None:
        x = np.asarray(img.resize((128, 160), Image.BILINEAR), dtype=np.float32)[None, None] / 255.0
        logits = _session.run(None, {"page": x})[0][0]
        e = np.exp(logits - logits.max())
        p = e / e.sum()
        out.update(label=LABELS[int(p.argmax())], confidence=round(float(p.max()), 3), probs={k: round(float(v), 3) for k, v in zip(LABELS, p)}, model="cnn")
    return out
