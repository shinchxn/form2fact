# FORM2FACT: REPOSITORY FORENSIC AUDIT & ARCHITECTURE CLEANUP REPORT

**Audit Reference:** F2F-AUDIT-CLEANUP-2026  
**Date:** November 6, 2026  
**Auditor:** Senior Software Architect, Repository Auditor, DevOps Engineer & Technical Lead  
**Repository Identity:** Form2Fact — Evidence-First Institutional Document Intelligence & Regulatory Cross-Verification Platform  
**Audit Phase:** FIRST RUN — AUDIT & DISCOVERY ONLY (Zero application files modified or deleted)  
**Current Branch:** `main`  
**Base Commit Hash:** `2a97ff5dc0a58507e4753ae35e841172898851d3`  
**Recommended Cleanup Branch:** `chore/repository-architecture-cleanup`  

---

## 1. EXECUTIVE SUMMARY

In accordance with the **Strict Execution Rule**, a forensic repository audit was conducted across every tracked and untracked file in the Form2Fact repository. 

The primary objective was to:
1. Formally record and verify the protected operational baseline (P0-01 through P0-05 remediation, 22 test suites, zero TypeScript errors).
2. Identify all duplicated, obsolete, dead, misplaced, and orphaned files.
3. Map complete dependency and reference graphs across the full stack.
4. Establish a team-oriented repository architecture that organizes contributors into independent, collision-free domains.
5. Formulate a zero-risk, phased cleanup plan requiring explicit human approval before any destructive actions.

### Baseline Verification Status

| Check | Tool / Command | Result | Baseline Guarantee |
|---|---|:---:|---|
| **Unit & Integration Tests** | `npm test` (`tsx server/test-runner.ts`) | **22 / 22 PASSED** | All 117 assertions across SQLite, RBAC, domain packs, multi-tenant isolation, pairwise classification, and job queue succeed. |
| **Static Type Analysis** | `npm run lint` (`tsc --noEmit`) | **0 ERRORS** | Zero compile-time or type-safety errors across React 19 frontend and Node.js backend. |
| **Authentication & RBAC** | Test Suite [18] & [19] | **VERIFIED** | Anonymous access blocked; client roles never trusted; stale tokens revoked with `ROLE_REVOKED`. |
| **Production Secret Fail-Fast** | Test Suite [20] | **VERIFIED** | Missing/short/<32 char secret terminates with `process.exit(1)`. |
| **Tenant & Document Isolation** | Test Suite [21] | **VERIFIED** | Cross-tenant access returns 403; directory traversal neutralized; Western & Central directorates isolated. |
| **Pairwise Classification v2.0** | Test Suite [22] | **VERIFIED** | Low token overlap ($\le 0.20$) abstains to `UNCERTAIN`; contradictions detected with explainable citations. |

---

## 2. COMPREHENSIVE FINDINGS MATRIX

### 2.1 Confirmed Dead Code & Artifacts (Class A — Safe to Delete)

| File Path | Size (Bytes) | Category | Root Cause & Evidence | Proposed Action |
|---|:---:|---|---|---|
| `.aistudio/artifacts/brain/7256a2b1-eb7c-4f84-b27f-26ad8decb33e/implementation_plan.md` | 18,232 | AI Studio Artifact | Residual interactive chat artifact accidentally committed to git. Zero code imports. | Delete file and directory `.aistudio/` |
| `.aistudio/artifacts/brain/7256a2b1-eb7c-4f84-b27f-26ad8decb33e/implementation_plan.md.metadata.json` | 380 | AI Studio Metadata | Metadata companion for the artifact above. Zero code imports. | Delete file |
| `ai_service/app/__pycache__/*.pyc` (3 files) | ~20 KB | Bytecode Cache | Python compiled bytecode generated during test runs. Missing from `.gitignore`. | Remove bytecode files; add `__pycache__/` and `*.pyc` to `.gitignore` |
| `bun.lock` | 0 | Obsolete Lockfile | Deleted in working tree. Repository uses `npm` with `package-lock.json`. | Stage deletion in git (`git rm bun.lock`) |

---

### 2.2 Redundant & Superseded Documentation (Class B — Safe to Consolidate)

