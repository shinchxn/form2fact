# FORM2FACT: COMPLETE REPOSITORY INVENTORY

**Audit Date:** November 6, 2026  
**Auditor:** Senior Software Architect, Repository Auditor, DevOps Engineer & Technical Lead  
**Repository Identity:** Form2Fact — Evidence-First Institutional Document Intelligence & Regulatory Cross-Verification Platform  
**Current Branch:** `main` (Recommended Cleanup Branch: `chore/repository-architecture-cleanup`)  
**Base Commit Hash:** `2a97ff5dc0a58507e4753ae35e841172898851d3`  
**Evaluation Standard:** Exhaustive forensic directory inspection (excluding `node_modules` and `.git`).

---

## 1. REPOSITORY SUMMARY METRICS

| Category | File Count | Total Size (Bytes) | Primary Languages / Formats |
|---|:---:|:---:|---|
| **Root Configuration & Core** | 13 | ~208 KB | TypeScript, JSON, Markdown, Dockerfile |
| **Frontend Application (`src/`)** | 35 | ~295 KB | TypeScript, React 19 (TSX), CSS |
| **Backend Service (`server/`)** | 17 | ~240 KB | TypeScript, Express, SQLite, Node.js |
| **Python AI Microservice (`ai_service/`)** | 9 | ~37 KB | Python 3.13, FastAPI, Dockerfile |
| **Infrastructure & Database (`infrastructure/`)** | 3 | ~13 KB | SQL, TypeScript, Docker Compose |
| **Documentation (`docs/`, `doc/`)** | 36 | ~255 KB | GitHub Flavored Markdown |
| **Temporary / AI Studio Artifacts (`.aistudio/`)** | 2 | ~19 KB | Markdown, JSON |
| **Runtime Data (`data/`)** | 1 | ~168 KB | SQLite Relational Binary |
| **Build Distribution Output (`dist/`)** | 3 | ~436 KB | Minified JavaScript, CSS, HTML |
| **TOTALS** | **119** | **~1,671 KB** | **Full-Stack Polyglot Platform** |

---

## 2. EXHAUSTIVE DIRECTORY-BY-DIRECTORY INVENTORY

### 2.1 Root Level Files

| Path | Size (Bytes) | Git Status | Functional Purpose | Operational Status | Proposed Action |
|---|:---:|:---:|---|---|---|
| `.env.example` | 307 | Tracked | Template for environment variables (ports, JWT secret, PG, Redis, S3, AI service) | **Active** | Retain in root; update with clear production guidance. |
| `.gitignore` | 88 | Modified | Git exclusion rules | **Needs Update** | Update to exclude `__pycache__/`, `*.pyc`, `.aistudio/`, `data/*.db`. |
| `DESIGN_SYSTEM.md` | 20,818 | Tracked | Enterprise design system documentation and UI tokens | **Misplaced** | Move to `docs/design/DESIGN_SYSTEM.md`. |
| `DEVELOPMENT_STATUS.md` | 10,933 | Untracked | Summary of development progress and refactoring milestones | **Misplaced** | Move to `docs/audit/DEVELOPMENT_STATUS.md`. |
| `Dockerfile` | 559 | Untracked | Multi-stage container build for Node.js Express backend and Vite frontend | **Active** | Move to `infrastructure/docker/Dockerfile.api` or keep referenced by `docker-compose.yml`. |
| `index.html` | 1,229 | Tracked | Vite Single Page Application HTML entry point | **Active** | Retain in root. |
| `metadata.json` | 358 | Tracked | AI Studio extension/workspace metadata | **Legacy / Config** | Retain in root if AI Studio compatibility is required; otherwise move to `.aistudio/`. |
| `package-lock.json` | 155,319 | Untracked | Authoritative npm dependency lock tree | **Active** | Commit to git; standard lockfile. |
| `package.json` | 1,352 | Modified | Project dependencies and npm lifecycle scripts | **Active / Needs Polish** | Rename from `"react-example"` to `"form2fact"`; remove unused dependencies (`motion`, `autoprefixer`). |
| `README.md` | 15,476 | Modified | Master repository overview and executive architecture summary | **Active** | Retain and maintain as primary repository README. |
| `server.ts` | 1,073 | Tracked | Express application bootstrapper (mounts API router and Vite middleware) | **Active** | Retain in root as the application entry point. |
| `tsconfig.json` | 589 | Tracked | TypeScript compiler configuration (ES2022, bundler module resolution) | **Active** | Retain in root. |
| `vite.config.ts` | 546 | Tracked | Vite bundler build and plugin configuration | **Active** | Retain in root. |

