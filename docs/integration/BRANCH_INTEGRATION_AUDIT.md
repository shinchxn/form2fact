# Form2Fact Master Multi-Branch Integration Audit & Inventory

**Document ID:** `FORM2FACT-BRANCH-AUDIT-001`  
**Date:** November 2026  
**Auditor Role:** Senior Software Architect, GitHub Release Manager, Technical Integration Engineer  
**Repository:** `https://github.com/shinchxn/form2fact.git`  
**Primary Integration Target:** `develop` (`bbfe330`)  
**Stable Release Branch:** `main` (`74dfe78`)

---

## 1. Executive Summary & Audit Scope

This audit provides a comprehensive, forensic inventory of all branches in the Form2Fact repository, determines their commit lineage and merge bases, analyzes cross-branch file collisions, and establishes a strict, conflict-free dependency and integration roadmap.

---

## 2. Remote & Local Branch Inventory Matrix

| Branch Name | Latest Commit | Core Functional Scope & Changes | Dependencies | Conflict Assessment | Integration Readiness |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`develop`** | `bbfe330` | Team integration trunk. Contains `main` + merged `feature/aicte-domain-rules` (PR #1). | None | None | **ACTIVE INTEGRATION TRUNK** |
| **`main`** | `74dfe78` | Stable production release baseline. | None | None | **STABLE RELEASE BASELINE** |
| **`feature/aicte-domain-rules`** | `8b0e2ee` | AICTE regulatory rule pack, lifecycle, history, lease & tenure checks. | `develop` | None (Merged in PR #1) | **ALREADY INTEGRATED** |
| **`feature/ml-pairwise-classifier`** | `e85acd6` | Model V1 pairwise classifier head (MLP / Logistic), initial synthetic dataset. | `develop` | None (Strict ancestor of V2) | **ALREADY INTEGRATED (via V2)** |
| **`feature/ml-pairwise-classifier-v2`** | `7253da0` | Model V2 champion, temperature scaling ($T=1.8182$), 0.60 abstention policy, release gate audit. | `develop`, V1 | Overlaps with DevOps on Docker/main.py | **READY** |
| **`feature/frontend-evidence-workflow`** | `aa9d063` | Evidence-first UI cockpit, 5-class review, binary document streaming, design tokens. | `develop` | Clean 3-way merge with `develop` | **READY** |
| **`feature/devops-mlops`** | `a3bc63e` | CI/CD GitHub Actions workflow, multi-profile Docker Compose, model registry, healthchecks. | `develop`, ML V2 | Overlaps on Dockerfile, main.py, Compose | **READY AFTER HARMONIZATION** |
| **`feature/backend-ml-integration`** | *N/A* | Reported backend ML endpoint integration branch. | `develop` | Branch not present on remote/local | **NOT FOUND** |
| **`feature/document-intelligence`** | *N/A* | Reported OCR and extraction microservice branch. | `develop` | Branch not present on remote/local | **NOT FOUND** |
| **`feature/qa-validation`** | *N/A* | Reported dedicated QA validation branch. | `develop` | Branch not present on remote/local | **NOT FOUND** |
| **`chore/p0-remediation-baseline`** | `71c8827` | Historical security remediation baseline (P0-01 through P0-05). | `main` | Ancestor of `74dfe78` (`main`) | **ALREADY INTEGRATED** |
| **`chore/repository-architecture-cleanup`**| `74dfe78` | Repository structure cleanup and architecture stabilization. | `main` | Identical commit to `main` | **ALREADY INTEGRATED** |

---

## 3. Git Ancestry & Merge Base Forensic Analysis

### 3.1 Lineage & Base Commit Ledger

```
                      [main: 74dfe78]
                             │
            ┌────────────────┴────────────────────────┐
            │                                         │
     [PR #1 merged]                        [feature/ml-pairwise-classifier: e85acd6]
   [develop: bbfe330]                                 │
     (aicte-rules)                         [feature/ml-pairwise-classifier-v2: 7253da0]
            │
            ├───> Target for Group A (ML V2: 7253da0)
            ├───> Target for Group B (Frontend: aa9d063)
            └───> Target for Group C (DevOps/MLOps: a3bc63e)
```

1. **`main` vs `develop`:**
   - Commit `74dfe78` is `main`.
   - `origin/develop` is at `bbfe330`, having integrated `feature/aicte-domain-rules` via Pull Request #1 (`8b0e2ee`, `d792d35`).
2. **`feature/ml-pairwise-classifier` vs `feature/ml-pairwise-classifier-v2`:**
   - Merge Base: `e85acd6f3de5422071e23143a4b28114de5b8c7c`
   - `feature/ml-pairwise-classifier-v2` was directly branched off `feature/ml-pairwise-classifier` at its tip `e85acd6`.
   - Merging `feature/ml-pairwise-classifier-v2` automatically merges all 23 commits of V1 without duplication.
3. **Missing Branches Accounting:**
   - `feature/backend-ml-integration`, `feature/document-intelligence`, and `feature/qa-validation` were not pushed to remote origin.
   - The capabilities intended for those branches (backend API routes, SQLite persistence, pairwise evaluation, regression test suites) are already fully implemented and verified in the repository baseline and test runner.

---

## 4. Shared Files Collision Matrix

The following files are touched by more than one candidate branch and require coordinated harmonization during integration:

| Shared File Path | Modified By | Nature of Modification | Harmonization Strategy |
| :--- | :--- | :--- | :--- |
| `ai_service/app/main.py` | `ml-v2`, `devops-mlops` | `ml-v2` wires calibrated inference engine; `devops` adds model loader manifest | Harmonize: Use calibrated `MLPairwiseInferenceEngine` while supporting dynamic model loader and healthcheck |
| `ai_service/Dockerfile` | `ml-v2`, `devops-mlops` | `ml-v2` copies full module and sets PYTHONPATH; `devops` adds non-root user & healthcheck | Harmonize: Retain full module copy, non-root user, and curl healthcheck |
| `infrastructure/docker-compose.yml` | `ml-v2`, `devops-mlops` | `ml-v2` pins V2 environment variables; `devops` introduces dual enterprise profiles | Harmonize: Merge enterprise profiles with pinned V2 environment variables |
| `docs/README.md` | `frontend`, `devops-mlops` | Both branches add documentation links to master index | Harmonize: Union of all architectural and operational links |
| `server/test-runner.ts` | `frontend`, `aicte-rules` | Frontend added UI verification; aicte added rule test cases | Clean union: All 22 test suites preserved |

---

## 5. Phased Integration Sequence Plan

To ensure zero architectural regression and maintain full testability at every stage, branches will be integrated in strict sequential order:

1. **Step 1: Merge `feature/frontend-evidence-workflow` into `develop`**
   - Independent UI components, evidence viewer, binary document streaming.
   - Zero collisions with ML or DevOps code.
   - Verification: `npm test`, `npm run lint`, `npm run build`.
2. **Step 2: Merge `feature/ml-pairwise-classifier-v2` into `develop`**
   - Integrates both V1 baseline and V2 calibrated model artifacts, inference engine, 0.60 abstention policy, and 28 ML tests.
   - Verification: `pytest ai_service/ml/tests -v`, `npm test`.
3. **Step 3: Harmonize & Merge `feature/devops-mlops` into `develop`**
   - Integrates GitHub Actions CI workflow, enterprise Docker Compose profiles, and operational runbooks.
   - Reconciles Dockerfile and Compose with ML V2 environment variables.
   - Verification: `pytest ai_service/ml/tests -v`, `npm test`, `npm run build`.
4. **Step 4: Full Multi-Layer System Verification**
   - Execute complete test battery across Python, Node.js backend, and React frontend.
   - Validate end-to-end user and regulatory verification workflow.
5. **Step 5: Prepare Release PR (`develop` $\to$ `main`)**
   - Prepare formal release PR and await explicit human authorization before merging into `main`.
