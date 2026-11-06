# Form2Fact V2 Evaluation Integrity Audit & Provenance Forensic Ledger

**Document ID:** `FORM2FACT-ML-V2-AUDIT-001`  
**Date:** November 2026  
**Auditor Role:** Senior ML Research Engineer, Statistical Evaluation Specialist, NLP Engineer  
**Target Branch:** `feature/ml-pairwise-classifier-v2`  
**Evaluation Target:** Model V2 Champion (`form2fact-hybrid-pairwise-v2.0-champion`)

---

## 1. Executive Summary & Objective

The objective of this forensic audit is to establish uncompromising statistical integrity, data provenance, and evaluation hygiene for the Form2Fact Pairwise Field Mismatch Classification Model V2.

In regulatory compliance contexts such as AICTE institutional approvals, unverified claims of high accuracy on synthetic or non-independent test data pose severe operational and legal risks. This audit:
1. Reclassifies benchmark datasets based on usage history.
2. Discloses exact dataset provenance down to the template level.
3. Quantifies data duplication and leakage risks.
4. Enforces strict scientific standards prior to release recommendation.

---

## 2. Test Set Independence & Benchmark Reclassification

### 2.1 Audit of the 41-Record Test Benchmark (`test_rigorous.jsonl`)
In earlier development iterations, the 41-pair dataset at `ai_service/ml/data/v2_acquisition/splits/test_rigorous.jsonl` was reported as an untouched, independent test set. 

**Forensic Finding:**  
During the controlled training of experiments E0, E1, E2, and E3, this 41-pair set was evaluated iteratively across multiple architecture configurations, hyperparameter sweeps, and threshold tuning. Under standard statistical learning principles, repeated evaluation on a fixed dataset invalidates its status as a pristine, out-of-sample holdout.

**Formal Reclassification:**
- `ai_service/ml/data/v2_acquisition/splits/test_rigorous.jsonl` is formally reclassified as a **Rigorous Development / Model Selection Benchmark**.
- It remains an essential evaluation tool for tracking comparative progression (V1 vs V2), but its metrics must be reported as developmental validation rather than out-of-distribution field testing.
- The original V1 test split at `ai_service/ml/data/splits/test.jsonl` (13 records) remains preserved as an untouched historical baseline.

### 2.2 Leakage & Overlap Verification
A cryptographically verified string-hash audit was conducted between `train_rigorous.jsonl` (319 pairs) and `test_rigorous.jsonl` (41 pairs):
- **Exact Pair Match Leakage:** 0 pairs (0.0%).
- **Cross-Split Text Duplication:** 0 pairs (0.0%).
- **Conclusion:** While structurally segregated with zero text overlap, the pairs were derived from the same synthetic generative distribution and template space. True out-of-distribution generalization requires real-world institutional documents.

---

## 3. Dataset Provenance Forensic Breakdown

The table below provides a forensic breakdown of all data assets present in `ai_service/ml/data/` and `ai_service/ml/data/v2_acquisition/`:

| Dataset Category | Record Count | Generation / Acquisition Method | Real Human-Verified? | License / Provenance |
| :--- | :--- | :--- | :--- | :--- |
| **Original V1 Records** | 70 | Handcrafted programmatic fixtures (`synthetic_data.py`) | **No (0%)** | Internal MIT |
| **Human-Annotated Real Records** | **0** | None collected or verified against real institutions | **No (0%)** | N/A |
| **V2 Synthetic Expansion** | 1,250 | Programmatic generation across 8 institutional templates | **No (0%)** | Internal MIT |
| ↳ *Unique Value Combinations* | 452 | Distinct semantic/tabular property assertions | No | Internal MIT |
| ↳ *Permutation Duplicates* | 798 | Prefix/suffix/casing permutations of base pairs | No | Internal MIT |
| **Unique Institutional Domain Pool** | 522 | Deduplicated distinct pairs across V1 + V2 synthetic pool | **No (0%)** | Internal MIT |
| **Public SNLI Candidates** | 200 | Sampled from Stanford Natural Language Inference corpus | Partially (Linguistic crowd-workers) | CC-BY-SA 4.0 |
| ↳ *Entailment $\to$ MATCH* | 101 | Linguistic sentence pairs mapped to regulatory MATCH | No (Linguistic only) | CC-BY-SA 4.0 |
| ↳ *Contradiction $\to$ MISMATCH* | 99 | Linguistic sentence pairs mapped to regulatory MISMATCH | No (Linguistic only) | CC-BY-SA 4.0 |
| **OCR-Degraded Perturbations** | 27 | Algorithmic character swaps, spacing, letter mutations | **No (0%)** | Internal MIT |
| ↳ *In V1 Baseline* | 2 | Hand-crafted typos ("Compter Scence", etc.) | No | Internal MIT |
| ↳ *In V2 Acquisition* | 25 | Synthetic OCR noise pipeline applied to domain pairs | No | Internal MIT |
| **Pending Review / Rejected** | 0 | All records verified by schema integrity validator | N/A | N/A |

### 3.1 Provenance Disclosure Statement
> **CRITICAL DISCLOSURE:**  
> Exactly **0 out of 1,320 records** in the Form2Fact ML corpus represent verified, human-annotated institutional filings from AICTE or any other regulatory body. The corpus consists entirely of algorithmically generated domain templates (95.1%) and mapped generic English inference sentences (4.9%).  
> All stakeholders must be informed that benchmark performance reflects synthetic structural concordance, not verified institutional field accuracy.

---

## 4. Class Distribution & Imbalance Audit

The distribution across the five core classification outcomes in the unified dataset is as follows:

| Class Taxonomy | Count (All Synthetic) | Percentage | Handling Strategy |
| :--- | :--- | :--- | :--- |
| **MATCH** | 682 | 51.6% | Downweighted via `class_weight='balanced'` |
| **MISMATCH** | 442 | 33.5% | Primary detection objective; high recall priority |
| **UNCERTAIN** | 98 | 7.4% | Preserved for borderline low-confidence outputs |
| **MISSING** | 68 | 5.2% | High lexical sparsity; rule-assisted feature boosting |
| **NOT_COMPARABLE** | 30 | 2.3% | Type mismatch detection; cross-entropy penalty |
| **Total** | **1,320** | **100.0%** | Full balanced loss compensation applied |

---

## 5. Summary & Governance Controls

1. **Model Qualification Status:** Approved for **Controlled Pilot / Human-in-the-Loop Shadow Mode ONLY**.
2. **Autonomous Adjudication Ban:** The model must **NEVER** be allowed to automatically reject or approve institutional applications without explicit human inspector sign-off.
3. **Audit Ledger Sign-Off:**
   - Test Independence: Reclassified as Development Validation.
   - Text Leakage: Verified 0.0% overlap.
   - Provenance Accounting: 100% accounted and documented.

