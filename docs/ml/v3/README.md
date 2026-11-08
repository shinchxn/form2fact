# Form2Fact V3 Machine Learning & Governance Development Plan

## Objective
Establish the architectural roadmap, governance policies, human annotation workbench, and institutional pilot framework for Form2Fact V3 pairwise classification, focusing on:
1. Multi-domain regulatory document intelligence (expanding beyond AICTE to technical, medical, and collegiate statutory frameworks).
2. Population-scale benchmark expansion with verified domain manifests and authentic institutional claim/evidence pairs.
3. Enhanced multi-page cadastral and deed alignment models.
4. Preserved inference backwards-compatibility with V1/V2 serving infrastructure.

## Governance Mandates
- **Zero Model Training During Data Collection:** V3 model training, fine-tuning, and weight adjustment remain strictly blocked under all conditions until authentic, authorized institutional gold-standard records are collected and audited.
- **No Disruption:** V1 and V2 champions, calibration wrappers, and historical validation reports are immutable.
- **Inference Stability:** Serving endpoints (`/api/v1/verification/pairwise`) remain strictly conformant to the established 5-class taxonomy: `[MATCH, MISMATCH, MISSING, UNCERTAIN, NOT_COMPARABLE]`.
- **15-Gate Export Firewall:** No record is exported to gold-standard datasets without passing all 15 cryptographic, document provenance, double-blind annotation, adjudication, and tenant-isolation gates.

---

## Core V3 Documentation Index

### 1. Institutional Pilot & External Engagement
- [V3 Multi-Institution Pilot Partnership Proposal](file:///d:/projects/form2fact/docs/ml/v3/V3_MULTI_INSTITUTION_PILOT_PARTNERSHIP_PROPOSAL.md) — Authoritative proposal for engineering colleges and academic administrators.
- [V3 Bilateral Data-Sharing Agreement Template](file:///d:/projects/form2fact/docs/ml/v3/V3_INSTITUTIONAL_DATA_SHARING_AGREEMENT_TEMPLATE.md) — Standard legal MOU and data minimization agreement for participating institutions.
- [V3 Institutional Data Collection SOP](file:///d:/projects/form2fact/docs/ml/v3/V3_INSTITUTIONAL_DATA_COLLECTION_SOP.md) — Standard operating procedures for institutional dockets, reviewer roles, and revocation.
- [V3 Reviewer Authorization Policy](file:///d:/projects/form2fact/docs/ml/v3/V3_REVIEWER_AUTHORIZATION_POLICY.md) — Criteria for qualified faculty, statutory scrutiny officers, and adjudicators.

### 2. Operational Readiness & Staging Deployment Rehearsal
- [V3 Staging Deployment Rehearsal Report](file:///d:/projects/form2fact/docs/ml/v3/V3_STAGING_DEPLOYMENT_REHEARSAL.md) — 18-step staging rehearsal results, isolated Docker Compose architecture, and single-writer SQLite configuration.
- [V3 Incident Response Rehearsal & Security Playbook](file:///d:/projects/form2fact/docs/ml/v3/V3_INCIDENT_RESPONSE_REHEARSAL.md) — 6 threat scenarios (tamper, rollback, forgery, reviewer compromise, cross-tenant, TOCTOU), incident triage & containment playbook.
- [V3 Backup, Restoration & Checkpoint Recovery Verification](file:///d:/projects/form2fact/docs/ml/v3/V3_BACKUP_AND_RECOVERY_VERIFICATION.md) — SQLite WAL backups, crash recovery (`exit(99)`), canonical HMAC-SHA256 formula, key rotation, and Ed25519 roadmap.
- [V3 Final Pilot Go-Live Gate Verification](file:///d:/projects/form2fact/docs/ml/v3/V3_FINAL_PILOT_GO_LIVE_GATE.md) — Final Go-Live Gate verdict: `B. STAGING ACCEPTED — INSTITUTIONAL AUTHORIZATION PENDING`.

### 3. Annotation Workbench & Export Firewall
- [V3 Annotation Workbench Report](file:///d:/projects/form2fact/docs/ml/v3/V3_ANNOTATION_WORKBENCH_REPORT.md) — Double-blind human annotation workbench architecture, task queue, and adjudication.
- [V3 Gold Standard Export Policy](file:///d:/projects/form2fact/docs/ml/v3/V3_GOLD_STANDARD_EXPORT_POLICY.md) — Definition of all 15 Export Firewall Gates.
- [V3 Cryptographic Ledger Specification](file:///d:/projects/form2fact/docs/ml/v3/V3_CRYPTOGRAPHIC_LEDGER_SPECIFICATION.md) — SHA-256 hash chaining, payload hashing, and append-only database triggers.
- [V3 Label Mapping Policy](file:///d:/projects/form2fact/docs/ml/v3/V3_LABEL_MAPPING_POLICY.md) — 5-class canonical taxonomy mapping from external annotations.

### 4. Audits & Remediations
- [V3 Critical Remediation Report](file:///d:/projects/form2fact/docs/ml/v3/V3_CRITICAL_REMEDIATION_REPORT.md) — Remediation of GAP-SEC-01 (document resolution check) and Cohen's Kappa formula correction.
- [V3 Institutional Pilot Readiness Audit](file:///d:/projects/form2fact/docs/ml/v3/V3_INSTITUTIONAL_PILOT_READINESS_AUDIT.md) — Concurrency, external checkpoints, and provenance verification.
- [V3 Operational Security Gap Register](file:///d:/projects/form2fact/docs/ml/v3/V3_OPERATIONAL_SECURITY_GAP_REGISTER.md) — Status tracking of all identified operational and security gaps.
