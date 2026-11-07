# FORM2FACT V3 — REVIEWER AUTHORIZATION & ACCREDITATION POLICY

**Status:** IMPLEMENTED AND TESTED  
**Policy Version:** 3.0.0  
**Enforcement Level:** Mandatory Server-Side Gate  
**Scope:** Evaluators, Annotators, Adjudicators, and Directorate Scrutiny Personnel.

---

## 1. OBJECTIVE

This policy defines the governance criteria, authorization lifecycle, and enforcement rules for human evaluators participating in the Form2Fact V3 AICTE institutional annotation workbench. The objective is to ensure that only legally identifiable, qualified, and accredited regulatory personnel can create gold-standard training data for statutory AI systems.

---

## 2. STATUTORY ROLES HIERARCHY

| Role | Operational Responsibilities | Authorization Requirements |
| :--- | :--- | :--- |
| **Data Collector** | Ingest institutional dockets, register metadata, and stage candidate pairs. | Verified employee or contractor of AICTE Directorate. |
| **Annotator** | Submit double-blind pairwise compliance classifications and rationales. | Formally accredited scrutiny officer with proven domain expertise in AICTE norms. |
| **Reviewer** | Certify document provenance, perform quality oversight, and monitor agreement metrics. | Senior regulatory officer or directorate panelist. |
| **Adjudicator** | Resolve binding disputes between divergent annotator submissions. | Senior scrutiny board member with independent regulatory authority. |
| **Administrator** | Authorize/revoke reviewers, inspect cryptographic ledgers, and execute export firewalls. | Central system administrator with multi-regional oversight. |

---

## 3. MANDATORY AUTHORIZATION METADATA

Every authorized reviewer must possess an immutable accreditation entry in the `reviewer_authorizations` registry containing:

1. `userId`: Platform user identifier (mapped to `users` table).
2. `role`: Authorized role (`Annotator`, `Reviewer`, or `Adjudicator`).
3. `organizationId`: Regional tenant boundary (`org-aicte-western`, `org-aicte-northern`, etc.).
4. `verifiedIdentityRef`: Government ID or employee identification reference (e.g. Employee Code or PAN ref).
5. `issuingAuthority`: Regulatory body granting accreditation (e.g., `AICTE Western Regional Directorate`).
6. `professionalDesignation`: Title or academic rank (e.g., `Professor of Computer Science & Scrutiny Panelist`).
7. `authorizationReference`: Official nomination order or gazette reference.
8. `approvedBy`: Administrator user ID approving the credential.
9. `approvedByName`: Administrator display name.
10. `approvedAt`: ISO-8601 approval timestamp.
11. `expiryDate`: Optional accreditation validity boundary.
12. `isRevoked`: Boolean flag (0 = active, 1 = revoked).

---

## 4. STRICT GOVERNANCE RULES

### Rule 1: Prohibition of Self-Approval
An Administrator **cannot** approve their own reviewer authorization. Any attempt where `req.user.id === req.body.userId` is rejected by the server with HTTP 400 (`Self-approval prohibited: Administrators cannot approve their own reviewer authorization.`).

### Rule 2: Substantive Revocation Requirement
Revoking an evaluator's accreditation requires a detailed explanation of at least 10 characters documenting the regulatory, ethical, or administrative cause. Revocations are immediately persisted, chained into the cryptographic audit ledger, and block the user from subsequent submissions.

### Rule 3: Revocation & Expiry Enforcement
If an evaluator's authorization is revoked or expired:
- Attempted annotations on institutional tasks are immediately rejected with an error citing the revocation rationale.
- Previous unadjudicated submissions are flagged during audit review.
- The user is barred from participating in consensus detection.

### Rule 4: Adjudicator Independence & Conflict of Interest
To preserve double-blind objectivity:
- An Adjudicator **must not** have participated as an evaluating annotator on the same task.
- Any attempt by an annotator to resolve their own dispute is rejected as a conflict of interest.
- The Adjudicator role must be explicitly authorized; general annotators cannot adjudicate.

### Rule 5: Regional Tenant Scoping
Reviewers authorized for a specific regional directorate (e.g. Western) cannot access, annotate, certify, or adjudicate dossiers belonging to another directorate (e.g. Northern).

---

## 5. AUDIT TRAIL RECORDING

Every authorization grant, role update, and revocation triggers an immutable event in the hash-chained `audit_events` ledger:
- Action: `Reviewer Authorized` or `Reviewer Authorization Revoked`
- EntityType: `ReviewerAuthorization`
- EntityReference: Authorization record ID
- Actor: Approving Administrator ID and Name
- SHA-256 payload hash and cryptographic previous-hash link.
