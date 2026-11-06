# Python FastAPI AI Service Container
FROM python:3.11-slim

WORKDIR /workspace

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/workspace \
    FORM2FACT_ML_MODEL_VERSION="form2fact-hybrid-pairwise-v2.0-champion" \
    FORM2FACT_ML_WEIGHTS_PATH="/workspace/ai_service/ml/artifacts/v2/v2_calibrated_classifier_weights.pkl" \
    FORM2FACT_ML_CONFIG_PATH="/workspace/ai_service/ml/artifacts/v2/v2_model_config.json" \
    FORM2FACT_ML_ABSTENTION_THRESHOLD="0.60"

# Install curl for container healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /workspace/ai_service/requirements.txt
RUN pip install --no-cache-dir -r /workspace/ai_service/requirements.txt

# Copy complete ai_service module (app, ml, artifacts)
COPY . /workspace/ai_service/

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

CMD ["uvicorn", "ai_service.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
