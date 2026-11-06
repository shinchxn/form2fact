# Form2Fact Continuous Integration & Continuous Delivery (CI/CD)

**Reference:** F2F-OPS-CICD-2026  
**Status:** Canonical CI/CD Runbook  
**Audience:** All Developers, QA Engineers, DevOps Maintainers

---

## 1. PIPELINE OVERVIEW

The Form2Fact CI/CD pipeline is implemented via GitHub Actions ([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)). It provides automated verification across both language runtimes (Node.js and Python) as well as Docker container builds and security guardrails.

```
                  GitHub Push / Pull Request Event
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ node-validation  │   │ python-validation│   │ docker-validation│
│ • npm ci         │   │ • pip install    │   │ • compose config │
│ • tsc --noEmit   │   │ • py_compile     │   │ • build api      │
│ • vite build     │   │ • checksum audit │   │ • build ai       │
│ • npm test (22)  │   │ • benchmark eval │   └──────────────────┘
└──────────────────┘   └──────────────────┘             │
         │                       │                      │
         └───────────────────────┼──────────────────────┘
                                 ▼
                     ┌──────────────────────┐
                     │    security-audit    │
                     │ • Secret detection   │
                     │ • Key leak scan      │
                     └──────────────────────┘
                                 │
                                 ▼
                    Pull Request Status: PASS / FAIL
```

---

## 2. JOB DESCRIPTIONS & ACCEPTANCE GATES

### Job 1: `node-validation`
- **Environment:** Node.js 22 on `ubuntu-latest`.
- **Steps:**
  1. `npm ci`: Deterministic lockfile dependency installation.
  2. `npm run lint`: Static type analysis (`tsc --noEmit`) with strict mode. Must yield 0 errors.
  3. `npm run build`: Production client asset compilation with Vite.
  4. `npm test`: Execution of the 22-suite regression runner (117 assertions) covering SQLite persistence, RBAC, domain packs, multi-tenant isolation, and pairwise classification.

### Job 2: `python-validation`
- **Environment:** Python 3.11 on `ubuntu-latest`.
- **Steps:**
  1. Dependency installation from `ai_service/requirements.txt`.
  2. Bytecode syntax verification (`python -m py_compile`).
  3. MLOps artifact integrity check: Verifies `manifest.json` and computes SHA-256 checksums on `metadata.json` and `config.json`.
  4. Model loader execution & benchmark evaluation on 10 golden test pairs. Must yield 100% accuracy.

### Job 3: `docker-validation`
- **Steps:**
  1. Validates root `docker-compose.yml` and `infrastructure/docker-compose.yml` via `docker compose config`.
  2. Builds `form2fact-api:ci` from `Dockerfile`.
  3. Builds `form2fact-ai:ci` from `ai_service/Dockerfile`.

### Job 4: `security-audit`
- **Steps:**
  1. Scans repository tree for private keys (`BEGIN RSA PRIVATE KEY`), AWS tokens, and hardcoded JWT secrets.

---

## 3. BRANCHING & PULL REQUEST POLICY

1. **Target Branch:** All feature work targets `develop`. Production releases merge `develop` into `main`.
2. **Branch Naming Conventions:**
   - `feature/<description>`: New capabilities.
   - `chore/<description>`: Tooling, dependency, or architectural updates.
   - `fix/<description>`: Bug remediations.
3. **Required Checks for Merge:**
   - All 4 CI jobs must pass.
   - Minimum 1 approved review from a code owner.
   - Zero regression in existing test suites.

---

## 4. LOCAL PRE-PUSH VERIFICATION BATTERY

Before opening a pull request, run the exact CI verification battery locally:

```bash
# 1. Full-stack Node checks
npm run lint
npm test
npm run build

# 2. Python AI microservice checks
python -m py_compile ai_service/app/*.py
python -c "from ai_service.app.main import app; from ai_service.app.model_loader import ModelArtifactLoader; assert ModelArtifactLoader.get_instance().is_loaded"

# 3. Docker validation
docker compose config
```
