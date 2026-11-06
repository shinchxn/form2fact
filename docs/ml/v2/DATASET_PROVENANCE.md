# Form2Fact Model V2 — Dataset Provenance & Attribution Ledger

This document tracks all training, auxiliary, and candidate data sources integrated into the Form2Fact V2 data pool.

---

## 1. Provenance Registry

| Dataset ID | Full Source Name | Origin / URL | License | Original Task | Form2Fact Target Role |
|:---|:---|:---|:---|:---|:---|
| `form2fact_v1` | Form2Fact Golden Baseline | Internal (`ai_service/ml/data/raw/`) | Form2Fact Project | 5-Class Pairwise Verification | Primary Benchmark & Baseline Ground Truth (70 pairs) |
| `form2fact_v2_expansion` | Form2Fact V2 Domain Expansion | Synthetic Regulatory Expansion (`v2_acquisition/`) | Form2Fact Project | 5-Class Pairwise Verification | Primary Expanded Domain Corpus (1,250 pairs) |
| `snli` | Stanford NLI | `https://huggingface.co/datasets/stanfordnlp/snli` | CC BY-SA 4.0 | 3-Class NLI | Auxiliary Semantic Representation (Entailment/Contradiction) |
| `multi_nli` | Multi-Genre NLI | `https://huggingface.co/datasets/nyu-mll/multi_nli` | CC BY-SA 4.0 / ODC Open | 3-Class NLI | Auxiliary Cross-Domain Linguistic Reasoning |
| `funsd` | FUNSD Form Understanding | `https://guillaumejaume.github.io/FUNSD/` | Non-commercial research | Form Key-Value Extraction | Auxiliary Document Layout & OCR Noise Reference |
| `docvqa` | Document Visual QA | `https://site.docvqa.org/` | CC BY 4.0 | Visual Document QA | Auxiliary Document Evidence Extraction |
| `cord` | CORD Receipt Extraction | `https://github.com/clovaai/cord` | CC BY-NC-ND 4.0 | Post-OCR Parsing | Auxiliary Noisy OCR Token Extraction |
| `sroie` | ICDAR 2019 SROIE | `https://github.com/zzzDavid/ICDAR-2019-SROIE` | Academic / Open | Key Information Extraction | Auxiliary Text Parsing |
| `deepmatcher` | DeepMatcher Benchmarks | `https://github.com/anhaidgroup/deepmatcher` | BSD / Academic Open | Record Linkage | Supporting Attribute-Level Match Features |
| `wdc_products` | Web Data Commons Corpus | `https://webdatacommons.org/` | CC BY-NC 4.0 | Product Matching | Supporting Entity Variation Features |
