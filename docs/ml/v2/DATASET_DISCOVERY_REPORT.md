# Form2Fact Model V2 — Autonomous Dataset Discovery Report

**Generated Date:** 2026-11-06  
**Pipeline Script:** `ai_service/ml/data/v2_acquisition/acquire_datasets.py`  
**Ledger Artifact:** `ai_service/ml/data/v2_acquisition/reports/acquisition_ledger.json`

---

## 1. Executive Summary
This report documents the autonomous discovery, query, and sampling of public NLP, document intelligence, and entity matching datasets evaluated for the **Form2Fact Model V2** Pairwise Field Mismatch Classification upgrade.

A total of 11 candidate datasets across 3 functional groups were investigated programmatically via Hugging Face Hub APIs, GitHub raw endpoints, and official research sites.

---

## 2. Public Dataset Discovery & Access Audit

| Group | Source Identifier | Name | Protocol / URL | Status | Inspection Finding |
|:---|:---|:---|:---|:---|:---|
| **Group A: Semantic & NLI** | `snli` | Stanford Natural Language Inference | `stanfordnlp/snli` via Hugging Face | **SUCCESS** | Inspected 200 samples. Fields: `['premise', 'hypothesis', 'label']`. Labels: `entailment (0)`, `neutral (1)`, `contradiction (2)`. |
| **Group A: Semantic & NLI** | `multi_nli` | Multi-Genre NLI | `nyu-mll/multi_nli` via Hugging Face | **SUCCESS** | Inspected 200 samples across multiple genres. Fields include `pairID`, `premise`, `hypothesis`, `genre`, `label`. |
| **Group A: Semantic & NLI** | `fever` | Fact Extraction and VERification | `fever/fever` via Hugging Face | **RESTRICTED / SCRIPT DEPRECATED** | Hugging Face 5.x rejected legacy dataset execution script `fever.py`. Direct research archive download required for full text dumps. |
| **Group B: Document & OCR** | `funsd` | Form Understanding in Noisy Scanned Documents | `nielsr/funsd` via Hugging Face | **SUCCESS** | Inspected 149 annotated document samples. Fields: `['bboxes', 'id', 'image', 'ner_tags', 'words']`. Non-pairwise document layout dataset. |
| **Group B: Document & OCR** | `docvqa` | Document Visual Question Answering | `vidore/docvqa_train` via Hugging Face | **SUCCESS** | Inspected 200 samples. Fields: `['query', 'answer', 'image', 'source']`. Question-answering over document images. |
| **Group B: Document & OCR** | `xfund` | Multilingual Form Understanding | `nielsr/xfund` via Hugging Face | **UNAVAILABLE ON HF HUB** | Hub repository alias missing; official mirror hosted on GitHub (`github.com/doc-analysis/XFUND`). |
| **Group B: Document & OCR** | `sroie` | ICDAR 2019 Receipt OCR & Key Info | `github.com/zzzDavid/ICDAR-2019-SROIE` | **SUCCESS** | Direct HTTP 200 check confirmed repository availability (258KB manifest). |
| **Group B: Document & OCR** | `cord` | Consolidated Receipt Dataset | `naver-clova-ix/cord-v2` via Hugging Face | **SUCCESS** | Inspected 200 samples. Fields: `['ground_truth', 'image']`. Key-value receipt extraction. |
| **Group C: Entity Matching** | `deepmatcher` | DeepMatcher Entity Matching Benchmark | `raw.githubusercontent.com/.../Datasets.md` | **SUCCESS** | Verified public manifest containing attribute-level entity matching benchmarks. |
| **Group C: Entity Matching** | `wdc_products` | Web Data Commons Product Matching | `webdatacommons.org/largescaleproductcorpus/` | **SUCCESS** | Verified endpoint access (73KB index). Structured entity match pairs. |
| **Group C: Entity Matching** | `opensanctions` | OpenSanctions Entity Pairs | `sanctions-er-anon/opensanctions_pairs` | **GATED DATASET** | **User Action Required for Public Hub:** Repository is gated and requires user token authorization on Hugging Face. |

---

## 3. Autonomous Discovery Key Takeaways
1. **Public NLI Datasets (SNLI, MultiNLI)** provide rich, diverse sentence-level entailment and contradiction patterns, but cannot be naively mapped 1:1 to Form2Fact regulatory mismatch without checking field semantic comparability.
2. **Document Understanding Datasets (FUNSD, DocVQA, CORD)** are single-document token/layout datasets. They are ideal for OCR extraction training (Person 3), but do not contain pairwise cross-document contradiction labels.
3. **Entity Matching Datasets (DeepMatcher, Splink)** represent entity resolution (same vs different entity). In regulatory scrutiny, different entities are often `NOT_COMPARABLE` (or `UNCERTAIN` for spelling variants), rather than confirmed fraud.