---

### 2.2 Frontend Application (`src/`)

#### 2.2.1 Core App Entry & Configuration

| Path | Size (Bytes) | Git Status | Functional Purpose | Operational Status |
|---|:---:|:---:|---|---|
| `src/main.tsx` | 164 | Tracked | React 19 DOM root mount | **Active** |
| `src/App.tsx` | 13,271 | Modified | Master dashboard state, view routing, auto-auth bootstrap, modal management | **Active (Monolithic Orchestrator)** |
| `src/index.css` | 2,989 | Tracked | Tailwind CSS v4 directives and enterprise theme variables | **Active** |
| `src/types/index.ts` | 5,665 | Modified | Shared TypeScript contracts (`Application`, `DocumentRecord`, `Finding`, `Rule`, `User`) | **Active** |
| `src/services/api.ts` | 9,581 | Modified | Frontend HTTP client communicating with Express REST API (`/api/v1/*`) | **Active** |

#### 2.2.2 Views & Components (`src/components/`)

| Path | Size (Bytes) | Git Status | Functional Purpose | Operational Status |
|---|:---:|:---:|---|---|
| `src/components/Header.tsx` | 4,854 | Tracked | Top navigation bar with persona switcher and notification bell | **Active** |
| `src/components/Sidebar.tsx` | 5,381 | Tracked | Left sidebar navigation panel supporting 9 workspace views | **Active** |
| `src/components/OverviewView.tsx` | 36,246 | Tracked | Executive institutional summary, risk radar, and quick triage actions | **Active (Monolithic View)** |
| `src/components/ApplicationsView.tsx` | 15,238 | Tracked | Tabular institutional application docket registry with filtering | **Active (Monolithic View)** |
| `src/components/ApplicationDetailView.tsx` | 42,635 | Modified | Comprehensive application dossier inspector (tabs, fields, pairwise) | **Active (Monolithic View)** |
| `src/components/DocumentReviewView.tsx` | 21,580 | Tracked | Split-screen document inspection viewer with text snippet highlighting | **Active (Monolithic View)** |
| `src/components/FindingsView.tsx` | 14,305 | Modified | Discrepancy findings matrix with filterable statutory severities | **Active (Monolithic View)** |
| `src/components/RulesView.tsx` | 15,242 | Modified | Regulatory compliance rules catalog and sandbox test simulator | **Active (Monolithic View)** |
| `src/components/ReportsView.tsx` | 18,635 | Tracked | Statutory scrutiny report preview, decision memo, and print view | **Active (Monolithic View)** |
| `src/components/AuditLogView.tsx` | 7,578 | Tracked | Chronological administrative ledger with actor and diff tracing | **Active (Monolithic View)** |
| `src/components/SettingsView.tsx` | 13,107 | Tracked | Administrative configuration, organization status, and demo reset | **Active (Monolithic View)** |
| `src/components/NewApplicationModal.tsx` | 18,743 | Tracked | Multi-step institutional application creation wizard | **Active** |
| `src/components/CorrectionModal.tsx` | 5,641 | Tracked | Manual extracted field correction modal with mandatory justification | **Active** |
| `src/components/ReviewActionModal.tsx` | 9,016 | Tracked | Finding adjudication modal (Confirm, Dismiss, Mark Under Review) | **Active** |
| `src/components/ApplicationDecisionModal.tsx` | 8,459 | Untracked | Statutory docket sign-off modal (Approved, Rejected, Clarification Required) | **Active** |

#### 2.2.3 Feature Modules (`src/features/`)

| Path | Size (Bytes) | Git Status | Functional Purpose | Operational Status | Proposed Action |
|---|:---:|:---:|---|---|---|
| `src/features/administration/index.ts` | 133 | Untracked | Re-exports `SettingsView` and `AuditLogView` | **Hollow Barrel** | Retain as target for feature migration. |
| `src/features/applications/index.ts` | 329 | Untracked | Re-exports `ApplicationsView`, `ApplicationDetailView`, etc. | **Hollow Barrel** | Retain as target for feature migration. |
| `src/features/documents/index.ts` | 79 | Untracked | Re-exports `DocumentReviewView` | **Hollow Barrel** | Retain as target for feature migration. |
| `src/features/findings/index.ts` | 67 | Untracked | Re-exports `FindingsView` | **Hollow Barrel** | Retain as target for feature migration. |
| `src/features/reports/index.ts` | 65 | Untracked | Re-exports `ReportsView` | **Hollow Barrel** | Retain as target for feature migration. |
| `src/features/reviews/index.ts` | 149 | Untracked | Re-exports `ReviewActionModal` and `CorrectionModal` | **Hollow Barrel** | Retain as target for feature migration. |
| `src/features/rules/index.ts` | 61 | Untracked | Re-exports `RulesView` | **Hollow Barrel** | Retain as target for feature migration. |
| `src/features/verification/index.ts` | 64 | Untracked | Re-exports `PairwiseComparator` | **Active Barrel** | Retain; used by `ApplicationDetailView.tsx`. |
| `src/features/verification/PairwiseComparator.tsx` | 6,286 | Untracked | Interactive UI widget for testing pairwise field classification | **Active** | Retain in `src/features/verification/`. |

