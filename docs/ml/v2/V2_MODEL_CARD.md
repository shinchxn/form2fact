# Model Card — Form2Fact Pairwise Classifier V2 (Champion)

## Model Details
- **Model Name:** Form2Fact Hybrid Pairwise Classifier V2 Champion
- **Model Version:** `form2fact-hybrid-pairwise-v2.0-champion`
- **Architecture:** Hybrid Semantic Dense Embeddings + Tabular Alignment Signal `HistGradientBoostingClassifier`
- **Embedding Backbone:** `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional dense vectors)
- **Dense Vector Assembly:** $[u, v, |u - v|, u \odot v] \in \mathbb{R}^{1536}$
- **Tabular Features:** 8-dimensional deterministic alignment indicators
- **Total Feature Dimension:** 1,544
- **Classifier Weights File:** `ai_service/ml/artifacts/v2/v2_champion_classifier_weights.pkl`
- **Weight Checksum (SHA256):** `efa27bee02d3d7b53a96366365f48a3f5924d7bd0095acdde965093bcf8f778e`
- **Model Config File:** `ai_service/ml/artifacts/v2/v2_model_config.json`
- **Config Checksum (SHA256):** `fc607b4c1a364669dd350b3ba377582d333324b466c6ddd20696d2c57a827927`

---

## Intended Use & Boundaries
- **Task:** Classify pairs of candidate institutional claims and documentary evidence into exactly one of five statutory classes: `MATCH`, `MISMATCH`, `MISSING`, `UNCERTAIN`, `NOT_COMPARABLE`.
- **Authority:** Decision-support only. Human scrutiny officers retain statutory adjudicative authority.
- **Abstention Policy:** All predictions with confidence $< 0.75$, ambiguous tokens, or OCR corruption strictly route to `UNCERTAIN` for human review.

---

## Performance Summary on Independent Held-Out V2 Benchmark (41 Pairs)
- **Accuracy:** `97.56%`
- **Macro F1:** `0.9853`
- **Weighted F1:** `0.9760`
- **MISMATCH Recall:** `1.0000` (17 out of 17 true contradictions detected)
- **MISMATCH Precision:** `0.9444`
- **False Mismatch Accusation Rate:** `4.17%`
- **Inference Latency:** `0.51ms` per pair on CPU
- **Artifact Size:** 3.17 MB
