# FORM2FACT — PRE-COMMIT GATE AUDIT & DISCREPANCY RESOLUTION

**Project:** Form2Fact — Evidence-First Institutional Document Intelligence  
**Competition:** BharatCode Build League 2026  
**Repository:** `https://github.com/shinchxn/form2fact.git`  
**Target Branch:** `main`  
**Audit Timestamp:** November 10, 2026 — 22:00 IST  
**Pre-Commit Gate Verdict:** **`APPROVED WITH MANUAL APPROVALS REQUIRED`**  

---

## 1. GIT STATUS & RECONCILIATION

### Exact Working Tree State
The working tree contains **11 tracked files with uncommitted modifications** and **43 untracked files across 6 directories**. Zero files are staged in the Git index (`git diff --cached` is empty). Branch `main` is directly tracking `origin/main` at commit `b261c2b0f901a6a82573c1de42e1a8406b749acc` with zero divergence, no merge conflicts, and no rebase in progress.

### Output of `git status --short`
```text
 M .gitignore
 M README.md
 M ai_service/Dockerfile
 M ai_service/app/ocr.py
 M package-lock.json
 M package.json
 M server/api.ts
 M server/core/rateLimit.ts
 M server/test-runner.ts
 M src/components/FindingsView.tsx
 M src/services/api.ts
?? ai_service/ml/data/adaption/
?? dockets/
?? docs/demo/
?? docs/engineering/ADAPTION_MODEL_ONBOARDING.md
?? docs/engineering/BHARATCODE_QWEN_DEEPSEEK_INTEGRATION.md
?? docs/engineering/FINAL_ARCHITECTURE_DECISION.md
?? docs/engineering/FINAL_MULTI_MODEL_INTEGRATION_VERIFICATION.md
?? docs/engineering/FINAL_PRE_COMMIT_AUDIT.md
?? docs/engineering/MAIN_BRANCH_CODEBASE_AUDIT_AND_IMPROVEMENT_REPORT.md
?? docs/engineering/MAIN_RELEASE_READINESS.md
?? docs/engineering/MULTI_MODEL_AI_ARCHITECTURE.md
?? docs/engineering/OCR_AND_DOCUMENT_INTELLIGENCE.md
?? docs/ml/MULTI_MODEL_COMPARATIVE_EVALUATION.md
?? docs/ml/adaption/
?? docs/ml/test_split_benchmark_results.json
?? docs/testing/REAL_DOCUMENT_PLAYWRIGHT_E2E_REPORT.md
?? e2e/
?? playwright.config.ts
?? scripts/ml/
?? server/modules/ai/
?? server/tests/multiModelOrchestration.test.ts
```

---

## 2. COMPLETE FILE INVENTORY (54 FILES AUDITED)

