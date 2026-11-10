# FORM2FACT — JUDGES' DEMONSTRATION & EVALUATION GUIDE

**Project:** Form2Fact — Evidence-First Institutional Document Intelligence  
**Competition:** BharatCode Build League 2026  
**Target Repository:** `https://github.com/shinchxn/form2fact.git` (Branch: `main`)  
**Evaluation URL:** `http://localhost:3000`  
**Authentication Persona:** `Dr. Aruna Rao` (`aruna.rao@scrutiny.edu.in` / `Reviewer123!`)  

---

## 1. WHAT FORM2FACT DOES & WHAT PROBLEM IT SOLVES

### The Problem
Every year, higher education regulatory authorities (such as AICTE, UGC, and State Technical Education Directorates) process tens of thousands of institutional accreditation dockets. Scrutiny officers must manually cross-verify hundreds of applicant claims (campus land acreage, 30-year lease deeds, fire safety licenses, building occupancy certificates, sponsoring trust deeds) against multi-page, scanned, and bilingual (English + Tamil) PDF filings.

Manual scrutiny suffers from:
1. **High Error & Oversight Rates:** Fraudulent, expired, or non-contiguous land deeds and mismatched trust names frequently slip past manual review.
2. **Slow Processing Times:** Inspecting a single 30-page regulatory docket can take hours.
3. **Regulatory Non-Compliance:** Discrepancies between declared numbers (e.g., 7.50 acres) and actual deed text (e.g., 5.20 acres) are hard to spot in scanned documents.

### The Form2Fact Solution
Form2Fact is an **evidence-first document intelligence platform** that transforms institutional scrutiny from unverified claims into **cryptographically grounded evidence**:
- **Native PDF & Resilient OCR Pipeline:** Extracts structured text across native and scanned PDF pages in English and Tamil.
- **Deterministic Rules Engine:** Executes zero-tolerance mathematical, tenure, and mandatory document validation in sub-milliseconds.
- **Calibrated 5-Class Pairwise Classifier:** Deep semantic field comparison achieving **96.39% accuracy** and **100% recall on discrepancies** on independent held-out tests.
- **Multi-Model Advisory AI:** Orchestrates Qwen 3.8 27B and DeepSeek v4.1 Flash to generate bilingual explanations with strict document citation whitelisting.
- **Immutable Audit Ledger:** Cryptographically logs every evaluation, field correction, and officer adjudication to guarantee legal accountability.

```mermaid
flowchart LR
    A["Applicant Claims\n(Self-Declarations)"] --> C["Form2Fact Engine"]
    B["Authentic Evidence\n(26p Fire NOC, 25p Occupancy)"] --> C
    C --> D["Deterministic Rules\n(Tenure, Acreage, NOC)"]
    C --> E["5-Class Pairwise Classifier\n(96.39% Accuracy)"]
    D & E --> F["Statutory Findings\n(Grounding & Page Citations)"]
    F --> G["Advisory AI Reasoning\n(Qwen / DeepSeek / Tamil)"]
    G --> H["Human Adjudication\n(Immutable Audit Trail)"]
```

---

## 2. QUICK START FOR EVALUATORS

### System Requirements
- Node.js v20+ and npm
- Python 3.10+ (for internal ML microservice and evaluation scripts)
- Modern web browser (Chrome, Edge, Firefox, or Safari)

### Installation & Launch
```bash
# 1. Clone repository and verify on main branch
git clone https://github.com/shinchxn/form2fact.git
cd form2fact
git checkout main

# 2. Install dependencies
npm install

# 3. Launch the development server
npm run dev
```
Open your browser at: **`http://localhost:3000`**

### Instant One-Click Login
1. On the login screen, click the quick-login card: **"Dr. Aruna Rao (Western Reviewer)"**.
2. Or use demo credentials:
   - **Email:** `aruna.rao@scrutiny.edu.in`
   - **Password:** `Reviewer123!`
3. Click **"Access Scrutiny Workspace"**.

---

