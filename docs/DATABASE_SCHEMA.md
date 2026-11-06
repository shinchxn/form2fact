# Form2Fact — SQLite Database Schema & Entity Models

Form2Fact persists data to a local SQLite database (`data/form2fact.db`) managed via Node.js native `node:sqlite` (`DatabaseSync` class in [server/db.ts](file:///d:/projects/form2fact/server/db.ts)).

---

## 1. Relational Schema Diagram

```
 users
 ├── id (PK, TEXT)
 ├── displayName (TEXT)
 ├── email (UNIQUE, TEXT)
 ├── passwordHash (TEXT)
 ├── role (TEXT)
 └── department (TEXT)

 applications
 ├── id (PK, TEXT)
 ├── referenceNumber (UNIQUE, TEXT)
 ├── institutionName (TEXT)
 ├── applicationType (TEXT)
 ├── status (TEXT)
 ├── reviewStatus (TEXT)
 ├── declaredDetails (JSON TEXT)
 ├── documentCount (INTEGER)
 ├── openFindingsCount (INTEGER)
 ├── totalFindingsCount (INTEGER)
 └── assignedReviewer (TEXT)
       │
       ├─────────────────────────────────┐
       │ 1:N (CASCADE)                   │ 1:N (CASCADE)
       ▼                                 ▼
 documents                         findings
 ├── id (PK, TEXT)                 ├── id (PK, TEXT)
 ├── applicationId (FK, TEXT)      ├── applicationId (FK, TEXT)
 ├── originalFilename (TEXT)       ├── ruleKey (TEXT)
 ├── documentType (TEXT)           ├── category (TEXT)
 ├── storageKey (TEXT)             ├── title (TEXT)
 ├── checksum (TEXT)               ├── explanation (TEXT)
 ├── pageCount (INTEGER)           ├── declaredValue (TEXT)
 ├── processingStatus (TEXT)       ├── evidenceValue (TEXT)
 ├── isScannedOrTextPoor (INTEGER) ├── severity (TEXT)
 └── extractedTextByPage (JSON)    ├── status (TEXT)
       │                           └── evidenceList (JSON TEXT)
       │ 1:N (CASCADE)                   │
       ▼                                 │ 1:N (CASCADE)
 extracted_fields                        ▼
 ├── id (PK, TEXT)                 review_actions
 ├── documentId (FK, TEXT)         ├── id (PK, TEXT)
 ├── applicationId (FK, TEXT)      ├── findingId (FK, TEXT)
 ├── fieldName (TEXT)              ├── reviewerName (TEXT)
 ├── rawValue (TEXT)               ├── action (TEXT)
 ├── normalizedValue (TEXT)        ├── previousStatus (TEXT)
 ├── pageNumber (INTEGER)          ├── newStatus (TEXT)
 ├── sourceText (TEXT)             └── note (TEXT)
 ├── isCorrected (INTEGER)
 └── correctedValue (TEXT)

 audit_events (Append-Only Ledger)
 ├── id (PK, TEXT)
 ├── timestamp (TEXT)
 ├── actorId (TEXT)
 ├── actorName (TEXT)
 ├── action (TEXT)
 ├── entityType (TEXT)
 ├── entityReference (TEXT)
 ├── beforeValue (TEXT)
 ├── afterValue (TEXT)
 └── note (TEXT)

 application_decisions (Statutory Determinations)
 ├── id (PK, TEXT)
 ├── applicationId (FK, TEXT)
 ├── reviewerName (TEXT)
 ├── decisionType (TEXT)
 ├── rationale (TEXT)
 └── createdAt (TEXT)
```

---

## 2. Table Definitions & Column Specifications

### `users`
Stores user credentials and regulatory roles.
- `id` (TEXT, PK): Unique identifier (`usr-001`).
- `displayName` (TEXT, NOT NULL): Officer name (`Dr. Aruna Rao`).
- `email` (TEXT, UNIQUE, NOT NULL): Official email (`aruna.rao@scrutiny.edu.in`).
- `passwordHash` (TEXT, NOT NULL): Bcrypt-hashed password.
- `role` (TEXT, NOT NULL): `Administrator` | `Reviewer` | `Read-only Viewer`.
- `department` (TEXT, NOT NULL): Directorate or committee name.
- `createdAt` (TEXT, NOT NULL): ISO-8601 creation timestamp.

---

### `applications`
Stores institutional filings and claimed parameters.
- `id` (TEXT, PK): Unique identifier (`app-1104`).
- `referenceNumber` (TEXT, UNIQUE, NOT NULL): Official application code (`APP-2026-EOA-1104`).
- `institutionName` (TEXT, NOT NULL): Legal name of college/institute.
- `applicationType` (TEXT, NOT NULL): `Extension of Approval` | `New Technical Campus` | `Increase in Intake` | `Change of Site`.
- `status` (TEXT, NOT NULL): `Uploaded` | `Extracting` | `Validating` | `Ready for Review` | `Processing Error`.
- `reviewStatus` (TEXT, NOT NULL): `Pending Review` | `Under Review` | `Review Completed` | `Discrepancies Confirmed`.
- `declaredDetails` (TEXT, NOT NULL): JSON string of `DeclaredDetails` (land acreage, address, lease expiry date, sanctioned intake, etc.).
- `documentCount` (INTEGER, DEFAULT 0): Count of attached documents.
- `openFindingsCount` (INTEGER, DEFAULT 0): Count of active unresolved discrepancies.
- `totalFindingsCount` (INTEGER, DEFAULT 0): Total findings ever generated for this filing.
- `reviewerNotes` (TEXT): Officer commentary or formal determination rationale.
- `assignedReviewer` (TEXT): Assigned scrutiny officer.
- `createdBy` (TEXT, NOT NULL): Intake creator.
- `createdAt`, `updatedAt` (TEXT, NOT NULL): Timestamps.

---

### `documents`
Stores supporting statutory attachment metadata and page text.
- `id` (TEXT, PK): Document record identifier (`doc-1104-lease`).
- `applicationId` (TEXT, NOT NULL, FK $\rightarrow$ `applications.id` ON DELETE CASCADE).
- `originalFilename` (TEXT, NOT NULL): Sanitized filename.
- `documentType` (TEXT, NOT NULL): Regulatory type (`Land Lease Deed`, `Fire Safety NOC`, etc.).
- `storageKey` (TEXT, NOT NULL): Relative path on disk (`dockets/{appId}/{docId}.pdf`).
- `mimeType` (TEXT, NOT NULL): Standard MIME (`application/pdf`).
- `sizeBytes` (INTEGER, NOT NULL): File size in bytes.
- `checksum` (TEXT, NOT NULL): Cryptographic hash (`sha256-...`).
- `pageCount` (INTEGER, NOT NULL): Total document page count.
- `processingStatus` (TEXT, NOT NULL): `Pending` | `Extracted` | `Failed` | `Scanned Unreadable`.
- `isScannedOrTextPoor` (INTEGER, DEFAULT 0): Flag indicating whether the file lacks a text stream.
- `extractedTextByPage` (TEXT): JSON array of `{ page: number, text: string }`.

---

### `extracted_fields`
Stores individual key-value pairs extracted from documents.
- `id` (TEXT, PK): Field identifier (`fld-doc-1104-lease-expiry`).
- `documentId` (TEXT, NOT NULL, FK $\rightarrow$ `documents.id` ON DELETE CASCADE).
- `applicationId` (TEXT, NOT NULL, FK $\rightarrow$ `applications.id` ON DELETE CASCADE).
- `fieldName` (TEXT, NOT NULL): Canonical field name (`leaseExpiryDate`, `landAreaAcres`).
- `fieldLabel` (TEXT, NOT NULL): Human-readable label (`Lease Termination Date`).
- `rawValue` (TEXT, NOT NULL): Literal string extracted from text.
- `normalizedValue` (TEXT, NOT NULL): Cleaned format (`YYYY-MM-DD`, numeric acres).
- `pageNumber` (INTEGER, NOT NULL): Page where text was found.
- `sourceText` (TEXT, NOT NULL): Contextual excerpt surrounding the match.
- `confidence` (REAL): Extraction confidence score (`0.0` - `1.0`).
- `extractionMethod` (TEXT, NOT NULL): `Deterministic Text Regex` | `Document Parser` | `Manual Correction`.
- `isCorrected` (INTEGER, DEFAULT 0): 1 if manually overridden by a reviewer.
- `correctedValue`, `correctedBy`, `correctedAt`, `correctionNote` (TEXT): Audit trail of manual overrides.

---

### `findings`
Stores regulatory discrepancy records.
- `id` (TEXT, PK): Finding identifier (`fnd-0842-ten-mismatch`).
- `reference` (TEXT, NOT NULL): Display reference (`FND-0842-01`).
- `applicationId` (TEXT, NOT NULL, FK $\rightarrow$ `applications.id` ON DELETE CASCADE).
- `ruleId`, `ruleKey`, `ruleVersion` (TEXT, NOT NULL): Citation of the rule that produced this finding.
- `category` (TEXT, NOT NULL): `Land & Tenancy` | `Identity & Registration` | `Safety & Compliance` | `Approvals & Capacity`.
- `title`, `explanation` (TEXT, NOT NULL): Statutory finding descriptions.
- `declaredValue`, `evidenceValue` (TEXT): Comparison values.
- `severity` (TEXT, NOT NULL): `Attention Required` | `Material Discrepancy` | `Information Missing` | `Administrative Advisory`.
- `status` (TEXT, NOT NULL): `Open` | `Under Review` | `Confirmed` | `Dismissed` | `Corrected` | `Unable to Determine`.
- `evidenceList` (TEXT, NOT NULL): JSON array of linked `FindingEvidence` objects.

---

### `review_actions`
Stores individual reviewer decisions on findings.
- `id` (TEXT, PK): Action identifier.
- `findingId` (TEXT, NOT NULL, FK $\rightarrow$ `findings.id` ON DELETE CASCADE).
- `applicationId` (TEXT, NOT NULL).
- `reviewerId`, `reviewerName` (TEXT, NOT NULL): Actor identity.
- `action` (TEXT, NOT NULL): `Confirm Finding` | `Dismiss Finding` | `Mark Unable to Determine` | `Reopen Finding`.
- `previousStatus`, `newStatus` (TEXT, NOT NULL): Status state transition.
- `note` (TEXT, NOT NULL): Mandatory written justification.

---

### `audit_events`
Append-only tamper-evident chronological event log.
- `id` (TEXT, PK): Audit event identifier.
- `timestamp` (TEXT, NOT NULL): ISO-8601 timestamp.
- `actorId`, `actorName` (TEXT, NOT NULL): Officer or system identifier.
- `action` (TEXT, NOT NULL): Operation performed (`Application Created`, `Finding Confirmed`, etc.).
- `entityType` (TEXT, NOT NULL): `Application` | `Document` | `ExtractedField` | `Finding` | `Rule`.
- `entityReference` (TEXT, NOT NULL): Reference code of the target entity.
- `beforeValue`, `afterValue`, `note` (TEXT): Mutation diff and officer comment.

---

### `application_decisions`
Stores final statutory determinations for an application docket.
- `id` (TEXT, PK): Decision identifier.
- `applicationId` (TEXT, NOT NULL, FK $\rightarrow$ `applications.id` ON DELETE CASCADE).
- `reviewerId`, `reviewerName` (TEXT, NOT NULL): Adjudicating officer.
- `decisionType` (TEXT, NOT NULL): `Approved` | `Rejected` | `Clarification Required`.
- `rationale` (TEXT, NOT NULL): Mandatory statutory sign-off justification.
- `createdAt` (TEXT, NOT NULL): Timestamp.

