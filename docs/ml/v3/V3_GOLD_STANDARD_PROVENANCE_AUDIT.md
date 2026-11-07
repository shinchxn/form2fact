# FORM2FACT V3 — GOLD-STANDARD HUMAN DATASET PROVENANCE & FORENSIC AUDIT

**Repository:** `https://github.com/shinchxn/form2fact.git`  
**Branch:** `feature/ml-pairwise-classifier-v3`  
**Target File:** `ai_service/ml/data/v3/annotations/gold_standard_human.jsonl`  
**Manifest File:** `ai_service/ml/data/v3/manifests/gold_standard_human.manifest.json`  
**Quarantine Destination:** `ai_service/ml/data/v3/annotations/quarantine/test_generated_records.jsonl`  
**Audit Date:** 2026-11-07  
**Auditor:** ML Dataset Governance Lead & Independent Release Acceptance Auditor  

---

## 1. EXECUTIVE SUMMARY & PROVENANCE STATUS

A forensic audit of `gold_standard_human.jsonl` and its provenance chain was conducted to determine whether the Form2Fact V3 human gold-standard corpus contains genuine, legally traceable institutional ground truth.

### Key Audit Finding
```
========================================================================================
   PROVENANCE VERDICT:
   GENUINE INSTITUTIONAL HUMAN GROUND TRUTH HAS NOT YET BEEN ESTABLISHED.
========================================================================================
```

### Forensic Summary
1. **Source of Historic Records**: Records committed in `8dae3bb` or generated during Phase 2 development were produced by automated test suites (`server/tests/annotationWorkbench.test.ts`), simulating annotator API calls with synthetic dummy parameters.
2. **Defects in Early Records**:
   - Source document identifiers were missing (`null`) or set to test placeholders (`ValidClaim.pdf`, `ValidEvidence.pdf`).
   - Page citations were `null` in early exports.
   - Repeated runs generated duplicate pairs (e.g., 4 identical instances of fire safety NOC validity).
   - "Human" annotators were simulated bot accounts (`usr-annotator-1`, `usr-annotator-2`) executing in-memory HTTP requests.
3. **Quarantine Action**: All test-generated records have been **PERMANENTLY QUARANTINED** to `ai_service/ml/data/v3/annotations/quarantine/test_generated_records.jsonl`.
4. **Current Status**: The production destination `gold_standard_human.jsonl` has been reset to an empty state (**0 records**), verified by cryptographic hash `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` and validated against the V3 Pydantic schema validator.
5. **Mandatory Stop Gate**: Model training, parameter fine-tuning, and performance reporting are **STRICTLY PROHIBITED** until authentic regulatory scrutiny dockets are annotated by accredited human evaluators.

---

## 2. FORENSIC LINE-BY-LINE AUDIT OF HISTORIC EXPORTS

A forensic audit of the records discovered in `gold_standard_human.jsonl` prior to quarantine is detailed below.

### 2.1 Commit `8dae3bb` Initial Ingestion Inspection

Commit `8dae3bb` introduced 3 initial lines to `gold_standard_human.jsonl`:

```json
{"record_id":"gold-v3-ann-003e4554","schema_version":"3.0","group_id":"inst-aicte-wb-101::docket","claim":{"text":"Fire Safety Certificate valid up to 31/12/2026","field_name":"fire_safety_noc_validity","source_document_id":null,"page":4},"evidence":{"text":"Fire and Rescue Services Department NOC Certificate valid through 31-Dec-2026","source_document_id":null,"page":2},"comparison":{"source_label":null,"label":"MATCH","field_type":"date","normalization_applied":["regulatory_standardization"],"ocr_quality":"high"},"provenance":{"dataset":"form2fact_v3_aicte_human_gold","source_url":"https://www.aicte-india.org/bulletins/approved-institutions","licence":"Public Regulatory Inspection Disclosure","annotation_status":"human_annotated"},"quality":{"is_synthetic":false,"is_human_annotated":true,"review_status":"audited"}}
{"record_id":"gold-v3-ann-0531bff7","schema_version":"3.0","group_id":"inst-10dcfd::docket","claim":{"text":"Registered under Societies Act XXI of 1860, Valid through 2030","field_name":"society_registration_status","source_document_id":null,"page":null},"evidence":{"text":"Certificate renewed annually; current renewal certificate expires 31-03-2026","source_document_id":null,"page":null},"comparison":{"source_label":null,"label":"MISMATCH","field_type":"entity_name","normalization_applied":["regulatory_standardization"],"ocr_quality":"adjudicated_verified"},"provenance":{"dataset":"form2fact_v3_aicte_human_gold","source_url":"https://www.aicte-india.org/bulletins/approved-institutions","licence":"Public Regulatory Inspection Disclosure","annotation_status":"human_annotated"},"quality":{"is_synthetic":false,"is_human_annotated":true,"review_status":"audited"}}
{"record_id":"gold-v3-ann-afe95a83","schema_version":"3.0","group_id":"inst-aicte-wb-101::docket","claim":{"text":"Fire Safety Certificate valid up to 31/12/2026","field_name":"fire_safety_noc_validity","source_document_id":null,"page":4},"evidence":{"text":"Fire and Rescue Services Department NOC Certificate valid through 31-Dec-2026","source_document_id":null,"page":2},"comparison":{"source_label":null,"label":"MATCH","field_type":"date","normalization_applied":["regulatory_standardization"],"ocr_quality":"high"},"provenance":{"dataset":"form2fact_v3_aicte_human_gold","source_url":"https://www.aicte-india.org/bulletins/approved-institutions","licence":"Public Regulatory Inspection Disclosure","annotation_status":"human_annotated"},"quality":{"is_synthetic":false,"is_human_annotated":true,"review_status":"audited"}}
```

