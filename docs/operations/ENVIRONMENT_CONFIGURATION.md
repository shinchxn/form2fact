# Form2Fact Environment & Secrets Configuration Guide

**Reference:** F2F-OPS-ENV-2026  
**Status:** Canonical Configuration Reference  
**Audience:** Platform Engineers, Security Auditors, Deployment Teams

---

## 1. OVERVIEW & SECURITY MANDATE

Form2Fact enforces strict separation between application code and operational configuration following Twelve-Factor App principles.

### Strict Security Rules:
1. **Never Commit Secrets:** Real keys, tokens, or production database passwords must never appear in Git.
2. **P0 JWT Secret Production Fail-Fast:** When `NODE_ENV=production`, `server/auth.ts` validates that `JWT_SECRET` is defined, is not a known fallback string, and is at least 32 characters in length. If any check fails, the process terminates immediately with exit code `1`.
3. **Internal URLs Private:** Internal microservice addresses (`AI_SERVICE_URL`) must never be exposed to browser clients.

---

## 2. COMPLETE CONFIGURATION DICTIONARY

| Environment Variable | Affected Service | Default (Development) | Production Mandate | Purpose & Specification |
|---|---|---|---|---|
| `NODE_ENV` | `api-server` | `development` | `production` | Switches Vite middleware to static `dist/` serving and enforces strict security checks. |
| `PORT` | `api-server` | `3000` | Any valid port (3000) | Ingress port for Express HTTP server. |
| `JWT_SECRET` | `api-server` | Insecure local fallback | **MANDATORY ($\ge 32$ chars)** | Cryptographic signing secret for HMAC-SHA256 user authentication tokens. |
| `TOKEN_EXPIRY` | `api-server` | `24h` | `24h` or `12h` | JWT validity lifetime. |
| `DATABASE_PATH` | `api-server` | `./data/form2fact.db` | `/app/data/form2fact.db` | Absolute or relative path to the SQLite persistence file. |
| `DOCUMENT_STORAGE_PATH`| `api-server` | `./data/dockets` | `/app/data/dockets` | Directory where uploaded applicant PDF dockets are stored. |
| `AI_SERVICE_URL` | `api-server` | `http://localhost:8000` | `http://ai-service:8000` | Internal DNS resolution URL for the Python pairwise ML microservice. |
| `LOG_LEVEL` | Both | `INFO` | `INFO` or `WARN` | Logging verbosity threshold (`DEBUG`, `INFO`, `WARN`, `ERROR`). |
| `MODEL_VERSION` | `ai-service` | `v1.0.0` | Target release version | Version key in `models/manifest.json` to load into memory. |
| `MODEL_PATH` | `ai-service` | `./models` | `/app/models` | Filesystem path to the versioned model registry. |
| `PORT` (Python) | `ai-service` | `8000` | `8000` | Internal port for Uvicorn ASGI server. |
| `WORKERS` | `ai-service` | `2` | Calculated ($2 \times \text{cores}$) | Uvicorn worker process count for handling concurrent ML inference. |

---

## 3. HOW TO GENERATE PRODUCTION SECRETS

To generate a cryptographically sound, high-entropy 32-character secret:

```bash
# Using OpenSSL (Recommended)
openssl rand -base64 32

# Using Node.js crypto
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using Python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## 4. LOCAL DEVELOPMENT SETUP

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. The default values in `.env.example` are pre-configured to allow immediate zero-configuration local execution with `npm run dev` and `npm test`.
