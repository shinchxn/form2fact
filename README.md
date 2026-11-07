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

[Live Application](http://localhost:3000) • [BharatCode Integration](#105-bharatcode-model-api-integration-qwen-38-27b) • [Architecture](#7-system-architecture) • [Workflow](#8-application-workflow) • [API Documentation](#15-api-documentation) • [Installation](#13-installation-and-setup)

</div>

---

## BharatCode Build League 2026 Submission
- **Target Competition:** BharatCode Build League 2026 (`https://auth.bharatcode.ai/build`)
- **Recommended Category:** **Work & automation** (Cognitive Document Intelligence & Regulatory Scrutiny Automation)
- **Model API Integration:** BharatCode Qwen 3.8 27B (`qwen-3.8-27b`) via `https://bharatcode.ai/api/model/v1`
- **Submission Specification:** Fully documented in root [`BharatCode.txt`](BharatCode.txt) and [`docs/bharatcode/`](docs/bharatcode/).

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

- **Multi-Tenant Regional Scrutiny:** Strict tenant data isolation between Western, Central, and Northern Directorates.
- **Cryptographic Evidence Verification:** Magic-byte header validation (`%PDF-`) and SHA-256 integrity checksums for every docket upload.
- **Calibrated Pairwise Field Matching:** Neural and deterministic token-level comparison evaluating institutional parameters.
- **AICTE Regulatory Rules Engine:** Automated evaluation of:
  - `RULE-TEN-01`: Minimum 30-year unexpired lease tenure requirement.
  - `RULE-NAME-02`: Concordance between sponsoring society and beneficiary institution.
  - `RULE-AREA-03`: Multi-parcel land acreage aggregation without double-counting.
  - `RULE-DOC-04`: Mandatory Fire & Life Safety NOC presence.
  - `RULE-SAFETY-06`: Identification of unreadable scanned photocopies.
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
    end

    subgraph Gateway["API Gateway & Scrutiny Engine (Node 24 + Express)"]
        Auth[JWT & RBAC Module]
        Tenant[Multi-Tenant Isolation]
        Rules[Deterministic AICTE Rules Engine]
        Storage[Storage Provider: Local Disk (Append-Only)]
        DB[(Persistent SQLite with WAL)]
    end

    subgraph AIService["AI & ML Microservice (FastAPI + PyTorch)"]
        Router[Inference Router]
        Classifier[Calibrated Pairwise Classifier V2]
        TempScaling[Temperature Scaling Layer T=1.8182]
        OCR[Tesseract / Textract OCR Pipeline]
    end

    UI -->|HTTPS / REST API| Auth
    Docket --> Auth
    Workbench --> Auth
    Findings --> Auth

    Auth --> Tenant
    Tenant --> Rules
    Tenant --> Storage
    Tenant --> DB

    Rules -->|Internal HTTP API POST /classify-pair| Router
    Storage -->|PDF Buffer Stream| OCR
    Router --> Classifier
    Classifier --> TempScaling
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

### Machine Learning & OCR Microservice
- **API Engine:** Python 3.13 / FastAPI (`0.115.x`) with Uvicorn
- **ML Framework:** PyTorch (`2.6.x`), HuggingFace Transformers, Scikit-learn
- **Calibration:** Temperature Scaling ($T = 1.8182$) fitted on validation log-likelihood ($N = 162$)
- **OCR Engine:** Tesseract OCR / `pytesseract` with multi-page fallback

### BharatCode Model Reasoning Layer
- **Model:** BharatCode Qwen 3.8 27B (`qwen-3.8-27b`)
- **API Base:** `https://bharatcode.ai/api/model/v1`
- **Service:** `server/modules/explanation/bharatCodeService.ts`
- **Role:** Evidence-grounded explanation and statutory clause synthesis
- **Privacy:** Client-side PII redaction (Aadhaar, PAN, phone, email, accounts) prior to transmission
- **Safeguards:** Hallucination removal filter + Classifier override prevention

---

## 10.5. BharatCode Model API Integration (Qwen 3.8 27B)

Form2Fact integrates the official **BharatCode Model API** (`https://bharatcode.ai/api/model/v1`) using **`qwen-3.8-27b`** to generate evidence-grounded legal reasoning explaining regulatory discrepancies for human scrutiny committees.

### Workflow & Safeguards:
1. **Local Text Extraction & PII Redaction:** Text snippets from the institutional application and supporting legal documents are extracted locally. Personal identifiers (Aadhaar, PAN, phone numbers, emails, bank accounts) are automatically redacted via `redactPii()` before any outbound call.
2. **Authoritative Classifier Grounding:** The Form2Fact hybrid classifier output (e.g. `MISMATCH`, 98% confidence) and statutory rule citations are assembled into an evidence-first prompt.
3. **Reasoning Synthesis:** BharatCode Qwen 3.8 27B generates an objective explanation detailing why the claim and evidence contradict or align.
4. **Dual Grounding Guards:**
   - *Hallucination Guard:* Automatically cross-validates citations and strips any cited document name or page number not present in the ingested evidence.
   - *Classifier Override Guard:* Prohibits the LLM from altering or overriding the classifier label or approving/rejecting an institution.
5. **Interactive Verification:** The explanation is rendered in the Findings workspace with direct clickable links jumping to the cited document page in the split-screen evidence viewer.
6. **Graceful Fallback:** If `BHARATCODE_API_KEY` is not configured, the platform preserves deterministic findings without fabricating responses.

---

## 11. Real Application Screenshots

All screenshots below are captured directly from the running production application:

### 1. Institutional Login Portal
![Login Portal](docs/assets/screenshots/01-login.png)
*Role-based institutional authentication portal with secure administrative access and JWT sessions.*

---

### 2. Executive Verification Overview
![Overview Dashboard](docs/assets/screenshots/02-dashboard.png)
*Live pipeline metrics, active dockets, processing status, and recent audit events.*

---

### 3. Applications Management Docket
![Applications Docket](docs/assets/screenshots/03-applications.png)
*Regional application registry with multi-criteria search, category tabs, and status badges.*

---

### 4. Application Detail & Document Repository
![Application Detail Workspace](docs/assets/screenshots/04-document-upload.png)
*Application parameters, supporting PDF evidence table, and SHA-256 cryptographic hashes.*

---

### 5. Document Review & Evidence Viewer
![Evidence Viewer Canvas](docs/assets/screenshots/05-document-viewer.png)
*Split-screen document viewer displaying multi-page legal PDFs and side-by-side evidence analysis.*

---

### 6. Structured Field Extraction Inspector
![Extracted Parameters Inspector](docs/assets/screenshots/06-evidence-extraction.png)
*Extracted structured fields with exact document page citations and confidence scores.*

---

### 7. Pairwise Verification Console
![Pairwise Verification Console](docs/assets/screenshots/07-pairwise-verification.png)
*5-class pairwise field classification with calibrated probability confidence bars.*

---

### 8. Findings & Compliance Triage
![Findings Workspace](docs/assets/screenshots/08-findings.png)
*Regulatory discrepancy resolution console linking claims to AICTE handbook clauses.*

---

### 9. Human Review Adjudication Modal
![Human Review Modal](docs/assets/screenshots/09-human-review.png)
*Reviewer override modal requiring mandatory justification rationale committed to the audit trail.*

---

### 10. AICTE Statutory Rules Engine
![Statutory Rules Engine](docs/assets/screenshots/10-aicte-rules.png)
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
│   │   ├── explanation/               # BharatCode Qwen 3.8 27B AI reasoning service
│   │   ├── organizations/             # Regional tenant organization manager
│   │   └── verification/              # Pairwise classification engine
│   └── tests/
│       ├── bharatCodeIntegration.test.ts # 12-point BharatCode API verification suite
│       ├── dataIntegrity.test.ts      # 111-point data integrity test suite
│       └── test-runner.ts             # 23-scenario regression test harness
├── src/                               # React 19 Frontend
│   ├── App.tsx                        # Master application state router
│   ├── components/                    # Core view components (Overview, Review, Rules)
│   ├── services/                      # Frontend API client
│   └── shared/                        # Reusable UI components & status badges
├── ai_service/                        # Python FastAPI & ML Service
│   ├── app/main.py                    # FastAPI application routes
│   ├── ml/
│   │   ├── inference.py               # Calibrated champion inference engine
│   │   ├── artifacts/                 # Model weights and temperature config
│   │   └── data/                      # Legitimate training & benchmark jsonl files
│   └── ocr/                           # OCR textract and tesseract handlers
├── sample_documents/                  # Ready-to-test sample institutional PDFs
├── docs/                              # Comprehensive engineering documentation
│   ├── bharatcode/                    # BharatCode Build League 2026 integration & audit reports
│   ├── assets/screenshots/            # Genuine application screenshots
│   ├── data-integrity/                # Mock removal and integrity audit reports
│   └── release/                       # Final verification and release reports
└── infrastructure/
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
| `OCR_SERVICE_TOKEN` | `form2fact_ocr_secret_token_2026` | Secure Secret | Authentication token for internal OCR endpoints. |
| `BOOTSTRAP_SECRET` | *(disabled)* | Secure Secret | Pre-shared out-of-band secret authorizing initial administrator bootstrap. |
| `BOOTSTRAP_ADMIN_EMAIL` | *(none)* | Valid email | One-time initial administrator account email on empty database. |
| `BOOTSTRAP_ADMIN_PASSWORD` | *(none)* | $\ge 12$ chars | One-time initial administrator password (scrubbed from memory immediately). |
| `BHARATCODE_API_URL` | `https://bharatcode.ai/api/model/v1` | Production URL | Base URL for official BharatCode Model API. |
| `BHARATCODE_API_KEY` | *(none)* | Secure Token (`bc_live_...`) | Live Bearer API key for generating AI explanations via Qwen 3.8 27B. |
| `BHARATCODE_MODEL` | `qwen-3.8-27b` | `qwen-3.8-27b` | Active model identifier for evidence-grounded legal explanations. |

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
| `POST` | `/api/v1/verification/pairwise` | Authenticated | Execute pairwise comparison between claim and evidence. |
| `POST` | `/api/v1/findings/:id/review` | Reviewer / Admin | Record human reviewer adjudication and commit audit event. |
| `POST` | `/api/v1/findings/:id/explain` | Authenticated | Generate evidence-grounded AI explanation via BharatCode Qwen 3.8 27B. |
| `POST` | `/api/v1/ai/bharatcode/explain` | Authenticated | Arbitrary claim/evidence pairwise AI explanation with citation verification. |
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
```

---

## 19. Evaluation Limitations & Data Transparency

- **Benchmark Provenance:** Current ML evaluation benchmarks (`test_rigorous.jsonl`, 41 records) are development benchmarks derived from synthetic and public regulatory templates.
- **No Ground-Truth Production Scraping:** Because real institutional filings contain confidential legal deeds and personal identifiable information (PII), models were trained on synthetic and public legal document benchmarks. Real-world institutional deployment requires supervised fine-tuning during initial pilot phases.

---

## 20. Roadmap

### Completed (v1.2.0)
- [x] Multi-tenant regional RBAC with JWT token security.
- [x] AICTE statutory rules catalog (`RULE-TEN-01`, `RULE-NAME-02`, `RULE-AREA-03`, `RULE-DOC-04`).
- [x] Calibrated pairwise NLP classifier with temperature scaling ($T = 1.8182$).
- [x] Zero-mock production data integrity cleanup.
- [x] Coordinated 3-pane document evidence viewer.
- [x] Append-only tamper-evident audit ledger.

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
