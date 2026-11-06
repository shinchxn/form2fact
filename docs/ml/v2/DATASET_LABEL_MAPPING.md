# Form2Fact Model V2 — External-to-Canonical Label Mapping Policy

This specification outlines the defensible label mapping rules between acquired external datasets and Form2Fact's 5-class pairwise taxonomy.

---

## 1. Mapping Boundary Matrix

| Source Corpus | Source Label | Mapped Target Label | Defensible? | Transformation Condition & Verification Rationale |
|:---|:---|:---|:---:|:---|
| **SNLI / MultiNLI** | `entailment (0)` | **`MATCH`** | **YES (Filtered)** | Permitted only when claim and evidence describe the same entity/attribute with mutual factual entailment. Must pass semantic compatibility check. |
| **SNLI / MultiNLI** | `contradiction (2)` | **`MISMATCH`** | **YES (Filtered)** | Permitted only when the contradiction concerns mutually exclusive values of the same regulatory attribute. Excludes multi-period differences. |
| **SNLI / MultiNLI** | `neutral (1)` | **DO NOT MAP** | **NO** | `neutral` signifies insufficient information in the premise; it cannot be naively equated to `UNCERTAIN` or `NOT_COMPARABLE`. Retained as auxiliary auxiliary representation only. |
| **FEVER** | `SUPPORTS` | **`MATCH`** | **YES (Filtered)** | The documentary evidence factually proves the declared institutional claim. |
| **FEVER** | `REFUTES` | **`MISMATCH`** | **YES (Filtered)** | The documentary evidence factually disproves the declared institutional claim. |
| **FEVER** | `NOT ENOUGH INFO` | **`UNCERTAIN`** | **YES (Conditional)** | Borderline evidence where claim cannot be confirmed or refuted routes to officer adjudication. |
| **DeepMatcher / WDC** | `1 (Match)` | **`MATCH`** | **YES** | Sponsoring entity / institution names concordant across spelling variations. |
| **DeepMatcher / WDC** | `0 (Non-Match)` | **`NOT_COMPARABLE` or `UNCERTAIN`** | **CAUTIOUS** | Two different products/entities are NOT necessarily fraudulent regulatory contradictions. Must be treated as `NOT_COMPARABLE` unless applicant claims identity. |
| **Document Corpora (FUNSD/CORD)** | Null extraction | **`MISSING`** | **YES** | Mandatory document or field completely omitted from docket. |
| **Document Corpora (FUNSD/CORD)** | OCR noise text | **`UNCERTAIN`** | **YES** | Heavy OCR corruption karakter noise strictly routes to human review. |
