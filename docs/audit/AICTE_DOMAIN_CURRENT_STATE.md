# AICTE Domain — Repository Current-State Audit

**Project:** Form2Fact  
**Workstream:** Person 4 — AICTE Domain & Regulatory Rules  
**Branch inspected:** `feature/aicte-domain-rules`  
**Audit date:** 6 November 2026  
**Status:** Implementation audit; not a production-readiness certification

## 1. Executive Summary

The repository contains an existing AICTE domain pack registered through the domain registry and a separate AICTE lease-compliance evaluator.

The new evaluator implements 14 source-linked checks based on the AICTE Approval Process Handbook (APH) 2024–2027, page 78:
- 8 private-land lease checks.
- 6 private-building lease checks.

The evaluator supports five classifications:
`MATCH`, `MISMATCH`, `MISSING`, `UNCERTAIN`, and `NOT_COMPARABLE`.

A separate authenticated API endpoint exposes the evaluator as a `PREVIEW_ONLY` result. It does not replace or modify the existing generic application validation pipeline.

This implementation is a limited lease-compliance preview, not a complete AICTE regulatory compliance engine.

## 2. Repository Components Inspected

| Component | Location | Observed responsibility |
|---|---|---|
| AICTE domain pack | `server/domains/aicte/index.ts` | Existing AICTE document, field, relationship and generic rule definitions |
| Domain registry | `server/domains/registry.ts` | Registers and exposes domain packs |
| Domain registration | `server/domains/index.ts` | Registers the AICTE pack as the baseline domain |
| Domain types | `server/domains/types.ts` | Defines `DomainPack`, document definitions and comparison relationships |
| Generic rule engine | `server/rulesEngine.ts` | Existing application-level rule evaluation |
| Regulatory evaluator | `server/domains/aicte/regulatoryRules.ts` | New source-linked lease rules and deterministic evaluation |
| Preview adapter | `server/domains/aicte/adapter.ts` | Maps application, document and extracted-field data into evaluator context |
| Rule tests | `server/domains/aicte/regulatoryRules.test.ts` | Direct evaluator tests |
| Adapter tests | `server/domains/aicte/adapter.test.ts` | Application-to-preview mapping tests |
| API route | `server/api.ts` | Authenticated AICTE preview endpoint |
| Frontend preview | `src/components/AictePreviewView.tsx` | Displays preview classifications and findings |

## 3. Existing Domain-Pack Architecture

`server/domains/index.ts` imports `aicteDomainPack` and registers it through:

`domainRegistry.register(aicteDomainPack, true)`

The existing pack has version `1.2.0` and imports `INITIAL_RULES` from the generic rules engine.

The pack includes document definitions, field definitions and comparison relationships. Its existing tenure relationship `rel-tenure-expiry` is associated with `RULE-TEN-01` and contains a 30-year setting.

Registration of the domain pack does not automatically connect the separate `regulatoryRules.ts` evaluator to generic application validation.

## 4. Generic Validation and AICTE Preview Are Separate

### Existing generic validation

The existing route is:

`POST /api/v1/applications/:id/validate`

It invokes `db.runValidation()`, which evaluates the generic rule collection and manages application findings.

The existing generic validation path remains unchanged by the AICTE preview implementation.

### New AICTE preview

The new route is:

`GET /api/v1/applications/:id/aicte-preview`

It:
1. Requires authentication.
2. Retrieves the application within the user's organization boundary.
3. Retrieves application documents and extracted fields.
4. Calls `buildAicteLeasePreview()`.
5. Returns a `PREVIEW_ONLY` response.

The preview route does not replace generic validation or persist its results as production validation findings.

## 5. Regulatory Rule Implementation

The new evaluator defines 14 rules:

### Private land

- `AICTE-APH-PL-001` — Private land lease validity.
- `AICTE-APH-PL-002` — Registered private land lease deed.
- `AICTE-APH-PL-003` — Land conversion certificate.
- `AICTE-APH-PL-004` — Lessor title documents.
- `AICTE-APH-PL-005` — Encumbrance certificate.
- `AICTE-APH-PL-006` — Lessor entity resolution.
- `AICTE-APH-PL-007` — Sublease assignment right.
- `AICTE-APH-PL-008` — Mortgage restriction.

### Private building

- `AICTE-APH-PB-001` — Approved building plan.
- `AICTE-APH-PB-002` — Occupancy or completion certificate.
- `AICTE-APH-PB-003` — Registered private building lease deed.
- `AICTE-APH-PB-004` — Valid fire safety certificate.
- `AICTE-APH-PB-005` — Educational land-use certificate.
- `AICTE-APH-PB-006` — Architect-certified floor plans.

