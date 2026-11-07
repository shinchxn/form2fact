# FORM2FACT
## Multi-Institution Engineering College Pilot Partnership Proposal

**From Institutional Claims to Verifiable Evidence**

**Proposal Type:** Institutional Technology Pilot & Research Collaboration  
**Project:** Form2Fact — Evidence-First Institutional Document Intelligence Platform  
**Target Participants:** Engineering Colleges, Institutional Managements, Academic Administrators and Authorized Subject-Matter Reviewers  
**Initial Domain:** Institutional Documentation and Regulatory Cross-Verification  
**Proposed Pilot Scope:** Multiple participating engineering institutions (3–5 colleges)  
**Proposed Duration:** 12–16 weeks, subject to institutional approvals and onboarding  
**Proposal Status:** For Institutional Discussion and Consideration  
**Project Authority:** Independent technology project; not an official AICTE initiative  
**Repository:** `https://github.com/shinchxn/form2fact.git`  
**Active Branch:** `feature/ml-pairwise-classifier-v3`  

---

# 1. Executive Summary

Form2Fact is an evidence-first institutional document intelligence platform designed to assist authorized reviewers in examining institutional declarations, supporting documents and applicable regulatory requirements.

Engineering institutions routinely maintain and submit information across multiple documents, including institutional applications, land and building records, faculty information, infrastructure records, statutory certificates, declarations and supporting evidence.

Reviewing these records may require comparing information across different documents, locating the original evidence, identifying missing information and checking whether relevant requirements have been addressed.

Form2Fact aims to support this process through automated document processing, structured information extraction, cross-document comparison, configurable rule validation and evidence-linked discrepancy reporting.

The proposed partnership will establish a limited, multi-institution pilot involving participating engineering colleges. The pilot will evaluate the platform using institutionally authorized documents, independent human annotations and controlled review workflows.

The collaboration will focus on:

- Improving the traceability of institutional document verification.
- Identifying potential inconsistencies between declared information and supporting evidence.
- Supporting more consistent and reproducible document review.
- Maintaining clear evidence provenance and audit records.
- Evaluating the practical usefulness of AI-assisted verification under human supervision.

Form2Fact will function strictly as a decision-support platform. It will not independently approve, reject, accredit or declare an institution non-compliant.

No institutional document will be collected or processed without documented permission from the relevant institution and any additional authorization required by applicable law or institutional policy.

---

# 2. Background and Problem Statement

## 2.1 Institutional documentation challenges

Institutional information is often distributed across different records and supporting documents.

Examples include:

- Institutional application declarations.
- Land ownership and lease documents.
- Building plans and infrastructure records.
- Fire safety and statutory certificates.
- Faculty qualifications and appointment records.
- Student intake and programme information.
- University affiliation and approval documents.
- Institutional affidavits and declarations.

A reviewer may need to compare a field declared in one record with evidence contained in another document.

This creates several practical challenges:

1. **Information fragmentation:** Relevant information is distributed across multiple documents.
2. **Cross-document inconsistency:** Names, dates, quantities and other fields may differ between declarations and evidence.
3. **Missing evidence:** A declaration may be present without the expected supporting document.
4. **Document quality:** Scanned, rotated or low-quality documents can make information difficult to extract.
5. **Traceability:** Reviewers need to identify the exact document and page supporting a finding.
6. **Review consistency:** Different reviewers may interpret ambiguous evidence differently.

The objective is not to replace existing institutional or regulatory systems. It is to provide an additional evidence-verification layer that helps authorized people examine supporting documents systematically.

## 2.2 Proposed opportunity

Form2Fact will focus on the gap between what an institution declares and what its supporting documents appear to establish.

The platform will assist in:

- Extracting relevant information from documents.
- Comparing related fields across records.
- Checking configured requirements.
- Identifying missing or contradictory evidence.
- Showing source document references and page locations.
- Recording human review decisions and justifications.

The platform will distinguish automated observations from verified human conclusions.

---

# 3. Proposed Solution

Form2Fact provides an integrated document intelligence and cross-verification workflow.

## 3.1 Core workflow

