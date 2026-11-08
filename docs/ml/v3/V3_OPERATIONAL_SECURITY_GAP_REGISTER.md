# FORM2FACT V3 — OPERATIONAL SECURITY & RELIABILITY GAP REGISTER

**Version:** 3.0-Pilot  
**Last Updated:** November 7, 2026  
**Auditor Roles:** Principal Security Architect, Database Reliability Engineer, Senior MLOps Auditor  
**Repository Branch:** `feature/ml-pairwise-classifier-v3`

---

## 1. REGISTER SUMMARY

| Gap Identifier | Severity | Category | Status | Verification Reference |
| :--- | :--- | :--- | :--- | :--- |
| **GAP-SEC-01** | **CRITICAL** | Export Firewall / Data Isolation | **RESOLVED & VERIFIED** | [`exportFirewallV3.test.ts`](file:///d:/projects/form2fact/server/tests/exportFirewallV3.test.ts) (Tests 2-6) |
| **GAP-SEC-02** | **HIGH** | Ledger Provenance Forensic Integrity | **RESOLVED & VERIFIED** | [`pilotOperationalReadiness.test.ts`](file:///d:/projects/form2fact/server/tests/pilotOperationalReadiness.test.ts) (Scope 4) |
| **GAP-STAT-01**| **HIGH** | Statistical Validation / Cohen's Kappa | **RESOLVED & VERIFIED** | [`cohensKappa.test.ts`](file:///d:/projects/form2fact/server/tests/cohensKappa.test.ts) (Tests 1-8) |
| **GAP-OPS-01** | **HIGH** | Database Concurrency / Write Lock | **RESOLVED & VERIFIED** | [`pilotOperationalReadiness.test.ts`](file:///d:/projects/form2fact/server/tests/pilotOperationalReadiness.test.ts) (Scope 1) |
| **GAP-OPS-02** | **HIGH** | Database Rollback & Backup Replacement | **RESOLVED & VERIFIED** | [`pilotOperationalReadiness.test.ts`](file:///d:/projects/form2fact/server/tests/pilotOperationalReadiness.test.ts) (Scope 3) |
| **GAP-OPS-03** | **MEDIUM** | Process Crash During Transaction | **RESOLVED & VERIFIED** | [`pilotOperationalReadiness.test.ts`](file:///d:/projects/form2fact/server/tests/pilotOperationalReadiness.test.ts) (Scope 2) |
| **GAP-GOV-01** | **CRITICAL** | Premature Model Training / Data Bleed | **MITIGATED & ENFORCED** | Zero V3 Weights Invariant; Training Locked |

---

## 2. DETAILED GAP PROFILES & REMEDIATIONS

### GAP-SEC-01: Export Firewall Bypassed on Missing or Null Document ID
- **Severity:** Critical (P0)
- **Component:** `server/db.ts:verifyGoldStandardExportGates`
- **Vulnerability Description:** If an annotation record contained a non-empty `claimDocumentName` but a null or omitted `claimDocumentId`, the document lookup was skipped, allowing records without resolved document backing to bypass Gate 2, Gate 3, Gate 4, and Gate 5.
- **Root Cause:** Gate 2 only validated `claimDocumentName` presence and did not require mandatory non-null `claimDocumentId`.
- **Technical Remediation:**
  1. Mandated `claimDocumentId` and `evidenceDocumentId` resolution in Gate 2.
  2. Implemented `resolveDocById(docId, tenantOrgId)` which searches both application documents and institutional dockets.
  3. Strict rejection if non-empty name is accompanied by null/empty ID.
  4. Cross-tenant document isolation: rejection if referenced document belongs to a different regional organization.
  5. Downstream Gates 3, 4, 5 operate strictly on resolved document object, never metadata strings.
- **Verification:** [`exportFirewallV3.test.ts`](file:///d:/projects/form2fact/server/tests/exportFirewallV3.test.ts) Tests 2, 3, 4, 5, 6 passed.

---

### GAP-SEC-02: Incomplete Physical Provenance Metadata in Canonical Audit Ledger
- **Severity:** High (P1)
- **Component:** `server/db.ts:verifyDocketProvenance`
- **Vulnerability Description:** When an institutional docket's provenance was certified, the audit event recorded only status strings (`beforeValue: docket.provenanceStatus`, `afterValue: status`). The physical file on disk was not verified at certification time, and the physical SHA-256 checksum, page count, authorization reference, docket ID, and verifier identity were not sealed into the immutable cryptographic audit ledger.
- **Root Cause:** Audit event payload was unformatted and did not record complete provenance forensic metadata.
- **Technical Remediation:**
  1. Updated `verifyDocketProvenance` to verify that the physical file exists at `docket.documentPath` and its computed SHA-256 matches `docket.documentChecksum`.
  2. Rejection with clear error if physical file is tampered or missing.
  3. Structured JSON payload recorded in `afterValue` containing:
     - `docketId`
     - `docketNumber`
     - `provenanceStatus`
     - `lifecycleState`
     - `documentChecksum` (physical file SHA-256)
     - `pageCount`
     - `authorizationReference`
     - `verifiedBy`
     - `verifiedAt`
- **Verification:** [`pilotOperationalReadiness.test.ts`](file:///d:/projects/form2fact/server/tests/pilotOperationalReadiness.test.ts) Scope 4 passed.

---

### GAP-STAT-01: Cohen's Kappa Mathematical Degeneracy & Undefined Boundary Cases
- **Severity:** High (P1)
- **Component:** `server/metrics/cohensKappa.ts`
- **Vulnerability Description:** Cohen's Kappa formula $\kappa = \frac{p_o - p_e}{1 - p_e}$ produced mathematically ungrounded results in edge cases:
  1. For $N=0$ or $N=1$ with agreement, denominator $(1 - p_e) = 0$, producing NaN or division by zero.
  2. Coercing degenerate marginal distributions ($p_e = 1.0$) to $0.0$ or $1.0$ masked complete statistical unreliability.
  3. Negative kappa (systematic disagreement) was not handled symmetrically.
  4. Small sample heuristic ($N < 30$) was missing or over-claimed as a mathematical certainty.
- **Technical Remediation:**
  1. Formally implemented standard Cohen (1960) formulation across 5-class pairwise taxonomy.
  2. When $N = 0$, returns `kappa = null`, `po = null`, `pe = null`, `undefinedReason = 'no_paired_annotations'`.
  3. When $1 - p_e = 0$, returns `kappa = null` with `undefinedReason = 'denominator_zero_chance_agreement_one'`, preserving `rawAgreementRate` separately.
  4. Symmetric support for valid negative kappa down to $-1.0$.
  5. Transparent advisory warning for $N < 30$ explaining that $N \ge 30$ is an empirical heuristic, not a mathematical guarantee.
- **Verification:** [`cohensKappa.test.ts`](file:///d:/projects/form2fact/server/tests/cohensKappa.test.ts) (14/14 tests passed).

---

### GAP-OPS-01: Multi-Process SQLite Write Lock Contention & SQLITE_BUSY
- **Severity:** High (P1)
- **Component:** `server/db.ts:recordAudit` & database connection
- **Vulnerability Description:** In concurrent scenarios, multiple processes attempting to append audit events simultaneously could encounter `SQLITE_BUSY` crashes or race conditions reading the latest sequence number.
- **Technical Remediation:**
  1. Enabled `PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA synchronous = NORMAL;`.
  2. Wrapped `recordAudit` in `BEGIN IMMEDIATE` / `SAVEPOINT` to reserve write locks upfront before computing sequence numbers.
  3. Implemented a bounded retry loop (up to 10 attempts) with exponential backoff and jitter using `Atomics.wait`.
  4. Enforced single-writer architecture in deployment topology.
- **Verification:** [`pilotOperationalReadiness.test.ts`](file:///d:/projects/form2fact/server/tests/pilotOperationalReadiness.test.ts) Scope 1 (4 processes, 80 concurrent events, strictly contiguous sequence 1..N, unbroken hash chain).

---

### GAP-OPS-02: Primary Database Rollback, Deletion, or State Replacement
- **Severity:** High (P1)
- **Component:** `server/ledger/externalCheckpoint.ts`
- **Vulnerability Description:** While SQLite internal triggers prevent modifications inside the active database, an external attacker or operational mistake could restore an older database snapshot, rolling back audit records undetected.
- **Technical Remediation:**
  1. Designed external signed daily ledger checkpoints stored outside the SQLite database file.
  2. Cumulative SHA-256 root hash over all sequential event hashes.
  3. HMAC-SHA256 signature using external `LEDGER_SIGNING_KEY` with key identifier rotation.
  4. Verification detects sequence regressions (`ROLLBACK_DETECTED`), payload alterations (`HISTORY_FORKED`), and signature tampering (`SIGNATURE_INVALID`).
- **Verification:** [`pilotOperationalReadiness.test.ts`](file:///d:/projects/form2fact/server/tests/pilotOperationalReadiness.test.ts) Scope 3 passed.

---

### GAP-OPS-03: Process Crash During Write Transaction
- **Severity:** Medium (P2)
- **Component:** SQLite Write-Ahead Log
- **Vulnerability Description:** Sudden server crash or termination mid-transaction could leave corrupt state or orphaned lock files.
- **Technical Remediation:**
  1. SQLite WAL atomic commit ensures partially written transactions are completely rolled back upon subsequent open.
  2. Automated recovery verified on fresh process restart.
  3. `PRAGMA integrity_check` verified passing after abrupt `process.exit(99)`.
- **Verification:** [`pilotOperationalReadiness.test.ts`](file:///d:/projects/form2fact/server/tests/pilotOperationalReadiness.test.ts) Scope 2 passed.

---

### GAP-GOV-01: Premature Model Training on Insufficient Human Data
- **Severity:** Critical (P0)
- **Component:** `ai_service/ml/training/`
- **Vulnerability Description:** Attempting to train or fine-tune V3 models on small, synthetic, or unadjudicated data risks degrading model calibration and violating statutory AICTE scrutiny standards.
- **Technical Remediation:**
  1. Model training strictly prohibited throughout pilot phase.
  2. Authoritative gold-standard file locked at 0 records.
  3. V3 model artifacts directory restricted to `.gitkeep`.
  4. Full V1/V2 production artifacts preserved for live inference.
- **Verification:** [`pilotOperationalReadiness.test.ts`](file:///d:/projects/form2fact/server/tests/pilotOperationalReadiness.test.ts) Scope 5 passed.

