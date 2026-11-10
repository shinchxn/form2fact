# FORM2FACT — EXISTING DATASET AUDIT & PROVENANCE INVENTORY

**Document Type:** Senior AI/ML Data Engineering Audit & Provenance Forensic Report  
**Target Purpose:** Complete audit of all existing datasets in the Form2Fact repository for Model Adaption & Training Preparation  
**Auditor:** Senior AI/ML Data Engineer  
**Audit Date:** November 10, 2026  
**Repository Branch:** `main`  
**Governance Standard:** Zero-Fabrication, Strict Provenance Integrity, and Synthetic Disclosure  

---

## 1. Executive Summary

This audit independently inspects and catalogs **every dataset, data partition, manifest, external benchmark, and database table** present in the Form2Fact project. 

### Key Findings
1. **Total Distinct Data Assets Audited:** 24 files across V1, V2, V3, and SQLite storage.
2. **Authentic Human Institutional Ground Truth:** **0 records (0 bytes)**. The production authoritative gold-standard file (`ai_service/ml/data/v3/annotations/gold_standard_human.jsonl`) is locked at zero records under strict V3 governance until bilateral pilot agreements yield legally authorized human annotations.
3. **Form2Fact Native Domain Corpus:** **1,320 records** (70 V1 baseline pairs + 1,250 V2 domain expansion pairs). All 1,320 records are **100% synthetically generated** from statutory AICTE norms using template slot-filling and regulatory heuristics.
4. **Deduplication Finding:** Of the 1,320 domain records, only **520 unique (field, claim, evidence, label) tuples** exist due to template reuse across synthetic institutions.
5. **External Benchmark Corpora:** Over 570,000 public records (SNLI, MultiNLI, FEVER, AVeriTeC) exist in raw directories or manifests. These represent general web, Wikipedia, or caption NLI data and **must not be conflated with or mapped naively into Form2Fact's 5-class regulatory taxonomy**.

---

## 2. Complete Dataset Inventory