#### 2.2.4 Shared UI Library (`src/shared/components/`)

| Path | Size (Bytes) | Git Status | Functional Purpose | Operational Status | Proposed Action |
|---|:---:|:---:|---|---|---|
| `src/shared/components/StatusBadge.tsx` | 2,964 | Untracked | Color-coded status badge for MATCH, MISMATCH, MISSING, UNCERTAIN, NOT_COMPARABLE | **Active** | Retain; imported in 3 views. |
| `src/shared/components/ErrorBoundary.tsx` | 2,068 | Untracked | React error boundary protecting top-level layout | **Active** | Retain; imported in `App.tsx`. |
| `src/shared/components/DataTable.tsx` | 3,685 | Untracked | Enterprise data table with sort, search, and pagination | **Unused Component** | Retain; building block for Phase 6 cleanup. |
| `src/shared/components/EmptyState.tsx` | 1,196 | Untracked | Enterprise empty state visual placeholder | **Unused Component** | Retain; building block for Phase 6 cleanup. |
| `src/shared/components/EvidencePanel.tsx` | 3,020 | Untracked | Evidence inspection drawer with field highlight linkage | **Unused Component** | Retain; building block for Phase 6 cleanup. |
| `src/shared/components/LoadingState.tsx` | 534 | Untracked | Animated loading state container | **Unused Component** | Retain; building block for Phase 6 cleanup. |

---

### 2.3 Backend Service (`server/`)

| Path | Size (Bytes) | Git Status | Functional Purpose | Operational Status |
|---|:---:|:---:|---|---|
| `server/api.ts` | 36,099 | Modified | Monolithic Express REST router (674 lines) with all endpoints | **Active (P0 Remediated)** |
| `server/auth.ts` | 7,142 | Untracked | JWT token generation, verification, secret fail-fast resolution, RBAC | **Active (P0 Remediated)** |
| `server/db.ts` | 53,297 | Modified | Monolithic SQLite database access layer (1,400+ lines, multi-tenancy) | **Active (P0 Remediated)** |
| `server/extraction.ts` | 10,926 | Tracked | PDF text extraction and regex field extraction for AICTE forms | **Active** |
| `server/rulesEngine.ts` | 42,699 | Modified | AICTE deterministic statutory compliance rules + text/date normalization | **Active (P0 Remediated)** |
| `server/test-runner.ts` | 51,449 | Modified | Master test suite (22 suites, 117 assertions, HTTP networking tests) | **Active (Baseline Passing)** |
| `server/core/errors/AppError.ts` | 1,495 | Untracked | Standardized HTTP application error class | **Active** |
| `server/core/errors/errorHandler.ts` | 1,252 | Untracked | Express centralized error handler middleware | **Active** |
| `server/core/jobs/index.ts` | 3,318 | Untracked | In-memory asynchronous job queue abstraction | **Active (Tested in Suite 17)** |
| `server/core/logger/index.ts` | 2,191 | Untracked | Structured JSON logger with timestamp and level tags | **Active** |
| `server/core/storage/index.ts` | 2,989 | Untracked | `IStorageProvider` and `LocalStorageProvider` abstraction | **Active** |
| `server/core/validation/validate.ts` | 1,190 | Untracked | Zod request body validation middleware | **Active (Used in pairwise API)** |
| `server/domains/index.ts` | 281 | Untracked | Domain pack registry barrel export | **Active** |
| `server/domains/registry.ts` | 2,590 | Untracked | In-memory `DomainRegistry` service | **Active** |
| `server/domains/types.ts` | 3,054 | Untracked | `DomainPack`, `DocumentDefinition`, `ComplianceRule` interfaces | **Active** |
| `server/domains/aicte/index.ts` | 5,695 | Untracked | AICTE Statutory Domain Pack definition (v1.2.0) | **Active** |
| `server/modules/organizations/organization.service.ts` | 1,294 | Untracked | Regional organization metadata service | **Active** |
| `server/modules/verification/pairwiseEngine.ts` | 17,950 | Untracked | 5-class pairwise field mismatch classifier (v2.0) | **Active (P0 Remediated)** |

