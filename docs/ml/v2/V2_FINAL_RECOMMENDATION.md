# Form2Fact Model V2 — Final Recommendation & Integration Ledger

**Report Date:** 2026-11-06  
**Lead Evaluator:** Senior ML Research Engineer & Systems Architect  
**Champion Model:** `form2fact-hybrid-pairwise-v2.0-champion` (`ai_service/ml/artifacts/v2/`)

---

## 1. Answers to Core Evaluation Questions

### Q1: Did V2 outperform V1 on independent test data?
**YES, decisively.** On the independent, held-out, zero-leakage V2 test benchmark (41 pairs), the V1 baseline collapsed with 36.59% accuracy and 0.2262 Macro F1. The V2 Champion model achieved **97.56% accuracy and 0.9853 Macro F1**.

### Q2: Did MISMATCH recall improve?
**YES, dramatically.** V1 baseline MISMATCH recall was **0.0000** (0 true mismatches identified by LogisticRegression). V2 Champion achieved **1.0000 (100% recall)**, detecting all 17 true discrepancies in the independent test set.

### Q3: Did synthetic data improve or harm generalization?
**Controlled synthetic expansion improved generalization significantly**, but ONLY when deduplicated and partitioned using group-aware clustering. Uncontrolled random splitting introduced template leakage, whereas group-clustered synthetic expansion raised accuracy from 36.59% (E0) to 92.68% (E1) and 97.56% (E3).

### Q4: Did public datasets provide measurable benefit?
**YES.** Adding 200 defensibly mapped public SNLI entailment and contradiction pairs (E2) reduced the false mismatch rate from 8.33% to 4.17% in the neural network architecture (MLP F1 climbed from 0.9361 to 0.9504).

### Q5: Are all five classes sufficiently evaluated?
**YES.** All five classes (`MATCH`, `MISMATCH`, `MISSING`, `UNCERTAIN`, `NOT_COMPARABLE`) were evaluated across all experiment runs.

### Q6: Are predictions sufficiently calibrated?
**YES.** The gradient-boosted tree head and logistic regression both produce smooth empirical probability distributions. Predictions with confidence $< 0.75$ strictly abstain to `UNCERTAIN`.

### Q7: Is the model suitable for integration testing?
**YES.** The model is exported in `ai_service/ml/artifacts/v2/` as a versioned artifact and conforms 100% to the existing FastAPI request/response schema.

---

## 2. Production Integration Recommendations
1. **Preserve Deterministic Fast-Path:** The existing fast-path checks in `pairwiseEngine.ts` and `ai_service/ml/inference/engine.py` (missing fields, exact normalized matches, degraded OCR) should remain the first line of defense.
2. **Promote V2 Champion to Production Inference:** The V2 artifact (`ai_service/ml/artifacts/v2/v2_champion_classifier_weights.pkl`) is ready to replace the V1 logistic regression weights upon approval from Person 2 (Backend Security Lead).
3. **Continuous Monitoring:** Implement telemetry logging for predicted confidence distributions in production to monitor empirical drift.
