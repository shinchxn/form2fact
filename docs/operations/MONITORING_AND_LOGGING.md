# Form2Fact Monitoring, Observability & Operational Logging

**Reference:** F2F-OPS-MONITOR-2026  
**Audience:** SREs, DevOps Engineers, Support Engineers

---

## 1. OBSERVABILITY TOPOLOGY

Form2Fact implements a lightweight, low-overhead monitoring approach combining native container health probes, structured logging, and internal application health endpoints.

```
+--------------------------------------------------------------------------+
| Container Engine Probes (Every 15-30s)                                   |
|                                                                          |
|  [api-server] -----> GET http://localhost:3000/api/v1/health             |
|                       Response: { status: "ok", version: "1.2.0" }       |
|                                                                          |
|  [ai-service] -----> GET http://localhost:8000/api/v1/health             |
|                       Response: { status: "healthy", model_loaded: true }|
+--------------------------------------------------------------------------+
```

---

## 2. HEALTH ENDPOINTS SPECIFICATION

### 2.1 Core API Server (`api-server`)
- **Endpoint:** `GET /api/v1/health`
- **Response Format:**
  ```json
  {
    "status": "ok",
    "service": "Form2Fact Document Intelligence Platform",
    "version": "1.2.0",
    "timestamp": "2026-11-06T06:00:00.000Z"
  }
  ```
- **Probe Failure Criteria:** Non-200 HTTP response or latency $> 5$ seconds.

### 2.2 AI Microservice (`ai-service`)
- **Endpoints:** `GET /api/v1/health` and `GET /health`
- **Response Format:**
  ```json
  {
    "status": "healthy",
    "service": "form2fact-ai-service",
    "model_version": "v1.0.0",
    "model_readiness": {
      "model_loaded": true,
      "is_fallback": false,
      "active_version": "v1.0.0",
      "status_message": "Model v1.0.0 (form2fact-pairwise-hybrid-v1.0.0) loaded successfully.",
      "taxonomy": ["MATCH", "MISMATCH", "MISSING", "UNCERTAIN", "NOT_COMPARABLE"]
    }
  }
  ```
- **Operational Alarm:** If `model_loaded: false` or `is_fallback: true`, an alert is logged indicating fallback heuristic execution.

---

## 3. LOGGING STANDARDS & PRIVACY POLICY

### 3.1 Log Format
All logs must follow structured formatting:
`[TIMESTAMP] [SEVERITY] [MODULE] Message { metadata }`

Example:
```
[2026-11-06T06:12:00.123Z] [INFO] [PairwiseClassifier] Pairwise comparison completed { claim: "Plot 12", label: "MATCH", confidence: 0.99 }
```

### 3.2 Privacy & Tenant Data Redaction Rules
1. **Never Log Passwords or Hashes:** Authentication routes must scrub credentials from request logs.
2. **Never Log Raw JWT Tokens:** Log only authenticated user IDs (`actorId`) and roles.
3. **No Unencrypted Institutional Docket Data:** Log field labels and numeric outcomes, not raw extracted personally identifiable information (PII).
4. **Tenant Isolation in Logs:** Include `organizationId` in audit ledger entries to support tenant audit slicing.

---

## 4. OPERATIONAL TRIAGE RUNBOOK

| Symptom | Root Cause | Immediate Action |
|---|---|---|
| `api-server` container exits immediately with code 1 | Production `JWT_SECRET` missing or $<32$ characters | Check `.env` or container environment; set a secure 32-character secret. |
| `ai-service` health check reporting `is_fallback: true` | Model manifest or artifact checksum mismatch | Verify `ai_service/models/manifest.json` and check that `metadata.json` exists in target version directory. |
| HTTP 502 / Gateway Timeout from API | AI service container crashed or unreachable | Run `docker compose ps` and `docker compose logs ai-service` to inspect Python tracebacks. |
| Disk space alerts on host | Unpruned Docker build cache or growing PDF dockets | Run `docker system prune -f` and execute backup rotation for `data/dockets/`. |
