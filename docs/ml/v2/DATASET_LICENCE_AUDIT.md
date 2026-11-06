# Form2Fact Model V2 — Dataset Licence & Legal Audit

**Audit Date:** 2026-11-06  
**Auditor:** Person 8 (ML Data Engineer)  
**Standard:** Open-source research & commercial model deployment compliance.

---

## 1. Licence Classification & Usage Boundary

| Dataset Identifier | Declared Licence | Permitted in Commercial Weights? | Research & Benchmark Permitted? | Restrictions & Obligations |
|:---|:---|:---:|:---:|:---|
| **Form2Fact Corpus (V1 & V2)** | Form2Fact Proprietary / Open Internal | **YES** | **YES** | Ground truth regulatory pairs authored under project governance. |
| **`snli`** | CC BY-SA 4.0 | **CONDITIONAL** | **YES** | Attribution required. ShareAlike terms apply if dataset is redistributed. |
| **`multi_nli`** | CC BY-SA 4.0 / ODC Open | **CONDITIONAL** | **YES** | Attribution required. |
| **`funsd`** | Non-commercial research only | **NO (Research Only)** | **YES** | Strictly prohibited for commercial model distillation or commercial redistribution. Kept strictly as external research reference. |
| **`cord`** | CC BY-NC-ND 4.0 | **NO (Non-Commercial)** | **YES** | No commercial derivatives. Kept as auxiliary extraction reference only. |
| **`docvqa`** | CC BY 4.0 | **YES** | **YES** | Attribution required. |
| **`deepmatcher`** | BSD 3-Clause | **YES** | **YES** | Permissive open-source license. |
| **`wdc_products`** | CC BY-NC 4.0 | **NO (Non-Commercial)** | **YES** | Non-commercial research use only. |

---

## 2. Decision Policy for Model V2
To guarantee that Form2Fact models remain clean, distributable, and legally unencumbered:
1. **Primary Supervised Training:** Built exclusively upon **Form2Fact Corpus (V1 & V2)** and permissive embeddings (`all-MiniLM-L6-v2` - Apache 2.0).
2. **Auxiliary / Pre-training Pretext Corpora:** Non-commercial datasets (`funsd`, `cord`) are **NOT mixed** into production classifier weights. They are audited and retained for evaluation or standalone OCR benchmarking only.
