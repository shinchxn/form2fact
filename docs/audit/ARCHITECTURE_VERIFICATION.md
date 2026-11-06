# FORM2FACT: ARCHITECTURE VERIFICATION REPORT
**Forensic Contrast: Implemented vs. Proposed Architectural Reality**

**Audit Date:** November 2026  
**Auditor:** Principal Software Architect & Technical Project Evaluator  
**Repository:** `d:\projects\form2fact`

---

## 1. Executive Contrast: Proposed Architecture vs. Actual Implementation

| Architectural Dimension | Proposed / Documented Architecture | Actual Implemented Code Reality | Verification Status |
|---|---|---|:---:|
| **Overall Topology** | Decoupled Polyglot Microservices (Node.js API + Python AI Service + PostgreSQL + Redis + MinIO) | **Single Node.js Monolith with Local SQLite**. Python AI, PostgreSQL, Redis, and MinIO exist in Docker Compose, but are completely unused by the runtime application. | **DIVERGENT** |
| **Domain Independence** | Declarative Domain Packs dynamically registered via `DomainRegistry` with zero core engine coupling | `DomainRegistry` exists as an auxiliary module, but **the core validation runner hardcodes 6 AICTE statutory rules** in `server/rulesEngine.ts`. | **PARTIALLY DIVERGENT** |
| **Pairwise Mismatch Classification** | 5-way hybrid neural classification with calibrated confidence probabilities | **Regex & Token Jaccard heuristics**. Low lexical overlap ($\le 0.20$) is incorrectly classified as a proven `MISMATCH`. Uncalibrated confidence formulas. | **PARTIALLY DIVERGENT** |
| **AI / ML Integration** | Python FastAPI service with PyTorch / HuggingFace Transformers for semantic cross-encoding | `ai_service/` contains **zero PyTorch / Transformers**. Duplicates regex/Jaccard heuristics in Python. **Never invoked by Node.js backend**. | **DIVERGENT** |
| **Document Processing** | Digital PDF parsing + Scanned Document OCR + Spatial Bounding Box Citations | **`pdf-parse` only**. Scanned photocopies are marked `Scanned Unreadable` with zero OCR. Spatial bounding boxes are never extracted. | **PARTIALLY DIVERGENT** |
| **Persistence Layer** | Dual-compatible database (SQLite local + PostgreSQL 16 enterprise with automated ETL migration) | **Hardcoded to `node:sqlite`**. No PostgreSQL driver installed in `package.json`. Migration script only counts SQLite rows. `init.sql` lacks `rules` table. | **DIVERGENT** |
| **Binary Storage** | Pluggable `IStorageProvider` supporting local disk and MinIO/S3 object storage | `IStorageProvider` defined, but **bypassed by `server/api.ts`** (which uses raw `fs.writeFileSync`). | **DIVERGENT** |
| **Asynchronous Processing** | Background worker queues via `IJobQueue` (InMemory / BullMQ Redis) | `IJobQueue` defined, but **all document ingestion and rule evaluations execute synchronously** in the HTTP request handler. | **DIVERGENT** |
| **Frontend Architecture** | Feature-sliced modular architecture (`src/features/*`) with reusable shared components | **Monolithic view components in `src/components/*`**. Feature folders are simple barrel re-exports. Shared components are implemented and functional. | **PARTIALLY DIVERGENT** |
| **Security & RBAC** | Production JWT authentication with multi-tenant organization isolation | Global `optionalAuth` leaves **all GET routes unauthenticated**. `POST /api/v1/user` permits arbitrary privilege self-escalation. Fallback JWT secret. | **CRITICAL DEFECT** |

---

## 2. Actual Implemented Architecture

