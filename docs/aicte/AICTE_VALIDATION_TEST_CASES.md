# AICTE Regulatory Validation — Test Cases

**Project:** Form2Fact  
**Workstream:** Person 4 — AICTE Domain & Regulatory Rules  
**Date:** 6 November 2026  
**Status:** Existing tests and recommended test coverage

## 1. Purpose

This document records the test coverage for the AICTE regulatory lease evaluator and its application adapter.

It distinguishes implemented tests from recommended future tests. A proposed test must not be reported as already implemented.

## 2. Classification Definitions

| Classification | Meaning |
|---|---|
| MATCH | Available evidence satisfies the rule |
| MISMATCH | Evidence contradicts the rule |
| MISSING | Required evidence is absent |
| UNCERTAIN | Evidence or applicability cannot be reliably determined |
| NOT_COMPARABLE | The rule does not apply to the case |

## 3. Evaluator Tests — Existing Coverage

The evaluator tests in `server/domains/aicte/regulatoryRules.test.ts` cover these scenarios:

| Test scenario | Expected result |
|---|---|
| Valid private-land lease | MATCH |
| Lease tenure shorter than required | MISMATCH |
| Required lease deed missing | MISSING |
| Lease deed unverified | UNCERTAIN |
| Lease deed rejected | MISMATCH |
| Sublease assignment right unknown | UNCERTAIN |
| Freehold ownership tenure check | NOT_COMPARABLE |
| Council notification date unavailable | UNCERTAIN |
| Applicable handbook version mismatch | UNCERTAIN |
| Private-building lease tenure check | NOT_COMPARABLE |
| Required private-building evidence missing | MISSING |

## 4. Adapter Tests — Existing Coverage

The adapter tests in `server/domains/aicte/adapter.test.ts` cover:

| Test scenario | Expected result |
|---|---|
| Valid private-land lease | Correct evaluation |
| Short private-land lease | MISMATCH |
| Private-building arrangement | Building rules evaluated |
| Freehold ownership | Lease tenure not comparable |
| Missing lease deed | MISSING |
| Unverified lease deed | UNCERTAIN |
| Conflicting expiry dates | UNCERTAIN |
| Invalid expiry date | MISSING |
| Corrected expiry date | Corrected value used |
| Public authority land lease | All 14 findings UNCERTAIN |
| Unknown lease arrangement | All 14 findings UNCERTAIN |
| Private-land/building applicability | Only applicable rules evaluated |

## 5. API Integration Checks

The preview endpoint is:

`GET /api/v1/applications/:id/aicte-preview`

Previously executed integration checks:

| Scenario | Expected result |
|---|---|
| Request without authentication | HTTP 401 |
| Authorized user accesses permitted application | HTTP 200 |
| Preview response identifies PREVIEW_ONLY mode | Present |
| Preview returns 14 findings | Present |
| User accesses another organization's application | HTTP 403 |

The existing generic validation endpoint remains separate and unchanged.

## 6. Security and Isolation

The preview endpoint must:
- Require authentication.
- Enforce organization-level access.
- Avoid exposing another organization's application data.
- Remain preview-only.
- Avoid changing generic validation results.

## 7. Recommended Future Test Cases

The following cases should be added as the rule engine evolves. They are recommendations, not claims of existing implementation.

| Test scenario | Expected behaviour |
|---|---|
| Rule source is unverified | Must not create a mandatory violation |
| Rule is disabled | Must not be evaluated as an active requirement |
| Rule is outside its effective date | Must not be applied |
| Rule version is superseded | Historical evaluation retains the old version |
| Required source reference is absent | Rule must not be activated |
| Exception lacks approval evidence | Keep the result unresolved |
| Conflicting evidence exists | Return UNCERTAIN for manual review |
| Evidence belongs to another application | Reject or exclude that evidence |
| Unsupported lease arrangement | Do not assume private-land applicability |
| Generic validation is executed | Existing generic results remain unchanged |

## 8. Important Boundary Tests

### Private land

- Verify the 30-year tenure calculation uses the Council notification date.
- Verify a lease meeting the source-backed tenure requirement passes.
- Verify a shorter lease does not pass.
- Verify missing or invalid dates do not produce a false MATCH.
- Verify conflicting expiry dates produce UNCERTAIN.

### Private building

- Verify private-building rules are applied only to private-building arrangements.
- Do not apply the private-land 30-year tenure requirement to a private-building lease.
- Verify missing required building evidence is reported as MISSING.

### Public authority land lease

- Do not automatically apply private-land checklist requirements.
- Keep findings UNCERTAIN until applicability is confirmed by an authoritative source or regulatory review.
- Do not convert uncertainty into a mandatory violation.

## 9. Test Execution Commands

Run focused tests:

`npx tsx server/domains/aicte/regulatoryRules.test.ts`

`npx tsx server/domains/aicte/adapter.test.ts`

`npx tsx server/domains/aicte/ruleConfiguration.test.ts`

`npx tsx server/domains/aicte/ruleLifecycle.test.ts`

Run the full project test suite:

`npm test`

Run lint:

`npm run lint`

Run production build:

`npm run build`

Record the command, date, result and any failure when reporting test execution.

## 10. Acceptance Criteria

The AICTE preview implementation is acceptable for its current limited scope when:

1. The evaluator returns deterministic classifications.
2. Only the applicable lease rules are evaluated.
3. Missing evidence is not treated as verified evidence.
4. Unverified evidence does not produce a false MATCH.
5. Conflicting evidence is surfaced as UNCERTAIN.
6. Public authority lease applicability is not assumed.
7. Findings include their rule and source references.
8. The preview endpoint requires authentication.
9. Organization isolation is enforced.
10. The preview does not replace or modify generic validation.
11. Existing evaluator and adapter tests pass.
12. Documentation accurately describes implemented and future capabilities.

## 11. Limitations

The current 14-rule implementation covers selected private-land and private-building lease checks from the cited handbook page. It is not a complete AICTE regulatory compliance engine.

JSON configuration loading, lifecycle transitions, activation safeguards and historical configuration snapshots are implemented and tested. Calendar-date activation, exception approval, integration testing of lifecycle audit-log persistence and broader regulatory categories remain future work.

---

**Conclusion:** Existing evaluator, adapter and API checks provide focused coverage for the current preview implementation. Configuration and lifecycle unit tests are implemented. Additional calendar-date activation, exception approval, audit-log persistence and source-verification integration tests are required before broader regulatory activation.