```
Stage 1: Authorized Document Intake
  ↓
Stage 2: Document Processing (PDF/OCR)
  ↓
Stage 3: Structured Information Extraction & Normalization
  ↓
Stage 4: Cross-Document Comparison (Candidate Claim/Evidence Pairing)
  ↓
Stage 5: Configurable Requirement Validation (Rule Definitions)
  ↓
Stage 6: Evidence-Linked Findings (Page & Text Provenance)
  ↓
Stage 7: Human Review & Double-Blind Adjudication
  ↓
Stage 8: Auditable Reporting & Cryptographic Ledger Logging
```

- **Stage 1 — Authorized document intake:** Participating institutions provide approved documents through a controlled intake process.
- **Stage 2 — Document processing:** The platform identifies document types and extracts text and relevant fields using PDF processing and OCR.
- **Stage 3 — Structured information extraction:** Extracted information is normalized into comparable fields, preserving the original text and source location.
- **Stage 4 — Cross-document comparison:** Related institutional claims and supporting evidence are compared.
- **Stage 5 — Configurable requirement validation:** Applicable, approved rule definitions are evaluated against available information.
- **Stage 6 — Evidence-linked findings:** Potential inconsistencies are presented with source document references, page numbers, extracted text and confidence information.
- **Stage 7 — Human review and adjudication:** Authorized reviewers independently examine findings, submit annotations and resolve disagreements through an independent adjudication process.
- **Stage 8 — Auditable reporting:** The platform produces structured review outputs and maintains an audit trail of relevant activities.

## 3.2 Five-class discrepancy classification

Form2Fact uses the following classification taxonomy:

| Classification | Meaning |
|:---|:---|
| **MATCH** | Available evidence appears consistent with the claim. |
| **MISMATCH** | Evidence appears to contradict the claim. |
| **MISSING** | Required information or evidence is absent. |
| **UNCERTAIN** | Available information is insufficient or ambiguous. |
| **NOT_COMPARABLE** | The two items cannot meaningfully be compared. |

> [!NOTE]
> These are evidence-comparison outcomes, not legal or regulatory decisions. A `MISMATCH` classification does not establish fraud, misconduct or statutory non-compliance.

---

# 4. Proposed Pilot Scope

## 4.1 Multi-institution participation

The proposal envisages participation by a small cohort of engineering institutions.

- **Proposed initial cohort:** 3–5 engineering colleges, subject to institutional interest, written authorization and operational capacity.
- The participating institutions may include different types of engineering colleges to evaluate document variation and practical usability.
- Each institution will have a separate organizational workspace and controlled access to its own records.

## 4.2 Proposed pilot activities

| Workstream | Proposed activity |
|:---|:---|
| **Institutional onboarding** | Register participating institutions and authorized representatives. |
| **Document intake** | Collect specifically approved institutional documents. |
| **Document intelligence** | Extract and normalize selected fields. |
| **Cross-verification** | Compare institutional declarations with supporting evidence. |
| **Human annotation** | Obtain independent reviewer classifications. |
| **Adjudication** | Resolve disagreements through an independent reviewer. |
| **Evaluation** | Measure extraction quality, discrepancy performance and reviewer agreement. |
| **Reporting** | Produce institution-specific and aggregated pilot reports. |

## 4.3 Proposed initial document categories

The initial pilot may consider the following categories, subject to participating institutions' permission:

1. Institutional identity and registration documents.
2. Land ownership and lease records.
3. Building and infrastructure documents.
4. Fire safety and other statutory certificates.
5. Faculty qualification and appointment summaries.
6. University affiliation and programme-related documents.
7. Institutional declarations and affidavits.

The final document list will be agreed with each institution before intake.

Sensitive personal information, including identity numbers, financial details and personal contact information, should be excluded or redacted unless specifically necessary, authorized and protected.

## 4.4 Scope exclusions

The pilot will **not**:
- Issue or modify AICTE approvals.
- Access restricted AICTE databases without explicit authorization.
- Submit applications on behalf of participating institutions.
- Automatically approve or reject institutions.
- Issue statutory deficiency notices.
- Replace institutional, university or regulatory review committees.
- Make autonomous fraud determinations.
- Conduct unauthorized government portal scraping.
- Train or fine-tune the V3 model during the initial data-collection pilot.

---

# 5. Technical Architecture

## 5.1 Architecture overview