---

### 2.4 Python AI Microservice (`ai_service/`)

| Path | Size (Bytes) | Git Status | Functional Purpose | Operational Status |
|---|:---:|:---:|---|---|
| `ai_service/Dockerfile` | 308 | Untracked | Python 3.13-slim container definition | **Active** |
| `ai_service/requirements.txt` | 88 | Untracked | Python dependencies (fastapi, uvicorn, pydantic) | **Active** |
| `ai_service/app/main.py` | 2,103 | Untracked | FastAPI service entry point (`/classify-pair`, `/batch-classify`) | **Active (Standalone)** |
| `ai_service/app/schemas.py` | 2,162 | Untracked | Pydantic models for pairwise requests and responses | **Active** |
| `ai_service/app/classifier.py` | 10,922 | Untracked | Python hybrid pairwise classifier (regex + Jaccard) | **Active (Needs P0 parity sync)** |
| `ai_service/app/dataset.py` | 6,944 | Untracked | 8-pair synthetic benchmark dataset | **Active** |
| `ai_service/app/__pycache__/*.pyc` | ~20 KB | Untracked | Compiled Python bytecode cache | **Obsolete / Git Artifact** |

---

### 2.5 Infrastructure & Database (`infrastructure/`)

| Path | Size (Bytes) | Git Status | Functional Purpose | Operational Status |
|---|:---:|:---:|---|---|
| `infrastructure/docker-compose.yml` | 2,506 | Untracked | Multi-service orchestration (postgres, redis, minio, ai-service, api-server) | **Active** |
| `infrastructure/db/init.sql` | 8,560 | Untracked | PostgreSQL 16 schema initialization script | **Active (Needs `rules` table sync)** |
| `infrastructure/db/migrate_sqlite_to_pg.ts` | 2,248 | Untracked | SQLite to PostgreSQL migration script stub | **Partial Implementation** |

---

### 2.6 Documentation (`docs/` & `doc/`)

