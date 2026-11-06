# System Architecture Specification

## 1. Architectural Philosophy: The Modular Monolith with Specialized AI Microservice

Form2Fact is engineered as an **evidence-first document intelligence and cross-verification platform**. Its architectural topology strikes a balance between operational simplicity and deep learning scalability:

```mermaid
graph TB
    subgraph Client Layer
        SPA["React 19 + TypeScript SPA<br/>(Tailwind CSS v4 / Vite)"]
    end

    subgraph API & Application Layer (Node.js / Express)
        Gateway["Express Router & API Gateway (/api/v1)"]
        AuthMiddleware["JWT Authentication & RBAC Middleware"]
        OrgMiddleware["Tenant Isolation Middleware (requireOrg)"]
        ValidationMiddleware["Zod Schema Validation Middleware"]
        
        subgraph Core Modules
            DomainReg["Domain Registry<br/>(DomainPack Manager)"]
            VerificationEngine["Deterministic & Pairwise Engine"]
            RulesEngine["Statutory Rule Evaluator"]
            JobQueue["Job Queue Manager<br/>(InMemory / BullMQ)"]
            Storage["Storage Provider<br/>(LocalDisk / S3-MinIO)"]
        end
    end

    subgraph Python AI Microservice (FastAPI / PyTorch)
        FastAPIApp["FastAPI REST Server (Port 8000)"]
        PairwiseML["Hybrid Pairwise Classifier<br/>(FastPath + Jaccard + Transformers)"]
        BenchDataset["Synthetic Benchmark Evaluator"]
    end

    subgraph Persistence Layer
        DB["Relational Database<br/>(SQLite Local / PostgreSQL 16 Enterprise)"]
        FileStore["Binary Object Store<br/>(Local Disk / MinIO S3)"]
        JobStore["Job State Store<br/>(In-Memory / Redis 7)"]
    end

    SPA -->|HTTPS / REST| Gateway
    Gateway --> AuthMiddleware
    AuthMiddleware --> OrgMiddleware
    OrgMiddleware --> ValidationMiddleware
    ValidationMiddleware --> VerificationEngine
    ValidationMiddleware --> RulesEngine
    
    VerificationEngine --> DomainReg
    VerificationEngine -->|HTTP Pairwise Request| FastAPIApp
    FastAPIApp --> PairwiseML
    
    Gateway --> Storage
    Gateway --> JobQueue
    
    RulesEngine --> DB
    VerificationEngine --> DB
    Storage --> FileStore
    JobQueue --> JobStore
```

## 2. Component Breakdown

### 2.1 Web Presentation Layer (React 19)
- **Framework:** React 19 with Vite and TypeScript in strict mode.
- **Styling:** Tailwind CSS v4 utilizing CSS custom property tokens defined in `src/index.css`.
- **Component Architecture:** Feature-based modular structure (`src/features/` and `src/shared/components/`):
  - `src/features/applications/`: Application lists, status overviews, institutional profile headers.
  - `src/features/verification/`: Pairwise comparison matrix, concordance tables, interactive candidate match inspector (`PairwiseComparator.tsx`).
  - `src/features/findings/`: Evidence-linked finding cards, discrepancy severity badges, page citation preview.
  - `src/features/reviews/`: Statutory human reviewer decision workbench, concurring/dissenting rationale submissions.
  - `src/shared/components/`: Enterprise UI primitives (`StatusBadge`, `DataTable`, `EvidencePanel`, `LoadingState`, `EmptyState`, `ErrorBoundary`).

### 2.2 Core Backend Layer (Node.js 22 LTS / Express)
- **Thin Controllers:** Handlers validate requests via Zod schemas, delegate execution to domain services, and return normalized JSON payloads.
- **Centralized Error Handling:** All errors derive from `AppError` (`server/core/errors/AppError.ts`) returning standardized RFC 7807-compliant payloads without leaking internal stack traces.
- **Structured Redacting Logger:** `server/core/logger/index.ts` logs JSON events while automatically redacting sensitive tokens, passwords, and PII.

### 2.3 Python AI Intelligence Service (Python 3.11+ / FastAPI)
- **Framework:** FastAPI with Pydantic v2 schemas.
- **Responsibilities:**
  - Fine-grained pairwise comparison between claim text and extracted document text.
  - Multi-feature concordance calculation (Levenshtein distance, token Jaccard similarity, numeric delta tolerance).
  - Model abstention routing: cases with confidence below 0.85 return `UNCERTAIN` and trigger human review.
  - Extensible hook for HuggingFace Cross-Encoder models (`cross-encoder/ms-marco-MiniLM-L-6-v2`) or Vision-Language Models.

### 2.4 Infrastructure & Storage Layer
- **Relational Storage:** Dual-compatible between `node:sqlite` (development/testing) and PostgreSQL 16 (production enterprise).
- **Object Storage:** Abstracted via `IStorageProvider` supporting local persistent disk or S3-compatible storage (MinIO/AWS S3).
- **Job Orchestration:** Abstracted via `IJobQueue` supporting asynchronous PDF parsing and verification pipelines.