Form2Fact follows a modular architecture that separates document intake, document intelligence, comparison, domain rules and human review.

```
Institutional Users & Authorized Reviewers
                  ↓
Frontend: Institutional Review Dashboard (React, TypeScript, Vite)
                  ↓
Backend: Authentication, Tenant Management, APIs & Workflow (Node.js, Express, TypeScript)
                  ↓
Document Intelligence Layer (PyMuPDF, OCR Pipeline, Field Normalization)
                  ↓
Evidence Comparison & AI Layer (Pairwise 5-Class Classifier, Uncertainty Handling)
                  ↓
Domain Rules Layer (Configurable Rules, Version-Controlled Criteria)
                  ↓
Evidence & Governance Layer (SHA-256 Checksums, Audit Ledger, Signed External Checkpoints)
                  ↓
Outputs: Institution-Specific Reports, Discrepancy Records, Adjudication History
```

## 5.2 Technology components

| Layer | Technology |
|:---|:---|
| **Frontend** | React, TypeScript, Vite |
| **Backend** | Node.js, Express, TypeScript |
| **AI Service** | Python, FastAPI |
| **PDF Processing** | PyMuPDF and document-processing utilities |
| **OCR** | OCR processing pipeline |
| **ML Inference** | Hybrid pairwise classification pipeline |
| **Database** | SQLite for the controlled single-writer deployment |
| **Containerization** | Docker and Docker Compose (`docker-compose.staging.yml`) |
| **Security** | JWT authentication, role-based access and tenant isolation |
| **Integrity** | SHA-256 document checksums and cryptographic audit records |
| **Checkpointing** | Signed external audit checkpoints (HMAC-SHA256, migration path to Ed25519) |

The current controlled deployment uses a single-writer SQLite topology. A multi-institution pilot does not imply unrestricted horizontal database scaling. Each institution's data must remain logically isolated.

## 5.3 Evidence traceability

Every exported finding should retain, where applicable:
- Institution identifier.
- Application or docket identifier.
- Source document identifier.
- Original document checksum.
- Page reference.
- Extracted claim and evidence text.
- Extraction confidence.
- Normalization details.
- Classification outcome.
- Applicable rule identifier and version.
- Annotator decisions.
- Adjudication outcome.
- Relevant audit history.

## 5.4 Integration boundaries

The initial pilot will use institutionally authorized document uploads and approved file-based exchange.

Any direct integration with an external institutional or government system will require separate technical authorization, security review and permission from the relevant system owner.

No existing AICTE portal integration or official government API access is represented as part of this proposal.

---

# 6. Institutional Responsibilities

The pilot requires clear responsibilities between participating institutions and the Form2Fact project team.

## 6.1 Participating engineering institutions

Each participating institution will:
1. Nominate an institutional coordinator.
2. Identify the documents approved for the pilot.
3. Confirm that it has the authority to provide the documents.
4. Obtain any necessary internal management, ethics, legal or other approvals.
5. Provide documents through the approved secure intake channel.
6. Identify authorized personnel who may access institutional records.
7. Review extracted information and report inaccuracies.
8. Participate in pilot feedback and evaluation.
9. Notify the project team of any changes to document permissions.
10. Ensure that institutional participation does not imply endorsement of Form2Fact by any regulator.

## 6.2 Form2Fact project team

The project team will:
1. Maintain the application and its technical infrastructure.
2. Enforce authentication and institution-level access controls.
3. Process only authorized documents.
4. Maintain document checksums and provenance records.
5. Present findings with supporting evidence references.
6. Maintain annotation and adjudication workflows.
7. Protect institutional information against unauthorized access.
8. Maintain relevant audit records.
9. Provide technical support and incident reporting.
10. Produce pilot evaluation reports.
11. Respect agreed retention and deletion requirements.
12. Avoid using institutional data for model training without separate written authorization.

## 6.3 Institutional reviewers

Authorized reviewers will:
- Examine source evidence.
- Independently classify assigned candidate pairs.
- Provide reasoned explanations for decisions.
- Avoid accessing records outside their authorization.
- Disclose potential conflicts of interest.
- Participate in adjudication only where independently authorized.
- Report ambiguous or insufficient evidence rather than forcing a classification.

