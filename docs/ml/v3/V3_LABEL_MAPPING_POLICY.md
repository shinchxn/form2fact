# FORM2FACT — V3 FIVE-CLASS LABEL GOVERNANCE & MAPPING POLICY

**Document ID:** `POLICY-V3-LABEL-GOVERNANCE-01`  
**Date:** November 7, 2026  
**Auditor Roles:** Senior ML Research Engineer, Taxonomy Specialist, Regulatory Legal Advisor  
**Branch:** `feature/ml-pairwise-classifier-v3`  

---

## 1. PURPOSE & PRINCIPLES

Form2Fact's pairwise classifier adjudicates concordance between an institutional claim and supporting statutory evidence using a strict **5-class closed taxonomy**:

```text
0: MATCH
1: MISMATCH
2: MISSING
3: UNCERTAIN
4: NOT_COMPARABLE
```

When integrating external public NLP corpora (such as SNLI, MultiNLI, AVeriTeC, and FEVER), naive 1-to-1 label translations (e.g. mapping `entailment` $\rightarrow$ `MATCH` or `contradiction` $\rightarrow$ `MISMATCH`) introduce severe semantic distortion. Natural language inference evaluates colloquial truth, whereas Form2Fact evaluates statutory regulatory concordance.

This policy establishes strict, defensible mapping standards to govern the translation of external training pairs into Form2Fact's canonical schema.

---

## 2. CANONICAL FIVE-CLASS TAXONOMY DEFINITION

| Label ID | Canonical Label | Precise Regulatory Semantic Definition | Acceptable Real-World Variations | Inadmissible Cases (Do NOT map here) |
| :---: | :--- | :--- | :--- | :--- |
| **0** | **`MATCH`** | The supporting evidence conclusively affirms the declared institutional parameter. | ISO dates matching natural language dates; standard institutional acronyms (`IIT` vs `Indian Institute of Technology`); acreage within $\pm 0.01$ acre rounding margin. | Partial matches with tenure deficits; names with commercial entity suffixes; missing deed clauses. |
| **1** | **`MISMATCH`** | The supporting evidence explicitly contradicts or fails the declared parameter or statutory norm. | Lease termination date earlier than declared; declared acreage 8.5 acres but deed proves 5.2 acres; sponsoring society title completely divergent from trust deed. | Missing document attachments; blurred text that cannot be read; incomparable parameter types. |
| **2** | **`MISSING`** | The supporting evidentiary document or mandatory parameter clause is completely absent from the submitted docket. | Fire Safety NOC not attached; registered deed missing Clause 4 tenure schedule; applicant omitted sponsoring society declaration. | Scanned documents that are attached but unreadable (must be `UNCERTAIN`). |
| **3** | **`UNCERTAIN`** | The evidence is degraded, noisy, OCR-corrupted, or linguistically ambiguous such that algorithmic confidence falls below statutory certainty ($\max P < 0.60$). | Heavily degraded photocopy where survey numbers are garbled (`Surv?y N0. 4#4/2`); address phrasing ambiguity where plot number is identical but locality naming diverges. | Clear, legible contradictions (must be `MISMATCH`); clean matches (must be `MATCH`). |
| **4** | **`NOT_COMPARABLE`** | The claim parameter and the evidentiary span belong to completely disjoint semantic dimensions and cannot be reconciled. | Attempting to compare institutional Land Area (acres) against a Fire Safety Building Height (meters); comparing Society Registration Number against Cadastral Survey Plot Number. | Contradictory values within the same domain (e.g., 5.0 acres vs 7.5 acres is `MISMATCH`, NOT `NOT_COMPARABLE`). |

---

## 3. EXTERNAL DATASET MAPPING SPECIFICATIONS

### 3.1 SNLI & MultiNLI Mapping Rules

Both SNLI and MultiNLI classify sentence pairs into three categories: `entailment`, `neutral`, `contradiction`.

