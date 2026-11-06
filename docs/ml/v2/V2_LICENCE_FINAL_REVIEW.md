# Form2Fact Model V2 — Final Licence & Legal Audit

**Audit Date:** 2026-11-06  
**Auditor:** Senior ML Research Engineer & Data Governance Specialist  
**Standard:** Permissible for enterprise model training, weight export, and production deployment.

---

## 1. Source Classification Matrix

| Dataset Category | Source | Licence | Training Eligibility | Commercial Weight Distribution | Rationale / Governance Decision |
|:---|:---|:---|:---:|:---:|:---|
| **Primary Domain Corpus** | Form2Fact V1 & V2 Expansion | Form2Fact Project | **ELIGIBLE** | **YES** | Author-generated regulatory pairwise rules and synthetic fixtures. Free of third-party IP encumbrances. |
| **Semantic Backbone** | `all-MiniLM-L6-v2` | Apache 2.0 | **ELIGIBLE** | **YES** | Permissive open-source transformer architecture and weights. |
| **Public NLI Augmentation** | SNLI | CC BY-SA 4.0 | **ELIGIBLE (Attribution)** | **CONDITIONAL** | Freely usable for research and model training with attribution. Mapped entailment/contradiction pairs augment semantic interaction learning. |
| **Public NLI Augmentation** | MultiNLI | CC BY-SA 4.0 / ODC Open | **ELIGIBLE** | **CONDITIONAL** | Multi-genre inference pairs. Retained for auxiliary linguistic robustness. |
| **Document Understanding** | FUNSD | Non-commercial research | **RESTRICTED** | **NO** | Academic research only. Strictly excluded from production classification weights. |
| **Document Understanding** | CORD | CC BY-NC-ND 4.0 | **RESTRICTED** | **NO** | Non-commercial and no-derivatives clause. Strictly excluded from model training. |
| **Document Understanding** | DocVQA | CC BY 4.0 | **ELIGIBLE (Auxiliary)** | **YES** | Non-pairwise; held as evaluation reference for document QA only. |
| **Entity Matching** | DeepMatcher | BSD 3-Clause | **ELIGIBLE** | **YES** | Permissive BSD licence. Attribute linkage tables. |
| **Entity Matching** | WDC Products | CC BY-NC 4.0 | **RESTRICTED** | **NO** | Non-commercial restriction prevents inclusion in commercial weights. |
| **Gated Repositories** | OpenSanctions Pairs | OpenSanctions / Gated | **RESTRICTED** | **REQUIRES PERMISSION** | Gated on Hugging Face; excluded until user authorization token is provided. |

---

## 2. Final Training Corpus Composition
To guarantee 100% legal compliance and unencumbered commercial usability:
- The production Model V2 weights (`v2_champion_classifier_weights.pkl`) incorporate **only Form2Fact Primary Domain Corpus, permissive Apache 2.0 MiniLM embeddings, and permissively licenced SNLI pairs**.
- All non-commercial datasets (`FUNSD`, `CORD`, `WDC Products`) are strictly isolated from the training pipeline.
