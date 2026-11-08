# FORM2FACT — V3 SECONDARY DOCUMENT INTELLIGENCE DATASET LICENCE AUDIT

**Document ID:** `AUDIT-V3-DOC-LICENCE-01`  
**Date:** November 7, 2026  
**Auditor Roles:** Data Governance Auditor, ML Research Engineer, Legal IP Specialist  
**Branch:** `feature/ml-pairwise-classifier-v3`  

---

## 1. EXECUTIVE SUMMARY

In addition to pure natural language inference (NLI) corpora, five prominent document intelligence and optical character recognition (OCR) datasets were evaluated for potential integration into Form2Fact V3:
1. **SROIE** (ICDAR 2019 Receipt OCR & Key Information Extraction)
2. **CORD** (Consolidated Receipt Dataset for Post-OCR Parsing)
3. **DocVQA** (Document Visual Question Answering)
4. **FUNSD** (Form Understanding in Noisy Scanned Documents)
5. **XFUND** (Multilingual Form Understanding)

Each dataset was audited across four criteria:
- **Licence Terms & Commercial Compatibility:** Can derivative weights be distributed commercially without legal infringement?
- **Modalities Present:** Does the dataset contain raw images, noisy OCR text layers, bounding boxes, or clean structured text?
- **Pairwise Classification Alignment:** Does the dataset directly provide claim-vs-evidence pairs, or does it exclusively address upstream OCR / entity extraction?
- **Inclusion Recommendation:** Should the dataset be integrated into V3 pairwise training, restricted to upstream OCR benchmarking, or quarantined entirely?

---

## 2. SECONDARY DOCUMENT DATASET AUDIT MATRIX

| Dataset | Official Source / Repository | Official Licence | Commercial Usability | Modalities Contained | Task Alignment with Pairwise Classification | Recommendation |
| :--- | :--- | :--- | :---: | :--- | :--- | :---: |
| **SROIE** | ICDAR 2019 / `jsdnrs/ICDAR2019-SROIE` | CC BY 4.0 | **YES** | Scanned receipt images, text bounding boxes, key entity labels (`company`, `date`, `address`, `total`) | Upstream OCR & entity extraction only. Does not contain cross-document claim pairs. | **OCR BENCHMARK ONLY** |
| **CORD** | Clova AI / `naver-clova-ix/cord-v2` | CC BY-NC-ND 4.0 | **NO (Non-Commercial, No-Derivatives)** | Scanned receipt images, post-OCR text, hierarchical JSON semantic tags | Upstream post-OCR parsing. Does not provide discrepancy claim-evidence pairs. | **EXCLUDE FROM TRAINING** |
| **DocVQA** | CVL / `site.docvqa.org` / `vidore/docvqa_train` | CC BY 4.0 | **YES** | Document page images, question-answer text pairs, bounding boxes | Document QA. Can evaluate document reading comprehension, but not regulatory field concordance. | **UPSTREAM QA EVALUATION ONLY** |
| **FUNSD** | Guillaume Jaume et al. / `nielsr/funsd` | Non-Commercial Research Only | **NO (Academic Only)** | 199 scanned form pages, bounding boxes, entity linkage (`question` $\rightarrow$ `answer`) | Key-value linking on single forms. Does not span multi-document cross-verification. | **EXCLUDE FROM TRAINING** |
| **XFUND** | Microsoft Research / `doc-analysis/XFUND` | Microsoft Research Licence | **NO (Non-Commercial Research Only)** | Multilingual scanned forms across 7 languages, bounding boxes, entity pairs | Multilingual form understanding. Upstream OCR extraction. | **EXCLUDE FROM TRAINING** |

---

## 3. IN-DEPTH DATASET ANALYSIS

### 3.1 ICDAR 2019 SROIE
- **Source:** ICDAR 2019 Competition on Scanned Receipts OCR and Information Extraction (`jsdnrs/ICDAR2019-SROIE`).
- **Licence:** Creative Commons Attribution 4.0 International (`CC BY 4.0`).
- **Commercial Permissions:** Commercial use permitted with attribution.
- **Data Modalities:**
  - 1,000 scanned receipt images (JPEG/PNG).
  - Text bounding boxes with raw OCR text strings.
  - Four key extraction targets: `company`, `date`, `address`, `total`.
