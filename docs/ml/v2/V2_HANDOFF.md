# Form2Fact Model V2 — Engineering Handoff & Pipeline Manual

---

## 1. Quick Reproduction Commands

### 1.1 Rediscover & Inspect Public Candidates
```bash
python ai_service/ml/data/v2_acquisition/acquire_datasets.py
```
- Contacts Hugging Face APIs and GitHub raw manifests.
- Extracts sample records and verifies schemas without downloading massive multi-gigabyte archives.
- Writes findings to `ai_service/ml/data/v2_acquisition/reports/acquisition_ledger.json`.

### 1.2 Generate V2 Domain Expansion Dataset
```bash
python ai_service/ml/data/v2_acquisition/generate_v2_expansion.py
```
- Creates 1,250 realistic, statutory field comparison records across 10 regulatory categories.

### 1.3 Build and Partition V2 Candidate Pool
```bash
python ai_service/ml/data/v2_acquisition/build_v2_dataset.py
```
- Merges untouched V1 baseline (70 pairs) with V2 expansion (1,250 pairs).
- Produces stratified `train_v2.jsonl` (921 pairs), `val_v2.jsonl` (195 pairs), and `test_v2.jsonl` (204 pairs).

---

## 2. Directory Structure Layout
```
ai_service/ml/data/v2_acquisition/
├── acquire_datasets.py        # Autonomous discovery & inspection script
├── generate_v2_expansion.py   # Domain-specific synthetic expansion engine
├── build_v2_dataset.py        # Integration, stratification & splitting script
├── inspected/
│   └── samples/              # Extracted samples (snli, multi_nli, funsd, docvqa, cord, etc.)
├── processed/
│   ├── form2fact_domain_candidates/
│   │   └── form2fact_v2_domain_expansion.jsonl (1,250 pairs)
│   ├── splits/
│   │   ├── train_v2.jsonl   (921 pairs)
│   │   ├── val_v2.jsonl     (195 pairs)
│   │   └── test_v2.jsonl    (204 pairs)
│   ├── form2fact_v2_candidate_pool.jsonl (1,320 pairs)
│   └── v2_dataset_meta.json
└── reports/
    └── acquisition_ledger.json
```

---

## 3. Team Responsibilities & Boundaries
- **Person 2 (Backend Security Lead):** The FastAPI integration endpoints remain fully backward-compatible with Node.js `PairwiseFieldClassifier`.
- **Person 3 (Document Intelligence & OCR):** The inspected document datasets (`funsd`, `cord`, `sroie`) provide verified references for OCR bounding-box modeling.
- **Person 4 (Regulatory Rules Lead):** V2 data expansion preserves statutory decoupling; models do not hardcode threshold math, leaving threshold evaluation to the rules engine.
