# FORM2FACT — FRONTEND FORENSIC AUDIT & CURRENT STATE REPORT

**Audit Reference:** F2F-AUDIT-FE-2026  
**Date:** November 6, 2026  
**Auditor / Role:** Person 7 — Senior Frontend Architect, React Engineer, UI/UX Designer & Accessibility Specialist  
**Current Branch:** `feature/frontend-evidence-workflow` (based on `develop` at `74dfe78`)  
**Scope:** Repository-wide inspection of React 19 client components, state management, design tokens, API integration, accessibility, and classification taxonomy presentation.

---

## 1. EXECUTIVE SUMMARY

Form2Fact's frontend is architected as a high-density, evidence-first regulatory scrutiny application using **React 19, TypeScript, Vite, and Tailwind CSS v4**.

The core workflows—Application Intake, Document Inventory, 3-Pane Document Canvas, Discrepancy Findings Triage, Deterministic Rules Sandbox, Scrutiny Dossier Generator, and Audit Ledger—are implemented and backed by real SQLite and REST API endpoints.

However, a forensic audit reveals **10 critical areas requiring architectural refinement, UI standardization, and accessibility remediation**:
1. **Unauthenticated Pairwise API Call:** `PairwiseComparator.tsx` executed direct `fetch('/api/v1/verification/pairwise')` without the mandatory JWT Bearer token, causing 401 errors.
2. **Missing 5-Class Outcome Breakdown on Dashboard:** `OverviewView.tsx` displayed aggregate docket counts but omitted the central five-class taxonomy (`MATCH`, `MISMATCH`, `MISSING`, `UNCERTAIN`, `NOT_COMPARABLE`).
3. **Underutilized Shared Component Library:** High-quality shared components (`DataTable.tsx`, `EmptyState.tsx`, `LoadingState.tsx`, `EvidencePanel.tsx`) were built but not utilized across primary views.
4. **Lack of Dedicated Verification Navigation:** Pairwise field comparison was embedded only at the bottom of `ApplicationDetailView.tsx` rather than accessible as an independent primary workspace.
5. **Missing Document Download Action:** `DocumentReviewView.tsx` lacked a direct action to stream the authorized binary PDF from `/api/v1/applications/:id/documents/:docId/file`.
6. **Primitive Global Loading State:** `App.tsx` displayed a bare text `Loading workspace...` instead of a structured enterprise loading skeleton.
7. **Inconsistent Error Boundaries & Alerts:** API request failures were logged to `console.error` without informing reviewers via accessible inline banner notifications.
8. **Keyboard Navigation & ARIA Gaps:** Several interactive cards lacked semantic `role="button"`, explicit focus indicators, or ARIA live regions for status changes.
9. **Mobile & Tablet Overflow:** Complex comparison matrices and the 3-pane document viewer did not provide responsive view modes on narrower viewports.
10. **Hollow Feature Barrels:** `src/features/` contained 8 index files that merely re-exported `src/components/`, creating architectural ambiguity.

---

## 2. DETAILED AUDIT FINDINGS (THE 10 CRITICAL QUESTIONS)

### 1. Which pages are implemented?
- **Overview Dashboard (`OverviewView.tsx`):** Operational metrics, topic navigation (`#topic-kpis`, `#topic-scenarios`, etc.), active docket summary, discrepancy categories.
- **Applications Docket (`ApplicationsView.tsx`):** Tabular list with search, status filters, and sorting.
- **Application Detail Workspace (`ApplicationDetailView.tsx`):** Processing progress bar, document list, claim-vs-evidence cross-field comparison, embedded pairwise comparator, findings list, and Gemini deep scrutiny memo.
- **Coordinated 3-Pane Document Reviewer (`DocumentReviewView.tsx`):**
  - Pane 1: Sticky Document Navigator.
  - Pane 2: Document Canvas with zoom (`80%` to `130%`), page navigation, and clause markers.
  - Pane 3: Evidence Inspector with raw extracted text, confidence ratings, and manual field correction triggers.
- **Findings & Discrepancies Workspace (`FindingsView.tsx`):** Search, domain pills (`Land & Tenancy`, `Safety & Compliance`, etc.), severity pills, and side-by-side comparison cards.
- **Rules & Verification Catalog (`RulesView.tsx`):** AICTE rule table, enable/disable toggle, and interactive sandbox test modal.
- **Scrutiny Dossiers & Export (`ReportsView.tsx`):** Official institutional compliance audit report, print preview, JSON/CSV exports.
- **Chronological Audit Ledger (`AuditLogView.tsx`):** Append-only event history with actor, timestamp, before/after values, and rationale.
- **System Settings & Personas (`SettingsView.tsx`):** Active persona switcher (`usr-001` Reviewer, `usr-002` Administrator, `usr-003` Auditor), engine health status, and synthetic reset trigger.
- **Modals:** `NewApplicationModal`, `CorrectionModal`, `ReviewActionModal`, `ApplicationDecisionModal`.