- **Task Fit:**
  - SROIE evaluates single-document entity extraction.
  - It does NOT contain pairwise comparisons (e.g. comparing an applicant's claimed company title against the receipt's registered title).
- **V3 Decision:** **RESERVE FOR UPSTREAM OCR BENCHMARKING**. Do not include in pairwise classifier training data. Usable for evaluating the robustness of Tesseract/Textract OCR extractors on degraded receipts.

---

### 3.2 CORD (Consolidated Receipt Dataset)
- **Source:** Naver Clova AI (`naver-clova-ix/cord-v2` / `github.com/clovaai/cord`).
- **Official Licence:** Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International (`CC BY-NC-ND 4.0`).
- **Commercial Permissions:** **STRICTLY PROHIBITED FOR COMMERCIAL USE**. Derivative model training violates the No-Derivatives clause if model weights are distributed.
- **Data Modalities:**
  - 1,000 Indonesian and English receipts.
  - Fine-grained hierarchical JSON schema (menu items, prices, tax, subtotal).
- **Task Fit:**
  - Key information extraction (KIE) within single receipts.
- **V3 Decision:** **STRICTLY EXCLUDE FROM MODEL TRAINING**. The `NC-ND` licence terms pose severe copyright and distribution liabilities.

---

### 3.3 DocVQA (Document Visual Question Answering)
- **Source:** Computer Vision Center (CVC) (`site.docvqa.org`).
- **Licence:** Creative Commons Attribution 4.0 (`CC BY 4.0`).
- **Commercial Permissions:** Permitted with attribution.
- **Data Modalities:**
  - 50,000+ visual document question-answer pairs over 12,000+ scanned document pages.
- **Task Fit:**
  - Given a document image and a question (e.g., "What is the date of the meeting?"), returns a text span answer.
  - This supports document querying, but is fundamentally distinct from pairwise discrepancy classification.
- **V3 Decision:** **EVALUATION RESOURCE FOR OCR QUERYING**. Not suitable for direct pairwise classifier training.

---

### 3.4 FUNSD (Form Understanding in Noisy Scanned Documents)
- **Source:** Guillaume Jaume et al. (`guillaumejaume.github.io/FUNSD/`).
- **Licence:** Proprietary Academic / Research Use Only.
- **Commercial Permissions:** **NON-COMMERCIAL ONLY**.
- **Data Modalities:**
  - 199 fully annotated scanned forms from the historical tobacco litigation document archives.
  - 31,485 words, 9,707 semantic entities, 5,304 key-value relational links.
- **Task Fit:**
  - Evaluates spatial form understanding (associating a label like "Name:" with a value like "John Doe").
- **V3 Decision:** **STRICTLY EXCLUDE FROM PRODUCTION WEIGHTS**. Non-commercial terms prohibit deployment in enterprise platforms.

---

### 3.5 XFUND (Multilingual Form Understanding)
- **Source:** Microsoft Research (`github.com/doc-analysis/XFUND`).
- **Licence:** Microsoft Research Licence Agreement (MSR-LA).
- **Commercial Permissions:** **NON-COMMERCIAL ACADEMIC RESEARCH ONLY**.
- **Data Modalities:**
  - Human-annotated forms in 7 languages (Chinese, Japanese, Spanish, French, Italian, German, Portuguese).
- **Task Fit:**
  - Upstream multilingual OCR extraction.
- **V3 Decision:** **STRICTLY EXCLUDE FROM MODEL TRAINING**. Non-commercial terms and lack of Indian vernacular language support (Hindi, Marathi, Tamil) make it irrelevant to AICTE regulatory objectives.

---

## 4. GOVERNANCE CONCLUSION & ARCHITECTURAL POLICY

1. **Zero Licence Contamination in V3 Production Weights:**
   - CORD, FUNSD, and XFUND are completely barred from the training pipeline.
   - Any model trained on non-commercial datasets must be partitioned into an isolated academic research branch and never deployed into the `production` runtime profile.
2. **Upstream vs Pairwise Decoupling:**
   - Single-document extraction datasets (SROIE, DocVQA) must NOT be force-fit into the pairwise mismatch classification head.
   - Form2Fact's pairwise classifier is an evidence-first adjudicator operating on `(claim, evidence)` string pairs. Conflating token-level OCR bounding-box tasks with pairwise discrepancy reasoning degrades classification accuracy.

---
*Report certified by Data Governance Auditor & Legal IP Specialist.*
