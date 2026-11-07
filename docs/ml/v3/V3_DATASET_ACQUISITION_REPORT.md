# FORM2FACT — V3 RESEARCH DATASET ACQUISITION REPORT

**Document ID:** `REPORT-V3-DATA-ACQUISITION-01`  
**Date:** November 7, 2026  
**Auditor Roles:** Senior ML Research Engineer, Dataset Acquisition Engineer, NLP Researcher  
**Branch:** `feature/ml-pairwise-classifier-v3`  
**Base Commit:** `31f2873fc58f70a296aebbc86760dbdd868ca465`  
**Status:** **ACQUISITION COMPLETE — DATA VALIDATION REQUIRED**

---

## 1. EXECUTIVE SUMMARY

To address the limitations of the Form2Fact V2 training corpus (which relied predominantly on 1,250 rule-based synthetic expansions and a small test benchmark of $N = 41$), a systematic acquisition of primary semantic relationship and claim verification research datasets was conducted for V3.

Four primary datasets were investigated and acquired:
1. **Stanford Natural Language Inference (SNLI)**
2. **Multi-Genre Natural Language Inference (MultiNLI)**
3. **Automated Verification of Real-world Textual Claims (AVeriTeC)**
4. **Fact Extraction and VERification (FEVER)**

A total of **8 verified files** comprising **613,365 records** (46.80 MB on disk) were downloaded into `ai_service/ml/data/v3/raw/`. Every file was cryptographically hashed with SHA-256 and registered in machine-readable manifests under `ai_service/ml/data/v3/manifests/`.

All raw data remains strictly isolated and untracked by Git via `.gitignore`. Zero synthetic data is conflated with human-annotated or real-world textual evidence.

---

## 2. ACQUISITION MATRIX & MANIFEST SUMMARY

