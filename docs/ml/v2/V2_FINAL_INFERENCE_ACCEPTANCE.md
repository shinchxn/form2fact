# Form2Fact V2 Calibrated Inference Integration & Final Acceptance Audit

**Document ID:** `FORM2FACT-ML-V2-ACCEPT-001`  
**Date:** November 2026  
**Auditor Role:** Senior ML Deployment Engineer and Model Validation Specialist  
**Branch:** `feature/ml-pairwise-classifier-v2`  
**Base Commit:** `2467d2d`  
**Champion Model Version:** `form2fact-hybrid-pairwise-v2.0-champion`  
**Calibrated Wrapper Artifact:** `ai_service/ml/artifacts/v2/v2_calibrated_classifier_weights.pkl`

---

## 1. Artifact Verification & Deterministic Loading

All model artifacts have been verified for cryptographic integrity, deterministic loading, and parameter fidelity.

### 1.1 Artifact Checksum Ledger

| Artifact Path | Artifact Type | SHA-256 Checksum | Verification Status |
| :--- | :--- | :--- | :--- |
| `ai_service/ml/artifacts/v2/v2_champion_classifier_weights.pkl` | HistGradientBoosting Base Estimator | `efa27bee02d3d7b53a96366365f48a3f5924d7bd0095acdde965093bcf8f778e` | **VERIFIED** |
| `ai_service/ml/artifacts/v2/v2_calibrated_classifier_weights.pkl` | Temperature-Scaled Inference Wrapper | `9560d165b8c46078f1d6fcbaf6d09dc1fe5069078272129f6c808b27e786bdba` | **VERIFIED** |
| `ai_service/ml/artifacts/v2/v2_model_config.json` | Model Architecture & Metric Registry | `fc607b4c1a364669dd350b3ba377582d333324b466c6ddd20696d2c57a827927` | **VERIFIED** |

### 1.2 Calibration Fit Integrity
- **Fitting Split:** Validation set only (`ai_service/ml/data/v2_acquisition/processed/rigorous_splits/val_rigorous.jsonl`, $N=162$ records).
- **Test Set Contamination:** Zero. The independent test benchmark (`test_rigorous.jsonl`, $N=41$) was completely held out during temperature scaling parameter estimation.
- **Optimal Temperature ($T$):** **`1.8182`** (Nelder-Mead optimization minimizing multi-class cross-entropy log-loss).
- **Class Ordering:** The estimator preserves the strict index order `[0, 1, 2, 3, 4]`, mapping 1-to-1 with `LABEL_NAMES = ["MATCH", "MISMATCH", "MISSING", "UNCERTAIN", "NOT_COMPARABLE"]`.

---

## 2. Calibration Integration & Probability Estimation

### 2.1 Actual Inference Calibration Math
In `MLPairwiseInferenceEngine.predict_probabilities(X)`, the engine inspects whether the loaded artifact is a calibrated wrapper. When active:

1. Computes raw unscaled logits via base estimator:  
   $$z = \text{decision\_function}(X) \in \mathbb{R}^{B \times 5}$$
2. Applies the fitted temperature scalar:  
   $$z_{\text{scaled}} = \frac{z}{T} \quad (T = 1.8182)$$
3. Computes calibrated probability distribution via numerically stable softmax:  
   $$P(y = k \mid X) = \frac{\exp(z_{\text{scaled}, k} - \max_j z_{\text{scaled}, j})}{\sum_{j=1}^5 \exp(z_{\text{scaled}, j} - \max_j z_{\text{scaled}, j})}$$

### 2.2 Calibration Quality Benchmark
- **Multi-Class Brier Score:** **`0.0299`**
- **Multi-Class Log Loss:** **`0.0486`**
- **Expected Calibration Error (ECE, 10 bins):** **`0.0169`**
- **Calibration Runtime Overhead:** **`0.089 ms`** (89 microseconds) — effectively zero computational penalty.

---

## 3. Threshold Policy & Human-in-the-Loop Routing

### 3.1 Five-Class Taxonomy Validation at $\tau = 0.60$

The operational abstention threshold is configured to **$\tau = 0.60$** (`FORM2FACT_ML_ABSTENTION_THRESHOLD=0.60`). Comprehensive unit and integration tests verify all five classes:

| Class Taxonomy | Trigger Condition & Test Vector | Confidence Range | `requires_human_review` | Regulatory Invariant Enforced |
| :--- | :--- | :--- | :--- | :--- |
| **`MATCH`** | Concordant legal entity names ("Pragati Institute of Technology") | $\ge 0.95$ | `False` (if $\ge 0.95$) | Streamlined pass for clear equivalence |
| **`MISMATCH`** | Discrepant statutory values (Acreage deficit: 7.50 vs 4.00 Acres) | $\ge 0.90$ | **`True` (MANDATORY)** | **Discrepancy NEVER auto-rejects; officer review required** |
| **`MISSING`** | Omitted evidence document / field (e.g. Fire Safety NOC) | $1.00$ | **`True` (MANDATORY)** | Missing statutory mandate requires inspector audit |
| **`UNCERTAIN`** | Borderline token overlap / OCR degradation / confidence $< 0.60$ | Low / Ambiguous | **`True` (MANDATORY)** | Epistemic ambiguity routes to officer adjudication |
| **`NOT_COMPARABLE`** | Conceptually incompatible fields (e.g. Lease Expiry vs Trust Name) | $1.00$ | `False` | Deterministic incompatibility check |

