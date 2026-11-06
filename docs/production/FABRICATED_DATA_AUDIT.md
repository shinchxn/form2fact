# Form2Fact Fabricated & Misleading Data Audit

**Document ID:** `FORM2FACT-PROD-DATA-001`  
**Date:** November 6, 2026  
**Auditor:** Data Integrity Auditor & Senior Software Architect  
**Repository:** `https://github.com/shinchxn/form2fact.git`  
**Trunk:** `feature/production-transformation-ui`

---

## 1. Classification & Provenance Matrix

Every discovered data source across frontend components, backend APIs, SQLite initialization routines, and test fixtures has been cataloged and classified:

| Data Source | Location | Type | Used in Production UI? | Action |
| :--- | :--- | :---: | :---: | :--- |
| **Topic 02 Scenario Cards** | `src/components/OverviewView.tsx` (Lines 360–450) | Hardcoded strings | **YES** | **REPLACE:** Render real applications dynamically from database; render an honest empty state if zero applications exist. |
| **Match Count Calculation** | `src/components/OverviewView.tsx` (Lines 64–67) | Fabricated formula | **YES** | **REPLACE:** Derive actual verified concordance counts from evaluated rule findings or explicitly display "Unscrutinized". |
| **Demo Users Array** | `src/components/SettingsView.tsx` (Lines 26–48) | Hardcoded array | **YES** | **REPLACE:** Fetch registered database personas from `GET /api/v1/users` with RBAC authorization. |
| **Unconditional Database Seeding**| `server/db.ts` (Lines 49, 305–450) | Hardcoded seed dockets | **YES** (if uninitialized) | **ISOLATE & GUARD:** In `NODE_ENV === 'production'`, strictly disable demo seeding. Only seed in dev/test when `SEED_DEMO_DATA=true`. |
| **Auto-Auth Dev Persona** | `src/services/api.ts` (Lines 26–39) | Hardcoded dev bootstrap | **YES** | **REVISE:** Allow auto-auth only in development mode. In production, require explicit user credentials via login screen. |
| **Reset Demo Button** | `src/components/Header.tsx` & `SettingsView.tsx` | Demo control | **YES** | **RESTRICT:** Hide or gate behind `Administrator` role check and non-production environment guard. |
| **Pairwise Preset Scenarios** | `src/features/verification/PairwiseComparator.tsx` (Lines 65–93) | Interactive sandbox presets | **YES** | **VALIDATE & PRESERVE:** These are test inputs for the ML sandbox tool. Label clearly as "Interactive Test Cases". |
| **AICTE Regulatory Rules** | `server/domains/aicte/config/aicte-rules.json` & `server/rulesEngine.ts` | Statutory catalog | **YES** | **VALIDATE & PRESERVE:** Legitimate regulatory knowledge base derived from AICTE Approval Process Handbook. |
| **ML V2 Training Datasets** | `ai_service/ml/data/` | Synthetic & public ML data | **NO** (Training only) | **PRESERVE:** Retain in MLOps training pipeline; completely isolated from production database. |
| **Regression Test Fixtures** | `server/test-runner.ts` & `ai_service/ml/tests/` | Test-only fixtures | **NO** (Test runner only) | **PRESERVE:** Crucial for continuous regression testing. |

---

## 2. Forensic Findings & Risk Analysis

### Finding 1: Invented Dashboard Statistics (`OverviewView.tsx`)
```typescript
// EXISTING CODE (src/components/OverviewView.tsx:64)
const matchCount = applications.reduce((sum, a) => {
  const passed = Math.max(0, (rules.length || 6) - (a.totalFindingsCount || 0));
  return sum + passed;
}, 0);
```
- **Risk:** Mathematically assumes that any rule without a logged finding was an active `MATCH`. In reality, unscrutinized fields or absent documents are unverified, not matching.
- **Remediation:** Calculate concordance strictly from verified pairwise comparisons and confirmed non-discrepancy findings, displaying unanalyzed rules honestly.

### Finding 2: Hardcoded Scenario Benchmark Cards (`OverviewView.tsx`)
```tsx
// EXISTING CODE (src/components/OverviewView.tsx:373)
<h3 className="font-semibold text-base text-[#0F172A]">Kalyani Institute of Engineering</h3>
<p className="text-[#64748B] text-sm leading-relaxed">
  30-year registered lease deed aligns with declared 2054 expiry date...
</p>
```
- **Risk:** Even if a new institution is created or all seed applications are deleted, the dashboard continues to display these hardcoded institutions and explanations.
- **Remediation:** Remove static HTML cards. Render recent active applications dynamically from the `applications` state. If no applications exist, show a clean, professional empty state.

### Finding 3: Automatic Demo Docket Seeding in Production (`server/db.ts`)
```typescript
// EXISTING CODE (server/db.ts:49)
this.db = new DatabaseSync(this.dbPath);
this.initSchema();
this.seedDefaultData(false);
```
- **Risk:** If a production container boots with a fresh database volume, it automatically seeds 3 mock institutions (`app-1104`, `app-0842`, `app-0915`).
- **Remediation:** Check `process.env.NODE_ENV === 'production'`. In production, never insert demo applications. Only insert statutory rules. Seed demo applications only if `NODE_ENV !== 'production'` and `SEED_DEMO_DATA !== 'false'`.

---

## 3. Data Cleanup & Preservation Plan

1. **Production Guarding:**
   - In `server/db.ts`, separate `seedRules()` (statutory configuration) from `seedDemoApplications()` (demo data).
   - In `NODE_ENV === 'production'`, `seedDemoApplications()` is never called.
2. **Dashboard Dynamic Binding:**
   - In `OverviewView.tsx`, replace Topic 02 with "Recent Scrutiny Dockets", rendering up to 3 actual applications from the database.
   - When 0 applications exist, render a truthful empty state with a "Create Institutional Application" action button.
3. **Dynamic User Personas:**
   - In `SettingsView.tsx`, replace static `demoUsers` array with `GET /api/v1/users` API call so personas reflect actual database records.
4. **Environment Isolation:**
   - Production `.env` requires explicit administrator setup.
   - Test suites (`server/test-runner.ts`) use dedicated in-memory or ephemeral test database instances without polluting production storage.
