# FORM2FACT — MANUAL ACCEPTANCE TEST PLAN
**Evidence-First Institutional Document Intelligence & Regulatory Cross-Verification Platform**  
**Document Reference:** `F2F-DOC-PROD-10`  
**Target Branch:** `feature/production-transformation-ui`  
**Audience:** Project Owner, Regulatory Compliance Officers, QA Leads  
**Date:** November 2026  
**Status:** READY FOR EXECUTION  

---

## 1. PURPOSE & PRE-REQUISITES

This test plan provides step-by-step instructions for the project owner and quality assurance leads to manually verify every feature, workflow, and security control of the transformed Form2Fact platform.

### 1.1 Pre-Requisites & Launching the Application
1. **Launch the Backend & Frontend Dev Server:**
   ```bash
   npm run dev
   ```
2. **Launch the FastAPI ML Microservice (Optional for Hybrid Inference):**
   ```bash
   uvicorn ai_service.app.main:app --port 8000
   ```
3. Open your browser and navigate to:
   `http://localhost:3000` (or the configured Vite dev port, e.g., `http://localhost:5173`)

---

## 2. STEP-BY-STEP TEST PROCEDURES

### PHASE 1 — AUTHENTICATION & INSTITUTIONAL PERSONAS

#### Test Case 1.1: Dedicated Login Screen & Brand Assets
- **Action:** Open the application in an incognito or fresh browser window.
- **Expected Result:**
  - Dedicated institutional login screen is presented.
  - Official Form2Fact emblem (`public/form2fact-logo.jpg`) is prominently displayed.
  - Subtitle reads: *"From Institutional Claims to Verifiable Evidence."*
  - AICTE Scrutiny Portal badge is displayed.

#### Test Case 1.2: Password Visibility Toggle & Validation
- **Action:** Type `invalid@test.com` and a random password. Click the eye icon next to the password input.
- **Expected Result:** Password text toggles between masked and visible text.
- **Action:** Click "Authenticate Institutional Session".
- **Expected Result:** Red error banner appears stating: *"Invalid credentials. Please verify institutional email and password."*

#### Test Case 1.3: Quick Persona Switcher (Dr. Aruna Rao - Reviewer)
- **Action:** Click the persona shortcut button: **Dr. Aruna Rao (Reviewer)**.
- **Expected Result:** Fields auto-populate with `aruna.rao@scrutiny.edu.in`.
- **Action:** Click "Authenticate Institutional Session".
- **Expected Result:**
  - User successfully logs in and transitions into the Executive Overview workspace.
  - Top header displays: `Western Scrutiny Committee`.
  - Pinned sidebar footer shows `Dr. Aruna Rao` with role `Reviewer`.
  - "Reset Fixtures" button is **NOT visible** in the header (restricted to Administrator).

#### Test Case 1.4: Sign Out Workflow
- **Action:** In the bottom-left sidebar footer, click the Sign Out icon button next to the user card.
- **Expected Result:**
  - Active session token is removed from `localStorage`.
  - Workspace unmounts and user is immediately returned to the institutional login screen.

#### Test Case 1.5: Administrator Persona (Priya Patel)
- **Action:** On the login screen, click the persona shortcut: **Priya Patel (Administrator)** and authenticate.
- **Expected Result:**
  - User logs in as Priya Patel.
  - "Reset Fixtures" button is now visible in the top header.

---

### PHASE 2 — APPLICATIONS DOCKET & SCRUTINY WORKFLOW

#### Test Case 2.1: Applications Docket Inspection
- **Action:** In the sidebar, click **Applications**.
- **Expected Result:**
  - Docket table displays 3 seed applications:
    1. `F2F-2026-1104` (St. Teresa Institute - Compliant)
    2. `F2F-2026-0842` (Apex Institute of Technology - Material Mismatch)
    3. `F2F-2026-0915` (Saraswati College - Missing Documents)
  - Table columns display: Reference, Institution Name & Society, Type, Land/Lease, Submitted, Docs, Findings, Status, and Action.
  - Status badges render with correct color semantics.

#### Test Case 2.2: Search, Filter & Empty State Verification
- **Action:** In the search input, type `NonExistentUniversity999`.
- **Expected Result:**
  - Table displays the truthful empty state: *"No applications match your filter"*.
  - A button labeled *"Reset Filters"* is displayed.
- **Action:** Click "Reset Filters".
- **Expected Result:** Search input clears and all 3 applications reappear immediately.

#### Test Case 2.3: Application Detail Inspection (`F2F-2026-0842`)
- **Action:** Click on the row for `F2F-2026-0842` (Apex Institute of Technology).
- **Expected Result:**
  - Application detail dossier opens.
  - Breadcrumb updates to: `Scrutiny Workspace > Applications Docket > F2F-2026-0842`.
  - Declared parameters card shows: Land Area (7.50 Acres), Lease Expiry (2028-03-31).
  - Findings section displays 2 open discrepancy findings:
    1. Lease Expiry Mismatch (`RULE-TEN-01`)
    2. Land Area Shortfall (`RULE-AREA-03`)

