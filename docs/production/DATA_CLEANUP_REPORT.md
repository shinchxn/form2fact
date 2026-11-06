# Form2Fact Data Integrity Cleanup Report

**Document ID:** `FORM2FACT-PROD-CLEANUP-001`  
**Date:** November 6, 2026  
**Auditor:** Data Integrity Auditor & Senior Backend Engineer  
**Repository:** `https://github.com/shinchxn/form2fact.git`  
**Branch:** `feature/production-transformation-ui`

---

## 1. Executive Summary

In compliance with Part 3 of the Production Transformation Specification, all fabricated, simulated, and hardcoded data paths have been eliminated from production runtime flows. 

Key outcomes:
1. **Production Seeding Guard:** `server/db.ts` now decouples the statutory regulatory rules catalog from sample application dockets. In `NODE_ENV=production`, demo applications and documents are never seeded.
2. **Dynamic Dashboard Metrics:** The Overview dashboard now renders real database-backed institutional records and genuine finding counts. The hardcoded scenario cards in Topic 02 have been eliminated.
3. **True Empty States:** When no institutional records exist, the platform renders a truthful empty state rather than inventing records to make the screen look populated.
4. **Preservation of Legitimate Test Assets:** ML training datasets (`ai_service/ml/data/`) and unit test fixtures (`server/test-runner.ts`) remain intact and isolated in their respective development test suites.

---

## 2. Implemented Code Remediations

### 2.1 Backend Database Seeding Guard (`server/db.ts`)
- **Refactoring:** Split `seedDefaultData()` into:
  - `seedStatutoryRules()`: Always runs to populate the official AICTE regulatory rule catalog (`RULE-TEN-01` to `RULE-SAFETY-06`).
  - `seedDefaultUsers()`: Seeds base administrative personas with bcrypt hashed credentials.
  - `seedDevelopmentFixtures()`: Strictly gated behind `process.env.NODE_ENV !== 'production' && process.env.SEED_DEMO_DATA !== 'false'`.
- **Production Invariant:** A fresh production deployment starts with an empty institutional docket table (`applications`), awaiting real user submissions.

### 2.2 Dynamic Dashboard Binding (`src/components/OverviewView.tsx`)
- **Removed:** Static scenario cards hardcoding "Kalyani Institute", "Pragati Institute", and "Vidyapeeth Academy".
- **Added:** Dynamic "Recent Scrutiny Dockets" section querying the live `applications` state. If `applications.length === 0`, it displays a clean empty state with a "New Application" CTA.
- **Accurate Metric Derivation:** Replaced the speculative match count formula (`Math.max(...)`) with actual evaluated non-discrepancy rules.

### 2.3 User Persona Management (`src/components/SettingsView.tsx`)
- **Removed:** Static frontend `demoUsers` array.
- **Added:** Async `GET /api/v1/users` retrieval ensuring that only authenticated, database-persisted accounts are presented.

---

## 3. Preserved Legitimate Datasets & Test Fixtures

| Dataset / Fixture | Location | Purpose | Isolation Mechanism |
| :--- | :--- | :--- | :--- |
| **V2 ML Champion Weights** | `ai_service/ml/artifacts/v2/` | Calibrated pairwise inference | Model registry manifest |
| **V1 ML Fallback Weights** | `ai_service/ml/artifacts/` | Operational rollback pathway | Environment variable toggle |
| **Synthetic ML Training Data**| `ai_service/ml/data/` | NLP feature extraction training | Isolated in `ai_service/` |
| **Controlled Test Benchmark** | `ai_service/ml/data/splits/` | Reproducible latency and F1 checks| Read-only test runner |
| **Backend Test Fixtures** | `server/test-runner.ts` | 23 test suites (123 assertions) | Ephemeral in-memory database |

---

## 4. Verification & Validation Evidence

1. **Automated Test Check:** `npm test` executed with zero regressions across all 23 backend test suites.
2. **Empty State Check:** Verified that emptying the `applications` table displays empty state indicators without UI runtime errors.
3. **Production Mode Check:** Tested `NODE_ENV=production tsx server.ts` verifying that demo applications are not inserted into a fresh SQLite file.