| Dataset Asset | File Path | Format | Size (Bytes) | Record Count | Native Domain? | Origin Type | License |
|:---|:---|:---:|---:|---:|:---:|:---:|:---:|
| **V1 Raw Baseline** | `ai_service/ml/data/raw/form2fact_pairwise_dataset.jsonl` | JSONL | 37,295 | 70 | Yes (AICTE/NAAC/NBA) | Synthetic Seed | MIT / Internal |
| **V1 Processed** | `ai_service/ml/data/processed/form2fact_pairwise_processed.jsonl` | JSONL | 56,241 | 70 | Yes | Feature-Engineered | MIT / Internal |
| **V1 Train Split** | `ai_service/ml/data/splits/train.jsonl` | JSONL | 37,628 | 47 | Yes | Synthetic Split | MIT / Internal |
| **V1 Val Split** | `ai_service/ml/data/splits/val.jsonl` | JSONL | 7,843 | 10 | Yes | Synthetic Split | MIT / Internal |
| **V1 Test Split** | `ai_service/ml/data/splits/test.jsonl` | JSONL | 10,770 | 13 | Yes | Synthetic Split | MIT / Internal |
| **V2 Candidate Pool** | `ai_service/ml/data/v2_acquisition/processed/form2fact_v2_candidate_pool.jsonl` | JSONL | 993,340 | 1,320 | Yes (AICTE) | Synthetic Combined | MIT / Internal |
| **V2 Domain Expansion** | `ai_service/ml/data/v2_acquisition/processed/form2fact_domain_candidates/form2fact_v2_domain_expansion.jsonl` | JSONL | 953,688 | 1,250 | Yes (AICTE) | Synthetic Slot-Filling | MIT / Internal |
| **V2 SNLI Mapped** | `ai_service/ml/data/v2_acquisition/processed/snli_mapped_candidates.jsonl` | JSONL | 146,197 | 200 | No (Flickr30k) | Public Benchmark Mapped | CC BY-SA 4.0 |
| **V2 Train Split** | `ai_service/ml/data/v2_acquisition/processed/splits/train_v2.jsonl` | JSONL | 693,824 | 921 | Yes | Synthetic Split | MIT / Internal |
| **V2 Val Split** | `ai_service/ml/data/v2_acquisition/processed/splits/val_v2.jsonl` | JSONL | 146,255 | 195 | Yes | Synthetic Split | MIT / Internal |
| **V2 Test Split** | `ai_service/ml/data/v2_acquisition/processed/splits/test_v2.jsonl` | JSONL | 153,261 | 204 | Yes | Synthetic Split | MIT / Internal |
| **V2 Rigorous Train** | `ai_service/ml/data/v2_acquisition/processed/rigorous_splits/train_rigorous.jsonl` | JSONL | 230,004 | 319 | Yes | Category-Isolated | MIT / Internal |
| **V2 Rigorous Val** | `ai_service/ml/data/v2_acquisition/processed/rigorous_splits/val_rigorous.jsonl` | JSONL | 120,484 | 162 | Yes | Category-Isolated | MIT / Internal |
| **V2 Rigorous Test** | `ai_service/ml/data/v2_acquisition/processed/rigorous_splits/test_rigorous.jsonl` | JSONL | 29,656 | 41 | Yes | Category-Isolated | MIT / Internal |
| **V3 Gold Standard** | `ai_service/ml/data/v3/annotations/gold_standard_human.jsonl` | JSONL | 0 | 0 | Yes (Statutory) | Frozen Ground Truth | Locked (0 Records) |
| **FEVER Dev Split** | `ai_service/ml/data/v3/raw/fever/shared_task_dev.jsonl` | JSONL | 4,349,935 | 19,998 | No (Wikipedia) | Public Benchmark | CC BY-SA 3.0 |
| **AVeriTeC Train** | `ai_service/ml/data/v3/raw/averitec/data/train.json` | JSON | 10,184,813 | 3,068 | No (Fact-Check Web) | Public Benchmark | CC BY-NC 4.0 |
| **AVeriTeC Dev** | `ai_service/ml/data/v3/raw/averitec/data/dev.json` | JSON | 1,785,475 | 500 | No (Fact-Check Web) | Public Benchmark | CC BY-NC 4.0 |
| **MultiNLI Matched** | `ai_service/ml/data/v3/raw/multinli/validation_matched-00000-of-00001.parquet` | Parquet | 4,938,568 | 9,815 | No (Multi-Genre) | Public Benchmark | CC BY-SA 4.0 |
| **MultiNLI Mismatched**| `ai_service/ml/data/v3/raw/multinli/validation_mismatched-00000-of-00001.parquet` | Parquet | 5,104,992 | 9,832 | No (Multi-Genre) | Public Benchmark | CC BY-SA 4.0 |
| **SNLI Train** | `ai_service/ml/data/v3/raw/snli/train-00000-of-00001.parquet` | Parquet | 19,614,612 | 550,152 | No (Flickr30k) | Public Benchmark | CC BY-SA 4.0 |
| **SNLI Validation** | `ai_service/ml/data/v3/raw/snli/validation-00000-of-00001.parquet` | Parquet | 413,157 | 10,000 | No (Flickr30k) | Public Benchmark | CC BY-SA 4.0 |
| **SNLI Test** | `ai_service/ml/data/v3/raw/snli/test-00000-of-00001.parquet` | Parquet | 411,531 | 10,000 | No (Flickr30k) | Public Benchmark | CC BY-SA 4.0 |
| **SQLite DB Tables** | `data/form2fact.db` | SQLite | ~1.2 MB | 80 ann / 140 uann | Mixed (Demo/Test) | Automated Test Fixtures| Internal Dev |

---

## 3. Dataset Types, Schema & Content Analysis

### 3.1 Form2Fact V1 Baseline Corpus (`form2fact_pairwise_dataset.jsonl`)
- **Total Records:** 70
- **Language:** English (`en`)
- **Schema Columns:** `pair_id`, `field_name`, `field_type`, `domain`, `claim`, `evidence`, `label`, `data_origin`, `annotation_status`, `reviewer_rationale`.
- **Claim & Evidence Object Structure:**
  - `raw_value`: Extracted string or date (e.g., `"2054-03-31"`, `"8.50 Acres"`).
  - `context`: Narrative context (e.g., `"Lease expiry date as per application form"`).
  - `document_type`: Source document name (e.g., `"application_form"`, `"land_lease_deed"`).
  - `extraction_confidence`: Float between 0.0 and 1.0.
- **Label Distribution:**
  - `MATCH`: 29 (41.4%)
  - `MISMATCH`: 24 (34.3%)
  - `MISSING`: 6 (8.6%)
  - `UNCERTAIN`: 8 (11.4%)
  - `NOT_COMPARABLE`: 3 (4.3%)
- **Data Origin:** Synthetic seed pairs created to establish the initial baseline feature extractor and unit test fixtures.

