# Form2Fact — Pairwise Field Mismatch Classifier: ML Design Specification

**Project:** Form2Fact — Evidence-First Institutional Document Intelligence  
**Component:** ML-Augmented Pairwise Field Mismatch Classification  
**Author:** Person 8 (Senior Machine Learning Engineer)  
**Version:** 1.0.0  
**Branch:** `feature/ml-pairwise-classifier`  

---

## 1. Problem Definition

Form2Fact extracts fields from multiple institutional documents and compares corresponding field pairs to detect discrepancies. The pairwise classification task is:

> Given two candidate field values (`claim` and `evidence`), their field metadata, and optional extraction context, classify the relationship into exactly one of five classes.

This is a **five-class sequence-pair classification problem** combining deterministic rules with learned semantic representations.

**Critical constraints:**
- The model must NOT memorize AICTE regulatory thresholds.
- Low similarity does NOT imply MISMATCH; ambiguous cases must route to UNCERTAIN.
- Missing evidence is MISSING, not MISMATCH.
- Incompatible field semantics route to NOT_COMPARABLE.
- Human officers retain sole adjudicative authority.

---

## 2. Input Feature Schema

The model receives a structured pairwise input:

```json
{
  "field_name": "faculty_count",
  "field_type": "numeric",
  "field_label": "Total Approved Faculty",
  "domain": "aicte",
  "claim_field": {
    "raw_value": "45",
    "normalized_value": "45",
    "context": "Total approved faculty members as declared in application",
    "document_type": "application_form",
    "extraction_confidence": 0.97
  },
  "evidence_field": {
    "raw_value": "38",
    "normalized_value": "38",
    "context": "Total faculty count per institutional report",
    "document_type": "institutional_report",
    "extraction_confidence": 0.95
  }
}
```

**Derived textual representation for the model:**

```
[CLS] Field: faculty_count | Type: numeric | Claim: 45 | Evidence: 38 [SEP]
Claim context: Total approved faculty members as declared in application [SEP]
Evidence context: Total faculty count per institutional report [SEP]
```

---

## 3. Five Classification Labels

| Label | Code | Meaning |
|:------|:-----|:--------|
| MATCH | 0 | Values represent the same underlying fact |
| MISMATCH | 1 | Values contain a material contradiction |
| MISSING | 2 | Required evidence field is absent |
| UNCERTAIN | 3 | Insufficient evidence for confident classification |
| NOT_COMPARABLE | 4 | Fields are semantically incompatible |

---

## 4. Training Dataset Requirements

**Minimum viable:** 500 labeled pairs (100 per class)  
**Production target:** 2,000+ labeled pairs with balanced class representation

**Sources:**
1. Form2Fact-specific synthetic benchmark (from `ai_service/app/dataset.py`)
2. Extended synthetic JSONL dataset (this project)
3. Public NLI datasets adapted with documented label mappings (SNLI, MultiNLI)
4. Public entity-matching datasets with documented mappings

**Requirements:**
- All five classes represented
- Institution-level stratification where possible
- Fixed random seed (42)
- Train/validation/test: 70%/15%/15%
- Leakage verification

---

## 5. Model Selection

**Selected Architecture:** Hybrid Sentence Transformer + Lightweight MLP Classifier

**Rationale:**
1. `all-MiniLM-L6-v2` (22M params, 384-dim embeddings) — small, CPU-compatible, MIT-licensed.
2. Pairwise feature construction: concatenate `[embed_claim, embed_evidence, |embed_claim - embed_evidence|, embed_claim * embed_evidence]`.
3. MLP classifier on top of pairwise features → 5 classes.
4. Deterministic fast-path (existing logic) overrides ML when high-confidence deterministic result is available.

**Why not fine-tune BERT directly:**
- Dataset size is insufficient for stable full fine-tuning without overfitting.
- Sentence Transformers provide high-quality semantic representations from pre-training.
- MLP classifier on pooled embeddings is interpretable and fast at inference.

**Fallback:** If `sentence-transformers` is unavailable at inference time, the system falls back to the deterministic Jaccard-based classifier with explicit fallback labeling.

---

## 6. Data Preprocessing

Preprocessing pipeline (`ai_service/ml/preprocessing/pipeline.py`):

1. Unicode NFKC normalization.
2. Whitespace normalization.
3. Case-folding for normalized values (preserving raw for auditability).
4. OCR noise detection (corruption character density).
5. Numeric extraction and normalization.
6. Date parsing and ISO 8601 normalization.
7. Missing-value detection (None, empty string, sentinel "N/A", "NULL").
8. Field compatibility metadata injection.
9. Textual input construction for model.

---

## 7. Training Strategy

```
Phase 1: Dataset preparation and validation
Phase 2: Embedding extraction using all-MiniLM-L6-v2
Phase 3: Pairwise feature construction
Phase 4: MLP classifier training with class weights
Phase 5: Validation monitoring (macro F1)
Phase 6: Best-checkpoint selection
Phase 7: Evaluation on held-out test set
Phase 8: Confidence calibration assessment
Phase 9: Model export (weights + config + label map)
```

**Hyperparameters:**
- Random seed: 42
- Learning rate: 1e-3
- Batch size: 32
- Max epochs: 50 (early stop patience: 10)
- Class weight: balanced
- Optimizer: Adam with weight decay 1e-4

---

## 8. Evaluation Metrics

| Metric | Target |
|:-------|:-------|
| Accuracy | ≥ 0.80 |
| Macro F1 | ≥ 0.78 |
| MISMATCH precision | ≥ 0.80 (false positives penalize institutions unfairly) |
| MISSING recall | ≥ 0.90 (missing evidence must be caught) |
| Latency | < 200ms per pair on CPU |

**Additional:**
- Per-class confusion matrix
- Confidence calibration reliability diagram
- MISMATCH false-positive analysis (critical — false flags harm institutions)

---

## 9. Inference Interface

```
POST /api/v1/classify-pair  (existing, enhanced)
POST /api/v1/ml/classify-pair  (new ML endpoint)
GET  /api/v1/ml/health
GET  /api/v1/ml/model-info
```

**Output contract:**
```json
{
  "label": "MISMATCH",
  "confidence": 0.91,
  "is_deterministic": false,
  "ml_augmented": true,
  "model_version": "form2fact-ml-v1.0.0",
  "explanation": "...",
  "requires_human_review": true
}
```

---

## 10. Integration with Form2Fact

The ML classifier integrates as an **optional enhancement layer** on top of the existing deterministic system:

```
Request → Deterministic checks (MISSING, NOT_COMPARABLE, exact MATCH, confirmed MISMATCH)
       ↓ (if no deterministic result)
       → ML Semantic classifier → label + confidence
       ↓ (if confidence < threshold)
       → Route to UNCERTAIN
       ↓
Final structured response
```

The Node.js backend can call the Python AI service:
- Primary: existing `/api/v1/classify-pair` (deterministic + ML)
- Fallback: if AI service unreachable, use Node.js `PairwiseFieldClassifier` directly

The integration must NOT require the AI service to be running for the application to function.

