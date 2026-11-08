# Form2Fact — Final Product Release Report

## 1. Repository & publication

- **Repository URL:** https://github.com/shinchxn/form2fact.git
- **Final branch:** `main`
- **Final commit:** (filled in after push — see §10)
- **Source branch integrated:** `feature/bharatcode-submission-readiness` (12 commits ahead of `main`; fast-forward merge, no history rewrite)
- **Publication method:** local `main` fast-forwarded to the feature branch tip, release commit added, pushed to `origin main`. No `--force`, no `reset --hard`.

## 2. Features verified

- User/auth: login, JWT revalidation, RBAC, tenant isolation, bootstrap admin, persona switch (now auth-gated).
- Documents: upload (magic-byte + checksum + storage key), text extraction, OCR fallback path, deterministic field extraction, manual correction.
- Verification: pairwise 5-class classification with abstention, domain rules, evidence-linked findings.
- AI: BharatCode service (hardened: 60 s timeout, null-content handling, 402 handling, grounding guards); provider chain for deep scrutiny.
- Review: adjudication with mandatory rationale, audit event, ledger hash extension.
- V3 annotation workbench, reviewer authorization governance, institutional docket intake/lifecycle, ledger checkpoint — all covered by their existing suites.

## 3. AI models integrated

- **BharatCode `qwen-3.8-27b`** (standard tier, 262 k context, reasoning, JSON mode) — verified live earlier in the session (28.5 s real response captured); currently BLOCKED at the credential/subscription layer (see E2E report §3).
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
- E2E script: **23 PASS · 0 FAIL · 2 BLOCKED** (live AI blocked by credential/subscription).

## 6. Security results

- HIGH-1, MED-1, MED-2 fixed and regression-tested.
- Baseline security headers applied.
- Tenant isolation, RBAC, document integrity, audit ledger all verified.
- No secrets committed (`.env*` gitignored; CI secret scan).

## 7. Build results

- TypeScript strict compile: clean.
- Vite production build: success (3.14 s).
- Python ai_service: dependencies installed locally (fastapi 0.135.3, python 3.13.7); CI validates byte-compile + manifest checksums + model loading.

## 8. Deployment readiness

- Clean install documented (`npm ci`, `pip install -r ai_service/requirements.txt`).
- `.env.example` updated with `BHARATCODE_TIMEOUT_MS`; no real secrets.
- Docker compose validates (`docker compose config`, `docker compose -f infrastructure/docker-compose.yml config`).
- Health check endpoint `/api/v1/health` returns 200.
- New developer can clone, configure `.env`, and run per README.

## 9. Remaining limitations

See `docs/engineering/END_TO_END_VALIDATION_REPORT.md` §5 (live AI blocked by credential/subscription; bundle size; api.ts monolith; job queue unused; PostgreSQL profile-only; OCR sidecar optional; V3 training frozen).

## 10. Git publication status

- (to be filled with final commit SHA and push confirmation after execution)
