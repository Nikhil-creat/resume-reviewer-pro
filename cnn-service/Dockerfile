# Stage 1: train the CNN on synthetic pages and export ONNX
FROM python:3.11-slim AS train
WORKDIR /w
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && pip install --no-cache-dir numpy pillow onnx
COPY model.py synthetic.py train.py ./
RUN python train.py --out /out --epochs 8

# Stage 2: slim runtime (onnxruntime, no torch)
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1 MODEL_DIR=/app/weights
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && useradd -m svc
COPY heuristics.py app.py ./
COPY --from=train /out /app/weights
USER svc
EXPOSE 8000
HEALTHCHECK CMD python -c "import urllib.request;urllib.request.urlopen('http://localhost:8000/health')"
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
