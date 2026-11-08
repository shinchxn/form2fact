# Agentic Awesome Skills — Usage Report

- **Repository (local):** `C:\Users\Admin\AppData\Local\npm-cache\_npx\1b971cbcafeb59a3\node_modules\agentic-awesome-skills` (npm package `agentic-awesome-skills@18.8.0`, 2,376 skills). No separate git clone was found on the filesystem; the npm-cache copy is the local repository used.
- **Installed into workspace:** `D:\Projects\form2fact\.opencode\skills\` (36 skills, each as `<id>/SKILL.md` plus supporting files, per OpenCode's project-level discovery rules).
- **OpenCode discovery mechanism:** `.opencode/skills/<id>/SKILL.md` (project scope), combined with global `~/.config/opencode/skills` and compatibility paths. Configured via `opencode.json` `skills` array (none added — filesystem discovery suffices).
- **Selection principle:** capability-category matches to Form2Fact's actual needs; catalog-wide install explicitly avoided.

## Selected skills (36) and phases used

| Skill ID | Original SKILL.md path | Phases used | Contribution |
|---|---|---|---|
| `architecture`, `architecture-review` | `skills/architecture/SKILL.md`, `skills/architecture-review/SKILL.md` | 1, 6 | Audit architecture section; confirmed SQLite-only runtime truth; flagged PostgreSQL/Redis as profile-only |
| `backend-dev-guidelines`, `backend-security-coder` | `skills/backend-dev-guidelines/SKILL.md`, `skills/backend-security-coder/SKILL.md` | 5, 7 | Route/middleware structure; RBAC/tenant enforcement review; secure bootstrap |
| `frontend-architecture`, `frontend-ui-engineering`, `frontend-api-integration-patterns` | `skills/frontend-architecture/SKILL.md`, ... | 8 | Frontend contract verification; consistent design system; API call ↔ backend contract cross-check |
| `security-audit`, `api-security`, `llm-security`, `llm-app-security`, `prompt-injection-defense`, `auth-implementation-patterns`, `saas-multi-tenant`, `file-uploads`, `api-rate-limit-handler` | `skills/.../SKILL.md` | 7 | HIGH-1 (unauth persona switch), MED-1 (user enumeration), MED-2 (login rate limit), baseline security headers, PII redaction + citation grounding in LLM calls |
| `test-automator`, `test-driven-development`, `codebase-audit-pre-push`, `production-audit`, `code-review-and-quality`, `codebase-cleanup-deps-audit`, `pre-release-review` | `skills/.../SKILL.md` | 9, 12 | Test/baseline discipline; pre-push audit; final release checklist |
| `fastapi-pro`, `python-development`, `python-testing-patterns` | `skills/.../SKILL.md` | 5, 6 | ai_service FastAPI/OCR review; dependency sanity |
| `machine-learning-ops-ml-pipeline`, `ml-engineer`, `data-engineer` | `skills/.../SKILL.md` | 4, 6 | ML preservation: v1/v2/v3 artifact governance, calibration/abstention, V3 freeze |
| `llm-structured-output`, `llm-evaluation` | `skills/.../SKILL.md` | 3, 5 | BharatCode JSON-mode + Zod validation; grounding guards; eval discipline |
| `docker-expert`, `github-actions` | `skills/.../SKILL.md` | 10, 12 | Docker compose reality-check; CI workflow verification |
| `documentation` | `skills/documentation/SKILL.md` | 11 | README + engineering doc structure |
| `observability-and-instrumentation` | `skills/observability-and-instrumentation/SKILL.md` | 6, 9 | Logger usage; usage-token logging for quota observability |
| `react-patterns`, `react-best-practices` | `skills/react-patterns/SKILL.md`, `skills/react-best-practices/SKILL.md` | 8 | Component/state patterns; bundle-size note (code-splitting future work) |

## Rejected skills (examples) and reasons

- `azure-*` (all 22 Azure skills): out of scope — no Azure deployment required by this task.
- `figma-*`: out of scope — no Figma work.
- `gitlab-ci`, `circleci`: out of scope — GitHub Actions only.
- `hugging-face-*`, `model-registry-governance`: interesting but redundant with the in-repo ML governance already in place.
- `advanced-evaluation`, `agent-evaluation`: generic agent-eval, not Form2Fact-specific.

## Installation problems / compatibility

- None blocking. All 36 selected skills have a `SKILL.md` and were copied verbatim (supporting files preserved). No existing `.opencode/` directory existed in the workspace, so no overwrites occurred.
- Skill files are treated as untrusted input per the master prompt's safety rules; no skill instruction requested credential disclosure, destructive git ops, or security bypass.

## Improvements actually contributed (summary)

1. Security hardening: HIGH-1 (unauth persona-switch JWT minting), MED-1 (user enumeration), MED-2 (login rate limit), baseline security headers — driven by `security-audit` + `auth-implementation-patterns`.
2. LLM integration hardening: timeout raised 5s→60s, null-content (reasoning-exhaustion) handling, 402 handling, provider-chain deep scrutiny — driven by `llm-structured-output` + `llm-security`.
3. PDF extraction regression fixed (pdf-parse v2 API) — driven by `backend-dev-guidelines`.
4. Audit-trail completeness (finding adjudications now appear in docket audit) — driven by `observability-and-instrumentation`.
5. Honest runtime documentation (SQLite-only; PostgreSQL/Redis profile-only) — driven by `architecture`.