| Source Label | Upstream Definition | Form2Fact Target Mapping | Governance Condition & Rationale | Training Eligibility |
| :--- | :--- | :---: | :--- | :---: |
| `entailment` (0) | Premise logically necessitates hypothesis. | **`MATCH`** (Conditional) | Allowed **only** if the hypothesis does not extrapolate beyond the premise and asserts a factual attribute. Premise: "A university campus with 10 acres of land." Hypothesis: "The institution possesses 10 acres." | **Eligible with semantic filtering** |
| `contradiction` (2)| Premise logically contradicts hypothesis. | **`MISMATCH`** (Conditional) | Allowed **only** if the contradiction represents a mutually exclusive factual claim rather than situational impossibility. | **Eligible with semantic filtering** |
| `neutral` (1) | Premise does not provide sufficient info to prove or disprove hypothesis. | **`UNCERTAIN`** | Upstream "neutral" denotes absence of definitive textual proof. In regulatory scrutiny, unprovable claims strictly route to human review as `UNCERTAIN`. | **Eligible as UNCERTAIN supervision** |

> [!WARNING] Prohibition on Automatic Supervised Ingestion
> Raw SNLI/MultiNLI pairs must NEVER be mapped in bulk into the supervised training split without running the candidate through the domain verification filter (`validate_v3_schema.py`). Ambiguous colloquial sentences (e.g., "A dog barking in a park") are restricted to pre-training embeddings and quarantined from fine-tuning the regulatory classifier head.

---

### 3.2 FEVER Mapping Rules

FEVER annotates claims against Wikipedia sentences into three classes: `SUPPORTS`, `REFUTES`, `NOT ENOUGH INFO`.

| Source Label | Form2Fact Target Mapping | Mandatory Governance Justification |
| :--- | :---: | :--- |
| `SUPPORTS` | **`MATCH`** | The Wikipedia passage provides direct textual evidence validating the factual claim. |
| `REFUTES` | **`MISMATCH`** | The Wikipedia passage contains explicit factual statements refuting the claim. |
| `NOT ENOUGH INFO` | **`UNCERTAIN`** | Evidence is insufficient to verify. Strictly mapped to `UNCERTAIN` (`requiresHumanReview = True`). Under no circumstance may `NOT ENOUGH INFO` be converted to `MISMATCH`. |

---

### 3.3 AVeriTeC Mapping Rules

AVeriTeC evaluates real-world web claims with multi-turn QA evidence and four veracity labels:

| AVeriTeC Label | Form2Fact Target Mapping | Governance Directive |
| :--- | :---: | :--- |
| `Supported` | **`MATCH`** | QA evidence conclusively confirms the claim proposition. |
| `Refuted` | **`MISMATCH`** | QA evidence demonstrates the claim is factually false or contrary to official findings. |
| `Not Enough Evidence` | **`UNCERTAIN`** | Direct evidence was absent or inconclusive from search retrieval. Mapped to `UNCERTAIN`. |
| `Conflicting Evidence / Alternative Explanation` | **`UNCERTAIN`** | Divergent evidence sources contradict each other. In statutory scrutiny, contradictory evidence requires officer adjudication. |

> [!NOTE] Licence Quarantine Notice
> AVeriTeC mappings are restricted to the **Research Benchmark Pool** (`ai_service/ml/data/v3/raw/averitec/`) due to its `CC BY-NC 4.0` licence. They must NOT be combined into commercial production weights.

---

## 4. GOVERNANCE ENFORCEMENT & PRESERVATION INVARIANTS

1. **Dual Label Preservation:**
   Every processed record in `ai_service/ml/data/v3/processed/` must preserve:
   - `comparison.source_label`: The verbatim upstream label (`entailment`, `SUPPORTS`, `Supported`).
   - `comparison.label`: The canonical Form2Fact label (`MATCH`, `MISMATCH`, etc.).
2. **Missing Evidence vs Missing Claim:**
   - If an applicant declared a parameter but uploaded no supporting document $\rightarrow$ `label: 'MISSING'`, `evidence.text: '[OMITTED_EVIDENCE]'`.
   - If an applicant omitted declaring a parameter required by handbook $\rightarrow$ Handled by the deterministic Rules Engine (`RULE-DOC-04`), not fabricated into a synthetic text pair.
3. **Rejection of Ambiguous Conversions:**
   Any training record where annotators cannot provide a unambiguous rationale is tagged `annotation_status: 'quarantined'` and excluded from model optimization.

---
*Policy certified by Senior ML Research Engineer, Taxonomy Specialist & Legal Advisor.*
