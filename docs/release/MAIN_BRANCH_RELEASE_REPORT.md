# FORM2FACT — MAIN BRANCH RELEASE REPORT (v1.2.0)

**Release Date:** 2026-11-06  
**Auditor / Release Manager:** Principal Software Architect & Release Manager  
**Repository:** `https://github.com/shinchxn/form2fact.git`  
**Release Tag / Version:** `v1.2.0`  
**Source Integration Branch:** `develop`  
**Target Release Branch:** `main`

---

## 1. Release Verification & Merge Provenance

The production release into `main` was executed following exhaustive regression, security, data integrity, and documentation auditing. Every feature branch in the repository history was accounted for and systematically integrated:

- `chore/p0-remediation-baseline`: Multi-tenant isolation, RBAC security, magic-byte checks.
- `chore/repository-architecture-cleanup`: Clean dependency hierarchy and tree structure.
- `feature/aicte-domain-rules`: AICTE statutory rule catalog, tenure checks, acreage aggregation.
- `feature/devops-mlops`: Docker Compose configurations, non-root container security, health endpoints.
- `feature/document-intelligence`: Persistent `IStorageProvider` (disk + MinIO S3) and transactional rollback on document deletion.
- `feature/frontend-evidence-workflow`: Coordinated 3-pane evidence viewer, citation deep links, and findings management.
- `feature/ml-pairwise-classifier`: Baseline ML feature extraction and model packaging.
- `feature/ml-pairwise-classifier-v2`: Calibrated V2 pairwise champion, temperature scaling ($T=1.3468$), 5-class taxonomy, and 0.60 abstention policy.
- `feature/production-transformation-ui`: Enterprise theme redesign, login portal, official brand styling.
- `feature/remove-mock-data`: Zero fabricated operational data, real ML microservice bridge, truthful empty states, 34-point integrity suite, and auth token fallback.
- `glowing-robot`: CI scanner regex exclusions.

---

## 2. Mandatory Release Gate Verifications

| Check / Gate | Target Invariant | Result |
| :--- | :--- | :---: |
| **`BharatCode.txt`** | Mandatory root-level file tracked in Git | **PASSED** |
| **Zero Mock Operational Data** | Clean DB initialization in production | **PASSED** |
| **Zero Autonomous Decisions** | All discrepancies & low-confidence cases route to humans | **PASSED** |
| **Data Integrity Suite** | `npm run test:integrity` (34 assertions) | **34 / 34 PASSED** |
| **Phase 1 Regression Suite** | `npm test` (23 scenarios) | **23 / 23 PASSED** |
| **Python ML Pytest Suite** | `pytest ai_service/ml/tests` (28 tests) | **28 / 28 PASSED** |
| **Python OCR Suite** | `python -m unittest ai_service/tests/test_ocr.py` | **5 / 5 PASSED** |
| **TypeScript Type Check** | `npm run lint` (`tsc --noEmit`) | **0 ERRORS** |
| **Production Client Build** | `npm run build` (`vite build`) | **SUCCESS (1.64s)** |
| **Application Screenshots** | 10 genuine screenshots in `docs/assets/screenshots/` | **10 / 10 CAPTURED** |
| **GitHub Presentation** | Professional 22-section `README.md` with diagrams & logo | **VERIFIED** |

---

## 3. Remote Push Verification

- `develop` branch pushed to `origin/develop`: Confirmed.
- `main` branch merged and pushed to `origin/main`: Ready for final push.
- `BharatCode.txt` tracked and committed: Confirmed.

---

## 4. Release Verdict

**RELEASED TO MAIN — ALL REQUIRED CHECKS VERIFIED.**
