<div align="center">

<img src="docs/assets/form2fact-logo.png" alt="Form2Fact Official Emblem" width="180" />

# Form2Fact
### Evidence-First Institutional Document Intelligence & Regulatory Cross-Verification Platform

[![Node.js](https://img.shields.io/badge/Node.js-v24.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-v19.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-v0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PyTorch](https://img.shields.io/badge/PyTorch-v2.6-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch.org/)
[![Vite](https://img.shields.io/badge/Vite-v8.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4.3-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-Native_Node24-003B57?logo=sqlite&logoColor=white)](https://sqlite.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose_Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![BharatCode Build League 2026](https://img.shields.io/badge/BharatCode_Build_League-2026_Submission-FF6F00?logo=target&logoColor=white)](BharatCode.txt)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**From Institutional Claims to Verifiable Statutory Evidence.**

[Live Application](http://localhost:3000) • [Multi-Model AI Architecture](#105-multi-model-ai-orchestration-layer-bharatcode-qwen-deepseek--adaption) • [Architecture](#7-system-architecture) • [Workflow](#8-application-workflow) • [API Documentation](#15-api-documentation) • [Installation](#13-installation-and-setup)

</div>

---

## BharatCode Build League 2026 Submission
- **Target Competition:** BharatCode Build League 2026 (`https://auth.bharatcode.ai/build`)
- **Recommended Category:** **Work & automation** (Cognitive Document Intelligence & Regulatory Scrutiny Automation)
- **Multi-Model AI Integration:**
  - **BharatCode Qwen 3.8 27B (`qwen-3.8-27b`):** High-capacity bilingual reasoning model for evidence-grounded finding explanations.
  - **BharatCode DeepSeek v4.1 Flash (`deepseek-v4.1-flash`):** Ultra-fast, 65,536-token long-context model for holistic cross-document scrutiny memos.
  - **Adaption SFT Model (`form2fact-adaption-sft-v1.0`):** Domain-adapted statutory SFT model pipeline trained via Adaption AutoScientist.
  - **Form2Fact Hybrid Pairwise Classifier (Authoritative):** Calibrated 5-class verification engine retaining sole decision authority.
- **Bilingual Scrutiny:** English and Tamil (`தமிழ்`) reasoning toggle for regional state dockets.
- **Submission Specification:** Fully documented in root [`BharatCode.txt`](BharatCode.txt) and [`docs/engineering/`](docs/engineering/).

---

## 1. Project Branding & Identity

**Form2Fact** is an evidence-first regulatory intelligence platform engineered for higher education regulatory authorities (specifically conforming to the **All India Council for Technical Education (AICTE) Approval Process Handbook** standards). 

The platform bridges the trust gap between institutional approval applications (self-reported claims) and physical legal evidentiary documents (registered land deeds, municipal approvals, trust registration certificates, and fire safety NOCs).

> **Governance Principle — Zero Autonomous Decisions:**  
> Form2Fact is an evidence-backed **decision-support platform**, NOT an autonomous approval black-box. The platform never approves or rejects regulatory applications automatically. All non-trivial variances, missing documentation, or model uncertainty are triaged with handbook citations and routed to accredited human scrutiny officers for adjudication.

> **Operational Data Policy — Production vs. Evaluation Sandbox:**  
> - **Production Mode (`NODE_ENV=production` or `SEED_DEMO_DATA=false`):** Guaranteed **Zero Mock / Zero Fabricated Data**. The platform initializes with an empty institutional docket (0 applications, 0 documents, 0 findings) preserving only the statutory rules catalog and authorized authority accounts. Every displayed metric, table row, and finding originates solely from authentic applicant submissions, genuine uploaded PDFs, real OCR extraction, and neural/deterministic screening.
> - **Evaluation Sandbox (`NODE_ENV=development`):** Designed exclusively for technical reviewers and automated CI testing. Sample institutional PDFs are available under `sample_documents/` and authorized test fixtures can be loaded via the administrator console to evaluate the scrutiny engine without requiring manual data entry.

---

## 2. Overview

Institutional regulatory scrutiny is historically plagued by manual, error-prone human review processes:
- **Volume & Density:** Thousands of multi-page legal deeds, land title indentures, and certificates must be inspected across brief approval cycles.
- **Syntactic vs. Semantic Divergence:** Minor variations in spelling, cadastral survey numbering, or lease duration formatting lead to either overlooked statutory violations or unjustified rejection delays.
- **Fragmented Evidence:** Reviewers must toggle between separate claims databases, multi-gigabyte scanned PDF dossiers, and physical gazette guidelines.

**Form2Fact** solves this through automated extraction, calibrated pairwise neural classification, deterministic regulatory rules evaluation, and an interactive 3-pane evidence verification workbench.

---

## 3. Problem Statement

During institutional approval cycles:
1. **Tenure Deficits:** Land lease agreements must guarantee an unexpired tenure of at least 30 continuous years under AICTE regulations. Detecting expired or short-term leases across complex multi-indenture deeds manually is slow and prone to oversight.
2. **Parcel Fragmentation & Double-Counting:** Campuses with multiple land parcels must aggregate acreage across distinct deeds without double-counting identical survey plots.
3. **Entity Mismatches:** Sponsoring societies, educational trusts, and institutional names frequently diverge between historical title deeds and current application forms.

---

## 4. Solution & Core Workflow

Form2Fact automates evidence verification across seven distinct stages:

```
[Institutional Claim Intake] 
          │
          ▼
[Document Ingestion & Checksum] (SHA-256 + %PDF- magic-byte validation)
          │
          ▼
[Text Extraction & OCR] (pdf-parse text layer + Tesseract OCR fallback)
          │
          ▼
[Structured Normalization] (ISO dates, numeric acreage, uppercase entities)
          │
          ▼
[Calibrated Pairwise Classifier] (5-class taxonomy with temperature scaling)
          │
          ▼
[Deterministic AICTE Rules Engine] (Handbook statutory rules evaluation)
          │
          ▼
[Evidence Workbench & Human Review] (Traceable page citations & immutable audit log)
```

---

## 5. Target Users & Responsibilities

| Persona | Role | Key Responsibilities |
| :--- | :--- | :--- |
| **Scrutiny Officer / Reviewer** | Regulatory Auditor | Inspects flagged discrepancies, evaluates pairwise evidence comparisons, reviews document text citations, and records formal adjudications. |
| **Global Administrator** | Quality Assurance Lead | Manages system parameters, configures statutory rules lifecycle, monitors tenant queues, and oversees audit event streams. |
| **Statutory Auditor (Viewer)** | Read-Only Oversight | Inspects generated regulatory dossiers, validates cryptographic checksums, and audits historical decision logs. |
| **Institutional Applicant** | Institution Officer | Submits institutional claims, uploads authentic PDF supporting evidence, and provides required clarifications. |

---

## 6. Key Features

- **Multi-Model AI Orchestration:** Task-based intelligent routing across BharatCode Qwen 3.8 27B, DeepSeek v4.1 Flash, and Adaption SFT models, strictly preserving the authoritative 5-class pairwise classifier.
- **Bilingual Legal Scrutiny:** Dynamic language toggle between English and Tamil (`தமிழ்`) for vernacular legal deeds and regional regulatory dockets.
- **Multi-Tenant Regional Scrutiny:** Strict tenant data isolation between Western, Central, and Northern Directorates.
- **Cryptographic Evidence Verification:** Magic-byte header validation (`%PDF-`) and SHA-256 integrity checksums for every docket upload.
- **Calibrated Pairwise Field Matching:** Neural and deterministic token-level comparison evaluating institutional parameters across the 5-class taxonomy (`MATCH`, `MISMATCH`, `MISSING`, `UNCERTAIN`, `NOT_COMPARABLE`).
- **AICTE Regulatory Rules Engine:** Automated statutory evaluation of:
  - `RULE-TEN-01`: Minimum 30-year unexpired lease tenure requirement.
  - `RULE-NAME-02`: Concordance between sponsoring society and beneficiary institution.
  - `RULE-AREA-03`: Multi-parcel land acreage aggregation without double-counting.
  - `RULE-DOC-04`: Mandatory Fire & Life Safety NOC presence.
  - `RULE-SAFETY-06`: Identification of unreadable scanned photocopies.
- **Anti-Hallucination Grounding Guards:** Automatic stripping of fabricated citations; enforcement that external LLMs cannot override deterministic finding classifications.
- **Multilingual OCR Pipeline:** Hybrid extraction combining high-speed PyMuPDF text layers with Tesseract multilingual OCR supporting English (`eng`), Tamil (`tam`), and Hindi (`hin`).
- **Coordinated 3-Pane Document Viewer:** Document index, high-fidelity canvas, and structured parameter inspector with exact page-level citations.
- **Zero-Mock Operational Integrity:** In clean production environments, zero fabricated demo records or fake metric cards are rendered.
- **Immutable Audit Trail:** Append-only cryptographic ledger tracking every field override, status transition, and reviewer sign-off.

---

## 7. System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend Client (React 19 + Vite + Tailwind CSS)"]
        UI[Executive Overview Dashboard]
        Docket[Applications Docket]
        Workbench[3-Pane Evidence Workbench]
        Findings[Compliance Triage & Adjudication]
        ModelToolbar[Multi-Model Selector & Lang Toggle]
    end

    subgraph Gateway["API Gateway & Scrutiny Engine (Node 24 + Express)"]
        Auth[JWT & RBAC Module]
        Tenant[Multi-Tenant Isolation]
        Rules[Deterministic AICTE Rules Engine]
        Router[Task-Based ModelRouter]
        Registry[Multi-Model Registry]
        Storage[Storage Provider: Local Disk (Append-Only)]
        DB[(Persistent SQLite with WAL)]
    end

    subgraph ExternalAI["External & Adapted AI Providers"]
        Qwen[BharatCode Qwen 3.8 27B]
        DeepSeek[BharatCode DeepSeek v4.1 Flash]
        Adaption[Adaption Labs SFT Checkpoint]
    end

    subgraph AIService["AI & ML Microservice (FastAPI + PyTorch)"]
        PairwiseML[Calibrated Pairwise Classifier V2]
        TempScaling[Temperature Scaling Layer T=1.8182]
        OCR[Tesseract Multilingual OCR: eng+tam+hin]
    end

    UI -->|HTTPS / REST API| Auth
    Docket --> Auth
    Workbench --> Auth
    Findings --> Auth
    ModelToolbar --> Auth

    Auth --> Tenant
    Tenant --> Rules
    Tenant --> Storage
    Tenant --> DB

    Rules -->|Task: field_comparison (Authoritative)| PairwiseML
    PairwiseML --> TempScaling

    Findings -->|Task: evidence_explanation| Router
    Findings -->|Task: document_scrutiny| Router
    Router --> Registry
    Registry -.->|Advisory Reasoning| Qwen
    Registry -.->|Long-Context Scrutiny| DeepSeek
    Registry -.->|Domain Adaptation| Adaption

    Storage -->|PDF Buffer Stream| OCR
```

---

## 8. Application Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Officer as Scrutiny Officer
    participant UI as Form2Fact UI
    participant Server as Express Scrutiny Engine
    participant ML as FastAPI ML Microservice
    participant DB as Persistent SQLite DB

    Officer->>UI: Upload Applicant Land Deed (PDF)
    UI->>Server: POST /api/v1/applications/:id/documents
    Server->>Server: Validate Magic Bytes (%PDF-) & Compute SHA-256
    Server->>Server: Extract Text Layer (pdf-parse)
    alt Text Layer Missing / Scanned
        Server->>ML: POST /api/v1/ocr/pdf
        ML-->>Server: Extracted Page OCR & Bounding Boxes
    end
    Server->>Server: Normalize Fields (ISO Dates, Acreage Figures)
    Server->>ML: POST /api/v1/classify-pair (Claim vs Evidence)
    ML-->>Server: 5-Class Prediction + Calibrated Confidence
    Server->>Server: Evaluate AICTE Rules (Tenure, Area, Trust)
    Server->>DB: Persist Document, Extracted Fields & Findings
    Server-->>UI: Real-Time Verification Dossier
    UI->>Officer: Display Findings & Evidence Workbench
    Officer->>UI: Adjudicate Discrepancy & Sign Off
    UI->>Server: POST /api/v1/findings/:id/review
    Server->>DB: Append Immutable Audit Ledger Event
```

---

## 9. Pairwise Classification Taxonomy & Abstention

Form2Fact implements a rigorous five-class pairwise taxonomy for comparing claimed parameters against extracted document evidence:

| Class | Definition | Confidence Threshold | Action Triggered |
| :--- | :--- | :---: | :--- |
| **`MATCH`** | Legally concordant claim and evidence values. | $\ge 0.60$ | Auto-verified; marked compliant. |
| **`MISMATCH`** | Statutory contradiction (e.g. tenure deficit, area shortfall). | $\ge 0.60$ | **Flagged Discrepancy:** Mandates reviewer confirmation. |
| **`MISSING`** | Required evidentiary document or parameter not provided. | $\ge 0.60$ | **Missing Evidence:** Generates institutional notice. |
| **`UNCERTAIN`** | Textual variance, lexical ambiguity, or confidence $< 0.60$. | $< 0.60$ | **Abstains:** Automatically referred for human scrutiny. |
| **`NOT_COMPARABLE`** | Semantically incompatible fields (e.g., date vs monetary figure). | $\ge 0.90$ | Rejection of invalid field comparison pair. |

---

## 10. Technology Stack

### Frontend Client
- **Framework:** React 19 (`19.0.1`) with TypeScript (`7.0.2`)
- **Build Tool:** Vite (`8.3.5`)
- **Styling:** Tailwind CSS (`4.3.3`)
- **Icons:** Lucide React (`0.546.0`)

### Backend Gateway
- **Runtime:** Node.js v24 LTS
- **Framework:** Express (`4.21.2`)
- **Database:** Native Node 24 SQLite (`node:sqlite` / `DatabaseSync`) with Write-Ahead Logging (WAL)
- **Storage:** `IStorageProvider` (Local Filesystem with path containment defense & SHA-256 verification)
- **Security:** `jsonwebtoken` (v9.0), `bcryptjs` (v3.0), `multer` (v2.5)

### Machine Learning & Multilingual OCR Microservice
- **API Engine:** Python 3.13 / FastAPI (`0.115.x`) with Uvicorn
- **ML Framework:** PyTorch (`2.6.x`), HuggingFace Transformers, Scikit-learn
- **Calibration:** Temperature Scaling ($T = 1.8182$) fitted on validation log-likelihood ($N = 162$)
- **OCR Engine:** Tesseract OCR / `pytesseract` supporting English (`eng`), Tamil (`tam`), and Hindi (`hin`) with automatic image preprocessing
- **Fast-Path Engine:** PyMuPDF (`fitz`) high-throughput PDF text-layer extraction

### Multi-Model AI Orchestration Layer
- **Architecture:** Task-Based `ModelRouter` and singleton `ModelRegistry` in `server/modules/ai/providers/`
- **Models Integrated:**
  - **BharatCode Qwen 3.8 27B (`bharatcode-qwen`):** High-capacity bilingual reasoning model for evidence-grounded finding explanations
  - **BharatCode DeepSeek v4.1 Flash (`bharatcode-deepseek`):** Long-context (65,536 tokens) reasoning model for cross-document docket scrutiny synthesis
  - **Adaption SFT Model (`adaption-form2fact`):** AutoScientist domain-adapted model pipeline for institutional discrepancy rationales
  - **Form2Fact Hybrid Pairwise Classifier (`form2fact-classifier`):** Calibrated 5-class verification engine (**authoritative**)
- **Telemetry:** Per-request token consumption, model identification, latency measurement, and health probes
- **Privacy & Safety:** Client-side PII redaction (`redactPii`), credential sanitization (`sanitizeSecret`), citation grounding, and classifier overwrite protection

---

## 10.5. Multi-Model AI Orchestration Layer (BharatCode Qwen, DeepSeek & Adaption)

Form2Fact features a centralized multi-model orchestration layer that connects external foundation models and domain-adapted checkpoints while **strictly preserving the authority of the native deterministic rules and calibrated 5-class pairwise classifier**.

```mermaid
flowchart LR
    Task[Scrutiny Task] --> Router{ModelRouter}

    Router -->|field_comparison| Champion[Form2Fact Native Classifier<br/><b>AUTHORITATIVE</b>]
    Router -->|evidence_explanation| Qwen[BharatCode Qwen 3.8 27B<br/><i>Advisory Reasoning</i>]
    Router -->|evidence_explanation| DeepSeek[BharatCode DeepSeek v4.1<br/><i>Long-Context Reasoning</i>]
    Router -->|evidence_explanation| Adaption[Adaption SFT Model<br/><i>Domain Adapted</i>]
    Router -->|document_scrutiny| DeepSeekMemo[DeepSeek v4.1 Flash<br/><i>Docket Synthesis</i>]

    Qwen --> Guards[Citation Grounding &<br/>Classifier Override Guard]
    DeepSeek --> Guards
    Adaption --> Guards

    Guards --> Findings[Findings View UI<br/>EN / தமிழ் Toggle]
```

### 1. Task-Based Routing Policy:
1. **Field Comparison (`field_comparison`):** Routed **exclusively** to the native Form2Fact pairwise classifier. External LLMs can never execute primary field verification.
2. **Evidence Explanation (`evidence_explanation`):** Dynamically routed to the reviewer's selected model (BharatCode Qwen, DeepSeek, or Adaption).
3. **Document Scrutiny (`document_scrutiny`):** Routed to DeepSeek v4.1 Flash (or Qwen) to generate cross-document holistic scrutiny memos.

### 2. Dual Grounding Guards & Anti-Hallucination:
- **Citation Integrity Filter:** The model's cited document names and page numbers are cross-referenced against `validEvidenceSources` in the ingested docket. Hallucinated or non-existent citations are stripped before presentation, and a warning is logged to `groundingAlerts`.
- **Classifier Overwrite Protection:** If an external LLM attempts to propose a conflicting classification (e.g. proposing `MATCH` on an authoritative `MISMATCH`), the router rejects the change, forcibly restores the authoritative label, and sets `requires_human_review = true`.

### 3. Bilingual Scrutiny Support:
The Findings UI provides a one-click language toggle between **English** and **Tamil (`தமிழ்`)**, enabling scrutiny officers to review evidence explanations in the appropriate state administrative language.

### 4. Controlled Failure Modes & Token Exhaustion:
- **Reasoning Token Exhaustion Handling:** Qwen 3.8 27B spends token budget on internal reasoning (`message.reasoning_content`); if completion content is empty, the adapter returns a clean explanatory diagnostic rather than crashing.
- **Fail-Closed Architecture:** Unconfigured or unverified endpoints return `{ success: false, status: 'unavailable' }`. Deterministic findings remain 100% operational even without active external API keys.

---

## 11. Real Application Screenshots

All screenshots below are captured directly from the running production application:

### 1. Institutional Login Portal
![Login Portal](docs/screenshots/01-login.png)
*Role-based institutional authentication portal with secure administrative access and JWT sessions.*

---

### 2. Executive Verification Overview
![Overview Dashboard](docs/screenshots/02-dashboard.png)
*Live pipeline metrics, active dockets, processing status, and recent audit events.*

---

### 3. Applications Management Docket
![Applications Docket](docs/screenshots/03-applications.png)
*Regional application registry with multi-criteria search, category tabs, and status badges.*

---

### 4. Application Detail & Document Repository
![Application Detail Workspace](docs/screenshots/04-application-details.png)
*Application parameters, supporting PDF evidence table, and SHA-256 cryptographic hashes.*

---

### 5. Document Review & Evidence Viewer
![Evidence Viewer Canvas](docs/screenshots/06-evidence-viewer.png)
*Split-screen document viewer displaying multi-page legal PDFs and side-by-side evidence analysis.*

---

### 6. Structured Field Extraction Inspector
![Extracted Parameters Inspector](docs/screenshots/05-document-upload.png)
*Extracted structured fields with exact document page citations and confidence scores.*

---

### 7. Pairwise Verification Console
![Pairwise Verification Console](docs/screenshots/07-pairwise-comparison.png)
*5-class pairwise field classification with calibrated probability confidence bars.*

---

### 8. Findings & Compliance Triage
![Findings Workspace](docs/screenshots/08-findings.png)
*Regulatory discrepancy resolution console linking claims to AICTE handbook clauses.*

---

### 9. Human Review Adjudication Modal
![Human Review Modal](docs/screenshots/09-human-review.png)
*Reviewer override modal requiring mandatory justification rationale committed to the audit trail.*

---

### 10. AICTE Statutory Rules Engine
![Statutory Rules Engine](docs/screenshots/10-regulatory-rules.png)
*Transparent regulatory rule catalog with interactive sandbox testing environment.*

---

## 12. Repository Structure

```
form2fact/
├── BharatCode.txt                    # Mandatory factual project identification
├── README.md                          # Comprehensive project documentation
├── LICENSE                            # MIT License
├── CONTRIBUTING.md                    # Git workflow and pull request guidelines
├── SECURITY.md                        # Security policy and disclosure process
├── CHANGELOG.md                       # Version release history
├── CODE_OF_CONDUCT.md                 # Contributor Covenant Code of Conduct
├── package.json                       # Node.js project manifest & scripts
├── server.ts                          # Express gateway entry point
├── server/
│   ├── api.ts                         # REST routing and controller layer
│   ├── auth.ts                        # JWT resolution, RBAC, and session guards
│   ├── db.ts                          # SQLite schema, migrations, and seeding policy
│   ├── rulesEngine.ts                 # AICTE regulatory compliance rules
│   ├── core/                          # Enterprise storage, logging, jobs, and errors
│   ├── modules/
│   │   ├── ai/                        # Multi-Model AI Orchestration Layer
│   │   │   └── providers/             # Qwen, DeepSeek, Adaption, Classifier adapters & Router
│   │   ├── organizations/             # Regional tenant organization manager
│   │   └── verification/              # Pairwise classification engine
│   └── tests/
│       ├── multiModelOrchestration.test.ts # Multi-model routing & adapter suite
│       ├── bharatCodeIntegration.test.ts   # BharatCode API verification suite
│       ├── dataIntegrity.test.ts           # 111-point data integrity test suite
│       └── test-runner.ts                  # 24-scenario regression test harness
├── src/                               # React 19 Frontend
│   ├── App.tsx                        # Master application state router
│   ├── components/                    # Core view components (FindingsView with Multi-Model Toolbar)
│   ├── services/                      # Frontend API client
│   └── shared/                        # Reusable UI components & status badges
├── ai_service/                        # Python FastAPI & ML Service
│   ├── app/main.py                    # FastAPI application routes
│   ├── app/ocr.py                     # Multilingual OCR (eng+tam+hin) and PyMuPDF text layer
│   ├── ml/
│   │   ├── inference.py               # Calibrated champion inference engine
│   │   ├── artifacts/                 # Model weights and temperature config
│   │   └── data/
│   │       └── adaption/              # Verified Adaption splits (train, validation, test)
│   └── tests/                         # Pytest suites for OCR and ML pipeline
├── sample_documents/                  # Ready-to-test sample institutional PDFs
├── docs/                              # Comprehensive engineering documentation
│   ├── engineering/                   # Multi-model architecture, Qwen/DeepSeek & verification reports
│   ├── ml/adaption/                   # Adaption dataset audit, validation, and onboarding guides
│   ├── bharatcode/                    # BharatCode Build League 2026 integration & audit reports
│   ├── assets/screenshots/            # Genuine application screenshots
│   └── data-integrity/                # Mock removal and integrity audit reports
└── infrastructure/
    ├── db/                            # PostgreSQL authoritative schema & SQLite migration script
    └── docker-compose.yml             # Container orchestration
```

---

## 13. Installation & Setup

### Prerequisites
- **Node.js**: v22.14.0 or v24.x LTS
- **Python**: v3.11, v3.12, or v3.13
- **Git**: Installed and configured

### 1. Clone the Repository
```bash
git clone https://github.com/shinchxn/form2fact.git
cd form2fact
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
```
*(In production, ensure `JWT_SECRET` is configured with a high-entropy 32+ character key).*

### 3. Install Dependencies
```bash
# Install Node dependencies
npm install

# Install Python ML dependencies
pip install -r ai_service/requirements.txt
```

### 4. Start the Application

#### Option A: Running Locally
```bash
# Terminal 1: Start the Express Scrutiny Engine & Vite SPA (Port 3000)
npm run dev

# Terminal 2: Start the Python FastAPI ML & OCR Service (Port 8000)
python -m uvicorn ai_service.app.main:app --host 0.0.0.0 --port 8000
```
Access the application at: **`http://localhost:3000`**

#### Option B: Running with Docker Compose
```bash
docker compose -f infrastructure/docker-compose.yml up --build
```

---

## 14. Environment Variables

| Variable | Default (Dev) | Production Requirement | Purpose |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `development` | `production` | Enables production security guards and clean database mode. |
| `PORT` | `3000` | `3000` | Port for Express gateway and client SPA. |
| `JWT_SECRET` | *(fallback)* | **MANDATORY ($\ge 32$ chars)** | Cryptographic signing key for RBAC tokens. |
| `DATABASE_PATH` | `./data/form2fact.db` | Custom path | File path for persistent SQLite database. |
| `DOCUMENT_STORAGE_PATH` | `./data/dockets` | Custom path | Storage directory for uploaded applicant PDFs. |
| `AI_SERVICE_URL` | `http://localhost:8000` | `http://ai-service:8000` | Internal URL for pairwise classifier and OCR microservice. |
| `FORM2FACT_OCR_LANG` | `eng+tam` | `eng+tam` (or `eng+tam+hin`) | Supported OCR language packs for Tesseract engine. |
| `OCR_SERVICE_TOKEN` | `form2fact_ocr_secret_token_2026` | Secure Secret | Authentication token for internal OCR endpoints. |
| `BOOTSTRAP_SECRET` | *(disabled)* | Secure Secret | Pre-shared out-of-band secret authorizing initial administrator bootstrap. |
| `BOOTSTRAP_ADMIN_EMAIL` | *(none)* | Valid email | One-time initial administrator account email on empty database. |
| `BOOTSTRAP_ADMIN_PASSWORD` | *(none)* | $\ge 12$ chars | One-time initial administrator password (scrubbed from memory immediately). |
| `BHARATCODE_API_URL` | `https://bharatcode.ai/api/model/v1` | Production URL | Base URL for official BharatCode Model API. |
| `BHARATCODE_API_KEY` | *(none)* | Secure Token (`bc_live_...`) | Live Bearer API key for generating AI explanations via Qwen 3.8 27B. |
| `BHARATCODE_MODEL` | `qwen-3.8-27b` | `qwen-3.8-27b` | Active Qwen model identifier for evidence-grounded legal explanations. |
| `BHARATCODE_DEEPSEEK_API_KEY` | *(uses BHARATCODE_API_KEY)*| Secure Token | Dedicated API key for BharatCode DeepSeek v4.1 Flash long-context analysis. |
| `BHARATCODE_DEEPSEEK_MODEL` | `deepseek-v4.1-flash` | `deepseek-v4.1-flash` | Active DeepSeek model identifier for cross-document scrutiny memos. |
| `ADAPTION_MODEL_ENDPOINT` | *(none)* | HTTPS URL | Hosted inference endpoint for fine-tuned Adaption AutoScientist model. |
| `ADAPTION_MODEL_VERIFIED` | `false` | `true` | Gatekeeper flag enabling Adaption provider only after offline benchmark evaluation. |

---

## 15. API Documentation

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/health` | Public | Service health and version status. |
| `POST` | `/api/v1/auth/login` | Public | Institutional login with email & password. |
| `GET` | `/api/v1/auth/me` | Authenticated | Revalidate current user session and active role. |
| `POST` | `/api/v1/auth/bootstrap-admin` | Public (Guarded) | One-time initial administrator creation requiring `BOOTSTRAP_SECRET` on empty database. |
| `GET` | `/api/v1/applications` | Authenticated | List all regional applications (tenant isolated). |
| `POST` | `/api/v1/applications` | Reviewer / Admin | Ingest a new institutional application docket. |
| `GET` | `/api/v1/applications/:id` | Authenticated | Fetch complete docket details, documents, and findings. |
| `POST` | `/api/v1/applications/:id/documents` | Reviewer / Admin | Upload statutory PDF evidence with magic-byte validation. |
| `GET` | `/api/v1/applications/:id/documents/:docId/file` | Authenticated | Stream stored PDF with path traversal defense. |
| `DELETE` | `/api/v1/documents/:id` | Reviewer / Admin | Transactional deletion of document and cascading fields. |
| `POST` | `/api/v1/verification/pairwise` | Authenticated | Execute pairwise comparison between claim and evidence (routes to native classifier). |
| `POST` | `/api/v1/findings/:id/review` | Reviewer / Admin | Record human reviewer adjudication and commit audit event. |
| `GET` | `/api/v1/ai/providers` | Authenticated | Discover registered AI model providers, task capabilities, and live health status. |
| `GET` | `/api/v1/ai/providers/:id/health` | Authenticated | Live health probe for a specific multi-model provider. |
| `POST` | `/api/v1/findings/:id/explain` | Authenticated | Generate evidence-grounded AI explanation (accepts optional `providerId` and `preferredLanguage`: `'en'` or `'ta'`). |
| `POST` | `/api/v1/ai/explain` | Authenticated | Arbitrary multi-model claim/evidence pairwise explanation with citation verification. |
| `POST` | `/api/v1/ai/bharatcode/explain` | Authenticated | Legacy endpoint for BharatCode Qwen pairwise explanations. |
| `GET` | `/api/v1/audit` | Authenticated | Retrieve append-only chronological audit log. |
| `GET` | `/api/v1/rules` | Authenticated | Retrieve AICTE regulatory rules catalog. |

---

## 16. Machine Learning Architecture & Calibration

### Model Architecture
The Form2Fact Pairwise Classifier (`champion-v2.0`) is a hybrid architecture combining:
1. **Deterministic Fast-Paths:** Exact date equivalents, numeric tolerance checking, and standard entity abbreviations bypass neural computation with 100% confidence.
2. **Lexical & Semantic NLP:** DeBERTa/DistilRoBERTa cross-encoder embedding comparing claim strings against extracted evidence spans.
3. **Temperature Scaling Calibration:** Raw neural logits are calibrated using post-hoc temperature scaling ($T = 1.8182$) fitted exclusively on held-out validation data ($N = 162$) to ensure predicted probabilities match real empirical accuracy.
4. **Abstention Policy:** Any classification where calibrated confidence falls below **0.60** is automatically redirected to `UNCERTAIN` and routed to a human reviewer.

---

## 17. Security & Governance Invariants

- **Multi-Tenant Data Isolation (P0-04):** Scrutiny officers are partitioned by regional directorate (`org-aicte-western`, `org-aicte-central`). Cross-tenant document streaming or finding inspection returns HTTP 403 Forbidden.
- **Path Traversal Defense:** Docket file paths strictly validate against regex `/^[a-zA-Z0-9_-]+$/` and ensure physical containment within `./data/dockets`.
- **Append-Only Audit Ledger:** Audit records cannot be updated or deleted through any API endpoint.
- **Zero Autonomous Approval:** Form2Fact provides statutory evidence citations, but human reviewers maintain sole authority to issue regulatory clearance.
- **Authentication Hardening:** persona switching (`POST /api/v1/user`) and the user registry (`GET /api/v1/users`) require a valid session; no anonymous JWT minting or public user enumeration.
- **Login Rate Limiting:** bounded in-memory limiter on `/auth/login` and `/auth/bootstrap-admin` (429 on excess).
- **Baseline Security Headers:** `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and a production-only CSP on all responses.
- **LLM Prompt-Injection Defense:** document excerpts are treated as untrusted data; PII is redacted before transmission; hallucinated citations are filtered; classifier-label override attempts are forced back to the authoritative label.

---

## 18. Testing & Verification Suites

Form2Fact maintains 100% pass rates across all test suites:

```bash
# 1. Run Data Integrity & Zero-Mock Test Suite (111 Assertions)
npm run test:integrity

# 2. Run Express Server & P0 Security Regression Suite (23 Scenarios)
npm test

# 3. Run Python ML & Calibrated Inference Pytest Suite (32 Tests)
python -m pytest ai_service/ml/tests -v

# 4. Run Python OCR Unit Tests (5 Tests)
python -m pytest ai_service/tests/test_ocr.py -v

# 5. Run TypeScript Type Checking
npm run lint

# 6. Run Production Client Build
npm run build

# 7. Run BharatCode Model API Integration Suite (12 Tests - 100% Passed)
node ./node_modules/tsx/dist/cli.mjs server/tests/bharatCodeIntegration.test.ts

# 8. Run V3 Staging Operational Rehearsal & Audit Suite (18 Tests - 100% Passed)
node ./node_modules/tsx/dist/cli.mjs server/tests/stagingOperationalRehearsal.test.ts

# 9. Run the Full End-to-End Application Validation (live server required)
#    Starts the dev server, then exercises login -> upload -> extraction -> validation ->
#    findings -> live AI explanation -> deep scrutiny -> review -> audit -> ledger ->
#    tenant isolation -> RBAC. Reports PASS/FAIL/BLOCKED.
npm run dev &amp;
node scripts/e2e-validation.mjs

# 10. Run Playwright Authentic-Document Browser E2E Suite (10 Scenarios)
#     Processes 55 real institutional pages (SFR College, S.A. College, Good Shepherd AICTE EoA)
#     Captures UI screenshots to test-results/screenshots/
npx playwright test e2e/real-document-verification.spec.ts

# 11. Run Held-Out ML Test Split Benchmark (N = 83, Template-Isolated)
python scripts/ml/benchmark_test_split.py
```

---

## 18.5. BharatCode Judges' Demonstration Package

For the BharatCode Build League 2026 evaluation committee:

- [**Judges' Demonstration Guide**](docs/demo/JUDGES_DEMONSTRATION_GUIDE.md): Executive summary, 5-class taxonomy, 4-tier authority architecture, and rapid evaluation protocol.
- [**Authentic Document Manifest**](docs/demo/DEMONSTRATION_DOCUMENT_MANIFEST.md): Provenance, page counts, and SHA-256 cryptographic hashes for the 3 authorized institutional PDFs.
- [**Demonstration Workflow**](docs/demo/DEMONSTRATION_WORKFLOW.md): Step-by-step interactive scrutiny runbook with sequence diagrams and expected outcomes.
- [**Real-Document Playwright E2E Report**](docs/testing/REAL_DOCUMENT_PLAYWRIGHT_E2E_REPORT.md): Browser verification audit processing 55 authentic PDF pages with zero mocks.
- [**Multi-Model Comparative Evaluation**](docs/ml/MULTI_MODEL_COMPARATIVE_EVALUATION.md): Quantitative benchmark on the held-out test split ($N = 83$).

---

## 19. Evaluation Limitations & Data Transparency

- **Benchmark Provenance:** Current ML evaluation benchmarks (`test_rigorous.jsonl`, 41 records) are development benchmarks derived from synthetic and public regulatory templates.
- **No Ground-Truth Production Scraping:** Because real institutional filings contain confidential legal deeds and personal identifiable information (PII), models were trained on synthetic and public legal document benchmarks. Real-world institutional deployment requires supervised fine-tuning during initial pilot phases.
- **Live AI Inference (current):** The BharatCode `qwen-3.8-27b` integration is implemented and verified (a real model response was captured earlier in development), but is currently **BLOCKED at the credential/subscription layer** (free-tier OAuth session expired; the supplied `bc_live_…` key requires an active Lite/Pro subscription). The application fails closed and preserves deterministic findings; no code change is required to unblock — only a valid, funded key in `.env`.
- **Frontend Bundle Size:** the production build ships a single 815 kB JS chunk (code-splitting is planned future work; build succeeds).
- **Runtime Persistence:** the application uses SQLite (`node:sqlite`) as its runtime database. PostgreSQL, Redis, and MinIO are provided only as an optional `docker compose --profile enterprise` profile and are not wired into application code paths.

---

## 20. Roadmap

### Completed (v1.2.0)
- [x] Multi-tenant regional RBAC with JWT token security.
- [x] AICTE statutory rules catalog (`RULE-TEN-01`, `RULE-NAME-02`, `RULE-AREA-03`, `RULE-DOC-04`).
- [x] Calibrated pairwise NLP classifier with temperature scaling ($T = 1.8182$).
- [x] Zero-mock production data integrity cleanup.
- [x] Coordinated 3-pane document evidence viewer.
- [x] Append-only tamper-evident audit ledger.
- [x] BharatCode Qwen 3.8 27B evidence-grounded explanation service (hardened).
- [x] Login rate limiting + baseline security headers.
- [x] Auth-gated persona switch and user registry (no anonymous JWT minting).
- [x] PDF extraction fixed for pdf-parse v2 API.
- [x] Reproducible end-to-end validation script (`scripts/e2e-validation.mjs`).
- [x] Cryptographic audit ledger chain verification endpoint.

### Planned (v1.3.0+)
- [ ] Multilingual OCR extraction for vernacular regional land records (Marathi, Hindi, Tamil).
- [ ] Direct Digilocker / State Land Registry API integration for instant deed verification.
- [ ] Digital signature cryptographic verification for municipal building approval certificates.

---

## 21. Contribution Guidelines

Contributions are welcome! Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) before submitting pull requests.

---

## 22. License & Acknowledgements

This project is licensed under the **MIT License** — see the [`LICENSE`](LICENSE) file for details.

Developed for institutional compliance and regulatory scrutiny integrity under the **BharatCode Initiative**.