### 3.2 Autonomous Regulatory Decision Prohibition
> **STATUTORY SAFETY INVARIANT:**  
> The system enforces that under no circumstance can the ML classifier trigger autonomous institutional approval or rejection. Any discrepancy (`MISMATCH`), missing evidence (`MISSING`), or epistemic uncertainty (`UNCERTAIN`) strictly sets `requires_human_review = True` and emits explanatory audit trails for human adjudication.

---

## 4. Latency Reproduction & Deep Investigation

### 4.1 Benchmarking Methodology & Hardware Environment
- **Platform:** Windows 11 Enterprise (10.0.26200-SP0) x86_64
- **Processor:** Intel64 Family 6 Model 186 Stepping 3, GenuineIntel
- **Logical CPU Cores:** 6 cores
- **Measurement Protocol:** High-resolution monotonic timers (`time.perf_counter_ns()`), 15 warmup iterations to eliminate CPU/JIT cold starts, followed by **50 independent single-pair executions (`batch_size=1`)**.

### 4.2 Latency Breakdown Ledger

```
[Single Pair Request]
        │
        ▼
┌───────────────────────────────────────┐
│ 1. Text Preprocessing & Cleaning      │  Mean:  0.077 ms | Median:  0.076 ms | p95:  0.085 ms
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│ 2. MiniLM-L6-v2 Dual Sentence Encode  │  Mean: 45.399 ms | Median: 44.998 ms | p95: 49.142 ms
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│ 3. Tabular Feature Assembly (8 feats) │  Mean:  0.133 ms | Median:  0.124 ms | p95:  0.192 ms
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│ 4. Classifier Head Decision Function  │  Mean: 36.468 ms | Median: 36.403 ms | p95: 38.504 ms
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│ 5. Calibration Math (Softmax / T)     │  Mean:  0.089 ms | Median:  0.090 ms | p95:  0.094 ms
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│ 6. Complete Single-Pair End-to-End    │  Mean: 82.180 ms | Median: 81.908 ms | p95: 86.926 ms
└───────────────────────────────────────┘
```

### 4.3 Root Cause Analysis of Prior "81.09 ms" Classifier Latency
In prior un-warmed profiling runs, the classifier head alone exhibited a mean latency of **81.09 ms**.
- **Root Cause Identified:** Scikit-learn's `HistGradientBoostingClassifier.decision_function` utilizes OpenMP multithreading. On a 6-core CPU, single-sample inference ($N=1$) suffers from thread-pool dispatch and thread synchronization contention on cold iterations.
- **Warm Reproduction Result:** With CPU caches primed (15 warmup cycles), the classifier head forward pass stabilized at **36.47 ms** (median: 36.40 ms, p95: 38.50 ms).
- **Total Single-Pair End-to-End Latency:** **`82.18 ms`** (median: `81.91 ms`, p95: `86.93 ms`).
- **SLA Conformance:** The target interactive latency SLA is $< 500\text{ ms}$. With an end-to-end latency of $82.18\text{ ms}$, Form2Fact satisfies the regulatory SLA with an **83.6% safety margin**, processing $\sim 12.2$ single-pair queries per second per CPU core.

---

## 5. FastAPI Integration & Fallback Elimination

### 5.1 Endpoint Conformance
The FastAPI application at `ai_service/app/main.py` has been verified for all request and response contracts:

1. `GET /api/v1/health`:
   - Returns HTTP 200 with service health status.
   - Reports `model_version: "form2fact-hybrid-pairwise-v2.0-champion"`.
   - Exposes `ml_ready: true`, `is_calibrated: true`, `optimal_temperature: 1.8182`, `abstention_threshold: 0.60`.
   - Lists capabilities including `"temperature_scaled_calibration"`.
2. `POST /api/v1/classify-pair`:
   - Accepts strictly typed `PairwiseRequest`.
   - Returns valid `PairwiseResponse` conforming to Pydantic v2 schemas.
3. `POST /api/v1/ml/classify-pair`:
   - Dedicated ML endpoint for direct model classification.
4. `POST /api/v1/batch-classify`:
   - Accepts `BatchPairwiseRequest`, returning aggregated 5-class counts and results list.

### 5.2 Elimination of Silent Fallbacks
- **Previous Hazard:** The previous implementation caught exceptions and silently fell back to an undocumented Jaccard lexical heuristic, obscuring ML failures.
- **Enforced Safety Guard:**
  - If model artifacts are missing or corrupt, `is_ready()` evaluates to `False`.
  - Both `/api/v1/classify-pair` and `/api/v1/ml/classify-pair` raise an explicit **`HTTP 503 Service Unavailable`** (`"ML pairwise classification model is not ready or artifact is missing/corrupt. Silent fallback is disabled."`).
  - Unit test `test_safe_behavior_on_missing_corrupt_artifacts` cryptographically and behaviorally confirms this protection.

