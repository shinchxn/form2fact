# FORM2FACT V3 — REMAINING GAPS & PILOT DEPENDENCY INVENTORY

**Status:** ACTIVE AUDIT REGISTER  
**Branch:** `feature/ml-pairwise-classifier-v3`  
**Classification:** Pre-Pilot Institutional Prerequisites

---

## 1. PURPOSE

This document provides a transparent, evidence-based inventory of remaining operational, regulatory, and institutional gaps that must be resolved before genuine AICTE regulatory dossiers can be processed and before V3 model training can be initiated.

Engineering features are strictly distinguished from external institutional dependencies.

---

## 2. DETAILED GAP INVENTORY

| Gap ID | Description | Category | Current Status | Required Action / Dependency | Blocking Impact |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **GAP-01** | Zero Genuine Institutional Dossiers | Institutional | **0 dockets ingested** | Establish formal bilateral data intake protocol with AICTE Regional Directorates (WRO, NRO, SRO). | Blocks gold-standard creation; model training cannot occur. |
| **GAP-02** | External Reviewer Accreditation | Regulatory / Governance | **0 external reviewers accredited** | Directorate Scrutiny Board must formally nominate qualified scrutiny officers for workbench roles. | Annotation queue cannot be staffed by real human evaluators. |
| **GAP-03** | Provisional Corpus Target Shortfall | Data Quantity | **0 / 200 Pairs** | Complete double-blind annotation of at least 200 institutional claim/evidence pairs. | Provisional statistical threshold for training readiness unmet. |
| **GAP-04** | Cohen's Kappa Statistical Reliability | Data Quality | **Currently `null` ($N=0$)** | Achieve $\kappa \ge 0.70$ over $\ge 200$ institutional pairs to demonstrate inter-annotator concordance. | Model cannot be trained on divergent or unreliable labels. |
| **GAP-05** | Public Key Infrastructure (HSM) Ledger Signing | Technical / Infrastructure | **SHA-256 Chaining Implemented; HSM Unbound** | Deploy production Cloud KMS / HSM for signing periodic ledger state checkpoints. | Tamper-evidence relies on software-level SQLite triggers and hashes. |
| **GAP-06** | Multi-Region Active Ledger Replication | Technical / Architecture | **Single SQLite instance per node** | Implement distributed append-only replication across regional directorate edge servers. | High-availability cross-region ledger syncing deferred to production. |
| **GAP-07** | Automated Document Redaction (PII/Sensitive) | Security / Privacy | **Manual Reviewer Responsibility** | Implement automated NER/regex pre-masking for Aadhaar / personal phone numbers in PDF dockets. | Relies on human scrutiny officers not citing personal identifying details. |

---

## 3. PROVISIONAL ACCEPTANCE METRICS TRACKING

The Form2Fact V3 Operational Dashboard tracks the following provisional project targets:

| Metric | Provisional Target | Current Measured Baseline | Status |
| :--- | :---: | :---: | :--- |
| **Real Institutional Source Documents** | $\ge 200$ Documents | **0 Documents** | Awaiting Institutional Intake |
| **Double-Annotated Candidate Pairs** | $\ge 200$ Pairs | **0 Pairs** | Awaiting Staffed Evaluation |
| **Cohen's Kappa Inter-Rater Reliability** | $\ge 0.70$ | **`null`** ($N=0$) | Statistical Baseline Pending |
| **Maximum Adjudication Rate** | $\le 25\%$ | **$0.0\%$** | Pending Dispute Generation |
| **Export Firewall Acceptance Compliance** | $100\%$ (15/15 Gates) | **$100\%$ Compliant** | Programmatically Enforced |
| **Clean Baseline Invariant** | 0 Synthetic Records | **0 Records** | Strictly Maintained |

---

## 4. NEXT STEPS FOR PRODUCTION PILOT

1. **Execute Legal Clearance:** Formalize data sharing terms with AICTE Regional Offices.
2. **Onboard Directorate Reviewers:** Nominate and authenticate at least 4 scrutiny officers across Western and Northern regions using the administrative authorization workflow.
3. **Ingest Initial 50 Dockets:** Ingest and provenance-verify the first batch of 50 public inspection approval dossiers.
4. **Initiate Double-Blind Annotation:** Run double-blind annotation cycles to evaluate initial inter-rater agreement and operational adjudication rates.
5. **Re-evaluate Acceptance Dashboard:** Once 200 pairs are collected with $\kappa \ge 0.70$, convene an independent audit to grant model training authorization.
