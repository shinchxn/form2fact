# FORM2FACT — V3 DATA QUALITY & ACCEPTANCE CHECKLIST

**Document ID:** `CHECKLIST-V3-QUALITY-01`  
**Date:** November 7, 2026  
**Auditor Roles:** Senior QA Lead, Data Governance Auditor, MLOps Engineer  
**Branch:** `feature/ml-pairwise-classifier-v3`  

---

## 1. QUALITY ASSURANCE OBJECTIVE

Every dataset record entering the Form2Fact V3 training or evaluation pipelines must satisfy the following **9-dimension Quality Assurance Checklist**. Any record failing a mandatory check is rejected by [`validate_v3_schema.py`](file:///d:/projects/form2fact/ai_service/ml/data/v3/scripts/validate_v3_schema.py) and logged in the rejection report.

---

## 2. NINE-POINT DATA QUALITY CHECKLIST

| # | Quality Dimension | Specific Verification Requirement | Verification Tool / Script | Status / Pass Criteria |
| :---: | :--- | :--- | :--- | :---: |
| **1** | **Cryptographic Checksum** | Every raw file must exist on disk and exactly match its recorded SHA-256 hash in `manifests/*.manifest.json`. | [`inventory_manifests.py`](file:///d:/projects/form2fact/ai_service/ml/data/v3/scripts/inventory_manifests.py) | **MANDATORY (100% Match)** |
| **2** | **Licence & Commercial Clearance** | Applicable licence confirmed. Non-commercial datasets (AVeriTeC) quarantined from commercial release weights. | [`V3_DOCUMENT_DATASET_LICENCE_AUDIT.md`](file:///d:/projects/form2fact/docs/ml/v3/V3_DOCUMENT_DATASET_LICENCE_AUDIT.md) | **MANDATORY (Zero Contamination)** |
| **3** | **Structural Schema Conformance** | Record parses validly against `V3PairwiseRecord` (claim, evidence, comparison, provenance, quality). | [`validate_v3_schema.py`](file:///d:/projects/form2fact/ai_service/ml/data/v3/scripts/validate_v3_schema.py) | **MANDATORY (0 Schema Errors)** |
| **4** | **Taxonomy Strictness** | Target label belongs strictly to the 5 canonical classes: `MATCH`, `MISMATCH`, `MISSING`, `UNCERTAIN`, `NOT_COMPARABLE`. | Pydantic field validator | **MANDATORY (0 Unknown Labels)** |
| **5** | **Zero Duplicate Record IDs** | Every `record_id` is globally unique within the V3 corpus. No identical pair claims under different IDs. | Seen-set hash collision check in validator | **MANDATORY (0 Collisions)** |
| **6** | **Group-Aware Leakage Defense** | Records derived from the same underlying legal deed or educational trust reside in exactly one partition. | [`V3_SPLIT_AND_LEAKAGE_POLICY.md`](file:///d:/projects/form2fact/docs/ml/v3/V3_SPLIT_AND_LEAKAGE_POLICY.md) | **MANDATORY ($\mathcal{G}_{\text{train}} \cap \mathcal{G}_{\text{test}} \equiv \emptyset$)** |
| **7** | **Synthetic-vs-Real Transparency** | No record may claim `is_human_annotated: true` if derived from rules or generative LLMs. Disclosed via boolean flags. | Model-level validator in `V3PairwiseRecord` | **MANDATORY (Mutually Exclusive)** |
| **8** | **PII & Financial Redaction** | Personal phone numbers, Aadhaar numbers, private residential addresses, and monetary considerations redacted. | Regulatory Redaction Filter | **MANDATORY (0 Unredacted PII)** |
| **9** | **Human Annotation Traceability** | Human-annotated records must record officer pseudonymous ID, adjudication timestamp, and substantive statutory rationale. | Institutional Annotation Schema | **MANDATORY (Non-Empty Rationale)** |

---

## 3. DEFECT TRIAGE & REJECTION PROTOCOL

When batch-validating raw candidates into `ai_service/ml/data/v3/processed/`:

1. **Fatal Validation Failures (Immediate Drop & Log):**
   - Missing required fields (`claim.text`, `evidence.text`, `comparison.label`).
   - Unknown label strings outside the 5-class taxonomy.
   - Contradictory metadata flags (`is_synthetic=True` AND `is_human_annotated=True`).
   - Duplicate `record_id` instances.
2. **Quarantine Failures (Held for Auditor Review):**
   - High uncertainty or ambiguous semantic mappings (`annotation_status: 'quarantined'`).
   - Records with unreadable OCR noise that lack the `UNCERTAIN` label.
   - Non-commercial provenance records attempting to cross into commercial train splits.
3. **Audit Trail Logging:**
   - Every execution of `validate_v3_schema.py` outputs a timestamped JSON rejection report detailing line numbers and exact failure exceptions.

---
*Checklist approved by Senior QA Lead, Data Governance Auditor & MLOps Engineer.*