---

## 6. DevOps & Infrastructure Verification (Person 6 Coordination)

### 6.1 Dockerfile Packaging (`ai_service/Dockerfile`)
The container definition was restructured for reproducible packaging:
- **Base Image:** `python:3.11-slim`
- **Dependency Isolation:** `requirements.txt` pinned with exact version bounds (`scikit-learn>=1.4.0,<2.0.0`, `scipy>=1.12.0,<2.0.0`, `sentence-transformers>=2.5.0,<7.0.0`, `torch>=2.0.0,<3.0.0`, `fastapi>=0.110.0,<0.136.0`, `pydantic>=2.6.0,<3.0.0`, `uvicorn>=0.28.0,<1.0.0`).
- **Complete Module Inclusion:** Copies the entire `ai_service/` tree (including `ml/`, models, and artifacts) into `/workspace/ai_service/` and sets `PYTHONPATH=/workspace`.
- **Built-in Healthcheck:** Periodically executes `curl -f http://localhost:8000/api/v1/health || exit 1`.

### 6.2 Docker Compose Integration (`infrastructure/docker-compose.yml`)
- Service `ai-service` pins environment variables:
  - `FORM2FACT_ML_MODEL_VERSION="form2fact-hybrid-pairwise-v2.0-champion"`
  - `FORM2FACT_ML_WEIGHTS_PATH="/workspace/ai_service/ml/artifacts/v2/v2_calibrated_classifier_weights.pkl"`
  - `FORM2FACT_ML_CONFIG_PATH="/workspace/ai_service/ml/artifacts/v2/v2_model_config.json"`
  - `FORM2FACT_ML_ABSTENTION_THRESHOLD="0.60"`
- Healthcheck configured with 15-second interval and 3 retries.
- Zero external network dependency during runtime inference (model weights and tokenizer bundled locally).

### 6.3 Rollback Procedure
If unexpected regression occurs in production:
1. Revert environment variable `FORM2FACT_ML_WEIGHTS_PATH` to V1 weights:  
   `ai_service/ml/artifacts/pairwise_classifier_weights.pkl`
2. Revert `FORM2FACT_ML_CONFIG_PATH` to `ai_service/ml/artifacts/model_config.json`.
3. Restart `ai-service` container (`docker compose restart ai-service`).
4. System immediately boots into historical V1 baseline with zero database schema migration.

---

## 7. Verification Test Ledger

All test suites across Python AI microservice, Node.js backend, and React frontend were executed and recorded:

```
======================================================================
1. PYTHON ML TEST SUITE (pytest ai_service/ml/tests -v)
   - Pipeline preprocessing tests:  9/9 PASSED
   - Calibrated inference tests:    8/8 PASSED
   - Evaluation integrity tests:    6/6 PASSED
   TOTAL: 23 passed in 28.23s

2. NODE.JS BACKEND REGRESSION SUITE (npm test)
   - Date & text normalization:     PASSED
   - SQLite persistence & UUIDs:    PASSED
   - RBAC & tenant isolation:       PASSED
   - Deterministic rule engine:     PASSED
   - Findings explainability:       PASSED
   - Pairwise classification (11):  PASSED
   TOTAL: 22 test suites, 117 assertions PASSED

3. FRONTEND TYPE CHECK & STATIC ANALYSIS (npm run lint)
   - TypeScript compiler (tsc):     0 errors, 0 warnings

4. FRONTEND PRODUCTION BUILD (npm run build)
   - Vite production bundle:        Built in 2.04s (1,679 modules transformed)
======================================================================
```

---

## 8. Remaining Operational Risks & Acceptance Recommendation

### 8.1 Remaining Risks
1. **Dataset Provenance Reality:** Exactly 0 real human-annotated institutional filings exist in the training set. The model's 97.6% benchmark accuracy reflects synthetic concordance and programmatic perturbations, not messy real-world OCR scans from diverse state boards.
2. **Heavy Single-Thread CPU Execution:** At 82 ms per pair, comparing a 50-field institutional docket requires $\sim 4.1\text{ seconds}$ on a single core. Implementing batching or ONNX Runtime INT8 quantization is recommended for large document queues.
3. **Domain Vocabulary Drift:** Institutional abbreviations specific to regional boards (e.g. DTE, AICTE regional chapters) not covered in the 8 base templates may trigger `UNCERTAIN` abstentions.

### 8.2 Final Acceptance Verdict
- **Verdict:** **APPROVED FOR CONTROLLED SHADOW-MODE PILOT & HUMAN-IN-THE-LOOP ADJUDICATION**.
- **Autonomous Adjudication Ban:** The model must operate strictly as an assistive reviewer recommendation tool. Automated regulatory approval or rejection without certified human officer sign-off remains **PROHIBITED**.
- **Sign-Off:** All criteria of Base Commit `2467d2d` and Feature Branch `feature/ml-pairwise-classifier-v2` have been satisfied.