```mermaid
graph TB
    subgraph Client [Browser / React 19 Frontend]
        ViteSPA[Vite Single Page Application]
        Views[Monolithic Views in src/components/<br/>Overview, Docket, Detail, Review, Findings, Rules, Reports]
        SandboxUI[PairwiseComparator.tsx<br/>Preset Dropdown Sandbox]
    end

    subgraph Server [Node.js 22 LTS Express Server]
        HTTPRouter[Express HTTP Router (server/api.ts)]
        
        subgraph SecurityLayer [Security & Middleware]
            OptAuth[optionalAuth Middleware<br/>Permits unauthenticated calls]
            RoleGuard[requireRole Middleware<br/>Protects mutating routes only]
        end

        subgraph IngestionEngine [Document Ingestion]
            MagicCheck[Magic-Byte Header Check (%PDF-)]
            DirectDisk[Direct Synchronous Disk Write<br/>fs.writeFileSync to data/dockets/]
            PDFParse[pdf-parse Synchronous Text Extractor]
            RegexExtract[Regex Field Extractor (server/extraction.ts)]
        end

        subgraph VerificationCore [Verification & Rules]
            HardcodedEngine[Monolithic Rules Engine (server/rulesEngine.ts)<br/>6 Hardcoded AICTE if/else checks]
            LocalPairwise[PairwiseFieldClassifier (server/modules/verification/)<br/>In-Process TS Regex + Jaccard Heuristic]
        end

        subgraph DataAccess [Data Persistence Layer]
            SQLiteDB[DatabaseSync Adapter (server/db.ts)]
            AuditLog[Immutable Audit Events Table]
        end
    end

    subgraph StorageFiles [Local Storage Files]
        DBFile[(SQLite: data/form2fact.db)]
        DocketsDir[Local Files: data/dockets/]
    end

    ViteSPA -->|HTTP / JSON| HTTPRouter
    HTTPRouter --> OptAuth
    OptAuth --> RoleGuard
    
    HTTPRouter --> MagicCheck
    MagicCheck --> DirectDisk --> DocketsDir
    MagicCheck --> PDFParse --> RegexExtract
    
    HTTPRouter --> LocalPairwise
    HTTPRouter --> SQLiteDB
    SQLiteDB --> DBFile
    SQLiteDB --> HardcodedEngine
    SQLiteDB --> AuditLog
```

---

## 3. Disconnected / Dormant Architecture (Implemented But Unused)

The following components exist in the repository source code, but are **not connected to the runtime data flow**:

```mermaid
graph LR
    subgraph Orphaned Code Modules
        DomainReg[DomainRegistry<br/>server/domains/registry.ts]
        AICTEPack[AICTE Domain Pack<br/>server/domains/aicte/index.ts]
        StorageAbs[IStorageProvider<br/>server/core/storage/index.ts]
        JobQueueAbs[IJobQueue<br/>server/core/jobs/index.ts]
    end

    subgraph Disconnected External Services
        FastAPI[Python AI Microservice<br/>ai_service:8000]
        PostgresDB[(PostgreSQL 16 DB<br/>infrastructure/db/init.sql)]
        Redis[(Redis 7)]
        MinIO[(MinIO S3)]
    end

    subgraph Active Monolith
        RuntimeCore[Node.js Runtime Core<br/>server/api.ts + server/db.ts]
    end

    RuntimeCore -.->|Never Calls| DomainReg
    RuntimeCore -.->|Never Calls| StorageAbs
    RuntimeCore -.->|Never Calls| JobQueueAbs
    RuntimeCore -.->|Zero Network Calls| FastAPI
    RuntimeCore -.->|No Driver in package.json| PostgresDB
    RuntimeCore -.->|No Client| Redis
    RuntimeCore -.->|No Client| MinIO

    classDef dormant fill:#fef3c7,stroke:#d97706,stroke-width:2px;
    classDef disconnected fill:#fee2e2,stroke:#dc2626,stroke-width:2px;
    classDef active fill:#dcfce7,stroke:#16a34a,stroke-width:2px;

    class DomainReg,AICTEPack,StorageAbs,JobQueueAbs dormant;
    class FastAPI,PostgresDB,Redis,MinIO disconnected;
    class RuntimeCore active;
```

---

## 4. End-to-End Data Flow (Actual Implemented Path)

