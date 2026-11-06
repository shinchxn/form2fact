# Form2Fact — System Architecture & Design Specification

## 1. Architectural Philosophy

Form2Fact is engineered around a core regulatory premise: **statutory institutional scrutiny must be transparent, deterministic, explainable, and verifiable.** 

Unlike generic generative AI document wrappers that suffer from hallucinations, Form2Fact decouples **deterministic verification** from **advisory narrative reasoning**:
- **Verification Engine:** Pure, deterministic TypeScript code running versioned regulatory rule definitions against structured data. Every finding is anchored to an exact document filename, page number, and source text excerpt.
- **AI Advisory Synthesis:** Large Language Models (via the `@google/genai` SDK) provide high-thinking executive synthesis (`DeepScrutinyMemo`), but are strictly sandboxed as advisory decision-support tools without direct mutation authority over regulatory decisions.

---

## 2. High-Level Component Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                   CLIENT TIER (React 19 + Tailwind v4)                 │
│                                                                        │
│  ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────┐ │
│  │ Executive Dashboard   │ │ Applications Docket   │ │ 3-Pane Viewer │ │
│  │ (OverviewView)        │ │ (ApplicationsView)    │ │ (DocReview)   │ │
│  └───────────────────────┘ └───────────────────────┘ └───────────────┘ │
│  ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────┐ │
│  │ Inspection Workspace  │ │ Rules Catalog & Tests │ │ Audit Ledger  │ │
│  │ (AppDetailView)       │ │ (RulesView)           │ │ (AuditLogView)│ │
│  └───────────────────────┘ └───────────────────────┘ └───────────────┘ │
│  ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────┐ │
│  │ Scrutiny Dossier      │ │ Adjudication Modals   │ │ Settings &    │ │
│  │ (ReportsView)         │ │ (Decision/Correction) │ │ Persona Switch│ │
│  └───────────────────────┘ └───────────────────────┘ └───────────────┘ │
└────────────────────────────────────▲───────────────────────────────────┘
                                     │ HTTP / REST (/api/v1/*)
                                     │ JWT Bearer Auth & Form-Data
┌────────────────────────────────────▼───────────────────────────────────┐
│                 SERVER TIER (Node.js 22 + Express 4.21)                │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ REST Router (server/api.ts)                                      │  │
│  │  - Auth & RBAC (server/auth.ts)                                  │  │
│  │  - Multipart Upload & Magic-Byte Filter (%PDF-)                  │  │
│  │  - Application Lifecycle State Management                        │  │
│  │  - Isolated Rule Sandbox Test Runner                             │  │
│  └──────────────────┬─────────────────────────────┬─────────────────┘  │
│                     │                             │                    │
│                     ▼                             ▼                    │
│  ┌──────────────────────────────┐  ┌────────────────────────────────┐  │
│  │ Deterministic Extraction     │  │ Deterministic Rules Engine     │  │
│  │ (server/extraction.ts)       │  │ (server/rulesEngine.ts)        │  │
│  │  - PDF Text Stream Parser    │  │  - 6 Statutory Rules           │  │
│  │  - Normalizers (Date, Text)  │  │  - Tokenized Entity Matcher    │  │
│  │  - Regex Field Extractors    │  │  - Multi-Parcel Aggregator     │  │
│  │  - Scanned Guardrail Check   │  │  - Evidence Linker             │  │
│  └──────────────┬───────────────┘  └──────────────┬─────────────────┘  │
│                 │                                 │                    │
│                 │     ┌─────────────────────┐     │                    │
│                 └────►│ Database Sync Layer │◄────┘                    │
│                       │ (server/db.ts)      │                          │
│                       └──────────┬──────────┘                          │
└──────────────────────────────────┼─────────────────────────────────────┘
                                   │ Native SQLite C++ Addon (node:sqlite)
┌──────────────────────────────────▼─────────────────────────────────────┐
│                            DATA PERSISTENCE                            │
│                                                                        │
│  ┌───────────────────────────────────┐ ┌─────────────────────────────┐ │
│  │ Relational SQLite Database        │ │ Durable Disk Storage        │ │
│  │ (data/form2fact.db)               │ │ (data/dockets/{appId}/*.pdf)│ │
│  │  - users                          │ │                             │ │
│  │  - applications                   │ │ Verified binary PDFs        │ │
│  │  - documents                      │ │ indexed by SHA-256          │ │
│  │  - extracted_fields               │ │ checksums                   │ │
│  │  - findings                       │ │                             │ │
│  │  - rules                          │ │                             │ │
│  │  - review_actions                 │ │                             │ │
│  │  - audit_events (append-only)     │ │                             │ │
│  │  - application_decisions          │ │                             │ │
│  └───────────────────────────────────┘ └─────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. End-to-End Application Lifecycle

```
[1. Intake] ──► [2. Ingestion] ──► [3. Extraction] ──► [4. Rule Evaluation] ──► [5. Adjudication] ──► [6. Dossier]
```

### Step 1: Institutional Application Intake
- An applicant or demonstration operator inputs the institutional application metadata (Reference Number, Legal Name, Sponsoring Trust, Campus Address, Land Acreage, Tenancy Expiry Date, Sanctioned Capacity, Application Year).
- Supporting statutory PDF files are attached (Land Lease Deed, Ownership Title Deed, Building Safety Certificate, Fire Safety NOC, Trust Registration Certificate).

### Step 2: Binary Verification & Storage
- Incoming files undergo **Magic-Byte Header Validation** (`%PDF-` / `0x25 0x50 0x44 0x46 0x2D`). Any spoofed executable or malformed file is rejected with HTTP 400.
- A cryptographic **SHA-256 checksum** is calculated for tamper verification.
- The file binary is stored durably on the local filesystem under `data/dockets/{appId}/{docId}.pdf`.
- Document metadata is recorded in the `documents` table with `processingStatus: 'Pending'`.

### Step 3: Text Stream Extraction & Scanned Guardrail
- `pdf-parse` reads the binary PDF buffer and extracts text streams page by page (delimited by form-feed `\f` characters).
- If total extracted text is below 40 characters, the document is flagged:
  - `isScannedOrTextPoor = true`
  - `processingStatus = 'Scanned Unreadable'`
  - Automated field extraction is safely bypassed to avoid hallucinations, and a human inspection finding is raised.
- If text is readable, deterministic regex routines extract key statutory parameters and record them in the `extracted_fields` table with exact source text snippets and page numbers.

### Step 4: Deterministic Regulatory Evaluation
- The rules engine loads all active rules from the `rules` table.
- Declared application values are compared against extracted document evidence.
- Discrepancies, tenure deficits, name divergences, or missing statutory attachments produce structured `Finding` records linked to specific document pages (`evidenceList`).
- The application status is automatically updated to `'Ready for Review'`, and its `openFindingsCount` is recalculated.

### Step 5: Reviewer Adjudication & Field Correction
- Reviewers inspect findings in the **3-Pane Document Review Workspace**:
  - **Pane 1:** Document docket navigation tree.
  - **Pane 2:** Document Sheet viewer with active field and clause highlighting.
  - **Pane 3:** Evidence Inspector displaying raw text, normalized values, confidence, and rule references.
- Reviewers can override misextracted values via `CorrectionModal` (with mandatory written audit justification).
- Reviewers adjudicate discrepancies via `ReviewActionModal`:
  - **Confirm Finding:** Affirms discrepancy exists.
  - **Dismiss Finding:** Explains why discrepancy is permissible under regulatory caveats.
  - **Unable to Determine:** Defers to on-site committee physical inspection.
- Officers record final docket determination via `ApplicationDecisionModal` (`Approved`, `Rejected`, `Clarification Required`).

### Step 6: Dossier Export & Audit Trail
- The system generates an official **Scrutiny Verification Dossier** aggregating institutional claims, supporting document inventory, extraction evidence, finding triage records, and officer sign-offs.
- Supported export formats: Printable PDF layout, full machine-readable JSON, and tabular findings CSV.
- All actions are permanently logged to the append-only `audit_events` ledger.

