# Form2Fact — Institutional Scrutiny & Evidence Verification Workspace

> **Tagline:** From Institutional Claims to Verifiable Statutory Evidence  
> **Product Category:** Enterprise institutional application scrutiny and regulatory evidence verification platform  
> **Governance Notice:** Form2Fact is an evidence-first **decision-support tool**, not an autonomous approval authority. Discrepancies identify statutory variances requiring human reviewer adjudication; all regulatory rules cite explicit regulatory handbook clauses and gazette standards.

---

## Deployment & Live URLs

- **AI Studio Development URL**: [https://ais-dev-txy4w2gy37eiq7vqsuyszx-861934504304.asia-east1.run.app](https://ais-dev-txy4w2gy37eiq7vqsuyszx-861934504304.asia-east1.run.app)
- **Shared Preview URL**: [https://ais-pre-txy4w2gy37eiq7vqsuyszx-861934504304.asia-east1.run.app](https://ais-pre-txy4w2gy37eiq7vqsuyszx-861934504304.asia-east1.run.app)
- **Primary Reviewer / Operator**: `tamizharasanravi29@gmail.com`
- **Default Port**: `3000` (Full-stack Vite + Express Connect Middleware)

---

## 1. What Was Built

Form2Fact is a production-grade institutional scrutiny and compliance auditing workspace architected around the statutory regulatory review lifecycle:
```
Applications Docket ➔ Document Inventory ➔ Extraction Engine ➔ Deterministic Rule Engine ➔ Findings Triage ➔ Coordinated 3-Pane Document Review ➔ Adjudication & Dossier Export
```

### Complete Screen Architecture (10 Views):

1. **Overview Dashboard (`Screen A`)**:
   - Executive operational pipeline metrics (Total Filings, Flagged Variance Rate, Clean Clearance Rate, Pending Review).
   - Sticky topic navigation bar with 1-click quick jumps (`#pipeline-metrics`, `#synthetic-scenarios`, `#active-docket`, `#engine-status`).
   - Quick synthetic scenario launchers with instant docket population.
   - Live scrutiny docket queue with inline discrepancy chips and direct workspace deep-links.

2. **Applications Docket (`Screen B`)**:
   - High-density regulatory management table supporting search across Institute Name, Application ID, and Trust Name.
   - Status filters (All, In Review, Ready for Review, Completed, Needs Clarification, Flagged).
   - Institutional category tabs (Engineering, Management, Pharmacy, Architecture, Polytechnic).
   - Right-aligned tabular data (`tabular-nums`) with clear numeric columns and status pills.

3. **New Application Intake Modal (`Screen C`)**:
   - Structured multi-field intake form (Institution Legal Name, Sponsoring Body / Trust, Institution Category, Campus Address, Total Land Area in Acres, Sanctioned Student Intake, Land Tenancy Type, Lease Expiry Date).
   - Document dropzone supporting statutory PDF uploads (Registered Lease Deed, Structural Safety Certificate, Fire Safety NOC, Trust Registration Certificate).
   - 1-click synthetic case preloader buttons for fast regulatory prototyping.

4. **Application Detail Workspace (`Screen D`)**:
   - Header with processing lifecycle progress bar (`Uploaded → Extracting → Validating → Ready for Review`).
   - Quick-action toolbar: "Run Auto-Extract & Validate", "Review Documents", "Resolve Discrepancies", "Adjudicate Application".
   - Document integrity repository detailing file sizes, page counts, statutory document types, and SHA-256 cryptographic checksums.
   - Claim vs Document cross-field comparison matrix with confidence ratings and manual override triggers.

5. **Coordinated 3-Pane Document Review & Evidence Viewer (`Screen E`)**:
   - **Pane 1 (Document Index)**: Docket document hierarchy with page counts, field tags, and extraction health.
   - **Pane 2 (Document Canvas)**: High-fidelity document viewer with zoom controls (`75%` to `150%`), page navigation, text highlight overlay boxes, and clause marker anchors.
   - **Pane 3 (Evidence Inspector)**: Deep-dive inspector displaying extracted raw text, normalized values (dates, acres, figures), regex confidence percentages, handbook clause citations, and field correction modals.

6. **Findings & Discrepancies Workspace (`Screen F`)**:
   - Specialized regulatory discrepancy resolution console categorized by severity (`CRITICAL`, `WARNING`, `INFO`).
   - Side-by-side comparison cards: Applicant Claimed Value vs Supporting Document Evidence.
   - Adjudication action controls: **Confirm Discrepancy**, **Dismiss Discrepancy** (requires mandatory justification rationale recorded in audit ledger), or mark as **Indeterminate** (requests physical committee inspection).

7. **Rules & Verification Catalog (`Screen G`)**:
   - Transparent registry of all active deterministic regulatory rules:
     - `RULE-LAND-01`: Minimum Campus Land Area Requirements by Institution Type & Location Tier.
     - `RULE-LEASE-02`: Land Tenancy Duration & Unexpired Lease Period (minimum 30 years remaining).
     - `RULE-TRUST-03`: Sponsoring Trust / Society Entity Name Exact Match with Deed Grantee.
     - `RULE-SAFETY-04`: Mandatory Fire Safety NOC & Building Stability Certification.
   - Interactive live test sandbox allowing officers to simulate values and verify rule pass/fail criteria in real-time.

8. **Scrutiny Dossier & Export Console (`Screen H`)**:
   - Official institutional audit report generator formatted for print and administrative submission.
   - Executive compliance summary, complete document verification table, resolved/open discrepancy ledger, and officer sign-off block.
   - Export actions: **Print Official Dossier**, **Export Full Audit JSON**, **Download CSV Summary**.

9. **Chronological Audit Ledger (`Screen I`)**:
   - Append-only, tamper-evident chronological event log tracking every system and reviewer action.
   - Filterable by event type: Intake Events, Automated Extractions, Manual Field Overrides, Rule Evaluations, Reviewer Adjudications.
   - Full event metadata: Timestamp, Actor ID, Actor Role, Target Document, Pre-change Value, Post-change Value, and Rationale.

10. **System Settings & Active Persona (`Screen J`)**:
    - Segmented persona switcher for role-based access control:
      - **Senior Scrutiny Officer** (Full adjudication and override privileges).
      - **Regulatory Systems Administrator** (Catalog rule management, synthetic data reset).
      - **Independent Compliance Auditor** (Read-only dossier inspection mode).
    - Pipeline Health & Engine Status matrix (Deterministic OCR Parser, Rule Engine, Audit Integrity, Local Processing).
    - Synthetic demonstration dataset reset trigger.

---

## 2. Interactive Demonstration Scenarios

Three pre-seeded statutory compliance scenarios demonstrate real-world edge cases:

### Scenario 1 — Fully Compliant Clearance
- **Application ID**: `APP-2026-EOA-1104`
- **Institution**: Kalyani Institute of Engineering & Technology
- **Declared Values**:
  - Lease Expiry: `2054-03-31` (Matches Clause 4 of registered Lease Deed `31 March 2054`).
  - Campus Area: `7.50 Acres` (Matches Schedule A land parcel).
  - All 4 statutory certificates attached and verified.
- **Outcome**: All rules pass, 0 discrepancies, Status: `COMPLETED` / `CLEARED`.

### Scenario 2 — Material Intentional Mismatch (Critical Deficit)
- **Application ID**: `APP-2026-NTC-0842`
- **Institution**: Pragati Institute of Technology & Management
- **Discrepancies Detected**:
  - **Lease Expiry Variance**: Declared `2048-03-31`, but registered Lease Deed Clause 4 explicitly states tenancy terminates on `31 March 2028` (20-year deficit violating the 30-year requirement).
  - **Land Area Deficit**: Declared `7.50 Acres`, but Deed Schedule of Property registers `5.20 Acres` (2.30 Acres deficit).
- **Outcome**: System triggers `FND-0842-01` and `FND-0842-03`. Reviewer adjudicates with mandatory justification note.

### Scenario 3 — Missing Statutory Evidence & Ambiguous Scan
- **Application ID**: `APP-2026-EOA-0915`
- **Institution**: Vidyapeeth Academy of Pharmacy
- **Discrepancies Detected**:
  - **Missing Certificate**: Fire Safety NOC not attached in document docket (`RULE-DOC-04` triggers Information Missing).
  - **Ambiguous Document**: Uploaded Structural Stability Certificate is an illegible photocopy scan (`RULE-SAFETY-06` flags for physical inspection).
- **Outcome**: Status set to `NEEDS_CLARIFICATION`, generating a statutory deficiency notice for the applicant institution.

---

## 3. Design System & Tokens (Balanced SaaS)

The interface follows a clean, modern, human-crafted Balanced SaaS aesthetic (Linear / Stripe / Vercel grade):

| Token Category | Specification / Value | Utility Classes |
| :--- | :--- | :--- |
| **Canvas Background** | Slate Clean `#F8FAFC` | `bg-slate-50` |
| **Surface Containers** | Pure White `#FFFFFF` with 1px border | `bg-white border border-slate-200 shadow-sm` |
| **Primary Typography** | Deep Charcoal `#0F172A` | `text-slate-900 font-semibold` |
| **Secondary Typography** | Neutral Slate Gray `#64748B` | `text-slate-500` / `text-slate-600` |
| **Brand Primary Accent** | Deep Indigo `#4F46E5` | `bg-indigo-600 hover:bg-indigo-700 text-white` |
| **Success Status** | Soft Emerald `#ECFDF5` / Text `#065F46` | `bg-emerald-50 text-emerald-800 border-emerald-200` |
| **Warning Status** | Soft Amber `#FEF3C7` / Text `#92400E` | `bg-amber-50 text-amber-800 border-amber-200` |
| **Discrepancy / Danger** | Soft Rose `#FFE4E6` / Text `#9F1239` | `bg-rose-50 text-rose-800 border-rose-200` |
| **Tabular Numbers** | Monospace, right-aligned | `font-mono tabular-nums text-right` |
| **Max Page Width** | Full-width fluid container | `max-w-[1440px] mx-auto px-6 lg:px-8` |
| **Header Height** | Standardized 64px header | `h-16 flex items-center` |
| **Topic Quick-Jump** | Sticky blur header | `sticky top-0 z-20 backdrop-blur-md bg-white/95 border-b` |

---

## 4. REST API Reference

The backend operates via Express REST endpoints mounted both in standalone Node (`server.ts`) and through Vite Connect middleware during dev:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/applications` | List all applications with summary statistics |
| `GET` | `/api/applications/:id` | Fetch detailed application record, documents & fields |
| `POST` | `/api/applications` | Create a new application intake record |
| `POST` | `/api/applications/:id/extract` | Trigger document OCR & structured field extraction |
| `POST` | `/api/applications/:id/validate` | Run deterministic regulatory rules against fields |
| `POST` | `/api/applications/:id/findings/:findingId/resolve` | Adjudicate a finding (`confirmed`, `dismissed`, `indeterminate`) |
| `POST` | `/api/applications/:id/fields/:fieldId/correct` | Record an officer manual correction on an extracted field |
| `POST` | `/api/applications/:id/decision` | Record overall scrutiny verdict (`approved`, `rejected`, `clarification`) |
| `GET` | `/api/audit-events` | Retrieve append-only audit trail events |
| `POST` | `/api/reset` | Reset state to clean synthetic baseline cases |
| `GET` | `/api/rules` | Fetch catalog of statutory regulatory rules |
| `POST` | `/api/rules/test` | Execute interactive unit test for a rule |

---

## 5. Development & Testing Commands

```bash
# 1. Run the deterministic verification test suite
npx tsx server/test-runner.ts

# 2. Type-check with TypeScript compiler
npm run lint

# 3. Compile and build the production bundle
npm run build

# 4. Start the development server on port 3000
npm run dev
```

---

## 6. Architecture & Security Guarantees

1. **Deterministic Verification Guarantee**: The extraction and rule-evaluation pipelines are 100% deterministic. All discrepancies are backed by exact clause text, page numbers, and bounding-box coordinates.
2. **Audit Accountability**: Every manual override or finding dismissal requires an officer identifier, timestamp, and justification comment recorded to the append-only ledger.
3. **No External Data Leakage**: Document parsing and verification are performed locally within the server runtime.
