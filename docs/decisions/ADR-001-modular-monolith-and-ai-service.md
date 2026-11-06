# ADR-001: Modular Monolith with Decoupled Python AI Service

## Status
**ACCEPTED**

## Context
Form2Fact was initially structured as a unified Node.js/Express backend (`server/db.ts`, `server/api.ts`, `server/rulesEngine.ts`) executing synchronous in-process deterministic checks and basic PDF parsing. As the platform scales to support cross-document verification across diverse institutional regulatory regimes, the system faces two opposing architectural tensions:
1. **Core Business Logic & Web API Requirements:** Rapid transaction processing, relational data consistency, role-based access control (RBAC), multi-tenant organization isolation, audit trail immutability, and state transitions are best maintained with minimal distributed system overhead in TypeScript/Node.js.
2. **Document Intelligence & Machine Learning Requirements:** Advanced OCR post-processing, vision-language model (VLM) document parsing, embedding generation, dense retrieval, pairwise sentence concordance classification, and PyTorch inference natively reside within the Python AI/ML ecosystem. Forcing deep learning execution directly inside Node.js introduces heavy native bindings, worker-thread serialization overhead, and GPU memory management friction.

## Decision
We adopt a **Modular Monolith architecture** for the core backend, paired with an independently deployable **Python AI Microservice**:
1. **Core Platform (Node.js/TypeScript):**
   - Retains responsibility for HTTP API routing, authentication, tenant isolation, database persistence (SQLite for zero-config local dev, PostgreSQL for production), deterministic statutory rules, decision recording, and background job orchestration.
   - Organized into strict functional domain modules (`core`, `domains`, `modules/verification`, `modules/applications`, etc.) with thin controllers, repository patterns, and Zod request validation.
2. **AI Service (Python 3.11+ / FastAPI):**
   - Encapsulates pairwise field classification (`MATCH`, `MISMATCH`, `MISSING`, `UNCERTAIN`, `NOT_COMPARABLE`), synthetic benchmark datasets, baseline evaluation, OCR text cleaning, and future fine-tuned transformer inference.
   - Exposes strictly typed Pydantic v2 REST endpoints over HTTP/JSON (`/api/v1/classify-pair`, `/api/v1/batch-classify`).
   - Node.js invokes the AI service via an HTTP client abstraction (`PairwiseClassifier`) with fallback to local heuristic matching if the Python service is offline or operating in lightweight edge mode.

## Consequences
### Positive
- **Clean Separation of Concerns:** Python data science workflows (fine-tuning, HuggingFace transformers, PyTorch) operate in an isolated runtime without risking Node.js event-loop blockage.
- **Independent Scalability:** The Python AI service can be horizontally scaled and allocated GPU resources (e.g., NVIDIA T4/A10G) independently from the Node.js API server.
- **Low Operational Overhead for Development:** Developers can run Node.js with native SQLite and in-memory heuristics locally without requiring Python or GPU acceleration for baseline deterministic testing.

### Negative / Trade-offs
- **Network Hop Latency:** Batch pairwise classification between documents introduces an inter-service HTTP hop (~5–15ms per batch locally).
- **Dual Runtime Management:** Production deployments require orchestrating two service containers (Node.js API + Python FastAPI) via `docker-compose` or Kubernetes.

## Compliance & Non-Negotiables
- All communications between services use versioned JSON contracts.
- Node.js remains the single source of truth for database state and immutable audit logging.
- AI service responses must remain explainable and include confidence scores and rationale.