```mermaid
sequenceDiagram
    autonumber
    actor User as Institutional Applicant / Reviewer
    participant API as Express Router (server/api.ts)
    participant Disk as Local Disk (data/dockets/)
    participant Parser as pdf-parse Library
    participant Extractor as Regex Extractor (server/extraction.ts)
    participant DB as SQLite Adapter (server/db.ts)
    participant Rules as Hardcoded Rules (server/rulesEngine.ts)

    Note over User, API: 1. Document Upload
    User->>API: POST /api/v1/applications/:id/documents (Multipart PDF)
    API->>API: Check %PDF- header (Magic bytes)
    API->>Disk: fs.writeFileSync(storageFilePath, buffer) [Synchronous]
    API->>Parser: pdf-parse(buffer) [Synchronous]
    alt Text length < 40 chars
        API->>DB: Save document status as 'Scanned Unreadable' (No OCR)
    else Text extracted successfully
        API->>Extractor: extractFieldsFromPages(extractedPages)
        Extractor-->>API: Extracted fields (with hardcoded confidence 0.94-0.99)
        API->>DB: saveExtractedFields(extractedFields)
        API->>Rules: evaluateApplicationRules(app, docs, fields) [Synchronous]
        Rules-->>API: Generated Findings with Evidence Citations
        API->>DB: Replace findings for application
    end
    API-->>User: 201 Created (DocumentRecord JSON)

    Note over User, API: 2. Pairwise Classifier Inspection
    User->>API: POST /api/v1/verification/pairwise (JSON)
    API->>API: In-process PairwiseFieldClassifier.compare()
    Note over API: Fast-path -> Date -> Area -> Jaccard
    API-->>User: 200 OK (MATCH / MISMATCH / UNCERTAIN / MISSING)

    Note over User, API: 3. Reviewer Adjudication
    User->>API: POST /api/v1/findings/:id/review (Action, Status, Note)
    API->>DB: recordReviewAction()
    DB->>DB: Update finding status in SQLite
    DB->>DB: Insert into audit_events in SQLite
    API-->>User: 200 OK (Updated Finding)

    Note over User, API: 4. Final Docket Determination
    User->>API: POST /api/v1/applications/:id/decision (Type, Rationale)
    API->>DB: recordApplicationDecision()
    DB->>DB: Insert into application_decisions in SQLite
    DB->>DB: Update application reviewStatus to 'Review Completed'
    DB->>DB: Insert into audit_events in SQLite
    API-->>User: 200 OK (Decision Record)
```

---

## 5. Human Review and Adjudication Flow

The human-in-the-loop adjudication flow is one of the **best-implemented and most functional parts of Form2Fact**:

1. **Evidence Grounding:** Every finding contains `declaredValue`, `evidenceValue`, `pageNumber`, and a text `snippet`.
2. **Review Actions (`review_actions` table):**
   - Reviewer actions: `Confirm Discrepancy`, `Dismiss Discrepancy`, or `Unable to Determine`.
   - Mandatory written rationale note is enforced on `POST /api/v1/findings/:id/review`.
3. **Manual Field Overrides (`extracted_fields` table):**
   - Reviewers can correct any extracted field via `PATCH /api/v1/fields/:id`.
   - The system preserves original `rawValue`, sets `isCorrected = true`, stores `correctedValue`, stamps the reviewer's user ID, and automatically triggers re-evaluation of dependent rules via `db.runValidation()`.
4. **Docket Decision (`application_decisions` table):**
   - Authorized reviewers record official statutory determinations (`Approved`, `Rejected`, `Clarification Required`) with required written rationale.
   - Persisted durably to SQLite with immutability guarantees.

---

## 6. Target Production Architecture (Recommended Blueprint)

To align the implementation with its architectural commitments, the target architecture should transition from the current state to the integrated model:

```mermaid
graph TB
    subgraph Client [React 19 SPA]
        SPA[Modular Features: applications, documents, verification, findings, reviews]
    end

    subgraph Gateway [Node.js Express API]
        AuthGuard[Mandatory JWT AuthGuard + Tenant Org Isolation]
        JobProducer[Job Queue Producer (BullMQ / Redis)]
        DBRepository[Repository Layer (IDatabaseAdapter)]
    end

    subgraph Workers [Async Worker Pool]
        DocWorker[Document Processing Worker]
        OCRWorker[OCR Engine (Tesseract / Document AI)]
        VerifyWorker[Verification Runner]
    end

    subgraph DomainLayer [Domain Pack Subsystem]
        Registry[DomainRegistry]
        AICTE[AICTE Pack]
        NAAC[NAAC Pack]
        NABH[NABH Pack]
    end

    subgraph AIService [Python AI Service]
        FastAPIEndpoint[FastAPI REST API]
        NeuralClassifier[Cross-Encoder / Transformer Pipeline]
    end

    subgraph EnterpriseStorage [Production Storage]
        PostgresCluster[(PostgreSQL 16 Primary)]
        RedisQueue[(Redis 7)]
        MinIOBucket[(MinIO / S3 Bucket)]
    end

    SPA -->|HTTPS + JWT| AuthGuard
    AuthGuard --> JobProducer
    JobProducer --> RedisQueue
    RedisQueue --> Workers
    
    Workers --> MinIOBucket
    Workers --> OCRWorker
    Workers --> Registry
    Registry --> AICTE
    Registry --> NAAC
    Registry --> NABH
    
    Workers -->|HTTP Batch Classify| FastAPIEndpoint
    FastAPIEndpoint --> NeuralClassifier
    
    Workers --> DBRepository
    DBRepository --> PostgresCluster
```

