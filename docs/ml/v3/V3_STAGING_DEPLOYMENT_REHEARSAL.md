# FORM2FACT V3 — STAGING DEPLOYMENT REHEARSAL REPORT

**Rehearsal Date:** November 7, 2026  
**Auditor Roles:** Principal DevOps Engineer, Application Security Architect, QA Lead, Institutional Data Governance Auditor  
**Repository:** `https://github.com/shinchxn/form2fact.git`  
**Branch:** `feature/ml-pairwise-classifier-v3`  
**Baseline Git Commit:** `cec296c568dd01b88fcb8b8313f4ca196ab9495d`  
**Rehearsal Test Suite:** [`server/tests/stagingOperationalRehearsal.test.ts`](file:///d:/projects/form2fact/server/tests/stagingOperationalRehearsal.test.ts) (18/18 Passed)

---

## 1. EXECUTIVE SUMMARY

An isolated staging deployment rehearsal for Form2Fact V3 was designed, configured, and executed to evaluate whether the platform can safely support a limited, authorized institutional data-collection pilot. 

The rehearsal validated:
1. Production-style staging container architecture via [`docker-compose.staging.yml`](file:///d:/projects/form2fact/docker-compose.staging.yml).
2. Defense-in-depth security controls (JWT secrets, RBAC, tenant isolation, PDF magic-byte checks).
3. The complete operational data-collection lifecycle using explicitly labeled dummy documents and test personas.
4. Cryptographic ledger integrity, external signed daily checkpoints, key rotation, and automated incident detection.
5. Strict isolation of test exports, ensuring that the authoritative production gold-standard file remains clean (**0 records / 0 bytes**).

---

## 2. STAGING DEPLOYMENT ARCHITECTURE & CONFIGURATION

### 2.1 Staging Docker Compose Configuration
An isolated staging definition was established in [`docker-compose.staging.yml`](file:///d:/projects/form2fact/docker-compose.staging.yml):
```yaml
name: form2fact-staging

services:
  staging-api-server:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: form2fact-staging-api-server
    restart: unless-stopped
    ports:
      - "${STAGING_PORT:-3001}:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - JWT_SECRET=${STAGING_JWT_SECRET:-staging_rehearsal_jwt_secret_min_32_characters_long!}
      - BOOTSTRAP_SECRET=${STAGING_BOOTSTRAP_SECRET:-staging_bootstrap_secret_2026_pilot_rehearsal!}
      - LEDGER_SIGNING_KEY=${STAGING_LEDGER_SIGNING_KEY:-staging_ledger_hmac_secret_32_characters_minimum!}
      - LEDGER_SIGNING_KEY_ID=staging-key-2026-rehearsal
      - DATABASE_PATH=/app/data/form2fact_staging.db
      - DOCUMENT_STORAGE_PATH=/app/data/dockets_staging
      - AI_SERVICE_URL=http://staging-ai-service:8000
      - REQUIRE_ML_INFERENCE=true
      - ALLOW_DETERMINISTIC_FALLBACK=false
      - LOG_LEVEL=${LOG_LEVEL:-INFO}
    volumes:
      - form2fact_staging_data:/app/data
    networks:
      - form2fact-staging-net
    depends_on:
      staging-ai-service:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/v1/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 10s

  staging-ai-service:
    build:
      context: ./ai_service
      dockerfile: Dockerfile
    container_name: form2fact-staging-ai-service
    restart: unless-stopped
    environment:
      - PORT=8000
      - WORKERS=2
      - MODEL_PATH=/app/models
      - MODEL_VERSION=v2.0-champion
      - LOG_LEVEL=${LOG_LEVEL:-INFO}
    volumes:
      - form2fact_staging_models:/app/models
    networks:
      - form2fact-staging-net
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/v1/health')"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 10s

volumes:
  form2fact_staging_data:
    name: form2fact_staging_data
  form2fact_staging_models:
    name: form2fact_staging_models

networks:
  form2fact-staging-net:
    name: form2fact-staging-network
    driver: bridge
```

### 2.2 Staging Configuration Controls Verified

| Configuration Gate | Staging Implementation | Verification Evidence |
| :--- | :--- | :--- |
| **JWT Secrets Handling** | Staging secret $\ge 32$ characters; fallback dev secrets rejected in production mode | ✅ Passed: `validateProductionConfig` accepted staging secret; tampered token rejected |
| **Database Persistence** | Isolated volume `form2fact_staging_data` mounted to local filesystem block storage | ✅ Passed: Database schema initialized; records persist across database restarts |
| **SQLite WAL Pragmas** | `PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA synchronous = NORMAL;` | ✅ Passed: Verified `journal_mode: wal` and `timeout: 5000` |
| **Clean Baseline** | `NODE_ENV=production` active during initialization | ✅ Passed: 0 demo applications, 0 demo findings seeded in staging database |
| **Single-Writer Topology** | Single container instance defined; network filesystem mounts prohibited | ✅ Passed: Docker Compose specifies single replica on named volume |
| **Upload Restrictions** | Magic-byte `%PDF-` validation, 20MB file cap, 50-page max | ✅ Passed: Validated on dummy document upload |
| **Tenant Isolation** | Western regional directorate isolated from Northern directorate | ✅ Passed: Cross-tenant annotation rejected with HTTP 403 / Access Denied |
| **Offline ML Safety** | `REQUIRE_ML_INFERENCE=true`, `ALLOW_DETERMINISTIC_FALLBACK=false` | ✅ Passed: System abstains to UNCERTAIN when ML service unavailable |

---

## 3. OPERATIONAL REHEARSAL EXECUTION DETAILS

The rehearsal was conducted using test identities and explicitly labeled dummy documents in an isolated staging workspace (`data/staging_rehearsal/`).

### Rehearsal Step 1: Institutional Docket Intake
- **Dummy Document:** Created `dummy_statutory_filing.pdf` (SHA-256: `955034a74a10e756191c4dcf9c98a58a74ec39df91eb7c458e0ea5215d8f6153`).
- **Docket Metadata:**
  - Docket Number: `DUMMY-AICTE-WRO-2026-REHEARSAL-001`
  - Institution: `Apex Institute of Technology (Staging Dummy)`
  - Source Organization: `AICTE Western Regional Directorate (Rehearsal)`
  - Authorization Reference: `DUMMY/AICTE/WRO/2026/REHEARSAL-AUTH`
  - Document Classification: `statutory_filing`
- **Result:** Successfully registered in `institutional_dockets`; initialized to `PROVENANCE_PENDING` and `DATA_SOURCE_IDENTIFIED`.

### Rehearsal Step 2: Physical Checksum Verification & Provenance Certification
- **Action:** Reviewer Dr. Vikram Sarabhai (`usr-staging-rev1`) certified document provenance.
- **Verification:** System read the physical file on disk, recalculated the SHA-256 hash, verified concordance with `docket.documentChecksum`, and transitioned the docket to `PROVENANCE_VERIFIED`.
- **Audit Sealed:** The canonical audit event recorded physical SHA-256, page count (4), authorization reference, docket ID, verifier ID, and timestamp in the tamper-evident hash chain.

### Rehearsal Step 3: Candidate Generation & Double-Blind Consensus
- **Candidate 1 (Consensus Scenario):** Land area claim of 7.50 Acres vs Deed showing 7.50 Acres.
  - Reviewer 1 independently submitted label `MATCH` with statutory rationale. Status transitioned to `in_review`.
  - Reviewer 2 independently submitted label `MATCH` with statutory rationale.
  - **Outcome:** System detected concordant determinations, marked status `agreed`, and confirmed `finalLabel: MATCH`.

### Rehearsal Step 4: Disagreement & Neutral Third-Party Adjudication
- **Candidate 2 (Dispute Scenario):** Lease expiry date claim of 2056-03-31 vs Deed showing secondary mortgage clause.
  - Reviewer 1 submitted `MATCH`.
  - Reviewer 2 submitted `MISMATCH` citing mortgage encumbrance.
  - **Outcome:** System flagged divergent submissions and transitioned record to `disputed`. Final label was withheld.
  - **Conflict of Interest Gate:** Reviewer 1 attempted to adjudicate the record. The system strictly rejected the request with `Conflict of interest: Adjudicator cannot be an evaluating annotator on the same task.`
  - **Neutral Adjudication:** Directorate Adjudicator Hon. Justice M. C. Chagla (`usr-staging-adjudicator`) reviewed the dispute and submitted binding label `MISMATCH` with statutory appellate rationale. Record updated to `adjudicated`.

### Rehearsal Step 5: Reviewer Authorization & Revocation
- **Authorization Registered:** Administrator authorized Reviewer 1 (`usr-staging-rev1`) with verified academic faculty credentials (`FAC-PUNE-2026-884`).
- **Revocation Executed:** Reviewer 1 was revoked due to institutional transfer.
- **Firewall Gate Triggered:** Attempting to export records with annotations from the revoked reviewer was strictly caught and blocked by Gate 8 of the export firewall with the explicit reason: `Submission by annotator Dr. Vikram Sarabhai (Test) has revoked/expired statutory authorization.`

### Rehearsal Step 6: Export Path Isolation
- **Staging Export:** Staging export was directed to `data/staging_rehearsal/staging_gold_export.jsonl`.
- **Zero-Pollution Invariant:** The authoritative production gold-standard file [`ai_service/ml/data/v3/annotations/gold_standard_human.jsonl`](file:///d:/projects/form2fact/ai_service/ml/data/v3/annotations/gold_standard_human.jsonl) was inspected and confirmed to contain **exactly 0 bytes / 0 records**.

---

## 4. REHEARSAL VERIFICATION SUMMARY

```
================================================================
   STAGING REHEARSAL TEST EXECUTION (18 / 18 PASSED)
================================================================
[PHASE 2: Staging Deployment Configuration]
✅ Passed: Production-style staging environment validation passes without errors
✅ Passed: Staging JWT token issuance, verification, and role retention
✅ Passed: Staging database initializes with WAL mode, busy timeout, and zero demo records in production mode
✅ Passed: Single-writer architecture enforcement in docker-compose.staging.yml

[PHASE 3: Operational Rehearsal Lifecycle]
✅ Passed: REHEARSAL 1: Ingest Institutional Docket with full statutory metadata
✅ Passed: REHEARSAL 2: Physical SHA-256 verification and Provenance Certification
✅ Passed: REHEARSAL 3: Create candidate pairs referencing verified docket
✅ Passed: REHEARSAL 4: Double-Blind Consensus Lifecycle (MATCH)
✅ Passed: REHEARSAL 5: Disagreement and Neutral Adjudication (MISMATCH)
✅ Passed: REHEARSAL 6: Reviewer Authorization Registration & Active Certification
✅ Passed: REHEARSAL 7: Export Gate Validation and Production Path Isolation
✅ Passed: REHEARSAL 8: Revocation of Reviewer Authorization & Export Firewall Defense
✅ Passed: REHEARSAL 9: Cross-Tenant Access Rejection

[PHASE 4: Checkpoint, Recovery & Incident Response]
✅ Passed: CHECKPOINT 1: Canonicalization & Signed Checkpoint Creation (Key V1)
✅ Passed: CHECKPOINT 2: Key Rotation to Key V2 (Q1-2027 Epoch)
✅ Passed: INCIDENT SIMULATION 1: Tampered Ledger Event Payload Detected
✅ Passed: INCIDENT SIMULATION 2: Stale Database Snapshot Rollback Detected
✅ Passed: RECOVERY: Clean Database Backup and Full State Restoration
================================================================
```

---

## 5. REHEARSAL VERDICT

### **STAGING DEPLOYMENT REHEARSAL: ACCEPTED**
The platform's technical infrastructure, defense-in-depth security, double-blind annotation workbench, adjudication workflow, and cryptographic audit logging operate cleanly and reliably under staging rehearsal conditions.

