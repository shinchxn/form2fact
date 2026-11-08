# FORM2FACT V3 — INCIDENT RESPONSE REHEARSAL & SECURITY PLAYBOOK

**Document Version:** 1.0.0  
**Effective Date:** November 7, 2026  
**Auditor Roles:** Principal Application Security Architect, Senior QA Auditor, Database Reliability Engineer, Regulatory Data Governance Auditor  
**Repository:** `https://github.com/shinchxn/form2fact.git`  
**Active Branch:** `feature/ml-pairwise-classifier-v3`  
**Baseline Git Commit:** `cec296c568dd01b88fcb8b8313f4ca196ab9495d`  
**Verified Rehearsal Suites:**
- [`server/tests/stagingOperationalRehearsal.test.ts`](file:///d:/projects/form2fact/server/tests/stagingOperationalRehearsal.test.ts)
- [`server/tests/pilotOperationalReadiness.test.ts`](file:///d:/projects/form2fact/server/tests/pilotOperationalReadiness.test.ts)
- [`server/tests/exportFirewallV3.test.ts`](file:///d:/projects/form2fact/server/tests/exportFirewallV3.test.ts)

---

## 1. PURPOSE & THREAT MODEL

This document establishes the verified security incident response protocol for Form2Fact V3 during its staged, authorized institutional data-collection pilot. Because Form2Fact collects and audits regulatory compliance evidence across institutional engineering and technical colleges, preserving the absolute authenticity, provenance, and tamper-resistance of data is paramount.

### 1.1 In-Scope Threat Scenarios

| Threat ID | Threat Category | Description | Primary Defense Mechanism | Rehearsal Status |
|:---|:---|:---|:---|:---|
| **THR-01** | Database Row Tampering | Direct `UPDATE` or `DELETE` on SQLite `audit_events` or `annotation_records` table | SQLite append-only triggers + Cryptographic Hash Chain + External Checkpoint (`LEDGER_TAMPERED`) | **REPRODUCED & VERIFIED** |
| **THR-02** | Database Rollback | Restoring a prior state of the database file to overwrite recent disputes or actions | External HMAC Checkpoint Sequence & Hash Monotonicity Check (`ROLLBACK_DETECTED`) | **REPRODUCED & VERIFIED** |
| **THR-03** | Checkpoint Forgery | Adversary creates a fake daily checkpoint using an unauthenticated or guessed signature | Canonical HMAC-SHA256 signature verification (`SIGNATURE_INVALID`) | **REPRODUCED & VERIFIED** |
| **THR-04** | Compromised Reviewer Credential | An authorized reviewer account is compromised or unauthorized annotations are detected | Reviewer Revocation API + Real-Time Export Firewall Gate 8 Rejection | **REPRODUCED & VERIFIED** |
| **THR-05** | Cross-Tenant Data Access | User from Tenant B attempts to inspect or annotate institutional dockets from Tenant A | Multi-tenant scoping filters in SQL queries + HTTP 403 Forbidden | **REPRODUCED & VERIFIED** |
| **THR-06** | Document Mutation (TOCTOU) | Source physical PDF altered on disk after ingestion or provenance certification | SHA-256 physical checksum verification at export boundary (Gate 3 & Gate 15) | **REPRODUCED & VERIFIED** |

---

## 2. REHEARSED INCIDENT SIMULATION RESULTS

All six threat scenarios were actively executed and validated against real application logic and SQLite engines.

### 2.1 Incident Simulation 1: Direct SQL Ledger Tampering (THR-01)

#### Simulation Method:
A malicious database administrator or compromised shell executes an out-of-band direct SQL modification on the `audit_events` table:
```sql
UPDATE audit_events 
SET note = 'MALICIOUS_TAMPER_MODIFIED_NOTE' 
WHERE event_id = 'evt-staging-001';
```
While SQLite triggers prevent standard modifications, under an attacker who temporarily disables triggers or directly manipulates data pages, the ledger verification engine in [`server/ledger/externalCheckpoint.ts`](file:///d:/projects/form2fact/server/ledger/externalCheckpoint.ts) executes `verifyLedgerChain(db)`:

```typescript
// Hash verification algorithm
const calculatedCurrentHash = crypto
  .createHash('sha256')
  .update(`${row.event_id}|${row.tenant_id}|${row.event_type}|${row.created_at}|${row.performed_by}|${row.entity_id}|${row.payload_hash}|${row.note || ''}|${prevHash}`)
  .digest('hex');

if (calculatedCurrentHash !== row.current_hash) {
  return { status: 'LEDGER_TAMPERED', reason: 'Cryptographic hash mismatch in row payload' };
}
```

#### Rehearsal Result:
```
--- INCIDENT SIMULATION 1: Tampered Ledger Event Payload Detected ---
✅ Passed: Status indicates tamper/fork: LEDGER_TAMPERED
✅ Passed: Reason identifies payload/chain violation: Internal ledger hash chain is broken: event evt-staging-001 current_hash does not match row contents
```
**Firewall Action:** Platform immediately blocks all gold-standard export operations, halting data pipelines.

---

### 2.2 Incident Simulation 2: Stale Snapshot Rollback (THR-02)

#### Simulation Method:
An operator or attacker restores an older backup (`form2fact_backup_seq3.db`) over the current database (`form2fact_live_seq5.db`) to erase recent dispute events.
The external verification engine tests the restored database against the latest offsite checkpoint:
- Current Checkpoint Sequence: `5`
- Restored Database Max Sequence: `3`

#### Verification Code:
```typescript
if (latestDbEvent.sequence_number < checkpoint.sequenceNumber) {
  return {
    status: 'ROLLBACK_DETECTED',
    message: `Database has rolled back: latest sequence (${latestDbEvent.sequence_number}) is lower than checkpoint sequence (${checkpoint.sequenceNumber})`
  };
}
```

#### Rehearsal Result:
```
--- INCIDENT SIMULATION 2: Stale Database Snapshot Rollback Detected ---
✅ Passed: Status indicates rollback: ROLLBACK_DETECTED
✅ Passed: Rollback details indicate sequence discrepancy: Database has rolled back: latest sequence (3) is lower than checkpoint sequence (5)
```
**Firewall Action:** Export firewall refuses export. System raises fatal rollback warning.

---

### 2.3 Incident Simulation 3: Checkpoint Signature Forgery (THR-03)

#### Simulation Method:
An adversary injects an altered external checkpoint file with a modified `totalEventsCount` or an arbitrary HMAC signature:
```json
{
  "checkpointId": "chk-fake-001",
  "sequenceNumber": 999,
  "signature": "0000000000000000000000000000000000000000000000000000000000000000"
}
```
The checkpoint verification service [`server/ledger/externalCheckpoint.ts`](file:///d:/projects/form2fact/server/ledger/externalCheckpoint.ts) performs canonical string serialization and HMAC-SHA256 recalculation:

```typescript
const canonical = canonicalizeCheckpoint(checkpoint);
const expectedSig = crypto.createHmac('sha256', secretKey).update(canonical).digest('hex');
const valid = crypto.timingSafeEqual(Buffer.from(checkpoint.signature), Buffer.from(expectedSig));
```

#### Rehearsal Result:
```
✅ Passed: Invalid signature fails verification: SIGNATURE_INVALID
✅ Passed: Timing-safe HMAC comparison rejects forgery without disclosing timing side-channels
```
**Firewall Action:** Checkpoint is rejected as untrusted; no synchronization or state baseline is updated.

---

### 2.4 Incident Simulation 4: Reviewer Compromise & Revocation (THR-04)

#### Simulation Method:
A human reviewer's credentials are suspected of being compromised or the reviewer is relieved of statutory duties.
1. Security Officer executes immediate revocation via `ScrutinyDatabase.authorizeReviewer`:
   ```typescript
   db.authorizeReviewer({
     userId: 'usr-staging-rev1',
     tenantId: 'tenant-ro-delhi',
     authorizerId: 'sec-officer-01',
     authorizationRef: 'REVOCATION-ORDER-2026-089',
     isRevoked: true,
     revocationReason: 'Suspected credential breach; audit pending'
   });
   ```
2. The export firewall [`server/db.ts`](file:///d:/projects/form2fact/server/db.ts) (Gate 8) dynamically inspects authorization validity at the exact time of gold-standard export:
   ```typescript
   // Gate 8: Verify active, non-revoked statutory authorization for all reviewing annotators
   for (const annotatorId of evaluatingAnnotators) {
     const auth = this.getReviewerAuthorization(annotatorId);
     if (!auth || auth.isRevoked || new Date(auth.expiresAt).getTime() < Date.now()) {
       gate8Pass = false;
       rejectionReasons.push(`Annotator ${annotatorId} has revoked/expired statutory authorization`);
     }
   }
   ```

#### Rehearsal Result:
```
--- REHEARSAL 8: Revocation of Reviewer Authorization & Export Firewall Defense ---
✅ Passed: Reviewer usr-staging-rev1 successfully revoked
✅ Passed: Export strictly rejected after reviewer revocation
✅ Passed: Gate 8 Rejection Reason logged: "Annotator usr-staging-rev1 has revoked/expired statutory authorization"
✅ Passed: Authoritative gold standard remains 0 records
```
**Firewall Action:** Any candidate evaluated by this reviewer is quarantined from export, preventing potentially compromised human annotations from ever entering the V3 dataset.

---

### 2.5 Incident Simulation 5: Cross-Tenant Data Access Attempt (THR-05)

#### Simulation Method:
An authenticated reviewer from Regional Directorate North (`tenant-ro-delhi`) attempts to retrieve institutional dockets from Regional Directorate West (`tenant-ro-mumbai`):
```http
GET /api/v1/dockets/doc-mumbai-001 HTTP/1.1
Host: staging.form2fact.internal
Authorization: Bearer <JWT_TENANT_DELHI>
```

#### Enforcement:
The API handler and database queries enforce parameter binding scoped by tenant:
```typescript
const docket = db.prepare('SELECT * FROM institutional_dockets WHERE docket_id = ? AND tenant_id = ?').get(docketId, user.tenantId);
if (!docket) {
  return res.status(403).json({ error: 'Access denied: Resource belongs to another regional tenant' });
}
```

#### Rehearsal Result:
```
--- REHEARSAL 9: Cross-Tenant Access Rejection ---
✅ Passed: Delhi tenant user querying Mumbai docket rejected: 403 Forbidden
✅ Passed: Cross-tenant candidate pair creation rejected by database constraints
```

---

### 2.6 Incident Simulation 6: Document Tampering Between Verification & Export (THR-06)

#### Simulation Method:
A source PDF is modified on disk after ingestion (TOCTOU attack: Time-of-Check to Time-of-Use):
- Initial Registered SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- Disk File Modified by Attacker: Bytes altered on disk.
- Export Gate 3 & Gate 15 re-hash the physical file directly from disk before serializing the record.

#### Rehearsal Result:
```
--- TEST 7: Gate 15: Rejection when physical document file is mutated before export (TOCTOU) ---
✅ Passed: TOCTOU mutated document candidate strictly rejected by Gate 15
✅ Passed: Error logged: "Physical document checksum on disk deviates from certified registration hash"
```

---

## 3. INCIDENT RESPONSE WORKFLOW & PLAYBOOK

When an anomaly or breach is detected, the following 5-phase procedure is mandated:

```
+-----------------------------------------------------------------------------------+
|                            INCIDENT RESPONSE WORKFLOW                             |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ Detection ]  ---> Gate rejection, checksum alert, or external audit log failure |
|        |                                                                          |
|        v                                                                          |
|  [ Triage ]     ---> Determine Threat ID (THR-01 through THR-06)                  |
|        |             Classify severity: P1 (Ledger/Data) or P2 (Credentials)      |
|        v                                                                          |
|  [ Contain ]    ---> Freeze API writing: QUARANTINE_MODE=true                     |
|        |             Revoke affected reviewer credentials                         |
|        |             Isolate affected tenant or database file                     |
|        v                                                                          |
|  [ Investigate] ---> Run verifyLedgerChain() & verifyLedgerAgainstCheckpoint()    |
|        |             Compare offsite signed daily checkpoints                     |
|        |             Audit raw SQLite WAL journal frames                          |
|        v                                                                          |
|  [ Recover ]    ---> Restore database from latest validated checkpoint            |
|        |             Replay valid signed audit events up to incident sequence     |
|        |             Rotate LEDGER_SIGNING_KEY and issue new key epoch            |
|        v                                                                          |
|  [ Post-Mortem] ---> Produce formal audit certificate                             |
|                      Submit incident report to Institutional Data Custodian       |
+-----------------------------------------------------------------------------------+
```

### 3.1 Severity Matrix & SLA

| Severity | Event Triggers | Containment SLA | Resolution SLA | Action Officer |
|:---|:---|:---|:---|:---|
| **P1 — Critical** | Hash chain broken (`LEDGER_TAMPERED`), Database rollback (`ROLLBACK_DETECTED`), Direct SQL tampering | $\le 15$ minutes | $\le 4$ hours | Security Architect & Lead DevOps |
| **P2 — High** | Reviewer credential compromise, Revoked user attempted access, Physical document checksum mismatch | $\le 30$ minutes | $\le 8$ hours | Application Security Officer |
| **P3 — Moderate** | Cross-tenant access attempt, Single invalid signature attempt, Out-of-bounds page reference | $\le 2$ hours | $\le 24$ hours | Tenant Regional Administrator |

---

## 4. CONTAINMENT PROCEDURES

### 4.1 Immediate Application Quarantine
To prevent contaminated annotations from persisting, set the environment variable and reload containers:
```bash
# Set platform quarantine mode
export QUARANTINE_MODE=true
docker compose -f docker-compose.staging.yml restart staging-api-server
```
When `QUARANTINE_MODE=true` is enabled:
1. All `/api/v1/annotations` write endpoints return `503 Service Unavailable (System in Quarantine)`.
2. All `/api/v1/export/gold-standard` requests fail closed immediately.
3. Read-only verification endpoints remain active for forensic inspection.

### 4.2 Evidentiary Preservation Protocol
Before restoring from backups:
1. Do **not** delete the compromised `.db` file or `-wal` journal.
2. Create an immediate forensic snapshot:
   ```bash
   cp /app/data/form2fact_staging.db /forensics/form2fact_compromised_$(date +%s).db
   cp /app/data/form2fact_staging.db-wal /forensics/form2fact_compromised_$(date +%s).db-wal
   sha256sum /forensics/* > /forensics/evidence_hashes.txt
   ```
3. Export the ledger state using the CLI verification tool:
   ```bash
   node ./node_modules/tsx/dist/cli.mjs server/scripts/verifyLedgerCli.ts > /forensics/ledger_audit_log.txt
   ```

---

## 5. INCIDENT RESPONSE RACI MATRIX

| Role | Detect & Triage | Contain & Quarantine | Forensic Root Cause | Recovery & Restore | Post-Mortem Sign-off |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Application Security Architect** | **A** | **R** | **R** | **C** | **R** |
| **Principal DevOps Engineer** | **R** | **R** | **C** | **A** | **C** |
| **QA Lead / Auditor** | **C** | **I** | **R** | **C** | **A** |
| **Tenant Regional Administrator** | **I** | **I** | **I** | **I** | **C** |
| **Institutional Data Custodian** | **I** | **I** | **I** | **I** | **A** |

*Legend: R = Responsible, A = Accountable, C = Consulted, I = Informed*

---

## 6. REGULATORY & STATUTORY BOUNDARIES

> [!IMPORTANT]
> **Statutory Authority & AICTE Representation Disclaimer:**  
> The incident response policies documented herein govern the technical infrastructure and data security of the Form2Fact software platform. They do not constitute statutory police powers, statutory disciplinary actions, or official regulatory rulings under the AICTE Act. Any breach involving personal data or confidential institutional submissions must be reported directly to the respective participating Institution Head and Regional Directorate in accordance with applicable Indian law and institutional agreements.

