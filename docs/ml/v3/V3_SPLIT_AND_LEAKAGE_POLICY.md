# FORM2FACT — V3 DATA SPLITTING & LEAKAGE PREVENTION POLICY

**Document ID:** `POLICY-V3-LEAKAGE-SPLIT-01`  
**Date:** November 7, 2026  
**Auditor Roles:** Senior ML Research Engineer, Data Governance Auditor, MLOps Lead  
**Branch:** `feature/ml-pairwise-classifier-v3`  

---

## 1. PURPOSE & PRINCIPLES

In pairwise document intelligence platforms, naive random shuffling and splitting ($k$-fold cross-validation or random $80/10/10$ partitioning) results in severe **data leakage** and **over-optimistic generalization claims**. 

If records derived from the same underlying land deed, the same educational trust, or augmented lexical variants of identical cadastral plots are split across training and test sets:
1. The neural embedding backbone memorizes the entity names and token strings rather than learning statutory discrepancy reasoning.
2. Evaluation metrics report artificial $99\%+$ accuracy on test sets that fail catastrophically when presented with novel real-world institutional filings.

This policy establishes strict group-aware splitting rules and a tamper-evident test set isolation protocol for Form2Fact V3.

---

## 2. SOURCES OF DATA LEAKAGE IN REGULATORY PAIRWISE CLASSIFICATION

The following six leakage vectors are strictly prohibited during Form2Fact V3 partitioning:

| Leakage Vector | Description | Failure Mode If Leaked | Mandatory Splitting Defense |
| :--- | :--- | :--- | :--- |
| **1. Source Document Sharing** | Pairs extracted from page 2 and page 5 of the same registered lease deed placed into both train and test. | Model memorizes deed phrasing, typographical quirks, and stamp format. | **Group by `source_document_id`**. All pairs from a document must reside in the exact same split. |
| **2. Institution / Sponsoring Body Overlap** | Multiple applications from the same educational trust (`Aryabhata Welfare Society`) split between train and test. | Model memorizes specific trust names instead of learning entity concordance logic. | **Group by `institution_id` / `society_id`**. An institution appears in exactly one partition. |
| **3. Cadastral Survey Plot Overlap** | Adjoining parcels with similar survey numbers (`Survey No. 44/1`, `44/2`) from the same taluk divided across splits. | Memorization of regional survey numbering conventions. | **Group by cadastral plot cluster**. |
| **4. Claim Statement Reuse** | Identical claimed parameter text evaluated against different evidence snippets in different splits. | Model memorizes claim prior probabilities rather than evaluating evidence concordance. | **Group by `claim_hash`**. Identical claims cannot cross split boundaries. |
| **5. Augmentation Ancestry** | Synthetically perturbed variants (e.g. OCR-corrupted vs clean) of the same root pair placed in different splits. | The model evaluates on a direct permutation of a training instance. | **Group by `root_pair_id`**. All perturbations must reside with the parent. |
| **6. Regulatory Template Memorization** | Specific municipal building approval form layouts from a single state registry over-represented in test. | Failure to generalize across state directorates (e.g. Maharashtra vs Uttar Pradesh). | **Stratify by regional regulatory directorate**. |

---

## 3. THREE-TIER PARTITIONING ARCHITECTURE

Form2Fact V3 establishes three distinct dataset partitions:

```
[V3 Validated Candidate Pool]
              │
              ▼
   [Group-Aware Stratifier] ─── Grouped by (institution_id, document_id)
              │
      ┌───────┼───────┐
      │       │       │
      ▼       ▼       ▼
   [Train]  [Val]   [Test Benchmark]
   (70%)    (15%)   (15% Vaulted)
      │       │       │
      │       │       └── Accessible ONLY for one-time pre-release audit
      │       └────────── Used for early-stopping & Temperature Scaling (T)
      └────────────────── Used for model weight optimization
```

### 3.1 Training Set (Target: ~70%)
- **Purpose:** Classifier head training, dense embedding fine-tuning, tabular feature weighting.
- **Access:** Unrestricted during model development.

### 3.2 Validation Set (Target: ~15%)
- **Purpose:** Hyperparameter optimization, early-stopping checkpoint selection, probability calibration (fitting post-hoc temperature scaling parameter $T$).
- **Rule:** Never used for gradient updates.

### 3.3 Final Test Benchmark Split (Target: ~15%)
- **Purpose:** Objective, unbiased release-gate performance verification.
- **Vaulting Policy:**
  > [!IMPORTANT] Vaulted Test Set Rule
  > The V3 Final Test Benchmark is a **vaulted evaluation split**. It must NEVER be used for model selection, threshold sweeps, or iterative hyperparameter tuning. It may only be evaluated once during the formal release readiness audit.

---

## 4. FORMAL GROUP-AWARE SPLIT ALGORITHM

Let $\mathcal{D} = \{(\mathbf{x}_i, y_i, g_i)\}_{i=1}^N$ be the acquired dataset, where $g_i$ is the composite grouping identifier:
$$g_i = \text{SHA256}(\text{institution\_id} \oplus \text{source\_document\_id} \oplus \text{claim\_text})$$

Let $\mathcal{G} = \{g_1, g_2, \dots, g_K\}$ be the set of unique group keys ($K \le N$).

1. **Group Partitioning:**
   The unique groups $\mathcal{G}$ are partitioned into disjoint sets $\mathcal{G}_{\text{train}}, \mathcal{G}_{\text{val}}, \mathcal{G}_{\text{test}}$:
   $$\mathcal{G}_{\text{train}} \cap \mathcal{G}_{\text{val}} = \emptyset, \quad \mathcal{G}_{\text{train}} \cap \mathcal{G}_{\text{test}} = \emptyset, \quad \mathcal{G}_{\text{val}} \cap \mathcal{G}_{\text{test}} = \emptyset$$
2. **Class Distribution Stratification:**
   Partitions are formed using stratified group k-fold optimization to ensure each split closely matches the target 5-class distribution:
   $$\min_{\mathcal{G}} \sum_{s \in \{\text{train}, \text{val}, \text{test}\}} \sum_{c=1}^5 \left| P_s(y = c) - P_{\mathcal{D}}(y = c) \right|$$
3. **Leakage Verification:**
   Before any training commences, the split verification script must assert:
   $$\mathcal{G}_{\text{train}} \cap \mathcal{G}_{\text{val}} \cap \mathcal{G}_{\text{test}} \equiv \emptyset$$

---

## 5. SPLIT EXECUTION TIMELINE & STOP GATE

In strict compliance with repository release governance:
> **Do not generate or freeze final V3 splits until the complete candidate dataset pool (incorporating human-annotated institutional disclosures) is fully acquired and validated.**

Prematurely freezing splits over public NLP datasets (SNLI/FEVER) alone would recreate the exact limitation of V2. Splits will be generated by `ai_service/ml/data/v3/scripts/generate_v3_splits.py` only after the institutional data ingestion and annotation phase is complete.

---
*Policy certified by Senior ML Research Engineer, Data Governance Auditor & MLOps Lead.*