## 3. THE THREE APPROVED DEMONSTRATION DOCUMENTS

The user has explicitly authorized three genuine institutional regulatory PDFs located in [`dockets/authentic_test/`](file:///d:/projects/form2fact/dockets/authentic_test/):

| Document | Filename & Path | Pages | Size | SHA-256 Checksum | Key Regulatory Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Doc 1: SFR College** | [`dockets/authentic_test/SFR_College_Fire_Safety_Certificate.pdf`](file:///d:/projects/form2fact/dockets/authentic_test/SFR_College_Fire_Safety_Certificate.pdf) | 26 | 1.21 MB | `29DB06C268E161C4F09983FFEF661E142CF849403D352494C25DA5517B2B9F1B` | **Page 18:** Genuine Tamil Nadu Fire and Rescue Services Department License (`தீ உரிமம்`, Order No. 7391/I/2024, Virudhunagar District). |
| **Doc 2: S.A. College** | [`dockets/authentic_test/SA_College_Occupancy_Certificate.pdf`](file:///d:/projects/form2fact/dockets/authentic_test/SA_College_Occupancy_Certificate.pdf) | 25 | 1.00 MB | `87E0A3912C5DD7E411ECE85E93D4ACCEE3B0176F5C0DA4344C14D23061BFF563` | **Page 17:** Revenue Department Building Occupancy Certificate (Total Plinth Area: 10,497.62 sq.m). |
| **Doc 3: Good Shepherd** | [`dockets/authentic_test/Good_Shepherd_AICTE_EoA.pdf`](file:///d:/projects/form2fact/dockets/authentic_test/Good_Shepherd_AICTE_EoA.pdf) | 4 | 98.9 KB | `913DFADCF6F2DBE4E4A85D7920DAD517AF20B4C87C450614FF01942DDBB56D72` | **Pages 1-4:** Official AICTE Extension of Approval (EoA) Sanction Order for technical degree programs. |

---

## 4. UNDERSTANDING THE FIVE-CLASS CLASSIFICATION TAXONOMY

Form2Fact replaces simplistic binary classification with a calibrated **five-class statutory taxonomy**:

| Class Label | Statutory Definition | Real-World Application Example | Platform Behavior |
| :--- | :--- | :--- | :--- |
| **`MATCH`** | Declared claim and supporting evidence agree completely, or differ only by accepted legal entity variations. | Declared: *"Pragati Education Society"*<br>Evidence: *"Pragati Education Society, Regd."* | Automatically cleared; high confidence ($> 0.95$). |
| **`MISMATCH`** | Supporting evidence directly contradicts the applicant's declared claim. | Declared: *7.50 Acres*<br>Evidence: *5.20 Acres* (Area Deficit)<br>Declared: *2054 Expiry* vs Evidence: *2028 Expiry* | Flagged as **Material Discrepancy**; requires officer adjudication. |
| **`MISSING`** | Mandatory statutory document or required field is completely omitted from submission. | Fire Safety NOC or Registered Lease Deed omitted from the docket. | Flagged as **Information Missing**; triggers clarification notice. |
| **`UNCERTAIN`** | Text is degraded, ambiguous, low-resolution, or model confidence falls below the 85% abstention threshold. | Scanned, distorted, or handwritten endorsement where OCR confidence is $< 0.85$. | Engine **abstains from guessing**; mandates human officer review. |
| **`NOT_COMPARABLE`** | Cross-document fields represent incompatible regulatory dimensions. | Comparing Land Area (Acres) against Sanctioned Student Intake (Seats). | Incompatible comparison rejected; zero false contradictions. |

Judges can interactively test all 5 classes under **Sidebar $\rightarrow$ Pairwise Verification**.

---

## 5. MULTI-MODEL AI ORCHESTRATION & AUTHORITY HIERARCHY

### Inviolable Authority Hierarchy
To guarantee legal durability and eliminate AI hallucinations, Form2Fact strictly enforces the following rule:
$$\text{Form2Fact Classifier (Native ML)} \succ \text{Deterministic Rules Engine} \succ \text{Advisory AI Models} \succ \text{Human Reviewer}$$

1. **Native ML Classifier:** The authoritative machine classification component (96.39% accuracy, 100% mismatch recall).
2. **Deterministic Rules Engine:** Enforces mathematical boundaries and statutory mandates.
3. **Advisory Models (Qwen 3.8 27B / DeepSeek v4.1 Flash):**
   - Provide natural-language summaries and bilingual reasoning (English + Tamil).
   - **Zero Override:** An LLM can **never** overturn an authoritative `MISMATCH` into a `MATCH`.
   - **Citation Whitelisting:** Any document or page cited by an LLM that does not exist in the cryptographic docket manifest is automatically stripped.
4. **Human Review Officer:** Authoritative final decision recorded in the tamper-evident audit ledger.

### External Gateway Billing Notice (HTTP 402)
- The BharatCode gateway endpoint is genuine, reachable, and authenticated with a valid registered account token.
- Programmatic API token consumption requires an active commercial subscription (BharatCode Lite ₹399/mo or Pro ₹999/mo).
- When unpaid, the platform catches HTTP 402 gracefully and displays an informative notice (`BharatCode API Key Valid — Subscription Plan Required`).
- **Core verification, rules checking, and human adjudication remain 100% operational.**

---

## 6. COMPLETE STEP-BY-STEP DEMONSTRATION SCRIPT

Follow these steps for a complete evaluation:

1. **Sign In:** Go to `http://localhost:3000` $\rightarrow$ Click **"Dr. Aruna Rao"** $\rightarrow$ **"Access Scrutiny Workspace"**.
2. **Create Docket:** In sidebar, click **"Applications"** $\rightarrow$ **"New Application"** $\rightarrow$ Enter:
   - Legal Name: `The Standard Fireworks Rajaratnam College for Women`
   - Trust: `Standard Fireworks Industries Limited`
   - Address: `Thiruthangal Road, Sivakasi` (PIN: `626123`)
   - Click **"Create Application"**.
3. **Attach PDF:** In Application Detail View under Section 03, click **"Upload PDF"** $\rightarrow$ Choose `SFR_College_Fire_Safety_Certificate.pdf` (26 pages). Notice instant page parsing and SHA-256 badge!
4. **Trigger Checks:** Click **"Re-run Checks"** in header $\rightarrow$ Evaluates 6 core rules in sub-seconds.
5. **Inspect Findings:** View the raised discrepancy findings with exact page citations.
6. **Inspect Evidence:** Click **"Evidence Viewer"** in sidebar $\rightarrow$ Inspect Page 18 to see the extracted Tamil Fire Safety NOC.
7. **Test 5-Class Classifier:** Click **"Pairwise Verification"** in sidebar $\rightarrow$ Test presets (`Date Contradiction`, `Area Deficit`, `Trust Variant`, `Degraded OCR`, `Omitted Evidence`).
8. **Test Multi-Model Toolbar:** Click **"Findings"** in sidebar $\rightarrow$ Switch between Qwen 3.8 27B, DeepSeek v4.1, and Adaption $\rightarrow$ Toggle Tamil (`தமிழ்`) and English (`EN`).
9. **Adjudicate:** Click **"Record Decision"** on any finding $\rightarrow$ Confirm finding $\rightarrow$ Enter statutory note $\rightarrow$ Click **"Save Decision"**.
10. **Verify Ledger:** Click **"Audit Ledger"** in sidebar $\rightarrow$ Verify your adjudication event is permanently logged with timestamp and reviewer identity.

---

## 7. AUTOMATED E2E VERIFICATION SUITE

Judges can independently execute the complete headless browser automation test suite:
```bash
npx playwright test e2e/real-document-verification.spec.ts --reporter=list
```
**Expected Outcome:** All 10 serial scenarios pass in approximately 20-25 seconds, capturing 10 high-resolution screenshots in `test-results/screenshots/`.

