# AICTE Regulatory Rule Configuration Guide

**Project:** Form2Fact  
**Workstream:** Person 4 — AICTE Domain & Regulatory Rules  
**Date:** 6 November 2026  
**Status:** Current implementation guide and future requirements

## 1. Purpose

This guide explains how the current AICTE lease rules are defined, evaluated and tested. It also records the requirements for future external configuration and rule lifecycle management.

The current implementation stores rule definitions in TypeScript. JSON/YAML loading and a rule administration interface are not implemented.

## 2. Current Rule File

Current implementation:

`server/domains/aicte/regulatoryRules.ts`

The file contains rule identifiers, titles, applicability, source metadata, check types, required document types, conditional applicability and enabled flags.

The current catalog contains 14 source-backed checks:
- 8 private-land rules.
- 6 private-building rules.

See `AICTE_RULE_CATALOG.md` for the detailed catalog.

## 3. Source Requirements

Before adding or changing a rule:

1. Locate the official AICTE source.
2. Confirm the document version.
3. Record the clause and page.
4. Confirm applicability.
5. Identify required evidence.
6. Define missing and uncertain evidence handling.
7. Obtain regulatory/domain-owner review.
8. Add positive and negative tests.
9. Update the source register and catalog.

Do not invent thresholds, exceptions or clauses.

## 4. Current Rule Structure

The TypeScript rule definitions include these concepts:

| Field | Purpose |
|---|---|
| ruleId | Stable rule identifier |
| title | Human-readable title |
| requirement | Regulatory requirement |
| appliesTo | Applicable lease arrangements |
| source | Source document and page |
| check | Evaluation operation |
| requiredDocumentType | Required evidence |
| conditionalOn | Applicability condition |
| enabled | Current enable/disable flag |

The TypeScript source is authoritative for the exact interface.

## 5. Evidence Classification

| Evidence condition | Classification |
|---|---|
| Verified and satisfies requirement | MATCH |
| Verified and contradicts requirement | MISMATCH |
| Required evidence absent | MISSING |
| Evidence present but unverified | UNCERTAIN |
| Evidence rejected | MISMATCH |
| Rule does not apply | NOT_COMPARABLE |

A document marked VERIFIED is not automatically proof of every fact it contains. Evaluation must remain limited to what the system can reliably establish.

## 6. Lease Applicability

| Arrangement | Current handling |
|---|---|
| PRIVATE_LAND | Evaluate private-land rules |
| PRIVATE_BUILDING | Evaluate private-building rules |
| OWNED | Private lease tenure is not comparable |
| PUBLIC_AUTHORITY_LAND_LEASE | UNCERTAIN pending manual review |
| UNKNOWN | UNCERTAIN |
| OTHER | Applicability requires review |

The private-land 30-year check uses the Council notification date, not the application year.

## 7. Adding a Rule Safely

A new rule should not be added until its source and applicability are verified.

Recommended process:

1. Assign a unique rule ID.
2. Add the official source reference.
3. Define the applicable lease arrangement.
4. Define the required evidence.
5. Add deterministic evaluation logic.
6. Ensure unknown evidence produces UNCERTAIN.
7. Ensure absent evidence produces MISSING where appropriate.
8. Add focused tests.
9. Update the documentation.
10. Obtain regulatory owner review.

Do not modify unrelated generic rules when adding an AICTE-specific rule.

## 8. Running Tests

Run the evaluator tests:

`npx tsx server/domains/aicte/regulatoryRules.test.ts`

Run the adapter tests:

`npx tsx server/domains/aicte/adapter.test.ts`

Run all repository checks:

`npm test`

`npm run lint`

`npm run build`

Successful tests do not replace regulatory review.

## 9. Future JSON/YAML Configuration

External configuration is a future enhancement. The following is an illustrative JSON representation, not a configuration currently loaded by the application.

    {
      "ruleId": "AICTE-APH-PL-001",
      "ruleVersion": "1.0.0",
      "status": "UNDER_REVIEW",
      "source": {
        "document": "AICTE Approval Process Handbook 2024-2027",
        "page": 78
      },
      "appliesTo": ["PRIVATE_LAND"],
      "effectiveFrom": null,
      "effectiveTo": null,
      "enabled": false
    }

A future configuration loader should validate:
- Schema and data types.
- Unique rule IDs and versions.
- Official source references.
- Allowed lifecycle states.
- Applicability values.
- Effective date ranges.
- Required evidence definitions.
- Safe evaluation operations.
- Approval before rule activation.

## 10. Recommended Rule Lifecycle

The future lifecycle should be:

`DRAFT -> UNDER_REVIEW -> ACTIVE -> SUPERSEDED / DISABLED`

| State | Meaning |
|---|---|
| DRAFT | Rule authored, not approved |
| UNDER_REVIEW | Awaiting regulatory review |
| ACTIVE | Verified and approved for evaluation |
| SUPERSEDED | Replaced by a newer version |
| DISABLED | Explicitly unavailable for evaluation |

The current `enabled` boolean is not a substitute for this lifecycle.

## 11. Effective Dates and Historical Versions

Future rule versions should preserve:
- Rule ID and version.
- Source document version.
- Effective-from and effective-to dates.
- Review and approval details.
- Supersession reference.
- Change reason.
- Previous rule versions.

Historical evaluation records should retain the exact rule version used at evaluation time.

Do not overwrite historical rules in a way that changes the meaning of past results.

## 12. Exception Handling

An exception must not be inferred from missing evidence or a developer assumption.

A future exception record should include:
- Rule ID and version.
- Exception category.
- Official source or approval reference.
- Applicable institution or application scope.
- Effective period.
- Reviewer decision.
- Supporting evidence.
- Audit timestamp.

Until an exception is verified and approved, the result should remain unresolved.

## 13. Safe Configuration Change Checklist

Before accepting a rule configuration change, confirm:

- [ ] Official source verified.
- [ ] Source version recorded.
- [ ] Clause and page recorded.
- [ ] Applicability reviewed.
- [ ] Evidence requirements defined.
- [ ] Missing evidence tested.
- [ ] Unverified evidence tested.
- [ ] Rejected evidence tested.
- [ ] Positive and negative cases tested.
- [ ] Rule version recorded.
- [ ] Regulatory owner approval obtained.
- [ ] Documentation updated.

## 14. Current Limitations

| Capability | Status |
|---|---|
| TypeScript rule definitions | Implemented |
| Deterministic evaluator | Implemented |
| Evidence classification | Implemented |
| Applicability safeguards | Implemented |
| Focused evaluator tests | Implemented |
| External JSON/YAML loader | Not implemented |
| Rule lifecycle workflow | Not implemented |
| Persistent rule version history | Not implemented |
| Exception approval workflow | Not implemented |
| Rule administration interface | Not implemented |

---

**Conclusion:** The current AICTE rules are maintained in TypeScript and tested through focused evaluator and adapter tests. External configuration, lifecycle management, effective-date scheduling and historical versioning remain future enhancements requiring design and approval.
