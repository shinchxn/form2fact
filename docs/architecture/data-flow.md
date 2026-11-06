# End-to-End Data Flow Specification

## 1. Complete Scrutiny Lifecycle

The verification lifecycle traces a multi-stage path from initial document intake to final regulatory determination:

```mermaid
sequenceDiagram
    autonumber
    actor Officer as Institutional Applicant
    actor Reviewer as AICTE Scrutiny Officer
    participant API as Node.js API Gateway
    participant Store as Storage Provider (Disk/S3)
    participant Queue as Job Queue Manager
    participant Extractor as Document Extraction Engine
    participant Domain as Domain Registry
    participant Pairwise as Pairwise Engine / AI Service
    participant DB as Relational Database (SQLite/PG)
    participant Audit as Immutable Audit Log

    Note over Officer, API: Step 1: Document Upload & Ingestion
    Officer->>API: POST /api/applications/:id/documents (Multipart PDF)
    API->>API: Magic-Byte Signature Check (%PDF-)
    API->>Store: Persist raw binary buffer
    Store-->>API: Returns storageKey & SHA-256 hash
    API->>DB: Insert document metadata (status: 'uploaded')
    API->>Queue: Enqueue extraction job ('document-processing')
    API-->>Officer: 202 Accepted (docId, status: 'queued')

    Note over Queue, Extractor: Step 2: Asynchronous Text Extraction & Parsing
    Queue->>Extractor: Dequeue extraction task
    Extractor->>Store: Retrieve document binary stream
    Extractor->>Extractor: Extract text per page (PDF text layer / OCR)
    Extractor->>DB: Persist extracted_fields (pageNumber, snippet, confidence)
    Extractor->>DB: Update document status to 'processed'

    Note over API, Pairwise: Step 3: Domain Rule & Pairwise Evaluation
    Officer->>API: POST /api/applications/:id/verify
    API->>Domain: Fetch active DomainPack (e.g., 'aicte')
    API->>DB: Fetch application claims & extracted supporting fields
    API->>Pairwise: Execute Pairwise Mismatch Classification (Fast-Path + ML)
    Pairwise-->>API: Pairwise Results (MATCH, MISMATCH, MISSING, UNCERTAIN)
    API->>API: Execute Statutory Rules (Tenure, Acreage, Entity Name)
    API->>DB: Persist generated findings (ruleKey, severity, evidence citations)
    API->>Audit: Append audit_event ('VERIFICATION_EXECUTED')
    API-->>Officer: Verification completed summary

    Note over Reviewer, Audit: Step 4: Human Review & Adjudication
    Reviewer->>API: GET /api/applications/:id/findings
    API-->>Reviewer: List findings with page citations & snippets
    Reviewer->>API: POST /api/findings/:id/action (Confirm / Dismiss / Override)
    API->>DB: Update finding reviewStatus
    API->>Audit: Append audit_event with reviewer identity & rationale
    Reviewer->>API: POST /api/applications/:id/decision (Approve / Reject / Deficit)
    API->>DB: Record immutable application_decision
    API->>Audit: Append final decision audit log
    API-->>Reviewer: 200 OK (Status: 'Review Completed')
```

## 2. Evidence Citation Guarantee

At every point during classification:
1. **Source Document Preservation:** The source document's binary stream is never modified or stripped.
2. **Page Number Attribution:** Extracted fields and finding citations are strictly stamped with an integer `pageNumber` corresponding to the original document page index.
3. **Citation Snippet Snipping:** Snippets contain the exact text surrounding the extracted value (±100 characters) to facilitate instant visual verification by human reviewers.
4. **Non-Destructive Overrides:** If a human reviewer overrides an extracted value (e.g., correcting an OCR typo in a survey number), the original extracted value is preserved alongside `isCorrected: true`, `correctedValue`, and the reviewer's user ID.