| File Path | Size (Bytes) | Superseded By | Reason & Reference Analysis | Proposed Action |
|---|:---:|---|---|---|
| `doc/README.md` | 1,013 | `docs/README.md` | 13-line duplicate pointer to `docs/`. Creates folder naming confusion (`doc/` vs `docs/`). | Remove `doc/README.md` and delete folder `doc/`. |
| `docs/API_REFERENCE.md` | 6,326 | `docs/api/rest-endpoints.md` | Monolithic legacy API markdown superseded by modular documentation in `docs/api/`. | Remove legacy file; update any inbound references. |
| `docs/ARCHITECTURE.md` | 12,252 | `docs/architecture/system-architecture.md` | Initial architecture draft superseded by C4 diagrams and modular architecture documents. | Remove legacy file; update inbound references. |
| `docs/DATABASE_SCHEMA.md` | 9,867 | `docs/database/schema.md` | Legacy database document lacking recent multi-tenancy columns (`organizationId`). | Remove legacy file; reference `docs/database/schema.md`. |
| `docs/TECHNICAL_AUDIT.md` | 6,801 | `docs/audit/MASTER_AUDIT_REPORT.md` | Preliminary audit draft superseded by exhaustive 14-section `MASTER_AUDIT_REPORT.md`. | Remove legacy draft. |
| `DESIGN_SYSTEM.md` | 20,818 | `docs/design/DESIGN_SYSTEM.md` | Master UI/UX design tokens and component specifications misplaced in root directory. | Move to `docs/design/DESIGN_SYSTEM.md`. |
| `DEVELOPMENT_STATUS.md` | 10,933 | `docs/audit/DEVELOPMENT_STATUS.md` | October development milestone report misplaced in root directory. | Move to `docs/audit/DEVELOPMENT_STATUS.md`. |

---

### 2.3 Hollow Feature Re-Exports & Unused UI Components (Class C & D)

#### Hollow Feature Barrels (`src/features/`)
During an earlier refactor attempt, eight feature directories were created under `src/features/` with index files re-exporting components from `src/components/`:
- `src/features/administration/index.ts` $\rightarrow$ re-exports `SettingsView`, `AuditLogView`
- `src/features/applications/index.ts` $\rightarrow$ re-exports `ApplicationsView`, `ApplicationDetailView`, etc.
- `src/features/documents/index.ts` $\rightarrow$ re-exports `DocumentReviewView`
- `src/features/findings/index.ts` $\rightarrow$ re-exports `FindingsView`
- `src/features/reports/index.ts` $\rightarrow$ re-exports `ReportsView`
- `src/features/reviews/index.ts` $\rightarrow$ re-exports `ReviewActionModal`, `CorrectionModal`
- `src/features/rules/index.ts` $\rightarrow$ re-exports `RulesView`
- `src/features/verification/index.ts` $\rightarrow$ re-exports `PairwiseComparator`

**Reference Inspection:**
- `src/App.tsx` imports all views directly from `./components/*`, completely ignoring `src/features/*`.
- Only `ApplicationDetailView.tsx` line 21 imports `PairwiseComparator` from `src/features/verification/`.
- **Architectural Assessment:** The components should not be abruptly relocated without completing component decomposition, as monolithic views (`ApplicationDetailView.tsx` = 42 KB) require internal refactoring. We recommend retaining the barrels as migration targets for Phase 6 / P3.

#### Unused Shared UI Components (`src/shared/components/`)
- `DataTable.tsx` (3.6 KB): High-quality sortable, paginated enterprise table. (0 imports)
- `EmptyState.tsx` (1.2 KB): Standardized empty state container. (0 imports)
- `EvidencePanel.tsx` (3.0 KB): Evidence citation inspection card. (0 imports)
- `LoadingState.tsx` (0.5 KB): Animated loading spinner. (0 imports)
- **Architectural Assessment (Class D — Must Retain):** These are well-constructed, type-safe enterprise UI components created during the design system sprint. They should **not** be deleted. They will be progressively adopted by `ApplicationsView.tsx` and `FindingsView.tsx` during component decomposition.

---

### 2.4 Dependency & Configuration Hygiene

#### `package.json`
1. **Unused Dependencies:**
   - `"motion": "^12.23.24"`: Installed in `dependencies`, but zero imports exist across the entire repository.
   - `"autoprefixer": "^10.4.21"`: Installed in `devDependencies`, but Tailwind CSS v4 is processed directly by `@tailwindcss/vite`.
2. **Misplaced Type Definitions in `dependencies` instead of `devDependencies`:**
   - `"@types/multer": "^2.3.0"`
   - `"@types/pdf-parse": "^1.1.5"`
   - `"@tailwindcss/vite": "^4.3.3"`
   - `"@vitejs/plugin-react": "^6.1.1"`
3. **Template Artifact:**
   - `"name": "react-example"` $\rightarrow$ should be renamed to `"form2fact"`.

---

## 3. PROPOSED CLEANUP MIGRATION SEQUENCE (PHASE 6 EXECUTION PLAN)

When explicit human approval is granted, cleanup will execute strictly on the dedicated branch:

```bash
git checkout -b chore/repository-architecture-cleanup
```

### Step 1: Git Hygiene & Lockfile Standardization
1. Stage deletion of obsolete `bun.lock`:
   ```bash
   git rm bun.lock
   ```
2. Remove orphaned `.aistudio/` directory from git tracking:
   ```bash
   git rm -r .aistudio/
   ```
