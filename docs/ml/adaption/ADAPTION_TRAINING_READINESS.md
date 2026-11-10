# FORM2FACT — ADAPTION TRAINING READINESS & DATASET SPECIFICATION

**Document Type:** Senior AI/ML Data Engineering Readiness & Adaptation Specification  
**Target Architecture:** Foundation LLM Domain Adaptation (SFT / Instruction Fine-Tuning) & Tabular Pairwise Classification  
**Auditor:** Senior AI/ML Data Engineer  
**Audit Date:** November 10, 2026  
**Repository Branch:** `main`  
**Governance Standard:** Zero-Fabrication, Strict Governance Separation, and Controlled Model Adaptation  

---

## 1. Executive Summary & Adaptation Readiness Verdict

| Dimension | Readiness Status | Defensible Evidence / Assessment |
|:---|:---:|:---|
| **Domain Data Alignment** | **HIGH** | 1,320 statutory AICTE pairs (520 deduplicated) covering 8 regulatory dimensions |
| **5-Class Taxonomy Coverage** | **COMPLETE** | Natively balances `MATCH`, `MISMATCH`, `MISSING`, `UNCERTAIN`, and `NOT_COMPARABLE` |
| **Explanatory Rationale Quality** | **HIGH** | 100% of domain records include evidence-grounded statutory reasoning strings |
| **Data Leakage Defense** | **VERIFIED** | Clean deduplication eliminates the 799 content collisions present in standard V2 |
| **Licensing Compliance** | **100% CLEAN** | MIT-licensed internal domain data; restricted CC BY-NC corpora quarantined |
| **Authentic Human Ground Truth** | **ZERO (0 Records)** | `gold_standard_human.jsonl` contains 0 bytes; bilateral pilot agreements pending |

### Final Adaptation Governance Verdict

```
========================================================================================
   ADAPTION TRAINING VERDICT:
   1. EXPLORATORY LLM DOMAIN ADAPTATION: READY (USING DEDUPLICATED SYNTHETIC CORPUS)
   2. STATUTORY PRODUCTION RELEASE TRAINING: STRICTLY BLOCKED (0 HUMAN GROUND TRUTH)
========================================================================================
```

**Scientific Clarification:**  
- **Approved Scope:** Fine-tuning an LLM (e.g. Qwen 3.8 27B, Llama 3, Mistral) for **reasoning pattern adaptation, evidence grounding, and statutory explanation generation** is technically feasible, scientifically defensible, and fully supported by the prepared Adaption exports.
- **Blocked Scope:** Training or updating production model weights for **autonomous regulatory certification, official approval/rejection, or V3 gold-standard deployment** remains strictly blocked until bilateral data agreements establish accredited human consensus data.

---

## 2. Task Suitability Matrix

We systematically evaluated Form2Fact's existing datasets against the six core statutory verification tasks:

| Verification Task | Primary Suitable Dataset | Record Count | Suitability Rating | Evaluation & Justification |
|:---|:---|:---:|:---:|:---|
| **1. Evidence-Grounded Explanation Generation** | `adaption_instructions_deduped.jsonl` | 520 | **EXCELLENT** | Pairs contain structured claim excerpts, documentary evidence, and an authoritative `reviewer_rationale` explaining statutory compliance or violation. |
| **2. Pairwise Field Comparison** | `adaption_structured_records.csv` | 1,320 | **EXCELLENT** | Provides structured tabular inputs (`claim_value`, `evidence_value`, `field_type`) enabling exact-match, Levenshtein, Jaro-Winkler, and numeric ratio training. |
| **3. Mismatch Reasoning** | V2 Expansion (Mismatch subset) | 353 (185 deduped) | **OUTSTANDING** | Models numerical deficits (e.g. land acreage deficit, intake seat discrepancy), expired lease tenure, and corporate entity divergence with explicit statutory rationales. |
| **4. Missing-Information Detection** | V2 Expansion (Missing subset) | 198 (111 deduped) | **STRONG** | Models scenarios where supporting annexures (Fire Safety NOC, Land Lease Deed) are omitted, conditioning the model to output `MISSING` rather than hallucinating evidence. |
| **5. Uncertainty & Abstention** | V2 Expansion (Uncertain subset) | 154 (60 deduped) | **STRONG** | Trains the model to abstain to `UNCERTAIN` when address phrasing is ambiguous or approval status is contradictory. |
| **6. OCR-Related Uncertainty Handling** | V2 Expansion (Degraded OCR subset)| 25 | **MODERATE** | Includes synthetic OCR corruption tags (e.g. `[OCR Degraded: ~~~???]`) and reduced confidence scores (0.40–0.70) teaching the model not to guess on unreadable text. |

---

## 3. Data Credibility & Synthetic Disclosure

