# Form2Fact Manual Testing Guide & Verification Playbook

**Document ID:** `FORM2FACT-TESTING-MANUAL-001`  
**Date:** November 6, 2026  
**Auditor:** Senior Software Architect, Git Integration Lead, QA Automation Lead & ML Engineer  
**Branch:** `develop`  
**Commit:** `a3eaea3` (Unified Integration Trunk)

---

## 1. System Requirements & Prerequisites

### 1.1 Required Software
- **Node.js:** v20.x or v22.x LTS (`node -v`)
- **npm:** v10.x+ (`npm -v`)
- **Python:** 3.11, 3.12, or 3.13 (`python --version`)
- **pip:** Latest (`python -m pip --version`)
- **Docker & Docker Compose (Optional):** Docker Engine v24+ and Docker Compose v2.20+
- **Tesseract OCR (Optional for local OCR, included in Docker):** If testing local OCR fallback outside Docker, install `tesseract-ocr`.

### 1.2 Required Dependencies Installation
From the repository root (`form2fact/`):

```bash
# 1. Install Node.js backend & frontend dependencies
npm install

# 2. Install Python AI & ML microservice dependencies
pip install -r ai_service/requirements.txt
```

---

## 2. Environment Configuration

Copy the template configuration file:
```bash
cp .env.example .env
```

Key environment variables in `.env`:

| Variable | Local Dev Default | Production Requirement | Purpose |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `development` | `production` | Enables hot-reload in dev; serves `dist/` in prod. |
| `PORT` | `3000` | Configurable | HTTP port for integrated Express API + Vite SPA. |
| `JWT_SECRET` | Dev fallback | $\ge 32$ chars random string | Signs user authentication tokens. |
| `DATABASE_PATH` | `./data/form2fact.db` | Persistent volume | SQLite persistent database path. |
| `DOCUMENT_STORAGE_PATH`| `./data/dockets` | Persistent volume | Storage directory for PDF uploads. |
| `AI_SERVICE_URL` | `http://localhost:8000` | `http://ai-service:8000` | Internal URL for Python ML/OCR service. |
| `OCR_SERVICE_TOKEN` | `form2fact_ocr_secret_token_2026` | Secure secret | Secret token for internal OCR endpoints. |

---

## 3. Application Startup Instructions

You can start the complete Form2Fact application using either **Native Local Processes** or **Docker Compose**.

### Option A: Native Local Execution (Recommended for Fast Interactive Testing)

Open two separate terminal windows:

#### Terminal 1 — Python AI & ML Microservice
```bash
# From repository root:
python -m uvicorn ai_service.app.main:app --host 0.0.0.0 --port 8000
```
*Expected log:*
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

#### Terminal 2 — Integrated Web Application (Backend API + React SPA)
```bash
# From repository root:
npm run dev
```
*Expected log:*
```
[INFO] Registered domain pack: AICTE Institutional Approval & Compliance Scrutiny [id: aicte, version: 1.2.0]
Form2Fact Scrutiny Engine running on http://0.0.0.0:3000
```

---

### Option B: Docker Compose Execution

```bash
# Start standard application stack (Backend API + AI Microservice):
docker compose -f infrastructure/docker-compose.yml up --build

# Or start enterprise profile (adds PostgreSQL, Redis, MinIO):
docker compose -f infrastructure/docker-compose.yml --profile enterprise up --build
```

To stop containers:
```bash
docker compose -f infrastructure/docker-compose.yml down
```

---

## 4. Application URLs & Network Ports