All 14 entries currently reference APH 2024–2027, page 78.

## 6. Applicability and Classification Safeguards

The evaluator distinguishes:
- Private land lease.
- Private building lease.
- Freehold ownership.
- Other arrangements.
- Public-authority land lease.
- Unknown lease arrangement.

Important safeguards:
- The 30-year test is restricted to private land lease.
- The tenure calculation uses the Council notification date, not application year.
- Private building lease does not inherit the private-land tenure rule.
- Freehold ownership is not evaluated against private-land lease requirements.
- Unknown lease arrangement produces `UNCERTAIN`.
- Public-authority land lease produces `UNCERTAIN` pending manual regulatory review.
- Missing or unverified evidence is not automatically accepted as compliant.

## 7. Evidence and Adapter Behaviour

The adapter maps existing document review statuses into regulatory evidence:
- `VERIFIED` maps to `VERIFIED`.
- `REJECTED` maps to `REJECTED`.
- Pending or clarification states map to `UNVERIFIED`.

Lease expiry is taken from extracted fields associated with a verified Land Lease Deed. Corrected values take precedence over normalized or raw values. Conflicting valid expiry dates are marked ambiguous and produce an uncertain result.

Declared sublease and mortgage answers are not treated as verified documentary evidence by the current adapter.

## 8. Legacy Rule Risk

The existing generic `RULE-TEN-01` implementation calculates tenure from `applicationYear` and uses different thresholds for new technical campuses and other application types.

The inspected implementation therefore differs from the verified APH page 78 private-land rule, which uses 30 years measured from the Council notification date.

The existing domain-pack relationship also retains a 30-year configuration.

**Risk:** The legacy generic validation path may produce a tenure conclusion that is not aligned with the source-scoped evaluator.

**Required action:** Backend and regulatory owners should review the legacy rule and its relationship before any production migration. This audit does not modify or deactivate that rule.

## 9. Current Implementation Gaps

| Requirement | Current status |
|---|---|
| Source-linked lease rule catalog | Implemented for 14 page-78 checks |
| Deterministic lease evaluator | Implemented |
| Five regulatory classifications | Implemented |
| Lease applicability distinctions | Implemented |
| Preview API | Implemented |
| Frontend preview | Implemented |
| Evaluator and adapter tests | Implemented |
| External JSON/YAML rule configuration | Not implemented or demonstrated |
| Rule lifecycle management | Not implemented |
| Historical rule-version storage | Not implemented |
| Full AICTE regulatory coverage | Not implemented |
| Verified rules for all regulatory categories | Not implemented |
| Generic validation integration | Not implemented; preview remains separate |
| Full statutory evidence excerpts and page-level field provenance | Partially implemented |
| Production activation approval | Not established |

## 10. Ownership and Change Boundaries

The team ownership document assigns:
- `server/domains/**` and `server/rulesEngine.ts` to the Regulatory Knowledge / Domain Rules team.
- `server/api.ts` and `server/db.ts` to the Backend team.
- `src/**` to the Frontend team.
- `server/test-runner.ts` and test governance to the QA team.

Changes to shared API, database, frontend and test-runner components should be kept minimal and reviewed by their respective owners.

The generic field-pair classifier and authentication/tenant-isolation controls must not be weakened or replaced by this work.

## 11. Verification Status

The implementation work recorded for this branch includes:
- `npm test` — passed.
- `npm run lint` — passed.
- `npm run build` — passed.
- Focused evaluator and adapter tests — passed.

These results describe the inspected development state and do not constitute regulatory sign-off, security certification or production approval.

## 12. Recommended Next Actions

1. Maintain the verified source register and recheck applicable handbook versions and corrigenda.
2. Complete the structured rule catalog with explicit lifecycle and verification metadata.
3. Design external configuration and historical rule versioning without silently changing current runtime behaviour.
4. Improve evidence references where document page and extracted-field provenance are available.
5. Have the legacy `RULE-TEN-01` path reviewed by the backend and regulatory owners.
6. Expand source verification before adding rules for identity, infrastructure, faculty, programmes, affidavits, finance or special categories.
7. Obtain domain-owner and AICTE subject-matter review before production activation.

---

**Audit conclusion:** The repository contains a functioning, tested AICTE lease-compliance preview alongside an older generic AICTE validation path. The new evaluator is deliberately isolated and preview-only. Broader regulatory coverage, configurable rule lifecycle management and production integration remain future work.