### 3.2 Form2Fact V2 Domain Expansion Corpus (`form2fact_v2_domain_expansion.jsonl`)
- **Total Records:** 1,250
- **Language:** English (`en`)
- **Schema Columns:** `pair_id`, `domain`, `category`, `field_name`, `field_type`, `claim`, `evidence`, `label`, `reviewer_rationale`, `data_origin`, `annotation_status`.
- **Label Distribution:**
  - `MATCH`: 390 (31.2%)
  - `MISMATCH`: 353 (28.2%)
  - `MISSING`: 198 (15.8%)
  - `UNCERTAIN`: 154 (12.3%)
  - `NOT_COMPARABLE`: 155 (12.4%)
- **Statutory Categories:**
  1. `Land Tenure & Lease Duration`: 165 pairs (Lease expiry, 30-year unencumbered tenure).
  2. `Campus Land Area & Contiguity`: 136 pairs (Acreage deficit, multi-parcel aggregation).
  3. `Built-up Instructional Area vs Deed`: 155 pairs (Constructed area compared to deed expiry; dimensional incompatibility).
  4. `Statutory Safety & Fire NOC`: 151 pairs (Fire safety compliance, expired NOCs, missing certificates).
  5. `Institution Identity & Sponsoring Body`: 153 pairs (Trust/society legal name concordance, commercial entity contradiction).
  6. `Approved Academic Intake`: 161 pairs (Approved student seat counts, unverified intake increases).
  7. `Program Accreditation Outcome`: 173 pairs (NBA accreditation status, validity period alignment).
  8. `Accreditation & Faculty Verification`: 156 pairs (Faculty roster declarations, cadastral survey boundaries).
- **Data Origin:** `v2_synthetic_expansion`. Generated via `ai_service/ml/data/v2_acquisition/generate_v2_expansion.py` using slot-filling templates with randomized institutional prefixes.

### 3.3 Form2Fact V2 Candidate Pool (`form2fact_v2_candidate_pool.jsonl`)
- **Total Records:** 1,320 (Exact union of 70 V1 baseline pairs + 1,250 V2 domain expansion pairs).
- **Label Distribution:**
  - `MATCH`: 419 (31.7%)
  - `MISMATCH`: 377 (28.6%)
  - `MISSING`: 204 (15.5%)
  - `UNCERTAIN`: 162 (12.3%)
  - `NOT_COMPARABLE`: 158 (12.0%)
- **Completeness:** 100% of records possess valid `pair_id`, `field_name`, `claim`, and `label`. For 25 records where `label == 'MISSING'`, `evidence` is intentionally `null` to represent absent documentary evidence.

### 3.4 SNLI Mapped Candidates (`snli_mapped_candidates.jsonl`)
- **Total Records:** 200
- **Source:** Stanford Natural Language Inference (`stanfordnlp/snli`)
- **Original Labels:** `contradiction` (99), `entailment` (101).
- **Mapped Labels:** `MISMATCH` (99), `MATCH` (101).
- **Missing Classes:** Lacks `MISSING`, `UNCERTAIN`, and `NOT_COMPARABLE`.
- **Domain Mismatch:** Captions describe everyday scenes (e.g. *"A person is at a diner, ordering an omelette"* vs *"A person on a horse jumps over a broken down airplane"*). Completely detached from institutional regulatory scrutiny.

### 3.5 V3 Public Raw Benchmark Datasets
- **FEVER (`shared_task_dev.jsonl`):** 19,998 records. 3 classes (`SUPPORTS`: 6,666, `REFUTES`: 6,666, `NOT ENOUGH INFO`: 6,666). General Wikipedia claims.
- **AVeriTeC (`train.json` & `dev.json`):** 3,568 records total. 4 classes (`Supported`, `Refuted`, `Not Enough Evidence`, `Conflicting Evidence/Cherrypicking`). Real-world web/news fact checks with question-answering evidence chains.
- **MultiNLI (`validation_matched` & `mismatched`):** 19,647 records total. 3 classes (`entailment`, `neutral`, `contradiction`). 10 diverse text genres (telephone speech, slate, travel).
- **SNLI Parquets:** 570,152 records total. 3 classes. Flickr30k image descriptions.

### 3.6 Application SQLite Database Tables (`data/form2fact.db`)
- `annotation_records`: 80 total records.
  - 20 records marked `isDemoCandidate = 1` (Apex, Kalyani, Horizon demonstration scenarios).
  - 60 records generated by automated test runners (`stagingOperationalRehearsal.test.ts`, `exportFirewallV3.test.ts`).
  - Labels present: `MATCH` (42), `MISMATCH` (21), unadjudicated/pending (17).
  - Lacks `MISSING`, `UNCERTAIN`, and `NOT_COMPARABLE` in finalized consensus states.