---

### PHASE 3 — EVIDENCE SPL viewer & OCR CORRECTION

#### Test Case 3.1: Evidence Split Viewer Navigation
- **Action:** On finding `RULE-TEN-01`, click **"Inspect Evidence"**.
- **Expected Result:**
  - Application transitions to the **Evidence Viewer** (`DocumentReviewView.tsx`).
  - Left pane displays the simulated document page for the registered lease deed.
  - Right pane displays extracted OCR parameters, confidence scores, and bounding box citations.

#### Test Case 3.2: Field Correction Modal
- **Action:** Click the "Correct Field" button on an extracted parameter.
- **Expected Result:**
  - Correction modal opens.
  - Enter a corrected value and justification note (e.g., *"Scrutinizer confirmed typo in OCR scan"*).
  - Click "Save Correction".
  - Field updates in real-time, displays an "Edited" badge, and an audit event is appended.

---

### PHASE 4 — REGULATORY FINDINGS TRIAGE & SCRUTINY DECISION

#### Test Case 4.1: Triage Finding Status
- **Action:** Return to `F2F-2026-0842` and click **"Review Action"** on the Lease Expiry finding.
- **Expected Result:** Review Action Modal opens.
- **Action:** Select status **"Confirmed Discrepancy"**, enter review notes: *"Lease expires in 2028, failing 30-year statutory requirement"*, and submit.
- **Expected Result:**
  - Finding status updates to `Confirmed`.
  - Audit event is appended to the ledger.

#### Test Case 4.2: Scrutiny Committee Application Decision
- **Action:** Click "Record Committee Decision" in the application header.
- **Expected Result:**
  - Decision modal opens.
  - Selecting "Approve Application" is warned or blocked due to open confirmed discrepancies.
  - Select "Issue Deficiencies Notice", input committee minutes, and submit.
  - Application status updates to `Deficiencies Notified`.

---

### PHASE 5 — PAIRWISE VERIFICATION WORKBENCH

#### Test Case 5.1: Deterministic Match Verification
- **Action:** In the sidebar, click **Pairwise Verification**.
- **Expected Result:** Pairwise comparator workbench loads.
- **Action:** Select Field Type: `Institution Name`. Enter Claim: `Apex Institute of Technology` and Evidence: `Apex Institute of Technology`. Click "Run Cross-Verification".
- **Expected Result:**
  - Result badge: **`MATCH`** (Emerald).
  - Confidence: `1.00`.
  - Explanation: *"Exact character sequence match verified."*
  - Requires Human Review: `No`.

#### Test Case 5.2: Numeric Discrepancy Verification
- **Action:** Select Field Type: `Land Area (Acres)`. Enter Claim: `7.50` and Evidence: `6.00`. Click "Run Cross-Verification".
- **Expected Result:**
  - Result badge: **`MISMATCH`** (Crimson).
  - Explanation explicitly identifies `1.50 Acres` deficit.
  - Requires Human Review: `Yes`.

#### Test Case 5.3: OCR Degradation & Ambiguity Abstention
- **Action:** Enter Claim: `Plot 12, Phase 3, Industrial Area` and Evidence: `Survey No. 44/2, Near Metro Station`. Click "Run Cross-Verification".
- **Expected Result:**
  - Result badge: **`UNCERTAIN`** (Blue).
  - Confidence reflects ambiguity (< 0.60).
  - Requires Human Review: `Yes` (Zero autonomous error).

---

### PHASE 6 — AUDIT LOG & SETTINGS

#### Test Case 6.1: Immutable Audit Ledger
- **Action:** In the sidebar, click **Audit Log**.
- **Expected Result:**
  - Complete chronological timeline of all scrutiny actions performed during testing.
  - Each entry displays UTC timestamp, initiating user, entity reference, and previous/new values.

#### Test Case 6.2: System Settings & Role Governance
- **Action:** In the sidebar, click **Settings**.
- **Expected Result:**
  - Displays registered institutional users fetched from `/api/v1/users`.
  - Shows database mode (`SQLite WAL`), multi-tenant status (`Isolated`), and environment profile (`Development`).

---

## 3. ACCEPTANCE TEST SIGN-OFF SHEET

| Test Suite | Tester Name | Date Executed | Result (Pass/Fail) | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Phase 1: Authentication & Personas | | | | |
| Phase 2: Applications Docket | | | | |
| Phase 3: Evidence Viewer & OCR | | | | |
| Phase 4: Findings Triage & Decisions | | | | |
| Phase 5: Pairwise Workbench | | | | |
| Phase 6: Audit Log & Settings | | | | |

**Sign-off Authority:** _______________________________________  
**Title:** Principal Scrutiny Officer / System Architect  
**Date:** ________________________
