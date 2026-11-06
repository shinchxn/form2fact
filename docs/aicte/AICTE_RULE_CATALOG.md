# AICTE Regulatory Rule Catalog

**Project:** Form2Fact  
**Workstream:** Person 4 — AICTE Domain & Regulatory Rules  
**Catalog date:** 6 November 2026  
**Catalog scope:** 14 implemented lease-compliance checks  
**Source:** AICTE APH 2024–2027, page 78

## 1. Purpose and Scope

This catalog documents the rules currently implemented in:

`server/domains/aicte/regulatoryRules.ts`

It covers only the private-land and private-building lease checks represented by the cited APH page.

It is not a complete AICTE rule catalog. No unverified requirements are activated by this document.

## 2. Rule Classification

| Classification | Meaning |
|---|---|
| MATCH | Supplied verified evidence satisfies the represented check |
| MISMATCH | Supplied evidence contradicts the requirement or is rejected |
| MISSING | Required evidence is absent |
| UNCERTAIN | Evidence, applicability, source version or interpretation is unresolved |
| NOT_COMPARABLE | The rule does not apply to the arrangement being evaluated |

## 3. Common Rule Metadata

The current TypeScript rule definitions contain:
- Rule ID.
- Title.
- Requirement description.
- Applicable lease arrangements.
- Source reference.
- Check type.
- Optional required document type.
- Optional conditional applicability.
- Enabled flag.

The current definitions do not yet contain a complete rule lifecycle, effective-date model, exception model or historical configuration snapshot.

## 4. Private Land Rules

All rules in this section apply to the private-land lease arrangement.

| Rule ID | Rule title | Requirement / check | Evidence or input | Conditional behaviour |
|---|---|---|---|---|
| AICTE-APH-PL-001 | Private land lease validity | Lease must satisfy the 30-year validity check measured from Council notification date | Verified Land Lease Deed, lease expiry date and Council notification date | Requires valid, unambiguous dates |
| AICTE-APH-PL-002 | Registered land lease deed | Registered private Land Lease Deed must be supplied | Land Lease Deed | Missing, unverified and rejected evidence receive distinct classifications |
| AICTE-APH-PL-003 | Land conversion certificate | Land conversion evidence must be supplied | Land Conversion Certificate | Document verification status controls result |
| AICTE-APH-PL-004 | Lessor title documents | Lessor's title evidence must be supplied | Lessor title document | Document verification status controls result |
| AICTE-APH-PL-005 | Encumbrance certificate | Encumbrance evidence must be supplied | Encumbrance Certificate | Document verification status controls result |
| AICTE-APH-PL-006 | Lessor entity resolution | Applicable lessor entity authorization must be evidenced | Trust, Society or Company resolution, as applicable | Conditional on lessor entity arrangement |
| AICTE-APH-PL-007 | Sublease assignment right | Assignment right must be established where relevant | Registered evidence of assignment right | Unknown status produces UNCERTAIN |
| AICTE-APH-PL-008 | Mortgage restriction | Mortgage of land is not permissible under the represented checklist | Verified mortgage status | Unknown status produces UNCERTAIN |

### 4.1 Private Land Tenure Logic

The tenure check:
1. Requires a verified Land Lease Deed.
2. Requires a valid Council notification date.
3. Requires a valid lease expiry date.
4. Calculates the required expiry date as notification date plus 30 years.
5. Returns MATCH when the expiry date is on or after the required date.
6. Returns MISMATCH when the expiry date is earlier.
7. Returns UNCERTAIN when dates are invalid, missing or ambiguous, except that a missing expiry date is classified as MISSING by the current implementation.

The calculation does not use application year.

## 5. Private Building Rules

All rules in this section apply to the private-building lease arrangement.

| Rule ID | Rule title | Requirement / check | Evidence expected |
|---|---|---|---|
| AICTE-APH-PB-001 | Approved building plan | Approved complete building plan must be supplied | Approved building plan |
| AICTE-APH-PB-002 | Occupancy or completion certificate | Occupancy or completion evidence must be supplied | Occupancy Certificate or Completion Certificate |
| AICTE-APH-PB-003 | Registered building lease deed | Registered private building lease deed must be supplied | Registered Building Lease Deed |
| AICTE-APH-PB-004 | Fire safety certificate | Valid fire safety evidence must be supplied | Fire Safety Certificate |
| AICTE-APH-PB-005 | Educational land-use certificate | Land-use evidence must permit educational use | Land Use Certificate |
| AICTE-APH-PB-006 | Architect-certified building drawings | Required floor plans, sections/elevations and room-wise carpet-area evidence must be supplied | Floor plans and architect-certified area details |

