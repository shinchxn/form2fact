# AICTE Regulatory Rule Engine — Architecture

**Project:** Form2Fact  
**Workstream:** Person 4 — AICTE Domain & Regulatory Rules  
**Date:** 6 November 2026  
**Status:** Current implementation and target architecture

## 1. Purpose

This document describes the AICTE lease-compliance evaluator, its integration boundary with Form2Fact, and the changes required before it can become a fully configurable regulatory rule engine.

The current implementation is a deterministic, preview-only evaluator for 14 lease-related checks from APH 2024–2027, page 78.

It does not replace the generic Form2Fact validation engine.

## 2. High-Level Architecture

Form2Fact Application
    |
Authenticated application request
    |
AICTE Preview API
    |
Organization access check
    |
Application and evidence data
    |
AICTE Preview Adapter
    |
Normalize application context
    |
AICTE Regulatory Evaluator
    |
14 source-linked lease rules
    |
Classification and findings
    |
PREVIEW_ONLY response
    |
Frontend preview screen

## 3. Existing Generic Validation Path

POST /api/v1/applications/:id/validate
    |
Authentication
    |
Organization isolation
    |
db.runValidation()
    |
Generic rules
    |
evaluateApplicationRules()
    |
Persist generic findings

This path continues to use the existing generic rules and finding persistence. The AICTE preview does not replace it.

## 4. AICTE Preview Components

| Component | File | Responsibility |
|---|---|---|
| Rule definitions and evaluator | server/domains/aicte/regulatoryRules.ts | Defines 14 rules and deterministic classification logic |
| Preview adapter | server/domains/aicte/adapter.ts | Maps application, documents and fields into evaluator input |
| API endpoint | server/api.ts | Authenticates, checks organization access and returns preview |
| Frontend API service | src/services/api.ts | Calls the preview endpoint |
| Preview component | src/components/AictePreviewView.tsx | Displays preview findings |
| Navigation integration | src/App.tsx, src/components/Sidebar.tsx | Makes preview accessible |

## 5. Adapter Responsibilities

The adapter:
1. Receives an application, documents and extracted fields.
2. Reads the declared lease arrangement.
3. Reads the applicable handbook version and Council notification date.
4. Maps document verification statuses.
5. Normalizes relevant dates.
6. Selects lease expiry evidence from a verified Land Lease Deed.
7. Prefers corrected field values where available.
8. Detects conflicting valid expiry dates.
9. Builds the regulatory context.
10. Calls the evaluator and returns preview findings.

### Document status mapping

| Existing status | Evaluator status |
|---|---|
| VERIFIED | VERIFIED |
| REJECTED | REJECTED |
| PENDING_REVIEW | UNVERIFIED |
| NEEDS_CLARIFICATION | UNVERIFIED |

## 6. Evaluator Responsibilities

The evaluator selects rules by lease arrangement, checks handbook version, applies conditional logic, evaluates evidence and returns structured findings.

Each finding includes a rule ID, classification, explanation, source reference and applicability information, with actual values and evidence where available.

## 7. Applicability

| Arrangement | Current behaviour |
|---|---|
| PRIVATE_LAND | Evaluate private-land rules |
| PRIVATE_BUILDING | Evaluate private-building rules |
| OWNED | Lease-specific rules are not comparable |
| PUBLIC_AUTHORITY_LAND_LEASE | UNCERTAIN pending manual review |
| UNKNOWN | UNCERTAIN |
| OTHER | Requires applicability review |

The 30-year tenure check is restricted to private land lease and uses the Council notification date.

## 8. API Contract

Endpoint:

GET /api/v1/applications/:id/aicte-preview

The route requires authentication and organization-level application access.

Illustrative response:

    {
      "success": true,
      "data": {
        "mode": "PREVIEW_ONLY",
        "findings": [],
        "context": {}
      }
    }

The response is informational preview data, not an official AICTE approval decision.

## 9. Frontend Presentation

The preview screen identifies its output as PREVIEW ONLY, displays five classification totals and lists individual rule findings.

## 10. Domain Registry Boundary

The existing AICTE domain pack is registered through server/domains/index.ts.

The new regulatory evaluator remains separate from the generic INITIAL_RULES collection.

The AICTE preview adapter loads the versioned JSON configuration through ruleConfiguration.ts and checks lifecycle eligibility before returning findings.

This integration is limited to the authenticated AICTE preview endpoint. It does not replace or modify the generic Form2Fact validation engine.

## 11. Rule Configuration — Current State

