# Form2Fact — Final Product Release Report

## 1. Repository & publication

- **Repository URL:** https://github.com/shinchxn/form2fact.git
- **Final branch:** `main`
- **Final commit SHA:** `9fc1ab26b2e0da9df820c328038f67f2f6f2ab1a` (HEAD of `main` at publication)
- **Source branch integrated:** `feature/bharatcode-submission-readiness` (12 commits ahead of the original `main`; merged via fast-forward, no history rewrite, no force push)
- **Publication method:** local `main` fast-forwarded to the feature branch tip, release commits added, pushed to `origin main` (`e1a6c53..9fc1ab2 main -> main`). No `--force`, no `reset --hard`.

## 2. Features verified

- User/auth: login, JWT revalidation, RBAC, tenant isolation, bootstrap admin, persona switch (now auth-gated).
- Documents: upload (magic-byte + checksum + storage key), text extraction (pdf-parse v2 + v1 fallback), OCR fallback path, deterministic field extraction, manual correction.
- Verification: pairwise 5-class classification with abstention, domain rules, evidence-linked findings.
- AI: BharatCode service (hardened: 60 s timeout, null-content handling, 402 handling, grounding guards); documented provider chain for deep scrutiny.
- Review: adjudication with mandatory rationale, audit event, ledger hash extension.
- V3 annotation workbench, reviewer authorization governance, institutional docket intake/lifecycle, ledger checkpoint — all covered by their existing suites.

## 3. AI models integrated

- **BharatCode `qwen-3.8-27b`** (standard tier, 262 k context, reasoning, JSON mode) — integration code complete and verified; a real model response was captured earlier in development (28.5 s latency, evidence-grounded). Currently BLOCKED at the credential/subscription layer (see E2E report §3).
- **Gemini `gemini-4-argon`** — optional primary for deep scrutiny; requires `GEMINI_API_KEY` (absent → BharatCode → deterministic chain).
- **Calibrated ML pairwise classifier (Python v2)** — wired via `AI_SERVICE_URL/api/v1/classify-pair` with deterministic fallback.

## 4. API integration status

- Base URL `https://bharatcode.ai/api/model/v1` verified (HTTP 200 on `/models`).
- Protocol: OpenAI-compatible `/chat/completions` (no `/responses` endpoint advertised).
- Models verified: `qwen-3.8-27b` (standard), `deepseek-v4.1-flash` (heavy, not used in product).

## 5. Test results

- `npm run lint` (`tsc --noEmit`): **exit 0**.
- `npm test` (23 suites): **ALL PASSED**.
- `npm run build` (Vite production): **exit 0** (815 kB single chunk; code-splitting noted as future work).
- E2E script (`scripts/e2e-validation.mjs`): **23 PASS · 0 FAIL · 2 BLOCKED** (live AI blocked by credential/subscription).

## 6. Security results

- HIGH-1 (unauthenticated persona-switch JWT minting) — fixed & tested (401).
- MED-1 (public user enumeration) — fixed & tested (401 unauth, 200 authed).
- MED-2 (login brute force) — fixed & tested (429 after burst).
- Baseline security headers — applied and verified.
- Tenant isolation, RBAC, document integrity (magic-byte + checksum + storage-key), audit ledger — verified.
- No secrets committed (`.env*` gitignored; CI secret scan).

## 7. Build results

- TypeScript strict compile: clean (exit 0).
- Vite production build: success (3.14 s).
- Python ai_service: dependencies installed locally (fastapi 0.135.3, python 3.13.7); CI validates byte-compile + manifest checksums + model loading.

## 8. Deployment readiness

- Clean install documented (`npm ci`, `pip install -r ai_service/requirements.txt`).
- `.env.example` updated with `BHARATCODE_TIMEOUT_MS`; no real secrets committed.
- Docker compose validates (`docker compose config`, `docker compose -f infrastructure/docker-compose.yml config`).
- Health check endpoint `/api/v1/health` returns 200.
- New developer can clone, configure `.env`, and run per README.

## 9. Remaining limitations

See `docs/engineering/END_TO_END_VALIDATION_REPORT.md` §5:
1. Live AI inference blocked by credential/subscription.
2. Frontend ships a single 815 kB JS chunk (code-splitting future work).
3. `server/api.ts` is a 1.6 k-line monolith (route-per-module split future work).
4. Job queue is implemented + tested but unused by request paths (documented extension point).
5. PostgreSQL/Redis/MinIO are enterprise compose-profile only, not runtime-supported.
6. OCR sidecar (`ai_service`) is optional; scanned PDFs degrade to `Scanned Unreadable` when down.
7. V3 gold-standard training remains frozen (no authorized annotation intake this release).

## 10. Git publication status

- Final commit SHA: `9fc1ab26b2e0da9df820c328038f67f2f6f2ab1a`
- Branch: `main`
- Remote: `origin` (https://github.com/shinchxn/form2fact.git)
- Push status: **completed** (`e1a6c53..9fc1ab2 main -> main`; verified `origin/main == local main`)
- `BharatCode.txt`: present at repository root (tracked).
- `.opencode/skills/` (local dev tooling): **not** published (verified: 0 tracked files).
- No secrets or unauthorized datasets published.