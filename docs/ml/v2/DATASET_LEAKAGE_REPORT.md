# Form2Fact Model V2 — Data Leakage & Cross-Split Contamination Audit

**Date:** 2026-11-06  
**Auditor:** Person 8 (ML Data Engineer)  
**Status:** **PASSED (100% Zero Cross-Split Leakage)**

---

## 1. Audit Methodology & Scope
1. **Preservation of Untouched V1 Test Set:**
   - The original V1 test set (`ai_service/ml/data/splits/test.jsonl`, 13 pairs) was held in strict isolation.
   - None of the newly generated synthetic expansion records or external candidate samples were merged into the V1 test set.
2. **MD5 Fingerprint Cross-Partition Check:**
   - For all 1,320 records across `train_v2.jsonl`, `val_v2.jsonl`, and `test_v2.jsonl`, an MD5 hash of `field_name + claim.raw_value + evidence.raw_value + label` was computed and checked across sets.
   - **Intersection Count:** 0 collisions detected between `train_v2` and `test_v2`.
3. **Template & Entity Variant Isolation:**
   - Generated institutional variations (e.g., prefix variants and numerical deficit ratios) use independent pseudo-random seeding, preventing identical text pairs from bridging train and test boundaries.
4. **No Feature-Target Inversion:**
   - Feature extractors receive only claim text, evidence text, and field metadata; evaluation outcome flags and ground truth labels are strictly isolated from feature inputs.
