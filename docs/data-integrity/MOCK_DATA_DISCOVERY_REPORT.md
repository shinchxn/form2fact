# FORM2FACT — MOCK DATA DISCOVERY REPORT
**Evidence-First Institutional Document Intelligence & Regulatory Cross-Verification Platform**  
**Document Reference:** `F2F-DOC-INTEG-01`  
**Target Branch:** `feature/remove-mock-data`  
**Base Commit:** `d7980a9` (Verified `develop`)  
**Audit Scope:** Full repository scan across frontend, backend, database initializers, and ML inference paths.  
**Date:** November 2026  
**Status:** COMPLETE AUDIT  

---

## 1. EXECUTIVE SUMMARY

In strict adherence to the mandate to eliminate all fabricated, mock, dummy, simulated, or placeholder operational data from Form2Fact runtime paths, an exhaustive forensic discovery scan was executed across the codebase.

Form2Fact must operate under the inviolable standard:
> **The application must never display invented information as if it came from a real institution, real application, real document, actual AI inference, or actual database record.**

This report documents every discovered occurrence of synthetic, hardcoded, or simulated data across `src/`, `server/`, `ai_service/`, configuration, and database layers, classifying each as either:
- **Operational Defect:** Fabricated data displayed to users as genuine runtime information.
- **Controlled Demo Fixture:** Developer fixtures intended for offline demonstration.
- **Legitimate Test/Benchmark Fixture:** Unit and integration test data isolated from production runtime.
- **Legitimate ML Training Dataset:** Synthetic and benchmark NLP pairs used for supervised classification training.

---

## 2. DISCOVERY TAXONOMY & AUDIT CLASSIFICATION

Every identified pattern was cataloged and audited against actual execution paths:

| Discovery Identifier | File Location | Pattern / Occurrence | Context & Usage | Classification | Risk Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **DISC-01** | `src/components/OverviewView.tsx:340-420` | Topic 02 Hardcoded Scenario Cards | Displayed static cards for St. Teresa, Apex, and Saraswati with hardcoded text and numbers. | **Operational Defect** | **HIGH** (Fabricated operational data) |
| **DISC-02** | `src/components/OverviewView.tsx:55-65` | Speculative Match Metric Formula | Calculated `matchCount = totalApps * 4 - (mismatches + missing)` instead of aggregating real database findings. | **Operational Defect** | **MEDIUM** (Misleading compliance metrics) |
| **DISC-03** | `src/components/SettingsView.tsx:28-60` | Hardcoded `demoUsers` Array | Displayed static user list instead of fetching real registered accounts from the database. | **Operational Defect** | **MEDIUM** (Bypasses user persistence) |
| **DISC-04** | `src/components/OverviewView.tsx:470, 587, 785` | Unbounded Empty Table Slices | Table bodies sliced arrays without handling empty states, rendering broken blank tables on clean databases. | **Operational Defect** | **LOW** (Poor empty-state UX) |
| **DISC-05** | `src/components/ReportsView.tsx:172` | Infinite Loading on Empty Docket | When database had 0 applications, dossier view stalled indefinitely on "Loading...". | **Operational Defect** | **LOW** (Fails to declare empty state) |
| **DISC-06** | `src/components/DocumentReviewView.tsx:275` | Broken Canvas on 0 Documents | Attempted to read `activeDoc.documentType` when 0 documents existed, rendering broken `undefined` headers. | **Operational Defect** | **LOW** (Fails to declare empty state) |
| **DISC-07** | `server/db.ts:312-325` | Unconditional Demo Seeding | Initialized `app-1104`, `app-0842`, `app-0915` into SQLite regardless of `NODE_ENV`. | **Operational Defect** | **CRITICAL** (Pollutes production storage) |
| **DISC-08** | `server/modules/verification/pairwiseEngine.ts:283, 320` | Masqueraded Heuristic Classification | Token overlap screening returned `isDeterministic: false` and `MODEL_VERSION: '...v2.0-remediated'` without ML model involvement. | **Operational Defect** | **HIGH** (Simulated AI / silent heuristic) |
| **DISC-09** | `server/test-runner.ts:200-350` | Regression Test Fixtures | Fixtures for compliant, mismatch, missing, and corrupted document cases. | **Legitimate Test Fixture** | **ZERO** (Isolated to `npm test`) |
| **DISC-10** | `ai_service/ml/data/train.jsonl` | 1,250 Synthetic Pairwise Training Records | Supervised dataset pairs for SentenceTransformer fine-tuning. | **Legitimate Training Data** | **ZERO** (Strictly offline ML training) |
| **DISC-11** | `ai_service/ml/data/test_rigorous.jsonl` | 41 Public Benchmark Records | Benchmark dataset for statistical model validation. | **Legitimate Benchmark Data** | **ZERO** (Statistical evaluation only) |

