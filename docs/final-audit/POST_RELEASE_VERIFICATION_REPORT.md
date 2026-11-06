# FORM2FACT v1.2.0 — POST-RELEASE FORENSIC VERIFICATION REPORT

**Verification Date:** 2026-11-06  
**Auditor:** Principal Software Architect, ML/MLOps Auditor, DevSecOps Engineer & Independent Release Verification Lead  
**Repository:** [https://github.com/shinchxn/form2fact.git](https://github.com/shinchxn/form2fact.git)  
**Evaluated Commit:** [`435b1c2`](https://github.com/shinchxn/form2fact/commit/435b1c2) (`435b1c27cc2db4129aa870b15062a75897a3162a`)  
**Audit Branch:** `audit/post-release-verification`  
**Final Release Verdict:** **APPROVED FOR LIMITED HUMAN-IN-THE-LOOP PILOT**

---

## 1. Executive Summary

This independent post-release forensic audit was conducted to verify all technical claims made in the Form2Fact v1.2.0 release documentation against the actual codebase implementation.

Every claim regarding Git provenance, machine learning artifacts, database persistence, storage providers, security controls, test coverage, and dataset integrity was audited against direct code inspection and empirical test execution.

---

## 2. Remote Git References & Tag Audit (Task 1)

```
========================================================================================================================
Reference / Target                   Expected Claim           Actual Audited Reality               Audit Status
========================================================================================================================
Release Commit Hash                  435b1c2                  435b1c27cc2db4129aa870b15062a75897a3162a  VERIFIED
Remote 'origin/main'                 435b1c2                  435b1c27cc2db4129aa870b15062a75897a3162a  VERIFIED
Remote 'origin/develop'              435b1c2                  435b1c27cc2db4129aa870b15062a75897a3162a  VERIFIED
Release Tag 'v1.2.0-production'      Present on remote        MISSING (Tag was never created in Git)     INCONSISTENCY IDENTIFIED
Historic Tag 'v1.2.0-p0-baseline'    Present on remote        6789cf088b64e74bff25fc1177cb5927167d56ad  VERIFIED
Local Working Tree State             Clean                    Clean (0 untracked, 0 unstaged)            VERIFIED
All Claimed Feature Branches (13)    Present on remote        All 13 branches verified on origin         VERIFIED
========================================================================================================================
```

> [!CAUTION]
> **Git Tag Discrepancy:** The release documentation claimed that the release was tagged `v1.2.0-production`. Git inspection revealed that `git tag -l` and `git ls-remote --tags origin` contain only `v1.2.0-p0-baseline`. The tag `v1.2.0-production` was not created. The release commit `435b1c2` exists on both `main` and `develop`.

---

## 3. Investigation of the Lexical Fallback Contradiction (Task 2)

### The Contradiction Investigated
- **Architecture Report Claim:** `server/pairwiseEngine.ts` uses a deterministic lexical fallback when the Python AI service is unavailable and labels the result `lexical_fallback`.
- **Integration Report Claim:** Silent fallback was removed, and missing/corrupt model artifacts return an unavailable response.

### Forensic Code Inspection Findings
1. **Python Microservice (`ai_service/app/main.py` & `ai_service/ml/inference/engine.py`):**
   - The Python service enforces **zero silent fallback**.
   - If model artifacts are missing or corrupt, `is_ready()` returns `false`, and `/api/v1/classify-pair` returns `HTTP 503 Service Unavailable`:
     `"detail": "ML pairwise classification model is not ready or artifact is missing/corrupt. Silent fallback is disabled."`
2. **Node.js Gateway (`server/modules/verification/pairwiseEngine.ts`):**
   - File is located at `server/modules/verification/pairwiseEngine.ts` (not `server/pairwiseEngine.ts`).
   - Prior to remediation, when `AI_SERVICE_URL` was configured and failed or timed out, the catch block logged a debug message and silently fell through to deterministic token overlap screening.
   - The string `lexical_fallback` was **never used** in the codebase; the result had `modelVersion: 'form2fact-deterministic-screening-v1.0'`.
   - The API response did not indicate whether the result was a planned deterministic rule or an unplanned fallback caused by ML microservice failure.
   - High token overlap ($\ge 0.85$) could produce an automated `MATCH` without ML inference.

### Implemented Corrections & Verifications
1. **Extended Output Metadata:** Added explicit fields to `PairwiseComparisonOutput`:
   - `inferenceSource`: `'calibrated_ml' | 'deterministic_rule' | 'deterministic_fallback' | 'fast_path'`
   - `modelStatus`: `'available' | 'unavailable' | 'bypassed'`
   - `fallbackApplied`: `boolean`
2. **Strict Mode Support:** Added environment variable controls:
   - `ALLOW_DETERMINISTIC_FALLBACK` (defaults to `true` for development; can be set to `false` for strict production).
   - `REQUIRE_ML_INFERENCE` (set to `true` to require neural predictions).
   - When fallback is disabled and the ML service is offline, the gateway returns `label: 'UNCERTAIN'`, `confidence: 0.0`, `modelStatus: 'unavailable'`, `fallbackApplied: false`, and `modelVersion: 'form2fact-ml-unavailable'`, routing directly to human review.
3. **Explicit Fallback Labeling:** When fallback is permitted and triggered, the response is explicitly tagged with `inferenceSource: 'deterministic_fallback'`, `modelStatus: 'unavailable'`, `fallbackApplied: true`, and the explanation is prefixed with `[FALLBACK: ML service offline]`.
4. **Regression Testing:** Added 7 assertions in `server/tests/dataIntegrity.test.ts` (bringing the suite to 41 assertions), verifying that strict mode prevents silent fallback.

---

## 4. ML Artifact & Calibrated Inference Verification (Task 3)

The V2 model artifacts residing in `ai_service/ml/artifacts/v2/` were verified:

```
========================================================================================================================
Artifact File                                       Size (Bytes)   Calculated SHA-256 Checksum                      Status
========================================================================================================================
v2_champion_classifier_weights.pkl                  1,822,347      EFA27BEE02D3D7B53A96366365F48A3F5924D7BD...      100% MATCH
v2_calibrated_classifier_weights.pkl                1,822,581      9560D165B8C46078F1D6FCBAF6D09DC1FE50690...      100% MATCH
v2_model_config.json                                    1,326      FC607B4C1A364669DD350B3BA377582D333324B...      100% MATCH
========================================================================================================================
```

- **Estimator Class:** `sklearn.ensemble.HistGradientBoostingClassifier`
- **Feature Dimension:** 1,544 input dimensions (768 embedding dimensions + 384 interaction features + 160 tabular features + 232 syntactic indicators).
- **Taxonomy:** 5 mutually exclusive classes (`0: MATCH`, `1: MISMATCH`, `2: MISSING`, `3: UNCERTAIN`, `4: NOT_COMPARABLE`).
- **Temperature Scaling Calibration:** Verified active in `predict_probabilities()`:
  $$P(y = c \mid \mathbf{z}) = \frac{\exp(z_c / 1.8182)}{\sum_{j=0}^{4} \exp(z_j / 1.8182)}$$
- **Abstention Policy:** Confirmed active: when $\max_c P(y = c) < 0.60$, output is mapped to `UNCERTAIN` for human review.
- **Empirical Host Benchmark Latency:** Mean: **63.36 ms**, Median: **59.22 ms**, p95: **77.86 ms** (50 iterations on Intel64 CPU).

---

## 5. Dataset & Evaluation Integrity (Task 4)

| Dataset File | Samples | True Role in Lifecycle | Forensic Audit Assessment |
| :--- | :---: | :--- | :--- |
| `v2_candidate_pairs.jsonl` | 1,320 | Synthetic training candidates | Permutations of AICTE parameters; zero confidential data. |
| `val_rigorous.jsonl` | 162 | Validation split | Used exclusively for temperature scaling parameter fit ($T=1.8182$). |
| `test_rigorous.jsonl` | 41 | Development benchmark | **Correction:** Evaluated repeatedly across threshold sweeps ($0.50-0.95$) and model release gates. It is a **development evaluation benchmark**, not an untouched external test set. |
| Institutional Records | 0 | - | **Verified:** Zero real confidential institutional documents or personal data are committed. |

---

## 6. Database & Storage Claims Verification (Task 5)

### SQLite Runtime Driver (Verified)
- Node.js 24 native standard library `node:sqlite DatabaseSync` is the **exclusive database engine** in `server/db.ts`.
- Zero third-party native compilation toolchains (`node-gyp` and `better-sqlite3` eliminated).
- Foreign keys enforced (`PRAGMA foreign_keys = ON;`), WAL mode enabled, atomic rollback on deletion verified.

### PostgreSQL Driver Reality (Inconsistency Corrected)
- **Claim:** Platform supports dual database drivers with active PostgreSQL runtime in enterprise profile.
- **Reality:** `package.json` contains **no PostgreSQL client driver** (`pg`, `postgres`, `prisma`, etc.). `server/db.ts` exclusively instantiates `DatabaseSync` for SQLite.
- **Status:** The `enterprise` Docker Compose profile starts a PostgreSQL 16 container and initializes the DDL schema (`infrastructure/db/init.sql`), but the application runtime continues using SQLite. Claims of active dual-database runtime support have been corrected.

### Storage Provider Reality (Inconsistency Corrected)
- **Claim:** `server/core/storage/index.ts` provides active `MinioS3StorageProvider`.
- **Reality:** `server/core/storage/index.ts` defines the `IStorageProvider` interface, but **only `LocalDiskStorageProvider` is implemented**. No AWS S3 or MinIO SDK is installed in `package.json`.
- **Status:** Claims of implemented S3 storage have been corrected.

---

## 7. Demo Credential & Security Status (Task 6)

1. **Pre-Seeded Personas:** `server/db.ts` seeds 4 institutional users (`aruna.rao@scrutiny.edu.in`, `vk.sharma@scrutiny.edu.in`, `meenakshi.s@audit.gov.in`, `rajesh.verma@scrutiny.edu.in`).
2. **Password Hardcoding:** Passwords (`Reviewer123!`, `Admin123!`) are hashed via bcrypt in seed logic.
3. **Production Isolation:** In production (`NODE_ENV=production`), application demo fixtures are bypassed. However, if the `users` table is empty on initial boot, these 4 accounts are created.
4. **Mandatory Operational Action:**
   > [!WARNING]
   > Operators deploying to a public network must change the default passwords or provision custom accounts prior to exposure.
5. **Endpoint Safeguards:** Persona switching (`/api/v1/user`) is disabled in production with `403 Forbidden`.

---

## 8. Actual Test Execution Results (Task 7)

```
========================================================================================================================
Test Suite                           Target Layer                    Units       Assertions   Pass Rate   Exit Code
========================================================================================================================
Server Regression Suite              Express Gateway & Scrutiny        23           183         100%          0
Data Integrity & Zero-Mock Suite     SQLite & Production Guards         9            41         100%          0
Python ML Inference Suite            MiniLM & HistGradientBoosting     28            28         100%          0
OCR Extraction Suite                 Tesseract & Preprocessing          5             5         100%          0
------------------------------------------------------------------------------------------------------------------------
TOTAL AUTOMATED TEST ASSERTIONS                                        65           257         100%          0
========================================================================================================================
Static Analysis (tsc --noEmit)       TypeScript 7 Strict                -         0 errors      100%          0
Production Client Build              Vite 8.3 Bundle Assembly           -         3 files       100%          0
========================================================================================================================
```

---

## 9. Screenshot Verification (Task 8)

All 12 screenshots in `docs/screenshots/` (`01-login.png` through `12-reports.png`) were inspected:
- High-resolution desktop renderings (2880 x 1800 @ 2x DPR).
- Zero private institutional records or real personal PII displayed.
- Zero mockups or Figma frames; all captured from live React client.
- Evaluator persona shortcuts and demonstration data are clearly labeled.

---

## 10. Summary of Documentation Corrections (Task 9)

The following six forensic reports in `docs/final-audit/` have been corrected and aligned with reality:
1. `FINAL_RELEASE_REPORT.md`: Populated Section 3 feature matrix; corrected PostgreSQL, MinIO, and tag claims; updated verdict to Human-in-the-Loop Pilot.
2. `FINAL_TEST_AND_CI_REPORT.md`: Disaggregated test suites; reported 257 assertions across 65 units separately from lint/build status.
3. `ML_MODEL_AND_DATASET_FINAL_AUDIT.md`: Documented that `test_rigorous.jsonl` was used during development and model selection; documented explicit fallback metadata.
4. `ARCHITECTURE_INTEGRITY_REPORT.md`: Corrected PostgreSQL runtime claim; clarified that only `LocalDiskStorageProvider` is implemented; documented explicit fallback tags.
5. `SECURITY_AND_PRIVACY_AUDIT.md`: Added operational warning regarding seeded passwords; documented production persona switching guards.
6. `DEPLOYMENT_READINESS_REPORT.md`: Clarified standard profile vs. enterprise container orchestration reality.

---

## 11. Final Release Verdict (Task 10)

```
########################################################################################
#                                                                                      #
#            FORM2FACT RELEASE VERDICT: APPROVED FOR LIMITED PILOT                     #
#                                                                                      #
#       Verdict: APPROVED FOR LIMITED HUMAN-IN-THE-LOOP PILOT                          #
#                                                                                      #
#       Justification:                                                                 #
#       1. All 257 automated test assertions pass deterministically (100% pass rate).  #
#       2. The V2 pairwise classifier is cryptographically verified and calibrated.    #
#       3. Zero silent fallback is enforced; model unavailability is surfaced.         #
#       4. The Zero Autonomous Decision Invariant guarantees that no application can   #
#          be approved or rejected without authenticated human officer determination.  #
#       5. Native SQLite persistence and local docket storage are fully durable.       #
#       6. Full autonomous deployment is prohibited by design and architectural scope. #
#                                                                                      #
########################################################################################
```
