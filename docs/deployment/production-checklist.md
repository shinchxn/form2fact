# Enterprise Production Readiness Checklist

## 1. Security & Credentials

- [ ] **Enforce Secure JWT Secret:** Set `JWT_SECRET` in environment variables to a high-entropy string ($\ge 32$ characters). In production mode (`NODE_ENV=production`), the application refuses to start if the default development secret is detected.
- [ ] **Rotate Database Passwords:** Change default PostgreSQL credentials in `.env` and `infrastructure/docker-compose.yml`.
- [ ] **MinIO / S3 Access Keys:** Generate unique, non-root access keys for `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD`.
- [ ] **TLS / SSL Termination:** Configure HTTPS certificates via Let's Encrypt / Certbot or AWS ALB / Cloudflare.
- [ ] **CORS Configuration:** Restrict `CORS_ORIGIN` to approved institutional domain origins rather than wildcard `*`.
- [ ] **Audit Log Immutability:** Ensure database user permissions for application runtime do not grant `TRUNCATE`, `DROP`, or `DELETE` on the `audit_events` table.

---

## 2. Infrastructure & Persistence

- [ ] **PostgreSQL Point-in-Time Recovery (PITR):** Enable WAL archiving and automated daily database snapshot backups.
- [ ] **S3 Object Versioning & Lifecycle:** Enable S3 bucket versioning on the document storage bucket to prevent accidental deletion of statutory evidence.
- [ ] **Redis Persistence:** Configure Redis with RDB snapshots and AOF (Append Only File) to ensure job queue durability across container restarts.
- [ ] **Disk Space Monitoring:** Establish storage alerts on volumes hosting `data/uploads/` and MinIO partitions.

---

## 3. High Availability & Scalability

- [ ] **Stateless Node.js Containers:** Run at least 2 replica instances of the `api` container behind a reverse proxy or load balancer.
- [ ] **AI Service Concurrency:** Configure Uvicorn with multiple workers (`--workers 4`) or run the Python AI service across multiple pods.
- [ ] **Connection Pooling:** Use PgBouncer or configure Prisma/Node.js connection pool size appropriately based on PostgreSQL `max_connections`.

---

## 4. Monitoring & Telemetry

- [ ] **Structured Log Forwarding:** Ship JSON logs emitted by `server/core/logger` to centralized logging systems (Datadog, Grafana Loki, or AWS CloudWatch).
- [ ] **Health Check Probing:** Configure container liveness and readiness probes against `GET /api/v1/domains` and `GET /api/v1/health`.
- [ ] **Model Abstention Alerting:** Set up metric alerts if `UNCERTAIN` classification rates exceed normal baseline thresholds (e.g., >30% over 1 hour), indicating potential OCR extraction degradation.