---

## 3. INVENTORY OF DISCOVERED OPERATIONAL DATA DEFECTS

### 3.1 Topic 02 Hardcoded Scenario Cards (`OverviewView.tsx`)
- **Found:** An array of 3 hardcoded scenario cards in the Executive Overview that rendered static descriptions and badge states regardless of what existed in the SQLite database.
- **Root Cause:** Developer prototyping shortcut from early sprint mockups.
- **Impact:** Misinformed users by displaying synthetic colleges that did not exist in the database.

### 3.2 Speculative Match Count Metric (`OverviewView.tsx`)
- **Found:** `const matchCount = Math.max(0, totalApps * 4 - (mismatchCount + missingCount + uncertainCount));`
- **Root Cause:** Inferred heuristic calculation assuming 4 checks per institution rather than executing actual database aggregations.
- **Impact:** Displayed fabricated concordance numbers on unverified applications.

### 3.3 Hardcoded Settings Personas (`SettingsView.tsx`)
- **Found:** Static in-memory array `demoUsers` hardcoded directly into the React component file.
- **Root Cause:** Authentication prototype before database `/api/v1/users` endpoint was stabilized.
- **Impact:** Disconnected from database user records; role edits did not reflect real persistence.

### 3.4 Production Database Demo Seeding (`server/db.ts`)
- **Found:** `seedDefaultData()` automatically inserted 3 demo institutions (`app-1104`, `app-0842`, `app-0915`) into the persistent SQLite database upon server initialization.
- **Root Cause:** Lack of environment gating separating development test fixtures from production runtime.
- **Impact:** Deployed production instances would immediately contain synthetic higher-education institutions.

### 3.5 Masqueraded Pairwise Classification (`pairwiseEngine.ts`)
- **Found:** In the absence of the Python FastAPI microservice, lexical token overlap was labeled with `isDeterministic: false` and the ML model version string.
- **Root Cause:** Lack of explicit dual-mode separation between machine learning inference and deterministic regex/overlap screening.
- **Impact:** Users could believe a lexical token count was a calibrated neural network prediction.

---

## 4. PRESERVED LEGITIMATE DATASETS

The following assets were forensically inspected and confirmed as **strictly isolated from operational production runtime**. They are preserved in full:
1. `ai_service/ml/data/train.jsonl` (Supervised training corpus)
2. `ai_service/ml/data/val.jsonl` (Validation set for temperature calibration)
3. `ai_service/ml/data/test_rigorous.jsonl` (Frozen statistical benchmark)
4. `server/test-runner.ts` (Phase 1 backend integration test cases)
5. `server/domains/aicte/aicte-rules.json` (Statutory AICTE Approval Process Handbook regulatory rule definitions)

---

## 5. CONCLUSION

Every mock, dummy, and fabricated operational data path has been identified and cataloged. None of the identified operational defects will be replaced with alternate synthetic values; all components are being converted to real database, API, and microservice bindings with truthful empty states.
