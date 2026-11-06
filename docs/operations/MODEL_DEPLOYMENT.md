# Form2Fact MLOps Model Deployment & Version Management

**Reference:** F2F-OPS-MLOPS-2026  
**Audience:** MLOps Engineers, ML Trainers (Person 1), Backend Engineers

---

## 1. MLOPS ROLE DIVISION & BOUNDARIES

To ensure clean engineering separation:

| Responsibility Area | Owner | Deliverable |
|---|---|---|
| **Model Training & Dataset Evaluation** | **Person 1 (ML Trainer)** | Benchmark dataset, trained weights/rules, evaluation metrics, taxonomy compliance. |
| **Model Artifact Packaging & Versioning** | **Person 6 (MLOps Deployer)** | `manifest.json`, checksum generation, directory structure in `models/`. |
| **Model Serving & Loading** | **Person 6 (MLOps Deployer)** | `ModelArtifactLoader`, FastAPI health reporting, fallback mechanisms. |
| **Container & Runtime Deployment** | **Person 6 (MLOps Deployer)** | Dockerfile, volume persistence, CPU optimization, zero-downtime restarts. |

---

## 2. VERSIONED ARTIFACT REGISTRY

Model artifacts are stored in `ai_service/models/`:

```
ai_service/models/
├── manifest.json                  # Master version registry & checksum ledger
└── versions/
    ├── v1.0.0/                   # Production release
    │   ├── metadata.json         # Architecture description, author, taxonomy
    │   └── config.json           # Normalization & inference parameters
    └── v1.1.0/                   # Future release candidate
        ├── metadata.json
        ├── config.json
        └── weights.bin           # Optional serialized model weights
```

### Manifest Format (`manifest.json`)
```json
{
  "default_version": "v1.0.0",
  "active_version": "v1.0.0",
  "versions": {
    "v1.0.0": {
      "version": "v1.0.0",
      "model_id": "form2fact-pairwise-hybrid-v1.0.0",
      "release_date": "2026-11-06",
      "taxonomy": ["MATCH", "MISMATCH", "MISSING", "UNCERTAIN", "NOT_COMPARABLE"],
      "files": {
        "metadata": "versions/v1.0.0/metadata.json",
        "config": "versions/v1.0.0/config.json"
      },
      "checksums": {
        "metadata.json": "e1d5ba0bd13e6eae5916aeda1d2689e86a2588c24f2cb13e54791558119c6ac8",
        "config.json": "a44f165eb47dd03c290c1162dcd9df2c01474495ee7c8aefb2dfcb91a2055f7a"
      },
      "status": "ready"
    }
  }
}
```

---

## 3. RUNTIME MODEL LOADING & FALLBACK

The model loader (`ai_service/app/model_loader.py`):
1. **Reads `MODEL_VERSION`:** Evaluates environment variable, falling back to `default_version` in `manifest.json`.
2. **Validates Artifact Presence:** Ensures all declared files exist in the model directory.
3. **Validates SHA-256 Checksums:** Computes file hashes and verifies against `manifest.json`.
4. **Fallback Handling:** If artifacts are missing or corrupt, it automatically switches to verified deterministic heuristics, logs a warning, and reports `"is_fallback": true` in health probes without crashing the container.

---

## 4. DEPLOYING A NEW MODEL VERSION (STEP-BY-STEP)

When Person 1 (ML Trainer) delivers a new model version (e.g. `v1.1.0`):

1. **Create Version Directory:**
   ```bash
   mkdir -p ai_service/models/versions/v1.1.0
   ```
2. **Place Artifacts:**
   Copy `metadata.json` and `config.json` (and weights if applicable) into `ai_service/models/versions/v1.1.0/`.
3. **Compute Checksums:**
   ```bash
   python -c "import hashlib; print(hashlib.sha256(open('ai_service/models/versions/v1.1.0/metadata.json', 'rb').read()).hexdigest())"
   ```
4. **Update `manifest.json`:**
   Add `v1.1.0` block with version ID and computed SHA-256 checksums.
5. **Switch Active Model:**
   In Docker Compose or `.env`:
   ```env
   MODEL_VERSION=v1.1.0
   ```
6. **Restart AI Microservice:**
   ```bash
   docker compose restart ai-service
   ```
7. **Verify Health Endpoint:**
   ```bash
   curl http://localhost:8000/api/v1/health
   # Verify: "model_version": "v1.1.0" and "model_loaded": true
   ```

---

## 5. ZERO-CODE MODEL ROLLBACK RUNBOOK

If a newly deployed model exhibits latency spikes or anomalous predictions:

1. **Revert Environment Variable:**
   ```env
   MODEL_VERSION=v1.0.0
   ```
2. **Restart Container:**
   ```bash
   docker compose restart ai-service
   ```
3. Zero code changes, Git commits, or Docker image rebuilds are required.
