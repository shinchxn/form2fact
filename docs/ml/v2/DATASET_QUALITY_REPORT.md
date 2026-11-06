# Form2Fact Model V2 — Dataset Quality & Statistical Balance Report

**Generated Date:** 2026-11-06  
**Artifact Evaluated:** `ai_service/ml/data/v2_acquisition/processed/form2fact_v2_candidate_pool.jsonl`  
**Metadata:** `ai_service/ml/data/v2_acquisition/processed/v2_dataset_meta.json`

---

## 1. Corpus Growth & Composition Summary
- **Baseline V1 Records:** 70 pairs (preserved 100% intact)
- **V2 Expansion Records:** 1,250 pairs
- **Total V2 Candidate Pool:** **1,320 pairs** (an 18.8x expansion over V1)
- **Exact Duplicate Count:** 0
- **Validation Errors:** 0 (100% conformant to canonical JSONL schema)

---

## 2. 5-Class Target Distribution

| Canonical Label | Total Records | Percentage | Role in Decision Support Pipeline |
|:---|---:|---:|:---|
| **`MATCH`** | 419 | 31.7% | Concordant claims and evidence across dates, numbers, names, and codes. |
| **`MISMATCH`** | 377 | 28.6% | Material deficits, lease expiry lapses, entity contradictions. |
| **`MISSING`** | 204 | 15.5% | Absent mandatory certificates and omitted statutory attachments. |
| **`UNCERTAIN`** | 162 | 12.3% | Ambiguous phrasing, non-numeric boundary notes, OCR corruption. |
| **`NOT_COMPARABLE`** | 158 | 12.0% | Incompatible cross-document dimensions (e.g. built-up area vs deed date). |
| **Total** | **1,320** | **100.0%** | **Balanced across all five target classes.** |

---

## 3. Stratified Partitioning Overview
Splits were generated using a fixed random seed (`42`) and stratified by label:

- **Train Split (`train_v2.jsonl`):** 921 records (70%)
  - `MATCH`: 293, `MISMATCH`: 263, `MISSING`: 142, `UNCERTAIN`: 113, `NOT_COMPARABLE`: 110
- **Validation Split (`val_v2.jsonl`):** 195 records (15%)
  - `MATCH`: 62, `MISMATCH`: 56, `MISSING`: 30, `UNCERTAIN`: 24, `NOT_COMPARABLE`: 23
- **Test Split (`test_v2.jsonl`):** 204 records (15%)
  - `MATCH`: 64, `MISMATCH`: 58, `MISSING`: 32, `UNCERTAIN`: 25, `NOT_COMPARABLE`: 25
