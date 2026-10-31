"""FastAPI microservice: classify the visual layout of a resume page (PDF first page or image)."""
import io
import os
from contextlib import asynccontextmanager

import numpy as np
import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image

from dataset import CLASSES, preprocess
from model import LayoutCNN

MODEL_PATH = os.environ.get("MODEL_PATH", "model.pt")
MAX_BYTES = int(os.environ.get("MAX_UPLOAD_MB", "8")) * 1024 * 1024
state = {"model": None, "val_acc": None}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if os.path.exists(MODEL_PATH):
        ckpt = torch.load(MODEL_PATH, map_location="cpu", weights_only=True)
        m = LayoutCNN(len(CLASSES))
        m.load_state_dict(ckpt["state"])
        m.eval()
        state["model"], state["val_acc"] = m, ckpt.get("val_acc")
    yield


app = FastAPI(title="Resume layout CNN", version="1.0.0", lifespan=lifespan, docs_url=None, redoc_url=None)


def load_page(data: bytes) -> Image.Image:
    if data[:4] == b"%PDF":
        import pypdfium2 as pdfium

        pdf = pdfium.PdfDocument(data)
        if len(pdf) == 0:
            raise HTTPException(422, "Empty PDF")
        return pdf[0].render(scale=1.0).to_pil()
    if data[:8] == b"\x89PNG\r\n\x1a\n" or data[:3] == b"\xff\xd8\xff":
        img = Image.open(io.BytesIO(data))
        img.load()
        return img
    raise HTTPException(415, "Only PDF, PNG or JPEG are supported")


@app.get("/health")
def health():
    return {"ok": True, "model_loaded": state["model"] is not None, "val_acc": state["val_acc"]}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if state["model"] is None:
        raise HTTPException(503, "Model not trained yet. Run: python train.py")
    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "File too large")
    try:
        page = load_page(data)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, "Could not read the document")
    x = torch.from_numpy(preprocess(page)).unsqueeze(0)
    with torch.no_grad():
        probs = torch.softmax(state["model"](x), dim=1)[0].numpy()
    i = int(np.argmax(probs))
    return {
        "label": CLASSES[i],
        "confidence": round(float(probs[i]), 4),
        "probs": {c: round(float(p), 4) for c, p in zip(CLASSES, probs)},
    }