| Dataset ID | Official Repository / Source | Revision / Version | Licence | Commercial Permitted | Acquired Files | Total Records | Disk Size | Manifest File |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **`snli`** | `stanfordnlp/snli` (Hugging Face) | `cdb5c3d...` | CC BY-SA 4.0 | **YES** | 3 parquet files | 570,152 | 20.44 MB | [`snli.manifest.json`](file:///d:/projects/form2fact/ai_service/ml/data/v3/manifests/snli.manifest.json) |
| **`multinli`** | `nyu-mll/multi_nli` (Hugging Face) | `da70db2...` | CC BY-SA 4.0 / ODC Open | **YES** | 2 parquet files | 19,647 | 10.04 MB | [`multinli.manifest.json`](file:///d:/projects/form2fact/ai_service/ml/data/v3/manifests/multinli.manifest.json) |
| **`averitec`** | `chenxwh/AVeriTeC` (Hugging Face Model Repo) | `2ca9dee...` | CC BY-NC 4.0 | **NO (Research Only)** | 2 JSON files | 3,568 | 11.97 MB | [`averitec.manifest.json`](file:///d:/projects/form2fact/ai_service/ml/data/v3/manifests/averitec.manifest.json) |
| **`fever`** | `fever.ai/download/fever` (Official Server) | `2018_v1.0` | CC BY-SA 3.0 | **YES** | 1 JSONL file | 19,998 | 4.35 MB | [`fever.manifest.json`](file:///d:/projects/form2fact/ai_service/ml/data/v3/manifests/fever.manifest.json) |
| **TOTAL** | — | — | — | — | **8 files** | **613,365** | **46.80 MB** | [`master_acquisition_ledger.json`](file:///d:/projects/form2fact/ai_service/ml/data/v3/manifests/master_acquisition_ledger.json) |

---

## 3. INDIVIDUAL DATASET DOSSIERS

### 3.1 Stanford Natural Language Inference (SNLI)
- **Repository Identifier:** `stanfordnlp/snli`
- **Official URL:** `https://huggingface.co/datasets/stanfordnlp/snli`
- **Revision:** `cdb5c3d5eed6ead6e5a341c8e56e669bb666725b`
- **Licence:** Creative Commons Attribution-ShareAlike 4.0 International (`CC BY-SA 4.0`)
- **Commercial Usability:** Permitted under CC BY-SA 4.0 conditions (derivative works must share-alike).
- **Primary Task:** Sentence-pair natural language inference (premise, hypothesis) with 3 classes (`entailment`, `neutral`, `contradiction`).
- **Files Acquired:**
  1. `validation-00000-of-00001.parquet`: 413,157 bytes | SHA-256: `00f5ed8deaed007f9038237fc6b189ff4c2b921503c80ff626eecfe3322bc8c5` | 10,000 records
  2. `test-00000-of-00001.parquet`: 411,531 bytes | SHA-256: `4696deda851c4d23259e83ec5e173be5d15cb6dd5f385156ebc5970c36746cf2` | 10,000 records
  3. `train-00000-of-00001.parquet`: 19,614,612 bytes | SHA-256: `ef9a7b25d97390a6e30ebff565d3ec6222718105d15f164ce1403b57fa4c3f58` | 550,152 records
- **Total Acquired:** 570,152 records (Complete distribution).
- **Taxonomy Mapping Governance:**
  - `entailment` (label 0) $\not\equiv$ `MATCH`. Entailment denotes general logical consequence, whereas regulatory `MATCH` requires strict statutory identity or acceptable normative variance.
  - `contradiction` (label 2) $\not\equiv$ `MISMATCH`. Natural language contradiction includes conversational impossibilities, whereas regulatory `MISMATCH` denotes statutory parameter variance.
  - Policy: SNLI records are quarantined for semantic backbone pre-training and contrastive representation tuning; they must NOT be directly injected into institutional evaluation splits without human auditing.

---

### 3.2 Multi-Genre Natural Language Inference (MultiNLI)
- **Repository Identifier:** `nyu-mll/multi_nli`
- **Official URL:** `https://huggingface.co/datasets/nyu-mll/multi_nli`
- **Revision:** `da70db2af9d09693783c3320c4249840212ee221`
- **Licence:** Creative Commons Attribution-ShareAlike 4.0 International / ODC Open
- **Commercial Usability:** Permitted under CC BY-SA 4.0 conditions.
- **Primary Task:** Cross-domain semantic relationship evaluation spanning 10 distinct genres (fiction, government reports, slate, telephone speech, travel guides, etc.).
- **Files Acquired:**
  1. `validation_matched-00000-of-00001.parquet`: 4,938,568 bytes | SHA-256: `350c26950b55f4604bbd69f0c5a27178c7324c483a910ec888365df0647e305e` | 9,815 records
  2. `validation_mismatched-00000-of-00001.parquet`: 5,104,992 bytes | SHA-256: `6b0e1231cebedd258169fe5a87b6495be237a8e7e17cb3ea664531be3dbfbdd8` | 9,832 records
- **Total Acquired:** 19,647 records (Benchmark development splits).
- **Value to Form2Fact:** The `government` genre in MultiNLI contains formal institutional vocabulary and policy statements highly relevant to regulatory language parsing.

---

### 3.3 AVeriTeC (Automated Verification of Real-world Textual Claims)
- **Repository Identifier:** `chenxwh/AVeriTeC` (`repo_type="model"`)
- **Official Project URL:** `https://fever.ai/dataset/averitec.html`
- **Revision:** `2ca9dee23a2a6fa64c5bd918e0cd28ed0aa09031`
- **Licence:** Creative Commons Attribution-NonCommercial 4.0 International (`CC BY-NC 4.0`)
- **Commercial Usability:** **STRICTLY PROHIBITED FOR COMMERCIAL DISTRIBUTION**.
  > [!CAUTION] Non-Commercial Licence Alert
  > AVeriTeC carries a `CC BY-NC 4.0` licence. It is legally authorized for academic research, internal error analysis, and benchmark evaluation, but **must never be commingled into model weights distributed for commercial production**.
- **Primary Task:** Real-world claim verification against question-answer evidence justifications and search snippets.
- **Files Acquired:**
  1. `dev.json`: 1,785,475 bytes | SHA-256: `499793726b4a5406bf55d911b30f80dc7eb0408ee588b5b7ec6b83f3e2b17578` | 500 records
  2. `train.json`: 10,184,813 bytes | SHA-256: `ae5eda7c42ddf16955a6d59a721c5b8b98e18fb5f52427a9fae9a93322db740f` | 3,068 records
- **Total Acquired:** 3,568 records.
- **Structure:** Each record contains `claim`, `label` (`Supported`, `Refuted`, `Not Enough Evidence`, `Conflicting Evidence/Alternative Explanation`), and multi-turn QA evidence pairs.

---

### 3.4 Fact Extraction and VERification (FEVER)
- **Repository Identifier:** Official FEVER distribution via `fever.ai`
- **Official URL:** `https://fever.ai/dataset/fever.html`
- **Revision:** `2018_v1.0`
- **Licence:** Creative Commons Attribution-ShareAlike 3.0 / Wikipedia Copyright Policy
- **Commercial Usability:** Permitted under CC BY-SA 3.0 conditions.
- **Primary Task:** Fact claim verification (`SUPPORTS`, `REFUTES`, `NOT ENOUGH INFO`).
- **Files Acquired:**
  1. `shared_task_dev.jsonl`: 4,349,935 bytes | SHA-256: `e89865bfe1b4dd056801538356d78a87bbf7d9a5b3a4a1d48c0a233636f2f9b1` | 19,998 records
- **Total Acquired:** 19,998 records (Official labelled shared-task development benchmark).

---

## 4. INTEGRITY AUDIT SCRIPT EXECUTION

The manifest inventory verification script [`ai_service/ml/data/v3/scripts/inventory_manifests.py`](file:///d:/projects/form2fact/ai_service/ml/data/v3/scripts/inventory_manifests.py) was executed to verify every downloaded file:

```text
======================================================================
 FORM2FACT V3 — MANIFEST & CRYPTOGRAPHIC INTEGRITY AUDIT
======================================================================

Verifying Manifest: AVeriTeC: Automated Verification of Real-world Textual Claims (averitec.manifest.json)
  ✅ Verified: dev.json (1,785,475 bytes, 500 records, SHA: 499793726b4a5406...)
  ✅ Verified: train.json (10,184,813 bytes, 3,068 records, SHA: ae5eda7c42ddf169...)

Verifying Manifest: Fact Extraction and VERification (FEVER) (fever.manifest.json)
  ✅ Verified: shared_task_dev.jsonl (4,349,935 bytes, 19,998 records, SHA: e89865bfe1b4dd05...)

Verifying Manifest: Multi-Genre Natural Language Inference (MultiNLI) (multinli.manifest.json)
  ✅ Verified: validation_matched-00000-of-00001.parquet (4,938,568 bytes, 9,815 records, SHA: 350c26950b55f460...)
  ✅ Verified: validation_mismatched-00000-of-00001.parquet (5,104,992 bytes, 9,832 records, SHA: 6b0e1231cebedd25...)

Verifying Manifest: Stanford Natural Language Inference (SNLI) (snli.manifest.json)
  ✅ Verified: validation-00000-of-00001.parquet (413,157 bytes, 10,000 records, SHA: 00f5ed8deaed007f...)
  ✅ Verified: test-00000-of-00001.parquet (411,531 bytes, 10,000 records, SHA: 4696deda851c4d23...)
  ✅ Verified: train-00000-of-00001.parquet (19,614,612 bytes, 550,152 records, SHA: ef9a7b25d97390a6...)

======================================================================
AUDIT SUMMARY: PASS
Total Manifests Verified: 4
Total Files Verified: 8
Total Acquired Records: 613,365
Total Disk Footprint: 46,803,083 bytes (44.63 MB)
======================================================================
```

---

## 5. SUMMARY OF ACQUISITION READINESS

1. **Exact Download Integrity:** 100% of acquired files match their manifest SHA-256 signatures.
2. **Provenance Traceability:** Every file is linked to its official upstream repository, revision hash, and licence.
3. **Licence Quarantining:** Non-commercial datasets (AVeriTeC) are explicitly flagged and quarantined from commercial training pipelines.
4. **Git Protection:** All 44.63 MB of raw parquet, JSON, and JSONL data files are strictly excluded from Git tracking via `.gitignore`. Only cryptographic manifests, scripts, and documentation are committed.

---
*Report certified by Senior ML Research Engineer & Dataset Acquisition Lead.*
