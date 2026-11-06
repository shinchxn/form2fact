# =========================================================================
# Form2Fact AI Document Intelligence Microservice Containerfile
# =========================================================================

FROM python:3.11-slim AS runner

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    WORKERS=2 \
    MODEL_PATH=/app/models \
    MODEL_VERSION=v1.0.0

# Create dedicated non-root service user and runtime directories
RUN groupadd -g 1000 appuser && \
    useradd -u 1000 -g appuser -m -s /bin/bash appuser && \
    mkdir -p /app/models && \
    chown -R appuser:appuser /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source and model assets
COPY --chown=appuser:appuser app/ ./app/
COPY --chown=appuser:appuser models/ ./models/

# Run as non-privileged service user
USER appuser

# Declare persistent storage mount point for versioned models
VOLUME ["/app/models"]

EXPOSE 8000

# Container health probe validating FastAPI endpoint and model status
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen(f'http://localhost:{int(__import__(\"os\").environ.get(\"PORT\", 8000))}/api/v1/health')" || exit 1

# Launch ASGI server respecting configurable PORT and WORKERS
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers ${WORKERS:-2}"]
