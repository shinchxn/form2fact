# Form2Fact — Institutional Scrutiny & Evidence Verification

> **Tagline:** From Institutional Claims to Verifiable Evidence  
> **Product Category:** Institutional application scrutiny and evidence verification software  
> **Governance Notice:** Form2Fact is an evidence-first **decision-support tool**, not an autonomous approval authority. Discrepancies do not prove fraud; all regulatory rules cite explicit handbook sections and versions.

---

## 1. What Was Built

Form2Fact is a complete institutional scrutiny workspace designed around the authentic reviewer workflow:
`Applications → Documents → Extraction → Validation → Findings → Human Review → Report`

### Core Features & Implemented Screens:
1. **Screen A — Overview Dashboard**: Real-time scrutiny pipeline metrics, active docket queue, category breakdowns, and 1-click synthetic scenario launchers.
2. **Screen B — Applications Docket**: High-density searchable management grid with tabular figures, category filtering, status sorting, and direct workspace navigation.
3. **Screen C — New Application Intake**: Institutional intake form (Institution Legal Name, Sponsoring Body, Address, Area, Intake, Tenancy) with multi-document PDF upload dropzone and preset preloaders.
4. **Screen D — Application Detail Workspace**: Comprehensive application review console featuring processing lifecycle indicators (`Uploaded → Extracting → Validating → Ready for Review`), document inventory with SHA-256 integrity checksums, and cross-document field comparator.
5. **Screen E — Coordinated 3-Pane Document Review & Evidence Viewer**:
   - **Pane 1**: Document docket list with page count & extracted field count.
   - **Pane 2**: Document Canvas with page navigation, zoom controls, and visual highlight bounding boxes over matching clause text.
   - **Pane 3**: Evidence Inspector with raw values, normalized dates/acreages, confidence ratings, and manual correction dialog.
6. **Screen F — Findings & Discrepancies Workspace**: Dedicated discrepancy resolution console comparing applicant declared claims vs supporting document evidence with confirm, dismiss (with mandatory rationale), and indeterminate actions.
7. **Screen G — Rules & Checks Catalog**: Transparent catalog of deterministic regulatory rules (Land Tenancy, Sponsoring Trust Naming, Acreage Accounting, Prerequisite Filings) complete with interactive unit test suites.
8. **Screen H — Scrutiny Dossier & Export**: Official institutional verification dossier with print-ready formatting, JSON audit export, and CSV summary.
9. **Screen I — Chronological Audit Ledger**: Append-only log of all intake events, extractions, manual field overrides, rule evaluations, and reviewer decisions.
10. **Screen J — Settings & Access Control**: Persona switcher (Reviewer, Administrator, Read-only Auditor), processing engine specs, and 1-click synthetic dataset reset.

---

## 2. Interactive Demonstration Scenarios

Three pre-seeded, consistent synthetic demonstration cases are immediately ready for testing:

1. **Scenario 1 — Fully Compliant (`APP-2026-EOA-1104` | Kalyani Institute of Engineering)**:
   - Declared Lease Expiry: `2054-03-31` matches Clause 4 of registered Lease Deed (`31 March 2054`).
   - Campus Area: Declared 7.50 Acres matches Schedule A.
   - All 4 statutory documents attached (Lease Deed, Structural Stability, Fire Safety NOC, Trust Certificate).
   - Outcome: All rules pass, 0 discrepancies, Review Completed.

2. **Scenario 2 — Material Intentional Mismatch (`APP-2026-NTC-0842` | Pragati Institute of Technology)**:
   - Declared Lease Expiry: `2048-03-31`.
   - Supporting Evidence: Registered Lease Deed Clause 4 (Page 3) specifies termination on `31 March 2028` (20-year deficit).
   - Campus Area: Declared 7.50 Acres vs Deed Schedule of Property states 5.20 Acres (2.30 Acres deficit).
   - Outcome: System raises `FND-0842-01` (Lease Expiry Variance) and `FND-0842-03` (Deed Deficit). Reviewer confirms discrepancy with mandatory rationale.

3. **Scenario 3 — Missing / Ambiguous Evidence (`APP-2026-EOA-0915` | Vidyapeeth Academy of Pharmacy)**:
   - Missing statutory document: Fire Safety NOC not attached to docket (`RULE-DOC-04` triggers Information Missing).
   - Ambiguous document: Uploaded Building Safety Certificate is a scanned photocopy with low text density (`RULE-SAFETY-06` flags for manual committee inspection).

---

## 3. Architecture

- **Frontend**: React 19 + TypeScript + Tailwind CSS v4.
- **Design Tokens**: Warm paper canvas (`#F5F2EB`), charcoal typography (`#292D2A`), muted olive accent (`#727B62`), terracotta attention (`#B76E4C`), tabular numerals (`tabular-nums`).
- **Backend**: Express REST API integrated into Vite dev server via Connect middleware on port 3000, plus standalone `server.ts`.
- **Extraction & Validation Engine**: Fully deterministic regex parser and rule engine with page-level snippet citations. Optional server-side Gemini 3.8 Flash assistance via `@google/genai`.
- **Audit System**: Append-only audit events tracking actor, before/after values, and rationale.

---

## 4. Commands & Verification

```bash
# Run unit and integration test suite
npx tsx server/test-runner.ts

# Type-check and lint
npm run lint

# Compile and build applet
npm run build

# Start dev server on port 3000
npm run dev
```
