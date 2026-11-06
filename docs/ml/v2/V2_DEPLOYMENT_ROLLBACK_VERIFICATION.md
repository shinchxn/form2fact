# Form2Fact V2 Deployment, DevOps & Rollback Verification Ledger

**Document ID:** `FORM2FACT-ML-V2-OPS-001`  
**Date:** November 2026  
**Auditor Role:** MLOps Auditor, Senior DevOps Engineer  
**Branch:** `feature/ml-pairwise-classifier-v2`  
**Container Context:** `ai_service/Dockerfile` & `infrastructure/docker-compose.yml`

---

## 1. Executive Summary & Verification Matrix

This audit validates container artifact packaging, startup checksum enforcement, model readiness lifecycle, and zero-downtime rollback procedures for Form2Fact Model V2.

| Check Description | Audit Verification Path | Verdict |
| :--- | :--- | :---: |
| **Docker Container Packaging** | `ai_service/Dockerfile` structural inspection | **PASS** |
| **Dependency Pinning** | `ai_service/requirements.txt` explicit bounds | **PASS** |
| **Startup Checksum Enforcement** | Cryptographic SHA-256 calculation at engine boot | **PASS** |
| **Corruption & Tamper Rejection** | `test_corrupted_model_artifact_rejection` | **PASS** |
| **Healthcheck Configuration** | `GET /api/v1/health` with `curl -f` validation | **PASS** |
| **Documented V1 Rollback** | `test_v1_rollback_execution` | **PASS** |
| **V2 Restoration Procedure** | Configuration reinstatement verified | **PASS** |

---

## 2. Docker Container Packaging Audit

### 2.1 Dockerfile Inspection (`ai_service/Dockerfile`)
The updated container specification addresses previous packaging omissions:
- **Base OS Image:** `python:3.11-slim` — lightweight, minimal security attack surface.
- **System Utilities:** Installs `curl` to enable reliable Docker container healthcheck probes.
- **Dependency Pinning (`ai_service/requirements.txt`):**
  - `fastapi>=0.110.0,<0.136.0`
  - `pydantic>=2.6.0,<3.0.0`
  - `uvicorn>=0.28.0,<1.0.0`
  - `numpy>=1.26.0,<3.0.0`
  - `python-multipart>=0.0.9`
  - `scikit-learn>=1.4.0,<2.0.0`
  - `scipy>=1.12.0,<2.0.0`
  - `torch>=2.0.0,<3.0.0`
  - `sentence-transformers>=2.5.0,<7.0.0`
- **Module Inclusion:** Copies the entire `ai_service/` tree (`app/`, `ml/`, `artifacts/`) into `/workspace/ai_service/` and sets `PYTHONPATH=/workspace`.
- **Startup Command:** `CMD ["uvicorn", "ai_service.app.main:app", "--host", "0.0.0.0", "--port", "8000"]`.

---

## 3. Startup Checksum Enforcement & Failure Modes

### 3.1 Startup Checksum Verification
At startup, `MLPairwiseInferenceEngine._load_artifacts()` reads the model artifact file bytes and calculates its SHA-256 digest:
- **Loaded Checksum:** `9560d165b8c46078f1d6fcbaf6d09dc1fe5069078272129f6c808b27e786bdba`
- **Configured Matching:** If `FORM2FACT_ML_EXPECTED_CHECKSUM` is defined in the environment, the engine validates equivalence. On mismatch, the engine aborts loading, leaves `self.clf = None`, and sets `self.checksum_verified = False`.

### 3.2 Corrupted Artifact & Readiness Failure
- **Test Evidence (`test_corrupted_model_artifact_rejection`):** When presented with corrupted bytes, the engine catches deserialization errors safely, sets `self.clf = None`, and reports `is_ready() == False`.
- **HTTP 503 Guard (`test_fastapi_http_503_when_unready`):** When the engine is unready, incoming requests to `/api/v1/classify-pair`, `/api/v1/ml/classify-pair`, and `/api/v1/batch-classify` immediately return `HTTP 503 Service Unavailable`, preventing any unverified or silent heuristic fallback. — **PASS**

---

## 4. Documented V1 Rollback Procedure

In the event of an operational anomaly in production, the system supports instant rollback to Model V1 with zero database downtime.

### 4.1 Rollback Execution Steps
1. Update environment variables in container deployment:
   ```bash
   FORM2FACT_ML_MODEL_VERSION="form2fact-hybrid-pairwise-v1.0-ml"
   FORM2FACT_ML_WEIGHTS_PATH="ai_service/ml/artifacts/pairwise_classifier_weights.pkl"
   FORM2FACT_ML_CONFIG_PATH="ai_service/ml/artifacts/model_config.json"
   FORM2FACT_ML_ABSTENTION_THRESHOLD="0.75"
   ```
2. Restart the AI service container:
   ```bash
   docker compose restart ai-service
   ```
3. Verification:
   Automated unit test `test_v1_rollback_execution` verifies that V1 loads cleanly:
   - `v1_engine.is_ready() == True`
   - `v1_engine.is_calibrated == False`
   - `v1_engine.temperature == 1.0`
   - Executes 5-class pairwise classification conforming to existing API schemas. — **PASS**

### 4.2 Restoring Model V2 After Rollback
To restore Model V2 once verified:
```bash
FORM2FACT_ML_MODEL_VERSION="form2fact-hybrid-pairwise-v2.0-champion"
FORM2FACT_ML_WEIGHTS_PATH="ai_service/ml/artifacts/v2/v2_calibrated_classifier_weights.pkl"
FORM2FACT_ML_CONFIG_PATH="ai_service/ml/artifacts/v2/v2_model_config.json"
FORM2FACT_ML_ABSTENTION_THRESHOLD="0.60"
docker compose restart ai-service
```