The implementation includes:
- External JSON rule configuration at server/domains/aicte/config/aicte-rules.json.
- Configuration validation and duplicate rule-ID checks.
- Rule lifecycle states: DRAFT, UNDER_REVIEW, ACTIVE, SUPERSEDED and DISABLED.
- Activation safeguards requiring verified sources and approved review.
- Lifecycle transition validation.
- Historical configuration snapshots.
- A JSONL lifecycle event audit log.
- Preview adapter integration with lifecycle eligibility checks.
- Effective handbook-version metadata.
- Exception metadata, currently empty pending verification.

The following capabilities remain unimplemented:
- Calendar-date activation scheduling.
- Exception approval workflow.
- Rule administration interface.
- Integration with the main production validation engine.
- Full integration with the generic domain registry lifecycle service.

All 14 configured rules currently remain UNDER_REVIEW with review approval pending. They cannot produce definitive preview findings.

## 12. Target Versioned Rule Architecture

A future production-ready rule record should include:
- Stable rule ID and rule version.
- Lifecycle state.
- Source document, version, clause and page.
- Verified effective-from and effective-to dates.
- Applicability and approved exception conditions.
- Author, reviewer and approval timestamps.
- Supersession relationship.
- Change reason and audit history.

Implemented lifecycle:

DRAFT -> UNDER_REVIEW -> ACTIVE -> SUPERSEDED / DISABLED

The transition service validates permitted transitions and activation prerequisites. Historical snapshots preserve previous configurations.

Calendar-date scheduling and exception approval remain future work. The current lifecycle implementation must not be interpreted as authorization to activate unverified or unapproved rules.

## 13. Historical Evaluation

A future production implementation should preserve the exact rule version, source version, evaluation timestamp, evidence references, application snapshot reference, classification, explanation and reviewer actions.

A later rule update must not silently rewrite an earlier evaluation.

## 14. AICTE Portal Report Integration

Future integration should use documented, authorized interfaces or user-provided reports.

Do not scrape restricted portals, bypass access controls or invent undocumented APIs. Uploaded reports must be verified before being treated as authentic evidence.

## 15. Security and Reliability

Production integration must preserve:
- Authentication and organization isolation.
- Least-privilege evidence access.
- Evidence provenance.
- Safe input and date validation.
- Deterministic evaluation.
- Audit logging.
- No automatic pass for unknown evidence.
- No activation of unverified rules.

## 16. Testing Requirements

Tests should cover each rule, correct and incorrect evidence, missing and unverified evidence, rejected documents, unknown and public-authority arrangements, freehold ownership, handbook-version mismatch, invalid and conflicting dates, organization isolation and generic-validation regression.

## 17. Current Limitations

| Area | Current state |
|---|---|
| Deterministic lease evaluator | Implemented and tested |
| Application adapter | Implemented and tested |
| Authenticated preview API | Implemented |
| Frontend preview | Implemented |
| Generic production validation integration | Not implemented |
| External JSON configuration loader | Implemented and tested |
| Lifecycle transitions and activation safeguards | Implemented and tested |
| Historical configuration snapshots | Implemented and tested |
| Lifecycle event audit-log persistence | Implemented; persistence not yet integration-tested |
| Calendar-date activation scheduling | Not implemented |
| Exception approval workflow | Not implemented |
| Full AICTE regulatory coverage | Not implemented |
| Authorized portal-report ingestion | Not implemented |

## 18. Recommended Next Steps

1. Obtain regulatory/domain-owner review and approval for the current 14 rules.
2. Verify source excerpts, applicability and evidence requirements.
3. Verify effective dates before configuring calendar-date activation.
4. Define and approve any exception records before implementation.
5. Add integration tests for lifecycle event audit-log persistence.
6. Implement calendar-date activation scheduling.
7. Implement an exception approval workflow.
8. Design authorized AICTE report ingestion using documented interfaces or user-provided reports.
9. Consider generic validation integration only after architecture-owner review.
10. Run security, regression and regulatory acceptance tests before production activation.
11. Keep all unapproved rules non-mandatory.

---

**Conclusion:** The current AICTE implementation is an isolated, authenticated preview evaluator using versioned JSON configuration and lifecycle eligibility checks. Lifecycle transitions and historical configuration snapshots are implemented and tested. All 14 rules remain UNDER_REVIEW and cannot produce definitive findings until review approval is granted. The generic validation engine remains unchanged. Calendar-date activation, exception approval, broader AICTE regulatory coverage and authorized portal-report ingestion remain future work.