#### Line-by-Line Forensic Defects:
- **Line 1 (`gold-v3-ann-003e4554`)**:
  - `claim.source_document_id`: `null` (Violates Gate 2: Identifiable source document).
  - `evidence.source_document_id`: `null` (Violates Gate 2).
  - Provenance Claim: Falsely claimed `is_synthetic: false` and `review_status: audited` despite missing source document identifiers.
- **Line 2 (`gold-v3-ann-0531bff7`)**:
  - `claim.source_document_id`: `null` (Violates Gate 2).
  - `claim.page`: `null` (Violates Gate 3: Minimum page $\ge 1$).
  - `evidence.page`: `null` (Violates Gate 3).
  - Failed V3 Pydantic schema validation (`page` must be an integer $\ge 1$).
- **Line 3 (`gold-v3-ann-afe95a83`)**:
  - Duplicate record of Line 1 (`inst-aicte-wb-101::docket`, identical claim and evidence).
  - Demonstrates lack of deduplication across export invocations.

### 2.2 Test-Run Artifacts Analysis (8-Record Export)

During Phase 2 automated test execution, the test suite populated additional records:

| Record ID | Institution / Docket | Field Name | Claim / Evidence Document | Flaw Detected |
|---|---|---|---|---|
| `gold-v3-ann-003e4554` | `inst-aicte-wb-101` | `fire_safety_noc_validity` | `Part-1 Statutory Application Form` | Duplicate fixture |
| `gold-v3-ann-145e9273` | `inst-eb0e7e` | `society_registration_status` | `Statutory_Application_Approval.pdf` | Generated by test script |
| `gold-v3-ann-1da3b782` | `inst-aicte-wb-101` | `fire_safety_noc_validity` | `Part-1 Statutory Application Form` | Duplicate fixture |
| `gold-v3-ann-1f125074` | `inst-aicte-wb-101` | `fire_safety_noc_validity` | `Part-1 Statutory Application Form` | Duplicate fixture |
| `gold-v3-ann-3b5ca58d` | `inst-4bd993` | `land_area` | `ValidClaim.pdf` / `ValidEvidence.pdf` | Synthetic test placeholder filenames |
| `gold-v3-ann-52892977` | `inst-696d39` | `society_registration_status` | `Statutory_Application_Approval.pdf` | Generated by test script |
| `gold-v3-ann-669397a0` | `inst-6964e8` | `land_area` | `ValidClaim.pdf` / `ValidEvidence.pdf` | Synthetic test placeholder filenames |
| `gold-v3-ann-afe95a83` | `inst-aicte-wb-101` | `fire_safety_noc_validity` | `Part-1 Statutory Application Form` | Duplicate fixture |

#### Why Test-Generated Records Cannot Be Committed as Human Gold Standard:
1. **Scientific Integrity**: Training a supervised model on automated test scripts causes severe circular contamination (overfitting to test runner assertions).
2. **Missing Chain of Custody**: Neither physical inspection reports nor digitally signed AICTE portal submissions exist for `ValidClaim.pdf`.
3. **Duplicate Skew**: Four out of eight records evaluated the identical fire safety certificate, creating severe class imbalance and misleading metric evaluation.

---

## 3. PROVENANCE CHAIN OF CUSTODY CRITERIA

To transition a candidate record into the Form2Fact V3 Gold-Standard Corpus, the following immutable chain of custody must be established:

