# Form2Fact — External Dataset Source Audit & Provenance Report

**Project:** Form2Fact — Evidence-First Institutional Document Intelligence  
**Document Purpose:** Provenance, licensing, and applicability audit of external candidate datasets for Pairwise Field Mismatch Classification.  
**Author:** Person 8 (ML Systems Engineer)  
**Standard:** Strict provenance audit before incorporating external corpora into training corpora.

---

## 1. Candidate Source Audit Matrix

| Dataset | Source / Host | Original Task | Records (Approx) | Verified Licence | Suitability for Form2Fact 5-Class | Decision |
|:---|:---|:---|---:|:---|:---|:---|
| **SNLI** | Stanford / Hugging Face (`stanfordnlp/snli`) | Natural Language Inference (3-class: entailment, neutral, contradiction) | 570,000 | CC BY-SA 4.0 | Generic text pairs. Contradictions are sentence-level rather than field-level. Neutral cannot equate to UNCERTAIN. | **Secondary / Pre-training Pretext Only** (Entailment / Contradiction features only) |
| **MultiNLI** | NYU / Hugging Face (`nyu-mll/multi_nli`) | Multi-Genre NLI (3-class) | 433,000 | CC BY-SA 4.0 / ODC Open | Cross-domain sentence reasoning. Useful for semantic contradiction representations. | **Secondary / Feature Representation Only** |
| **FUNSD** | Guillaume Jaume / HF (`nielsr/funsd`) | Form Understanding (NER + Linking on scanned forms) | 199 forms / 31,485 words | Non-commercial research | Document layout & key-value detection. Does NOT have 5-class pairwise mismatch labels. | **Supporting Representation for OCR robustness** |
| **DocVQA** | CVC / Hugging Face (`vidore/docvqa_train`) | Visual Document Question Answering | 50,000 | CC BY 4.0 | Document QA. Not structured pairwise field comparison. | **Rejected for Direct 5-Class Training** |
| **Splink Synthetic** | MoJ Analytical Services | Entity Resolution / Record Linkage | Variable | MIT | Structured record linkage. Identifies match vs non-match of entities, but non-match is not necessarily a regulatory contradiction. | **Accepted as Supporting Feature Source for Entity Resolution** |
| **Form2Fact Golden Corpus** | In-Repo Verified Benchmarks (`ai_service/ml/data/raw/`) | 5-Class Pairwise Regulatory Verification | 70 annotated pairs (expanding) | Project Proprietary / Open Internal | Explicit 5-class ground truth (`MATCH`, `MISMATCH`, `MISSING`, `UNCERTAIN`, `NOT_COMPARABLE`) with evidence anchors. | **Primary Ground Truth Training Set** |

---

## 2. Licensing Compliance Statement
- All datasets used in model training, embedding fine-tuning, or evaluation must strictly permit research and model distribution.
- No private, proprietary institutional documents, student PII, or copyrighted accreditation submissions are ingested into public repositories or caches.
- Training scripts rely solely on permissive or CC BY-SA compatible public embeddings (`sentence-transformers/all-MiniLM-L6-v2` - Apache 2.0).

