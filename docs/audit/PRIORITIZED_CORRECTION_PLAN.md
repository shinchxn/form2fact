# FORM2FACT: PRIORITIZED CORRECTION PLAN

**Audit Date:** November 2026  
**Evaluation Standard:** Production engineering roadmap categorizing verified gaps into strict priority tiers with root-cause analysis, actionable correction specifications, acceptance criteria, and regression test requirements.

---

## Priority Classification Framework

- **P0 — Critical:** Security vulnerabilities, privilege escalation, data leakage, and algorithmic correctness defects producing false regulatory violations. Must be resolved before any pilot user testing.
- **P1 — High:** Core architectural and functional defects (runtime domain coupling, orphaned storage/queue abstractions, missing PostgreSQL driver). Must be resolved for architectural integrity.
- **P2 — Medium:** AI quality, OCR capabilities, realistic benchmark datasets, and real-data UI integration. Essential for production usability.
- **P3 — Low:** Code organization, barrel refactoring, performance optimizations, and spatial coordinate enhancements.

---

## P0 — Critical Security, Data Integrity & Correctness Defects

### TASK-P0-01: Enforce Mandatory JWT Authentication on Private API Endpoints
- **Problem:** All `GET` endpoints (`/api/v1/applications`, `/api/v1/findings`, `/api/v1/audit`, document file downloads) permit completely anonymous, unauthenticated access.
- **Root Cause:** `server/api.ts` line 40 mounts `optionalAuth` globally, while `authenticateToken` is never attached to private route definitions.
- **Proposed Correction:**
  1. Remove global `router.use(optionalAuth)`.
  2. Create a public router for unauthenticated routes (`/api/v1/auth/login`, health checks).
  3. Mount `authenticateToken` middleware on all private scrutiny routers (`/api/v1/applications`, `/api/v1/documents`, `/api/v1/findings`, `/api/v1/rules`, `/api/v1/audit`, `/api/v1/verification`).