```
[Certified AICTE Docket]
         │ (PDF Document Ingestion with SHA-256 Checksum)
         ▼
[Candidate Task Ingestion] ───► Recorded in SQLite Ledger
         │
         ├───► Evaluator 1 (Double-Blind Independent Review)
         │       └── Submitted with Statutory Rationale (>=10 chars)
         │
         ├───► Evaluator 2 (Double-Blind Independent Review)
         │       └── Submitted with Statutory Rationale (>=10 chars)
         │
         ▼
[Consensus / Adjudication Engine]
         ├── If Labels Match  ──► Status: agreed
         └── If Labels Differ ──► Status: disputed ──► Statutory Adjudicator Resolves
                                                               │
                                                               ▼
                                                      Status: adjudicated
                                                               │
                                                               ▼
                                                  [Export Acceptance Gate (6 Gates)]
                                                               │
                                                               ▼
                                                  [gold_standard_human.jsonl]
```

### Mandatory Provenance Properties
1. **Source Document Verification**:
   - `claim.source_document_id`: Must reference a valid document registered in the `documents` table with an associated SHA-256 checksum and page count.
   - `evidence.source_document_id`: Must reference an official supporting exhibit (e.g., Registered Lease Deed, Town Planning Approval, Fire Safety NOC).
2. **Page Citations**:
   - Exact physical or digital page index ($\ge 1$) within the docket.
3. **Annotator Identity & Independence**:
   - Two distinct evaluators identified by their authenticated system user IDs (`usr-*`).
   - Timestamps proving independent blind evaluation prior to peer submission visibility.
4. **Adjudication Trail**:
   - Where evaluators disagreed, a licensed Adjudicator (`role: Adjudicator`) must provide a binding statutory rationale ($\ge 10$ characters).

---

## 4. QUARANTINE ACTION & CLEAN REPOSITORY STATE

### 4.1 Quarantine Implementation
The 8 test-generated records have been extracted from the active dataset path and stored in the quarantine directory:
- **Path**: `ai_service/ml/data/v3/annotations/quarantine/test_generated_records.jsonl`
- **Quarantine README**: `ai_service/ml/data/v3/annotations/quarantine/README.md`
- **Access Policy**: Read-only archival; strictly excluded from ML data loading pipelines.

### 4.2 Current Gold-Standard Dataset State
- **File**: `ai_service/ml/data/v3/annotations/gold_standard_human.jsonl`
  - Records count: `0`
  - File size: `0` bytes
  - SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- **Manifest**: `ai_service/ml/data/v3/manifests/gold_standard_human.manifest.json`
  - `record_count`: `0`
  - `rejection_count`: `0`
  - `quality_invariants.rejection_gate_active`: `true`
  - `status_note`: `"Awaiting authorized institutional human annotations. Zero records collected or exported to date."`

### 4.3 Validation Output
Running `python ai_service/ml/data/v3/scripts/validate_v3_schema.py` on the clean file confirms:
```json
{
  "file": "ai_service\\ml\\data\\v3\\annotations\\gold_standard_human.jsonl",
  "total_lines_inspected": 0,
  "valid_records_count": 0,
  "rejected_records_count": 0,
  "duplicate_count": 0,
  "rejection_rate": 0.0,
  "rejections": []
}
```

---

## 5. REQUIREMENTS FOR ESTABLISHING REAL GOLD-STANDARD DATA

Before `gold_standard_human.jsonl` can receive genuine data:

1. **Source Docket Ingestion**:
   - Minimum of 200 real application dockets from AICTE Western or Northern regional portals.
   - Verified PDF files with cryptographic SHA-256 checksums stored in SQLite `documents` table.
2. **Evaluator Panel Appointment**:
   - Minimum of 4 accredited scrutiny committee officers registered with role `Annotator`.
   - Minimum of 2 senior scrutiny officers registered with role `Adjudicator`.
3. **Annotation Quorum**:
   - Minimum of 200 candidate pairs double-annotated under blind review conditions.
   - Target inter-annotator agreement: Cohen's Kappa $\ge 0.70$.
4. **Independent Post-Collection Audit**:
   - Re-audit of `gold_standard_human.jsonl` verifying zero synthetic records, zero demo records, and complete page citations.

---

## 6. MANDATORY STOP GATE

```
========================================================================================
   MANDATORY MLOPS STOP GATE:
   NO MODEL TRAINING OR WEIGHT UPDATES MAY OCCUR ON V3 UNTIL THE
   GOLD-STANDARD HUMAN DATASET IS POPULATED WITH AUTHENTIC ANNOTATIONS
   AND CERTIFIED BY AN INDEPENDENT FORENSIC RE-AUDIT.
========================================================================================
```

- Any attempt to train, fine-tune, or calibrate models using synthetic, mock, or test-generated data will result in immediate rejection during release acceptance.
- The existing V2 calibrated pipeline (`ai_service/ml/artifacts/v2/`) remains the production baseline until V3 is formally established and certified.
