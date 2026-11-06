# Form2Fact Production Baseline Audit & Technical Assessment

**Document ID:** `FORM2FACT-PROD-AUDIT-001`  
**Date:** November 6, 2026  
**Auditors:** Principal Software Architect, Senior Product Designer, Data Integrity Auditor, AppSec Lead  
**Repository:** `https://github.com/shinchxn/form2fact.git`  
**Working Branch:** `feature/production-transformation-ui`  
**Base Commit:** `d7980a9` (Verified `develop`)

---

## 1. Executive Summary

This audit assesses the production readiness, data integrity, visual design, and architectural rigor of the Form2Fact platform. Form2Fact is an **Evidence-First Institutional Document Intelligence and Regulatory Cross-Verification Platform** currently targeting AICTE compliance.

While core backend modules (SQLite persistence, RBAC, domain rules engine, calibrated ML inference with 0.60 abstention, and PyMuPDF/Tesseract OCR) are functionally robust and passing 100% of automated tests, significant production readiness gaps exist:
1. **Fabricated & Hardcoded Dashboard Elements:** The Overview page contains static scenario cards with hardcoded text and an invented formula for estimating "MATCH" counts.
2. **Unconditional Demo Seeding:** The backend database initialization seeds demo institutions and applications without checking whether the environment is `production`.
3. **Brand Identity Divergence:** The UI utilizes a generic Indigo (`#4F46E5`) theme rather than the official Form2Fact brand identity (Deep Navy `#0A2540` / `#002B49` and Institutional Teal `#0D9488`).
4. **Missing Formal Authentication View:** The application relies on an auto-auth bootstrap (`ensureAuthToken()`) that silently logs in as `usr-001` rather than offering a secure, enterprise login screen.
5. **Missing True Empty States:** In an empty database, certain screens assume pre-seeded applications exist and do not render truthful empty states.

---

## 2. Existing Functionality Inventory

| Functional Area | Current Implementation | Underlying Technology | Production Status |
| :--- | :--- | :--- | :---: |
| **Authentication & RBAC** | JWT tokens, bcrypt hashes, role checking (`Administrator`, `Reviewer`, `Viewer`) | Node.js `jsonwebtoken`, `bcryptjs` | Functional (Needs dedicated login page) |
| **Tenant Isolation** | Scoped regional directorates (`org-aicte-western`, `org-aicte-central`) | SQLite `organizationId` filter | Functional & Verified |
| **Document Ingestion** | Multipart upload, magic-byte check (`%PDF-`), storage in `data/dockets` | Express, `multer`, filesystem | Functional & Verified |
| **Text Extraction** | Native text layer extraction with form-feed page splitting | `pdf-parse` (Node.js) | Functional & Verified |
| **OCR Pipeline** | Page-level rendering & Tesseract fallback when text < 40 chars | FastAPI, PyMuPDF, Tesseract | Functional & Verified |
| **Field Extraction** | Regex & layout heuristics for land, dates, entity names, NOCs | TypeScript rules | Functional & Verified |
| **Normalization** | ISO dates, numeric acreages, entity title casing | Regex & string normalizers | Functional & Verified |
| **Statutory Rules Engine** | Versioned evaluation of AICTE statutory rules (`RULE-TEN-01` to `RULE-SAFETY-06`)| Modular `DomainPack` adapter | Functional & Verified |
| **Pairwise ML Inference** | Sentence-transformers (MiniLM) + tabular features + calibrated classifier ($T=1.8182$) | Scikit-learn, PyTorch | Functional & Verified |
| **Abstention Policy** | Posterior probability $< 0.60$ forces `UNCERTAIN` and routes to human officer | Python FastAPI engine | Functional & Verified |
| **Human Review Workflow** | Confirmation, rejection, correction modals with mandatory rationale | SQLite persistence | Functional & Verified |
| **Audit Ledger** | Immutable audit records capturing actor, timestamp, action, diff | SQLite `audit_events` | Functional & Verified |
| **Dossier Reporting** | Printable institutional dossiers, JSON export, CSV export | React, browser printing | Functional & Verified |

---

## 3. Existing UI Pages & Navigation Structure

The platform uses a single-page application (SPA) with tabbed navigation:

1. **`overview` (`OverviewView.tsx`):**
   - KPI metrics (Active Applications, Pending Officer Review, Open Findings, Indexed PDF Dockets).
   - 5-class pairwise classification outcome matrix.
   - *Issue:* Topic 02 hardcodes 3 static benchmark cards with fixed text.
   - *Issue:* Match count is estimated via a formula rather than verified data.
2. **`applications` (`ApplicationsView.tsx` & `ApplicationDetailView.tsx`):
   - Multi-tenant application docket table with search, status filters, sorting.
   - Detail view: summary metadata, tabs for Findings, Pairwise Workbench, Document Management, Audit Log.
3. **`document-review` (`DocumentReviewView.tsx`):**
   - 3-pane split screen evidence viewer:
     - Left: Docket document selector.
     - Center: Document page viewer with zoom and page navigation.
     - Right: Extracted fields, extraction confidence, and linked findings.
4. **`verification` (`PairwiseComparator.tsx`):**
   - Interactive pairwise comparison workbench allowing ad-hoc field pair testing against the Python ML microservice.
5. **`findings` (`FindingsView.tsx`):**
   - Centralized findings triage list with status and severity filters.
