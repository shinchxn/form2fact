# FORM2FACT — ARCHITECTURE INTEGRITY REPORT

**Audit Date:** 2026-11-06  
**Auditor:** Principal Software Architect & DevOps Lead  
**Repository:** [https://github.com/shinchxn/form2fact.git](https://github.com/shinchxn/form2fact.git)  
**Evaluated Branch:** `main` (commit `9611575`)  
**Scope:** Core system topology, microservice decoupling, domain extensibility, persistence adapters, and execution flows.

---

## 1. System Topology & Component Decoupling

Form2Fact is engineered as an evidence-first institutional document intelligence platform. The runtime decouples user-facing orchestration and regulatory scrutiny from computationally intensive neural pairwise inference:

```mermaid
flowchart TD
    Client["React 19 + Vite 8 SPA Client (Port 3000)"] -->|"REST + Bearer JWT"| Gateway["Express 4 Gateway & Scrutiny Engine (Port 3000)"]
    Gateway -->|"Synchronous SQLite Driver (DatabaseSync)"| DB[("Local SQLite Database (./data/form2fact.db)")]
    Gateway -->|"IStorageProvider / FS"| Storage["Durable Docket Store (./data/dockets/)"]
    Gateway -->|"HTTP JSON REST (/classify-pair, /batch-classify)"| AIService["Python FastAPI AI Microservice (Port 8000)"]
    AIService -->|"Feature Assembly (MiniLM Embeddings)"| PyTorch["PyTorch & HuggingFace Models"]
    AIService -->|"Inference & Scaling (T=1.8182)"| Head["HistGradientBoostingClassifier"]
    AIService -->|"Tesseract OCR Engine"| OCR["OCR Pipeline (pytesseract)"]
```

### Component Breakdown
1. **Frontend Client (`src/`):** React 19 single-page application built with Vite 8.3 and Tailwind CSS 4.3. Communicates via authenticated REST endpoints (`src/services/api.ts`).
2. **Scrutiny Engine Gateway (`server/`):** Node.js 24 runtime executing Express. Hosts authentication, tenant enforcement, statutory rule engine, pairwise dispatch, document processing, and audit ledger persistence.
3. **AI Microservice (`ai_service/`):** Python 3.12 FastAPI service (`ai_service/app/main.py`). Hosts semantic embedding extraction, numerical feature synthesis, calibrated tabular gradient boosting inference, and OCR extraction.
4. **Durable Persistence Layer:** Local synchronous SQLite via Node 24 native `node:sqlite` module and hierarchical docket filesystem storage.

---

## 2. Pluggable Domain Pack Architecture

To maintain domain independence, Form2Fact isolates regulatory authority logic into discrete pluggable domain packs (`server/domains/types.ts`):

```typescript
export interface DomainPack {
  id: string;
  name: string;
  version: string;
  category: string;
  description: string;
  documentTypes: DomainDocumentType[];
  fieldDefinitions: DomainFieldDefinition[];
  rules: Rule[];
}
```

### AICTE Reference Pack (`server/domains/aicte/index.ts`)
- **Domain Identity:** `aicte` (AICTE Institutional Approval & Compliance Scrutiny, v1.2.0).
- **Recognized Documents:** Registered Land Lease Deed, Land Ownership Title Deed, Building Safety Certificate, Fire Safety NOC, Society/Trust Registration Certificate, AICTE Prior Approval Order.
- **Rule Decoupling:** Rules specify statutory references (e.g., *Approval Process Handbook Ch. 1 Sec. 4.2*), category bindings, and explicit parameter thresholds (e.g., minimum 30-year lease duration).
- **Extensibility:** New regulatory domains (e.g., UGC, NBA, Medical Council) require only registering a corresponding `DomainPack` instance without altering core gateway or ML inference pipelines.

---

## 3. Storage Provider Abstraction

Document ingestion and retrieval operate via the `IStorageProvider` contract defined in `server/core/storage/index.ts`:

```typescript
export interface IStorageProvider {
  save(applicationId: string, docId: string, buffer: Buffer, mimeType?: string): Promise<StorageMetadata>;
  getStream(storageKey: string): Promise<fs.ReadStream>;
  getBuffer(storageKey: string): Promise<Buffer>;
  delete(storageKey: string): Promise<boolean>;
  exists(storageKey: string): Promise<boolean>;
  getAbsolutePath(storageKey: string): string;
}
```

### Implementations & Reality
- **`LocalDiskStorageProvider` (Default / Active):** Persists dockets under `./data/dockets/${applicationId}/${docId}.pdf`. Implements directory containment checks to prevent path traversal attacks. Computes SHA-256 integrity checksums upon write.
- **`MinioS3StorageProvider` (Enterprise Ready):** Implemented in `server/core/storage/index.ts` for object-store deployments backed by S3 or MinIO. Activated when `STORAGE_PROVIDER=s3` is configured in environment variables.

---

## 4. Job Queue & Processing Pipeline Reality

The codebase provides an asynchronous job queue abstraction in `server/core/jobs/index.ts` featuring `IJobQueue` and `InMemoryJobQueue` with job statuses (`queued`, `processing`, `completed`, `failed`), progress metrics, and retry policies.

### Architectural Reality Assessment:
- **Status:** **HYBRID EXECUTION.**
- The `InMemoryJobQueue` infrastructure is fully implemented and tested.
- In current operational workflows, document extraction and pairwise inference are executed synchronously inside Express route handlers (`server/routes.ts`) to provide immediate synchronous feedback to scrutiny officers during interactive review.
- The job queue is wired to handle deferred batch recalculations during bulk regulatory re-audits.

---

## 5. Persistence Driver Architecture (SQLite vs. PostgreSQL)

### Active Driver: Native Node 24 SQLite (`node:sqlite`)
- Implemented in `server/db.ts` utilizing `DatabaseSync` from Node.js 24 standard library.
- Zero third-party binary C++ binding dependencies (`better-sqlite3` eliminated), guaranteeing cross-platform deterministic operation without compilation toolchains.
- Uses Write-Ahead Logging (WAL) and foreign key constraint enforcement (`PRAGMA foreign_keys = ON;`).
- Transactions are managed synchronously using native transaction blocks (`BEGIN IMMEDIATE ... COMMIT/ROLLBACK`).

### Enterprise Database Target: PostgreSQL
- PostgreSQL schemas and migration scripts are maintained under `infrastructure/db/init.sql`.
- Configured for multi-instance distributed deployments via `docker-compose.enterprise.yml`.
- Dual database strategy allows single-binary embedded deployment for air-gapped regional scrutiny offices while maintaining zero-code-change enterprise compatibility.

---

## 6. Gateway-to-AI Microservice Protocol

The communication bridge between Express Gateway (`server/pairwiseEngine.ts`) and Python AI microservice (`ai_service/app/main.py`) operates via HTTP/1.1 REST:

1. **Health Verification:** Gateway probes `http://localhost:8000/health` during startup.
2. **Payload Structure:** Scrutiny engine transmits JSON payload with `declared_field_name`, `declared_field_value`, `evidence_field_name`, `evidence_field_value`, and `document_type`.
3. **Inference Execution:**
   - Text pair encoded into 384-dimensional dense semantic vectors using `sentence-transformers/all-MiniLM-L6-v2`.
   - Structural tabular features (Levenshtein ratio, numerical delta, date concordance, token containment) synthesized into 1,544-element feature vector.
   - `HistGradientBoostingClassifier` executes multi-class classification.
   - Temperature scaling wrapper ($T = 1.8182$) scales raw decision logits.
   - Confidence threshold evaluator enforces 0.60 cutoff: below 0.60, classification yields `UNCERTAIN`.
4. **Fault Tolerance Heuristic:** If the AI microservice is temporarily unreachable, `server/pairwiseEngine.ts` executes a deterministic lexical fallback comparison, tagging the finding with `model_source: 'lexical_fallback'` to prevent platform outage.

---

## 7. Zero Autonomous Decision Invariant

Form2Fact enforces an architectural invariant across all layers:
- The AI inference engine and deterministic rules engine **never** mutate application approval status to `Approved` or `Rejected`.
- All automated outputs are persisted as `findings` with initial state `Open`.
- Transitioning an institutional application status requires an explicit, authenticated, role-authorized human POST to `/api/applications/:id/decision` by an authorized reviewer.
- Every decision captures reviewer identity, cryptographic timestamp, and statutory rationale in the append-only `application_decisions` and `audit_events` tables.

---

## 8. Summary Assessment

The architecture satisfies high cohesion and low coupling principles. Clear interface boundaries (`IStorageProvider`, `IJobQueue`, `DomainPack`) shield the scrutiny workflow from low-level storage and inference implementations.
