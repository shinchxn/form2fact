# FORM2FACT V3 — INSTITUTIONAL PILOT OPERATIONAL READINESS AUDIT

**Audit Date:** November 7, 2026  
**Auditor Roles:** Principal DevOps Engineer, Security Architect, Database Reliability Engineer, Regulatory Data Governance Auditor  
**Repository:** `https://github.com/shinchxn/form2fact.git`  
**Target Branch:** `feature/ml-pairwise-classifier-v3`  
**Baseline Commit:** `cec296c568dd01b88fcb8b8313f4ca196ab9495d`  
**Audit Test Suite:** [`server/tests/pilotOperationalReadiness.test.ts`](file:///d:/projects/form2fact/server/tests/pilotOperationalReadiness.test.ts) (17/17 Passed)

---

## 1. EXECUTIVE SUMMARY & AUDIT OBJECTIVE

The Form2Fact V3 Pairwise Scrutiny System has completed extensive functional, cryptographic, statistical, and export firewall remediations. The primary objective of this operational audit is to determine whether Form2Fact V3 is architecturally and operationally safe to begin a **limited, authorized institutional data-collection pilot** with participating technical institutions and regional AICTE directorates.

### Strict Governance Boundary
> [!IMPORTANT]
> **V3 MODEL TRAINING REMAINS STRICTLY BLOCKED UNDER ALL CONDITIONS.**
> No model training or fine-tuning will take place during this pilot. The pilot is exclusively authorized for **statutory document intake, provenance certification, double-blind human annotation, and cryptographic audit logging**.

---

## 2. CROSS-PROCESS DATABASE RELIABILITY & CONCURRENCY (AUDIT TASK 1)

### 2.1 Architectural Analysis of SQLite in Production
The backend database is SQLite 3 via Node.js 22's built-in `node:sqlite` (`DatabaseSync`). SQLite uses database-level locking for writes. In multi-process containerized environments, concurrent write attempts can result in `SQLITE_BUSY` errors or database locked conditions if not managed with immediate transactions, WAL mode, and bounded retries.

### 2.2 Hardened Configuration & Pragma Implementation
In [`server/db.ts`](file:///d:/projects/form2fact/server/db.ts), the database initialization schema was updated with high-concurrency production pragmas:
```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
PRAGMA synchronous = NORMAL;
```
1. **Write-Ahead Logging (`WAL`):** Readers do not block writers, and writers do not block readers. Concurrent reads scale without lock contention.
2. **Busy Timeout (`5000ms`):** Any process attempting a write lock automatically waits up to 5 seconds before returning `SQLITE_BUSY`.
3. **Synchronous Mode (`NORMAL`):** Provides complete ACID durability in WAL mode while avoiding expensive syncs on every transaction.

### 2.3 Atomic Immediate Transactions & Bounded Retry Loop
In `ScrutinyDatabase.recordAudit()`, writes are protected by `BEGIN IMMEDIATE` (which reserves the write lock upfront before reading the latest sequence number) and a bounded retry loop with exponential backoff and jitter:
```typescript
while (attempt <= maxRetries) {
  let startedImmediate = false;
  try {
    try {
      this.db.exec('BEGIN IMMEDIATE');
      startedImmediate = true;
    } catch (txErr: any) {
      if (txErr.message?.includes('cannot start a transaction within a transaction')) {
        this.db.exec('SAVEPOINT audit_record_sp');
      } else {
        throw txErr;
      }
    }
    // Read latest sequenceNumber & currentHash
    // Insert new audit event with cryptographically chained currentHash
    // Commit or release savepoint
    return event;
  } catch (err: any) {
    // Rollback
    if (isBusy && attempt < maxRetries) {
      attempt++;
      const backoffMs = Math.floor(15 * Math.pow(1.4, attempt) + Math.random() * 20);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, backoffMs);
      continue;
    }
    throw err;
  }
}
```

### 2.4 Multi-Process Concurrency Verification
In [`server/tests/pilotOperationalReadiness.test.ts`](file:///d:/projects/form2fact/server/tests/pilotOperationalReadiness.test.ts):
- **Test:** Spawned 4 independent Node.js worker processes via [`server/tests/pilotWorker.ts`](file:///d:/projects/form2fact/server/tests/pilotWorker.ts) writing 20 audit events each (80 concurrent events total) to the same database file.
- **Results:**
  - Zero `SQLITE_BUSY` crashes.
  - Exactly 80 concurrent events recorded.
  - Sequence numbers strictly contiguous from 1 to $N$ with **0 gaps and 0 duplicate sequence numbers**.
  - `verifyLedgerChain()` confirmed an unbroken SHA-256 hash chain across all events.

### 2.5 Process Crash & WAL Recovery Verification
- **Test:** A worker process was abruptly terminated mid-transaction via `process.exit(99)` after writing 5 events.
- **Results:**
  - SQLite WAL recovered automatically upon opening the database in a subsequent process.
  - `PRAGMA integrity_check` returned `ok`.
  - The subsequent write from a fresh process resumed cleanly with sequence continuity ($N+1$) and an unbroken cryptographic hash chain.

### 2.6 Deployment Topology: Single-Writer Architecture Enforcement
> [!CAUTION]
> While SQLite WAL mode with `BEGIN IMMEDIATE` safely handles cross-process writes on local storage, **SQLite must never be mounted across distributed network filesystems (NFS/CIFS)** due to broken POSIX file lock implementations.
> In [`docker-compose.yml`](file:///d:/projects/form2fact/docker-compose.yml), Form2Fact is strictly configured as a **single-node deployment** with a local named volume (`form2fact_data:/app/data`) and a single `api-server` container instance. Multi-replica scaling requires database migration (e.g., PostgreSQL with pgcrypto).

---

## 3. EXTERNAL LEDGER CHECKPOINTS & INTEGRITY PROTECTION (AUDIT TASK 2)

### 3.1 Threat Model
While SQLite append-only triggers (`audit_events_no_update`, `audit_events_no_delete`) prevent tampering via application SQL queries, a compromised host, malicious root administrator, or unauthorized backup restoration could replace or truncate the entire SQLite `.db` file.

### 3.2 External Checkpoint Design & Cryptographic Signing
Implemented in [`server/ledger/externalCheckpoint.ts`](file:///d:/projects/form2fact/server/ledger/externalCheckpoint.ts):
- **Cumulative Root Hash:** Deterministic SHA-256 over all sequence hashes:
  $$\mathcal{H}_{\text{cum}} = \text{SHA256}\left(\sum_{i=1}^N (i \,\|\, \mathcal{H}_i)\right)$$
- **Database Fingerprint:** Captures count of users, institutional dockets, annotation records, and application decisions.
- **HMAC-SHA256 Cryptographic Signature:** Signed using `LEDGER_SIGNING_KEY` (minimum 32 characters), storing key identifier (`keyId`) for key rotation.
- **Independent Storage:** Checkpoint JSON files (`chk-YYYY-MM-DD-seqN-<uuid>.json`) are written to an external directory (`data/checkpoints/` or an independent cold storage bucket), completely decoupled from the SQLite database file.

### 3.3 Rollback & Fork Detection Test Results
Tested in Scope 3 of `pilotOperationalReadiness.test.ts`:
1. **Valid Checkpoint Verification:** Correctly yields status `VERIFIED` with zero errors.
2. **Signature Forgery:** Any modification to signing secret or checkpoint payload yields `SIGNATURE_INVALID`.
3. **Database Rollback Detection:** Restoring an older database backup with lower sequence number ($3 < 9$) immediately triggers `ROLLBACK_DETECTED`:
   ```
   CRITICAL DATABASE ROLLBACK DETECTED: Database highest sequence (3) is lower than
   certified checkpoint sequence (9). An unauthorized restoration or deletion occurred.
   ```
4. **History Fork / Tamper Detection:** Modifying any historical event payload or hash without breaking sequence count immediately triggers `HISTORY_FORKED` or `LEDGER_TAMPERED`.

---

## 4. PROVENANCE AUDIT COMPLETENESS (GAP-SEC-02 REMEDIATION) (AUDIT TASK 3)

### 4.1 Vulnerability Identification
Previously, `verifyDocketProvenance()` updated the docket table and logged an audit event, but recorded only bare status strings in `beforeValue` and `afterValue`. It did not verify the physical file on disk at the moment of provenance certification and did not permanently seal the physical file SHA-256, page count, and authorization reference into the immutable audit ledger.

### 4.2 Remediation Implementation
In [`server/db.ts:verifyDocketProvenance`](file:///d:/projects/form2fact/server/db.ts#L2120-L2180):
1. **Physical File Verification:** Before certification, the on-disk PDF file is read and its physical SHA-256 is calculated. If the checksum fails to match the docket's registered `documentChecksum`, certification aborts immediately.
2. **Canonical Ledger Event:** The audit event records complete structured forensic metadata in `afterValue`:
   ```json
   {
     "docketId": "dkt-45b0c9a1",
     "docketNumber": "AICTE-WRO-2026-AUDIT-001",
     "provenanceStatus": "PROVENANCE_VERIFIED",
     "lifecycleState": "PROVENANCE_VERIFIED",
     "documentChecksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
     "pageCount": 12,
     "authorizationReference": "AICTE/WRO/PROV/2026/042",
     "verifiedBy": "usr-prov-verifier",
     "verifiedAt": "2026-11-07T09:00:00.000Z"
   }
   ```

### 4.3 Verification Results
Scope 4 of `pilotOperationalReadiness.test.ts` passed:
- Provenance certification of authentic physical file succeeds.
- Audit event permanently binds physical SHA-256, page count, and authorization reference.
- Mutated file on disk is strictly rejected with `Physical document SHA-256 verification failed`.

---

## 5. PRODUCTION CONFIGURATION & DEFENSE IN DEPTH (AUDIT TASK 4)

| Control | Mechanism | Verification Status |
| :--- | :--- | :--- |
| **JWT Secrets** | Validated in [`validateProductionConfig.ts`](file:///d:/projects/form2fact/server/core/config/validateProductionConfig.ts); $\ge 32$ chars, default/dev secrets rejected with fatal exit | ✅ Enforced |
| **RBAC Authorization** | Role claims enforced server-side; viewer cannot adjudicate; reviewer cannot escalate; admin cannot modify own role | ✅ Enforced |
| **Tenant Isolation** | Western users cannot access Central/Northern dockets; cross-tenant provenance certification and export rejected with HTTP 403 | ✅ Enforced |
| **File Intake Safety** | Magic-byte signature (`%PDF-`), 20MB size cap, 50-page max, filename path traversal prevention | ✅ Enforced |
| **Export Protection** | 15-Gate Export Firewall strictly rejects demo candidates, unverified provenance, out-of-bounds pages, single annotators | ✅ Enforced |
| **Docker Topology** | Local volume mount `form2fact_data:/app/data`, non-root user, internal AI service network | ✅ Enforced |

---

## 6. GOLD-STANDARD DATASET & TRAINING SEPARATION (AUDIT TASK 5)

### 6.1 Clean Baseline Invariant
- **Authoritative Production Path:** [`ai_service/ml/data/v3/annotations/gold_standard_human.jsonl`](file:///d:/projects/form2fact/ai_service/ml/data/v3/annotations/gold_standard_human.jsonl)
- **Record Count:** Exactly 0 records (0 bytes).
- **V3 Checkpoints Path:** [`ai_service/ml/artifacts/v3/`](file:///d:/projects/form2fact/ai_service/ml/artifacts/v3/)
- **Checkpoints Count:** Exactly 0 trained model weights (only `.gitkeep`).

### 6.2 V1/V2 Model Preservation
V1/V2 production model artifacts, calibrated estimators, training reports, and 1,544-dimensional feature contracts remain intact and unaltered:
- `pairwise_classifier_weights.pkl`
- `v2_calibrated_classifier_weights.pkl`
- `v2_champion_classifier_weights.pkl`
- `v2_model_config.json`

---

## 7. AUDIT SUMMARY TABLE

```
========================================================================================
   FORM2FACT V3 — COMPREHENSIVE VERIFICATION SUITE EXECUTION SUMMARY
========================================================================================
1. Pilot Operational Readiness Suite (pilotOperationalReadiness.test.ts)   : 17/17 PASSED
2. Independent Release Acceptance Audit (independentReleaseAudit.ts)       : 15/15 PASSED
3. 15-Gate Export Firewall Suite (exportFirewallV3.test.ts)                : 14/14 PASSED
4. Cohen's Kappa Mathematical Suite (cohensKappa.test.ts)                  : 14/14 PASSED
5. Human Annotation Workbench Suite (annotationWorkbench.test.ts)          : 83/83 PASSED
6. Institutional Intake & Lifecycle Suite (institutionalIntake.test.ts)     : 10/10 PASSED
7. Zero-Mock Data Integrity Suite (dataIntegrity.test.ts)                  : 111/111 PASSED
8. Phase 1 Core Regression Suite (test-runner.ts)                          : 23/23 SUITES PASSED
9. Python Document Intelligence OCR Suite (test_ocr.py)                    : 5/5 PASSED
10. Python V2 Calibrated ML Inference Suite (ai_service/ml/tests/)         : 32/32 PASSED
11. Frontend TypeScript Compilation (tsc --noEmit)                         : 0 ERRORS
12. Production Frontend Bundle Build (vite build)                          : SUCCESS (12.99s)
========================================================================================
```

---

## 8. FINAL OPERATIONAL READINESS VERDICT

### **VERDICT: B. CONDITIONALLY READY — LIMITED CONTROLLED PILOT**

### Rationale
Form2Fact V3 satisfies all technical, statistical, cryptographic, and operational security requirements to begin a **strictly controlled, limited institutional data collection pilot**. All previously identified gaps (`GAP-SEC-01`, `GAP-SEC-02`, and Cohen's Kappa boundary behaviors) are completely resolved and regression-tested.

### Non-Negotiable Operational Conditions
1. **V3 Model Training Strictly Prohibited:** No model training or weight generation shall occur during this pilot. Model training remains locked until gold-standard dataset volume ($\ge 200$ high-quality verified pairs) and statistical agreement criteria ($\kappa \ge 0.70$) are certified by independent audit.
2. **Single-Writer Deployment Topology:** Form2Fact must be deployed on a single host container with local disk persistence. Multi-node distributed deployment on network shares is strictly forbidden.
3. **Daily External Ledger Checkpoint Execution:** Operational personnel must execute and verify daily signed HMAC checkpoints to external storage as detailed in the pilot SOPs.
4. **Institutional Consent & Provenance Verification:** Every ingested docket must have a verifiable Regional Directorate authorization reference and on-disk SHA-256 certification prior to human annotation.