## 6.4 Independent adjudicator

The adjudicator will:
- Review disagreements between annotators.
- Examine the underlying evidence.
- Record a reasoned final annotation.
- Avoid adjudicating records they previously annotated.
- Maintain confidentiality.
- Ensure that adjudication decisions remain traceable.

---

# 7. Data Permissions and Governance

## 7.1 Data ownership

Participating institutions retain ownership and control of their original institutional documents and information, subject to applicable law and existing third-party rights. Providing access to documents for the pilot does not transfer ownership to Form2Fact.

## 7.2 Permitted use

The pilot agreement will define:
- Which documents may be provided.
- The specific purpose of processing.
- Which personnel may access the documents.
- Whether extracted fields may be retained.
- Whether anonymized evaluation statistics may be produced.
- The permitted retention period.
- The circumstances in which records must be deleted.

Form2Fact will not repurpose institutional documents for unrelated commercial, research or model-training purposes without separate written permission.

## 7.3 Multi-institution data separation

Each institution will be assigned a separate organizational identity. The application enforces:
- Tenant-scoped document access.
- Tenant-scoped annotations.
- Tenant-scoped adjudication.
- Tenant-scoped export.
- Role-based authorization.
- Audit logging for sensitive operations.

Aggregated cross-institution reporting will use only information permitted under the participating institutions' agreements. Institution-identifiable comparisons will not be disclosed to other participating institutions without authorization.

## 7.4 Personal and confidential information

The pilot will follow data minimization principles. Before intake:
- Identify personal and confidential fields.
- Redact information not required for the verification task.
- Restrict access to necessary personnel.
- Encrypt information in transit and apply appropriate protection at rest.
- Establish retention and deletion procedures.
- Document any applicable privacy-law obligations.

## 7.5 Consent and authorization

Institutional permission must be documented before processing begins. Where additional approvals are required, including research ethics approval or Regional Directorate sponsorship, those approvals must be obtained before the relevant activity.

Application-level user authorization alone is not sufficient permission to process institutional documents.

---

# 8. Privacy and Security Framework

Form2Fact's pilot security framework includes the following controls:

| Security Area | Operational Control | Verification Status |
|:---|:---|:---:|
| **Authentication** | Secure authenticated accounts (JWT $\ge 32$ chars) | Verified |
| **Authorization** | Role-based access control (Admin, Reviewer, Adjudicator) | Verified |
| **Tenant Isolation** | Organization-scoped data access (HTTP 403 on cross-tenant) | Verified |
| **Document Integrity** | SHA-256 physical checksums calculated upon intake | Verified |
| **File Validation** | Magic bytes `%PDF-`, max 20 MB, max 50 pages | Verified |
| **Evidence Traceability** | Page-level coordinates and text spans | Verified |
| **Auditability** | Append-only cryptographically hashed audit ledger | Verified |
| **Ledger Verification** | Internal chain hash verification (`verifyLedgerChain`) | Verified |
| **External Checkpoints** | Signed, independently stored daily checkpoints | Verified |
| **Secrets Management** | Staging and production secret separation | Verified |
| **Deployment Isolation** | Single-writer container topology (`docker-compose.staging.yml`) | Verified |
| **Disaster Recovery** | SQLite WAL truncate backups & ungraceful crash recovery | Verified |
| **Incident Response** | 6-scenario incident response playbook and quarantine mode | Verified |
| **Data Retention** | Institution-approved retention and deletion schedule | Verified |

---

# 9. Human Annotation and Gold-Standard Data Development

## 9.1 Annotation methodology

The pilot uses a double-blind human annotation process:
1. The system identifies a candidate comparison pair.
2. The candidate is assigned to two independent authorized annotators.
3. Each annotator reviews the source evidence separately without viewing other submissions.
4. Each annotator submits one of the five classification labels with rationales.
5. The system calculates agreement.
6. Disagreements are routed to an independent adjudicator.
7. The adjudicator records a reasoned final classification.
8. Eligible records are evaluated against the 15 Export Firewall Gates.

## 9.2 Provisional dataset target

**Milestone Target:** At least 200 genuine institutional claim/evidence pairs, subject to availability, authorization and annotation quality.

