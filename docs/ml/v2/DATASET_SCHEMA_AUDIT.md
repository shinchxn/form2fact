# Form2Fact Model V2 — Dataset Schema & Structural Audit

---

## 1. Schema Specifications Across Source Families

### 1.1 Natural Language Inference (`snli`, `multi_nli`)
- **Key Fields:** `premise` (string), `hypothesis` (string), `label` (integer: 0=entailment, 1=neutral, 2=contradiction).
- **Structural Match:** Natural sequence pairs; can be formatted into claim and evidence text candidates, but lack explicit regulatory field dimensions (e.g. `field_name`, `field_type`, `tolerance_threshold`).

### 1.2 Form Understanding & Key-Value Extraction (`funsd`, `cord`)
- **Key Fields:** `bboxes` (coordinates `[x0, y0, x1, y1]`), `words` (list of tokens), `ner_tags` (header, question, answer, other).
- **Structural Match:** Non-pairwise document layouts. Incompatible with direct sequence pair classification without layout-to-pair extraction preprocessing.

### 1.3 Entity Matching (`deepmatcher`, `wdc_products`)
- **Key Fields:** `id`, `label` (0 or 1), `left_<attribute>` (string), `right_<attribute>` (string).
- **Structural Match:** Tabular record linkage format. Highly aligned with pairwise attribute comparison.

### 1.4 Form2Fact Canonical Pairwise Schema (`V1 & V2`)
- **Top-Level Attributes:**
  - `pair_id`: Unique identifier (e.g., `v2-pair-01042`)
  - `domain`: Target regulatory system (`aicte`, `naac`, `nba`)
  - `field_name`: Canonical attribute (`trustName`, `leaseExpiryDate`, `landAreaAcres`, etc.)
  - `field_type`: Semantic data type (`date`, `numeric`, `entity_name`, `code`, `generic`, `not_comparable`)
  - `claim`: Sub-object containing `raw_value`, `context`, `document_type`, `extraction_confidence`
  - `evidence`: Sub-object containing `raw_value`, `context`, `document_type`, `extraction_confidence`
  - `label`: Exactly one of `MATCH`, `MISMATCH`, `MISSING`, `UNCERTAIN`, `NOT_COMPARABLE`
  - `reviewer_rationale`: Human/statutory grounding for the decision
  - `data_origin`: Origin identifier (`v2_synthetic_expansion` or `human_annotated`)