- **Files Affected:** [`server/api.ts`](file:///d:/projects/form2fact/server/api.ts), [`server/auth.ts`](file:///d:/projects/form2fact/server/auth.ts)
- **Dependencies:** None.
- **Acceptance Criteria:**
  - `GET /api/v1/applications` returns `401 Unauthorized` when called without a valid `Authorization: Bearer <token>` header.
  - Valid token calls continue to return 200 OK with expected JSON payloads.
- **Required Tests:**
  - Integration test asserting 401 on unauthenticated calls to all protected endpoints.
  - Integration test asserting 200 on authenticated calls with valid JWT.

---

### TASK-P0-02: Disable Arbitrary Role Self-Assignment (`POST /api/v1/user`)
- **Problem:** Any unauthenticated client can issue `POST /api/v1/user` with `{"role": "Administrator"}` and receive a cryptographically valid Administrator JWT token.
- **Root Cause:** A demonstration helper endpoint was mounted directly on the main API router without environment gating or role checks.
- **Proposed Correction:**
  1. Gate `POST /api/v1/user` behind a check: `if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEMO_PERSONAS !== 'true') return res.status(403).json(...)`.
  2. If enabled in development, restrict the available personas to an immutable server-side whitelist (`['usr-001', 'usr-002', 'usr-003']`) rather than accepting arbitrary role overrides from client body.
- **Files Affected:** [`server/api.ts`](file:///d:/projects/form2fact/server/api.ts)
- **Dependencies:** None.
- **Acceptance Criteria:**
  - In production mode, `POST /api/v1/user` returns `403 Forbidden` or `404 Not Found`.
  - In development mode, arbitrary role injection in request body is ignored.
- **Required Tests:**
  - Regression test verifying endpoint is blocked when `NODE_ENV=production`.

---

### TASK-P0-03: Eliminate Fallback Secret and Enforce Strict Startup Validation
- **Problem:** In production mode, the server logs an error but proceeds using the hardcoded secret `'form2fact-scrutiny-engine-jwt-secret-key-2026'` unless `STRICT_SECURITY=true`.
- **Root Cause:** Permissive fallback logic in `server/auth.ts`.
- **Proposed Correction:**
  - Update `server/auth.ts` to immediately terminate the process (`process.exit(1)`) on startup if `NODE_ENV === 'production'` and `JWT_SECRET` is unset, empty, or equals the default fallback string.
- **Files Affected:** [`server/auth.ts`](file:///d:/projects/form2fact/server/auth.ts)
- **Dependencies:** None.
- **Acceptance Criteria:**
  - `NODE_ENV=production tsx server.ts` exits with code 1 and fatal error log if `JWT_SECRET` is unset.
- **Required Tests:**
  - Unit test verifying process exit behavior on insecure environment configuration.

---

### TASK-P0-04: Secure Document File Streaming with Tenant Verification
- **Problem:** `GET /api/v1/applications/:id/documents/:docId/file` sends the stored PDF file directly from disk with no authentication or tenant ownership check.
- **Root Cause:** Route handler lacks `authenticateToken` and tenant validation middleware.
- **Proposed Correction:**
  1. Add `authenticateToken` and `requireOrg` middleware to the document streaming route.
  2. Verify that the requested document belongs to an application owned by or accessible to the requester's `organizationId`.
- **Files Affected:** [`server/api.ts`](file:///d:/projects/form2fact/server/api.ts)
- **Dependencies:** TASK-P0-01.
- **Acceptance Criteria:**
  - Anonymous requests return `401 Unauthorized`.
  - Cross-tenant requests return `403 Forbidden`.
  - Authorized officer requests stream the PDF with `Content-Type: application/pdf`.
- **Required Tests:**
  - HTTP test verifying 401 for anonymous, 403 for cross-tenant, and 200 for authorized officer.

---

### TASK-P0-05: Correct Pairwise Classifier's Low-Similarity Mismatch Defect
- **Problem:** Both TS (`pairwiseEngine.ts`) and Python (`classifier.py`) classifiers declare statutory `MISMATCH` with high confidence ($1.0 - \text{overlap}$) whenever lexical token overlap $\le 0.20$. This treats rephrasing or alternative formatting as proof of a regulatory violation.
- **Root Cause:** Flawed classification assumption equating low lexical similarity with proven contradiction.
- **Proposed Correction:**
  1. Update classification rules:
     - Lexical overlap $\ge 0.85 \rightarrow$ `MATCH`.
     - Explicit contradictory values (divergent ISO dates, proven numeric deficits, or corporate commercial markers in legal entities) $\rightarrow$ `MISMATCH`.
     - In all other cases where text is non-identical and no contradiction is proven $\rightarrow$ **Abstain to `UNCERTAIN`** (`requiresHumanReview: true`).
  2. Label confidence scores honestly as heuristic match ratings rather than mathematical probabilities.
- **Files Affected:** [`server/modules/verification/pairwiseEngine.ts`](file:///d:/projects/form2fact/server/modules/verification/pairwiseEngine.ts), [`ai_service/app/classifier.py`](file:///d:/projects/form2fact/ai_service/app/classifier.py)
- **Dependencies:** None.
- **Acceptance Criteria:**
  - Two non-identical strings with 0% token overlap (e.g. alternative address phrasings) return `UNCERTAIN` with `requiresHumanReview = true`, **never `MISMATCH`**.
  - Proven date contradiction (e.g. 2055 vs 2028) returns `MISMATCH`.
- **Required Tests:**
  - Unit tests asserting that low-overlap ambiguous text returns `UNCERTAIN`.
  - Unit tests asserting that explicit date and numeric contradictions return `MISMATCH`.

---

## P1 — Core Functional & Architectural Defects

### TASK-P1-01: Connect DomainRegistry to Core Verification Engine
- **Problem:** `db.runValidation()` bypasses `DomainRegistry` and calls the monolithic `server/rulesEngine.ts` containing hardcoded AICTE `if/else` checks.
- **Root Cause:** Domain pack architecture was added as an auxiliary module without refactoring `db.runValidation()`.
- **Proposed Correction:**
  1. Refactor `db.runValidation(applicationId)`:
     - Retrieve application from database.
     - Look up its `domainId` (defaulting to `'aicte'`).
     - Fetch active `DomainPack` from `domainRegistry.get(app.domainId)`.
     - Iterate through `domainPack.rules` and invoke their pure evaluator functions.
  2. Migrate the 6 AICTE rule evaluator implementations from `server/rulesEngine.ts` into `server/domains/aicte/rules.ts`.
- **Files Affected:** [`server/db.ts`](file:///d:/projects/form2fact/server/db.ts), [`server/domains/aicte/index.ts`](file:///d:/projects/form2fact/server/domains/aicte/index.ts), [`server/rulesEngine.ts`](file:///d:/projects/form2fact/server/rulesEngine.ts)
- **Dependencies:** None.
- **Acceptance Criteria:**
  - `db.runValidation()` executes successfully using rules dynamically registered in `domainRegistry`.
  - Registering a new domain pack (e.g. NAAC) allows validating applications without modifying core code.
- **Required Tests:**
  - Regression test verifying seed AICTE applications produce identical findings when evaluated via `DomainPack`.
  - Unit test validating an application against a custom mock domain pack.

---

### TASK-P1-02: Connect Storage Provider to File Upload and Retrieval
- **Problem:** `server/api.ts` directly writes files to `data/dockets/` via raw `fs.writeFileSync`, ignoring `IStorageProvider`.
- **Root Cause:** `storageProvider` singleton in `server/core/storage/index.ts` was not imported into `server/api.ts`.
- **Proposed Correction:**
  1. Import `storageProvider` into `server/api.ts`.
  2. In `POST /api/v1/applications/:id/documents`, replace `fs.writeFileSync` with `await storageProvider.save(applicationId, docId, file.buffer, file.mimetype)`.
  3. In document streaming and deletion endpoints, use `storageProvider.getStream()` and `storageProvider.delete()`.
- **Files Affected:** [`server/api.ts`](file:///d:/projects/form2fact/server/api.ts), [`server/core/storage/index.ts`](file:///d:/projects/form2fact/server/core/storage/index.ts)
- **Dependencies:** None.
- **Acceptance Criteria:**
  - Files are saved, retrieved, and deleted strictly through `IStorageProvider`.
  - Swapping `LocalDiskStorageProvider` for an S3/MinIO provider requires zero changes to route handlers.
- **Required Tests:**
  - Integration test uploading, streaming, and deleting a document through `storageProvider`.

---

### TASK-P1-03: Connect Asynchronous Job Queue to Document Ingestion
- **Problem:** PDF parsing and field extraction execute synchronously within the Express upload handler, risking timeouts on large multi-page files.
- **Root Cause:** `jobQueue` abstraction was not wired to the upload route.
- **Proposed Correction:**
  1. Register a background worker handler: `jobQueue.registerHandler('document-extraction', async ({ docId, applicationId, storageKey }) => { ... })`.
  2. In `POST /api/v1/applications/:id/documents`:
     - Validate magic bytes.
     - Save file to `storageProvider`.
     - Insert document record with status `'queued'`.
     - Enqueue job: `const job = await jobQueue.enqueue('document-extraction', { docId, applicationId, storageKey })`.
     - Return `202 Accepted` with `{ docId, jobId: job.id, status: 'queued' }`.
  3. Worker extracts text, parses fields, saves them to DB, and updates status to `'Extracted'`.
- **Files Affected:** [`server/api.ts`](file:///d:/projects/form2fact/server/api.ts), [`server/core/jobs/index.ts`](file:///d:/projects/form2fact/server/core/jobs/index.ts)
- **Dependencies:** TASK-P1-02.
- **Acceptance Criteria:**
  - Upload endpoint responds within 150ms regardless of document page count.
  - Client polls `GET /api/v1/jobs/:jobId` until status transitions to `'completed'`.
- **Required Tests:**
  - Test verifying 202 response on upload and subsequent asynchronous job completion.

---

### TASK-P1-04: Add PostgreSQL Driver and Implement Real Database Adapter
- **Problem:** The backend cannot connect to PostgreSQL because no driver (`pg`, `@types/pg`) is installed, and `server/db.ts` hardcodes `node:sqlite`.
- **Root Cause:** PostgreSQL schema was authored in SQL (`init.sql`) without writing the corresponding database adapter in Node.js.
- **Proposed Correction:**
  1. Install `pg` and `@types/pg`.
  2. Implement a database adapter interface `IDatabaseAdapter` with implementations `SqliteAdapter` and `PostgresAdapter`.
  3. When `DATABASE_URL` is set, instantiate `PostgresAdapter` with connection pooling; otherwise default to `SqliteAdapter`.
  4. Synchronize schemas: Add the missing `rules` table to `infrastructure/db/init.sql` or deprecate the standalone table in favor of `domain_versions`.
- **Files Affected:** [`package.json`](file:///d:/projects/form2fact/package.json), [`server/db.ts`](file:///d:/projects/form2fact/server/db.ts), [`infrastructure/db/init.sql`](file:///d:/projects/form2fact/infrastructure/db/init.sql)
- **Dependencies:** None.
- **Acceptance Criteria:**
  - Server starts and executes all repository queries against PostgreSQL when `DATABASE_URL` is provided.
  - Server runs against SQLite when `DATABASE_URL` is omitted.
- **Required Tests:**
  - Integration test suite running all CRUD queries against PostgreSQL in Docker.

---

### TASK-P1-05: Implement Working SQLite to PostgreSQL ETL Migration
- **Problem:** `infrastructure/db/migrate_sqlite_to_pg.ts` only counts rows; it never inserts records into PostgreSQL.
- **Root Cause:** ETL migration logic was stubbed with count queries.
- **Proposed Correction:**
  - Update `migrate_sqlite_to_pg.ts` to connect to target PostgreSQL via `pg.Pool`, read all rows from SQLite in dependency order, transform data types (e.g. JSON strings to JSONB, boolean integers to booleans), and execute parameterized batch `INSERT` statements wrapped in a transaction.
- **Files Affected:** [`infrastructure/db/migrate_sqlite_to_pg.ts`](file:///d:/projects/form2fact/infrastructure/db/migrate_sqlite_to_pg.ts)
- **Dependencies:** TASK-P1-04.
- **Acceptance Criteria:**
  - Running `npx tsx infrastructure/db/migrate_sqlite_to_pg.ts --live` populates PostgreSQL tables matching SQLite counts exactly.
- **Required Tests:**
  - Verification test verifying row count and column parity between SQLite and PostgreSQL post-migration.

---

## P2 — AI Quality, Usability & Document Processing

### TASK-P2-01: Integrate Real Optical Character Recognition (OCR) Engine
- **Problem:** Scanned photocopy PDFs (`rawAllText.length < 40`) are marked `Scanned Unreadable` and cannot be verified automatically.
- **Proposed Correction:**
  - Integrate an asynchronous OCR pipeline using Tesseract.js (local fallback) or a cloud document vision API (e.g. Google Cloud Document AI / AWS Textract).
  - When `pdf-parse` yields low text density, render page images and run OCR before extracting fields.
- **Files Affected:** [`server/extraction.ts`](file:///d:/projects/form2fact/server/extraction.ts), [`package.json`](file:///d:/projects/form2fact/package.json)
- **Dependencies:** TASK-P1-03.
- **Acceptance Criteria:**
  - Scanned PDF fixture yields extracted text and fields rather than `Scanned Unreadable`.

---

### TASK-P2-02: Connect Node.js Backend to Python AI Microservice
- **Problem:** The Python FastAPI microservice runs in Docker on port 8000, but is never invoked by Node.js.
- **Proposed Correction:**
  - In `server/modules/verification/pairwiseEngine.ts`, add an HTTP client that forwards complex semantic comparisons to `POST http://ai_service:8000/api/v1/classify-pair` with fallback to local heuristics if the service is unreachable.
- **Files Affected:** [`server/modules/verification/pairwiseEngine.ts`](file:///d:/projects/form2fact/server/modules/verification/pairwiseEngine.ts)
- **Dependencies:** None.
- **Acceptance Criteria:**
  - Node.js pairwise route successfully delegates semantic checks to FastAPI service.

---

### TASK-P2-03: Expand Benchmark Dataset with Real Institutional Scenarios
- **Problem:** Current benchmark contains only 8 synthetic pairs.
- **Proposed Correction:**
  - Create a standardized evaluation dataset of at least 150 real-world regulatory field pairs (50 MATCH, 40 MISMATCH, 30 UNCERTAIN, 20 MISSING, 10 NOT_COMPARABLE) with ground-truth human annotations, OCR character noise, and syntactic variations.
- **Files Affected:** [`ai_service/app/dataset.py`](file:///d:/projects/form2fact/ai_service/app/dataset.py)
- **Dependencies:** None.
- **Acceptance Criteria:**
  - Macro F1, precision, recall, and abstention rate calculated across 150+ diverse examples.

---

### TASK-P2-04: Wire Pairwise Comparator UI to Real Docket Fields
- **Problem:** `PairwiseComparator.tsx` currently only allows testing static dropdown presets.
- **Proposed Correction:**
  - Pass active application's extracted fields and declared details as props to `PairwiseComparator`.
  - Add a "Compare with Evidence" button on each extracted field row in `ApplicationDetailView.tsx` that opens the comparator pre-filled with real claim and evidence values.
- **Files Affected:** [`src/features/verification/PairwiseComparator.tsx`](file:///d:/projects/form2fact/src/features/verification/PairwiseComparator.tsx), [`src/components/ApplicationDetailView.tsx`](file:///d:/projects/form2fact/src/components/ApplicationDetailView.tsx)
- **Dependencies:** None.
- **Acceptance Criteria:**
  - Clicking "Compare" on an extracted field row launches pairwise comparison on real docket data.

---

## P3 — Scalability, Optimization & Modularization

### TASK-P3-01: True Modularization of Monolithic View Components
- **Problem:** Major view files in `src/components/` are monolithic (`OverviewView.tsx` is 36KB; `ApplicationDetailView.tsx` is 42KB). `src/features/*` contains only barrel re-exports.
- **Proposed Correction:**
  - Split large view files into subcomponents colocated within their respective feature folders (`src/features/applications/`, `src/features/findings/`, etc.).
- **Files Affected:** `src/features/*`, `src/components/*`
- **Dependencies:** None.

---

### TASK-P3-02: Spatial Bounding Box Extraction
- **Problem:** Evidence citations lack physical coordinate bounding boxes (`x, y, w, h`).
- **Proposed Correction:**
  - Use `pdfjs-dist` to extract character-level or word-level bounding boxes and populate `boundingBox` on `ExtractedField`.
- **Files Affected:** [`server/extraction.ts`](file:///d:/projects/form2fact/server/extraction.ts), [`src/components/DocumentReviewView.tsx`](file:///d:/projects/form2fact/src/components/DocumentReviewView.tsx)
- **Dependencies:** None.

