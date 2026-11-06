# AICTE Domain & Regulatory Rules — Team Handoff

**Project:** Form2Fact  
**Workstream:** Person 4 — AICTE Domain & Regulatory Rules  
**Date:** 6 November 2026  
**Branch:** feature/aicte-domain-rules  
**Status:** Implemented limited-scope preview; production activation not approved

## 1. Workstream Objective

Implement an AICTE-specific regulatory evaluation capability without replacing or weakening Form2Fact's existing generic validation engine.

The current work provides a deterministic, preview-only evaluator for selected lease-related requirements.

## 2. Implementation Summary

The implementation includes:

- A separate AICTE regulatory rule catalog.
- Evidence-aware classifications.
- Private-land and private-building applicability.
- Lease tenure evaluation using the Council notification date.
- Uncertainty handling for unknown and public-authority lease arrangements.
- An application adapter that maps application data and document evidence.
- An authenticated, organization-protected preview API.
- A frontend preview page showing findings and classification counts.

The implementation currently contains 14 selected lease-related checks.

It is not a complete AICTE regulatory compliance engine.

## 3. Important Source Boundary

The current rule catalog references the AICTE Approval Process Handbook 2024–2027, page 78.

Official source:

https://aicte-qa.aicte-india.org/sites/default/files/APH%20Final.pdf

The private-land 30-year lease check is evaluated relative to the Council notification date.

The private-land tenure requirement is not applied to freehold ownership or private-building leases.

Public-authority land lease applicability remains uncertain and requires regulatory review.

## 4. Main Files Added or Updated

### Backend domain

- `server/domains/aicte/regulatoryRules.ts`
- `server/domains/aicte/adapter.ts`
- `server/domains/aicte/regulatoryRules.test.ts`
- `server/domains/aicte/adapter.test.ts`

### API

- `server/api.ts`

Added endpoint:

`GET /api/v1/applications/:id/aicte-preview`

The endpoint requires authentication and checks organization access.

### Frontend

- `src/App.tsx`
- `src/components/AictePreviewView.tsx`
- `src/components/Sidebar.tsx`
- `src/components/Header.tsx`
- `src/services/api.ts`
- `src/types/index.ts`

The preview page is available under Governance.

### Documentation

- `docs/audit/AICTE_DOMAIN_CURRENT_STATE.md`
- `docs/aicte/AICTE_REGULATORY_SOURCE_REGISTER.md`
- `docs/aicte/AICTE_RULE_CATALOG.md`
- `docs/aicte/AICTE_RULE_ENGINE_ARCHITECTURE.md`
- `docs/aicte/AICTE_RULE_CONFIGURATION_GUIDE.md`
- `docs/aicte/AICTE_VALIDATION_TEST_CASES.md`
- `docs/team/AICTE_DOMAIN_HANDOFF.md`

## 5. API and Integration Boundary

The AICTE preview endpoint is separate from the existing generic validation endpoint.

The existing generic validation flow continues to use the existing validation engine.

The AICTE evaluator:
- Does not replace the generic evaluator.
- Does not activate unverified regulatory requirements.
- Does not claim production compliance approval.
- Returns preview findings for review.

No restricted AICTE portal scraping or undocumented portal API integration has been introduced.

## 6. Security and Organization Isolation

The preview API requires an authenticated user.

Application access is checked against organization ownership.

Previously executed checks included:
- Unauthenticated request: HTTP 401.
- Authorized application request: HTTP 200.
- Cross-organization request: HTTP 403.

The preview remains read-only and does not replace the existing validation workflow.

## 7. Test Status

Previously completed checks:

- `npx tsx server/domains/aicte/regulatoryRules.test.ts` — passed.
- `npx tsx server/domains/aicte/adapter.test.ts` — passed.
- `npm test` — passed, all 22 test sections.
- `npm run lint` — passed.
- `npm run build` — passed.

The frontend preview and document-review workflow were also manually checked.

These results describe the earlier completed test run. Re-run the checks after any further code changes before merging.

## 8. Known Limitations

The following capabilities are implemented:

- Versioned external JSON rule configuration and validation.
- Rule lifecycle transitions with activation safeguards.
- Historical configuration snapshots.
- Preview adapter enforcement of lifecycle eligibility.
- Effective handbook-version metadata.

The following capabilities remain incomplete:

- Calendar-date-based rule activation scheduling.
- Exception approval workflow.
- Integration testing of lifecycle audit-log persistence.
- Full AICTE coverage across identity, land/building, infrastructure, faculty, programmes, affidavits, finance and special categories.
- Authorized AICTE portal-report ingestion.
- Integration with the generic production validation engine.

All 14 configured lease rules remain UNDER_REVIEW, with review approval pending. They cannot produce definitive compliance findings until the activation requirements are satisfied.

The existing generic tenure rule has not been changed as part of this isolated preview implementation. It requires a separately reviewed correction if the team decides to align its behaviour with the verified source.

## 9. Required Team Review

Before production use, the responsible reviewers should:

1. Review the source register and rule catalog.
2. Confirm the applicability of each rule.
3. Review public-authority lease treatment.
4. Review evidence extraction and verification assumptions.
5. Review API authorization and organization isolation.
6. Review the implemented JSON configuration schema and lifecycle safeguards.
7. Review historical snapshots and lifecycle audit-log persistence.
8. Expand regulatory coverage only after source verification.
9. Re-run tests, lint and build.
10. Obtain explicit approval before production activation.

## 10. Ownership and Coordination

The regulatory/domain rules workstream owns AICTE-specific rule definitions and domain evaluation.

Backend and frontend changes should be reviewed by their respective owners.

QA should review test coverage and audit documentation.

Do not modify shared classifiers, security boundaries or unrelated generic rules without the relevant owner's review and approval.

## 11. Handoff Conclusion

Person 4 has delivered an isolated AICTE lease-compliance preview with source-linked rules, evidence-aware findings, API integration, frontend visibility, tests and documentation.

The implementation is suitable for continued review and development. It must not be represented as a complete or production-approved AICTE compliance system.