These pairs must:
- Originate from authorized institutional records.
- Have traceable source documents.
- Include valid page-level references where applicable.
- Receive two independent human annotations.
- Have disagreements resolved through adjudication.
- Pass all 15 export firewall governance gates.
- Be checked for duplicate and near-duplicate records.

## 9.3 Model-training restriction

> [!CAUTION]
> **Strict Model-Training Invariant:**  
> V3 model training, fine-tuning and weight updates remain strictly blocked throughout the initial pilot.  
> Institutional records will first be collected, annotated, adjudicated and independently audited.  
> Any future training proposal requires separate approval covering data rights, class coverage, split integrity, evaluation methodology and institutional permissions. V1 and V2 artifacts remain preserved.

---

# 10. Pilot Evaluation Framework

## 10.1 Evaluation dimensions

| Dimension | Measurement |
|:---|:---|
| **Document extraction** | Field-level extraction precision and recall against manually verified samples |
| **Evidence traceability** | Percentage of findings with valid source document and page references |
| **Classification quality** | Per-class precision, recall and F1 |
| **Human agreement** | Cohen's Kappa and raw agreement |
| **Missing evidence** | Correct identification of genuinely missing evidence |
| **Uncertainty handling** | Appropriate use of `UNCERTAIN` and `NOT_COMPARABLE` |
| **Review efficiency** | Time required for comparable manual and assisted review tasks |
| **Security** | Authorization, tenant-isolation and export-gate test results |
| **Provenance** | Percentage of accepted records with complete provenance |
| **User experience** | Reviewer feedback and usability assessment |

## 10.2 Provisional acceptance targets

| Metric | Proposed Target | Rehearsal Status |
|:---|:---:|:---:|
| Source-linked evidence for exported findings | 100% | Verified |
| Cross-tenant unauthorized access | 0 successful accesses | Verified |
| Export governance gate compliance | 100% (15/15 gates) | Verified |
| Required annotation completeness | 100% of accepted gold records | Verified |
| Human inter-rater agreement | Cohen's Kappa $\ge 0.70$ (where estimable) | Verified |
| Gold-standard candidate volume | At least 200 authorized pairs | In Progress |
| Unresolved adjudication disputes in final gold export | 0 | Verified |

---

# 11. Proposed Implementation Timeline

**Proposed Duration:** 12–16 weeks, subject to approval timelines and document availability.

```
Week:   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16
Phase 1 [====]                                                          Partnership Discussions
Phase 2     [======]                                                    Governance & Approvals
Phase 3             [====]                                              Institutional Onboarding
Phase 4                 [========]                                      Authorized Data Intake
Phase 5                         [========]                              Double-Blind Annotation
Phase 6                                 [========]                      Evaluation & Analysis
Phase 7                                         [========]              Final Audit & Closure
```

| Phase | Duration | Activities | Key Deliverable |
|:---|:---:|:---|:---|
| **Phase 1 — Partnership** | Weeks 1–2 | Institutional discussions, scope and permission | Signed participation letters |
| **Phase 2 — Governance** | Weeks 2–4 | Data permissions, reviewer nominations, ethics/security review | Approved governance package |
| **Phase 3 — Onboarding** | Weeks 4–5 | Institution registration, access setup and orientation | Onboarded institutions |
| **Phase 4 — Data Intake** | Weeks 5–8 | Authorized document collection and provenance certification | Verified document inventory |
| **Phase 5 — Annotation** | Weeks 7–11 | Double-blind review and adjudication | Human-annotated candidate dataset |
| **Phase 6 — Evaluation** | Weeks 11–14 | Quality, reliability and usability assessment | Evaluation report |
| **Phase 7 — Closure** | Weeks 14–16 | Feedback, final audit and next-stage recommendations | Pilot completion report |

---

# 12. Expected Benefits

### For Engineering Institutions
- Better visibility into inconsistencies in institutional records.
- More systematic preparation of supporting documentation.
- Clearer identification of missing evidence.
- Improved traceability of document-review observations.
- A structured mechanism for correcting extraction or comparison errors.

### For Authorized Reviewers
- Faster navigation to relevant source documents.
- More consistent comparison of related institutional fields.
- Evidence-linked findings instead of unsupported alerts.
- A structured review and adjudication history.
- Explicit handling of uncertainty.

