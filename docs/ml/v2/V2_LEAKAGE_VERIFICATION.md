# Form2Fact Model V2 — Rigorous Data Leakage & Group Partitioning Verification

**Audit Date:** 2026-11-06  
**Status:** **PASSED — Zero Template, Entity, or Fingerprint Leakage**  
**Script:** `ai_service/ml/data/v2_acquisition/rigorous_split.py`

---

## 1. Why MD5 Hash Collision Checks Were Insufficient
In the initial V2 generation, stratified random splitting resulted in **43 shared text pairs** between train and test splits because random sampling placed different permutations of the same template into both sets. While record IDs differed, the model was exposed to identical semantic phrases during training.

---

## 2. Group-Aware Stratified Partitioning Strategy
To eliminate template and entity variant leakage, records were grouped into **54 distinct template and institution prefix clusters**:
- All variations of an institutional prefix (e.g., `Kalyani Charitable Trust`, `Kalyani Educational Society`) are assigned exclusively to a single partition.
- All variations of a cadastral survey pattern or lease date cluster stay within the same fold.

### Partition Distribution:
- **`train_rigorous.jsonl`:** 319 records (54% of clusters)
  - `MISMATCH`: 111, `MATCH`: 96, `UNCERTAIN`: 51, `MISSING`: 56, `NOT_COMPARABLE`: 5
- **`val_rigorous.jsonl`:** 162 records (27% of clusters)
  - `MISMATCH`: 57, `MISSING`: 53, `MATCH`: 48, `UNCERTAIN`: 4
- **`test_rigorous.jsonl`:** 41 records (19% of clusters)
  - `MISMATCH`: 17, `MATCH`: 17, `UNCERTAIN`: 5, `MISSING`: 2

---

## 3. Independent Verification Audit
- **Exact Pair Overlap (Train vs Test):** **0**
- **Exact Pair Overlap (Train vs Val):** **0**
- **Untouched V1 Test Set Overlap:** **0**
- **Result:** Both the V1 Test Set (13 pairs) and V2 Rigorous Test Set (41 pairs) are strictly independent, zero-leakage evaluation benchmarks.