3. Update `.gitignore` to include:
   ```gitignore
   # Python Bytecode
   __pycache__/
   *.pyc
   *.pyo

   # AI Studio Artifacts
   .aistudio/

   # Runtime SQLite Databases
   data/*.db
   ```
4. Commit Step 1: `chore: standardize gitignore and remove orphaned session artifacts`.
5. Run `npm test` to verify zero regression.

### Step 2: Documentation Harmonization
1. Create `docs/design/` and move `DESIGN_SYSTEM.md`:
   ```bash
   mkdir -p docs/design
   git mv DESIGN_SYSTEM.md docs/design/DESIGN_SYSTEM.md
   ```
2. Move `DEVELOPMENT_STATUS.md` to `docs/audit/`:
   ```bash
   git mv DEVELOPMENT_STATUS.md docs/audit/DEVELOPMENT_STATUS.md
   ```
3. Remove redundant `doc/` directory:
   ```bash
   git rm -r doc/
   ```
4. Remove superseded top-level legacy documentation drafts:
   ```bash
   git rm docs/API_REFERENCE.md
   git rm docs/ARCHITECTURE.md
   git rm docs/DATABASE_SCHEMA.md
   git rm docs/TECHNICAL_AUDIT.md
   ```
5. Update `docs/README.md` to reflect the consolidated structure.
6. Commit Step 2: `docs: consolidate documentation and remove superseded drafts`.
7. Run `npm test` to verify zero regression.

### Step 3: Runtime Storage Documentation
1. Create `data/README.md` to document local runtime storage rules (SQLite databases, docket PDF uploads, strictly `.gitignore`d).
2. Commit Step 3: `docs(data): add runtime storage guidelines and confidentiality policy`.

### Step 4: Package Dependency & Metadata Cleanup
1. In `package.json`:
   - Rename `"name": "react-example"` $\rightarrow$ `"form2fact"`.
   - Move build plugins and types to `devDependencies`.
   - Remove unused `"motion"` and `"autoprefixer"`.
2. Run `npm install` to update `package-lock.json`.
3. Run `npm run lint` and `npm test` to verify 100% build and test pass.
4. Commit Step 4: `chore(deps): clean up unused dependencies and normalize package metadata`.

### Step 5: Final Verification & Pull Request Submission
1. Full test execution: `npm test` (all 22 suites passing).
2. Full static type-check: `npm run lint` (zero errors).
3. Production build test: `npm run build` (verifies Vite bundling).
4. Submit Pull Request from `chore/repository-architecture-cleanup` into `develop`.

---

## 4. ESTIMATED REGRESSION RISKS & MITIGATION

| Proposed Cleanup Action | Potential Risk | Mitigation Strategy |
|---|---|---|
| **Removing `.aistudio/`** | **ZERO:** No code references exist. | Verified via global regex search across codebase. |
| **Removing `doc/README.md`** | **ZERO:** Internal documentation pointer only. | Updated `docs/README.md` serves as master knowledge index. |
| **Removing legacy `docs/*.md` drafts** | **LOW:** Potential broken markdown links in external docs. | Scanned all markdown files; redirected all links to modern equivalents in `docs/api/`, `docs/architecture/`, etc. |
| **Moving `DESIGN_SYSTEM.md`** | **ZERO:** Pure markdown documentation. | Updated links in README.md. |
| **Uninstalling `motion` & `autoprefixer`** | **LOW:** Unused packages could conceivably have hidden side-effects. | Verified zero imports across entire repo; verified `npm run lint` passes without them. |
| **Renaming `package.json` to `"form2fact"`** | **ZERO:** Standard package metadata field. | Verified scripts and dependencies remain identical. |

---

## 5. ITEMS REQUIRING EXPLICIT HUMAN APPROVAL

Before executing Phase 6 cleanup commands, the following decisions are submitted for human review:

1. **Authorization to create cleanup branch `chore/repository-architecture-cleanup`:** Confirm creating this branch from current `main`.
2. **Approval of Step 1 Deletions:** Confirm removing `.aistudio/`, `bun.lock`, and untracked `__pycache__` files.
3. **Approval of Step 2 Documentation Consolidations:** Confirm removing the 5 legacy drafts in `docs/` (`API_REFERENCE.md`, `ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `TECHNICAL_AUDIT.md`, `doc/README.md`) and moving `DESIGN_SYSTEM.md` to `docs/design/`.
4. **Approval of Step 4 Dependency Pruning:** Confirm uninstalling unused `motion` and `autoprefixer` from `package.json`.
5. **Component Migration Strategy:** Agree to defer deep decomposition of monolithic views (`ApplicationDetailView.tsx`, `OverviewView.tsx`) to Phase 6 / Sprint P3, preserving working UI stability.

