# Form2Fact V3 — AICTE Human Annotation User Guide & Operational Manual

**Target Audience:** Statutory Scrutiny Officers, Data Collectors, Domain Evaluators, Adjudicators, and MLOps Administrators.  
**System Module:** Form2Fact V3 Human Annotation Workbench (`/annotations`)  
**Specification Version:** 3.0  
**Effective Date:** 2026-11-07  

---

## 1. Introduction & Operational Objective

The **Form2Fact Human Annotation Workbench** provides a structured, double-blind environment for assembling high-quality, legally traceable institutional ground-truth claim/evidence pairs.

In regulatory institutional compliance (such as AICTE approval scrutiny), automated classifiers must not be trained on unverified or fabricated data. The Form2Fact annotation protocol enforces:
1. **Verifiable Provenance:** Every claim and evidence string must be linked to an authentic document, docket reference, and page citation.
2. **Double-Blind Review:** Two independent human evaluators review each candidate record without visibility into each other's decisions.
3. **Disagreement Adjudication:** Conflicting annotations are automatically detected and routed to accredited third-party adjudicators.
4. **Zero Synthetic Contamination:** Only genuine institutional records verified by human experts enter the V3 gold standard.

---

## 2. Roles, Privileges & Responsibilities

Form2Fact enforces strict Role-Based Access Control (RBAC):

| Operational Role | Primary Responsibility | Workbench Capabilities |
|---|---|---|
| **Data Collector** | Extracts institutional candidate pairs from public AICTE inspection dockets | Browse Queue, Create Candidate Task |
| **Annotator** | Evaluates claim/evidence pairs against official documents in blind review | Browse Queue, Inspect Documents, Save Draft, Submit Blind Annotation |
| **Reviewer** | Conducts standard scrutiny assessments and candidate intake | Browse Queue, Create Candidate Task, Annotate, Export Corpus |
| **Adjudicator** | Resolves divergent double-blind annotations with binding statutory rulings | Browse Queue, Inspect Documents, Resolve Disputed Tasks, Export Corpus |
| **Administrator** | Oversees regional tenant operations and quality governance | Global Queue Oversight, All Lifecycle Actions, Metric Audits |
| **Read-only Viewer** | Observes scrutiny progress and audit logs without modification rights | Browse Queue, View Completed Tasks |

---

## 3. Step-by-Step Workflow Guide

