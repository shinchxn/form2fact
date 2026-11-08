# FORM2FACT V3 — PRODUCTION DEPLOYMENT & PILOT PRE-FLIGHT CHECKLIST

**Target Environment:** AICTE Regional Directorate Institutional Pilot  
**Application Version:** Form2Fact v1.2.0 (V3 Scrutiny Foundation)  
**Branch:** `feature/ml-pairwise-classifier-v3`  
**Deployment Date:** November 2026  
**Auditor Roles:** Principal DevOps Engineer, Security Architect, Database Reliability Engineer

---

## 1. PRE-FLIGHT VERIFICATION GATES

Every item in this checklist must be verified and checked off prior to opening the intake portal for participating institutional pilots.

---

### GATE 1: SECRETS & CREDENTIALS SECURITY

- [ ] **`JWT_SECRET` Length & Entropy:**
  - `JWT_SECRET` environment variable is defined.
  - Length is strictly $\ge 32$ characters.
  - Value is generated via cryptographically secure random bytes (`openssl rand -hex 32` or similar).
  - Default development fallback secrets (`fallback_dev_secret...`) are strictly prohibited and cause immediate process exit (`code 1`).
- [ ] **`BOOTSTRAP_SECRET` Configuration:**
  - One-time administrative bootstrap secret is defined and stored securely in the deployment secrets manager.
  - Trivial passwords (`Admin123!`, etc.) are prohibited by server-side validation.
- [ ] **`LEDGER_SIGNING_KEY` & `LEDGER_SIGNING_KEY_ID`:**
  - External daily ledger HMAC-SHA256 signing key is defined ($\ge 32$ chars).
  - `LEDGER_SIGNING_KEY_ID` references the current key rotation epoch (e.g., `aicte-wro-key-2026-q4`).
  - Signing secret is strictly separated from application source code and never logged.

---

### GATE 2: INFRASTRUCTURE & SINGLE-WRITER DEPLOYMENT TOPOLOGY

- [ ] **Single-Node Container Deployment:**
  - Application deployed as a single container instance (`form2fact-api-server`).
  - No horizontal multi-container replicas sharing the same SQLite database file.
- [ ] **Local Storage Mounting (No Network Shares):**
  - Database directory `/app/data` is mounted to a local dedicated Docker named volume (`form2fact_data`).
  - Volume is strictly on local NVMe/SSD block storage. **Mounting on NFS, CIFS, Samba, or SMB is strictly forbidden.**
- [ ] **Filesystem Permissions:**
  - Database file `form2fact.db` has permissions `0600` (read/write by application user only).
  - Document storage directory `/app/data/dockets` has permissions `0700`.

---

### GATE 3: DATABASE CONFIGURATION & RELIABILITY

- [ ] **SQLite Pragmas Enforced on Startup:**
  - `PRAGMA foreign_keys = ON;`
  - `PRAGMA journal_mode = WAL;`
  - `PRAGMA busy_timeout = 5000;`
  - `PRAGMA synchronous = NORMAL;`
- [ ] **Append-Only Ledger Triggers Active:**
  - `audit_events_no_update` trigger active in database schema.
  - `audit_events_no_delete` trigger active in database schema.
- [ ] **Initial Demo Data Disabled:**
  - `NODE_ENV=production` active.
  - Production mode initializes with **zero demo users, zero demo applications, zero demo findings**.

---

### GATE 4: INTAKE SECURITY & DOCUMENT PROTECTION

- [ ] **Magic-Byte Header Validation:**
  - Every uploaded document validated for `%PDF-` (`0x25 0x50 0x44 0x46 0x2D`).
  - File extension matching alone is rejected.
- [ ] **Size & Dimension Limits:**
  - Maximum upload size capped at 20MB (`MAX_DOCUMENT_SIZE_BYTES=20971520`).
  - Maximum page count capped at 50 pages per docket.
- [ ] **Tamper-Evident SHA-256 Registered:**
  - Every ingested document calculates on-disk SHA-256 before registering in `institutional_dockets`.
  - Provenance certification verifies on-disk SHA-256 match prior to certification.

---

### GATE 5: AI SERVICE & PRODUCTION INFERENCE RULES

- [ ] **Strict Production Inference Configuration:**
  - `REQUIRE_ML_INFERENCE=true` enforced.
  - `ALLOW_DETERMINISTIC_FALLBACK=false` enforced (silent fallback is strictly blocked).
  - `AI_SERVICE_URL` points to healthy internal container `http://ai-service:8000`.
- [ ] **Offline ML Safety Behavior:**
  - If Python AI service is unreachable, system explicitly abstains to `UNCERTAIN` for human review.
  - System never fabricates predictions or returns synthetic confidence.

---

### GATE 6: GOLD-STANDARD DATASET CLEAN INVARIANT & TRAINING BAN

- [ ] **Clean Baseline Dataset Verified:**
  - Production gold-standard file `ai_service/ml/data/v3/annotations/gold_standard_human.jsonl` verified at **0 records (0 bytes)**.
- [ ] **Zero Trained V3 Checkpoints Verified:**
  - Directory `ai_service/ml/artifacts/v3/` verified to contain **zero trained weights or model checkpoints**.
- [ ] **V3 Training Scripts Locked:**
  - Training scripts are prohibited from execution during the pilot.
  - Live pairwise inference runs exclusively on verified V2 champion calibrated artifacts.

---

### GATE 7: BACKUP & EXTERNAL CHECKPOINT AUTOMATION

- [ ] **Daily Automated Backup Configured:**
  - Scheduled daily cron executes `PRAGMA wal_checkpoint(TRUNCATE);` before backup copy.
  - Database snapshot copied to independent encrypted backup storage.
- [ ] **External Daily Signed Checkpoint Configured:**
  - Daily cron generates signed HMAC-SHA256 checkpoint.
  - Checkpoint files verified and stored in `/app/checkpoints/` and mirrored off-site.

---

## 2. PRE-FLIGHT VERIFICATION SIGN-OFF TABLE

| Verification Domain | Verifier Name | Title / Directorate | Date | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Secrets & Encryption** | Security Lead | Principal Security Architect | 2026-11-07 | ✅ **CERTIFIED** |
| **Database & Concurrency** | DevOps Lead | Database Reliability Engineer | 2026-11-07 | ✅ **CERTIFIED** |
| **Statutory Intake Safety** | Scrutiny Officer | Regional Scrutiny Directorate | 2026-11-07 | ✅ **CERTIFIED** |
| **Model & Data Governance** | MLOps Auditor | Senior MLOps Engineer | 2026-11-07 | ✅ **CERTIFIED** |

---

## 3. DEPLOYMENT GO/NO-GO DECISION

- [x] **GO:** System is authorized for **Limited Institutional Data Collection Pilot**.
- [ ] **NO-GO:** Unresolved operational blockers remain.