- `user_annotations`: 140 total records entered by test mocks during CI/rehearsal runs.

---

## 4. Licensing & Usage Restrictions

| Dataset | Declared License | Commercial Use Permitted? | Redistribution Permitted? | Model Adaptation Allowed? | Compliance Assessment |
|:---|:---:|:---:|:---:|:---:|:---|
| **Form2Fact V1 & V2** | MIT | **YES** | **YES** | **YES** | 100% compliant for fine-tuning and export. |
| **SNLI** | CC BY-SA 4.0 | **YES** (with attribution & share-alike) | **YES** | **YES** (secondary only) | Permitted, but domain-incompatible. |
| **MultiNLI** | CC BY-SA 4.0 / ODC | **YES** | **YES** | **YES** (secondary only) | Permitted, but domain-incompatible. |
| **FEVER** | CC BY-SA 3.0 | **YES** | **YES** | **YES** (secondary only) | Permitted, but domain-incompatible. |
| **AVeriTeC** | **CC BY-NC 4.0** | **NO (Commercial Use Restricted)** | **YES (Non-commercial)** | **RESEARCH ONLY** | **EXCLUDED** from production model adaptation. |

---

## 5. Data Quality, Duplicates & Data Leakage Audit

### 5.1 ID Uniqueness
- `form2fact_v1_baseline`: 0 duplicate IDs (100% unique `f2f-001` through `f2f-070`).
- `form2fact_v2_domain_expansion`: 0 duplicate IDs (100% unique `v2-pair-01000` through `v2-pair-02249`).
- `form2fact_v2_candidate_pool`: 0 duplicate IDs across all 1,320 records.

### 5.2 Content Duplication Analysis
When examining exact content identity defined as `(field_name, claim.raw_value.lower(), evidence.raw_value.lower(), label)`:
- In `form2fact_v2_domain_expansion.jsonl`, **799 records are duplicate content instances** of earlier templates.
- **Unique Content Tuples:** **520 distinct pairs**.
- *Root Cause:* The template generator (`generate_v2_expansion.py`) looped over 8 categories and applied randomized prefixes (e.g. *Apex*, *Kalyani*, *Horizon*, *National*) to the same core claim values (e.g. *"12,500 sq.m constructed instructional area"* compared against *"2054-03-31"*).
- *Training Implication:* Fine-tuning an LLM on the un-deduplicated 1,320 records will overfit to repeated strings and memorize specific dates. A deduplicated corpus of **520 unique pairs** is required for clean adaptation.

### 5.3 Missing Values Analysis
- Across all 1,320 domain records:
  - `claim`: 0 missing (100% populated).
  - `label`: 0 missing (100% populated).
  - `reviewer_rationale`: 0 missing (100% populated).
  - `evidence`: Exactly 25 records have `evidence: null`. In 100% of these cases, `label == 'MISSING'` and the rationale states *"Registered land lease deed absent from submission"*. This is domain-appropriate.

### 5.4 Cross-Split Data Leakage Audit
An audit was performed across existing V2 split directories:
1. **Standard V2 Splits (`ai_service/ml/data/v2_acquisition/processed/splits/`):**
   - `train_v2` (921) vs `val_v2` (195): **41 content collisions**.
   - `train_v2` (921) vs `test_v2` (204): **43 content collisions**.
   - `val_v2` (195) vs `test_v2` (204): **19 content collisions**.
   - *Verdict:* The standard V2 split suffered from content leakage because random/stratified splitting split identical template strings into both train and test.
2. **Rigorous V2 Splits (`ai_service/ml/data/v2_acquisition/processed/rigorous_splits/`):**
   - `train_rigorous` (319) vs `val_rigorous` (162): **0 collisions (100% isolated)**.
   - `train_rigorous` (319) vs `test_rigorous` (41): **0 collisions (100% isolated)**.
   - `val_rigorous` (162) vs `test_rigorous` (41): **0 collisions (100% isolated)**.
   - *Verdict:* The rigorous splits enforce category-level and template-level isolation. Any new training adaptation MUST respect zero-leakage partition boundaries.

---

## 6. Audit Conclusion & Dataset Catalog

The existing Form2Fact dataset repository contains a mature, well-structured **synthetic regulatory domain corpus (1,320 records, 520 deduplicated)** covering all 5 classes and 8 statutory categories with rich explanatory rationales.

However, **zero authentic institutional human gold-standard records exist**. Public NLI and fact-checking datasets (SNLI, MultiNLI, FEVER, AVeriTeC) cannot substitute for domain regulatory data and are formally excluded from supervised adaptation.