### Step 1: Navigating to the Annotation Workbench
1. Log into Form2Fact using your institutional credentials.
2. In the left navigation sidebar under **Workspace**, click **Annotation Workbench** (icon: `CheckSquare`).
3. The workbench will load displaying:
   - **Top Bar:** Quality Control Metrics dashboard (Cohen's Kappa, Agreement Rate, Adjudication Rate).
   - **Left Pane:** Task queue with status tabs (`All`, `Pending`, `In Review`, `Disputed`, `Agreed`, `Adjudicated`) and search.
   - **Middle Pane:** Document Viewer & Extracted Evidence Inspector.
   - **Right Pane:** Pairwise Verification & Decision Panel.

---

### Step 2: Creating a Candidate Task (Data Collectors / Reviewers)
To add a new statutory claim/evidence pair from an institutional docket:
1. Click the **"Add Candidate Pair"** button in the top navigation bar.
2. Complete the mandatory candidate fields:
   - **Institution Name:** Full registered legal name (e.g. *Apex Institute of Technology & Engineering*).
   - **Claim Field Name:** Canonical field identifier (e.g. `landAreaAcres`, `leaseExpiryDate`, `fireSafetyNoc`).
   - **Field Category:** Select semantic category (`generic`, `numeric`, `date`, `address`, `cadastral_survey`, `entity_name`).
   - **Claim Text:** Exact declaration quoted from the institution's statutory application form.
   - **Claim Document Name & Page:** Exact file name and page citation (e.g., `Application_Form.pdf`, Page 2).
   - **Evidence Text:** Exact text extracted from the certified supporting document (e.g., registered lease deed, fire NOC).
   - **Evidence Document Name & Page:** Certified supporting document file name and page citation.
   - **Evidence Location / Clause:** Specific clause or schedule (e.g., `Page 4, Clause 3`).
   - **Normalized Values (Optional):** Standardized ISO dates or floating-point acreage.
3. Click **"Create Candidate Task"**. The task will be queued with status `pending`.

---

### Step 3: Inspecting Source Documentary Evidence (Annotators)
Before selecting a classification label, you must inspect the documentary source:
1. Select a candidate task from the left task queue.
2. In the middle pane, toggle between:
   - **Evidence Document Tab:** Inspect the certified supporting proof.
   - **Application Claim Document Tab:** Inspect the applicant's self-disclosed declaration.
3. Use the page controls (`Page X of Y`, Previous, Next) to navigate between docket pages.
4. Use the zoom controls (`+`, `-`, 80% to 130%) for high-resolution document inspection.
5. Review the highlighted clause box showing the exact extracted text and OCR layer integrity status.

---

### Step 4: Applying the 5-Class Regulatory Taxonomy

Select exactly one of the five canonical classification labels:

```
                  ┌───────────────────────────────┐
                  │ Does supporting evidence exist│
                  │ in the institutional docket?  │
                  └───────────────┬───────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
                 [ YES ]                     [ NO ]
                    │                           │
                    │                           ▼
                    │                   ┌───────────────┐
                    │                   │    MISSING    │
                    │                   └───────────────┘
                    │
   ┌────────────────┴────────────────┐
   │ Are the claim and evidence      │
   │ semantically comparable?        │
   └────────────────┬────────────────┘
                    │
     ┌──────────────┴──────────────┐
     ▼                             ▼
  [ YES ]                       [ NO ]
     │                             │
     │                             ▼
     │                     ┌───────────────┐
     │                     │NOT_COMPARABLE │
     │                     └───────────────┘
     │
┌────┴─────────────────────────────┐
│ Is the evidence text legible     │
│ and unambiguous?                 │
└────┬─────────────────────────────┘
     │
     ├─────────────────────────────┐
     ▼                             ▼
  [ YES ]                       [ NO ]
     │                             │
     │                             ▼
     │                     ┌───────────────┐
     │                     │   UNCERTAIN   │
     │                     └───────────────┘
     │
┌────┴─────────────────────────────┐
│ Does the evidence satisfy the    │
│ claim within statutory tolerance?│
└────┬─────────────────────────────┘
     │
     ├─────────────────────────────┐
     ▼                             ▼
  [ YES ]                       [ NO ]
     │                             │
     ▼                             ▼
┌───────────────┐           ┌───────────────┐
│     MATCH     │           │   MISMATCH    │
└───────────────┘           └───────────────┘
```

#### Detailed Taxonomy Definitions:
1. **`MATCH` (Statutory Match):**  
   The claimed value is verified by the documentary evidence within statutory tolerance (e.g., claimed 31/03/2054, lease deed habendum clause states 31-03-2054).
2. **`MISMATCH` (Statutory Mismatch):**  
   The claimed value contradicts, deviates from, or falls short of the supporting document (e.g., claimed 8.50 Acres, schedule of property certifies only 5.20 Acres).
3. **`MISSING` (Missing Evidence):**  
   The applicant declared a mandatory statutory metric, but the supporting docket contains no corresponding proof or certificate.
4. **`UNCERTAIN` (Ambiguous / Inconclusive):**  
   The evidence text is corrupted by degraded OCR scan artifacts, contradictory clauses exist within the same docket, or the phrasing is ambiguous without institutional clarification.
5. **`NOT_COMPARABLE` (Incompatible Semantics):**  
   The claim and evidence fields do not correspond semantically (e.g., comparing land survey coordinates against a fire safety pump pressure rating).

---

### Step 5: Authoring Substantive Rationales
- Form2Fact strictly prohibits unreasoned voting.
- Every submitted annotation requires a **substantive statutory rationale of at least 10 characters**.
- The rationale should cite:
  - The specific document and page reviewed.
  - The exact clause or paragraph referenced.
  - The arithmetic or legal basis for the classification.
- *Example:* `"Schedule A on Page 2 certifies total contiguous land parcel measuring 5.20 Acres in Survey 104/A, representing a 3.30 Acre deficit against claimed 8.50 Acres."*

---

### Step 6: Saving Drafts vs. Submitting
- **Save Draft:** Preserves your work in progress. Does not commit your decision to the double-blind consensus engine. The task remains `pending`.
- **Submit Annotation:** Commits your decision. Transitions the task to `in_review` (if first reviewer) or triggers consensus/disagreement evaluation (if second reviewer).

---

### Step 7: Disagreement Resolution (Adjudicators)
When two independent annotators disagree on a record:
1. The task status is flagged as **`disputed`** (highlighted in red with a pulsing badge).
2. The task enters the adjudication queue.
3. An accredited **Adjudicator** or **Administrator** opens the task:
   - The UI reveals both annotators' submitted labels and rationales.
   - The adjudicator performs an independent forensic audit of the evidence.
   - The adjudicator selects the binding classification label.
   - The adjudicator authors a binding statutory rationale (minimum 10 characters).
4. Upon clicking **"Submit Binding Adjudication"**, the status updates to `adjudicated`, the final label is permanently recorded, and the dispute is resolved.

---

### Step 8: Quality Control & Cohen's Kappa Monitoring
The top dashboard summarizes real-time data governance metrics:
- **Total Records:** Candidate pool size and completed count (`agreed` + `adjudicated`).
- **Cohen's Kappa ($\kappa$):** Inter-annotator agreement corrected for chance agreement. Aim for $\kappa \ge 0.81$ (Almost Perfect Agreement).
- **Adjudication Rate:** Percentage of double-annotated records that required third-reviewer resolution. High rates indicate ambiguity in extraction guidelines.
- **Missing Evidence Rate:** Frequency of unattached or omitted statutory documents.
- **Zero Synthetic Verification:** Real-time assertion confirming 100% human authenticity.

---

### Step 9: Exporting the Gold-Standard Corpus (Administrators)
1. In the top bar, click **"Export Gold-Standard JSONL"**.
2. The system executes:
   - Queries all records with status `agreed` or `adjudicated`.
   - Validates each record against the V3 Pydantic Canonical Schema.
   - Generates `ai_service/ml/data/v3/annotations/gold_standard_human.jsonl`.
   - Computes an SHA-256 cryptographic digest.
   - Creates the companion manifest `gold_standard_human.manifest.json`.
3. A confirmation dialog displays the record count, file paths, and verification checksum.

---

## 4. Summary of Quality Invariants

1. **Zero Synthetic Contamination:** Under no circumstances may synthetically generated records be imported into the human annotation queue.
2. **Double-Blind Integrity:** Annotators must never discuss active candidate tasks prior to adjudication.
3. **Traceability:** Every record must preserve source document names and page numbers.
4. **Immutable Audit:** All votes, drafts, and adjudications are permanently logged in the Form2Fact system audit ledger.
