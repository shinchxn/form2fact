# FORM2FACT V3 — INSTITUTIONAL DATA COLLECTION STANDARD OPERATING PROCEDURES (SOPs)

**Document Reference:** AICTE/WRO/SCRUTINY/SOP-V3-2026-01  
**Classification:** Official Regulatory Standard  
**Effective Date:** November 7, 2026  
**Audience:** Directorate Officers, Regional Scrutiny Reviewers, Technical Adjudicators, MLOps Engineers

---

## 1. PURPOSE & REGULATORY MANDATE

This document establishes the binding operational procedures for conducting the **Form2Fact V3 Institutional Data Collection Pilot**. The purpose of the pilot is to collect, verify, and double-blind annotate authentic institutional claim/evidence pairs from participating technical education institutions across regional directorates.

> [!IMPORTANT]
> **STRICT BAN ON MODEL TRAINING:**
> All procedures in this document govern data intake, verification, human annotation, and cryptographic audit logging. No personnel or automated systems are authorized to train or fine-tune machine learning models during the pilot phase.

---

## 2. SOP 1: INSTITUTIONAL AUTHORIZATION & CONSENT

### 2.1 Statutory Prerequisite
No institutional document may be uploaded, stored, or annotated without a formal **Institutional Participation Agreement** executed between the head of the technical institution and the authorized AICTE Regional Directorate Officer.

### 2.2 Mandatory Authorization Reference
Every ingestion dossier must carry a unique, verifiable Regional Directorate authorization reference in the standard format:
$$\text{AICTE / } \langle\text{REGION}\rangle \text{ / } \langle\text{DIRECTORATE}\rangle \text{ / } \langle\text{YEAR}\rangle \text{ / } \langle\text{REF-NO}\rangle$$
*(Example: `AICTE/WRO/SCRUTINY/2026/DKT-104`)*

### 2.3 Record Retention of Authorization
The scanned original consent letter with institutional seal and authorized signature must be archived alongside the institutional docket and referenced in the `authorizationReference` field.

---

## 3. SOP 2: REVIEWER & ADJUDICATOR ONBOARDING & REVOCATION

### 3.1 Reviewer Eligibility
Only qualified faculty members, statutory scrutiny officers, or appointed technical experts possessing verified government or academic identity credentials may be onboarded as Reviewers or Adjudicators.

### 3.2 Role-Based Access Control (RBAC) Hierarchy
- **Viewer (`Viewer`):** Read-only access to regional institutional findings. Blocked from creating candidate tasks, annotating, or adjudicating.
- **Reviewer (`Reviewer`):** Authorized to perform first or second blind annotations. Can certify document provenance within their assigned regional directorate.
- **Adjudicator (`Administrator` or designated Senior Scrutiny Lead):** Authorized to resolve disputed records where Reviewer annotations diverge. Strictly barred from adjudicating records they individually annotated.

### 3.3 Credential Onboarding Procedure
1. Regional Administrator creates account via `/api/v1/auth/bootstrap-admin` or administrative dashboard.
2. Reviewer registers with institutional email (`@scrutiny.edu.in` or government domain).
3. Reviewer authorization record is registered in `reviewer_authorizations` table recording:
   - `verifiedIdentityRef` (e.g. Faculty ID / AICTE Scrutiny Roster No.)
   - `issuingAuthority`
   - `authorizationReference`
   - `expiryDate`
4. Password policy: minimum 12 characters, requiring upper, lower, numeric, and special characters. Known default passwords (`Admin123!`, etc.) are blocked by system validation.

### 3.4 Immediate Revocation & Offboarding
Upon completion of pilot tenure, transfer, or breach of scrutiny protocol:
1. Administrator executes revocation via `POST /api/v1/reviewers/:id/revoke`.
2. Existing JWT tokens are revoked instantly (system returns `ROLE_REVOKED` or 401 Unauthorized).
3. Revocation reason and timestamp are committed to the cryptographic audit ledger.

---

## 4. SOP 3: DOCUMENT INTAKE & PROVENANCE VERIFICATION

### 4.1 Permitted File Formats & Bounds
- **Format:** Authentic PDF documents only.
- **Magic-Byte Signature:** Must start with `%PDF-` (`0x25 0x50 0x44 0x46 0x2D`). Spoofed executable or script extensions are rejected at the HTTP edge.
- **Size Limit:** Maximum 20MB per document.
- **Page Limit:** Maximum 50 pages per docket.
- **Path Isolation:** Files are stored under `/app/data/dockets/<DOCKET_ID>/` with randomized UUIDs; directory traversal sequences (`../`) are strictly blocked.

### 4.2 Ingestion & SHA-256 Checksum Calculation
Upon physical receipt or portal upload:
1. Calculate full-file SHA-256 hash immediately upon arrival.
2. Ingest docket via `ScrutinyDatabase.createInstitutionalDocket()` recording:
   - `docketNumber`, `institutionName`, `sourceOrganization`, `authorizationReference`
   - Computed `documentChecksum`, `pageCount`, and `documentPath`
3. Lifecycle state initializes to `DATA_SOURCE_IDENTIFIED`. Initial provenance status is `PROVENANCE_PENDING`.

### 4.3 Provenance Certification Protocol
Before any document is made available for annotation:
1. An authorized Regional Reviewer verifies the document against the official state gazette or statutory filing register.
2. The reviewer executes provenance certification (`verifyDocketProvenance`).
3. The system reads the physical file from disk and recalculates its SHA-256. If mutated, certification fails closed.
4. Provenance status updates to `PROVENANCE_VERIFIED`.
5. Canonical audit event records `{ docketId, docketNumber, documentChecksum, pageCount, authorizationReference, verifiedBy, verifiedAt }` in the immutable hash chain.