Form2Fact maintains a strict classification of data credibility:

```
[Level 1: Authentic Human Ground Truth]  ───> Currently 0 Records (Strictly Frozen)
[Level 2: Synthetic Regulatory Domain]   ───> 1,320 Records / 520 Unique (Prepared for Adaption)
[Level 3: Public Benchmark Datasets]     ───> 570,000+ Records (Quarantined from Supervised Tuning)
[Level 4: Test & Rehearsal Fixtures]    ───> 80 Records in SQLite DB (Excluded from Training)
```

1. **Synthetic Data Disclosure (Level 2):**
   - The 1,320 Form2Fact domain candidate records were generated using statutory template slot-filling (`generate_v2_expansion.py`) based on the AICTE Approval Process Handbook (APH).
   - **Mandatory Policy:** Under no circumstances may this dataset be presented to academic institutions, regulators, or evaluators as human-reviewed ground truth. It is synthetic training data.
2. **Public Benchmarks (Level 3):**
   - SNLI, MultiNLI, FEVER, and AVeriTeC are general NLP datasets. Using them for supervised fine-tuning in a statutory legal domain introduces catastrophic domain shift and colloquial phrasing.
3. **Database Test Fixtures (Level 4):**
   - The 80 records in `data/form2fact.db` were created by automated unit and staging tests (`stagingOperationalRehearsal.test.ts`, `exportFirewallV3.test.ts`). They contain test institution names (*"No Document College"*, *"Single Review Institute"*) and must never contaminate training pipelines.

---

## 4. Label & Taxonomy Alignment Analysis

Form2Fact enforces a strict, mutually exclusive 5-class taxonomy:
$$\mathcal{Y} = \{\text{MATCH}, \text{MISMATCH}, \text{MISSING}, \text{UNCERTAIN}, \text{NOT\_COMPARABLE}\}$$

### Rejection of External Label Coercion
Attempts to map external public benchmarks into Form2Fact's taxonomy introduce critical semantic distortions:
- **`neutral` in NLI:** Signifies that the premise does not provide sufficient logical entailment to prove the hypothesis (e.g. *"The dog is barking"* vs *"The dog is brown"*). In regulatory compliance, this is **NOT** equivalent to `UNCERTAIN` (which indicates degraded or ambiguous data) nor `NOT_COMPARABLE` (which indicates conceptual category mismatch).
- **`contradiction` in NLI:** Sentence-level contradictions (e.g. *"A man sleeping"* vs *"A man running"*) lack the quantitative boundary conditions of regulatory mismatches (e.g. 29-year lease tenure failing a 30-year minimum requirement).
- **`SUPPORTS` / `REFUTES` in FEVER:** Designed for open-domain Wikipedia trivia, lacking structured institutional field extraction.

**Conclusion:** All external public benchmark corpora are excluded from supervised Adaption exports. Original labels and source provenance are preserved intact.

---

## 5. Recommended Training Objectives

For adapting foundation models to Form2Fact institutional scrutiny:

### 5.1 Objective 1: Instruction Fine-Tuning (SFT) for Evidence-Grounded Reasoning
- **Target Model:** BharatCode Qwen 3.8 27B or equivalent open-weights LLM.
- **Dataset:** `ai_service/ml/data/adaption/adaption_instructions_deduped.jsonl` (520 examples).
- **Training Method:** Parameter-Efficient Fine-Tuning (PEFT / QLoRA):
  - Rank ($r$): 16, Alpha ($\alpha$): 32, Dropout: 0.05.
  - Target Modules: `q_proj`, `v_proj`, `k_proj`, `o_proj`, `gate_proj`, `up_proj`, `down_proj`.
  - Context Length: 2,048 tokens.
  - Learning Rate: $2 \times 10^{-4}$ with cosine decay.
- **Supervision Target:** Model is trained to generate:
  1. Authoritative classification label matching input.
  2. Concise 1–2 sentence finding summary.
  3. Grounded clause reasoning citing statutory norms.
  4. Explicit uncertainty declaration when evidence is degraded or absent.

### 5.2 Objective 2: Tabular Pairwise Classifier Re-Estimation (Optional)
- **Target Model:** HistGradientBoosting / XGBoost classifier head (`classifier_head.py`).
- **Dataset:** `ai_service/ml/data/adaption/adaption_structured_records.csv` (1,320 records).
- **Feature Set:** Exact match flag, Jaro-Winkler similarity, Levenshtein distance, numerical ratio, date difference in days, token overlap coefficient, and field-type one-hot embeddings.

---

## 6. Exported File Paths, Schemas & Cryptographic Verification

All Adaption exports were generated in `ai_service/ml/data/adaption/`:

