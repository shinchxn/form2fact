# Form2Fact V2 SNLI External Dataset Mapping & Domain Integrity Review

**Document ID:** `FORM2FACT-ML-V2-SNLI-001`  
**Date:** November 2026  
**Auditor Role:** Senior NLP Research Engineer, Dataset Quality Auditor  
**Dataset Reviewed:** Stanford Natural Language Inference (SNLI) Sample ($N=200$)  
**License:** Creative Commons Attribution-ShareAlike 4.0 International (CC-BY-SA 4.0)

---

## 1. Executive Summary & Acquisition Context

During the Model V2 data acquisition phase, 200 candidate pairs were extracted from the public Stanford Natural Language Inference (SNLI) corpus to test whether incorporating open-source linguistic pairs would improve pairwise classification robustness.

This review conducts a forensic analysis of the label mapping rationale, identifies structural domain mismatches between generic textual entailment and regulatory document cross-verification, evaluates experimental evidence from controlled training (Experiment E2 vs E3), and provides formal guidance on external dataset utilization.

---

## 2. Label Mapping Rationale & Formulation

The SNLI dataset evaluates generic semantic relationships between premise-hypothesis sentence pairs under three classes: `entailment`, `contradiction`, and `neutral`. The V2 acquisition pipeline applied the following mapping rules:

| Original SNLI Class | Mapped Form2Fact Class | Sample Count | Mapping Logic & Semantic Assumption |
| :--- | :--- | :--- | :--- |
| **entailment** | **MATCH** | 101 | If statement A logically entails statement B, the underlying assertion is concordant. |
| **contradiction** | **MISMATCH** | 99 | If statement A directly contradicts statement B, an factual discrepancy exists. |
| **neutral** | *Excluded* | 0 | Neutral pairs contain insufficient mutual information, creating high confusion with `UNCERTAIN` or `NOT_COMPARABLE`. Safely excluded. |

---

## 3. Forensic Domain Comparison: Linguistic vs Regulatory Truth

A critical divergence exists between linguistic entailment and institutional regulatory cross-verification. Regulatory verification is strictly entity- and number-sensitive, whereas natural language inference operates on broad situational semantics.

### 3.1 Comparative Exemplars

#### Exemplar A: Negation & Contradiction
- **SNLI Contradiction:**  
  *Premise:* "A young man kicks a soccer ball across the grass."  
  *Hypothesis:* "A man is sleeping on a bench."  
  *Nature:* Total situational incompatibility. High lexical distance, disjoint subjects/actions.
- **Form2Fact Regulatory Mismatch:**  
  *Document 1 (Approval Letter):* "Sanctioned Intake Capacity: 60"  
  *Document 2 (Affidavit):* "Sanctioned Intake Capacity: 120"  
  *Nature:* 95% lexical overlap, identical semantic frame, identical vector direction, but **a critical regulatory violation**.

#### Exemplar B: Equivalence & Paraphrasing
- **SNLI Entailment:**  
  *Premise:* "Two women are embracing each other on the beach."  
  *Hypothesis:* "Two women are hugging outside."  
  *Nature:* Synonymous vocabulary ("embracing" $\leftrightarrow$ "hugging", "beach" $\subset$ "outside").
- **Form2Fact Regulatory Match:**  
  *Document 1 (AICTE Form):* "B.Tech Computer Science & Engineering - AICTE ID: 1-12345"  
  *Document 2 (Affiliation Letter):* "Bachelor of Technology in CSE (Permanent Affiliation) Ref #1-12345"  
  *Nature:* Acronym expansions, institutional code matching, and regulatory clause equivalence.

---

## 4. Risks & Failure Modes of Generic NLI in Regulatory Intelligence

1. **Numerical Blindness in Semantic Space:**  
   Sentence transformer embeddings (`all-MiniLM-L6-v2`) map sentences with single-digit differences ("Intake: 60" vs "Intake: 120") to cosine similarities $> 0.96$. Training on SNLI encourages the linear head to trust general semantic similarity rather than penalizing numerical discrepancies.
2. **Tabular Feature Corruption:**  
   Form2Fact utilizes 8 tabular alignment features (e.g. numeric equality, length ratios, Jaro-Winkler). When applied to conversational SNLI sentences (e.g. "A person wearing a hat rides a bicycle"), numerical features evaluate to 0.0 or NaN, introducing spurious noise into tabular alignment feature weights.
3. **Legal & Institutional Ambiguity:**  
   Regulatory cross-verification requires strict adherence to legal norms. A premise and hypothesis in SNLI that are considered "contradictory" may not meet the legal threshold of institutional fraud or reporting deficiency.

---

## 5. Experimental Findings from Controlled Training

During controlled training experiments on the unified benchmark:

- **Experiment E1 (Pure V1 Baseline):** Suffered from small sample size (F1 Macro = 0.5366).
- **Experiment E2 (V1 + V2 Domain Synthetic + 200 SNLI pairs):**  
  Achieved 97.56% accuracy on the test benchmark, but feature importance analysis revealed attenuation of numeric mismatch weights ($w_{\text{num\_diff}}$ decreased by $32\%$).
- **Experiment E3 (V1 + V2 Domain Synthetic ONLY - Champion):**  
  Maintained identical 97.56% accuracy and 100.0% precision on MISMATCH, while preserving strong numeric feature separation and better calibrated decision boundaries.

**Conclusion:** SNLI pairs provided lexical variety but degraded tabular signal sharpness.

---

## 6. Recommendations for Future External Dataset Acquisition

1. **Deprecate Generic NLI:** Exclude SNLI and MultiNLI from core regulatory classifier training.
2. **Prioritize Open Institutional & Government Datasets:**
   - **AISHE (All India Survey on Higher Education):** Public institutional registries with real university names, addresses, and program codes.
   - **AICTE Public Approval Handbooks:** Historical public tables of approved institutes and course intake quotas.
   - **EDGAR / SEC 10-K Filings:** Public financial disclosure tables with audited corporate entities and verified tabular disclosures.
3. **Mandatory Domain Annotation Protocol:** Any external dataset must undergo domain-specific tabular feature alignment prior to ingestion into the Form2Fact pipeline.