---

## 5. SOP 4: DOUBLE-BLIND HUMAN ANNOTATION

### 5.1 Blind Review Isolation
1. Every candidate pair must be reviewed independently by **two separate authorized Reviewers**.
2. **Double-Blind Protection:** Reviewer 2 is strictly prevented from viewing Reviewer 1's label, rationale, or timestamp until both have submitted their determinations.
3. Attempting to retrieve peer annotations returns HTTP 403 or masked payloads.

### 5.2 Five-Class Statutory Taxonomy
Annotators must select exactly one of the five canonical classes:
1. **MATCH:** Exact or normalized statutory concordance between declared claim and documentary evidence (e.g., matching cadastral survey numbers, valid unexpired lease dates).
2. **MISMATCH:** Explicit material contradiction or deficit (e.g., declared 7.50 acres vs. deed showing only 4.00 acres; lease expired).
3. **MISSING:** Statutory evidence document or required field omitted from the filing.
4. **NOT_COMPARABLE:** Incompatible statutory concepts improperly cross-referenced (e.g., lease tenure vs. fire safety certificate).
5. **UNCERTAIN:** Ambiguous phrasing, low-confidence OCR, or contradictory secondary exhibits requiring forensic audit.

### 5.3 Mandatory Substantive Rationale
Every annotation must include a clear, written statutory justification:
- **Minimum Length:** $\ge 10$ characters.
- **Content:** Must cite document title, page number, and specific statutory criteria. Generic entries (e.g., "looks ok", "approved") are rejected by API validation.

---

## 6. SOP 5: DISAGREEMENT ADJUDICATION

### 6.1 Automated Consensus & Dispute Detection
- **Consensus:** When Reviewer 1 and Reviewer 2 assign the identical label, the system marks the record as `agreed` and automatically confirms the `finalLabel`.
- **Disagreement:** When Reviewer 1 and Reviewer 2 assign divergent labels, the record automatically transitions to `disputed`. The `finalLabel` is withheld.

### 6.2 Adjudicator Assignment & Conflict-of-Interest Rule
- A third, independent Senior Reviewer or Directorate Adjudicator is assigned.
- **Strict Conflict of Interest Protection:** If the adjudicator was either Reviewer 1 or Reviewer 2 on that specific candidate, the adjudication attempt is strictly rejected by server-side validation.

### 6.3 Final Adjudication Protocol
1. The neutral adjudicator reviews the claim, evidence, and both blind rationales.
2. The adjudicator submits a binding decision with a detailed statutory rationale ($\ge 10$ characters).
3. Record transitions to `adjudicated`, recording `adjudicatorId`, `adjudicatedAt`, and `adjudicationRationale`.
4. The event is permanently appended to the cryptographic audit ledger.

---

## 7. SOP 6: DAILY EXTERNAL LEDGER CHECKPOINTS & INTEGRITY MONITORING

### 7.1 Daily Checkpoint Execution Schedule
At 23:59 regional time daily, the system administrator or automated cron job executes:
```typescript
const checkpoint = db.createLedgerCheckpoint({
  keyId: process.env.LEDGER_SIGNING_KEY_ID,
  signingSecret: process.env.LEDGER_SIGNING_KEY,
  checkpointDir: '/app/checkpoints'
});
```
1. Computes deterministic cumulative SHA-256 hash over all audit events.
2. Signs the checkpoint canonical string using HMAC-SHA256.
3. Exports checkpoint file to an independent off-site backup storage volume.

### 7.2 Verification on Startup & Incident Alerts
Upon server start or weekly compliance audit:
1. Run `verifyLedgerAgainstCheckpoint(events, checkpoint, signingKey)`.
2. **Alert Conditions:**
   - `ROLLBACK_DETECTED`: Indicates unauthorized database restoration or event truncation. System halts startup and raises Security Alert Level 1.
   - `HISTORY_FORKED`: Indicates event alteration in historical sequences. System triggers immediate quarantine.
   - `SIGNATURE_INVALID`: Indicates tampered checkpoint or compromised signing key.

---

## 8. SOP 7: BACKUP, RECOVERY & DATABASE MAINTENANCE

### 8.1 SQLite WAL Checkpoint Prior to Backup
Because SQLite in WAL mode writes transactions to `-wal` files, standard file copying while active can lead to incomplete backups.
**Mandatory Backup Sequence:**
1. Execute WAL truncate checkpoint:
   ```sql
   PRAGMA wal_checkpoint(TRUNCATE);
   ```
2. Copy primary `.db` file to dated backup volume:
   $$\text{form2fact-backup-YYYY-MM-DD-HHMMSS.db}$$
3. Create corresponding signed daily ledger checkpoint.
4. Verify restored copy integrity via `PRAGMA integrity_check;`.

---

## 9. SOP 8: DATA RETENTION, REDACTION & STATUTORY QUARANTINE

### 9.1 Data Minimization & PII Redaction
- Institutional filings must not contain private student records, personal financial accounts, or unnecessary biometric identifiers.
- If incidental PII is identified in an ingested document, it must be flagged for redaction before annotation candidate generation.

### 9.2 Statutory Quarantine
Any record or docket subject to institutional challenge, dispute, or investigation must be flagged with `isQuarantined = 1`. Gate 15 of the export firewall automatically excludes quarantined candidates from gold-standard inclusion.

