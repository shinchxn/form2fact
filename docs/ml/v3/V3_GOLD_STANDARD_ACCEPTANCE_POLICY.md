# Form2Fact V3 — Gold-Standard Dataset Acceptance Policy & Governance Framework

**Policy Identifier:** F2F-POL-V3-GOLD-001  
**Authority:** Form2Fact Data Governance Directorate & AICTE Regulatory Scrutiny Board  
**Target Release:** V3 Ground-Truth Corpus  
**Effective Date:** 2026-11-07  
**Classification:** Statutory Quality Standard  

---

## 1. Statutory Mandate & Purpose

Machine learning models deployed for statutory cross-verification and regulatory institutional approval decisions operate under strict administrative law scrutiny. Inaccurate or hallucinated predictions can unlawfully penalize compliant institutions or approve non-compliant applicants.

Therefore, **no machine learning model training (including V3 fine-tuning or pairwise classifier re-estimation) may take place until a candidate ground-truth dataset has formally met all criteria set forth in this Acceptance Policy**.

Synthetic examples, template-expanded datasets, and single-annotator unverified votes are **strictly prohibited** from entering the Form2Fact V3 Gold-Standard corpus.

---

## 2. Core Acceptance Criteria Matrix

A dataset batch is certified as **Form2Fact V3 Gold-Standard** only when 100% of the following mandatory gates are satisfied:

| Gate | Requirement | Threshold / Invariant | Validation Method |
|---|---|---|---|
| **GATE-01** | Zero Synthetic Contamination | `is_synthetic == false`<br>`is_human_annotated == true` | Pydantic Schema Validator & Metadata Audit |
| **GATE-02** | Independent Double-Blind Review | $\ge 2$ independent reviews per candidate record | Database Relational Audit & Unique Constraint |
| **GATE-03** | Mandatory Disagreement Adjudication | $0\%$ unresolved disagreements in export | Query Filter: `status IN ('agreed', 'adjudicated')` |
| **GATE-04** | Inter-Annotator Agreement Benchmark | Cohen's Kappa $\kappa \ge 0.70$<br>Raw Agreement $\ge 85\%$ | Real-time Mathematical Quality Engine |
| **GATE-05** | Page-Level Documentary Citation | Valid document name, page, and clause | Pydantic regex & positive integer validator |
| **GATE-06** | Substantive Statutory Rationale | Minimum 10 characters per review/adjudication | Server-enforced string length constraint |
| **GATE-07** | Five-Class Taxonomy Conformity | Exact 5-class canonical label membership | Strict Enum validation: `MATCH`, `MISMATCH`, etc. |
| **GATE-08** | Cryptographic Manifest & Integrity | SHA-256 hash verified against disk bytes | Automated crypto digest verification |
| **GATE-09** | Group-Level Split Partitioning | `group_id` prevents document cross-split leakage | Pydantic validator & split isolation script |

---

## 3. Detailed Acceptance Rules

### GATE-01: Zero Synthetic Contamination
- Every gold-standard record must represent a genuine, legally disclosable institutional claim and a certified documentary extract from an actual institutional docket.
- Synthetically degraded, LLM-generated, or template-expanded candidate pairs are strictly quarantined to experimental sandboxes.
- Any attempt to mark a synthetic record as `is_human_annotated: true` triggers immediate rejection by the Pydantic schema model validator (`ValueError: Record cannot simultaneously be marked is_synthetic=True and is_human_annotated=True`).

### GATE-02: Independent Double-Blind Review
- No record may enter the gold standard based on a single evaluator's judgment.
- Evaluators must cast votes independently without knowledge of prior votes.
- Annotator accounts must be authenticated via valid institutional JWT credentials.

### GATE-03: Mandatory Disagreement Adjudication
- If two annotators disagree on a candidate record (e.g., Annotator 1 selects `MATCH` and Annotator 2 selects `MISMATCH`), the record transitions to `disputed`.
- Disputed records are strictly barred from export until an accredited **Adjudicator** or **Administrator** enters a formal binding ruling with a documented statutory justification.
- Unresolved disputes remain quarantined in the review queue.

### GATE-04: Inter-Annotator Agreement Benchmark
For any institutional corpus batch:
- **Raw Agreement Rate ($p_o$):** Must achieve at least **$85.0\%$**.
- **Cohen's Kappa ($\kappa$):** Must achieve at least **$0.70$** (representing Substantial to Almost Perfect agreement on the Landis-Koch scale).
- If $\kappa < 0.70$, the candidate pool is flagged for extraction guideline review before re-annotation.

### GATE-05: Page-Level Documentary Citation
Every record must specify:
1. `claim.source_document_id` or `claim.document_name`: Explicit application docket reference.
2. `claim.page`: Valid integer $\ge 1$.
3. `evidence.source_document_id` or `evidence.document_name`: Explicit certified proof file name.
4. `evidence.page`: Valid integer $\ge 1$.
5. `evidenceLocation`: Specific clause, schedule, or table.

### GATE-06: Substantive Statutory Rationale
- Annotations submitted with placeholder text (e.g., `"ok"`, `"looks good"`, `"agreed"`) are blocked by the database layer.
- Rationales must explain why the documentary evidence supports or fails the claim, referencing numerical figures, dates, or legal terms.

### GATE-07: Five-Class Taxonomy Conformity
All records must strictly use the 5-class canonical taxonomy:
- `MATCH`
- `MISMATCH`
- `MISSING`
- `UNCERTAIN`
- `NOT_COMPARABLE`

Original upstream labels (such as SNLI `entailment`/`contradiction` or MultiNLI labels) must be preserved in `comparison.source_label` and must not overwrite the Form2Fact canonical label.

### GATE-08: Cryptographic Manifest & Integrity
Upon exporting the gold standard:
1. An SHA-256 digest is generated from the complete byte stream of `gold_standard_human.jsonl`.
2. A companion manifest `gold_standard_human.manifest.json` is generated containing:
   - `export_timestamp`
   - `record_count`
   - `size_bytes`
   - `sha256`
   - `quality_invariants` (`is_synthetic: false`, `is_human_annotated: true`)
3. The manifest and file are committed together under Git version control.

### GATE-09: Group-Level Split Partitioning & Leakage Prevention
To prevent train-test data leakage:
- Each record must define `group_id = "${institutionId}::${documentId}"`.
- Dataset splitting scripts must group by `group_id` so that all claims and evidence from the same document remain strictly within either the train, validation, or test partition.

---

## 4. Disqualification & Quarantine Conditions

A candidate record or batch is immediately disqualified and quarantined if any of the following occur:
1. **PII Exposure:** Unmasked Aadhaar numbers, PAN numbers, or private personal phone numbers in the claim or evidence text.
2. **Missing Page Reference:** Failure to cite the exact docket page where the evidence appears.
3. **Contradictory Consensus:** An agreed label that contradicts unambiguous arithmetic facts (e.g., labeling 8.5 Acres vs 5.2 Acres as `MATCH`).
4. **Cross-Tenant Data Leak:** An annotator evaluating records belonging to another regional organization without statutory authorization.

---

## 5. Formal Pre-Training Stop Gate

Model training on V3 data is strictly prohibited until:
1. A minimum of **1,000 authentic institutional candidate records** have completed the double-blind adjudication process.
2. The overall Cohen's Kappa on double-annotated pairs meets $\kappa \ge 0.70$.
3. The exported `gold_standard_human.jsonl` passes the V3 Pydantic schema validation script with **0 rejections and 0 duplicates**.
4. The Central Scrutiny Directorate signs off on the final dataset acquisition and forensic validation report.