### 2. Which pages are functional?
- All 9 primary views render and connect to functional handlers.
- Modal interactions trigger real backend mutations (`PATCH /api/v1/fields/:id`, `POST /api/v1/findings/:id/review`, `POST /api/v1/applications/:id/decision`).
- Rules sandbox executes live deterministic evaluations via `POST /api/v1/rules/:id/test`.

### 3. Which components are duplicated?
- `src/features/*/index.ts`: Re-exported components from `src/components/`, while `src/App.tsx` imported directly from `src/components/`.
- Status badge styling: Hand-rolled badge CSS in `FindingsView.tsx` and `ApplicationsView.tsx` duplicated logic already unified in `StatusBadge.tsx`.

### 4. Which components are unused?
- `src/shared/components/DataTable.tsx`: Available but not imported in `ApplicationsView.tsx`.
- `src/shared/components/EmptyState.tsx`: Available but not imported when filters return zero results.
- `src/shared/components/LoadingState.tsx`: Available but bypassed by plain text in `App.tsx`.
- `src/shared/components/EvidencePanel.tsx`: Built for findings inspection but only partially utilized.

### 5. Which API integrations are real?
- 100% of methods in `src/services/api.ts` connect to live Express routes (`/api/v1/*`).
- Auto-auth bootstrapping via `ensureAuthToken()` automatically resolves a valid JWT token on startup.

### 6. Which UI elements use mock data?
- Overview scenario launcher cards: Hardcoded demonstration descriptors (`syn-001`, `syn-002`, `syn-003`) that deep-link into pre-seeded applications.
- Document canvas fallback: Displays `[SCANNED BITMAP DOCUMENT — OCR TEXT LAYER NOT PRESENT]` when `extractedTextByPage` is empty.

### 7. Which buttons have no working actions?
- `PairwiseComparator.tsx` line 23: Executed raw `fetch` missing the `Authorization: Bearer <token>` header, failing in authenticated production mode.
- Notifications Bell in `Header.tsx`: Presentational only with no popover.
- Document Download: No direct download button existed in `DocumentReviewView.tsx` to stream the PDF.

### 8. Which screens have missing loading and error states?
- Initial app load in `App.tsx` used unstyled `<div>Loading workspace...</div>`.
- Filter zero-results in `ApplicationsView.tsx` and `FindingsView.tsx` lacked clean `EmptyState` actions.
- Global API failure banner was absent when backend was unreachable.

### 9. Whether the frontend properly handles all five classification outcomes:
- `StatusBadge.tsx` supports:
  - `MATCH` (Emerald)
  - `MISMATCH` (Rose)
  - `MISSING` (Amber)
  - `UNCERTAIN` (Indigo)
  - `NOT_COMPARABLE` (Slate)
- However, `OverviewView.tsx` did not aggregate or display these counts in an executive summary KPI card.

### 10. Whether evidence and source-document references are displayed correctly:
- Document names and page numbers are displayed in finding cards.
- Deep-linking from a finding card to `DocumentReviewView.tsx` (`initialDocumentId`, `initialPage`) works, but lacked auto-scrolling to the specific field on the canvas.

---

## 3. PRIORITIZED FRONTEND REFACTOR PLAN

| Priority | Objective | Actions |
|---|---|---|
| **P0** | **Fix Authenticated Pairwise API & Export** | Add `runPairwiseComparison` to `src/services/api.ts` with `getHeaders()`. Wire `PairwiseComparator.tsx` through centralized API service. Add PDF stream download trigger. |
| **P1** | **Design System Standardization** | Document tokens in `docs/design/FRONTEND_DESIGN_SYSTEM.md`. Standardize buttons, inputs, badges, and cards across all views. Adopt `StatusBadge.tsx` universally. |
| **P2** | **First-Class Verification Workspace** | Add `verification` view to `Sidebar.tsx` and `App.tsx`. Provide a full-screen Pairwise Verification workbench for real-time claim vs evidence comparison. |
| **P3** | **Adopt Shared UI Components** | Integrate `DataTable.tsx`, `EmptyState.tsx`, `LoadingState.tsx`, and `EvidencePanel.tsx` into `ApplicationsView.tsx`, `FindingsView.tsx`, and `App.tsx`. |
| **P4** | **Dashboard 5-Class KPI Summary** | Add executive classification outcome counter on `OverviewView.tsx` aggregating `MATCH`, `MISMATCH`, `MISSING`, `UNCERTAIN`, and `NOT_COMPARABLE`. |
| **P5** | **Accessibility & Responsive Polish** | WCAG 2.2 AA audit: keyboard tab traversal, visible focus rings, ARIA labels, responsive collapse on mobile/tablet viewports ($< 1024\text{px}$). |
