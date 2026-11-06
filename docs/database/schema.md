# Database Schema & Entity Relationships

## 1. Dual-Engine Architecture Overview

Form2Fact implements dual database compatibility:
1. **Local Development & Integration Testing:** Native SQLite (`data/form2fact.db`) via Node.js 22's `node:sqlite` module (`server/db.ts`).
2. **Enterprise Production:** PostgreSQL 16 schema (`infrastructure/db/init.sql`) supporting multi-tenancy, connection pooling, JSONB evidence indexing, and row-level security.

## 2. Entity Relationship Model

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ USERS : members
    ORGANIZATIONS ||--o{ APPLICATIONS : owns
    DOMAINS ||--o{ DOMAIN_VERSIONS : has
    DOMAIN_VERSIONS ||--o{ APPLICATIONS : governs
    APPLICATIONS ||--o{ DOCUMENTS : contains
    DOCUMENTS ||--o{ EXTRACTED_FIELDS : yields
    APPLICATIONS ||--o{ FINDINGS : generates
    FINDINGS ||--o{ REVIEW_ACTIONS : receives
    USERS ||--o{ REVIEW_ACTIONS : authors
    APPLICATIONS ||--o{ APPLICATION_DECISIONS : concludes
    USERS ||--o{ APPLICATION_DECISIONS : determines
    APPLICATIONS ||--o{ AUDIT_EVENTS : records
    USERS ||--o{ AUDIT_EVENTS : triggers

    ORGANIZATIONS {
        uuid id PK
        string name
        string code UK
        string type
        string status
        timestamp created_at
    }

    USERS {
        uuid id PK
        uuid organization_id FK
        string email UK
        string password_hash
        string full_name
        string role
        string status
        timestamp created_at
    }

    DOMAINS {
        string id PK
        string name
        string current_version
        string regulatory_authority
        timestamp created_at
    }

    APPLICATIONS {
        uuid id PK
        uuid organization_id FK
        string domain_id FK
        string domain_version
        string application_number UK
        string institution_name
        string status
        string review_status
        jsonb declared_parameters
        timestamp submitted_at
        timestamp created_at
    }

    DOCUMENTS {
        uuid id PK
        uuid application_id FK
        string document_code
        string original_filename
        string storage_key
        string mime_type
        integer file_size
        string file_hash
        integer page_count
        string status
        jsonb metadata
        timestamp uploaded_at
    }

    EXTRACTED_FIELDS {
        uuid id PK
        uuid document_id FK
        string field_key
        string raw_value
        string normalized_value
        float confidence
        integer page_number
        jsonb bounding_box
        text snippet
        boolean is_corrected
        string corrected_value
        uuid corrected_by FK
        timestamp extracted_at
    }

    FINDINGS {
        uuid id PK
        uuid application_id FK
        string rule_key
        string domain_id FK
        string title
        text description
        string severity
        string category
        string status
        string review_status
        jsonb evidence_citations
        timestamp generated_at
    }

    REVIEW_ACTIONS {
        uuid id PK
        uuid finding_id FK
        uuid user_id FK
        string action_type
        text notes
        timestamp action_timestamp
    }

    APPLICATION_DECISIONS {
        uuid id PK
        uuid application_id FK
        uuid user_id FK
        string decision_type
        text rationale
        jsonb conditions
        timestamp decided_at
    }

    AUDIT_EVENTS {
        uuid id PK
        uuid application_id FK
        uuid user_id FK
        string event_type
        string action
        text details
        jsonb metadata
        string ip_address
        timestamp timestamp
    }
```

## 3. Core Relational Tables & Column Details

### 3.1 `organizations`
Multi-tenant isolation boundary for regulatory agencies, regional offices, or institutional groups.
- `id`: Primary key (UUID v4).
- `name`: Human-readable name (e.g., "Western Regional Office - AICTE").
- `code`: Unique statutory identifier (e.g., `RO-WEST-MUMBAI`).
- `status`: Lifecycle state (`active`, `suspended`, `archived`).

### 3.2 `users`
Authenticated scrutiny officers, institutional applicants, and system administrators.
- `role`: Role-based access control enum:
  - `admin`: System configuration, domain management, audit trail inspection.
  - `reviewer`: Scrutiny officer authorized to inspect evidence, adjust findings, and record decisions.
  - `viewer`: Read-only observer (e.g., external ombudsman or audit team).
  - `applicant`: Institutional user submitting applications and uploading documents.

### 3.3 `applications`
Central scrutiny case file representing an institution's application for regulatory approval.
- `application_number`: Unique regulatory reference (e.g., `APP-AICTE-2026-0842`).
- `status`: Ingestion state (`draft`, `submitted`, `verified`, `archived`).
- `review_status`: Human scrutiny state (`Pending Review`, `Under Review`, `Review Completed`).
- `declared_parameters`: JSONB / text map of declared parameters (e.g., declared acreage, trust name, unexpired lease term).

### 3.4 `documents`
Uploaded PDF and TIFF artifacts supporting an application.
- `document_code`: Foreign key to `DocumentDefinition.code` in active Domain Pack (e.g., `DOC-LAND-LEASE`).
- `file_hash`: SHA-256 cryptographic digest ensuring file integrity.
- `storage_key`: Object key in S3 bucket or relative local disk path.

### 3.5 `extracted_fields`
Atomic data points parsed from document text layers or vision/OCR engines.
- `field_key`: Matches `FieldDefinition.key` from Domain Pack.
- `normalized_value`: Standardized string (e.g., ISO-8601 date `2055-03-31` or float `7.50`).
- `page_number`: 1-indexed document page where the value was found.
- `snippet`: Verbatim citation context surrounding the extracted value.
- `is_corrected`: Boolean flag indicating manual human override.
- `corrected_value`: Value supplied by scrutiny officer during manual review.

### 3.6 `findings`
Objective discrepancies, variance warnings, or regulatory deficits identified by the rules engine.
- `severity`: Regulatory impact level:
  - `Critical Deficit`: Violates mandatory minimum statutory criteria.
  - `Material Discrepancy`: Explicit contradiction between claim and evidence.
  - `Administrative Variance`: Non-critical formatting or minor typographical divergence.
- `evidence_citations`: JSONB array of linked evidence items with `documentName`, `pageNumber`, and `snippet`.

### 3.7 `audit_events`
Append-only, immutable regulatory ledger logging every user action, verification run, override, and final decision.
- Never updated or deleted.
- Preserves IP address, user UUID, timestamp, and JSON before/after state snapshots.

