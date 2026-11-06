# Form2Fact — Dataset Split & Data Leakage Verification Report

**Date:** 2026-11-06  
**Auditor:** Person 8 (ML Systems Engineer)  
**Status:** PASSED (Zero Cross-Split Contamination)

---

## 1. Split Strategy & Deterministic Seed
- **Random Seed:** `42` (Fixed pseudo-random seed in `prepare_dataset.py`)
- **Partition Ratio:** 70% Train (47), 15% Validation (10), 15% Test (13)
- **Method:** Stratified by 5-class target label to guarantee uniform coverage of low-frequency classes (`MISSING`, `UNCERTAIN`, `NOT_COMPARABLE`).

## 2. Leakage Verification Checks
1. **Exact Hash Collision:**
   - Every record's MD5 fingerprint (`field_name + claim_raw + evidence_raw + label`) was checked across train, validation, and test splits.
   - **Result:** 0 collisions detected across split boundaries.
2. **Entity / Institution Isolation:**
   - Synthetic institution variants (e.g. `Pragati Education Society`) are restricted to distinct evaluation scenarios without sharing identical text fragments in test sets.
3. **No Target Leakage in Feature Vectors:**
   - Model input text construction strictly encapsulates claim text, evidence text, document types, and field hints. No ground truth labels or evaluation engine return codes are present in the model text feature string.

