# Form2Fact — External Label Mapping & Transformation Policy

**Project:** Form2Fact — Evidence-First Institutional Document Intelligence  
**Document Purpose:** Explicit mapping rules and boundaries preventing unprincipled collapse or confusion of external labels with Form2Fact's 5-class pairwise taxonomy.  
**Author:** Person 8 (ML Systems Engineer)  

---

## 1. Regulatory Context & Core Taxonomy

Form2Fact enforces an exact 5-class classification taxonomy:
1. `MATCH`
2. `MISMATCH`
3. `MISSING`
4. `UNCERTAIN`
5. `NOT_COMPARABLE`

---

## 2. External Dataset Mapping Policies

### 2.1 Natural Language Inference (SNLI / MultiNLI)
External Labels: `entailment`, `contradiction`, `neutral`

| External Label | Mapped Target Label | Justification & Verification Policy | Restriction / Caveat |
|:---|:---|:---|:---|
| `entailment` | **`MATCH`** *(conditional)* | Permitted only when the claim and evidence describe the same entity/attribute with mutual factual entailment. | Requires normalized field comparability check before assignment. |
| `contradiction` | **`MISMATCH`** *(conditional)* | Permitted only when the contradiction concerns mutually exclusive values of the same regulatory attribute. | If contradictory values exist across different reporting periods or different parameters, it must NOT be labeled MISMATCH. |
| `neutral` | **DO NOT MAP AUTOMATICALLY** | **STRICT PROHIBITION:** `neutral` in NLI means truth cannot be determined from premise alone. It is NOT equivalent to `UNCERTAIN` (which signifies OCR corruption, ambiguity, or borderline confidence in regulatory proof) nor `NOT_COMPARABLE`. | Must undergo human review or rule-based comparability evaluation before inclusion. |

### 2.2 Record Linkage / Entity Matching (Splink / DeepMatcher / WDC)
External Labels: `match`, `non_match`

| External Label | Mapped Target Label | Justification & Policy |
|:---|:---|:---|
| `match` | **`MATCH`** | Entity strings refer to the same physical institution or sponsoring society despite orthographic variances. |
| `non_match` | **`NOT_COMPARABLE` or `UNCERTAIN`** | **CRITICAL:** A non-match in entity resolution merely means two records are different entities. In regulatory scrutiny, comparing an applicant with an unrelated entity is either `NOT_COMPARABLE` (wrong document linked) or `UNCERTAIN` (partial name overlap). It is ONLY a `MISMATCH` if the applicant falsely claims that entity is its sponsoring trust. |

### 2.3 Document QA / Information Extraction (DocVQA / SROIE / FUNSD)
External Indicators: `unanswerable`, `empty_field`

| External Indicator | Mapped Target Label | Justification & Policy |
|:---|:---|:---|
| `unanswerable` / null extraction | **`MISSING`** | Permitted as a training example for missing mandatory evidence docket items. |
| Low OCR confidence token | **`UNCERTAIN`** | Corrupted text layer or unreadable scans abstain to `UNCERTAIN`. |

