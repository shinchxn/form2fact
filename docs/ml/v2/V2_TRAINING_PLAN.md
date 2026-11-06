# Form2Fact Model V2 — Comprehensive Training & Experimentation Plan

This document establishes the experimental methodology for training and benchmarking Form2Fact Pairwise Classifier V2 using the expanded 1,320-record dataset pool.

---

## 1. Experimental Configurations

| Experiment ID | Training Dataset | Classifier Architecture | Feature Representation | Purpose |
|:---|:---|:---|:---|:---|
| **EXP-V2-01 (Baseline Reproduction)** | V1 Train (47 pairs) | Logistic Regression (L2, balanced) | MiniLM (1536 dim) + 8 Tabular | Baseline reproduction against V2 test set |
| **EXP-V2-02 (V2 Expanded Supervised)** | V2 Train (921 pairs) | Logistic Regression (L2, balanced) | MiniLM (1536 dim) + 8 Tabular | Measure data scaling impact with identical architecture |
| **EXP-V2-03 (V2 Multi-Layer Perceptron)** | V2 Train (921 pairs) | MLPClassifier (128, 64 relu) | MiniLM (1536 dim) + 8 Tabular | Evaluate non-linear pairwise interaction modeling |
| **EXP-V2-04 (Gradient Boosted Trees)** | V2 Train (921 pairs) | GradientBoostingClassifier / HistGB | MiniLM (1536 dim) + 8 Tabular | Evaluate tree-based tabular alignment performance |

---

## 2. Evaluation Protocol & Metrics
All experiments will be evaluated against the independent, held-out **V2 Test Set (`test_v2.jsonl`, 204 pairs)** using:
1. **Accuracy & Macro F1:** Primary classification metrics across all 5 classes.
2. **MISMATCH False Positive Rate:** Crucial metric — false mismatch accusations damage applicant institutions.
3. **MISSING Recall:** Must approach 100% (omitted required documents must be caught).
4. **Abstention Rate:** Proportion of low-confidence predictions routed to `UNCERTAIN` for human officer adjudication.
5. **Inference Latency:** Target < 45ms per pair on single CPU core.
