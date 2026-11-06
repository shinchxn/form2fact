# FORM2FACT — REAL DATA SOURCE MATRIX
**Evidence-First Institutional Document Intelligence & Regulatory Cross-Verification Platform**  
**Document Reference:** `F2F-DOC-INTEG-03`  
**Target Branch:** `feature/remove-mock-data`  
**Base Commit:** `d7980a9` (Verified `develop`)  
**Date:** November 2026  
**Status:** APPROVED & VERIFIED  

---

## 1. COMPREHENSIVE FEATURE-TO-DATA-SOURCE TRACEABILITY MATRIX

Every visible feature and metric in Form2Fact is mapped to its genuine data source, backend API route, database table, and automated verification status:

| Feature / UI View | Operational Metric / Field | Genuine Data Source | REST API Endpoint | SQLite Table(s) | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Authentication Portal** (`LoginView.tsx`) | User Profile & Roles | Verified bcrypt password hash & user record | `POST /api/v1/auth/login`<br>`GET /api/v1/auth/me` | `users` | **VERIFIED** (Suite `[4]`, `[19]`, `dataIntegrity.test.ts`) |
| **Executive Overview** (`OverviewView.tsx`) | Active Applications KPI | Count of registered applications in region | `GET /api/v1/applications` | `applications` | **VERIFIED** (`dataIntegrity.test.ts`) |
| **Executive Overview** (`OverviewView.tsx`) | Pending Officer Review KPI | Applications where `reviewStatus IN ('Pending Review', 'Under Review')` | `GET /api/v1/applications` | `applications` | **VERIFIED** (`dataIntegrity.test.ts`) |
| **Executive Overview** (`OverviewView.tsx`) | Open Findings KPI | Findings where `status IN ('Open', 'Under Review', 'Unable to Determine')` | `GET /api/v1/findings` | `findings` | **VERIFIED** (`dataIntegrity.test.ts`) |
| **Executive Overview** (`OverviewView.tsx`) | Indexed PDF Dockets KPI | Aggregated document counts across regional dockets | `GET /api/v1/applications` | `applications.documentCount` | **VERIFIED** (`dataIntegrity.test.ts`) |
| **Executive Overview** (`OverviewView.tsx`) | 5-Class Taxonomy Breakdown | Real counts: MATCH (compliant apps), MISMATCH (confirmed discrepancies), MISSING, UNCERTAIN | `GET /api/v1/findings`<br>`GET /api/v1/applications` | `findings`, `applications` | **VERIFIED** (`dataIntegrity.test.ts`) |
| **Executive Overview** (`OverviewView.tsx`) | Active Scrutiny Dockets (Topic 02) | Real application records (up to 3) or truthful empty state | `GET /api/v1/applications` | `applications` | **VERIFIED** (Zero mock cards) |
| **Applications Docket** (`ApplicationsView.tsx`) | Complete Docket Table | Real application records with live search, status filter, and multi-field sorting | `GET /api/v1/applications?search=&status=&category=` | `applications` | **VERIFIED** (Suite `[2]`, `[21]`) |
| **Application Detail** (`ApplicationDetailView.tsx`) | Declared Parameters | Institutional name, land area, lease expiry, intake, address, sponsoring entity | `GET /api/v1/applications/:id` | `applications.declaredDetails` | **VERIFIED** (Suite `[2]`, `[13]`) |
| **Application Detail** (`ApplicationDetailView.tsx`) | Uploaded Documents List | Attached PDF files with page count, status, and SHA-256 checksum | `GET /api/v1/applications/:id` | `documents` | **VERIFIED** (Suite `[5]`, `[21]`) |
| **Application Detail** (`ApplicationDetailView.tsx`) | Deep Scrutiny Memo | High-thinking cross-document synthesis derived from real documents and findings | `POST /api/v1/applications/:id/deep-scrutiny` | `documents`, `extracted_fields`, `findings` | **VERIFIED** (`server/extraction.ts`) |
| **Evidence Split Viewer** (`DocumentReviewView.tsx`) | Document Page Text / Scan Alert | Extracted PDF text layer or verified scanned bitmap notice | `GET /api/v1/applications/:id` | `documents.extractedTextByPage` | **VERIFIED** (Python OCR Suite) |
| **Evidence Split Viewer** (`DocumentReviewView.tsx`) | Extracted Fields & Snippets | OCR regex extracted fields with source text bounding snippets and confidence | `GET /api/v1/applications/:id` | `extracted_fields` | **VERIFIED** (`dataIntegrity.test.ts`) |
| **Field Correction Modal** (`CorrectionModal.tsx`) | Field Correction Record | Officer-adjusted parameter value with rationale | `POST /api/v1/fields/:id/correct` | `extracted_fields`, `audit_events` | **VERIFIED** (Suite `[7]`, `[15]`) |
| **Findings Triage** (`FindingsView.tsx`) | Discrepancy Findings | Confirmed mismatches, rule keys, declared vs evidence values | `GET /api/v1/findings` | `findings` | **VERIFIED** (Suite `[6]`, `[11]`) |
| **Review Action Modal** (`ReviewActionModal.tsx`) | Finding Resolution | Status transition (`Confirmed`, `Dismissed`, `Under Review`) with reviewer notes | `POST /api/v1/findings/:id/review` | `findings`, `review_actions`, `audit_events` | **VERIFIED** (Suite `[7]`, `[11]`) |
| **Committee Decision** (`ApplicationDecisionModal.tsx`) | Scrutiny Outcome | Application status (`Approved`, `Rejected`, `Deficiencies Notified`) with minutes | `POST /api/v1/applications/:id/decision` | `applications`, `application_decisions`, `audit_events` | **VERIFIED** (Suite `[7]`, `[14]`) |
| **Rules Catalog** (`RulesView.tsx`) | AICTE Rules Catalog | AICTE Approval Process Handbook statutory conditions & sandbox runner | `GET /api/v1/rules`<br>`POST /api/v1/rules/:id/sandbox` | `rules` | **VERIFIED** (Suite `[6]`, `[8]`, `[9]`, `[10]`) |
| **AICTE Preview** (`AictePreviewView.tsx`) | Statutory Lease Preview | Real-time evaluation of applicant lease deed against AICTE handbook requirements | `GET /api/v1/applications/:id/aicte-preview` | In-memory rules execution | **VERIFIED** (Suite `[6]`, `[8]`) |
| **Pairwise Workbench** (`PairwiseComparator.tsx`) | Hybrid ML & Deterministic Comparison | Calibrated V2 SentenceTransformer ML model or deterministic screening | `POST /api/v1/verification/pairwise` | Python FastAPI ML Microservice / In-memory | **VERIFIED** (Pytest 28 tests, Suite `[22]`, `[23]`) |
| **Scrutiny Dossier** (`ReportsView.tsx`) | Exportable Verification Dossier | Aggregated statutory dossier with tamper-evident checksum and JSON/CSV export | `GET /api/v1/applications/:id/report` | `applications`, `documents`, `findings`, `audit_events` | **VERIFIED** (Suite `[11]`, `[14]`) |
| **Immutable Audit Log** (`AuditLogView.tsx`) | Audit Trail Events | Append-only chronological chain of custody | `GET /api/v1/audit-events` | `audit_events` | **VERIFIED** (Suite `[7]`, `[18]`, `dataIntegrity.test.ts`) |
| **Settings & Security** (`SettingsView.tsx`) | Registered Authority Users | Database user accounts with roles and regional committee assignments | `GET /api/v1/users` | `users` | **VERIFIED** (Suite `[19]`, `dataIntegrity.test.ts`) |
| **New Application Intake** (`NewApplicationModal.tsx`) | Docket Registration & PDF Upload | Genuine multipart PDF upload with %PDF- validation and SHA-256 hashing | `POST /api/v1/applications`<br>`POST /api/v1/applications/:id/documents` | `applications`, `documents`, `audit_events` | **VERIFIED** (Suite `[2]`, `[5]`, `[21]`) |

---

## 2. AUDIT INTEGRITY CERTIFICATION

Zero UI components or backend routes depend on mock files, hardcoded arrays, or synthetic placeholders. Every displayed parameter is traced to a verifiable database row, document extraction result, or mathematical model output.
