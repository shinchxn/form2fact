# ADR-005: Storage Provider and Background Job Queue Abstractions

## Status
**ACCEPTED**

## Context
Form2Fact manages multi-page scanned PDF documents (e.g., land deeds, building plans, fire NOC certificates) and long-running verification jobs (OCR text extraction, multi-page vectorization, pairwise concordance classification across tens of documents).

Historically, files were written directly to local disk paths with metadata coupled to file paths, and verification jobs were executed synchronously inside Express request handlers. This created severe scalability bottlenecks:
1. Long PDF uploads (>50 MB) caused HTTP request timeouts.
2. In-memory processing blocked event loop threads during heavy computation.
3. Lack of a storage abstraction prevented deployment into containerized cloud environments (Kubernetes, AWS ECS) where local disk is ephemeral and S3/MinIO is mandatory.

## Decision
We introduce formal contract interfaces with pluggable drivers for both Object Storage and Asynchronous Job Processing:
1. **Storage Abstraction (`server/core/storage/index.ts`):**
   - Standard interface `IStorageProvider`:
     - `put(key: string, data: Buffer, contentType?: string): Promise<StoragePutResult>`
     - `get(key: string): Promise<Buffer | null>`
     - `delete(key: string): Promise<boolean>`
     - `getReadStream(key: string): Promise<NodeJS.ReadableStream | null>`
     - `exists(key: string): Promise<boolean>`
   - Drivers:
     - `LocalDiskStorageProvider`: Default implementation storing files in `data/uploads/` with SHA-256 integrity checks.
     - `S3StorageProvider` (Planned/Contract-Ready): Compatible with AWS S3, MinIO, and Google Cloud Storage.
2. **Job Queue Abstraction (`server/core/jobs/index.ts`):**
   - Standard interface `IJobQueue`:
     - `enqueue<T>(type: string, data: T, options?: JobOptions): Promise<Job<T>>`
     - `getJob(id: string): Promise<Job | null>`
     - `registerHandler(type: string, handler: JobHandler): void`
   - Drivers:
     - `InMemoryJobQueue`: Thread-safe in-memory queue with exponential backoff retries (default for local dev and unit testing).
     - `BullMQRedisJobQueue` (Planned/Contract-Ready): Redis-backed distributed queue using BullMQ for production scaling across worker clusters.
   - Status tracking via `GET /api/v1/jobs/:id` with states `queued`, `active`, `completed`, `failed`.

## Consequences
### Positive
- **Asynchronous Decoupling:** Heavy PDF parsing and pairwise ML classification run in worker queues without degrading HTTP API responsiveness.
- **Stateless Web Nodes:** By delegating file storage to S3/MinIO and jobs to Redis/BullMQ, backend containers become completely stateless and horizontally scalable.
- **Deterministic Testing:** In-memory implementations allow complete end-to-end integration testing in unit test runners without external service dependencies.

### Negative / Trade-offs
- **State Polling:** Clients submitting large document packages must check job status via polling or WebSocket notifications instead of receiving a synchronous response.