| Service Component | URL / Endpoint | Port | Purpose |
| :--- | :--- | :---: | :--- |
| **Frontend Web Cockpit** | [http://localhost:3000](http://localhost:3000) | 3000 | React 19 UI, Applications, Evidence Viewer, Findings. |
| **Backend REST API** | [http://localhost:3000/api/v1](http://localhost:3000/api/v1) | 3000 | Express API endpoints. |
| **Backend Health Check** | [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health) | 3000 | API status and database connectivity check. |
| **AI ML Microservice** | [http://localhost:8000](http://localhost:8000) | 8000 | FastAPI AI document intelligence service. |
| **AI Interactive Swagger Docs**| [http://localhost:8000/docs](http://localhost:8000/docs) | 8000 | Interactive OpenAPI / Swagger UI test interface. |
| **AI Health & Calibrated Status**| [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health) | 8000 | Calibration ($T=1.8182$), model status, SHA-256. |

---

## 5. Seeded Test Accounts

The local SQLite database automatically seeds four pre-configured personas across two administrative jurisdictions.

| Person / Display Name | Email / Username | Password | Role | Organization / Directorate | Scope & Permissions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Dr. Aruna Rao** | `aruna.rao@scrutiny.edu.in` | `Reviewer123!` | `Reviewer` | `org-aicte-western` (Western Region) | Read/Write findings, verify field pairs, confirm decisions. |
| **V. K. Sharma** | `vk.sharma@scrutiny.edu.in` | `Admin123!` | `Administrator` | `org-aicte-western` (Global Admin) | Cross-tenant visibility, role management, system settings. |
| **S. Meenakshi** | `meenakshi.s@audit.gov.in` | `Auditor123!` | `Read-only Viewer` | `org-aicte-western` (Western Region) | Read-only inspection of dockets, audit logs, and reports. |
| **Dr. Rajesh Verma** | `rajesh.verma@scrutiny.edu.in` | `Reviewer123!` | `Reviewer` | `org-aicte-central` (Central Region) | Scoped strictly to Central applications (`app-0915`). |

> [!TIP]
> The web application UI features a quick-access **Role Switcher** in the top navigation bar, allowing you to instantly switch between Reviewer, Administrator, and Viewer roles without retyping credentials.

---

## 6. Pre-Seeded Institutional Applications

| Application ID | Reference Number | Institution Name | Region | Status | Seeded Characteristics |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **`app-1104`** | `APP-2026-EOA-1104` | Kalyani Institute of Engineering & Technology | Western | Ready for Review | **Compliant Benchmark:** 7.50 acres declared and evidenced; 30-year unexpired lease (2054); 0 findings. |
| **`app-0842`** | `APP-2026-NEW-0842` | Saraswati Technical Campus | Western | Action Required | **Material Discrepancies:** Declared 7.50 acres vs deed 6.00 acres (1.50 acre deficit); lease expires 2028 (<30 yrs). |
| **`app-0915`** | `APP-2026-EXT-0915` | Central Institute of Technology | Central | Under Scrutiny | **Missing Evidence & Tenant Isolation:** Missing Fire Safety NOC; inaccessible to Western reviewers. |

---

## 7. Manual Testing Checklist

*Please execute the following tests in your browser and record your observations below.*

| ID | Feature / Area | Manual Test Procedure | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **MT-01** | **Login & Auto-Auth** | Open `http://localhost:3000`. Switch roles using the top-bar role selector. | Active role switches between Reviewer, Admin, and Viewer. Appropriate badges update. | | |
| **MT-02** | **Application Directory** | Navigate to "Applications" tab. Filter by status and region. | Application cards for `app-1104` and `app-0842` appear. Metrics show correct counts. | | |
| **MT-03** | **Application Creation** | Click "New Application". Fill institutional name, region, acreage, and save. | New application appears in directory with status "Ready for Review". | | |
| **MT-04** | **PDF Upload Validation** | Open an application, click "Upload Document". Select a valid PDF file. | PDF magic-bytes (`%PDF-`) validated; document card appears with "Extracted" badge. | | |
| **MT-05** | **Magic-Byte Rejection** | Attempt uploading an executable or text file renamed with a `.pdf` extension. | System rejects upload with an error message indicating invalid file signature. | | |
| **MT-06** | **Structured Field Extraction**| Open `app-0842` $\to$ "Extracted Fields" tab. Inspect extracted institutional data. | Table displays fields (Institution Name, Acreage, Expiry Date) with source page links. | | |
| **MT-07** | **Evidence Viewer (Split)** | Click on any extracted field row or "View Source". | PDF viewer opens side-by-side highlighting corresponding evidence page. | | |
| **MT-08** | **AICTE Rule Execution** | Open `app-0842` $\to$ "Findings" tab. Check triggered regulatory rules. | `RULE-TEN-01` (Lease Tenure) and `RULE-AREA-03` (Area Deficit) flagged as Material Discrepancies. | | |
| **MT-09** | **Pairwise Field Match** | Go to "Verification Workbench". Compare matching Trust name fields. | Classification returns `MATCH` with high calibrated confidence ($\ge 0.95$). | | |
| **MT-10** | **Pairwise Mismatch** | Compare declared lease date (2058) against deed date (2028). | Classification returns `MISMATCH`; flags `requiresHumanReview: true`. | | |
| **MT-11** | **Pairwise Missing Evidence**| Compare declared Fire NOC against null evidence. | Classification returns `MISSING`; routes to human reviewer. | | |
| **MT-12** | **Pairwise 0.60 Abstention**| Enter ambiguous or low-overlap text claims. | Engine abstains to `UNCERTAIN` when posterior confidence $< 0.60$. | | |
| **MT-13** | **Human Review Adjudication**| Click "Review Finding" on `FND-0842-01`. Enter rationale, confirm finding. | Status transitions to "Confirmed"; decision rationale saved; action logged. | | |
| **MT-14** | **Audit Trail Logging** | Navigate to "Audit Log" tab. Inspect recent events. | Immutable log shows actor ID, timestamp, transition state, and reviewer notes. | | |
| **MT-15** | **Multi-Tenant Isolation** | Log in as Western Reviewer (`aruna.rao`). Try accessing `app-0915` (Central). | Access denied with HTTP 403 Forbidden; Central applications hidden from Western view. | | |
| **MT-16** | **Administrator Visibility**| Switch role to Administrator (`vk.sharma`). View application directory. | Administrator sees both Western (`app-0842`, `app-1104`) and Central (`app-0915`). | | |
| **MT-17** | **Role Escalation Defense**| Attempt modifying user role via client request tampering. | Server ignores client-supplied claims; derives role strictly from database. | | |
| **MT-18** | **AICTE Preview Dashboard** | Click "AICTE Preview" in sidebar navigation. | Comprehensive compliance overview, rule definitions, and statutory thresholds render. | | |
| **MT-19** | **OCR Pipeline Fallback** | Upload a scanned text-poor PDF (<40 native chars) to any application. | System detects text-poor PDF, triggers OCR service, and extracts text with OCR confidence. | | |
| **MT-20** | **AI Service Unready 503** | Stop the Python AI service (CTRL+C) and trigger pairwise classification. | Backend displays clear graceful degradation notice without crashing. | | |

---

## 8. Troubleshooting & Common Scenarios

### 8.1 Port Already in Use (Port 3000 or 8000)
- **Symptom:** `Error: listen EADDRINUSE: address already in use 0.0.0.0:3000`
- **Solution:** 
  - Windows: `Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force`
  - Or override port in `.env`: `PORT=3001 npm run dev`.

### 8.2 Python Microservice Module Import Error
- **Symptom:** `ModuleNotFoundError: No module named 'ai_service'`
- **Solution:** Ensure `PYTHONPATH` includes the repository root, or run via:
  ```bash
  python -m uvicorn ai_service.app.main:app --host 0.0.0.0 --port 8000
  ```

### 8.3 Resetting the SQLite Database to Clean Seed State
- If you made experimental changes and wish to restore initial seed data:
  ```bash
  rm data/form2fact.db
  # Restart the server - it will recreate and reseed data/form2fact.db automatically.
  ```

### 8.4 Production Secret Enforcement Error
- **Symptom:** `FATAL SECURITY ERROR: JWT_SECRET environment variable is missing in production environment!`
- **Solution:** When running with `NODE_ENV=production`, ensure `JWT_SECRET` is set to a string of at least 32 characters in your environment or `.env`.