6. **`rules` (`RulesView.tsx`):**
   - Statutory rules catalog, lifecycle status, condition viewer, and interactive test sandbox.
7. **`aicte-preview` (`AictePreviewView.tsx`):**
   - AICTE Approval Process Handbook cross-verification dashboard.
8. **`reports` (`ReportsView.tsx`):**
   - Institutional scrutiny dossiers, summary metrics, print view, and JSON/CSV export.
9. **`audit` (`AuditLogView.tsx`):**
   - Immutable audit ledger showing actor, action, timestamp, entity reference, before/after values.
10. **`settings` (`SettingsView.tsx`):**
    - System persona switcher, pipeline modules health, and demo data reset.

---

## 4. Existing Database Entities & Schema

```sql
users (id, displayName, email, passwordHash, role, department, organizationId, createdAt)
applications (id, referenceNumber, institutionName, applicationType, organizationId, status, reviewStatus, declaredDetails, documentCount, openFindingsCount, totalFindingsCount, reviewerNotes, assignedReviewer, createdBy, createdAt, updatedAt)
documents (id, applicationId, originalFilename, documentType, storageKey, mimeType, sizeBytes, checksum, pageCount, processingStatus, isScannedOrTextPoor, extractedTextByPage, createdAt)
extracted_fields (id, documentId, applicationId, fieldName, fieldValue, normalizedValue, originalValue, isCorrected, correctedValue, pageNumber, confidence, sourceSnippet, createdAt, updatedAt)
findings (id, applicationId, ruleId, ruleKey, ruleVersion, category, title, explanation, declaredValue, evidenceValue, severity, status, evidenceList, assignedReviewer, reviewerDecisionReason, updatedBy, createdAt, updatedAt)
rules (id, ruleKey, name, description, category, applicableApplicationCategory, applicableDocumentTypes, version, sourceReference, effectiveFrom, enabled, readableCondition, testCases)
review_actions (id, findingId, applicationId, reviewerId, reviewerName, action, previousStatus, newStatus, note, createdAt)
audit_events (id, timestamp, actorId, actorName, action, entityType, entityReference, beforeValue, afterValue, note)
application_decisions (id, applicationId, reviewerId, reviewerName, decisionType, rationale, createdAt)
```

---

## 5. Discovered Mock and Fabricated Data Sources

1. **`src/components/OverviewView.tsx` (Lines 360–450):**
   - Hardcoded scenario cards (`APP-2026-EOA-1104`, `APP-2026-NTC-0842`, `APP-2026-EOA-0915`) featuring fixed text strings ("Kalyani Institute", "Pragati Institute", "Vidyapeeth Academy") and static discrepancy explanations.
2. **`src/components/OverviewView.tsx` (Lines 64–67):**
   - Fabricated MATCH count calculation: `Math.max(0, (rules.length || 6) - (a.totalFindingsCount || 0))`.
3. **`server/db.ts` (Lines 49, 305–450):**
   - Unconditional call to `this.seedDefaultData(false)` which inserts demo applications `app-1104`, `app-0842`, `app-0915` whenever the database is uninitialized, regardless of `NODE_ENV`.
4. **`src/components/SettingsView.tsx` (Lines 26–48):**
   - Frontend static array `demoUsers` hardcoding personas rather than fetching actual registered users from `GET /api/v1/users`.
5. **`src/services/api.ts` (Lines 26–39):**
   - Silent auto-auth bootstrap that automatically logs in as `usr-001` without an explicit login screen.

---

## 6. Existing Security & Production Readiness Limitations

- **Silent Auto-Auth:** Bypasses explicit user sign-in. In production, users must be presented with an authenticated session check and login prompt.
- **Unconditional Seeding:** In production, empty databases should remain empty, requiring authorized administrators to create legitimate dockets.
- **Unauthenticated UI Controls:** Reset Demo button is visible in the top header without permission checks.

---

## 7. Design System & Accessibility Inconsistencies

- **Color Palette Divergence:** Application utilizes `#4F46E5` (Indigo) while official brand identity is Deep Navy (`#0A2540` / `#002B49`) with Institutional Teal (`#0D9488`).
- **Logo Absence:** Sidebar renders generic `<Layers>` icon instead of the official Form2Fact brandmark.
- **Empty States:** When no applications exist in a tenant, Overview still shows 3 hardcoded scenario cards.
- **Form Controls:** Login/Intake modals lack full keyboard focus trap and ARIA live regions for async submission errors.

---

## 8. Action Plan for Production Transformation

1. **Phase B & C:** Author Fabricated Data Audit and Data Cleanup Plan.
2. **Phase D:** Guard database seeding (`NODE_ENV === 'production'` disables demo data; explicit flag `SEED_DEMO_DATA=true` required for dev/test); replace hardcoded scenarios in `OverviewView.tsx` with dynamic queries or honest empty states; fetch actual users for switcher.
3. **Phase E:** Establish Form2Fact Enterprise Design System using official Navy/Teal palette and official SVG/image logo.
4. **Phase F & G:** Redesign application shell, top bar, and all views with the authoritative enterprise design.
5. **Phase H:** Implement dedicated login screen, loading skeletons, and accessible empty/error states.
6. **Phase I–L:** Verify all backend integrations, accessibility compliance, security boundaries, and deliver acceptance reports.
