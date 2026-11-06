# AICTE Regulatory Source Register

**Project:** Form2Fact  
**Workstream:** Person 4 — AICTE Domain & Regulatory Rules  
**Register date:** 6 November 2026  
**Status:** Limited source verification for implemented lease-compliance checks

## 1. Purpose

This register identifies the regulatory source used by the current AICTE lease-compliance evaluator.

A rule must not be activated as a mandatory regulatory requirement merely because it appears in an existing application rule, domain pack, checklist or developer assumption. Its applicability and source must be verified first.

## 2. Primary Regulatory Source

| Field | Details |
|---|---|
| Issuing authority | All India Council for Technical Education (AICTE) |
| Document | Approval Process Handbook 2024–2027 |
| Short name | APH 2024–2027 |
| Official source URL | https://aicte-qa.aicte-india.org/sites/default/files/APH%20Final.pdf |
| Relevant page | PDF page 78 |
| Verification recorded | 6 November 2026 |
| Implemented scope | Private-land lease and private-building lease checklist requirements |
| Source status | Verified for the limited requirements represented by the current evaluator |

**Scope warning:** Page 78 is the recorded source for the current 14 checks. This register does not certify that the entire handbook, all amendments, or every AICTE approval category has been reviewed.

## 3. Private Land Lease Requirements

The current evaluator represents the following private-land checklist requirements from APH 2024–2027, page 78.

| Rule ID | Requirement represented | Evidence expected | Current status |
|---|---|---|---|
| AICTE-APH-PL-001 | Private land lease validity of 30 years measured from Council notification date | Registered Land Lease Deed and relevant dates | Implemented |
| AICTE-APH-PL-002 | Registered private land lease deed | Registered Land Lease Deed | Implemented |
| AICTE-APH-PL-003 | Land conversion evidence | Land Conversion Certificate | Implemented |
| AICTE-APH-PL-004 | Lessor title evidence | Lessor land title documents | Implemented |
| AICTE-APH-PL-005 | Encumbrance evidence | Encumbrance Certificate | Implemented |
| AICTE-APH-PL-006 | Lessor entity authorization | Applicable Trust, Society or Company resolution | Implemented conditionally |
| AICTE-APH-PL-007 | Evidence of assignment right where sublease is involved | Registered evidence establishing the lessor's assignment right | Implemented conditionally |
| AICTE-APH-PL-008 | Mortgage restriction | Verified land-record evidence concerning mortgage | Implemented |

### 3.1 Tenure calculation

For the private-land lease check, the evaluator compares the lease expiry date with the date obtained by adding 30 years to the Council notification date.

The comparison is not based on the application year.

The rule is scoped to private land lease. It must not automatically be applied to:
- Freehold land ownership.
- Private building lease.
- Unknown lease arrangements.
- Public-authority lease arrangements without an applicability determination.

### 3.2 Conditional evidence

Some requirements depend on the arrangement:
- Lessor entity authorization depends on the identity and legal form of the lessor.
- Assignment-right evidence is relevant where sublease or assignment arrangements require it.
- Mortgage status must be established from verified evidence; an unknown status must not be treated as compliant.

## 4. Private Building Lease Requirements

The current evaluator represents these private-building checks from APH 2024–2027, page 78.

| Rule ID | Requirement represented | Evidence expected | Current status |
|---|---|---|---|
| AICTE-APH-PB-001 | Approved complete building plan | Approved building plan | Implemented |
| AICTE-APH-PB-002 | Occupancy or completion evidence | Occupancy Certificate or Completion Certificate | Implemented |
| AICTE-APH-PB-003 | Registered private building lease deed | Registered Building Lease Deed | Implemented |
| AICTE-APH-PB-004 | Valid fire safety evidence | Fire Safety Certificate | Implemented |
| AICTE-APH-PB-005 | Land-use permission for educational use | Land Use Certificate | Implemented |
| AICTE-APH-PB-006 | Building drawings and area evidence | Floor plans, sections/elevations and architect-certified room-wise carpet area details | Implemented |

**Applicability warning:** The private-building checks do not establish a 30-year private-land tenure requirement for a building lease.

