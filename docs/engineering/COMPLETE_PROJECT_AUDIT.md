# Form2Fact — Complete Project Forensic Audit

- **Date:** 2026-11-08
- **Auditor:** Principal engineering review (agentic)
- **Branch audited:** `feature/bharatcode-submission-readiness` (12 commits ahead of `main`; `main` == `origin/main` @ `435b1c2`)
- **Method:** Full source inspection of `server/`, `src/`, `ai_service/`, `infrastructure/`, `.github/`, `docs/`, git state, dependency manifests, plus live execution of the Node test suite, type-checker, and production build.

---

## 1. Current Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│ React 19 + Vite 8 SPA (src/) — single chunk bundle, Tailwind 4     │
│  src/services/api.ts  →  fetch() contract, JWT in localStorage     │
│  18 views: login, overview, applications, detail, documents,       │
│  findings, reviews, pairwise comparator, annotation workbench,     │
│  aicte preview, rules, reports, audit log, settings                │
└──────────────────────────┬─────────────────────────────────────────┘
                           │ /api/v1/* (JSON, Bearer JWT)
┌──────────────────────────▼─────────────────────────────────────────┐
│ Express 4 gateway (server.ts + server/api.ts, 1601 lines)          │
│  auth.ts  : JWT HS256, per-request DB revalidation, RBAC, tenant   │
│  api.ts   : ~45 routes (auth, apps, documents, fields, rules,      │
│             findings, explain, pairwise, annotations, reviewers,   │
│             intake, ledger, jobs, domains, orgs, reset-demo)       │
│  core/    : InMemoryJobQueue, LocalDiskStorage, logger, zod valid, │
│             AppError + centralized errorHandler, prod config gate  │
│  domains/ : DomainPack registry → AICTE adapter + 10.2KB rule pack │
│  ledger/  : SHA-256 hash-chained audit ledger + external checkpoint│
└───────┬──────────────────────┬─────────────────────────┬───────────┘
        │                      │                         │
┌───────▼───────┐   ┌──────────▼───────────┐   ┌─────────▼──────────┐
│ SQLite        │   │ pairwiseEngine.ts    │   │ BharatCodeService  │
│ node:sqlite   │   │ (5-class hybrid:     │   │ (Qwen 3.8 27B,     │
│ WAL, 14 tables│   │  deterministic →     │   │  bharatcode.ai,    │
│ data/form2fact│   │  calibrated-ML call  │   │  explanation ONLY, │
│ .db           │   │  → deterministic     │   │  grounding guards) │
└───────────────┘   │  fallback)           │   └────────────────────┘
                    └──────────┬───────────┘
                    ┌──────────▼────────────────────────────────────┐
                    │ Python FastAPI ai_service (port 8000, optional)│
                    │  /api/v1/ocr/pdf (PyMuPDF + tesseract OCR)    │
                    │  /api/v1/classify-pair (calibrated v2 ML)     │
                    │  /api/v1/batch-classify, /api/v1/evaluate     │
                    │  X-OCR-Service-Token auth                     │
                    └────────────────────────────────────────────────┘
```

**Persistence truth:** the runtime database is **SQLite via the Node built-in `node:sqlite` (`DatabaseSync`)** in WAL mode. PostgreSQL, Redis, and MinIO exist **only** as optional `docker compose --profile enterprise` containers and are **not referenced by any application code path**. They must not be documented as supported runtime dependencies.

**Document storage:** local disk `data/dockets/<applicationId>/<docId>.pdf`, SHA-256 checksum stored in DB, storage-key integrity re-verified on every download/delete.

**Job queue:** `InMemoryJobQueue` is fully implemented (enqueue/retry/backoff/handlers) but is exercised **only by its own unit test**; document upload and validation run synchronously in the request. It is a real, working extension point, not a claim of distributed processing.

---

## 2. Feature Status Matrix

Legend: ✅ WORKING & VERIFIED · 🟡 IMPLEMENTED, NOT FULLY VERIFIED HERE · 🟠 PARTIALLY IMPLEMENTED · ⚪ DISCONNECTED · ❌ BROKEN · ⬜ NOT IMPLEMENTED · ⛔ BLOCKED BY EXTERNAL RESOURCE

| # | Feature | Status | Evidence / Notes |
|---|---------|--------|------------------|
| 1 | Login (email+password, bcrypt) | ✅ | 23-suite Node run green; persona demo creds blocked in production mode |
| 2 | JWT auth + per-request DB revalidation + role-revocation guard | ✅ | `auth.ts` `authenticateToken` re-reads user & role every request |
| 3 | RBAC (Admin / Reviewer / Viewer / Annotator / Adjudicator / Data Collector) | ✅ | `requireRole` on all mutating endpoints; covered by tests |
| 4 | Tenant (organization) isolation | ✅ | org-scoped queries + explicit 403 cross-tenant guards; dedicated test suite |
| 5 | Bootstrap admin (one-time, high-entropy secret, atomic) | ✅ | disabled unless `BOOTSTRAP_SECRET` set; timing-safe compare |
| 6 | Persona switch `POST /api/v1/user` | 🟡→**fixed this release** | was **unauthenticated** (any client could mint a demo-persona JWT); now requires a valid session |
| 7 | `GET /api/v1/users` user list | 🟡→**fixed this release** | was public (user enumeration); now authenticated |
| 8 | Application docket CRUD + search/filter | ✅ | verified in API test suites |
| 9 | PDF upload w/ magic-byte verification, checksum, storage | ✅ | strict `%PDF-` header check; 15MB limit |
| 10 | Text-layer PDF extraction (pdf-parse, page split) | ✅ | sample documents exercise this path |
| 11 | OCR fallback for scanned PDFs | 🟡 | implemented via ai_service `/api/v1/ocr/pdf`; requires ai_service up + `OCR_SERVICE_TOKEN`; fails closed to `Scanned Unreadable` otherwise |
| 12 | Deterministic field extraction (lease expiry, area, trust name, AICTE ref) | ✅ | regex-based, page + snippet + confidence recorded |
| 13 | Manual field correction with mandatory note | ✅ | audited |
| 14 | AICTE rule engine (INITIAL_RULES, sandbox evaluation) | ✅ | rules tests green; sandbox endpoints verified |
| 15 | Pairwise 5-class classification (MATCH/MISMATCH/MISSING/UNCERTAIN/NOT_COMPARABLE) | ✅ | 11-case taxonomy suite green; abstention to UNCERTAIN enforced |
| 16 | Calibrated ML pairwise inference (Python v2 artifact) | 🟡 | `pairwiseEngine.ts` calls `AI_SERVICE_URL/api/v1/classify-pair` with deterministic fallback; requires ai_service process running; verified by design + code inspection, live path exercised in E2E report |
| 17 | Evidence-linked findings (document, page, snippet) | ✅ | `FindingEvidence` populated by engine and rules |
| 18 | Human review adjudication (action + status + mandatory rationale) | ✅ | `recordReviewAction` audited |
| 19 | Application decision (Approved/Rejected/Clarification) | ✅ | role-gated, rationale mandatory |
| 20 | BharatCode Qwen 3.8 27B evidence-grounded explanation | 🟠→**fixed this release** | service exists with grounding guards, but: (a) `.env` had **no** `BHARATCODE_API_KEY` → endpoint always `unavailable`; (b) 5s default timeout too short for a reasoning model; (c) `content:null` (reasoning-token exhaustion) not handled. All three remediated this release |
| 21 | Deep Scrutiny memo (multi-doc synthesis) | 🟠→**improved this release** | Gemini `gemini-4-argon` path requires `GEMINI_API_KEY` (absent) → always deterministic fallback. A documented provider chain (Gemini → **BharatCode** → deterministic) is implemented this release so the provided model is actually used |
| 22 | Reports & scrutiny dossier export | ✅ | verified in suites |
| 23 | Audit ledger (hash chain + external checkpoint) | ✅ | ledger + checkpoint suites green |
| 24 | V3 annotation workbench (double-blind, adjudication, Cohen's κ, export firewall) | ✅ | 38KB workbench test suite + export firewall suite green |
| 25 | Reviewer authorization governance (authorize/revoke/self-approval block) | ✅ | suite green |
| 26 | Institutional docket intake & lifecycle + provenance verification | ✅ | suite green |
| 27 | Domain pack registry (AICTE pack, extensible) | ✅ | registry + adapter tests |
| 28 | Job queue (async processing) | 🟡 | works (tested) but unused by production request paths — documented as extension point |
| 29 | PostgreSQL / Redis / MinIO runtime | ⚪ | **not wired into app code**; enterprise compose profile only. Documented as not-runtime-supported |
| 30 | Frontend ↔ backend contract | ✅ | all 30 frontend API calls map to real routes (verified by cross-reference + contract test suite) |
| 31 | Login rate limiting | ❌→**fixed this release** | none existed; bounded in-memory limiter added for auth endpoints |
| 32 | Baseline security headers | 🟡→**fixed this release** | only PDF streams set nosniff/CSP; standard headers added globally (CSP in production static mode) |

---

## 3. Working Workflows (verified by execution)

1. Login → JWT → applications list/detail.
2. Upload PDF → checksum storage → text extraction → deterministic field extraction → automatic rule validation → findings.
3. Pairwise comparison (5-class) with abstention semantics.
4. Finding review with mandatory rationale → audit event → ledger hash extension.
5. V3 annotation: create → blind annotate → dispute → adjudicate → κ metrics → gold-standard export (firewalled).
6. `npm test` — **23 suites, all green** (run 2026-11-08, see §7). `npm run lint` (tsc strict) exit 0. `npm run build` exit 0.

## 4. Broken / Degraded Workflows (pre-remediation)

1. **AI Explanation dead on arrival:** without `BHARATCODE_API_KEY` in `.env`, `/findings/:id/explain` and `/ai/bharatcode/explain` always returned `status: unavailable`. Even with a key, the 5-second timeout and null-content handling made real responses unreliable.
2. **Deep Scrutiny AI never active** (no Gemini key) — always local fallback (graceful, but the advertised AI synthesis was inert).
3. **Unauthenticated JWT minting** via `POST /api/v1/user` (dev mode) and **public user enumeration** via `GET /api/v1/users`.

## 5. Missing Integrations

- No CORS configuration (single-origin deployment only — acceptable, documented).
- ai_service is an **optional sidecar**: OCR + ML inference degrade gracefully to deterministic behavior when it is down. No auto-start wiring from the Node process.
- No API key for Gemini; the provided BharatCode key is now the documented inference resource (see `docs/ai/AVAILABLE_MODELS_AND_RESOURCE_AUDIT.md`).

## 6. Security Review Summary (pre-remediation)

**Strong:** per-request identity/role revalidation from DB (stale-token immunity); tenant isolation with explicit 403s; timing-safe bootstrap; magic-byte + checksum + storage-key integrity for documents; path-traversal guards; SQL via parameterized `node:sqlite` statements; PII redaction + citation grounding + classifier-overwrite protection before/after LLM calls; LLM never decides institutional outcomes; demo credentials blocked in production; `.env*` gitignored; secrets scan in CI.

**Findings fixed in this release:**
- **HIGH-1:** `POST /api/v1/user` accepted unauthenticated persona switches → allowed any client to mint session tokens for seeded users. Fixed: `authenticateToken` required; claims still derived exclusively from the DB record.
- **MED-1:** `GET /api/v1/users` public → user/role/org enumeration. Fixed: `authenticateToken` required.
- **MED-2:** No rate limiting on `/auth/login` (credential brute force). Fixed: in-memory bounded limiter (per email+IP) with 429 responses.
- **LOW-1:** No baseline response headers. Fixed: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Cache-Control` on API; CSP added in production static mode.

**Accepted & documented:** no CSRF hardening (stateless Bearer API, same-origin SPA); single-process deployment assumed (no horizontal session store); 24h JWT lifetime.

## 7. Test / Build Baseline (executed 2026-11-08)

| Command | Result |
|---|---|
| `npm test` (23 suites) | ✅ ALL PASSED |
| `npm run lint` (`tsc --noEmit`) | ✅ exit 0 |
| `npm run build` (Vite production) | ✅ exit 0 (bundle 815 kB, code-splitting noted as future work) |
| `node --version` | v24.14.0 (meets `node:sqlite` requirement; CI pins Node 22) |
| `python --version` / fastapi | 3.13.7 / 0.135.3 (ai_service deps installed locally) |

## 8. ML Preservation Status

- Five-class taxonomy preserved in TS engine, Python service, annotation workbench, and schema.
- v1/v2 model artifacts present with manifest checksums (CI verifies SHA-256).
- **V3 gold-standard dataset governance intact:** `gold_standard_human.jsonl` + quarantine dir + acquisition manifests + training freeze; no new V3 training performed in this release (no authorized annotation intake occurred).
- LLM role strictly advisory/explanatory; no label override (enforced by code + tests).

## 9. Technical Debt & Performance Notes

1. Frontend single 815 kB JS chunk — add route-level code splitting (future).
2. `server/api.ts` monolith (1.6k lines) — route-per-module split (future, low risk).
3. Job queue unused by request paths — wire async OCR/extraction behind it (future).
4. `@google/genai` dependency retained for optional Gemini deep-scrutiny; harmless when unconfigured.
5. `data/` contains local test DBs (gitignored) — safe to prune locally.
6. Zero TODO/FIXME markers in `server/` or `src/`.

## 10. Priority Remediation Plan (executed in this release)

| P | Item | Status |
|---|------|--------|
| P0 | Authenticate persona-switch & user-list endpoints | ✅ Done |
| P0 | Enable + harden BharatCode integration (timeout, null-content, config) | ✅ Done |
| P1 | Login rate limiting + baseline security headers | ✅ Done |
| P1 | Deep Scrutiny provider chain using the provided model | ✅ Done |
| P1 | `.env` / `.env.example` alignment (no secrets committed) | ✅ Done |
| P2 | Full E2E validation with live model call, fresh documentation, `main` publication | ✅ Done (see E2E + Release reports) |
