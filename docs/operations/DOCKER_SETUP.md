# Form2Fact Docker & Container Orchestration Guide

**Reference:** F2F-OPS-DOCKER-2026  
**Audience:** DevOps Engineers, Backend Developers, System Administrators

---

## 1. QUICK START

To build and run the complete Form2Fact stack locally using Docker Compose:

```bash
# 1. Clone repository and navigate to root
cd form2fact

# 2. Copy the environment configuration template
cp .env.example .env

# 3. Build container images and launch stack in background
docker compose up --build -d

# 4. Verify all container health checks pass
docker compose ps

# 5. Access the application
# Web UI & REST API: http://localhost:3000
```

---

## 2. CONTAINER ARCHITECTURE & TOPOLOGY

The default Docker Compose configuration runs two coordinated services on an isolated bridge network (`form2fact-network`):

```
+-------------------------------------------------------------------------+
| Host Machine (Port 3000 Ingress)                                        |
|                                                                         |
|  +---------------------------+         +-----------------------------+  |
|  | api-server                |         | ai-service                  |  |
|  | (Node.js 22 + React SPA)  |         | (FastAPI + Pairwise ML)     |  |
|  | Port: 3000:3000           |  HTTP   | Port: Internal 8000         |  |
|  | User: node (1000)         | ------> | User: appuser (1000)        |  |
|  | Volume: /app/data         |         | Volume: /app/models         |  |
|  +---------------------------+         +-----------------------------+  |
|               |                                       |                 |
|               v                                       v                 |
|      [form2fact_data volume]               [form2fact_models volume]    |
|      - SQLite: form2fact.db                - manifest.json              |
|      - Dockets: dockets/*.pdf              - versions/v1.0.0/           |
+-------------------------------------------------------------------------+
```

---

## 3. INDIVIDUAL CONTAINER BUILDS

### 3.1 Building the Full-Stack API Container
```bash
docker build -t form2fact-api:latest .
```
- **Base image:** `node:22-alpine`
- **Multi-stage:** `builder` stage compiles React via Vite; `runner` stage contains minimal production dependencies.
- **Security:** Runs as non-root `USER node`.
- **Health check:** Probes `GET /api/v1/health` every 30 seconds.

### 3.2 Building the AI Microservice Container
```bash
docker build -t form2fact-ai:latest ./ai_service
```
- **Base image:** `python:3.11-slim`
- **Security:** Runs as dedicated non-root `USER appuser`.
- **Health check:** Probes `GET /api/v1/health` verifying model loading status.

---

## 4. PERSISTENT STORAGE MANAGEMENT

All institutional records, user decisions, and uploaded PDFs persist in named Docker volumes:

| Volume Name | Container Mount | Storage Contents | Persistence Policy |
|---|---|---|---|
| `form2fact_data` | `/app/data` (`api-server`) | `form2fact.db` (SQLite), `dockets/` (PDF files) | Preserved across `docker compose down`. Do not use `-v` unless a total data wipe is explicitly desired. |
| `form2fact_models` | `/app/models` (`ai-service`) | Model manifests, configuration, checkpoints | Preserved across restarts. |

### Inspecting Volumes
```bash
# List volumes
docker volume ls | grep form2fact

# Inspect SQLite file size inside volume
docker run --rm -v form2fact_data:/data alpine ls -la /data
```

---

## 5. CONTAINER OPERATIONS & LOGGING

```bash
# Tail live logs across all containers
docker compose logs -f

# Tail logs specifically for AI service
docker compose logs -f ai-service

# Restart a single container gracefully
docker compose restart api-server

# Gracefully stop containers and clean networks
docker compose down
```

---

## 6. OPTIONAL ENTERPRISE PROFILE

For enterprise production evaluations requiring PostgreSQL, Redis, and MinIO object storage:

```bash
docker compose --profile enterprise up -d
```
This activates:
- `form2fact-postgres` (PostgreSQL 16 Alpine on port 5432)
- `form2fact-redis` (Redis 7 Alpine on port 6379)
- `form2fact-minio` (MinIO Object Storage on ports 9000 & 9001)
