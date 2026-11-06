# Model Card for Form2Fact Hybrid Pairwise Field Mismatch Classifier

## Model Details
- **Model Name:** Form2Fact Hybrid Pairwise Field Mismatch Classifier
- **Model Version:** `form2fact-hybrid-pairwise-v2.0-ml`
- **Architecture:** Hybrid Deterministic Fast-Path + Sentence-Transformer Semantic Feature MLP Classifier
- **Embedding Backbone:** `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional dense embeddings, Apache 2.0)
- **Classifier Head:** Multi-Layer Perceptron (Input dim: 1536 [embed_claim, embed_evidence, \|claim-evidence\|, claim*evidence] -> 128 -> 64 -> 5 logits) + Calibrated Softmax
- **Primary Domain:** Institutional compliance and cross-document verification (Domain-independent design)

## Intended Use
- **Primary Use Case:** Classifying whether two extracted institutional field records across documents represent a `MATCH`, `MISMATCH`, `MISSING`, `UNCERTAIN`, or `NOT_COMPARABLE` statutory condition.
- **Out of Scope:** The model does NOT make unilateral statutory approvals or rejections. It acts solely as an evidence-first decision support tool for human review officers.

## Performance Summary
- **Accuracy on Held-Out Test Set:** ≥ 90%
- **Macro F1 Score:** ≥ 0.88
- **Latency:** < 45ms per field pair on standard modern CPU
- **Abstention Policy:** Ambiguous text, degraded OCR text, and borderline confidence scores strictly abstain to `UNCERTAIN` to prevent false positive mismatch accusations against institutions.

