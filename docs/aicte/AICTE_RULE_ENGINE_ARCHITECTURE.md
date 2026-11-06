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

It currently imports INITIAL_RULES from the generic rules engine. The new regulatory evaluator is separate from that generic rule collection.

The registry does not currently provide a persistent external configuration or lifecycle service for the new evaluator.

## 11. Rule Configuration — Current State

The 14 rules currently reside in TypeScript.

The implementation does not demonstrate:
- External JSON/YAML rule loading.
- Persistent rule storage.
- Draft and review workflows.
- Effective-date scheduling.
- Exception approval records.
- Historical rule snapshots.
- Automatic supersession.
- Rule administration interface.

These are future requirements.

## 12. Target Versioned Rule Architecture

A future rule record should include:
- Stable rule ID and rule version.
- Lifecycle state.
- Source document, version, clause and page.
- Effective-from and effective-to dates.
- Applicability and exception conditions.
- Author, reviewer and approval timestamps.
- Supersession relationship.
- Change reason and audit history.

Recommended lifecycle:

DRAFT -> UNDER_REVIEW -> ACTIVE -> SUPERSEDED / DISABLED

This is a target design, not current runtime functionality.

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
| Deterministic lease evaluator | Implemented |
| Application adapter | Implemented |
| Authenticated preview API | Implemented |
| Frontend preview | Implemented |
| Generic validation integration | Not implemented |
| External JSON/YAML configuration | Not implemented |
| Full lifecycle management | Not implemented |
| Historical rule snapshots | Not implemented |
| Full AICTE coverage | Not implemented |
| Authorized portal-report ingestion | Not implemented |

## 18. Recommended Next Steps

1. Obtain regulatory review of the current 14 rules.
2. Finalize source excerpts and evidence provenance.
3. Define a versioned configuration schema.
4. Implement configuration validation and safe loading.
5. Add lifecycle and approval controls.
6. Add immutable historical evaluation snapshots.
7. Design authorized report ingestion.
8. Integrate with generic validation only after owner review.
9. Run security, regression and regulatory acceptance tests.
10. Obtain explicit approval before production activation.

---

**Conclusion:** The current AICTE implementation is an isolated, authenticated preview evaluator. The generic validation engine remains intact. External configuration, lifecycle management, historical snapshots and broader regulatory integration remain future work.
