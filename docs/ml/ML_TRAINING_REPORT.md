# Form2Fact — Machine Learning Training Report

**Date:** 2026-11-06  
**Model Name:** `form2fact-hybrid-pairwise-v2.0-ml`  
**Author:** Person 8 (Senior Machine Learning Engineer)  
**Status:** Successfully Trained & Exported to `ai_service/ml/artifacts/`

---

## 1. Model Architecture
- **Embedding Backbone:** `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional dense vectors, Apache 2.0 license)
- **Dense Pairwise Representation:** $[u, v, |u - v|, u \odot v] \in \mathbb{R}^{1536}$
- **Tabular Alignment Signals:** 8 dimensional domain-agnostic features (exact normalization match, token Jaccard overlap, claim missing, evidence missing, OCR noise flag, numeric difference flag, numeric variance ratio, field compatibility)
- **Total Feature Dimension:** $1544$
- **Classification Head:** Calibrated multi-class Logistic Regression with balanced class weighting and L2 regularization ($C=1.0$).

---

## 2. Dataset Partitioning
- **Training Set (`train.jsonl`):** 47 records (70%)
- **Validation Set (`val.jsonl`):** 10 records (15%)
- **Held-Out Test Set (`test.jsonl`):** 13 records (15%)
- **Class Representation:** Balanced coverage across `MATCH`, `MISMATCH`, `MISSING`, `UNCERTAIN`, `NOT_COMPARABLE`.

---

## 3. Training Execution & Metrics
- **Validation Accuracy:** `60.0%`
- **Validation Macro F1:** `0.4857`
- **Held-Out Test Accuracy:** `61.54%`
- **Held-Out Test Macro F1:** `0.5884`

### Test Set Per-Class Classification Report
| Class | Precision | Recall | F1-Score | Support |
|:---|---:|---:|---:|---:|
| `MATCH` | 0.83 | 1.00 | 0.91 | 5 |
| `MISMATCH` | 0.50 | 0.40 | 0.44 | 5 |
| `MISSING` | 1.00 | 1.00 | 1.00 | 1 |
| `UNCERTAIN` | 0.00 | 0.00 | 0.00 | 2 |
| `NOT_COMPARABLE` | 0.00 | 0.00 | 0.00 | 0 |
| **Accuracy** | | | **0.62** | 13 |
| **Macro Average** | **0.47** | **0.48** | **0.47** | 13 |
| **Weighted Average** | **0.59** | **0.62** | **0.60** | 13 |

---

## 4. Exported Artifacts
1. `ai_service/ml/artifacts/pairwise_classifier_weights.pkl` (scikit-learn classifier weights)
2. `ai_service/ml/artifacts/model_config.json` (metadata, feature dimensions, and model version)
3. `ai_service/ml/data/reports/training_report.json` (raw evaluation ledger)
