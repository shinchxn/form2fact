# FORM2FACT — DEVOPS & MLOPS CURRENT STATE AUDIT

**Audit Reference:** F2F-AUDIT-DEVOPS-MLOPS-2026  
**Date:** November 6, 2026  
**Auditor / Role:** Person 6 — Senior DevOps Engineer, MLOps Engineer, Infrastructure Architect & Deployment Specialist  
**Current Branch:** `feature/devops-mlops` (based on `develop` at `74dfe78`)  
**Scope:** Repository-wide inspection of containerization, CI/CD, orchestration, persistence, ML model packaging, and observability.

---

## 1. EXECUTIVE SUMMARY

Form2Fact is an evidence-first institutional document intelligence platform with a dual-stack runtime:
1. **Frontend & Core Scrutiny API:** Node.js 22 + Express + React 19 SPA (bundled by Vite).
2. **AI Inference Microservice:** Python 3.11/3.13 + FastAPI + Uvicorn (pairwise field mismatch classification).
3. **Core Data Persistence:** Local SQLite database (`data/form2fact.db`) via Node.js native `DatabaseSync` (`node:sqlite`).
4. **Document Storage:** Local filesystem storage (`data/dockets/`) with path traversal guards.

While the application logic and P0 security remediations (authentication, RBAC, tenant isolation, pairwise taxonomy) are fully verified and passing 22 test suites, the **infrastructure, deployment automation, and MLOps tooling are in an incomplete or mismatched state**.

---

## 2. DETAILED INFRASTRUCTURE INSPECTION

### 2.1 Existing Docker Configuration

| Component | File Path | Current Status | Findings & Technical Gaps |
|---|---|:---:|---|
| **API Server Container** | `Dockerfile` | **Basic Multi-Stage** | - Uses `node:22-alpine` as `builder` and `runner`.<br>- Runs as **root** (missing `USER node`).<br>- No `HEALTHCHECK` probe defined.<br>- `RUN npm ci --only=production` uses deprecated syntax (prefer `npm ci --omit=dev`).<br>- No persistent volume mount for `/app/data` configured.<br>- No explicit signal trap (`SIGTERM`/`SIGINT`) for graceful shutdown in `server.ts`. |
| **Python AI Container** | `ai_service/Dockerfile` | **Single-Stage** | - Uses `python:3.11-slim`.<br>- Runs as **root** (missing non-root service user).<br>- No `HEALTHCHECK` probe defined.<br>- Hardcoded `CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]` ignores runtime `$PORT` and `$WORKERS` environment variables.<br>- Does not package versioned model artifacts directory (`models/`). |
| **Docker Ignore** | `.dockerignore` | **MISSING** | - Neither root `.dockerignore` nor `ai_service/.dockerignore` exists.<br>- Docker daemon sends unneeded `data/*.db`, local uploads, and OS temp files into the build context. |
| **Orchestration** | `infrastructure/docker-compose.yml` | **Aspirational Draft** | - Uses obsolete `version: '3.8'` syntax.<br>- Assumes PostgreSQL (`postgres:16-alpine`), Redis (`redis:7-alpine`), and MinIO (`minio:latest`).<br>- **Critical Architecture Mismatch:** The Node.js application `server/db.ts` uses native SQLite (`node:sqlite`), NOT PostgreSQL. Setting `DATABASE_URL` in the container does nothing because no PostgreSQL driver is installed in `package.json`.<br>- The `api-server` container does **NOT** mount a persistent volume for SQLite or uploaded documents (`/app/data`), causing complete data loss on container recreation.<br>- Exposes AI service publicly on port `8000` rather than keeping it strictly within the internal Docker bridge network. |

---

### 2.2 Existing CI/CD Pipeline

- **GitHub Actions Workflows (`.github/workflows/`):** **NONE**. The directory does not exist.
- **Automated Validation:** Currently, test execution (`npm test`), static type-checking (`npm run lint`), and builds (`npm run build`) are executed manually on the developer machine.
- **Risk:** Pull requests and commits can introduce regressions, broken container builds, or unformatted Python code undetected.

---

### 2.3 Existing Database & Document Storage

- **Database:** Local SQLite database at `data/form2fact.db`.
  - Schema migrations run automatically on startup via `ScrutinyDatabase.initSchema()` in `server/db.ts`.
  - Zero external database services are connected at runtime.
  - Multi-tenant data isolation is implemented via `organizationId` columns and query scoping.
  - **Storage Gap:** Without named volume mounting in Docker, container recreation wipes `form2fact.db`.
- **Document Storage:** Filesystem storage at `data/dockets/`.
  - Binary PDFs uploaded via `/api/v1/applications/:id/documents` are stored with sanitized names.
  - Path traversal checks prevent `..` escapes.
  - **Storage Gap:** No automated snapshotting or backup/recovery script exists.

---

### 2.4 Existing ML Model Deployment (MLOps)

- **FastAPI Service:** `ai_service/app/main.py` provides:
  - `GET /api/v1/health`: Returns service health and fixed string `MODEL_VERSION = "form2fact-pairwise-ml-v1.0.0"`.
  - `POST /api/v1/classify-pair`: Accepts `PairwiseRequest` and runs `HybridPairwiseClassifier`.
  - `POST /api/v1/batch-classify`: Executes batch comparison.
  - `GET /api/v1/evaluate-baseline`: Runs synthetic evaluation on 10 benchmark test pairs.