| Path | Size (Bytes) | Git Status | Functional Purpose | Operational Status | Proposed Action |
|---|:---:|:---:|---|---|---|
| `doc/README.md` | 1,013 | Untracked | Redundant 13-line pointer to `docs/README.md` | **Redundant Duplicate** | Consolidate into `docs/` and remove `doc/`. |
| `docs/README.md` | 3,353 | Untracked | Master knowledge base index | **Active** | Retain as documentation home. |
| `docs/ARCHITECTURE.md` | 12,252 | Untracked | Legacy monolithic architecture document | **Superseded** | Archive or consolidate into `docs/architecture/`. |
| `docs/API_REFERENCE.md` | 6,326 | Untracked | Legacy monolithic API reference | **Superseded** | Consolidate into `docs/api/rest-endpoints.md`. |
| `docs/DATABASE_SCHEMA.md` | 9,867 | Untracked | Legacy database documentation | **Superseded** | Consolidate into `docs/database/schema.md`. |
| `docs/TECHNICAL_AUDIT.md` | 6,801 | Untracked | Preliminary pre-audit notes | **Superseded** | Consolidate into `docs/audit/MASTER_AUDIT_REPORT.md`. |
| `docs/RULES_AND_REGULATORY_NORMS.md` | 7,935 | Untracked | Regulatory norms and statutory rule definitions | **Active** | Move to `docs/domain-configuration/rules.md`. |
| `docs/DOCUMENT_INTELLIGENCE_ROADMAP.md` | 4,956 | Untracked | Future OCR and AI roadmap | **Active** | Move to `docs/ai-models/roadmap.md`. |
| `docs/DEVELOPER_GUIDE.md` | 4,651 | Untracked | Local development and onboarding guide | **Active** | Retain in `docs/`. |
| `docs/ai-models/benchmark-dataset.md` | 3,271 | Untracked | Documentation on ML test dataset | **Active** | Retain in `docs/ai-models/`. |
| `docs/ai-models/pairwise-classifier.md` | 3,936 | Untracked | Documentation on pairwise classifier | **Active** | Retain in `docs/ai-models/`. |
| `docs/api/ai-service-contracts.md` | 2,473 | Untracked | FastAPI endpoint documentation | **Active** | Retain in `docs/api/`. |
| `docs/api/rest-endpoints.md` | 4,223 | Untracked | Node.js REST API endpoint reference | **Active** | Retain in `docs/api/`. |
| `docs/architecture/background-jobs.md` | 3,413 | Untracked | Asynchronous job queue architecture | **Active** | Retain in `docs/architecture/`. |
| `docs/architecture/data-flow.md` | 3,654 | Untracked | Cross-verification data flow | **Active** | Retain in `docs/architecture/`. |
| `docs/architecture/domain-packs.md` | 3,850 | Untracked | Domain-independent architecture | **Active** | Retain in `docs/architecture/`. |
| `docs/architecture/system-architecture.md` | 4,702 | Untracked | System component architecture | **Active** | Retain in `docs/architecture/`. |
| `docs/audit/ARCHITECTURE_VERIFICATION.md` | 12,120 | Untracked | Implemented vs planned architecture diagrams | **Active** | Retain in `docs/audit/`. |
| `docs/audit/IMPLEMENTATION_GAP_MATRIX.md` | 12,153 | Untracked | 22-row gap matrix with P0 resolutions | **Active** | Retain in `docs/audit/`. |
| `docs/audit/MASTER_AUDIT_REPORT.md` | 37,835 | Untracked | Comprehensive 14-section forensic audit | **Active** | Retain in `docs/audit/`. |
| `docs/audit/P0_REMEDIATION_REPORT.md` | 32,797 | Untracked | Forensic before/after P0 remediation report | **Active** | Retain in `docs/audit/`. |
| `docs/audit/PRIORITIZED_CORRECTION_PLAN.md` | 18,302 | Untracked | P0-P3 correction roadmap | **Active** | Retain in `docs/audit/`. |
| `docs/database/migrations.md` | 2,975 | Untracked | Migration strategy documentation | **Active** | Retain in `docs/database/`. |
| `docs/database/schema.md` | 6,711 | Untracked | Relational schema documentation | **Active** | Retain in `docs/database/`. |
| `docs/decisions/ADR-001` through `ADR-005` | ~16 KB | Untracked | Architectural Decision Records (5 documents) | **Active** | Retain in `docs/decisions/`. |
| `docs/deployment/docker-guide.md` | 2,711 | Untracked | Docker Compose deployment guide | **Active** | Retain in `docs/deployment/`. |
| `docs/deployment/production-checklist.md` | 2,562 | Untracked | Production go-live verification checklist | **Active** | Retain in `docs/deployment/`. |
| `docs/domain-configuration/aicte-reference.md`| 4,664 | Untracked | AICTE domain pack specifications | **Active** | Retain in `docs/domain-configuration/`. |
| `docs/domain-configuration/authoring-guide.md`| 4,489 | Untracked | Guide for authoring new domain packs | **Active** | Retain in `docs/domain-configuration/`. |
| `docs/security/tenant-isolation.md` | 2,714 | Untracked | Multi-tenant security architecture | **Active** | Retain in `docs/security/`. |
| `docs/security/threat-model.md` | 3,044 | Untracked | Security threat model | **Active** | Retain in `docs/security/`. |

---

### 2.7 Temporary & Build Artifacts

| Path | Size (Bytes) | Git Status | Functional Purpose | Operational Status | Proposed Action |
|---|:---:|:---:|---|---|---|
| `.aistudio/artifacts/brain/...` | ~19 KB | Tracked | AI Studio interactive session artifacts | **Orphaned Artifact** | Remove from git; add `.aistudio/` to `.gitignore`. |
| `dist/*` | ~436 KB | Ignored | Vite frontend production build output | **Build Artifact** | Ignore; generated by `npm run build`. |
| `data/form2fact.db` | ~168 KB | Ignored | Local runtime SQLite database | **Runtime Data** | Keep out of git; add `data/README.md`. |
| `bun.lock` | 0 | Deleted | Legacy Bun package manager lockfile | **Obsolete** | Confirm deletion in git; standardize on `package-lock.json`. |

---

## 3. INVENTORY CONCLUSION

The repository contains **119 total files** (~1.67 MB). There are **zero missing core application files**, and the system is in a stable, verified operational baseline. However, the repository exhibits:
1. Two redundant directories (`.aistudio/`, `doc/`).
2. Seven legacy documentation files in `docs/` that duplicate organized subdirectories.
3. Eight hollow frontend feature re-exports in `src/features/`.
4. Four unused shared UI components in `src/shared/components/`.
5. Two unused npm dependencies (`motion`, `autoprefixer`) and misplaced types.
6. Untracked compiled Python bytecode in `ai_service/app/__pycache__/`.
7. Two root-level markdown files (`DESIGN_SYSTEM.md`, `DEVELOPMENT_STATUS.md`) that belong in `docs/`.

