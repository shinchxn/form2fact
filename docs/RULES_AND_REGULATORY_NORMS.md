# Form2Fact — Regulatory Rules & Statutory Verification Catalog

## 1. Overview of the Regulatory Verification Engine

The Form2Fact rules engine evaluates institutional claims against evidence extracted from supporting documents. All rules are codified in [server/rulesEngine.ts](file:///d:/projects/form2fact/server/rulesEngine.ts) and cite specific chapters, sections, and schedules of the **AICTE Approval Process Handbook (APH)**.

---

## 2. Active Statutory Rules Catalog

### Rule 1: `RULE-TEN-01` — Land Lease Expiry & Term Concordance

- **Regulatory Category:** Land & Tenancy
- **Handbook Citation:** *Approval Process Handbook, Chapter 1, Section 4.2 (Tenure Regulations)*
- **Applicable Application Types:** All Technical Institutions (New Technical Campus, Extension of Approval)
- **Applicable Documents:** `Land Lease Deed`, `Land Ownership Title Deed`
- **Current Version:** `v1.2`
- **Readable Condition:**
  ```
  Declared Lease Expiry Date == Registered Deed Expiry Date 
  AND Unexpired Tenure >= (ApplicationType == 'New Technical Campus' ? 30 Years : 20 Years)
  ```
- **Freehold Exemption:** If the institution owns its campus outright via a registered `Land Ownership Title Deed`, lease term requirements are automatically waived (perpetual freehold title).
- **Evaluation Logic:**
  1. If no Land Lease Deed or Ownership Title Deed is uploaded, trigger `Information Missing` finding: *"Registered Land Lease Deed Missing from Application Docket"*.
  2. If the lease expiry clause cannot be parsed (e.g., scanned bitmap), trigger `Attention Required` finding with status `Unable to Determine`.
  3. Compare declared expiry date (`YYYY-MM-DD`) with normalized deed expiry date.
  4. If dates differ, raise a `Material Discrepancy` finding citing the clause, page number, and exact variance.
  5. Calculate remaining tenure in full years from the academic evaluation year (e.g. `2054 - 2026 = 28 years`). If remaining tenure fails the statutory minimum (30 years for NTC, 20 years for EOA), raise a `Material Discrepancy` finding.

---

### Rule 2: `RULE-NAME-02` — Institution & Sponsoring Society Concordance

- **Regulatory Category:** Identity & Registration
- **Handbook Citation:** *Institutional Governance Norms, Sub-section 3.1*
- **Applicable Application Types:** All Applications
- **Applicable Documents:** `Society / Trust Registration Certificate`, `Land Lease Deed`
- **Current Version:** `v1.1`
- **Readable Condition:**
  ```
  NormalizedCoreTokens(Declared Trust) == NormalizedCoreTokens(Trust Certificate Legal Name)
  ```
- **Concordance Algorithm:**
  - Tokenizes entity names into distinct words, discarding legal stop words: `the`, `and`, `of`, `trust`, `society`, `foundation`, `educational`, `charitable`, `welfare`, `sanstha`, `mandal`, `shikshan`, `institute`, `academy`, `ltd`, `private`.
  - Calculates the Jaccard similarity index: `commonTokens / unionTokens`.
  - Material Divergence Check: If one entity name contains commercial markers (`commercial`, `enterprises`, `holding`, `corp`, `retail`) while the other represents a statutory non-profit trust, concordance is immediately rejected with confidence `0.1`.
  - If Jaccard similarity $\ge 0.5$ or exact token alignment, rule passes. Otherwise, a `Material Discrepancy` finding is generated.

---

### Rule 3: `RULE-AREA-03` — Declared Land Area Accounting & Multi-Parcel Aggregation

- **Regulatory Category:** Land & Tenancy
- **Handbook Citation:** *Physical Infrastructure Norms, Schedule 2 (Minimum Land Requirement)*
- **Applicable Application Types:** New Technical Campus, Extension of Approval
- **Applicable Documents:** `Land Lease Deed`, `Land Ownership Title Deed`
- **Current Version:** `v1.2`
- **Readable Condition:**
  ```
  Sum(Unique Valid Extracted Deed Areas) >= Declared Campus Land Area
  ```
- **Anti-Double-Counting Protection:**
  - Distinct parcel acreage values are deduplicated by `documentId` so that duplicate document uploads do not inflate the total aggregated campus land area.
  - Multi-parcel consolidation is supported (e.g. Parcel 1 [4.00 Acres] + Parcel 2 [3.50 Acres] = 7.50 Acres).
- **Discrepancy Trigger:**
  - If `Declared Land Area > Total Aggregated Area + 0.05 Acres`, raise a `Material Discrepancy` finding: *"Schedule Land Area Deficit against Declared Campus Requirement"*, detailing exact deficit acreage and citing each supporting deed.

---

### Rule 4: `RULE-DOC-04` — Mandatory Statutory Document Checklist

- **Regulatory Category:** Safety & Compliance
- **Handbook Citation:** *Scrutiny Procedure Manual Section A (Essential Attachments)*
- **Applicable Application Types:** All Technical Institutions
- **Applicable Documents:** `Land Lease Deed`, `Land Ownership Title Deed`, `Building Safety Certificate`, `Fire Safety NOC`
- **Current Version:** `v1.1`
- **Readable Condition:**
  ```
  Has(Land Lease OR Title Deed) AND Has(Building Safety) AND Has(Fire Safety NOC)
  ```
- **Evaluation Logic:**
  - Scans docket document inventory.
  - If any mandatory document is absent, raises an `Information Missing` finding: *"Statutory Submission Incomplete: Missing [List of Missing Documents]"*.

---

### Rule 5: `RULE-APPR-05` — Prior Approval Order & Intake Continuity

- **Regulatory Category:** Approvals & Capacity
- **Handbook Citation:** *Approval Process Regulations, Intake Records Section 5.4*
- **Applicable Application Types:** Extension of Approval, Increase in Intake (Exempts New Technical Campus)
- **Applicable Documents:** `AICTE Prior Approval Order`, `Affiliation Sanction Letter`
- **Current Version:** `v1.1`
- **Readable Condition:**
  ```
  If ApplicationCategory == 'New Technical Campus': Pass (Exempt)
  Else: Normalized(Declared Prior Ref) == Normalized(Extracted Order Ref)
  ```
- **Evaluation Logic:**
  - Automatically exempts New Technical Campus filings (no prior year approval history).
  - For EOA / Intake Increase, extracts the `F.No.` approval order reference and verifies exact normalized alignment with applicant declaration.

---

### Rule 6: `RULE-SAFETY-06` — Building Safety & Structural Stability Verification

- **Regulatory Category:** Safety & Compliance
- **Handbook Citation:** *National Building Code 2016, Part IV (Structural Safety Standards)*
- **Applicable Application Types:** All Applications
- **Applicable Documents:** `Building Safety Certificate`
- **Current Version:** `v1.1`
- **Readable Condition:**
  ```
  Document Status == Extracted AND Structural Caveats == None AND IsScanned == False
  ```
- **Scanned Bitmap Guardrail:**
  - If the certificate is a scanned photocopy without an embedded OCR text layer (`isScannedOrTextPoor = true`), the rule flags an `Attention Required` finding with status `Unable to Determine`.
  - Explains that automated extraction is deferred to physical committee inspection of engineer registration stamps.

---

## 3. String & Date Normalization Algorithms

### Date Normalization (`normalizeDate`)
Normalizes all inputs to the ISO-8601 standard date format (`YYYY-MM-DD`):
- `YYYY-MM-DD` (e.g. `2054-03-31` $\rightarrow$ `2054-03-31`)
- `DD/MM/YYYY` or `DD-MM-YYYY` (e.g. `31/03/2054` $\rightarrow$ `2054-03-31`)
- Textual English dates (e.g. `31 March 2028` or `March 31, 2028` $\rightarrow$ `2028-03-31`)

### Text Normalization (`normalizeText`)
Strips all punctuation characters (`.,/#!$%^&*;:{}=\-_~()"'’“”`), collapses contiguous whitespace, and converts to lowercase.

---

## 4. Live Simulation Sandbox (`evaluateSingleRuleSandbox`)

The rules engine provides an isolated evaluation function (`evaluateSingleRuleSandbox`) accessible via `POST /api/v1/rules/test`. 
- **Pure Execution Guarantee:** Simulates rule logic with test inputs without touching or mutating the SQLite database.
- Used in the UI ([src/components/RulesView.tsx](file:///d:/projects/form2fact/src/components/RulesView.tsx)) to execute real-time pass/fail assertions.