- **MLOps Architecture Gaps:**
  1. **No Versioned Model Directory:** There is no `models/` folder, no `manifest.json`, and no versioning abstraction.
  2. **Hardcoded Classifier Logic:** `classifier.py` embeds deterministic heuristics directly in Python code. It does not support loading external model weights, tokenizers, or model metadata.
  3. **No Model Readiness Probe:** The health endpoint does not distinguish between service availability and model loading readiness.
  4. **No Rollback Mechanism:** Rolling back a model version would require modifying source code strings rather than switching a configuration environment variable (`MODEL_VERSION` / `MODEL_PATH`).

---

### 2.5 Existing Logging & Monitoring

- **Node.js Logging:** Uses `server/core/logger/index.ts` with structured console output (`[INFO]`, `[WARN]`, `[ERROR]`).
  - No correlation IDs attached to incoming HTTP requests.
  - No latency metrics recorded.
- **FastAPI Logging:** Default Uvicorn request logging.
  - No structured JSON log formatter.
  - No inference latency tracking.
- **Graceful Shutdown:** `server.ts` lacks `SIGTERM`/`SIGINT` signal trapping, risking abrupt SQLite connection termination during container redeployment.

---

## 3. IDENTIFIED SECURITY & RELIABILITY RISKS

1. **Root Execution in Containers (HIGH):** Both the Node.js runner and Python FastAPI containers run as UID 0 (`root`), violating least-privilege security standards.
2. **Data Ephemerality in Docker (HIGH):** `infrastructure/docker-compose.yml` does not map `/app/data` to a persistent host volume, leading to loss of SQLite filings and uploaded audit PDFs when containers restart.
3. **Public Exposure of Internal AI Service (MEDIUM):** In `docker-compose.yml`, `ai-service` maps port `8000:8000` to the host, exposing unauthenticated ML endpoints to the public network.
4. **Missing Production Secrets Validation in Docker (HIGH):** If `JWT_SECRET` is not provided in Docker Compose, the container may crash on startup due to P0 fail-fast enforcement, but without a clear `.env.example` guidance, developers may struggle to configure it.
5. **Lack of Automated CI Guardrails (HIGH):** Zero CI workflows allow untested code or broken Docker images to be merged into `develop` or `main`.

---

## 4. PROPOSED REMEDIATION & IMPLEMENTATION PLAN

To address these gaps without breaking the existing verified application, the following implementation plan will be executed:

1. **Deployment Architecture (`docs/architecture/DEPLOYMENT_ARCHITECTURE.md`):** Formally document the dual-tier container topology (Node.js API/Vite SPA + internal Python AI service + persistent SQLite/Docket volume).
2. **Docker Hardening:**
   - Create root `.dockerignore` and `ai_service/.dockerignore`.
   - Update `Dockerfile` to use non-root `USER node`, define `HEALTHCHECK`, and ensure `/app/data` ownership.
   - Update `ai_service/Dockerfile` to create non-root `appuser`, define `HEALTHCHECK`, and support environment `$PORT` and `$WORKERS`.
   - Restructure `docker-compose.yml` to:
     - Remove obsolete `version: '3.8'`.
     - Mount persistent named volumes `form2fact_data` (`/app/data`) and `form2fact_models` (`/app/models`).
     - Remove public port exposure for `ai-service` (accessible internally on `http://ai-service:8000`).
     - Use health-check-based service dependencies (`condition: service_healthy`).
     - Provide a clean, zero-external-dependency local development setup while archiving enterprise Postgres/Redis configs behind optional profiles.
3. **Environment & Secrets Management (`.env.example` & `docs/operations/ENVIRONMENT_CONFIGURATION.md`):**
   - Provide comprehensive `.env.example` documenting all configuration variables with strong production guidelines.
4. **MLOps Model Packaging & Lifecycle (`ai_service/models/` & `docs/operations/MODEL_DEPLOYMENT.md`):**
   - Implement `ai_service/models/` directory structure with `manifest.json`.
   - Add a model loader abstraction in `ai_service/app/model_loader.py` that verifies manifest integrity, artifact checksums, and exposes model readiness.
   - Update `ai_service/app/main.py` health endpoint to report model loading status, version, and readiness.
   - Package a verified lightweight model manifest fixture (`v1.0.0`) for reproducible offline CI/testing.
5. **Automated CI/CD Pipeline (`.github/workflows/ci.yml` & `docs/operations/CI_CD_PIPELINE.md`):**
   - Multi-job matrix testing Node.js (lint, test, build), Python (compile, test, FastAPI imports), and Docker (syntax, build, compose config).
6. **Observability & Disaster Recovery (`docs/operations/MONITORING_AND_LOGGING.md`, `BACKUP_AND_RECOVERY.md`):**
   - Add graceful shutdown handling (`SIGTERM`/`SIGINT`) to `server.ts`.
   - Provide reproducible backup and restore scripts for SQLite database and uploaded document dockets.
7. **Developer Handoff (`docs/team/DEVOPS_MLOPS_HANDOFF.md`):**
   - Document commands, environment setup, and operational runbooks for Person 1 (ML) and Person 2 (Backend).