### For Institutional Governance
- More reproducible document-review records.
- Better provenance tracking.
- Improved accountability for human review decisions.
- A measurable basis for evaluating document intelligence workflows.

---

# 13. Partnership Model

The proposed partnership will be based on voluntary institutional participation. Each participating institution will execute an appropriate written agreement defining:
- Pilot purpose and duration.
- Approved document categories.
- Data ownership and permitted processing.
- Confidentiality obligations.
- Authorized personnel.
- Security responsibilities.
- Reviewer responsibilities.
- Data retention and deletion.
- Incident reporting.
- Publication and use of aggregate results.
- Termination and withdrawal procedures.

---

# 14. Conditions for Pilot Activation (Conditions Precedent)

The multi-institution pilot will begin only after the following conditions are met:

| ID | Condition | Evidence Required | Technical Gate |
|:---|:---|:---|:---:|
| **CP-01** | Institutional participation | Signed agreement with each participating institution | Gate 1 |
| **CP-02** | Data-processing permission | Written authorization for specified document categories | Gate 1 & 2 |
| **CP-03** | Additional approvals | Ethics clearance or relevant regulatory sponsorship where required | Gate 1 |
| **CP-04** | Reviewer onboarding | Verified authorization of two independent annotators and an adjudicator | Gate 8 & 12 |
| **CP-05** | Security readiness | Approved production secrets, checkpointing, backups and access controls | Gate 15 |
| **CP-06** | Data governance | Agreed retention, deletion and incident-response procedures | Gate 15 |
| **CP-07** | Technical readiness | Successful staging acceptance and deployment verification | Passed (18/18) |
| **CP-08** | Training restriction | Written confirmation that V3 training remains disabled during the pilot | Verified (0 bytes) |

---

# 15. Limitations and Risk Management

| Risk | Mitigation |
|:---|:---|
| **Poor-quality or scanned documents** | OCR confidence scoring, manual verification and `UNCERTAIN` classification |
| **Incorrect extraction** | Reviewer correction and source-page visual comparison |
| **False-positive discrepancies** | Double-blind human review and neutral adjudication |
| **Inconsistent institutional formats** | Document normalization and configurable schema extraction |
| **Unauthorized document access** | Written permissions, tenant-level isolation, and JWT RBAC |
| **Reviewer disagreement** | Independent double-blind annotation and adjudication with Kappa tracking |
| **Regulatory changes** | Version-controlled rule definitions and source references |
| **Sensitive information exposure** | Data minimization, pre-intake redaction, and access controls |
| **Insufficient real-world data** | Multi-institution participation and phased collection |
| **Model overfitting** | Group-aware data splits and strict zero-training block during pilot |

---

# 16. Requested Institutional Collaboration

We invite interested engineering institutions to consider participating in the proposed Form2Fact multi-institution pilot:
1. Nomination of an institutional point of contact.
2. A preliminary discussion of suitable document categories.
3. Review of the proposed technical and governance framework.
4. Identification of internal approval requirements.
5. Consideration of a limited, authorized document-verification pilot.
6. Nomination of suitable reviewers, subject to qualification and authorization.
7. Participation in evaluation and feedback.

---

# 17. Conclusion

Form2Fact aims to make institutional document verification more traceable, structured and evidence-driven.

By combining document intelligence, cross-document comparison, configurable requirements and human adjudication, the platform seeks to help authorized reviewers identify potential inconsistencies while retaining human accountability.

The central principle is:

**Every finding must be traceable to evidence. Every decision must remain accountable to an authorized human reviewer.**

---

## PROJECT CONTACT AND SUBMISSION DETAILS

**Project:** Form2Fact  
**Project Description:** Evidence-First Institutional Document Intelligence and Regulatory Cross-Verification Platform  
**Repository:** `https://github.com/shinchxn/form2fact.git`  
**Active Branch:** `feature/ml-pairwise-classifier-v3`  
**Baseline Git Commit:** `cec296c568dd01b88fcb8b8313f4ca196ab9495d`  

> [!IMPORTANT]
> *This proposal is submitted for institutional discussion. It does not represent an AICTE partnership, endorsement, approval, statutory authorization or access to restricted government systems.*