## 5. Classification and Evidence Interpretation

The evaluator uses five classifications.

| Classification | Meaning |
|---|---|
| MATCH | Supplied evidence satisfies the represented check |
| MISMATCH | Supplied evidence contradicts the represented check or was rejected |
| MISSING | Required evidence was not supplied |
| UNCERTAIN | Evidence, applicability or interpretation is unresolved |
| NOT_COMPARABLE | The rule does not apply to the supplied arrangement |

The evaluator's current document mapping is:
- Verified document: `MATCH` for document-presence checks.
- Rejected document: `MISMATCH`.
- Present but unverified document: `UNCERTAIN`.
- Absent document: `MISSING`.

A document-presence match does not independently certify the legal validity, authenticity or substantive sufficiency of every statement in that document.

## 6. Public-Authority Lease Treatment

The current evaluator does not contain a verified public-authority-specific rule set.

Where the arrangement is marked `PUBLIC_AUTHORITY_LAND_LEASE`, the private-land and private-building checklist results are returned as `UNCERTAIN` pending manual regulatory review.

This is a deliberate safeguard. The evaluator must not assume that a checklist written for private lease arrangements applies identically to a public-authority allotment or lease.

The presence of a public authority as lessor is not, by itself, a legal conclusion that every private-lease requirement is either satisfied or waived.

## 7. Other Sources and Their Current Use

| Source | Purpose | Current use in this evaluator |
|---|---|---|
| AICTE Act, 1987 | Statutory context for AICTE | Context only; not used as the direct source for the 14 checks |
| APH 2024–2027, page 78 | Lease-related approval checklist | Direct source recorded for the 14 implemented checks |

No additional statutory clause, notification, amendment or handbook provision should be inferred from these references.

## 8. Legacy Rule Source-Alignment Concern

The repository's existing generic `RULE-TEN-01` uses:
- Application year as the tenure calculation anchor.
- A 30-year threshold for new technical campuses.
- A 20-year threshold for other cases.

This differs from the limited private-land lease requirement represented by the new evaluator.

The legacy rule has not been modified or approved for deactivation by this workstream. Its regulatory source and applicability require review by the backend and regulatory owners.

## 9. Unverified Regulatory Categories

The following categories are outside the verified scope of the current 14-rule evaluator:

- Institutional identity and legal status.
- Land ownership and land-area requirements beyond the represented lease checks.
- Building and campus infrastructure beyond the represented private-building checks.
- Faculty qualifications, appointments and ratios.
- Programme and course approvals.
- Affidavits and undertakings.
- Financial and bank-related requirements.
- Special institution, campus or application categories.
- Other approval types and regulatory exceptions.

Existing domain-pack references or generic rules in these areas must not be treated as source-verified merely because they are present in the repository.

## 10. Source Verification and Rule Activation Policy

Before a regulatory rule is activated:

1. Identify the official issuing authority.
2. Locate the current official handbook, regulation, notification or amendment.
3. Record the exact document title and version.
4. Record the applicable clause, section, annexure and page.
5. Capture a short source excerpt or a precise paraphrase.
6. Identify the institution, application and land/building arrangement to which it applies.
7. Record effective dates and supersession information where available.
8. Obtain regulatory/domain-owner review.
9. Add positive, negative, missing-evidence and uncertain-evidence tests.
10. Keep unverified requirements non-mandatory until verification is complete.

If the source is unavailable, ambiguous or conflicting, the result must remain unresolved rather than being converted into a mandatory violation.

## 11. Review and Maintenance

This register must be reviewed when:
- AICTE publishes a new Approval Process Handbook.
- AICTE issues a corrigendum, clarification or amendment.
- A new application or institution category is introduced.
- A rule's interpretation or applicability is challenged.
- A rule is superseded or withdrawn.

The verification date in the rule implementation is not a substitute for continuous source monitoring.

---

**Conclusion:** The current implementation has a limited, recorded source basis for 14 private-land and private-building lease checks from APH 2024–2027, page 78. It is not a complete AICTE regulatory source register and does not authorize unverified requirements to be activated.