### A. Tracked Modified Files (11 files)
1. [`.gitignore`](file:///d:/projects/form2fact/.gitignore) (1,326 B): Added ignore entries for Playwright test run outputs (`test-results/`, `playwright-report/`).
2. [`README.md`](file:///d:/projects/form2fact/README.md) (39,690 B): Added quickstart instructions, multi-model AI routing, Playwright real-doc test commands, and judges demonstration links.
3. [`ai_service/Dockerfile`](file:///d:/projects/form2fact/ai_service/Dockerfile) (2,126 B): Hardened container environment for OCR and ML service isolation.
4. [`ai_service/app/ocr.py`](file:///d:/projects/form2fact/ai_service/app/ocr.py) (3,974 B): Layout-aware extraction and Tamil/English fallback pipelines.
5. [`package-lock.json`](file:///d:/projects/form2fact/package-lock.json) (149,125 B): Lockfile synchronization for `@playwright/test`.
6. [`package.json`](file:///d:/projects/form2fact/package.json) (1,501 B): Added `@playwright/test` dependency and test scripts.
7. [`server/api.ts`](file:///d:/projects/form2fact/server/api.ts) (67,032 B): Multi-model discovery endpoints (`/api/v1/ai/providers`), audit ledger verification, and rate limiting.
8. [`server/core/rateLimit.ts`](file:///d:/projects/form2fact/server/core/rateLimit.ts) (3,235 B): Hardened IP and user token-bucket rate limiter.
9. [`server/test-runner.ts`](file:///d:/projects/form2fact/server/test-runner.ts) (55,608 B): Integrated Test Suite 24 (Multi-Model AI Orchestration).
10. [`src/components/FindingsView.tsx`](file:///d:/projects/form2fact/src/components/FindingsView.tsx) (27,253 B): Added model selector, token/latency telemetry, and subscription diagnostic banners.
11. [`src/services/api.ts`](file:///d:/projects/form2fact/src/services/api.ts) (19,971 B): Added typed frontend client methods for model registry, routing, and explanations.

### B. Untracked Demonstration PDFs (`dockets/authentic_test/`) (3 files)
*FLAGGED FOR MANUAL APPROVAL prior to public repository release:*
12. [`dockets/authentic_test/SFR_College_Fire_Safety_Certificate.pdf`](file:///d:/projects/form2fact/dockets/authentic_test/SFR_College_Fire_Safety_Certificate.pdf) (1,265,215 B, 26 pages): Authentic fire safety certificate from The Standard Fireworks Rajaratnam College for Women, Sivakasi.
13. [`dockets/authentic_test/SA_College_Occupancy_Certificate.pdf`](file:///d:/projects/form2fact/dockets/authentic_test/SA_College_Occupancy_Certificate.pdf) (1,050,674 B, 25 pages): Authentic building occupancy certificate from S.A. College of Arts & Science, Chennai.
14. [`dockets/authentic_test/Good_Shepherd_AICTE_EoA.pdf`](file:///d:/projects/form2fact/dockets/authentic_test/Good_Shepherd_AICTE_EoA.pdf) (101,264 B, 4 pages): Authentic AICTE Extension of Approval regulatory order for Good Shepherd College of Engineering and Technology.

### C. Untracked AI Orchestration Layer (`server/modules/ai/providers/`) (8 files)
15. [`server/modules/ai/providers/index.ts`](file:///d:/projects/form2fact/server/modules/ai/providers/index.ts) (346 B): Module export barrel.
16. [`server/modules/ai/providers/modelTypes.ts`](file:///d:/projects/form2fact/server/modules/ai/providers/modelTypes.ts) (8,284 B): Interfaces for providers, tasks, responses, and errors.
17. [`server/modules/ai/providers/modelRegistry.ts`](file:///d:/projects/form2fact/server/modules/ai/providers/modelRegistry.ts) (5,897 B): Provider discovery and health probe registry.
18. [`server/modules/ai/providers/modelRouter.ts`](file:///d:/projects/form2fact/server/modules/ai/providers/modelRouter.ts) (7,518 B): Task router, citation whitelisting, and label divergence locks.
19. [`server/modules/ai/providers/bharatCodeQwenProvider.ts`](file:///d:/projects/form2fact/server/modules/ai/providers/bharatCodeQwenProvider.ts) (21,600 B): Adapter for BharatCode Qwen 3.8 27B with HTTP 402 handling.
20. [`server/modules/ai/providers/bharatCodeDeepSeekProvider.ts`](file:///d:/projects/form2fact/server/modules/ai/providers/bharatCodeDeepSeekProvider.ts) (20,674 B): Adapter for BharatCode DeepSeek v4.1 Flash with HTTP 402 handling.
21. [`server/modules/ai/providers/adaptionProvider.ts`](file:///d:/projects/form2fact/server/modules/ai/providers/adaptionProvider.ts) (11,935 B): Adapter for Adaption SFT model with fail-closed quarantine guards.
22. [`server/modules/ai/providers/form2factClassifierProvider.ts`](file:///d:/projects/form2fact/server/modules/ai/providers/form2factClassifierProvider.ts) (3,742 B): Authoritative Native ML head provider wrapper.

### D. Untracked Test Suites & Benchmarks (5 files)
23. [`server/tests/multiModelOrchestration.test.ts`](file:///d:/projects/form2fact/server/tests/multiModelOrchestration.test.ts) (15,204 B): 15 unit tests covering provider registration, routing, citation stripping, and errors.
24. [`e2e/real-document-verification.spec.ts`](file:///d:/projects/form2fact/e2e/real-document-verification.spec.ts) (14,052 B): 10-scenario Playwright E2E browser test suite.
25. [`playwright.config.ts`](file:///d:/projects/form2fact/playwright.config.ts) (703 B): Playwright configuration with web server orchestration.
26. [`scripts/ml/benchmark_test_split.py`](file:///d:/projects/form2fact/scripts/ml/benchmark_test_split.py) (5,868 B): Held-out test split evaluation script.
27. [`docs/ml/test_split_benchmark_results.json`](file:///d:/projects/form2fact/docs/ml/test_split_benchmark_results.json) (2,859 B): Machine-readable benchmark telemetry and confusion matrix.

### E. Untracked Adaption Dataset Splits (`ai_service/ml/data/adaption/`) (9 files)
*NOTE: These files are generated in the working tree but currently UNTRACKED (not yet committed):*
28. `train.jsonl` (864,197 B, 375 records): Template-isolated training split.
29. `validation.jsonl` (140,870 B, 61 records): Validation split.
30. `test.jsonl` (192,787 B, 83 records): Held-out zero-gradient test split.
31. `adaption_instructions_deduped.jsonl` (1,200,109 B, 520 records): Deduplicated dataset pool.
32. `adaption_instructions_full.jsonl` (3,105,970 B): Full instruction pool prior to deduplication.
33. `adaption_structured_records.csv` (565,697 B): Tabular record representations.
34. `adaption_dataset_manifest.json` (6,345 B): Dataset metadata and split specifications.
35. `downloaded/train.jsonl (augmented).jsonl` (9,572,057 B): Historical augmented download from AutoScientist.
36. `quarantine/quarantined_anomalies.jsonl` (2,399 B, 1 record): Quarantined anomalous record (`v2-pair-01022`).

### F. Untracked Documentation & Reports (18 files)
37. [`docs/demo/JUDGES_DEMONSTRATION_GUIDE.md`](file:///d:/projects/form2fact/docs/demo/JUDGES_DEMONSTRATION_GUIDE.md) (10,646 B)
38. [`docs/demo/DEMONSTRATION_DOCUMENT_MANIFEST.md`](file:///d:/projects/form2fact/docs/demo/DEMONSTRATION_DOCUMENT_MANIFEST.md) (4,163 B)
39. [`docs/demo/DEMONSTRATION_WORKFLOW.md`](file:///d:/projects/form2fact/docs/demo/DEMONSTRATION_WORKFLOW.md) (7,528 B)
40. [`docs/testing/REAL_DOCUMENT_PLAYWRIGHT_E2E_REPORT.md`](file:///d:/projects/form2fact/docs/testing/REAL_DOCUMENT_PLAYWRIGHT_E2E_REPORT.md) (18,080 B)
41. [`docs/ml/MULTI_MODEL_COMPARATIVE_EVALUATION.md`](file:///d:/projects/form2fact/docs/ml/MULTI_MODEL_COMPARATIVE_EVALUATION.md) (8,701 B)
42. [`docs/engineering/FINAL_ARCHITECTURE_DECISION.md`](file:///d:/projects/form2fact/docs/engineering/FINAL_ARCHITECTURE_DECISION.md) (8,809 B)
43. [`docs/engineering/MAIN_RELEASE_READINESS.md`](file:///d:/projects/form2fact/docs/engineering/MAIN_RELEASE_READINESS.md) (7,869 B)
44. [`docs/engineering/FINAL_PRE_COMMIT_AUDIT.md`](file:///d:/projects/form2fact/docs/engineering/FINAL_PRE_COMMIT_AUDIT.md) (This document)
45. [`docs/engineering/ADAPTION_MODEL_ONBOARDING.md`](file:///d:/projects/form2fact/docs/engineering/ADAPTION_MODEL_ONBOARDING.md) (4,502 B)
46. [`docs/engineering/BHARATCODE_QWEN_DEEPSEEK_INTEGRATION.md`](file:///d:/projects/form2fact/docs/engineering/BHARATCODE_QWEN_DEEPSEEK_INTEGRATION.md) (5,485 B)
47. [`docs/engineering/FINAL_MULTI_MODEL_INTEGRATION_VERIFICATION.md`](file:///d:/projects/form2fact/docs/engineering/FINAL_MULTI_MODEL_INTEGRATION_VERIFICATION.md) (17,077 B)
48. [`docs/engineering/MAIN_BRANCH_CODEBASE_AUDIT_AND_IMPROVEMENT_REPORT.md`](file:///d:/projects/form2fact/docs/engineering/MAIN_BRANCH_CODEBASE_AUDIT_AND_IMPROVEMENT_REPORT.md) (8,827 B)
49. [`docs/engineering/MULTI_MODEL_AI_ARCHITECTURE.md`](file:///d:/projects/form2fact/docs/engineering/MULTI_MODEL_AI_ARCHITECTURE.md) (9,487 B)
50. [`docs/engineering/OCR_AND_DOCUMENT_INTELLIGENCE.md`](file:///d:/projects/form2fact/docs/engineering/OCR_AND_DOCUMENT_INTELLIGENCE.md) (5,288 B)
51. [`docs/ml/adaption/ADAPTION_TRAINING_READINESS.md`](file:///d:/projects/form2fact/docs/ml/adaption/ADAPTION_TRAINING_READINESS.md) (13,015 B)
52. [`docs/ml/adaption/EXISTING_DATASET_AUDIT.md`](file:///d:/projects/form2fact/docs/ml/adaption/EXISTING_DATASET_AUDIT.md) (15,061 B)
53. [`docs/ml/adaption/FINAL_ADAPTION_DATASET_VALIDATION.md`](file:///d:/projects/form2fact/docs/ml/adaption/FINAL_ADAPTION_DATASET_VALIDATION.md) (26,282 B)

---

## 3. ADAPTION DATASET SPLITS VERIFICATION

Direct calculation across JSONL files in `ai_service/ml/data/adaption/`:

| Dataset Split | Status | Rows | SHA-256 Checksum | Class Distribution |
| :--- | :---: | :---: | :--- | :--- |
| **`train.jsonl`** | UNTRACKED | 375 | `E5AC3A4A08B9113A075C943A2D0BFE1FF0423547D58D93EB1D8455C2E0F01EA3` | MATCH: 108, MISMATCH: 126, MISSING: 88, UNCERTAIN: 50, NOT_COMPARABLE: 3 |
| **`validation.jsonl`** | UNTRACKED | 61 | `AED6BE8016751B2AED5C47569294300BC25602C5B4EA11AD4B64ED843FFDA69D` | MATCH: 24, MISMATCH: 28, MISSING: 7, UNCERTAIN: 1, NOT_COMPARABLE: 1 |
| **`test.jsonl`** | UNTRACKED | 83 | `BC42877721463890E7C5793B0D1B2F296916D000A56A6F1A3B822DDA1E75D7D6` | MATCH: 27, MISMATCH: 30, MISSING: 16, UNCERTAIN: 9, NOT_COMPARABLE: 1 |
| **`quarantined_anomalies.jsonl`**| UNTRACKED | 1 | `1686701B41FE508FFD8582CBE2BD399120610D695EE786C1530E397B1A5CF13A` | Record `v2-pair-01022` |
| **Total Deduped Pool** | UNTRACKED | 520 | `06CFA74D826B7B11C4DB33B298EB8F342C56E6DAE31518647295912C48C2AF3B` | MATCH: 159, MISMATCH: 185, MISSING: 111, UNCERTAIN: 60, NOT_COMPARABLE: 5 |

### Leakage and Overlap Audit
- Overlap between `train.jsonl` and `validation.jsonl`: **0 records (0.0%)**
- Overlap between `train.jsonl` and `test.jsonl`: **0 records (0.0%)**
- Overlap between `validation.jsonl` and `test.jsonl`: **0 records (0.0%)**
- **Correction Notice:** Previous documentation described these splits as "committed". They are currently **UNTRACKED in the working tree and not yet committed to Git**.

---

## 4. PLAYWRIGHT E2E EXECUTION EVIDENCE AUDIT

- **Suite File:** [`e2e/real-document-verification.spec.ts`](file:///d:/projects/form2fact/e2e/real-document-verification.spec.ts)
- **Execution Status:** 10 / 10 Tests Passed in 21.2s.
- **Labels Genuinely Exercised in Browser UI:**
  - `MISMATCH`: Exercised via Date Contradiction and Area Deficit buttons (Test 08).
  - `MATCH`: Exercised via Trust Variant button (Test 08).
  - `UNCERTAIN`: Exercised via Degraded OCR button (Test 08).
  - `MISSING`: Exercised via Omitted Evidence button (Test 08).
  - `NOT_COMPARABLE`: **NOT exercised in the browser UI** during Playwright run; covered only in backend unit test suites (Suite 23 / 24).

### Critical Distinction: Document Ingestion vs Evidence Verification
- **Test 03 (SFR College, 26 pages):** Full upload, magic-byte validation, document acceptance, and statutory rule re-run verification executed.
- **Test 09 (S.A. College, 25 pages):** Tests **successful PDF upload, server-side PDF validation, and page-count detection (25 pages)** in the application docket. Did not execute full automated rule extraction on that specific docket.
- **Test 10 (Good Shepherd AICTE EoA, 4 pages):** Tests **successful PDF upload and page-count detection (4 pages)** in the application docket. Did not execute full automated rule extraction on that specific docket.

---

## 5. PROVENANCE & REDISTRIBUTION AUDIT (DEMONSTRATION PDFs)

| Document | Provenance | Redistribution Rights Status | Pre-Commit Action Required |
| :--- | :--- | :--- | :--- |
| `SFR_College_Fire_Safety_Certificate.pdf` (26p) | Published on college website (`sfrcollege.edu.in`) for regulatory NAAC compliance. | Publicly accessible compliance record. No explicit open-source/CC license granting third-party code repo redistribution. | **FLAGGED FOR MANUAL APPROVAL** prior to public Git release. |
| `SA_College_Occupancy_Certificate.pdf` (25p) | Published on college website (`sacas.ac.in`) for institutional compliance. | Public structural compliance filing. Copyright and official seals remain with institution/issuing body. | **FLAGGED FOR MANUAL APPROVAL** prior to public Git release. |
| `Good_Shepherd_AICTE_EoA.pdf` (4p) | Public regulatory order issued by AICTE. | Public government regulatory instrument under Indian disclosure norms; commercial redistribution rights unspecified. | **FLAGGED FOR MANUAL APPROVAL** prior to public Git release. |

---

## 6. DEVSECOPS & CREDENTIAL HYGIENE AUDIT

1. **Working Tree Secrets Scan:**
   - 53 files (all tracked modified + all untracked files) scanned for API tokens (`bc_live_`, `AIza`, `sk-`, `ghp_`), raw passwords, private keys, Aadhaar numbers, and database binaries.
   - **Result: 0 secrets found.**
2. **Exclusion Validation:**
   - `.env` confirmed gitignored via `git check-ignore .env` $\rightarrow$ `.env`
   - `data/form2fact.db` confirmed gitignored via `git check-ignore data/form2fact.db` $\rightarrow$ `data/form2fact.db`
   - WAL/SHM files confirmed gitignored.
3. **Syntax Integrity & Whitespace:**
   - `git diff --check` executed $\rightarrow$ **0 whitespace errors on tracked unstaged files**.
   - *Technical Accuracy Note:* `git diff --check` inspects unstaged diffs of tracked files only; untracked files were independently validated via python syntax and json parsers.

---

## 7. RE-VERIFICATION TEST MATRIX (EXACT COMMANDS & EXIT CODES)

| Verification Gate | Exact Executed Command | Exit Code | Result Summary |
| :--- | :--- | :---: | :--- |
| **Dependency Audit** | `npm audit` | `0` | `found 0 vulnerabilities` |
| **Server Regression** | `npm test` (`tsx server/test-runner.ts`) | `0` | All 24 test suites passed (100%) |
| **Static Typecheck** | `npm run lint` (`tsc --noEmit`) | `0` | 0 TypeScript errors |
| **Held-Out Benchmark** | `python scripts/ml/benchmark_test_split.py` | `0` | 83 records evaluated; 96.39% accuracy; 30 MISMATCH support verified |
| **Python OCR Tests** | `python -m pytest ai_service/tests/test_ocr.py` | `0` | 5 passed in 2.34s |
| **Playwright E2E** | `npx playwright test e2e/real-document-verification.spec.ts` | `0` | 10 passed in 21.2s |

---

## 8. BENCHMARK INTEGRITY CONFIRMATION (83 RECORDS, 30 MISMATCH)

Running `python scripts/ml/benchmark_test_split.py` on the unchanged test split confirms:
- **Total records:** 83
- **Ground Truth Support:** `MISMATCH`: **30 records** (36.14%), `MATCH`: 27 (32.53%), `MISSING`: 16 (19.28%), `UNCERTAIN`: 9 (10.84%), `NOT_COMPARABLE`: 1 (1.20%).
- **Form2Fact Calibrated ML Engine Results:**
  - Overall Accuracy: **96.39%** (80/83)
  - `MISMATCH` Recall: **100.00%** (30/30)
  - `MISMATCH` Precision: **93.75%** (30/32)
  - `MISMATCH` F1: **0.9677**
  - Average Latency: 455.13 ms
- **Discrepancy Origin:** The numeral 25 was an accidental typographical copy-paste of the 25-page count of the S.A. College test document fixture into the markdown narrative. The underlying data and JSON results have always held 30 MISMATCH records. Zero data was modified.

---

## 9. DOCUMENTATION AUDIT & CONSTRAINING UNSUPPORTED CLAIMS

1. **Statutory Threshold Authority:** Corrected any wording implying Form2Fact sets regulatory rules. The platform strictly references existing AICTE Approval Process Handbook (APH) clauses (e.g. 30-year lease tenure, 7.50-acre contiguous land, Fire Safety NOC).
2. **Model Authority vs Human Authority:** The Four-Tier Authority Hierarchy explicitly declares that the **Human Scrutiny Officer is the Apex Sovereign Authority**. The native ML head is the statistical classifier, and LLMs are advisory drafting assistants only.
3. **Generalization Scope:** The 96.39% accuracy metric is strictly bounded to the held-out benchmark split ($N = 83$). Real-world institutional deployment requires supervised fine-tuning during pilot phases.
4. **OCR Accuracy Scope:** OCR extraction accuracy depends on host Tesseract binaries and scan quality. On degraded scans, the engine abstains to `UNCERTAIN`.
5. **Live AI Inference Scope:** BharatCode Qwen/DeepSeek endpoints require active API credits. In their absence, the gateway returns `HTTP 402 Payment Required` (`subscription_required`). The application fails closed and presents a diagnostic banner while core verification remains fully operational.

---

## 10. PRE-COMMIT GATE VERDICT

### **`APPROVED WITH MANUAL APPROVALS REQUIRED`**

**Manual Approvals Required Prior to Staging:**
1. **Redistribution Rights for Demonstration PDFs:** User must formally authorize the redistribution of the three institutional PDFs (`SFR_College_Fire_Safety_Certificate.pdf`, `SA_College_Occupancy_Certificate.pdf`, `Good_Shepherd_AICTE_EoA.pdf`) in the public Git repository, acknowledging they are publicly published institutional documents.
2. **Untracked Adaption Dataset Inclusion:** User must confirm staging the 9 untracked dataset and manifest files in `ai_service/ml/data/adaption/`.
3. **External Gateway Credit Dependency:** User must acknowledge that live Qwen/DeepSeek explanations require funded API credits, while native ML and deterministic rules operate autonomously.

*Zero files have been staged or committed. Awaiting explicit user instruction.*