```
ai_service/ml/data/adaption/
├── adaption_dataset_manifest.json          # Cryptographic provenance manifest
├── adaption_instructions_deduped.jsonl     # 520 clean, unique SFT examples (Recommended)
├── adaption_instructions_full.jsonl        # 1,320 full SFT examples
└── adaption_structured_records.csv         # 1,320 flat tabular records
```

### 6.1 Cryptographic Checksums & Record Counts

| File Name | Format | Record Count | File Size (Bytes) | SHA-256 Checksum |
|:---|:---:|---:|---:|:---|
| `adaption_instructions_deduped.jsonl` | JSONL | **520** | 1,200,109 | `06cfa74d826b7b11c4db33b298eb8f342c56e6dae31518647295912c48c2af3b` |
| `adaption_instructions_full.jsonl` | JSONL | **1,320** | 3,105,970 | `7d8d37dee23838a52ec23379216354bd90ddafab3e8c8a67604cff44ec5a8788` |
| `adaption_structured_records.csv` | CSV | **1,320** | 565,697 | `a27e87938cc1e0ac23d9d199f56704d607363f08c734e2676096c11478dbac29` |
| `adaption_dataset_manifest.json` | JSON | — | 4,331 | *(Manifest metadata file)* |

### 6.2 Instruction JSONL Schema
Compatible with Hugging Face `trl` (`SFTTrainer`), Axolotl, and OpenAI Fine-Tuning:
```json
{
  "id": "v2-pair-01000",
  "instruction": "You are an evidence-grounded institutional scrutiny verification assistant...",
  "input": "Domain: AICTE\nStatutory Category: Land Tenure & Lease Duration\nField: leaseExpiryDate (date)\nDeclared Claim: \"2053-03-31\" (Document: application_form)\nSupporting Evidence: \"2053-03-31\" (Document: land_lease_deed)",
  "output": "Label: MATCH\nClassification Context: MATCH\nReasoning: Concordant registered lease expiry date meeting statutory 30-year unencumbered tenure.\nRequires Human Review: false",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "metadata": {
    "domain": "aicte",
    "category": "Land Tenure & Lease Duration",
    "field_name": "leaseExpiryDate",
    "field_type": "date",
    "label": "MATCH",
    "is_synthetic": true,
    "data_origin": "v2_synthetic_expansion"
  }
}
```

---

## 7. Excluded Datasets & Detailed Exclusion Rationale

| Excluded Dataset | File Location | Record Count | Exclusion Rationale |
|:---|:---|---:|:---|
| **SNLI Mapped Candidates** | `v2_acquisition/processed/snli_mapped_candidates.jsonl` | 200 | Flickr30k image captions; only 2 classes; lacks institutional document context. |
| **AVeriTeC Train & Dev** | `v3/raw/averitec/data/*.json` | 3,568 | Restricted under **CC BY-NC 4.0** (commercial use prohibited); general web fact-checking. |
| **FEVER Shared Task Dev** | `v3/raw/fever/shared_task_dev.jsonl` | 19,998 | Wikipedia entity claims; cannot be mapped into 5-class statutory regulatory compliance. |
| **MultiNLI Parquets** | `v3/raw/multinli/*.parquet` | 19,647 | Non-domain genre NLI; neutral cannot equate to UNCERTAIN or NOT_COMPARABLE. |
| **SNLI Parquets** | `v3/raw/snli/*.parquet` | 570,152 | Generic sentence pairs; colloquial speech; severe negative domain transfer. |
| **SQLite Application DB** | `data/form2fact.db` | 80 records | Automated CI test fixtures and staging rehearsal dockets (*"No Document College"*, *"Single Review Institute"*). |

---

## 8. Final Governance Checklist & Instructions

- [x] **Zero Code Changes:** No application files (`server/`, `src/`, `ai_service/app/`) were altered.
- [x] **Zero Production Dataset Tampering:** `form2fact_pairwise_dataset.jsonl`, `form2fact_v2_domain_expansion.jsonl`, and `gold_standard_human.jsonl` remain untouched.
- [x] **Zero Training Initiated:** No model weights, optimizer states, or fine-tuning runs have been executed.
- [x] **Zero Commits or Pushes:** Repository remains strictly unmodified; new exports and documentation reside locally awaiting authorization.
- [x] **Transparent Synthetic Disclosure:** All exports carry explicit `is_synthetic: true` metadata.
- [x] **Deduplication Complete:** 520 clean, unique pairs isolated to protect against LLM memorization.

**Summary for Engineering Leadership:**  
The Form2Fact project datasets have been thoroughly audited, categorized, and exported into production-ready instruction and tabular formats. The deduplicated dataset (`adaption_instructions_deduped.jsonl`) provides an ideal foundation for domain adaptation and reasoning fine-tuning of Qwen 3.8 27B.

