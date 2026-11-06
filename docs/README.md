# Form2Fact — Project Knowledge Base & Documentation Portal

Welcome to the central technical documentation and knowledge base for **Form2Fact** — the evidence-first, domain-independent document intelligence and regulatory cross-verification platform.

---

## 📚 Knowledge Base Index

### 1. Architecture & System Design
- 🏛️ **[Repository Architecture](architecture/REPOSITORY_ARCHITECTURE.md)** — Modular monolith structure, layer boundaries, and directory layout.
- 📐 **[System Architecture](architecture/system-architecture.md)** — End-to-end component interaction, dual-engine design, and container orchestration.
- 🚀 **[Deployment Architecture](architecture/DEPLOYMENT_ARCHITECTURE.md)** — Production & development container topology, volume persistence, and network isolation.
- 🔄 **[Data Flow Pipeline](architecture/data-flow.md)** — Lifecycle stages: Intake ➔ Ingestion ➔ Extraction ➔ Normalization ➔ Pairwise Classification ➔ Regulatory Rules ➔ Adjudication.
- 📦 **[Domain Packs](architecture/domain-packs.md)** — Domain-agnostic abstraction and pluggable regulatory packs.
- ⚡ **[Background Job Queues](architecture/background-jobs.md)** — Asynchronous document processing and job lifecycle.

### 2. Forensic Audit & Remediation
- 📋 **[Master Audit Report](audit/MASTER_AUDIT_REPORT.md)** — Comprehensive technical baseline, codebase audit, and evaluation scorecards.
- 🛠️ **[DevOps & MLOps Current State Audit](audit/DEVOPS_MLOPS_CURRENT_STATE.md)** — Infrastructure, container, persistence, and CI/CD audit.
- 📊 **[Implementation Gap Matrix](audit/IMPLEMENTATION_GAP_MATRIX.md)** — Complete gap analysis and implementation coverage tracking.
- 🎯 **[Prioritized Correction Plan](audit/PRIORITIZED_CORRECTION_PLAN.md)** — Prioritized remediation roadmap (P0 through P3).
- 🛡️ **[P0 Remediation Report](audit/P0_REMEDIATION_REPORT.md)** — Evidence report for P0-01 through P0-05 security and classification fixes.
- 🗃️ **[Repository Inventory](audit/REPOSITORY_INVENTORY.md)** — File-by-file categorization, ownership, and tech stack mapping.
- 🧹 **[Duplicate & Unused Files](audit/DUPLICATE_AND_UNUSED_FILES.md)** — Forensic file audit and elimination inventory.
- 📜 **[Repository Cleanup Report](audit/REPOSITORY_CLEANUP_REPORT.md)** — Action report for architecture cleanup and branch organization.
- 📈 **[Development Status](audit/DEVELOPMENT_STATUS.md)** — Architectural refactor milestones and verification ledger.

### 3. API & AI Contracts
- 🔌 **[REST Endpoints](api/rest-endpoints.md)** — Canonical REST API specification (`/api/v1/*`), request/response contracts, and RBAC permissions.
- 🤖 **[AI Service Contracts](api/ai-service-contracts.md)** — FastAPI microservice specifications, schemas, and benchmark endpoints.
- 🧠 **[Pairwise Classifier](ai-models/pairwise-classifier.md)** — Five-class pairwise taxonomy and hybrid deterministic/ML inference.
- 📊 **[Benchmark Dataset](ai-models/benchmark-dataset.md)** — Golden test pairs, synthetic variations, and confusion matrices.

### 4. Database & Persistence
- 🗄️ **[Database Schema](database/schema.md)** — Dual PostgreSQL/SQLite relational models, entity relationships, and audit ledger structure.
- 🚚 **[Migrations & ETL](database/migrations.md)** — SQLite automated schema migrations and PostgreSQL ETL scripts.

### 5. Architectural Decision Records (ADRs)
- **[ADR-001: Modular Monolith with Separate AI Microservice](decisions/ADR-001-modular-monolith-and-ai-service.md)**
- **[ADR-002: Domain Pack Architecture for Regulatory Independence](decisions/ADR-002-domain-pack-architecture.md)**
- **[ADR-003: Pairwise Field Classification with Hybrid Inference](decisions/ADR-003-pairwise-classification-hybrid-inference.md)**
- **[ADR-004: Dual PostgreSQL and SQLite Compatibility](decisions/ADR-004-postgresql-and-sqlite-compatibility.md)**
- **[ADR-005: Cloud-Agnostic Storage and Job Queue Abstractions](decisions/ADR-005-storage-and-job-queue-abstractions.md)**

### 6. Design System & Frontend
- 🎨 **[Enterprise Design System](design/DESIGN_SYSTEM.md)** — Design tokens, color palette, typography, status indicators, and component patterns.

### 7. Regulatory Rules & Domain Configuration
- 📜 **[Statutory Regulatory Norms](RULES_AND_REGULATORY_NORMS.md)** — AICTE Handbook citations, normalizer formulas, and concordance logic.
- 🛠️ **[Domain Pack Authoring Guide](domain-configuration/authoring-guide.md)** — How to create custom regulatory domain packs.
- 🏛️ **[AICTE Reference Implementation](domain-configuration/aicte-reference.md)** — Detailed specification of the default AICTE domain pack.

### 8. Security & Multi-Tenancy
- 🔒 **[Tenant Isolation](security/tenant-isolation.md)** — Regional institutional partitioning, JWT claims, and scoping filters.
- 🛡️ **[Threat Model](security/threat-model.md)** — Threat vectors, mitigations, path traversal defense, and token validation.

### 9. DevOps & MLOps Operations Manuals
- 🐳 **[Docker Setup & Operations](operations/DOCKER_SETUP.md)** — Multi-stage builds, non-root users, volume persistence, and compose profiles.
- ⚙️ **[Environment & Secrets Configuration](operations/ENVIRONMENT_CONFIGURATION.md)** — Canonical dictionary, P0 JWT secret rules, and secret generation.
- 🤖 **[MLOps Model Deployment](operations/MODEL_DEPLOYMENT.md)** — Versioned artifact registry, checksum verification, and zero-code rollback.
- 🔄 **[CI/CD Pipeline](operations/CI_CD_PIPELINE.md)** — GitHub Actions pipeline specification, acceptance gates, and local pre-push battery.
- 📊 **[Monitoring & Logging](operations/MONITORING_AND_LOGGING.md)** — Observability topology, health probes, and operational triage runbooks.
- 💾 **[Backup & Recovery](operations/BACKUP_AND_RECOVERY.md)** — Atomic SQLite snapshots (`VACUUM INTO`), docket backup, and disaster recovery verification.
- 🤝 **[DevOps & MLOps Team Handoff](team/DEVOPS_MLOPS_HANDOFF.md)** — Interface contracts and runbooks for Person 1, Person 2, and Person 3.

### 10. Team & Contribution
- 👥 **[Team Ownership & Workflows](team/TEAM_OWNERSHIP.md)** — Code ownership boundaries, branch strategies, and CI/CD checklists.
- 🚀 **[Docker Deployment Guide](deployment/docker-guide.md)** — Multi-container setup instructions.
- ✅ **[Production Checklist](deployment/production-checklist.md)** — Pre-launch security, infrastructure, and compliance checklist.
- 💻 **[Developer Guide](DEVELOPER_GUIDE.md)** — Local setup, test running, and contribution guidelines.
- 🗺️ **[Document Intelligence Roadmap](DOCUMENT_INTELLIGENCE_ROADMAP.md)** — Advanced OCR and visual evidence roadmap.
