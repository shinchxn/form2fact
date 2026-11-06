-- =========================================================================
-- FORM2FACT ENTERPRISE POSTGRESQL SCHEMA (v1.0.0)
-- Multi-Tenant, Domain-Independent Document Verification Platform
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations (Tenant Isolation Root)
CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(64) UNIQUE NOT NULL,
    domain_id VARCHAR(64) NOT NULL DEFAULT 'aicte',
    state VARCHAR(128),
    region VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users & RBAC
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE SET NULL,
    display_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(64) NOT NULL CHECK (role IN ('Administrator', 'Reviewer', 'Read-only Viewer')),
    department VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Domain Packs & Versioning
CREATE TABLE IF NOT EXISTS domains (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    active_version VARCHAR(32) NOT NULL,
    description TEXT,
    category VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS domain_versions (
    id VARCHAR(64) PRIMARY KEY,
    domain_id VARCHAR(64) NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    version VARCHAR(32) NOT NULL,
    pack_definition JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(domain_id, version)
);

-- 4. Applications (Verification Cases)
CREATE TABLE IF NOT EXISTS applications (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
    domain_id VARCHAR(64) NOT NULL DEFAULT 'aicte',
    domain_version VARCHAR(32) NOT NULL DEFAULT '1.2.0',
    reference_number VARCHAR(128) UNIQUE NOT NULL,
    institution_name VARCHAR(255) NOT NULL,
    application_type VARCHAR(128) NOT NULL,
    status VARCHAR(64) NOT NULL DEFAULT 'Ready for Review',
    review_status VARCHAR(64) NOT NULL DEFAULT 'Pending Review',
    declared_details JSONB NOT NULL,
    document_count INT NOT NULL DEFAULT 0,
    open_findings_count INT NOT NULL DEFAULT 0,
    total_findings_count INT NOT NULL DEFAULT 0,
    reviewer_notes TEXT,
    assigned_reviewer VARCHAR(255),
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance & tenant filtering
CREATE INDEX IF NOT EXISTS idx_apps_org ON applications(organization_id);
CREATE INDEX IF NOT EXISTS idx_apps_status ON applications(status, review_status);
CREATE INDEX IF NOT EXISTS idx_apps_ref ON applications(reference_number);

-- 5. Documents (Metadata separate from binary file storage)
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(64) PRIMARY KEY,
    application_id VARCHAR(64) NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    document_type VARCHAR(128) NOT NULL,
    storage_key VARCHAR(512) NOT NULL,
    storage_provider VARCHAR(32) NOT NULL DEFAULT 'local_disk',
    mime_type VARCHAR(128) NOT NULL DEFAULT 'application/pdf',
    size_bytes BIGINT NOT NULL,
    checksum VARCHAR(128) NOT NULL,
    page_count INT NOT NULL DEFAULT 1,
    processing_status VARCHAR(64) NOT NULL DEFAULT 'Extracted',
    is_scanned_or_text_poor BOOLEAN NOT NULL DEFAULT FALSE,
    extracted_text_by_page JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_docs_app ON documents(application_id);
CREATE INDEX IF NOT EXISTS idx_docs_checksum ON documents(checksum);

-- 6. Extracted Fields
CREATE TABLE IF NOT EXISTS extracted_fields (
    id VARCHAR(64) PRIMARY KEY,
    document_id VARCHAR(64) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    application_id VARCHAR(64) NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    field_name VARCHAR(128) NOT NULL,
    field_label VARCHAR(255) NOT NULL,
    raw_value TEXT NOT NULL,
    normalized_value TEXT NOT NULL,
    page_number INT NOT NULL,
    source_text TEXT NOT NULL,
    confidence NUMERIC(4, 3),
    extraction_method VARCHAR(64) NOT NULL,
    is_corrected BOOLEAN NOT NULL DEFAULT FALSE,
    corrected_value TEXT,
    corrected_by VARCHAR(255),
    corrected_at TIMESTAMPTZ,
    correction_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fields_doc ON extracted_fields(document_id);
CREATE INDEX IF NOT EXISTS idx_fields_app ON extracted_fields(application_id);
CREATE INDEX IF NOT EXISTS idx_fields_name ON extracted_fields(field_name);

-- 7. Verification Findings & Discrepancies
CREATE TABLE IF NOT EXISTS findings (
    id VARCHAR(64) PRIMARY KEY,
    reference VARCHAR(64) NOT NULL,
    application_id VARCHAR(64) NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    rule_id VARCHAR(64) NOT NULL,
    rule_key VARCHAR(64) NOT NULL,
    rule_version VARCHAR(32) NOT NULL,
    domain_id VARCHAR(64) NOT NULL DEFAULT 'aicte',
    category VARCHAR(128) NOT NULL,
    title VARCHAR(255) NOT NULL,
    explanation TEXT NOT NULL,
    declared_value TEXT,
    evidence_value TEXT,
    severity VARCHAR(64) NOT NULL,
    status VARCHAR(64) NOT NULL,
    evidence_list JSONB NOT NULL DEFAULT '[]'::jsonb,
    assigned_reviewer VARCHAR(255),
    reviewer_decision_reason TEXT,
    updated_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_findings_app ON findings(application_id);
CREATE INDEX IF NOT EXISTS idx_findings_status ON findings(status);

-- 8. Review Actions (Historical Finding Decisions)
CREATE TABLE IF NOT EXISTS review_actions (
    id VARCHAR(64) PRIMARY KEY,
    finding_id VARCHAR(64) NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
    application_id VARCHAR(64) NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    reviewer_id VARCHAR(64) NOT NULL,
    reviewer_name VARCHAR(255) NOT NULL,
    action VARCHAR(64) NOT NULL,
    previous_status VARCHAR(64) NOT NULL,
    new_status VARCHAR(64) NOT NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Formal Docket Application Decisions
CREATE TABLE IF NOT EXISTS application_decisions (
    id VARCHAR(64) PRIMARY KEY,
    application_id VARCHAR(64) NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    reviewer_id VARCHAR(64) NOT NULL,
    reviewer_name VARCHAR(255) NOT NULL,
    decision_type VARCHAR(64) NOT NULL CHECK (decision_type IN ('Approved', 'Rejected', 'Clarification Required')),
    rationale TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. Audit Ledger (Immutable Append-Only Log)
CREATE TABLE IF NOT EXISTS audit_events (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actor_id VARCHAR(64) NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    action VARCHAR(128) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_reference VARCHAR(255) NOT NULL,
    before_value TEXT,
    after_value TEXT,
    note TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_ref ON audit_events(entity_reference);

-- 11. Asynchronous Document Processing Jobs
CREATE TABLE IF NOT EXISTS jobs (
    id VARCHAR(64) PRIMARY KEY,
    type VARCHAR(128) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    progress INT NOT NULL DEFAULT 0,
    result JSONB,
    error TEXT,
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed default organization
INSERT INTO organizations (id, name, code, domain_id, state, region)
VALUES ('org-aicte-western', 'AICTE Western Regional Directorate', 'WRO-MUMBAI', 'aicte', 'Maharashtra & Gujarat', 'Western')
ON CONFLICT (id) DO NOTHING;

