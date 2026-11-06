# Form2Fact V2 Probability Calibration & Abstention Analysis Report

**Document ID:** `FORM2FACT-ML-V2-CALIB-001`  
**Date:** November 2026  
**Auditor Role:** Senior ML Research Engineer, Statistical Evaluation Specialist  
**Evaluated Artifact:** `ai_service/ml/artifacts/v2/v2_champion_classifier_weights.pkl`  
**Calibrated Wrapper:** `ai_service/ml/artifacts/v2/v2_calibrated_classifier_weights.pkl`

---

## 1. Executive Summary & Calibration Rationale

In regulatory verification systems like Form2Fact, model probabilities cannot simply be treated as ranking scores; they represent formal confidence values that guide automated regulatory workflows. An uncalibrated, overconfident model that asserts 99.8% probability on a flawed comparison could lead to severe consequences:
1. **False Mismatch (Type I Error):** Wrongful rejection or penalization of an institution based on spurious discrepancy detection.
2. **False Match (Type II Error):** Overlooking actual fraudulent or non-compliant document submissions.

This report evaluates the probabilistic calibration of Model V2, computes formal calibration metrics (Brier Score, Log Loss, Expected Calibration Error), documents temperature scaling, and conducts an abstention threshold sweep to establish operational routing criteria.

---

## 2. Statistical Calibration Metrics & Baseline Evaluation

### 2.1 Metric Definitions
- **Multi-Class Brier Score:** Mean squared difference between predicted probability vectors and one-hot ground truth labels:
  $$\text{Brier} = \frac{1}{N} \sum_{i=1}^N \sum_{k=1}^K (p_{ik} - y_{ik})^2$$
  *(Lower is better; 0 indicates perfect calibration and accuracy).*
- **Multi-Class Log Loss (Cross-Entropy):** Epistemic penalty on probabilistic deviation:
  $$\text{LogLoss} = -\frac{1}{N} \sum_{i=1}^N \sum_{k=1}^K y_{ik} \ln(p_{ik})$$
- **Expected Calibration Error (ECE):** Weighted average difference between confidence and accuracy across 10 probability bins.

### 2.2 Calibration Results

Calibration parameters were fitted strictly on the independent validation split ($N=162$) to avoid test data contamination, followed by evaluation on both validation and development test benchmarks ($N=41$).

| Split / Model State | Sample Size | Brier Score | Log Loss | ECE (10 bins) | Calibration Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Validation Split (Raw V2 Champion)** | 162 | **0.0247** | **0.0553** | **0.0145** | Well-aligned |
| **Test Benchmark (Raw V2 Champion)** | 41 | **0.0299** | **0.0486** | **0.0169** | Well-aligned |
| **Test Benchmark (Calibrated, $T=1.8182$)** | 41 | **0.0393** | **0.0700** | **0.0257** | Moderated confidence |

### 2.3 Temperature Scaling Rationale
Fitting temperature scaling on the validation set produced an optimal temperature parameter:
$$T = 1.8182$$
Because $T > 1.0$, the raw Logistic Regression classifier head exhibited slight overconfidence in extreme probability values ($>0.99$). Applying temperature scaling dampens overconfident probabilities towards a more conservative epistemic distribution, preventing brittle high-confidence assertions on edge cases.

---

## 3. Abstention Threshold Sweep & Decision Trade-Offs

Form2Fact enforces an evidence-first architecture where the model is empowered to abstain (emit `UNCERTAIN`) whenever its maximum predicted probability falls below a defined confidence threshold $\tau$:
$$\text{If } \max_{k} P(y=k \mid x) < \tau \implies \hat{y} = \text{UNCERTAIN}$$

We executed a comprehensive threshold sweep across $\tau \in [0.50, 0.60, 0.70, 0.75, 0.80, 0.90]$ on the 41-pair benchmark:

### 3.1 Raw Model Threshold Sweep

| Threshold ($\tau$) | Coverage (%) | Accepted Accuracy (%) | MISMATCH Recall (%) | False Mismatch Rate (%) | Abstention (`UNCERTAIN`) Rate (%) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **0.50** | 100.0% | 97.56% | **100.0%** | **4.17%** | 0.0% |
| **0.60** | **95.12%** | **100.0%** | **94.12%** | **0.00%** | **4.88%** |
| **0.70** | 95.12% | 100.0% | 94.12% | 0.00% | 4.88% |
| **0.75** | 92.68% | 100.0% | 94.12% | 0.00% | 7.32% |
| **0.80** | 92.68% | 100.0% | 94.12% | 0.00% | 7.32% |
| **0.90** | 90.24% | 100.0% | 94.12% | 0.00% | 9.76% |

### 3.2 Calibrated Model Threshold Sweep ($T=1.8182$)

| Threshold ($\tau$) | Coverage (%) | Accepted Accuracy (%) | MISMATCH Recall (%) | False Mismatch Rate (%) | Abstention Rate (%) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **0.50** | 100.0% | 97.56% | 100.0% | 4.17% | 0.0% |
| **0.60** | 90.24% | 100.0% | 94.12% | 0.00% | 9.76% |
| **0.70** | 90.24% | 100.0% | 94.12% | 0.00% | 9.76% |
| **0.75** | 90.24% | 100.0% | 94.12% | 0.00% | 9.76% |
| **0.80** | 87.80% | 100.0% | 88.24% | 0.00% | 12.20% |
| **0.90** | 87.80% | 100.0% | 88.24% | 0.00% | 12.20% |

---

## 4. Key Findings & Analysis

1. **The Danger of $\tau = 0.50$:**  
   At $\tau = 0.50$, the system accepts all model classifications (100% coverage). However, this yields a **4.17% False Mismatch Rate**, directly violating regulatory due process by falsely tagging valid pairs as discrepancies.
2. **The "Sweet Spot" at $\tau = 0.60$ (Raw Model):**  
   Increasing the threshold to $0.60$ completely eliminates false mismatches (**0.00% False Mismatch Rate**) while maintaining **100.0% Accepted Accuracy** and **95.12% Coverage**. Only 2 borderline pairs (4.88%) are abstained and routed to human review.
3. **Calibrated Model Behavior:**  
   Under temperature scaling, probabilities are softer, which naturally causes higher abstention rates (9.76% at $\tau=0.60$). This is an ideal posture for risk-averse legal and regulatory deployments where manual audit capacity is high.

---

## 5. Formal Operational Recommendation

For production deployment in Form2Fact:

- **Default Operational Threshold:** **$\tau = 0.60$**
- **High-Stakes Regulatory Audits:** **$\tau = 0.75$**
- **Routing Invariant:**  
  When $\max P(c) < \tau$:
  - The API emits class `UNCERTAIN`.
  - The pair is tagged with `flag: REQUIRES_HUMAN_INSPECTION`.
  - The UI highlights the exact field coordinates and tabular discrepancy for human resolution.