The private-building rules do not apply the private-land 30-year tenure check.

## 6. Applicability Matrix

| Lease arrangement | Private-land rules | Private-building rules | Current evaluator treatment |
|---|---|---|---|
| PRIVATE_LAND | Applicable | Not applicable | Evaluate private-land rules |
| PRIVATE_BUILDING | Not applicable | Applicable | Evaluate private-building rules |
| OWNED | Not applicable | Not applicable to lease checks | NOT_COMPARABLE |
| OTHER | Not established by this catalog | Not established by this catalog | UNCERTAIN or not applicable according to evaluator context |
| PUBLIC_AUTHORITY_LAND_LEASE | Not confirmed | Not confirmed | UNCERTAIN for all current rules |
| UNKNOWN | Cannot be determined | Cannot be determined | UNCERTAIN for all current rules |

Public-authority lease arrangements require manual regulatory review. The current catalog does not claim that private-lease requirements are automatically waived or automatically applicable to public-authority leases.

## 7. Evidence Status Mapping

| Document status | Evaluator interpretation |
|---|---|
| VERIFIED | MATCH for document-presence checks |
| UNVERIFIED | UNCERTAIN |
| REJECTED | MISMATCH |
| Absent | MISSING |

A MATCH for document presence does not independently prove that every legal or technical statement in the document is correct.

## 8. Rule Evaluation Safeguards

The current evaluator applies these safeguards:
- Disabled rules do not produce a mandatory failure.
- Unknown lease arrangements produce UNCERTAIN.
- Public-authority lease arrangements produce UNCERTAIN pending review.
- Rules outside the selected arrangement are NOT_COMPARABLE.
- Handbook-version mismatch produces UNCERTAIN.
- Missing conditional inputs do not silently pass.
- Conflicting lease expiry dates produce UNCERTAIN.
- Unverified documents do not produce MATCH.
- Rejected documents do not produce MATCH.

## 9. Rule Source Metadata

The current rules use the shared source reference:
- Issuer: All India Council for Technical Education.
- Source: Approval Process Handbook 2024–2027.
- Page: 78.
- Verification date recorded in implementation: 6 November 2026.

See `docs/aicte/AICTE_REGULATORY_SOURCE_REGISTER.md` for the source register and scope limitations.

## 10. Rule Lifecycle — Current and Target State

The current implementation uses an `enabled` boolean. It does not implement the complete lifecycle below.

| Lifecycle state | Intended meaning | Current implementation |
|---|---|---|
| Draft | Rule authored but not reviewed | Not implemented |
| Under Review | Rule awaiting regulatory review | Not implemented |
| Active | Verified and approved for evaluation | Partially represented by `enabled: true`; no approval workflow |
| Superseded | Replaced by a newer rule version | Not implemented |
| Disabled | Explicitly unavailable for evaluation | Partially represented by `enabled: false` |

The `enabled` flag must not be mistaken for a full approval lifecycle.

## 11. Rule Versioning — Current and Target State

Current rules are defined in TypeScript and reference APH 2024–2027. There is no demonstrated persistent historical rule-version store.

A future versioned rule record should include:
- Stable rule ID.
- Rule version.
- Lifecycle state.
- Source document and source version.
- Clause, page and excerpt.
- Effective-from and effective-to dates.
- Applicability conditions.
- Exception conditions and approval reference.
- Author, reviewer and approval timestamps.
- Superseded-by relationship.
- Change reason and audit history.

This is a design requirement, not a claim about existing functionality.

## 12. Unverified Categories

No mandatory rules are activated here for:
- Identity and legal status.
- Faculty.
- Programmes and courses.
- Financial requirements.
- Affidavits and undertakings.
- General infrastructure outside the listed building checks.
- Special institution or application categories.

These categories require independent source verification and domain-owner review.

## 13. Change Control

A rule change must include:
1. Official source verification.
2. Applicability analysis.
3. Evidence definition.
4. Positive and negative test cases.
5. Missing and uncertain evidence tests.
6. Review by the regulatory/domain owner.
7. Documentation update.
8. Version and effective-date handling when lifecycle support is implemented.

Do not modify the legacy generic `RULE-TEN-01` as part of a catalog-only change.

---

**Catalog conclusion:** The current implementation contains 14 lease-compliance rules covering private land and private buildings, with explicit applicability and uncertainty safeguards. Versioned JSON configuration, lifecycle transitions and historical snapshots are implemented. All 14 rules remain UNDER_REVIEW and cannot produce definitive findings until source verification and review approval requirements are satisfied. Identity, legal status, faculty, programmes, financial requirements, affidavits, undertakings and broader infrastructure requirements remain outside the verified catalog pending authoritative source review.
