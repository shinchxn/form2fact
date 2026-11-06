# Form2Fact — DevOps & MLOps Engineering Handoff

**Author:** Person 6 (Senior DevOps & MLOps Engineer)  
**Status:** Complete & Verified Baseline  
**Date:** November 6, 2026  
**Audience:** Person 1 (ML Trainer), Person 2 (Backend Lead), Person 3 (Frontend Lead), Project Owner

---

## 1. PURPOSE & HANDOFF SUMMARY

Person 6 has completed the infrastructure containerization, CI/CD pipeline automation, MLOps model artifact registry, and operational documentation for Form2Fact without disrupting existing application code or weakening any P0 security controls.

---

## 2. KEY INTERFACE CONTRACTS & DIRECTORIES

### For Person 1 (ML Trainer):
- **Model Registry Directory:** [`ai_service/models/`](../../ai_service/models/README.md)
- **Model Manifest:** [`ai_service/models/manifest.json`](../../ai_service/models/manifest.json)
- **Model Loader:** [`ai_service/app/model_loader.py`](../../ai_service/app/model_loader.py)
- **Workflow:** When releasing a new model version:
  1. Add model files under `ai_service/models/versions/<version>/`.
  2. Compute SHA-256 checksums and add to `manifest.json`.
  3. Set `MODEL_VERSION=<version>` in `.env` or Docker Compose.
  4. The service will load the new model with zero application source code edits.

### For Person 2 (Backend Integration Lead):
- **Docker Compose:** [`docker-compose.yml`](../../docker-compose.yml)
- **API Server Container:** [`Dockerfile`](../../Dockerfile)
- **Environment Template:** [`.env.example`](../../.env.example)
- **AI Microservice URL:** `http://ai-service:8000` (internal network name in Docker Compose).
- **Persistent Data:** SQLite and uploaded PDFs persist in the `form2fact_data` named volume mapped to `/app/data`.

### For Person 3 (Frontend Lead):
- **Vite Build Container:** Handled automatically in the multi-stage `Dockerfile`.
- **Static Assets:** Express serves compiled assets from `dist/` with SPA fallback.
- **Port Ingress:** Web UI is available directly at `http://localhost:3000`.

---

## 3. MASTER OPERATIONS RUNBOOK SUMMARY

| Task | Command | Documentation Reference |
|---|---|---|
| **Local Full-Stack Run** | `npm run dev` | [`docs/DEVELOPER_GUIDE.md`](../DEVELOPER_GUIDE.md) |
| **Run 22 Test Suites** | `npm test` | [`docs/audit/P0_REMEDIATION_REPORT.md`](../audit/P0_REMEDIATION_REPORT.md) |
| **Launch Docker Stack** | `docker compose up --build -d` | [`docs/operations/DOCKER_SETUP.md`](../operations/DOCKER_SETUP.md) |
| **Check Container Health** | `docker compose ps` | [`docs/operations/MONITORING_AND_LOGGING.md`](../operations/MONITORING_AND_LOGGING.md) |
| **Execute SQLite Backup** | Run `VACUUM INTO` script | [`docs/operations/BACKUP_AND_RECOVERY.md`](../operations/BACKUP_AND_RECOVERY.md) |
| **Deploy New ML Model** | Update `manifest.json` & restart `ai-service` | [`docs/operations/MODEL_DEPLOYMENT.md`](../operations/MODEL_DEPLOYMENT.md) |
| **Evaluate Python AI Baseline** | `GET /api/v1/evaluate-baseline` | [`docs/ai-models/benchmark-dataset.md`](../ai-models/benchmark-dataset.md) |
