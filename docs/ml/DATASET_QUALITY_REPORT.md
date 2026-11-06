# Form2Fact — Dataset Quality & Balance Report

**Generated At:** 2026-11-06  
**Artifact Source:** `ai_service/ml/data/reports/dataset_quality_report.json`  

---

## 1. Corpus Statistics Overview
- **Total Validated Records:** 70
- **Deduplication Check:** 0 duplicates detected (100% unique sample fingerprints)
- **Validation Errors:** 0 (all records strictly adhere to the pairwise schema)
- **Language:** English (`en`)

## 2. Class Distribution
| Classification Label | Count | Percentage | Role in Regulatory Pipeline |
|:---|---:|---:|:---|
| **MATCH** | 29 | 41.4% | Concordance across dates, acreages, entity titles, codes |
| **MISMATCH** | 24 | 34.3% | Verified statutory contradictions and deficits |
| **UNCERTAIN** | 8 | 11.4% | Borderline lexical overlap, OCR noise, ambiguous phrasing |
| **MISSING** | 6 | 8.6% | Absent required certificates/evidence fields in submission |
| **NOT_COMPARABLE** | 3 | 4.3% | Semantic category mismatch (e.g. built-up area vs deed date) |
| **Total** | **70** | **100%** | |

## 3. Stratified Partitioning (Zero Data Leakage)
- **Train Split (`train.jsonl`):** 47 records (70%)
- **Validation Split (`val.jsonl`):** 10 records (15%)
- **Test Split (`test.jsonl`):** 13 records (15%)

All splits preserve representation of all statutory classes. No near-duplicate or template variants share cross-split boundaries.

