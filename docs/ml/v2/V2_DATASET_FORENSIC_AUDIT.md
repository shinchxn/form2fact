# Form2Fact Model V2 — Dataset Forensic Audit Report

**Date:** 2026-11-06  
**Auditor:** Senior ML Research Engineer & Dataset Quality Specialist  
**Target:** Form2Fact V1 & V2 Data Repositories (`ai_service/ml/data/` and `ai_service/ml/data/v2_acquisition/`)

---

## 1. Executive Summary & Inventory Findings
An exhaustive forensic audit of the Form2Fact dataset repository was conducted to establish exact record counts, origin attribution, duplicate prevalence, and synthetic generation characteristics.

### Total Record Counts by Verified Category:
1. **Original V1 Records:** **70** pairs (100% synthetic baseline fixtures in `ai_service/ml/data/raw/`).
2. **Human-Annotated Records:** **0** independent verified human-annotated institutional filings. All baseline and expanded records are currently generated via structured regulatory templates.
3. **Synthetic Generated Records:** **1,320** pairs (70 V1 baseline + 1,250 V2 expansion).
4. **Unique Deduplicated Domain Records:** **522** unique pairwise combinations (452 unique from V2 expansion + 70 from V1).
5. **Public Dataset Candidates Inspected:** **8** datasets sampled (SNLI, MultiNLI, FUNSD, DocVQA, CORD, SROIE, DeepMatcher, WDC).
6. **Defensibly Mapped Public Records:** **200** SNLI entailment and contradiction pairs.
7. **OCR-Degraded Examples:** **27** pairs (2 in V1, 25 in V2 expansion).
8. **Records Pending Review:** **0** (all mapped records undergo programmatic syntax and boundary validation).
9. **Rejected Records from Direct Training:** FUNSD (single-page token layout), DocVQA (QA image task), CORD (non-commercial derivative), and OpenSanctions (gated access).

---

## 2. Template Duplication & Near-Duplicate Analysis
The reported 1,250 generated records in `form2fact_v2_domain_expansion.jsonl` were produced using 8 statutory template families across 26 institutional prefixes.
- **Raw Count:** 1,250 records.
- **Exact Pair Duplicates:** 798 duplicate combinations resulting from random prefix sampling over identical parameter values.
- **Unique Semantic Pairs:** 452 distinct pairwise field combinations.
- **Forensic Takeaway:** The 1,250 records are **NOT independently annotated real-world filings**; they are parameterized synthetic permutations. To avoid overestimating model generalization, rigorous group-aware deduplication was implemented.

---

## 3. Data Integrity & Label Sanity Check
- **Missing Value Sentinels:** Accurately captured. Records with empty evidence values are tagged `MISSING` with 100% precision.
- **Contradictory Labels:** No instances where identical claim-evidence pairs carry conflicting ground-truth labels.
- **OCR Noise Sentinels:** Degradation strings (`[OCR UNREADABLE]`, `???-??-2054`, heavy non-alphanumeric ratios) strictly map to `UNCERTAIN`.
- **Incompatible Fields:** Built-up floor area compared to lease expiry date strictly tags `NOT_COMPARABLE`.
