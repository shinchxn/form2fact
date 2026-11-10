# =========================================================================
# Form2Fact AI Document Intelligence Microservice Containerfile
# =========================================================================

FROM python:3.11-slim AS runner

WORKDIR /workspace

# Install system dependencies including Tesseract OCR engine with Tamil and Hindi models
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-tam \
    tesseract-ocr-hin \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/workspace \
    PORT=8000 \
    WORKERS=2 \
    FORM2FACT_ML_MODEL_VERSION="form2fact-hybrid-pairwise-v2.0-champion" \
    FORM2FACT_ML_WEIGHTS_PATH="/workspace/ai_service/ml/artifacts/v2/v2_calibrated_classifier_weights.pkl" \
    FORM2FACT_ML_CONFIG_PATH="/workspace/ai_service/ml/artifacts/v2/v2_model_config.json" \
    FORM2FACT_ML_ABSTENTION_THRESHOLD="0.60"

# Create dedicated non-root service user and runtime directories
RUN groupadd -g 1000 appuser && \
    useradd -u 1000 -g appuser -m -s /bin/bash appuser && \
    mkdir -p /workspace/ai_service && \
    chown -R appuser:appuser /workspace

# Install Python dependencies
COPY requirements.txt /workspace/ai_service/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /workspace/ai_service/requirements.txt

# Copy complete application source, ML engine, and model assets
COPY --chown=appuser:appuser . /workspace/ai_service/

# Run as non-privileged service user
USER appuser

EXPOSE 8000

# Container health probe validating FastAPI endpoint and model status
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request, os; urllib.request.urlopen(f'http://localhost:{int(os.environ.get(\"PORT\", 8000))}/api/v1/health')" || exit 1

# Launch ASGI server respecting configurable PORT and WORKERS
CMD ["sh", "-c", "uvicorn ai_service.app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers ${WORKERS:-2}"]
